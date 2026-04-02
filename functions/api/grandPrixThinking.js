/**
 * Grand Prix Thinking API — 30-Day Cycle Architecture (April 2026)
 *
 * Two-output architecture:
 *   L1 (Mental Performance): Monthly 30-day cycle. Full 4-week program
 *     generated upfront in a single call. Uses Sonnet.
 *   L2 (Training Trajectory): Monthly cycle. 4-call pipeline (Opus + Sonnet)
 *     with activePath (Best Fit) for cross-layer coherence.
 *
 * Hard Rule 1: L1 receives cached L2 activePath before generating.
 * Hard Rule 2: weeklyAssignments extracted server-side from current week assignments.
 * Hard Rule 3: Both outputs receive active GPT trajectory as input context.
 *
 * Cycle state stored in: analysis/grandPrixThinkingCycle/{userId}
 *
 * Input:  { forceRefresh?, layer?: "mental"|"trajectory", advanceWeek?: boolean }
 * Output: Mental → { selectedPath, weeklyAssignments, activeTrajectory, cycleState, ... }
 *         Trajectory → { currentStateAnalysis, trajectoryPaths, movementMaps, pathNarratives, activePath, ... }
 */

const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { callClaude } = require("../lib/claudeCall");
const {
  buildGPTL1Prompt,
  buildTrajectoryCall1Prompt,
  buildTrajectoryCall2Prompt,
  buildTrajectoryCall3Prompt,
  buildTrajectoryCall4Prompt,
} = require("../lib/promptBuilder");
const { buildTestDatabaseContext } = require("../lib/testDatabase");
const { getCache, setCache, getStaleCache } = require("../lib/cacheManager");
const { getStatus: getGenStatus } = require("../lib/generationStatus");
const {
  getCycleState,
  initCycle,
  checkRegenPermission,
  recordRegen,
  extractWeeklyFocusItems,
  advanceWeekAndExtract,
  shouldExtendCycle,
  shouldTruncateFirstCycle,
  getUserTier,
  computeCurrentWeek,
} = require("../lib/cycleState");

const OUTPUT_TYPE_MENTAL = "grandPrixThinking";
const OUTPUT_TYPE_TRAJECTORY = "grandPrixTrajectory";
const OPUS_MODEL = "claude-opus-4-6";

/**
 * Log horse name presence in results for validation.
 */
function logHorseNameUsage(label, result, riderData) {
  const validHorseNames = new Set(
    (riderData.horseSummaries || []).map((h) => h.name?.toLowerCase()).filter(Boolean)
  );
  const resultStr = JSON.stringify(result).toLowerCase();
  for (const name of validHorseNames) {
    if (resultStr.includes(name)) {
      console.log(`[gpt-validate] Found horse name in ${label}: ${name}`);
    }
  }
}

/**
 * Build a condensed cross-layer summary for prompt injection.
 */
function buildCrossLayerSummary(cachedDoc, direction) {
  if (!cachedDoc?.result) return null;

  if (direction === "mental-for-trajectory") {
    const { selectedPath } = cachedDoc.result;
    if (!selectedPath) return null;

    return `CROSS-LAYER CONTEXT — MENTAL PERFORMANCE INSIGHTS:
The rider has a Mental Performance path selected: ${selectedPath.title} (${selectedPath.id})
- Pattern cited: ${selectedPath.aiReasoning?.patternCited || "none"}
- Trajectory link: ${selectedPath.aiReasoning?.trajectoryLink || "none"}

When generating trajectory content, reference how long-term training goals connect to the rider's mental performance work.`;
  }

  if (direction === "trajectory-for-mental") {
    const { currentStateAnalysis, pathNarratives, movementMaps, activePath } = cachedDoc.result;
    if (!currentStateAnalysis) return null;

    const level = currentStateAnalysis.current_level;
    const transitions = (currentStateAnalysis.critical_transitions_ahead || [])
      .slice(0, 2)
      .map((t) => `${t.transition}: ${t.key_challenge} (${t.estimated_timeline})`)
      .join("; ");
    const recommended = pathNarratives?.recommended_path;
    const topMaps = (movementMaps?.movement_maps || [])
      .slice(0, 3)
      .map((m) => `${m.current} → ${m.gp_form}`)
      .join("; ");
    const topGap = (currentStateAnalysis.gaps || []).find((g) => g.priority === "high");

    return `CROSS-LAYER CONTEXT — TRAINING TRAJECTORY INSIGHTS:
The rider has a Training Trajectory analysis. Key findings:
- Active trajectory: ${activePath || recommended?.path_name || "not yet determined"}
- Current confirmed level: ${level?.confirmed_competition_level || "unknown"} | Training level: ${level?.training_level || "unknown"}
- Next transitions: ${transitions || "none identified"}
- Key movement progressions: ${topMaps || "none mapped yet"}
- Primary gap: ${topGap?.area || "none identified"} — ${topGap?.impact_on_advancement || ""}

When generating mental performance practices, connect them to the rider's long-term training goals.`;
  }

  return null;
}

