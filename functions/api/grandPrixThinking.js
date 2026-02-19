/**
 * Grand Prix Thinking API
 *
 * Supports two layers:
 *   Mental Performance (default): 3-path immediate optimization dashboard
 *   Training Trajectory: 4-call pipeline (Opus + Sonnet) with test DB integration
 *
 * Mental Performance paths (pre-ride, in-saddle, resilience) each have
 * a progressive 4-week implementation plan with personalized practices.
 *
 * Training Trajectory uses a 4-call pipeline:
 *   L2-1: Current State Analysis (Opus)
 *   L2-2: Three Trajectories — Steady Builder / Ambitious Competitor / Curious Explorer (Opus)
 *   L2-3: Movement Connection Mapping (Sonnet)  [parallel with L2-2]
 *   L2-4: Path Narratives (Sonnet)  [depends on L2-1, L2-2, L2-3]
 *
 * Input:  { forceRefresh?: boolean, layer?: "mental"|"trajectory" }
 * Output: Mental → { paths, recommendedPath?, tier, dataTier, generatedAt, dataSnapshot }
 *         Trajectory → { currentStateAnalysis, trajectoryPaths, movementMaps, pathNarratives, ... }
 */

const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { callClaude } = require("../lib/claudeCall");
const {
  buildGrandPrixPathPrompt,
  buildTrajectoryCall1Prompt,
  buildTrajectoryCall2Prompt,
  buildTrajectoryCall3Prompt,
  buildTrajectoryCall4Prompt,
} = require("../lib/promptBuilder");
const { buildTestDatabaseContext } = require("../lib/testDatabase");
const { getCache, setCache, getStaleCache } = require("../lib/cacheManager");
const { getStatus: getGenStatus } = require("../lib/generationStatus");

const OUTPUT_TYPE_MENTAL = "grandPrixThinking";
const OUTPUT_TYPE_TRAJECTORY = "grandPrixTrajectory";
const MENTAL_PATH_IDS = ["pre-ride", "in-saddle", "resilience"];
const OPUS_MODEL = "claude-opus-4-6";

/**
 * Post-validate a single mental path result against source data.
 */
function validateMentalPath(pathResult, riderData) {
  if (!MENTAL_PATH_IDS.includes(pathResult.id)) {
    console.warn(`[gpt-validate] Unexpected mental path ID: ${pathResult.id}`);
  }

  // Validate weeks structure
  if (pathResult.weeks && Array.isArray(pathResult.weeks)) {
    for (const week of pathResult.weeks) {
      if (typeof week.week !== "number" || week.week < 1 || week.week > 4) {
        console.warn(`[gpt-validate] Invalid week number: ${week.week}`);
      }
    }
  }

  // Log horse name usage
  const validHorseNames = new Set(
    (riderData.horseSummaries || []).map((h) => h.name?.toLowerCase()).filter(Boolean)
  );
  const resultStr = JSON.stringify(pathResult).toLowerCase();
  for (const name of validHorseNames) {
    if (resultStr.includes(name)) {
      console.log(`[gpt-validate] Found valid horse name in ${pathResult.id}: ${name}`);
    }
  }

  return pathResult;
}

/**
 * Log horse name presence in trajectory results for validation.
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
 * Returns null if no cached result exists or essential data is missing.
 *
 * @param {object|null} cachedDoc - Raw cache document from getCache()
 * @param {string} direction - "mental-for-trajectory" | "trajectory-for-mental"
 * @returns {string|null} Formatted text block (~300-500 tokens) or null
 */
