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
const {
  buildCoachingPrompt,
  buildQuickInsightsPrompt,
  buildMultiVoicePrecisPrompt,
  VOICE_META,
} = require("../lib/promptBuilder");
const { getCache, setCache, getStaleCache } = require("../lib/cacheManager");
const { getStatus: getGenStatus } = require("../lib/generationStatus");
const { tryAcquireLock, releaseLock } = require("../lib/inflightLock");
const { refreshWeeklyFocusSnapshotSection } = require("../lib/weeklyFocusSnapshot");

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
async function generateVoice(voiceIndex, riderData, forceRefresh, uid) {
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
    uid,
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
async function generateQuickInsights(riderData, forceRefresh, uid) {
  const hash = riderData.dataSnapshot?.hash;

  // Check cache
  if (!forceRefresh) {
    const cached = await getCache(riderData.uid, INSIGHTS_OUTPUT_TYPE, {
      currentHash: hash,
      maxAgeDays: 7, // Regenerate weekly so celebration/patterns stay fresh
    });
    if (cached) {
      return { ...cached.result, fromCache: true };
    }

    // No stale-while-revalidate for quick insights — this is a fast call
    // and the celebration/patterns must update when rider data changes.
    // Stale cache was previously causing celebration to never refresh.
  }

  const { system, userMessage } = buildQuickInsightsPrompt(riderData);

  const result = await callClaude({
    system,
    userMessage,
    jsonMode: true,
    maxTokens: 4096,
    context: "coaching-quick-insights",
    uid,
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
 * Generate the Multi-Voice Coaching précis: a ≤200-word voice-agnostic
 * summary of the four voice analyses, cached as a side-extract for
 * downstream consumers (micro-debrief and Fresh Start Empathetic Coach
 * responses) that need rider context but can't ingest the full output.
 *
 * Per YDJ_MultiVoicePrecis_Spec.md — failure here must NOT fail the parent
 * Multi-Voice generation. Returns null on error; caller continues without
 * persisting a précis row, and consumers fall back to "no cached coaching
 * context" behavior.
 *
 * @param {object} voiceResults - Map of voiceIndex → fulfilled voice result
 *   (with _meta stripped before passing in).
 * @param {object} riderData - Output from prepareRiderData()
 * @param {string} uid - User ID
 * @returns {Promise<{ precis: string } | null>}
 */
async function generatePrecis(voiceResults, riderData, uid) {
  try {
    const { system, userMessage } = buildMultiVoicePrecisPrompt(voiceResults);
    const text = await callClaude({
      system,
      userMessage,
      jsonMode: false,
      maxTokens: 400,
      context: "coaching-precis",
      uid,
    });
    const precis = typeof text === "string" ? text.trim() : String(text ?? "").trim();
    if (!precis) {
      console.warn(`[coaching] Précis returned empty for ${uid} — skipping cache write`);
      return null;
    }
    return { precis };
  } catch (err) {
    console.error(`[coaching] Précis generation failed for ${uid}:`, err.message || err);
    return null;
  }
}

/**
 * Persist the précis side-extract to its dedicated cache row. The précis
 * is cached as outputType "coaching_precis" (parallel to practiceCard /
 * visualizationSuggestion) rather than embedded in the per-voice docs.
 *
 * Failure here is logged but never propagated — the Multi-Voice handler's
 * core output (the four voices + quickInsights) is the more important
 * artifact; the précis is supporting infrastructure.
 */
async function persistPrecis(precisResult, riderData) {
  if (!precisResult) return;
  const meta = {
    dataSnapshotHash: riderData.dataSnapshot?.hash,
    tierLabel: riderData.tier?.label || "unknown",
    dataTier: riderData.dataTier,
  };
  try {
    await setCache(riderData.uid, "coaching_precis", precisResult, meta);
  } catch (err) {
    console.error("[coaching] Failed to save précis:", err.message || err);
  }
}

/**
 * Persist the practiceCard and visualizationSuggestion side-extracts to their
 * dedicated cache docs. Quick Insights always carries these as nested fields,
 * but the home-page Practice Card and weekly viz card read from the dedicated
 * caches — so this must run on every code path that produces quickInsights,
 * including the quickInsightsOnly fast path.
 *
 * Logs explicitly when quickInsights is missing or lacks practiceCard, so a
 * silent failure (which previously left the practice card stale for 9+ days)
 * is now visible in Cloud Function logs.
 */
async function persistInsightsSideExtracts(quickInsights, riderData, generatedAt) {
  if (!quickInsights) {
    console.warn("[coaching] persistInsightsSideExtracts: quickInsights null — skipping side-extract saves");
    return;
  }

  const meta = {
    dataSnapshotHash: riderData.dataSnapshot?.hash,
    tierLabel: riderData.tier?.label || "unknown",
    dataTier: riderData.dataTier,
  };

  // Visualization suggestion — always saved (defaults to shouldSuggest:false)
  try {
    const vizSuggestion = quickInsights.visualizationSuggestion ?? { shouldSuggest: false };
    await setCache(riderData.uid, "coaching_visualizationSuggestion", vizSuggestion, meta);
  } catch (vizErr) {
    console.error("[coaching] Failed to save visualizationSuggestion:", vizErr.message);
  }

  // Practice card — only saved when present
  if (quickInsights.practiceCard) {
    try {
      const practiceCardData = {
        ...quickInsights.practiceCard,
        generatedAt,
        weekOf: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        horseName: riderData.horseProfiles?.[0]?.horseName || "your horse",
        confirmedAt: null,
        confirmedDate: null,
      };
      await setCache(riderData.uid, "coaching_practiceCard", practiceCardData, meta);
    } catch (pcErr) {
      console.error("[coaching] Failed to save practiceCard:", pcErr.message);
    }
  } else {
    console.warn("[coaching] persistInsightsSideExtracts: quickInsights has no practiceCard field — practice card cache will go stale");
  }
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
    const riderData = await prepareRiderData(uid, "coaching");

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
      const quickInsights = await generateQuickInsights(riderData, forceRefresh, uid);
      await persistInsightsSideExtracts(quickInsights, riderData, generatedAt);
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
      const voiceResult = await generateVoice(voiceIndex, riderData, forceRefresh, uid);
      // Re-extract the home page snapshot — even a single-voice refresh can
      // change what the rotation picks if that voice is in the featured pair.
      await refreshWeeklyFocusSnapshotSection(uid, "coaching");
      return {
        success: true,
        voices: { [voiceIndex]: voiceResult },
        tier: riderData.tier,
        dataTier: riderData.dataTier,
        dataSnapshot: riderData.dataSnapshot,
        generatedAt,
      };
    }

    // In-flight lock: prevent a concurrent page load/refresh from firing a
    // second 5-call fan-out while one is already running.
    const gotLock = await tryAcquireLock(uid, OUTPUT_TYPE);
    if (!gotLock) {
      console.log(`[coaching] Another generation in flight for ${uid} — returning stale/regenerating response`);
      const staleVoices = await Promise.all([0, 1, 2, 3].map(async (i) => {
        const s = await getStaleCache(riderData.uid, OUTPUT_TYPE, {
          voiceIndex: i,
          maxAgeDays: 90,
        });
        return s?.result ? { ...s.result, _meta: { ...VOICE_META[i], fromCache: true, stale: true } } : null;
      }));
      const staleInsights = await getStaleCache(riderData.uid, INSIGHTS_OUTPUT_TYPE, { maxAgeDays: 90 });
      const voices = {};
      staleVoices.forEach((v, i) => { if (v) voices[i] = v; });
      if (Object.keys(voices).length > 0 || staleInsights?.result) {
        return {
          success: true,
          voices,
          quickInsights: staleInsights?.result || null,
          regenerating: true,
          stale: true,
          tier: riderData.tier,
          dataTier: riderData.dataTier,
          dataSnapshot: riderData.dataSnapshot,
          generatedAt,
        };
      }
      return {
        success: false,
        regenerating: true,
        noCache: true,
        tier: riderData.tier,
        dataTier: riderData.dataTier,
      };
    }

    let results;
    try {
    // Generate all 4 voices + Quick Insights in parallel (5 calls)
    // Use Promise.allSettled so partial results can be returned if some voices fail
    results = await Promise.allSettled([
      generateVoice(0, riderData, forceRefresh, uid),
      generateVoice(1, riderData, forceRefresh, uid),
      generateVoice(2, riderData, forceRefresh, uid),
      generateVoice(3, riderData, forceRefresh, uid),
      generateQuickInsights(riderData, forceRefresh, uid),
    ]);
    } finally {
      await releaseLock(uid, OUTPUT_TYPE);
    }

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

    let quickInsights = results[4].status === "fulfilled"
      ? results[4].value
      : null;
    if (results[4].status === "rejected") {
      console.error("[coaching] Quick insights failed:", results[4].reason?.message || results[4].reason);
    }

    await persistInsightsSideExtracts(quickInsights, riderData, generatedAt);

    // If ALL voices failed, throw so the client gets an error
    if (failedVoices.length === 4) {
      throw results[0].reason || new Error("All coaching voices failed to generate.");
    }

    // Multi-Voice Coaching précis — voice-agnostic ≤200-word summary used
    // by downstream consumers (micro-debrief / Fresh Start). Generated
    // synchronously after voices so the cache row exists before this
    // handler returns; downstream Cloud Functions read it as "no context"
    // when absent. Skip if fewer than 3 voices succeeded — too thin to
    // produce a faithful gestalt.
    if (failedVoices.length <= 1) {
      const voiceJsonsForPrecis = {};
      for (let i = 0; i < 4; i++) {
        if (results[i].status === "fulfilled") {
          // Strip _meta — the précis prompt expects raw analysis content
          const { _meta, ...rest } = results[i].value || {};
          voiceJsonsForPrecis[i] = rest;
        }
      }
      const precisResult = await generatePrecis(voiceJsonsForPrecis, riderData, uid);
      await persistPrecis(precisResult, riderData);
    } else {
      console.warn(`[coaching] Skipping précis — only ${4 - failedVoices.length}/4 voices succeeded`);
    }

    // Propagate fresh voice content into the home page's frozen weekly
    // snapshot so the coaching card updates without waiting for Monday's
    // cron. Only worth doing when at least one voice succeeded; if all
    // four failed we'd have thrown above.
    await refreshWeeklyFocusSnapshotSection(uid, "coaching");

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