/**
 * Extract L2 trajectory context for L1 prompt injection (Hard Rule 1).
 */
function extractL2TrajectoryContext(cachedTrajectoryDoc) {
  if (!cachedTrajectoryDoc?.result) return null;

  const { trajectoryPaths, activePath, pathNarratives } = cachedTrajectoryDoc.result;

  const activePathId = activePath
    || pathNarratives?.recommended_path?.path_name?.toLowerCase().replace(/\s+/g, "_")
    || null;

  if (!activePathId) return null;

  const pathIdMap = {
    "ambitious_competitor": "Ambitious Competitor",
    "steady_builder": "Steady Builder",
    "curious_explorer": "Curious Explorer",
  };
  const pathName = pathIdMap[activePathId] || activePathId;
  const pathData = trajectoryPaths?.paths?.find(
    (p) => p.name === pathName || p.name?.toLowerCase().replace(/\s+/g, "_") === activePathId
  );

  return {
    activePath: activePathId,
    title: pathName,
    currentPosition: pathData?.philosophy || "",
    milestones: pathData?.year1?.milestones || [],
  };
}

/**
 * Extract activePath from L2-2 paths array when activePath field is missing.
 */
function extractActivePathFromPaths(paths) {
  if (!paths?.length) return null;

  const bestFit = paths.find((p) => p.isBestFit === true);
  if (bestFit) {
    return bestFit.name?.toLowerCase().replace(/\s+/g, "_") || null;
  }

  const ambitious = paths.find((p) => p.name?.includes("Ambitious"));
  if (ambitious) return "ambitious_competitor";

  return null;
}

/**
 * Generate mental performance layer — 30-Day Cycle Architecture.
 * Single API call generates full 4-week program upfront.
 * weeklyAssignments extracted server-side from current week (Hard Rule 2).
 */
