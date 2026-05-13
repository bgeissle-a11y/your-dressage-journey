/**
 * Physical Guidance API — 30-Day Cycle Architecture (April 2026)
 *
 * Generates personalized physical fitness and body awareness guidance
 * through 2 sequential API calls on a 30-day program cycle:
 *
 * Call 1 — Exercise Protocol: Priority tier classification, prescribed
 *   exercises, body awareness profile, pre-ride ritual.
 * Call 2 — Body Awareness (4-Week Program): Patterns, per-week noticing
 *   cues, debrief prompts, success metrics. Receives Exercise Protocol
 *   from Call 1 as input context.
 *
 * Hard Rule 1: Body Awareness receives cached Exercise Protocol as input.
 * Hard Rule 2: Both calls receive active GPT trajectory as input context.
 * Hard Rule 3: weeklyFocusItems extracted server-side, never AI-generated.
 *
 * Cycle state stored in: analysis/physicalGuidanceCycle/{userId}
 *
 * Input:  { forceRefresh?: boolean, staleOk?: boolean, advanceWeek?: boolean }
 * Output: { exerciseProtocol, weeks, weeklyFocusItems, cycleState, ... }
 */

const { validateAuth } = require("../lib/auth");
const { enforceCapability } = require("../lib/loadSubscription");
const { CAPABILITIES } = require("../lib/entitlements");
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { callClaude } = require("../lib/claudeCall");
const { buildPhysicalGuidancePrompt } = require("../lib/promptBuilder");
const { getCache, setCache, getStaleCache } = require("../lib/cacheManager");
const { tryAcquireLock, releaseLock } = require("../lib/inflightLock");
const {
  getCycleState,
  initCycle,
  checkRegenPermission,
  recordRegen,
  advanceWeekAndExtract,
  shouldExtendCycle,
  shouldTruncateFirstCycle,
  getUserTier,
} = require("../lib/cycleState");
const { refreshWeeklyFocusSnapshotSection } = require("../lib/weeklyFocusSnapshot");
const { getMaxTokens, tierFromLabel } = require("../lib/tokenBudgets");

const OUTPUT_TYPE = "physicalGuidance";

/**
 * Cloud Function handler for Physical Guidance generation.
 */
