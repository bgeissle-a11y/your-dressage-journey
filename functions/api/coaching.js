/**
 * Multi-Voice Coaching API
 *
 * Generates coaching insights from 4 distinct coaching voices,
 * each analyzing the same rider data through a different lens.
 * Also generates a Quick Insights summary for at-a-glance viewing.
 *
 * Voice 0: The Classical Master (Principles & Philosophy)
 * Voice 1: The Empathetic Coach (Rider Psychology & Partnership)
 * Voice 2: The Technical Coach (Biomechanics & Precision)
 * Voice 3: The Practical Strategist (Goal Achievement & Planning)
 *
 * Input:  { voiceIndex?: 0|1|2|3, forceRefresh?: boolean }
 * Output: { voices: { 0: {...}, ... }, quickInsights: {...}, tier, dataTier, generatedAt }
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { callClaude } = require("../lib/claudeCall");
const { buildCoachingPrompt, buildQuickInsightsPrompt, VOICE_META } = require("../lib/promptBuilder");
const { getCache, setCache, getStaleCache } = require("../lib/cacheManager");
const { getStatus: getGenStatus } = require("../lib/generationStatus");

const OUTPUT_TYPE = "coaching";
const INSIGHTS_OUTPUT_TYPE = "coaching_insights";

/**
 * Generate a single coaching voice result.
 *
 * @param {number} voiceIndex - 0-3
 * @param {object} riderData - Output from prepareRiderData()
 * @param {boolean} forceRefresh - Skip cache
 * @returns {Promise<object>} Voice result with meta + content
 */
async function generateVoice(voiceIndex, riderData, forceRefresh) {
  const meta = VOICE_META[voiceIndex];
  const hash = riderData.dataSnapshot?.hash;

  // Check cache unless forced refresh
  if (!forceRefresh) {
    const cached = await getCache(riderData.uid, OUTPUT_TYPE, {
      currentHash: hash,
      voiceIndex,
    });
    if (cached) {
      return {
        ...cached.result,
        _meta: { ...meta, fromCache: true, generatedAt: cached.generatedAt },
      };
    }

    // Stale-while-revalidate: return stale cache if available
    const staleCache = await getStaleCache(riderData.uid, OUTPUT_TYPE, {
      currentHash: hash,
      voiceIndex,
    });
    if (staleCache?._stale) {
      const genStatus = await getGenStatus(riderData.uid);
      return {
        ...staleCache.result,
        _meta: {
          ...meta,
          fromCache: true,
          stale: true,
          regenerating: genStatus?.status === "in_progress",
          generatedAt: staleCache.generatedAt,
        },
      };
    }
  }

  // Build prompt and call Claude
  const { system, userMessage } = buildCoachingPrompt(voiceIndex, riderData);

  const result = await callClaude({
    system,
    userMessage,
    jsonMode: true,
    maxTokens: 4096,
    context: `coaching-voice-${voiceIndex}`,
  });

  // Cache the result
  await setCache(riderData.uid, OUTPUT_TYPE, result, {
    dataSnapshotHash: hash,
    tierLabel: riderData.tier?.label || "unknown",
    dataTier: riderData.dataTier,
    voiceIndex,
  });

  return {
    ...result,
    _meta: { ...meta, fromCache: false, generatedAt: new Date().toISOString() },
  };
}

/**
 * Generate the Quick Insights summary.
 *
 * @param {object} riderData - Output from prepareRiderData()
 * @param {boolean} forceRefresh - Skip cache
 * @returns {Promise<object>} Quick insights result
 */
async function generateQuickInsights(riderData, forceRefresh) {
  const hash = riderData.dataSnapshot?.hash;

  // Check cache
  if (!forceRefresh) {
    const cached = await getCache(riderData.uid, INSIGHTS_OUTPUT_TYPE, {
      currentHash: hash,
    });
    if (cached) {
      return { ...cached.result, fromCache: true };
    }

    // Stale-while-revalidate
    const staleCache = await getStaleCache(riderData.uid, INSIGHTS_OUTPUT_TYPE, {
      currentHash: hash,
    });
    if (staleCache?._stale) {
      return { ...staleCache.result, fromCache: true, stale: true };
    }
  }

  const { system, userMessage } = buildQuickInsightsPrompt(riderData);

  const result = await callClaude({
    system,
    userMessage,
    jsonMode: true,
    maxTokens: 1024,
    context: "coaching-quick-insights",
  });

  // Cache
  await setCache(riderData.uid, INSIGHTS_OUTPUT_TYPE, result, {
    dataSnapshotHash: hash,
    tierLabel: riderData.tier?.label || "unknown",
    dataTier: riderData.dataTier,
  });

  return { ...result, fromCache: false };
}

