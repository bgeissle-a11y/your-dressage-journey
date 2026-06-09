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
const { enforceCapability } = require("../lib/loadSubscription");
const { CAPABILITIES } = require("../lib/entitlements");
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { callClaude } = require("../lib/claudeCall");
const { buildJourneyMapPrompt } = require("../lib/promptBuilder");
const { buildLedgerIfEnabled, wrapWithLedger, stripRecitations, stripRecitationsDeep, detectStripDamage, getLedgerConfig, isLedgerEnabled, fetchLedgerRecords, pickFocalHorse } = require("../lib/evidenceLedger");
const { getCache, setCache, getStaleCache } = require("../lib/cacheManager");
const { getStatus: getGenStatus } = require("../lib/generationStatus");
const { tryAcquireLock, releaseLock } = require("../lib/inflightLock");
const { getMaxTokens, tierFromLabel } = require("../lib/tokenBudgets");
const { isBudgetExceeded, buildGracefulResponse } = require("../lib/budgetExhaustion");
const { writeLastRegenError, clearLastRegenError } = require("../lib/lastRegenError");
const { db } = require("../lib/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const OUTPUT_TYPE = "journeyMap";

// ── Dashboard Summary validation ──

const VALID_DIRECTIONS = [
  "Ascending",
  "Productive Stability",
  "Stretching",
  "Plateauing",
  "Struggling",
  "Recalibrating",
];

function validateDashboardSummary(summary) {
  if (!summary || typeof summary !== "object") return false;
  if (!VALID_DIRECTIONS.includes(summary.trajectoryDirection)) return false;
  if (!Array.isArray(summary.emergingThemes) || summary.emergingThemes.length === 0 || summary.emergingThemes.length > 3) return false;
  if (typeof summary.excerpt !== "string" || summary.excerpt.trim() === "") return false;
  return true;
}

/**
 * Write dashboardSummary to analysis/journeyMap/{uid} after generation.
 * Failures are logged but do not block the Journey Map response.
 */
async function writeDashboardSummary(uid, summary) {
  try {
    if (!validateDashboardSummary(summary)) {
      console.warn("[journeyMap] dashboardSummary validation failed — skipping write", summary);
      return;
    }
    await db.collection("analysis").doc("journeyMap").collection("users").doc(uid).set({
      dashboardSummary: {
        trajectoryDirection: summary.trajectoryDirection,
        emergingThemes: summary.emergingThemes,
        excerpt: summary.excerpt,
        generatedAt: FieldValue.serverTimestamp(),
      },
    }, { merge: true });
    console.log(`[journeyMap] dashboardSummary written for ${uid}`);
  } catch (err) {
    console.error("[journeyMap] Failed to write dashboardSummary:", err.message);
  }
}

/**
 * Backfill dashboardSummary from cached synthesis if the analysis doc doesn't exist yet.
 * Fire-and-forget — does not block the response.
 */
async function backfillDashboardSummary(uid, summary) {
  try {
    const docRef = db.collection("analysis").doc("journeyMap").collection("users").doc(uid);
    const snap = await docRef.get();
    if (!snap.exists || !snap.data()?.dashboardSummary) {
      writeDashboardSummary(uid, summary);
    }
  } catch (err) {
    console.error("[journeyMap] backfill check failed:", err.message);
  }
}

/**
 * Cloud Function handler for Journey Map generation.
 *
 * @param {object} request - Firebase v2 onCall request
 * @returns {Promise<object>} Journey Map result
 */
async function handler(request) {
  // Hoisted so the catch block (graceful budget-exhaustion fallback) keys the
  // per-horse cache correctly. undefined ⇒ legacy single-doc key (flag-off path).
  let cacheKeySuffix;
  try {
    const uid = validateAuth(request);
    const sub = await enforceCapability(uid, CAPABILITIES.generateJourneyMap);
    const budgetTier = sub.isPilot ? "pilot" : tierFromLabel(sub.tier);
    const { forceRefresh = false, staleOk = false } = request.data || {};

    // Per-horse Journey Map (flag-gated): when the evidence ledger is ON for this
    // rider, the JM is scoped to one rider-selected focal horse and cached per
    // horse. When OFF, requestedHorse is ignored and the doc id / behavior are
    // byte-identical to before (whole-rider JM, single cache doc).
    const requestedHorse = (request.data?.focalHorse || "").trim();
    const ledgerConfig = await getLedgerConfig();
    const ledgerOn = isLedgerEnabled(ledgerConfig, OUTPUT_TYPE, budgetTier, uid);
    cacheKeySuffix = ledgerOn ? (requestedHorse || undefined) : undefined;

    // Fast path: return cached data immediately without preparing rider data.
    // Used by frontend two-phase load to show results instantly on mount.
    if (staleOk && !forceRefresh) {
      // Per-horse cache cannot be resolved on the fast path without records, and
      // the client always supplies the focal horse once it knows it — so when the
      // ledger is on but no horse was passed, skip straight to the full path.
      if (ledgerOn && !requestedHorse) {
        return { success: false, noCache: true };
      }
      const cached = await getStaleCache(uid, OUTPUT_TYPE, { maxAgeDays: 30, cacheKeySuffix });
      if (cached) {
        return {
          success: true,
          ...cached.result,
          fromCache: true,
          stale: cached._stale !== false,
          generatedAt: cached.generatedAt,
        };
      }
      // No cache — return early so the 30s client timeout isn't wasted.
      // Frontend self-healing pattern will trigger a full-timeout follow-up call.
      return { success: false, noCache: true };
    }

    // Prepare rider data
    const riderData = await prepareRiderData(uid, "journeyMap");
    const hash = riderData.dataSnapshot?.hash;

    // When the ledger is on but the client didn't name a horse, resolve the
    // default (most-active) focal horse up front so every cache read/write below
    // keys to the same per-horse doc. Records are reused by the ledger build.
    let ledgerRecords = null;
    if (ledgerOn && !requestedHorse) {
      ledgerRecords = await fetchLedgerRecords(uid);
      cacheKeySuffix = pickFocalHorse(ledgerRecords) || undefined;
    }

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

    // Check cache. Lever 1 (cache buffer) applies — Journey Map shares the
    // Multi-Voice staleness model per the brief.
    if (!forceRefresh) {
      const cached = await getCache(uid, OUTPUT_TYPE, { currentHash: hash, applyBuffer: true, cacheKeySuffix });
      if (cached) {
        // Backfill dashboardSummary if cache has synthesis but analysis doc is missing
        if (cached.result?.synthesis?.dashboardSummary) {
          backfillDashboardSummary(uid, cached.result.synthesis.dashboardSummary);
        }
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
      const staleCache = await getStaleCache(uid, OUTPUT_TYPE, { currentHash: hash, cacheKeySuffix });
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

    // In-flight lock: prevent concurrent pipelines for the same user.
    const gotLock = await tryAcquireLock(uid, OUTPUT_TYPE);
    if (!gotLock) {
      console.log(`[journeyMap] Another generation in flight for ${uid} — returning stale/regenerating response`);
      const staleForContention = await getStaleCache(uid, OUTPUT_TYPE, { maxAgeDays: 90, cacheKeySuffix });
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

    try {
    // Evidence Ledger (Phase 2) — additive, flag-gated (config/evidenceLedger).
    // null when OFF → wrapLedger is a no-op → byte-identical to control.
    // focalHorse = rider's selection (per-horse JM); falls back to most-active
    // inside buildLedgerIfEnabled when absent. Reuse the config + records already
    // read above so this adds no extra Firestore reads.
    const ledger = await buildLedgerIfEnabled(uid, OUTPUT_TYPE, budgetTier, {
      config: ledgerConfig,
      focalHorse: requestedHorse || undefined,
      records: ledgerRecords || undefined,
    });
    // Authoritative focal horse from the build governs the per-horse cache key
    // (covers the no-horse default path resolved server-side).
    if (ledger?.meta?.focalHorse) cacheKeySuffix = ledger.meta.focalHorse;
    const wrapLedger = (p) => (ledger ? wrapWithLedger(p, ledger) : p);

    // --- Call 1: Data Synthesis ---
    const { system: sys1, userMessage: msg1 } = wrapLedger(buildJourneyMapPrompt(
      1,
      riderData
    ));
    let synthesis = await callClaude({
      system: sys1,
      userMessage: msg1,
      jsonMode: true,
      maxTokens: getMaxTokens("journey-map-synthesis", budgetTier),
      context: "journey-map-synthesis",
      uid,
    });
    // Recitation guard (Rule f backstop) — strip ledger vocabulary from the
    // rider-facing synthesis before it feeds Calls 2/3 and the dashboard.
    if (ledger) synthesis = stripRecitationsDeep(synthesis);

    // Write dashboardSummary to analysis doc (fire-and-forget alongside Calls 2 & 3)
    if (synthesis?.dashboardSummary) {
      writeDashboardSummary(uid, synthesis.dashboardSummary);
    }

    // --- Calls 2 & 3 in parallel (both depend on Call 1, not each other) ---
    const { system: sys2, userMessage: msg2 } = wrapLedger(buildJourneyMapPrompt(
      2,
      riderData,
      { synthesis }
    ));
    const { system: sys3, userMessage: msg3 } = wrapLedger(buildJourneyMapPrompt(
      3,
      riderData,
      { synthesis }
    ));

    const [narrativeResult, visualizationResult] = await Promise.allSettled([
      callClaude({
        system: sys2,
        userMessage: msg2,
        jsonMode: false,
        maxTokens: getMaxTokens("journey-map-narrative", budgetTier),
        context: "journey-map-narrative",
        uid,
      }),
      callClaude({
        system: sys3,
        userMessage: msg3,
        jsonMode: true,
        maxTokens: getMaxTokens("journey-map-visualization", budgetTier),
        context: "journey-map-visualization",
        uid,
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

    // Assemble complete result. Recitation guard on the rider-facing narrative
    // (visualization is structural — left untouched). synthesis was stripped above.
    const partialResults = !narrative || !visualization;
    const cleanedNarrative = ledger && typeof narrative === "string" ? stripRecitations(narrative) : narrative;
    if (ledger && typeof cleanedNarrative === "string") {
      const dmg = detectStripDamage(cleanedNarrative);
      if (dmg.length) console.warn(`[journeyMap] recitation-guard integrity check flagged ${uid}: ${dmg.join(", ")}`);
    }
    // focalHorse stamps the result so the client can sync its horse selector to
    // the horse actually used (null ⇒ whole-rider JM, ledger off).
    const result = {
      synthesis,
      narrative: cleanedNarrative,
      visualization,
      focalHorse: ledger ? ledger.meta.focalHorse : null,
    };

    // Only cache complete results (don't cache partial)
    if (!partialResults) {
      await setCache(uid, OUTPUT_TYPE, result, {
        dataSnapshotHash: hash,
        tierLabel: riderData.tier?.label || "unknown",
        dataTier: riderData.dataTier,
        cacheKeySuffix,
      });
    }

    if (!partialResults) {
      await clearLastRegenError(uid, OUTPUT_TYPE);
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
    } finally {
      await releaseLock(uid, OUTPUT_TYPE);
    }
  } catch (error) {
    // `uid` is declared inside the try, so re-derive it here for the catch
    // (graceful fallback + error banner). Without this the budget-exhaustion
    // path throws ReferenceError instead of serving stale cache.
    const uid = request?.auth?.uid;
    // Phase 4: budget exhaustion serves stale cache instead of throwing.
    if (isBudgetExceeded(error)) {
      try {
        const staleCache = await getStaleCache(uid, OUTPUT_TYPE, { maxAgeDays: 90, cacheKeySuffix });
        return await buildGracefulResponse({
          uid,
          err: error,
          staleResult: staleCache?.result || {},
          extras: { fromCache: true, stale: true },
        });
      } catch (innerErr) {
        console.error("[journeyMap] graceful-exhaustion fallback failed:", innerErr.message);
      }
    }
    // Record failure for the rider-visible banner — skip budget cases that
    // already surfaced a graceful response.
    if (!isBudgetExceeded(error)) {
      if (uid) await writeLastRegenError(uid, OUTPUT_TYPE, error);
    }
    throw wrapError(error, "getJourneyMap");
  }
}

module.exports = { handler };
