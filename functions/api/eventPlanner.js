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

const crypto = require("crypto");
const { HttpsError } = require("firebase-functions/v2/https");
const { validateAuth, validateOwnership } = require("../lib/auth");
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { callClaude } = require("../lib/claudeCall");
const { buildEventPlannerPrompt } = require("../lib/promptBuilder");
const { buildDetailedTestContext } = require("../lib/testDatabase");
const { getCache, setCache, getStaleCache } = require("../lib/cacheManager");
const { db } = require("../lib/firebase");

/**
 * Compute a short hash of the event prep plan's key content fields.
 * Used to detect when the event plan itself changed (date, horses, goals)
 * vs unrelated rider data changes (new debriefs, reflections).
 *
 * @param {object} eventPrepPlan - The event prep plan document
 * @returns {string} 12-char hex hash
 */
function computeEventPrepHash(eventPrepPlan) {
  const keyFields = {
    eventDate: eventPrepPlan.eventDate,
    eventType: eventPrepPlan.eventType,
    horses: (eventPrepPlan.horses || []).map((h) => ({
      horseName: h.horseName,
      currentLevel: h.currentLevel,
      targetLevel: h.targetLevel,
      goals: h.goals,
      concerns: h.concerns,
    })),
    ridingFrequency: eventPrepPlan.ridingFrequency,
    coachAccess: eventPrepPlan.coachAccess,
    constraints: eventPrepPlan.constraints,
  };
  return crypto
    .createHash("md5")
    .update(JSON.stringify(keyFields))
    .digest("hex")
    .slice(0, 12);
}

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
    // Support multi-horse (v2) and single-horse (v1) formats
    const primaryHorse = (eventPrepPlan.horses && eventPrepPlan.horses[0]) || {};
    const targetLevel =
      primaryHorse.targetLevel || primaryHorse.currentLevel ||
      eventPrepPlan.targetLevel || eventPrepPlan.currentLevel || "Training";
    const detailedTestContext = buildDetailedTestContext(targetLevel);

    // --- STEP 1: Test Requirements Assembly ---
    if (step === 1) {
      const eventPrepHash = computeEventPrepHash(eventPrepPlan);

      // Cache check (only on step 1)
      if (!forceRefresh) {
        // 1. Try exact match (both rider data hash and event prep hash match)
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

        // 2. Stale-while-revalidate: serve stale cache with context flags
        const staleCache = await getStaleCache(uid, cacheKey, {
          currentHash: hash,
        });
        if (staleCache) {
          const cachedEventPrepHash = staleCache.eventPrepHash || null;
          const eventPrepChanged = cachedEventPrepHash !== eventPrepHash;
          const cacheAgeDays = staleCache.generatedAt
            ? (Date.now() - new Date(staleCache.generatedAt).getTime()) /
              (1000 * 60 * 60 * 24)
            : Infinity;

          // If event prep unchanged and cache <7 days old, serve as fresh
          if (!eventPrepChanged && cacheAgeDays < 7) {
            console.log(
              `[eventPlanner] Serving recent stale cache as fresh (${cacheAgeDays.toFixed(1)} days old, event prep unchanged)`
            );
            return {
              success: true,
              step: 1,
              fromCache: true,
              allSections: true,
              ...staleCache.result,
              tier: riderData.tier,
              dataTier: riderData.dataTier,
              dataSnapshot: riderData.dataSnapshot,
              generatedAt: staleCache.generatedAt,
            };
          }

          // Serve as stale with reason so frontend can show banner
          console.log(
            `[eventPlanner] Serving stale cache (reason: ${eventPrepChanged ? "event_plan_changed" : "rider_data_changed"}, age: ${cacheAgeDays.toFixed(1)} days)`
          );
          return {
            success: true,
            step: 1,
            fromCache: true,
            allSections: true,
            stale: true,
            staleReason: eventPrepChanged
              ? "event_plan_changed"
              : "rider_data_changed",
            eventPrepChanged,
            ...staleCache.result,
            tier: riderData.tier,
            dataTier: riderData.dataTier,
            dataSnapshot: riderData.dataSnapshot,
            generatedAt: staleCache.generatedAt,
          };
        }
      }

      console.log("[eventPlanner] Step 1: Test Requirements Assembly");
      const { system, userMessage } = buildEventPlannerPrompt(
        1, riderData, eventPrepPlan, detailedTestContext, {}
      );

      let testRequirements;
      try {
        testRequirements = await callClaude({
          system,
          userMessage,
          jsonMode: true,
          maxTokens: 16384,
          context: "ep-1-test-requirements",
        });
      } catch (err) {
        if (err.message && err.message.includes("TRUNCATED")) {
          console.error(
            `[eventPlanner] EP-1 truncated for level ${targetLevel}. ` +
            `This level may require more output tokens than allocated.`
          );
          throw new HttpsError(
            "resource-exhausted",
            "The test requirements analysis was too large to complete. " +
            "Please try again — if the issue persists, contact support."
          );
        }
        throw err;
      }

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

      const eventPrepHash = computeEventPrepHash(eventPrepPlan);
      await setCache(uid, cacheKey, fullResult, {
        dataSnapshotHash: hash,
        tierLabel: riderData.tier?.label || "unknown",
        dataTier: riderData.dataTier,
        eventPrepHash,
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
