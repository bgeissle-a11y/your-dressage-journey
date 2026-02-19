/**
 * Journey Map API
 *
 * Generates a chronological coaching narrative and visual timeline
 * of the rider's journey through 3 sequential API calls:
 *
 * Call 1 (Data Synthesis):  Chronological analysis → themes, milestones, patterns
 * Call 2 (Narrative):       Coaching narrative in markdown
 * Call 3 (Visualization):   Timeline events structured for visual rendering
 *
 * Input:  { forceRefresh?: boolean }
 * Output: { synthesis, narrative, visualization, tier, dataTier, generatedAt }
 */

const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { callClaude } = require("../lib/claudeCall");
const { buildJourneyMapPrompt } = require("../lib/promptBuilder");
const { getCache, setCache, getStaleCache } = require("../lib/cacheManager");
const { getStatus: getGenStatus } = require("../lib/generationStatus");

const OUTPUT_TYPE = "journeyMap";

/**
 * Cloud Function handler for Journey Map generation.
 *
 * @param {object} request - Firebase v2 onCall request
 * @returns {Promise<object>} Journey Map result
 */
async function handler(request) {
  try {
    const uid = validateAuth(request);
    const { forceRefresh = false } = request.data || {};

    // Prepare rider data
    const riderData = await prepareRiderData(uid);
    const hash = riderData.dataSnapshot?.hash;

    // Check data tier
    if (riderData.dataTier < 1) {
      return {
        success: false,
        error: "insufficient_data",
        message:
          "We need a bit more data to generate your Journey Map. " +
          "Please complete your rider profile, add at least one horse profile, " +
          "and submit at least 3 post-ride debriefs.",
        dataTier: riderData.dataTier,
        tier: riderData.tier,
      };
    }

    // Check cache
    if (!forceRefresh) {
      const cached = await getCache(uid, OUTPUT_TYPE, { currentHash: hash });
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
      const staleCache = await getStaleCache(uid, OUTPUT_TYPE, { currentHash: hash });
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

    // --- Call 1: Data Synthesis ---
    const { system: sys1, userMessage: msg1 } = buildJourneyMapPrompt(
      1,
      riderData
    );
    const synthesis = await callClaude({
      system: sys1,
      userMessage: msg1,
      jsonMode: true,
      maxTokens: 8192,
      context: "journey-map-synthesis",
    });

    // --- Calls 2 & 3 in parallel (both depend on Call 1, not each other) ---
    const { system: sys2, userMessage: msg2 } = buildJourneyMapPrompt(
      2,
      riderData,
      { synthesis }
    );
    const { system: sys3, userMessage: msg3 } = buildJourneyMapPrompt(
      3,
      riderData,
      { synthesis }
    );

    const [narrativeResult, visualizationResult] = await Promise.allSettled([
      callClaude({
        system: sys2,
        userMessage: msg2,
        jsonMode: false,
        maxTokens: 4096,
        context: "journey-map-narrative",
      }),
      callClaude({
        system: sys3,
        userMessage: msg3,
        jsonMode: true,
        maxTokens: 2048,
        context: "journey-map-visualization",
      }),
    ]);

    const narrative = narrativeResult.status === "fulfilled"
      ? narrativeResult.value : null;
    const visualization = visualizationResult.status === "fulfilled"
      ? visualizationResult.value : null;

    if (narrativeResult.status === "rejected") {
      console.error("[journeyMap] Narrative generation failed:", narrativeResult.reason?.message);
    }
    if (visualizationResult.status === "rejected") {
      console.error("[journeyMap] Visualization generation failed:", visualizationResult.reason?.message);
    }

    // If both failed, throw so the client gets an error
    if (!narrative && !visualization) {
      throw narrativeResult.reason || visualizationResult.reason ||
        new Error("Both narrative and visualization generation failed.");
    }

    // Assemble complete result
    const partialResults = !narrative || !visualization;
    const result = { synthesis, narrative, visualization };

    // Only cache complete results (don't cache partial)
    if (!partialResults) {
      await setCache(uid, OUTPUT_TYPE, result, {
        dataSnapshotHash: hash,
        tierLabel: riderData.tier?.label || "unknown",
        dataTier: riderData.dataTier,
      });
    }

    return {
      success: true,
      ...result,
      ...(partialResults && { partialResults: true }),
      fromCache: false,
      tier: riderData.tier,
      dataTier: riderData.dataTier,
      dataSnapshot: riderData.dataSnapshot,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw wrapError(error, "getJourneyMap");
  }
}

module.exports = { handler };
