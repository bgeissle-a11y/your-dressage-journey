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
const { tryAcquireLock, releaseLock } = require("../lib/inflightLock");
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
  try {
    const uid = validateAuth(request);
    const { forceRefresh = false, staleOk = false } = request.data || {};

    // Fast path: return cached data immediately without preparing rider data.
    // Used by frontend two-phase load to show results instantly on mount.
    if (staleOk && !forceRefresh) {
      const cached = await getStaleCache(uid, OUTPUT_TYPE, { maxAgeDays: 30 });
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

    // In-flight lock: prevent concurrent pipelines for the same user.
    const gotLock = await tryAcquireLock(uid, OUTPUT_TYPE);
    if (!gotLock) {
      console.log(`[journeyMap] Another generation in flight for ${uid} — returning stale/regenerating response`);
      const staleForContention = await getStaleCache(uid, OUTPUT_TYPE, { maxAgeDays: 90 });
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
      uid,
    });

    // Write dashboardSummary to analysis doc (fire-and-forget alongside Calls 2 & 3)
    if (synthesis?.dashboardSummary) {
      writeDashboardSummary(uid, synthesis.dashboardSummary);
    }

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
        uid,
      }),
      callClaude({
        system: sys3,
        userMessage: msg3,
        jsonMode: true,
        maxTokens: 2048,
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
    } finally {
      await releaseLock(uid, OUTPUT_TYPE);
    }
  } catch (error) {
    throw wrapError(error, "getJourneyMap");
  }
}

module.exports = { handler };