/**
 * Cloud Function handler for Multi-Voice Coaching.
 *
 * @param {object} request - Firebase v2 onCall request
 * @returns {Promise<object>} Coaching result
 */
async function handler(request) {
  try {
    const uid = validateAuth(request);
    const { voiceIndex, forceRefresh = false, quickInsightsOnly = false } = request.data || {};

    // Validate voiceIndex if provided
    if (voiceIndex !== undefined && voiceIndex !== null) {
      if (![0, 1, 2, 3].includes(voiceIndex)) {
        throw new HttpsError(
          "invalid-argument",
          "voiceIndex must be 0, 1, 2, or 3"
        );
      }
    }

    // Prepare rider data
    const riderData = await prepareRiderData(uid);

    // Check data tier — need at least Tier 1 (Starter)
    if (riderData.dataTier < 1) {
      return {
        success: false,
        error: "insufficient_data",
        message:
          "We need a bit more data to generate coaching insights. " +
          "Please complete your rider profile, add at least one horse profile, " +
          "and submit at least 3 post-ride debriefs.",
        dataTier: riderData.dataTier,
        tier: riderData.tier,
      };
    }

    const generatedAt = new Date().toISOString();

    // Generate quick insights only (for progressive voice rendering)
    if (quickInsightsOnly) {
      const quickInsights = await generateQuickInsights(riderData, forceRefresh);
      return {
        success: true,
        quickInsights,
        tier: riderData.tier,
        dataTier: riderData.dataTier,
        dataSnapshot: riderData.dataSnapshot,
        generatedAt,
      };
    }

    // Generate specific voice (no quick insights for single-voice requests)
    if (voiceIndex !== undefined && voiceIndex !== null) {
      const voiceResult = await generateVoice(voiceIndex, riderData, forceRefresh);
      return {
        success: true,
        voices: { [voiceIndex]: voiceResult },
        tier: riderData.tier,
        dataTier: riderData.dataTier,
        dataSnapshot: riderData.dataSnapshot,
        generatedAt,
      };
    }

    // Generate all 4 voices + Quick Insights in parallel (5 calls)
    // Use Promise.allSettled so partial results can be returned if some voices fail
    const results = await Promise.allSettled([
      generateVoice(0, riderData, forceRefresh),
      generateVoice(1, riderData, forceRefresh),
      generateVoice(2, riderData, forceRefresh),
      generateVoice(3, riderData, forceRefresh),
      generateQuickInsights(riderData, forceRefresh),
    ]);

    const voices = {};
    const failedVoices = [];
    for (let i = 0; i < 4; i++) {
      if (results[i].status === "fulfilled") {
        voices[i] = results[i].value;
      } else {
        failedVoices.push(i);
        voices[i] = {
          _error: true,
          _errorMessage: "This coaching voice encountered a temporary issue. Try refreshing.",
        };
        console.error(`[coaching] Voice ${i} failed:`, results[i].reason?.message || results[i].reason);
      }
    }

    const quickInsights = results[4].status === "fulfilled"
      ? results[4].value
      : null;
    if (results[4].status === "rejected") {
      console.error("[coaching] Quick insights failed:", results[4].reason?.message || results[4].reason);
    }

    // If ALL voices failed, throw so the client gets an error
    if (failedVoices.length === 4) {
      throw results[0].reason || new Error("All coaching voices failed to generate.");
    }

    return {
      success: true,
      voices,
      quickInsights,
      ...(failedVoices.length > 0 && { partialResults: true, failedVoices }),
      tier: riderData.tier,
      dataTier: riderData.dataTier,
      dataSnapshot: riderData.dataSnapshot,
      generatedAt,
    };
  } catch (error) {
    throw wrapError(error, "getMultiVoiceCoaching");
  }
}

module.exports = { handler };
