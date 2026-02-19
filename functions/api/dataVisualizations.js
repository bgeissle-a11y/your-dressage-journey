/**
 * Data Visualizations API
 *
 * Generates AI-derived visualization data through 3 API calls:
 *
 * DV-1 (Pattern Extraction): Analyze debriefs for themes, sentiment, focus areas
 * DV-2 (Goal Mapping):       Map debrief/reflection content against rider goals
 * DV-3 (Insight Narrative):  Generate coaching narratives for each chart
 *
 * DV-1 and DV-2 run in parallel. DV-3 depends on both.
 *
 * Input:  { forceRefresh?: boolean }
 * Output: { patternExtraction, goalMapping, insightNarratives, tier, dataTier, generatedAt }
 */

const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { callClaude } = require("../lib/claudeCall");
const { buildDataVisualizationPrompt } = require("../lib/promptBuilder");
const { getCache, setCache, getStaleCache } = require("../lib/cacheManager");
const { getStatus: getGenStatus } = require("../lib/generationStatus");

const OUTPUT_TYPE = "dataVisualizations";

/**
 * Cloud Function handler for Data Visualizations generation.
 *
 * @param {object} request - Firebase v2 onCall request
 * @returns {Promise<object>} Data Visualizations result
 */
async function handler(request) {
  try {
    const uid = validateAuth(request);
    const { forceRefresh = false } = request.data || {};

    // Prepare rider data
    const riderData = await prepareRiderData(uid);
    const hash = riderData.dataSnapshot?.hash;

    // Check data tier — need Tier 1+ (same as other AI features)
    if (riderData.dataTier < 1) {
      return {
        success: false,
        error: "insufficient_data",
        message:
          "We need a bit more data to generate your Data Visualizations. " +
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

    // --- DV-1 and DV-2 in parallel (they don't depend on each other) ---
    const { system: sys1, userMessage: msg1 } = buildDataVisualizationPrompt(
      1,
      riderData
    );
    const { system: sys2, userMessage: msg2 } = buildDataVisualizationPrompt(
      2,
      riderData
    );

    const [patternExtraction, goalMapping] = await Promise.all([
      callClaude({
        system: sys1,
        userMessage: msg1,
        jsonMode: true,
        maxTokens: 4096,
        context: "dv-pattern-extraction",
      }),
      callClaude({
        system: sys2,
        userMessage: msg2,
        jsonMode: true,
        maxTokens: 4096,
        context: "dv-goal-mapping",
      }),
    ]);

    // --- DV-3: Insight Narratives (depends on DV-1 + DV-2) ---
    const { system: sys3, userMessage: msg3 } = buildDataVisualizationPrompt(
      3,
      riderData,
      { patternExtraction, goalMapping }
    );
    const insightNarratives = await callClaude({
      system: sys3,
      userMessage: msg3,
      jsonMode: true,
      maxTokens: 4096,
      context: "dv-insight-narratives",
    });

    // Assemble complete result
    const result = { patternExtraction, goalMapping, insightNarratives };

    // Cache
    await setCache(uid, OUTPUT_TYPE, result, {
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
  } catch (error) {
    throw wrapError(error, "getDataVisualizations");
  }
}

module.exports = { handler };
