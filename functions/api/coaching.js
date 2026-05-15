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
const { enforceCapability } = require("../lib/loadSubscription");
const { CAPABILITIES } = require("../lib/entitlements");
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
const { getMaxTokens, tierFromLabel } = require("../lib/tokenBudgets");
const { isBudgetExceeded, buildGracefulResponse } = require("../lib/budgetExhaustion");

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
async function generateVoice(voiceIndex, riderData, forceRefresh, uid, budgetTier) {
  const meta = VOICE_META[voiceIndex];
  const hash = riderData.dataSnapshot?.hash;

  // Check cache unless forced refresh. Lever 1 (cache buffer) applies here:
  // hash mismatch is tolerated until ≥5 debriefs or 3 debriefs + 1 reflection
  // have accumulated since the cached generation.
  if (!forceRefresh) {
    const cached = await getCache(riderData.uid, OUTPUT_TYPE, {
      currentHash: hash,
      voiceIndex,
      applyBuffer: true,
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
    maxTokens: getMaxTokens("coaching-voice", budgetTier),
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
async function generateQuickInsights(riderData, forceRefresh, uid, budgetTier) {
  const hash = riderData.dataSnapshot?.hash;

  // Check cache. Quick Insights is regenerated weekly (maxAgeDays=7), so the
  // buffer mechanic still applies inside that window — it stops a single new
  // debrief from invalidating yesterday's celebration block.
  if (!forceRefresh) {
    const cached = await getCache(riderData.uid, INSIGHTS_OUTPUT_TYPE, {
      currentHash: hash,
      maxAgeDays: 7,
      applyBuffer: true,
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
    maxTokens: getMaxTokens("coaching-quick-insights", budgetTier),
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
 * Single-voice trailing précis generator. The frontend's progressive-render
 * path fires 4 single-voice calls (one per voice index) instead of the
 * single bulk fan-out — so the bulk path's précis-generation block never
 * runs. This helper closes that gap: after each single-voice cache write,
 * check whether all 4 voice rows now exist and share the same dataSnapshotHash.
 * If they do, build the same précis the bulk path would have built and persist it.
 *
 * Lock-guarded so the 4 racing single-voice completions don't each fire
 * their own précis generation. The first one to grab the lock generates;
 * the others see the lock held and skip.
 *
 * Fire-and-forget contract — caller doesn't await; failure is logged only.
 *
 * @param {string} uid
 * @param {object} riderData - same shape passed to generateVoice
 */
async function maybeGeneratePrecisFromCache(uid, riderData) {
  const hash = riderData.dataSnapshot?.hash;
  if (!hash) return; // Without a hash we can't tell if the 4 voices align.

  // Read all 4 voice cache rows. Use getStaleCache so a hash-mismatch row
  // still comes back — we'll filter on hash equality ourselves.
  const cached = await Promise.all([0, 1, 2, 3].map((i) =>
    getStaleCache(uid, OUTPUT_TYPE, { voiceIndex: i, maxAgeDays: 30 })
  ));

  // Require: all 4 exist AND all 4 have the same dataSnapshotHash AS THE
  // CURRENT generation. If any voice hasn't refreshed yet (still on an old
  // hash), we'd build a précis that's a frankensteined mix — better to skip.
  for (let i = 0; i < 4; i++) {
    if (!cached[i] || !cached[i].result) {
      console.log(`[coaching] précis-trailing: voice ${i} cache missing — skip`);
      return;
    }
    if (cached[i].dataSnapshotHash !== hash) {
      console.log(`[coaching] précis-trailing: voice ${i} cache on stale hash — skip`);
      return;
    }
  }

  // Inflight lock — only one of the 4 racing completions actually generates.
  const gotLock = await tryAcquireLock(uid, "coaching_precis");
  if (!gotLock) {
    console.log("[coaching] précis-trailing: another fan-out holds the précis lock — skip");
    return;
  }

  try {
    // Skip if a précis matching this hash is already cached. Cheap idempotency
    // guard so a quick double-click doesn't burn two précis generations.
    const existing = await getCache(uid, "coaching_precis", { currentHash: hash, maxAgeDays: 30 });
    if (existing?.result?.precis) {
      console.log("[coaching] précis-trailing: précis for this hash already cached — skip");
      return;
    }

    const voiceJsonsForPrecis = {};
    for (let i = 0; i < 4; i++) {
      // Strip _meta so the prompt sees raw analysis content, matching the
      // bulk path's behavior.
      const { _meta, ...rest } = cached[i].result;
      voiceJsonsForPrecis[i] = rest;
    }

    const precisResult = await generatePrecis(voiceJsonsForPrecis, riderData, uid);
    await persistPrecis(precisResult, riderData);
    if (precisResult) {
      console.log("[coaching] précis-trailing: wrote précis after single-voice fan-out completion");
    }
  } catch (err) {
    console.error("[coaching] précis-trailing failed:", err.message || err);
  } finally {
    await releaseLock(uid, "coaching_precis");
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
    const sub = await enforceCapability(uid, CAPABILITIES.generateCoaching);
    // Budget tier: pilot maps to 'extended' inside tokenBudgets; non-pilot
    // paid users use their actual tier; everyone else falls back conservatively.
    const budgetTier = sub.isPilot ? "pilot" : tierFromLabel(sub.tier);
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

    // Helper: collect all 4 stale voice cards + stale insights for the
    // graceful-exhaustion / partial-failure paths.
    async function loadStaleCoaching() {
      const staleVoices = await Promise.all([0, 1, 2, 3].map(async (i) => {
        const s = await getStaleCache(riderData.uid, OUTPUT_TYPE, {
          voiceIndex: i,
          maxAgeDays: 90,
        });
        return s?.result
          ? { ...s.result, _meta: { ...VOICE_META[i], fromCache: true, stale: true } }
          : null;
      }));
      const staleInsights = await getStaleCache(riderData.uid, INSIGHTS_OUTPUT_TYPE, { maxAgeDays: 90 });
      const voices = {};
      staleVoices.forEach((v, i) => { if (v) voices[i] = v; });
      return { voices, quickInsights: staleInsights?.result || null };
    }

    // Generate quick insights only (for progressive voice rendering)
    if (quickInsightsOnly) {
      try {
        const quickInsights = await generateQuickInsights(riderData, forceRefresh, uid, budgetTier);
        await persistInsightsSideExtracts(quickInsights, riderData, generatedAt);
        return {
          success: true,
          quickInsights,
          tier: riderData.tier,
          dataTier: riderData.dataTier,
          dataSnapshot: riderData.dataSnapshot,
          generatedAt,
        };
      } catch (err) {
        if (isBudgetExceeded(err)) {
          const stale = await loadStaleCoaching();
          return await buildGracefulResponse({
            uid,
            err,
            staleResult: { quickInsights: stale.quickInsights },
            extras: {
              tier: riderData.tier,
              dataTier: riderData.dataTier,
              dataSnapshot: riderData.dataSnapshot,
              generatedAt,
            },
          });
        }
        throw err;
      }
    }

    // Generate specific voice (no quick insights for single-voice requests)
    if (voiceIndex !== undefined && voiceIndex !== null) {
      try {
        const voiceResult = await generateVoice(voiceIndex, riderData, forceRefresh, uid, budgetTier);
        // Re-extract the home page snapshot — even a single-voice refresh can
        // change what the rotation picks if that voice is in the featured pair.
        try {
          await refreshWeeklyFocusSnapshotSection(uid, "coaching");
        } catch (snapshotErr) {
          console.error(`[coaching] Weekly focus snapshot refresh failed for ${uid}:`, snapshotErr.message);
          // Non-fatal — main output already succeeded.
        }
        // Trailing précis generation. The frontend's progressive-render flow
        // fires 4 single-voice calls in parallel; whichever one is last to
        // complete will see all 4 voice cache rows on the current hash and
        // generate the précis. Earlier completions skip due to incomplete
        // cache or the lock. Fire-and-forget — never block the voice response.
        maybeGeneratePrecisFromCache(uid, riderData).catch((err) =>
          console.error("[coaching] précis-trailing fire-and-forget failed:", err.message || err)
        );
        return {
          success: true,
          voices: { [voiceIndex]: voiceResult },
          tier: riderData.tier,
          dataTier: riderData.dataTier,
          dataSnapshot: riderData.dataSnapshot,
          generatedAt,
        };
      } catch (err) {
        if (isBudgetExceeded(err)) {
          const stale = await loadStaleCoaching();
          return await buildGracefulResponse({
            uid,
            err,
            staleResult: { voices: stale.voices },
            extras: {
              tier: riderData.tier,
              dataTier: riderData.dataTier,
              dataSnapshot: riderData.dataSnapshot,
              generatedAt,
            },
          });
        }
        throw err;
      }
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
      generateVoice(0, riderData, forceRefresh, uid, budgetTier),
      generateVoice(1, riderData, forceRefresh, uid, budgetTier),
      generateVoice(2, riderData, forceRefresh, uid, budgetTier),
      generateVoice(3, riderData, forceRefresh, uid, budgetTier),
      generateQuickInsights(riderData, forceRefresh, uid, budgetTier),
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

    // If ALL voices failed AND the failure looks like a budget cap, serve
    // the rider's stale cache with cacheServed:true (Phase 4, graceful
    // exhaustion). Non-budget all-fails still throw so the client retries.
    if (failedVoices.length === 4) {
      const firstReason = results[0]?.reason;
      if (isBudgetExceeded(firstReason)) {
        const stale = await loadStaleCoaching();
        return await buildGracefulResponse({
          uid,
          err: firstReason,
          staleResult: { voices: stale.voices, quickInsights: stale.quickInsights },
          extras: {
            tier: riderData.tier,
            dataTier: riderData.dataTier,
            dataSnapshot: riderData.dataSnapshot,
            generatedAt,
          },
        });
      }
      throw firstReason || new Error("All coaching voices failed to generate.");
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
    try {
      await refreshWeeklyFocusSnapshotSection(uid, "coaching");
    } catch (snapshotErr) {
      console.error(`[coaching] Weekly focus snapshot refresh failed for ${uid}:`, snapshotErr.message);
      // Non-fatal — main output already succeeded.
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
