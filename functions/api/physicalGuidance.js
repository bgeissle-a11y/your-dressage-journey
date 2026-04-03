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
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { callClaude } = require("../lib/claudeCall");
const { buildPhysicalGuidancePrompt } = require("../lib/promptBuilder");
const { getCache, setCache, getStaleCache } = require("../lib/cacheManager");
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

    // Handle week advancement request (no API call)
    if (advanceWeek) {
      const result = await advanceWeekAndExtract(uid, "physical");
      const cycleState = await getCycleState(uid, "physical");
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
      const extend = await shouldExtendCycle(uid, cycleState.cycleStartDate);
      if (extend) {
        const { setCycleState } = require("../lib/cycleState");
        await setCycleState(uid, "physical", { status: "extended" });
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

    // Read active GPT trajectory for context (Hard Rule 2)
    const trajectoryCache = await getCache(uid, "grandPrixTrajectory", { maxAgeDays: 9999 });
    const activeTrajectory = trajectoryCache?.result?.activePath || "ambitious_competitor";
    console.log(`[physical] Active trajectory context: ${activeTrajectory}`);

    // Determine truncated cycle
    const isFirstGen = !cycleState;
    const truncated = isFirstGen && shouldTruncateFirstCycle();

    // --- Call 1: Exercise Protocol (pattern analysis + exercises + pre-ride ritual) ---
    // Standard 8192: pattern analysis + 5-8 exercises + pre-ride ritual + body awareness profile
    // Top tier: configurable via env var, defaults to 8192
    const protocolMaxTokens = tier === "top"
      ? (parseInt(process.env.PHYSICAL_PROTOCOL_TOP_TIER_MAX_TOKENS, 10) || 8192)
      : 8192;

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
    // Receives Exercise Protocol from Call 1 as input context (Hard Rule 1)
    // Standard 8192: full 4-week program with patterns, noticing cues, debrief prompts
    // (4000 was too low — truncated at ~2 weeks; 8192 fits full 4 weeks comfortably)
    const awarenessMaxTokens = tier === "top"
      ? (parseInt(process.env.PHYSICAL_AWARENESS_TOP_TIER_MAX_TOKENS, 10) || 8192)
      : 8192;

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
  } catch (error) {
    throw wrapError(error, "getPhysicalGuidance");
  }
}

module.exports = { handler };