function buildCrossLayerSummary(cachedDoc, direction) {
  if (!cachedDoc?.result) return null;

  if (direction === "mental-for-trajectory") {
    const { paths, recommendedPath } = cachedDoc.result;
    if (!paths?.length) return null;

    const pathSummaries = paths
      .map((p) => `- ${p.title} (${p.id}): ${p.description || p.subtitle || ""}`)
      .join("\n");
    const recommended = paths.find((p) => p.id === recommendedPath);
    const whyText = recommended?.why || "";

    return `CROSS-LAYER CONTEXT — MENTAL PERFORMANCE INSIGHTS:
The rider has a Mental Performance dashboard. Key findings:
- Recommended starting path: ${recommendedPath || "none determined"}
${pathSummaries}
- Why the recommended path matters: ${whyText}

When generating trajectory content, reference how long-term training goals connect to the rider's mental performance work. If the rider is working on self-regulation (In-Saddle), note how that skill serves specific movements in their trajectory. If working on Pre-Ride preparation, connect body scan targets to movements at their next level. If working on Resilience, anchor growth mindset in their trajectory vision.`;
  }

  if (direction === "trajectory-for-mental") {
    const { currentStateAnalysis, pathNarratives, movementMaps } = cachedDoc.result;
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
- Current confirmed level: ${level?.confirmed_competition_level || "unknown"} | Training level: ${level?.training_level || "unknown"}
- Recommended trajectory: ${recommended?.path_name || "not yet determined"}
- Next transitions: ${transitions || "none identified"}
- Key movement progressions: ${topMaps || "none mapped yet"}
- Primary gap: ${topGap?.area || "none identified"} — ${topGap?.impact_on_advancement || ""}

When generating mental performance practices, connect them to the rider's long-term training goals. Body scan targets should address physical patterns relevant to their next level transition. Self-talk scripts should reference specific movements they are progressing toward. Resilience reframes should anchor in their trajectory vision.`;
  }

  return null;
}

/**
 * Determine the recommended starting path for mental performance layer.
 */
function determineRecommendedPath(paths, riderData) {
  const aiRecommended = paths.find((p) => p.recommended === true);
  if (aiRecommended) return aiRecommended.id;

  const mental = riderData.mentalPatterns || {};
  const selfAssess = riderData.selfAssessments || {};

  if (selfAssess.lostDialogue || mental.selfPerceptionAlignment === "underselling") {
    return "resilience";
  }

  const rideHistory = riderData.rideHistory || {};
  if (rideHistory.trends?.quality === "declining" || rideHistory.ridingStreak < 2) {
    return "pre-ride";
  }

  if (mental.bestConditions?.mentalState === "frustrated" ||
      rideHistory.distributions?.mentalState?.frustrated > 0.2) {
    return "in-saddle";
  }

  return "pre-ride";
}

/**
 * Generate mental performance layer (3 paths with 4-week drilldowns).
 */