async function handler(request) {
  try {
    const uid = validateAuth(request);
    const {
      forceRefresh = false,
      staleOk = false,
      advanceWeek = false,
    } = request.data || {};

    // Capability gate. Manual mid-cycle regen (forceRefresh:true) requires
    // the Extended-only `regeneratePhysicalGuidance`. Initial cycle generation
    // and week advancement / staleOk reads use the base capability.
    const requiredCap = forceRefresh
      ? CAPABILITIES.regeneratePhysicalGuidance
      : CAPABILITIES.generatePhysicalGuidance;
    const sub = await enforceCapability(uid, requiredCap);
    const budgetTier = sub.isPilot ? "pilot" : tierFromLabel(sub.tier);

    // Handle week advancement request (no API call)
    if (advanceWeek) {
      const result = await advanceWeekAndExtract(uid, "physical");
      const cycleState = await getCycleState(uid, "physical");
      if (result?.advanced) {
        await refreshWeeklyFocusSnapshotSection(uid, "physical");
      }
      return { success: true, ...result, cycleState };
    }

    // Fast path: return cached data immediately
    if (staleOk && !forceRefresh) {
      const cached = await getStaleCache(uid, OUTPUT_TYPE, { maxAgeDays: 60 });
      if (cached) {
        const cycleState = await getCycleState(uid, "physical");
        return {
          success: true,
          ...cached.result,
          fromCache: true,
          stale: cached._stale !== false,
          generatedAt: cached.generatedAt,
          cycleState,
        };
      }
      // No cache — return early so the 30s client timeout isn't wasted.
      // Frontend self-healing pattern will trigger a full-timeout follow-up call.
      return { success: false, noCache: true };
    }

    // Prepare rider data
    const riderData = await prepareRiderData(uid, "physicalGuidance");
    const hash = riderData.dataSnapshot?.hash;
    const tier = await getUserTier(uid);

    // Check data tier
    if (riderData.dataTier < 1) {
      return {
        success: false,
        error: "insufficient_data",
        message:
          "We need a bit more data to generate your Physical Guidance. " +
          "Please complete your rider profile, add at least one horse profile, " +
          "and submit at least 3 post-ride debriefs.",
        dataTier: riderData.dataTier,
        tier: riderData.tier,
      };
    }

    // Check for physical self-assessment
    if (!riderData.selfAssessments?.physical?.hasAssessment) {
      return {
        success: false,
        error: "missing_assessment",
        message:
          "Physical Guidance requires a completed Physical Self-Assessment. " +
          "This gives us the body awareness data needed to create personalized " +
          "exercises and in-ride cues for you.",
        dataTier: riderData.dataTier,
        tier: riderData.tier,
      };
    }

    // Check cycle state and advance week if needed
    const cycleState = await getCycleState(uid, "physical");
    if (cycleState && ["active", "truncated"].includes(cycleState.status)) {
      await advanceWeekAndExtract(uid, "physical");
    }

    // Tier enforcement for regeneration — DISABLED during pilot
    // TODO: Re-enable after pilot when Stripe billing is live
    // if (forceRefresh) {
    //   const regenCheck = await checkRegenPermission(uid, "physical", { tier });
    //   if (!regenCheck.allowed) { ... }
    // }

    // Check cache (30-day cycle)
    if (!forceRefresh) {
      const cached = await getCache(uid, OUTPUT_TYPE, {
        currentHash: hash,
        maxAgeDays: 30,
      });
      if (cached) {
        const currentCycleState = await getCycleState(uid, "physical");
        return {
          success: true,
          ...cached.result,
          fromCache: true,
          tier: riderData.tier,
          dataTier: riderData.dataTier,
          dataSnapshot: riderData.dataSnapshot,
          generatedAt: cached.generatedAt,
          cycleState: currentCycleState,
        };
      }
    }

    // Check if cycle expired but insufficient new data → extend
    if (cycleState && forceRefresh && tier !== "top") {
      // shouldExtendCycle writes status="extended" internally when the third
      // arg is passed (Phase 7a) — no separate setCycleState needed here.
      const extend = await shouldExtendCycle(uid, cycleState.cycleStartDate, "physical");
      if (extend) {
        const cached = await getStaleCache(uid, OUTPUT_TYPE, { maxAgeDays: 90 });
        const updatedCycleState = await getCycleState(uid, "physical");
        return {
          success: true,
          ...(cached?.result || {}),
          fromCache: true,
          extended: true,
          tier: riderData.tier,
          dataTier: riderData.dataTier,
          dataSnapshot: riderData.dataSnapshot,
          generatedAt: cached?.generatedAt,
          cycleState: updatedCycleState,
        };
      }
    }

    // In-flight lock: prevent concurrent pipelines for the same user.
    const gotLock = await tryAcquireLock(uid, OUTPUT_TYPE);
    if (!gotLock) {
      console.log(`[physical] Another generation in flight for ${uid} — returning stale/regenerating response`);
      const staleForContention = await getStaleCache(uid, OUTPUT_TYPE, { maxAgeDays: 90 });
      const currentCycleState = await getCycleState(uid, "physical");
      if (staleForContention?.result) {
        return {
          success: true,
          ...staleForContention.result,
          fromCache: true,
          stale: true,
          regenerating: true,
          tier: riderData.tier,
          dataTier: riderData.dataTier,
          dataSnapshot: riderData.dataSnapshot,
          generatedAt: staleForContention.generatedAt,
          cycleState: currentCycleState,
        };
      }
      return {
        success: false,
        regenerating: true,
        noCache: true,
        tier: riderData.tier,
        dataTier: riderData.dataTier,
        cycleState: currentCycleState,
      };
    }

    try {
    // Read active GPT trajectory for context (Hard Rule 2)
    const trajectoryCache = await getCache(uid, "grandPrixTrajectory", { maxAgeDays: 9999 });
    const activeTrajectory = trajectoryCache?.result?.activePath || "ambitious_competitor";
    console.log(`[physical] Active trajectory context: ${activeTrajectory}`);

    // Determine truncated cycle
    const isFirstGen = !cycleState;
    const truncated = isFirstGen && shouldTruncateFirstCycle();

    // Per Token Budget Spec v2: Physical Protocol = 5000 tokens (Medium and Extended).
    const protocolMaxTokens = getMaxTokens("physical-protocol", budgetTier);

    console.log("[physical] Starting Call 1: Exercise Protocol");
    const { system: sys1, userMessage: msg1 } = buildPhysicalGuidancePrompt(
      1, riderData, { activeTrajectory, truncated }
    );

    const exerciseProtocol = await callClaude({
      system: sys1,
      userMessage: msg1,
      jsonMode: true,
      maxTokens: protocolMaxTokens,
      context: "physical-call1-exercise-protocol",
      uid,
    });

    // --- Call 2: Body Awareness (4-Week Program) ---
    // Receives Exercise Protocol from Call 1 as input context (Hard Rule 1).
    // Per Token Budget Spec v2: Physical Awareness = 5000 tokens.
    const awarenessMaxTokens = getMaxTokens("physical-awareness", budgetTier);

    console.log(`[physical] Starting Call 2: Body Awareness ${truncated ? "(truncated 2-week)" : "(4-week program)"}`);
    const { system: sys2, userMessage: msg2 } = buildPhysicalGuidancePrompt(
      2, riderData, { patternAnalysis: exerciseProtocol, activeTrajectory, truncated }
    );

    const bodyAwareness = await callClaude({
      system: sys2,
      userMessage: msg2,
      jsonMode: true,
      maxTokens: awarenessMaxTokens,
      context: "physical-call2-body-awareness",
      uid,
    });

    // Extract weeklyFocusItems from weeks[0].patterns (Hard Rule 3)
    const week0Patterns = bodyAwareness.weeks?.[0]?.patterns || [];
    const weeklyFocusItems = week0Patterns
      .filter((p) => p.feedsWeeklyFocus)
      .map((p) => ({
        text: p.noticingCuePrimary,
        sub: p.source || null,
        isHorseHealth: p.isHorseHealth || false,
      }));

    // Merge Call 1 + Call 2 into single document
    const result = {
      generatedAt: new Date().toISOString(),
      cycleId: new Date().toISOString().split("T")[0],
      dataSnapshot: {
        debriefCount: riderData.dataSnapshot?.debriefCount || 0,
        assessmentCount: riderData.dataSnapshot?.assessmentCount || 0,
        bodyMappingComplete: !!riderData.selfAssessments?.physical?.bodyMapping,
        tier,
      },
      activeTrajectory,
      patternAnalysis: exerciseProtocol.patternAnalysis || bodyAwareness.patternAnalysis || {
        primaryPatterns: [],
        secondaryPatterns: [],
        asymmetries: [],
      },
      weeks: bodyAwareness.weeks || [],
      exerciseProtocol: {
        priorityTier: exerciseProtocol.priorityTier || exerciseProtocol.priority_tier || "proprioceptive",
        exercises: exerciseProtocol.exercises || [],
        preRideRitual: exerciseProtocol.preRideRitual || exerciseProtocol.pre_ride_ritual || [],
      },
      bodyAwarenessProfile: exerciseProtocol.bodyAwarenessProfile || exerciseProtocol.body_awareness_profile || {
        level: riderData.selfAssessments?.physical?.kinestheticLevel || 5,
        blindSpots: [],
        strengths: [],
      },
      weeklyFocusItems,
      aiReasoning: bodyAwareness.aiReasoning || {
        patternCited: "",
        trajectoryLink: activeTrajectory,
      },
      stale: false,
      // Preserve legacy fields for backward compatibility
      patternAnalysisLegacy: exerciseProtocol,
      exercisePrescription: exerciseProtocol,
    };

    // Cache
    await setCache(uid, OUTPUT_TYPE, result, {
      dataSnapshotHash: hash,
      tierLabel: riderData.tier?.label || "unknown",
      dataTier: riderData.dataTier,
    });

    // Initialize cycle state
    const newCycleState = await initCycle(uid, "physical", { tier, truncated });

    // Record regen if this was a forceRefresh
    if (forceRefresh && !isFirstGen) {
      await recordRegen(uid, "physical");
    }

    // Propagate the new content into the home page's frozen weekly snapshot
    // so the user sees the regen on next page load instead of waiting for
    // next Monday's cron.
    await refreshWeeklyFocusSnapshotSection(uid, "physical");

    return {
      success: true,
      ...result,
      fromCache: false,
      tier: riderData.tier,
      dataTier: riderData.dataTier,
      dataSnapshot: riderData.dataSnapshot,
      generatedAt: result.generatedAt,
      cycleState: newCycleState,
    };
    } finally {
      await releaseLock(uid, OUTPUT_TYPE);
    }
  } catch (error) {
    throw wrapError(error, "getPhysicalGuidance");
  }
}

module.exports = { handler };
