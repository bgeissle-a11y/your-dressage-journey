/**
 * Event Planner API
 *
 * Generates a comprehensive event preparation plan through 4 API calls:
 *
 * EP-1 (Test Requirements):  Enrich test database data with coaching intelligence
 * EP-2 (Readiness Analysis): Evaluate rider-horse readiness against test requirements
 * EP-3 (Preparation Plan):   Create week-by-week preparation timeline
 * EP-4 (Show-Day Guidance):  Generate show-day timeline and strategy
 *
 * Client-orchestrated: the frontend calls this function once per step (1-4),
 * passing prior step results back. Each invocation makes a single Claude call.
 *
 * Input:  { eventPrepPlanId: string, step: 1-4, priorResults?: object, forceRefresh?: boolean }
 * Output: Step-specific result (see per-step docs below)
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { validateAuth, validateOwnership } = require("../lib/auth");
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { callClaude } = require("../lib/claudeCall");
const { buildEventPlannerPrompt } = require("../lib/promptBuilder");
const { buildDetailedTestContext } = require("../lib/testDatabase");
const { getCache, setCache } = require("../lib/cacheManager");
const { db } = require("../lib/firebase");

/**
 * Cloud Function handler for Event Planner generation (stepped).
 *
 * @param {object} request - Firebase v2 onCall request
 * @returns {Promise<object>} Step result
 */
async function handler(request) {
  try {
    const uid = validateAuth(request);
    const {
      eventPrepPlanId,
      step,
      priorResults = {},
      forceRefresh = false,
    } = request.data || {};

    // Validate required parameters
    if (!eventPrepPlanId || typeof eventPrepPlanId !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "eventPrepPlanId is required and must be a string."
      );
    }
    if (!step || ![1, 2, 3, 4].includes(step)) {
      throw new HttpsError(
        "invalid-argument",
        "step is required and must be 1, 2, 3, or 4."
      );
    }

    // Fetch event prep plan + rider data in parallel (needed by every step)
    const [eventPrepPlan, riderData] = await Promise.all([
      validateOwnership("eventPrepPlans", eventPrepPlanId, uid),
      prepareRiderData(uid),
    ]);

    const hash = riderData.dataSnapshot?.hash;

    // Check data tier — need Tier 1+ for AI features
    if (riderData.dataTier < 1) {
      return {
        success: false,
        error: "insufficient_data",
        message:
          "We need a bit more data to generate your Event Plan. " +
          "Please complete your rider profile, add at least one horse profile, " +
          "and submit at least 3 post-ride debriefs.",
        dataTier: riderData.dataTier,
        tier: riderData.tier,
      };
    }

    // Common setup
    const cacheKey = `eventPlanner_${eventPrepPlanId}`;
    const targetLevel =
      eventPrepPlan.targetLevel || eventPrepPlan.currentLevel || "Training";
    const detailedTestContext = buildDetailedTestContext(targetLevel);

    // --- STEP 1: Test Requirements Assembly ---
    if (step === 1) {
      // Cache check (only on step 1)
      if (!forceRefresh) {
        const cached = await getCache(uid, cacheKey, { currentHash: hash });
        if (cached) {
          return {
            success: true,
            step: 1,
            fromCache: true,
            allSections: true,
            ...cached.result,
            tier: riderData.tier,
            dataTier: riderData.dataTier,
            dataSnapshot: riderData.dataSnapshot,
            generatedAt: cached.generatedAt,
          };
        }
      }

      console.log("[eventPlanner] Step 1: Test Requirements Assembly");
      const { system, userMessage } = buildEventPlannerPrompt(
        1, riderData, eventPrepPlan, detailedTestContext, {}
      );
      const testRequirements = await callClaude({
        system,
        userMessage,
        jsonMode: true,
        maxTokens: 8192,
        context: "ep-1-test-requirements",
      });

      return {
        success: true,
        step: 1,
        fromCache: false,
        testRequirements,
        tier: riderData.tier,
        dataTier: riderData.dataTier,
        dataSnapshot: riderData.dataSnapshot,
      };
    }

    // --- STEP 2: Readiness Analysis ---
    if (step === 2) {
      if (!priorResults.testRequirements) {
        throw new HttpsError(
          "invalid-argument",
          "Step 2 requires priorResults.testRequirements."
        );
      }

      console.log("[eventPlanner] Step 2: Readiness Analysis");
      const { system, userMessage } = buildEventPlannerPrompt(
        2, riderData, eventPrepPlan, detailedTestContext,
        { testRequirements: priorResults.testRequirements }
      );
      const readinessAnalysis = await callClaude({
        system,
        userMessage,
        jsonMode: true,
        maxTokens: 8192,
        context: "ep-2-readiness-analysis",
      });

      return { success: true, step: 2, readinessAnalysis };
    }

    // --- STEP 3: Preparation Plan ---
    if (step === 3) {
      if (!priorResults.testRequirements || !priorResults.readinessAnalysis) {
        throw new HttpsError(
          "invalid-argument",
          "Step 3 requires priorResults.testRequirements and priorResults.readinessAnalysis."
        );
      }

      console.log("[eventPlanner] Step 3: Preparation Plan");
      const { system, userMessage } = buildEventPlannerPrompt(
        3, riderData, eventPrepPlan, detailedTestContext,
        {
          testRequirements: priorResults.testRequirements,
          readinessAnalysis: priorResults.readinessAnalysis,
        }
      );
      const preparationPlan = await callClaude({
        system,
        userMessage,
        jsonMode: true,
        maxTokens: 24576,
        context: "ep-3-preparation-plan",
      });

      return { success: true, step: 3, preparationPlan };
    }

    // --- STEP 4: Show-Day Guidance ---
    if (step === 4) {
      if (
        !priorResults.testRequirements ||
        !priorResults.readinessAnalysis ||
        !priorResults.preparationPlan
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Step 4 requires all 3 prior results (testRequirements, readinessAnalysis, preparationPlan)."
        );
      }

      console.log("[eventPlanner] Step 4: Show-Day Guidance");
      const { system, userMessage } = buildEventPlannerPrompt(
        4, riderData, eventPrepPlan, detailedTestContext,
        {
          testRequirements: priorResults.testRequirements,
          readinessAnalysis: priorResults.readinessAnalysis,
          preparationPlan: priorResults.preparationPlan,
        }
      );
      const showDayGuidance = await callClaude({
        system,
        userMessage,
        jsonMode: true,
        maxTokens: 12288,
        context: "ep-4-show-day-guidance",
      });

      // Cache the full assembled result
      const fullResult = {
        testRequirements: priorResults.testRequirements,
        readinessAnalysis: priorResults.readinessAnalysis,
        preparationPlan: priorResults.preparationPlan,
        showDayGuidance,
      };

      await setCache(uid, cacheKey, fullResult, {
        dataSnapshotHash: hash,
        tierLabel: riderData.tier?.label || "unknown",
        dataTier: riderData.dataTier,
      });

      // Write-back metadata to eventPrepPlan document
      const generatedAt = new Date().toISOString();
      await db.collection("eventPrepPlans").doc(eventPrepPlanId).update({
        generatedPlan: {
          cacheKey: `${uid}_${cacheKey}`,
          generatedAt,
          hasTestRequirements: true,
          hasReadiness: true,
          hasPreparationPlan: true,
          hasShowDayGuidance: true,
        },
      });

      return { success: true, step: 4, showDayGuidance, generatedAt };
    }
  } catch (error) {
    throw wrapError(error, "getEventPlanner");
  }
}

module.exports = { handler };