async function generateMentalLayer(uid, riderData, forceRefresh, crossLayerContext) {
  const hash = riderData.dataSnapshot?.hash;

  // Check cache
  if (!forceRefresh) {
    const cached = await getCache(uid, OUTPUT_TYPE_MENTAL, {
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

    // Stale-while-revalidate: return stale cache if available
    const staleCache = await getStaleCache(uid, OUTPUT_TYPE_MENTAL, {
      currentHash: hash,
      maxAgeDays: 30,
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

  // Generate all 3 paths in parallel — use allSettled for partial results
  const settled = await Promise.allSettled(
    MENTAL_PATH_IDS.map(async (pathId) => {
      const { system, userMessage } = buildGrandPrixPathPrompt(pathId, riderData, crossLayerContext);
      const pathData = await callClaude({
        system,
        userMessage,
        jsonMode: true,
        maxTokens: 8192,
        context: `grand-prix-${pathId}`,
      });
      return validateMentalPath(pathData, riderData);
    })
  );

  const pathResults = [];
  const failedPaths = [];
  for (let i = 0; i < settled.length; i++) {
    if (settled[i].status === "fulfilled") {
      pathResults.push(settled[i].value);
    } else {
      failedPaths.push(MENTAL_PATH_IDS[i]);
      pathResults.push({
        id: MENTAL_PATH_IDS[i],
        _error: true,
        _errorMessage: "This path encountered a temporary issue. Try refreshing.",
      });
      console.error(`[gpt] Mental path ${MENTAL_PATH_IDS[i]} failed:`, settled[i].reason?.message || settled[i].reason);
    }
  }

  // If ALL paths failed, throw so the client gets an error
  if (failedPaths.length === MENTAL_PATH_IDS.length) {
    throw settled[0].reason || new Error("All mental performance paths failed to generate.");
  }

  const successfulPaths = pathResults.filter((p) => !p._error);
  const recommendedPath = determineRecommendedPath(successfulPaths, riderData);
  for (const path of pathResults) {
    if (!path._error) {
      path.recommended = path.id === recommendedPath;
    }
  }

  const result = {
    paths: pathResults,
    recommendedPath,
    personalizationNotes: "",
    ...(failedPaths.length > 0 && { partialResults: true, failedPaths }),
  };

  // Only cache if all paths succeeded (don't cache partial results)
  if (failedPaths.length === 0) {
    await setCache(uid, OUTPUT_TYPE_MENTAL, result, {
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
 * Generate training trajectory layer using 4-call pipeline.
 *
 * Call graph:
 *   L2-1 (Opus) → [L2-2 (Opus) || L2-3 (Sonnet)] → L2-4 (Sonnet)
 */
async function generateTrajectoryLayer(uid, riderData, forceRefresh, crossLayerContext) {
  const hash = riderData.dataSnapshot?.hash;

  // Check cache
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

    // Stale-while-revalidate: return stale cache if available
    const staleCache = await getStaleCache(uid, OUTPUT_TYPE_TRAJECTORY, {
      currentHash: hash,
      maxAgeDays: 30,
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
  });
  logHorseNameUsage("L2-1", currentStateAnalysis, riderData);

  // --- L2-2 & L2-3 in parallel (both depend only on L2-1) ---
  console.log("[trajectory] Starting L2-2 (Opus) + L2-3 (Sonnet) in parallel");
  const { system: sys2, userMessage: msg2 } = buildTrajectoryCall2Prompt(riderData, currentStateAnalysis, testContext, crossLayerContext);
  const { system: sys3, userMessage: msg3 } = buildTrajectoryCall3Prompt(riderData, currentStateAnalysis, testContext);

  const [trajectoryPaths, movementMaps] = await Promise.all([
    callClaude({
      system: sys2,
      userMessage: msg2,
      model: OPUS_MODEL,
      jsonMode: true,
      maxTokens: 8192,
      context: "trajectory-call2-three-paths",
    }),
    callClaude({
      system: sys3,
      userMessage: msg3,
      jsonMode: true,
      maxTokens: 4096,
      context: "trajectory-call3-movement-maps",
    }),
  ]);
  logHorseNameUsage("L2-2", trajectoryPaths, riderData);
  logHorseNameUsage("L2-3", movementMaps, riderData);

  // --- L2-4: Path Narratives (Sonnet, depends on all 3 prior) ---
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
  });
  logHorseNameUsage("L2-4", pathNarratives, riderData);

  // Assemble combined result
  const result = {
    currentStateAnalysis,
    trajectoryPaths,
    movementMaps,
    pathNarratives,
  };

  // Cache
  await setCache(uid, OUTPUT_TYPE_TRAJECTORY, result, {
    dataSnapshotHash: hash,
    tierLabel: riderData.tier?.label || "unknown",
    dataTier: riderData.dataTier,
  });

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
    const { forceRefresh = false, layer = "mental" } = request.data || {};

    // Fetch rider data and cross-layer cache in parallel
    const crossLayerType = layer === "trajectory"
      ? OUTPUT_TYPE_MENTAL
      : OUTPUT_TYPE_TRAJECTORY;

    const [riderData, crossLayerCache] = await Promise.all([
      prepareRiderData(uid),
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

    // Build condensed cross-layer summary (null if no cache exists)
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