async function generateMentalLayer(uid, riderData, forceRefresh, crossLayerContext) {
  const hash = riderData.dataSnapshot?.hash;
  const tier = await getUserTier(uid);

  // Check cycle state
  const cycleState = await getCycleState(uid, "gpt");

  // If cycle exists and is active, check if week needs advancing
  if (cycleState && ["active", "truncated"].includes(cycleState.status)) {
    await advanceWeekAndExtract(uid, "gpt");
  }

  // Check cache (30-day cycle)
  if (!forceRefresh) {
    const cached = await getCache(uid, OUTPUT_TYPE_MENTAL, {
      currentHash: hash,
      maxAgeDays: 30,
    });
    if (cached) {
      const currentCycleState = await getCycleState(uid, "gpt");
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

    // Stale-while-revalidate
    const staleCache = await getStaleCache(uid, OUTPUT_TYPE_MENTAL, {
      currentHash: hash,
      maxAgeDays: 60,
    });
    if (staleCache?._stale) {
      const genStatus = await getGenStatus(uid);
      const currentCycleState = await getCycleState(uid, "gpt");
      return {
        success: true,
        ...staleCache.result,
        fromCache: true,
        stale: true,
        regenerating: genStatus?.status === "in_progress",
        tier: riderData.tier,
        dataTier: riderData.dataTier,
        dataSnapshot: riderData.dataSnapshot,
        generatedAt: staleCache.generatedAt,
        cycleState: currentCycleState,
      };
    }
  }

  // Check if cycle expired but insufficient new data → extend
  if (cycleState && forceRefresh) {
    if (tier !== "top") {
      const lastGenAt = cycleState.cycleStartDate;
      const extend = await shouldExtendCycle(uid, lastGenAt);
      if (extend) {
        // Extend the cycle — serve cached content for another 30 days
        await require("../lib/cycleState").setCycleState(uid, "gpt", {
          status: "extended",
        });
        const cached = await getStaleCache(uid, OUTPUT_TYPE_MENTAL, { maxAgeDays: 90 });
        const updatedCycleState = await getCycleState(uid, "gpt");
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
  }

  // Hard Rule 1: Read cached L2 for activePath context
  const cachedL2 = await getCache(uid, OUTPUT_TYPE_TRAJECTORY, { maxAgeDays: 9999 });
  const l2TrajectoryContext = extractL2TrajectoryContext(cachedL2);
  if (l2TrajectoryContext) {
    console.log(`[gpt-l1] Active trajectory from L2: ${l2TrajectoryContext.activePath}`);
  } else {
    console.log("[gpt-l1] No L2 trajectory found — defaulting to ambitious_competitor");
  }

  // Determine if this should be a truncated cycle
  const isFirstGen = !cycleState;
  const truncated = isFirstGen && shouldTruncateFirstCycle();

  // Determine max tokens based on tier
  const topTierMaxTokens = parseInt(process.env.PHYSICAL_GPT_TOP_TIER_MAX_TOKENS, 10) || 8192;
  const maxTokens = tier === "top" ? topTierMaxTokens : 8192;

  // Single Claude call (Sonnet) for full 4-week program
  console.log(`[gpt-l1] Generating ${truncated ? "truncated 2-week" : "full 4-week"} Mental Performance (Sonnet)`);
  const { system, userMessage } = buildGPTL1Prompt(riderData, l2TrajectoryContext, crossLayerContext, { truncated });
  const l1Output = await callClaude({
    system,
    userMessage,
    jsonMode: true,
    maxTokens,
    context: "grand-prix-l1-mental",
    uid,
  });

  logHorseNameUsage("L1", l1Output, riderData);

  // Hard Rule 2: Extract weeklyAssignments from weeks[0].assignments
  const currentWeekAssignments = l1Output.selectedPath?.weeks?.[0]?.assignments || [];
  l1Output.weeklyAssignments = currentWeekAssignments.map((item) => ({
    title: item.title,
    description: item.description,
    when: item.when,
    buildToward: item.trajectoryLink || "",
  }));

  // Ensure stale/regenerateAfter fields
  l1Output.stale = false;
  l1Output.regenerateAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Cache the result
  await setCache(uid, OUTPUT_TYPE_MENTAL, l1Output, {
    dataSnapshotHash: hash,
    tierLabel: riderData.tier?.label || "unknown",
    dataTier: riderData.dataTier,
  });

  // Initialize cycle state
  const newCycleState = await initCycle(uid, "gpt", { tier, truncated });

  // Record regen if this was a forceRefresh (not first gen)
  if (forceRefresh && !isFirstGen) {
    await recordRegen(uid, "gpt");
  }

  return {
    success: true,
    ...l1Output,
    fromCache: false,
    tier: riderData.tier,
    dataTier: riderData.dataTier,
    dataSnapshot: riderData.dataSnapshot,
    generatedAt: l1Output.generatedAt || new Date().toISOString(),
    cycleState: newCycleState,
  };
}

/**
 * Generate training trajectory layer using 4-call pipeline.
 * Now includes activePath extraction for L1 cross-layer coherence.
 *
 * Call graph:
 *   L2-1 (Opus) → [L2-2 (Opus) || L2-3 (Sonnet)] → L2-4 (Sonnet)
 */
async function generateTrajectoryLayer(uid, riderData, forceRefresh, crossLayerContext) {
  const hash = riderData.dataSnapshot?.hash;

  // Check cache (30-day monthly cycle)
  if (!forceRefresh) {
    const cached = await getCache(uid, OUTPUT_TYPE_TRAJECTORY, {
      currentHash: hash,
      maxAgeDays: 30,
    });
    if (cached) {
      return {
        success: true,
        ...cached.result,
        fromCache: true,
        tier: riderData.tier,
        dataTier: riderData.dataTier,
        dataSnapshot: riderData.dataSnapshot,
        generatedAt: cached.generatedAt,
      };
    }

    // Stale-while-revalidate
    const staleCache = await getStaleCache(uid, OUTPUT_TYPE_TRAJECTORY, {
      currentHash: hash,
      maxAgeDays: 60,
    });
    if (staleCache?._stale) {
      const genStatus = await getGenStatus(uid);
      return {
        success: true,
        ...staleCache.result,
        fromCache: true,
        stale: true,
        regenerating: genStatus?.status === "in_progress",
        tier: riderData.tier,
        dataTier: riderData.dataTier,
        dataSnapshot: riderData.dataSnapshot,
        generatedAt: staleCache.generatedAt,
      };
    }
  }

  // Determine rider's current level for test database filtering
  const currentLevel = riderData.profile?.currentLevel
    || riderData.horseSummaries?.[0]?.level
    || "Training";
  const testContext = buildTestDatabaseContext(currentLevel);

  // --- L2-1: Current State Analysis (Opus) ---
  console.log("[trajectory] Starting L2-1: Current State Analysis (Opus)");
  const { system: sys1, userMessage: msg1 } = buildTrajectoryCall1Prompt(riderData, testContext, crossLayerContext);
  const currentStateAnalysis = await callClaude({
    system: sys1,
    userMessage: msg1,
    model: OPUS_MODEL,
    jsonMode: true,
    maxTokens: 8192,
    context: "trajectory-call1-state-analysis",
    uid,
  });
  logHorseNameUsage("L2-1", currentStateAnalysis, riderData);

  // --- L2-2 & L2-3 in parallel (both depend only on L2-1) ---
  console.log("[trajectory] Starting L2-2 (Opus) + L2-3 (Sonnet) in parallel");
  const { system: sys2, userMessage: msg2 } = buildTrajectoryCall2Prompt(riderData, currentStateAnalysis, testContext, crossLayerContext);
  const { system: sys3, userMessage: msg3 } = buildTrajectoryCall3Prompt(riderData, currentStateAnalysis, testContext);

  const settled = await Promise.allSettled([
    callClaude({
      system: sys2,
      userMessage: msg2,
      model: OPUS_MODEL,
      jsonMode: true,
      maxTokens: 8192,
      context: "trajectory-call2-three-paths",
      uid,
    }),
    callClaude({
      system: sys3,
      userMessage: msg3,
      jsonMode: true,
      maxTokens: 4096,
      context: "trajectory-call3-movement-maps",
      uid,
    }),
  ]);

  // L2-2 is critical
  if (settled[0].status === "rejected") {
    throw settled[0].reason || new Error("Failed to generate trajectory paths (L2-2).");
  }
  const trajectoryPaths = settled[0].value;
  logHorseNameUsage("L2-2", trajectoryPaths, riderData);

  // L2-3 is non-critical
  let movementMaps;
  let movementMapsError = false;
  if (settled[1].status === "fulfilled") {
    movementMaps = settled[1].value;
    logHorseNameUsage("L2-3", movementMaps, riderData);
  } else {
    console.error("[trajectory] L2-3 movement maps failed, using fallback:", settled[1].reason?.message || settled[1].reason);
    movementMapsError = true;
    movementMaps = {
      movement_maps: [],
      overall_connection_narrative: "Movement mapping is temporarily unavailable. Your trajectory paths and narratives are still fully personalized.",
    };
  }

  // --- L2-4: Path Narratives (Sonnet) ---
  console.log("[trajectory] Starting L2-4: Path Narratives (Sonnet)");
  const { system: sys4, userMessage: msg4 } = buildTrajectoryCall4Prompt(
    riderData, currentStateAnalysis, trajectoryPaths, movementMaps, crossLayerContext
  );
  const pathNarratives = await callClaude({
    system: sys4,
    userMessage: msg4,
    jsonMode: true,
    maxTokens: 4096,
    context: "trajectory-call4-narratives",
    uid,
  });
  logHorseNameUsage("L2-4", pathNarratives, riderData);

  // Extract activePath from L2-2 output (Best Fit)
  const activePath = trajectoryPaths.activePath
    || extractActivePathFromPaths(trajectoryPaths.paths)
    || "ambitious_competitor";
  console.log(`[trajectory] Active path (Best Fit): ${activePath}`);

  // Assemble combined result
  const result = {
    currentStateAnalysis,
    trajectoryPaths,
    movementMaps,
    pathNarratives,
    activePath,
    ...(movementMapsError && { partialResults: true, failedComponents: ["movementMaps"] }),
  };

  // Cache (only if all calls succeeded)
  if (!movementMapsError) {
    await setCache(uid, OUTPUT_TYPE_TRAJECTORY, result, {
      dataSnapshotHash: hash,
      tierLabel: riderData.tier?.label || "unknown",
      dataTier: riderData.dataTier,
    });
  }

  return {
    success: true,
    ...result,
    fromCache: false,
    tier: riderData.tier,
    dataTier: riderData.dataTier,
    dataSnapshot: riderData.dataSnapshot,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Cloud Function handler for Grand Prix Thinking.
 */
async function handler(request) {
  try {
    const uid = validateAuth(request);
    const {
      forceRefresh = false,
      layer = "mental",
      staleOk = false,
      advanceWeek = false,
    } = request.data || {};

    // Handle week advancement request (no API call — just reads cached doc)
    if (advanceWeek) {
      const result = await advanceWeekAndExtract(uid, "gpt");
      const cycleState = await getCycleState(uid, "gpt");
      return { success: true, ...result, cycleState };
    }

    // Fast path: return cached data immediately
    if (staleOk && !forceRefresh) {
      const cacheType = layer === "trajectory" ? OUTPUT_TYPE_TRAJECTORY : OUTPUT_TYPE_MENTAL;
      const maxAge = 60;
      const cached = await getStaleCache(uid, cacheType, { maxAgeDays: maxAge });
      if (cached) {
        const cycleState = layer === "mental" ? await getCycleState(uid, "gpt") : null;
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

    // Fetch rider data and cross-layer cache in parallel
    const crossLayerType = layer === "trajectory"
      ? OUTPUT_TYPE_MENTAL
      : OUTPUT_TYPE_TRAJECTORY;

    const gpOutputType = layer === "trajectory" ? "grandPrixTrajectory" : "grandPrixMental";
    const [riderData, crossLayerCache] = await Promise.all([
      prepareRiderData(uid, gpOutputType),
      getCache(uid, crossLayerType, { maxAgeDays: 9999 }),
    ]);

    if (riderData.dataTier < 1) {
      return {
        success: false,
        error: "insufficient_data",
        message:
          "We need a bit more data to generate your Grand Prix Thinking dashboard. " +
          "Please complete your rider profile, add at least one horse, " +
          "and submit at least 3 post-ride debriefs.",
        dataTier: riderData.dataTier,
        tier: riderData.tier,
      };
    }

    // Tier enforcement for mental layer regeneration — DISABLED during pilot
    // TODO: Re-enable after pilot when Stripe billing is live
    // if (layer === "mental" && forceRefresh) {
    //   const regenCheck = await checkRegenPermission(uid, "gpt");
    //   if (!regenCheck.allowed) { ... }
    // }

    // Build condensed cross-layer summary
    const crossLayerContext = buildCrossLayerSummary(
      crossLayerCache,
      layer === "trajectory" ? "mental-for-trajectory" : "trajectory-for-mental"
    );
    if (crossLayerContext) {
      console.log(`[gpt] Cross-layer context available (${layer === "trajectory" ? "mental→trajectory" : "trajectory→mental"})`);
    }

    if (layer === "trajectory") {
      return await generateTrajectoryLayer(uid, riderData, forceRefresh, crossLayerContext);
    }

    return await generateMentalLayer(uid, riderData, forceRefresh, crossLayerContext);
  } catch (error) {
    throw wrapError(error, "getGrandPrixThinking");
  }
}

module.exports = { handler };
