/**
 * Cache Warmth API
 *
 * Provides cache staleness checking and scheduled background warming.
 *
 * checkHandler:  Lightweight onCall function that checks cache staleness
 *                for the authenticated user. Zero Claude API calls.
 *
 * warmHandler:   Scheduled function (every 6 hours) that regenerates
 *                stale caches for active users in the background.
 */

const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { getAllCacheMetaForUser } = require("../lib/cacheManager");
const { db } = require("../lib/firebase");

// Output types to check (skip eventPlanner — event-specific, not periodic)
const OUTPUT_TYPES = ["coaching", "journeyMap", "grandPrixThinking", "dataVisualizations", "physicalGuidance"];

// Per-output max age overrides (default is 30 days)
const MAX_AGE_OVERRIDES = { physicalGuidance: 14 };

/**
 * Check cache staleness for the authenticated user.
 * Returns a staleness report — no Claude API calls.
 *
 * Input:  {} (uses request.auth.uid)
 * Output: { coaching: { stale, lastGenerated }, journeyMap: ..., currentHash }
 */
async function checkHandler(request) {
  try {
    const uid = validateAuth(request);

    // Get current data hash
    const riderData = await prepareRiderData(uid);
    const currentHash = riderData.dataSnapshot?.hash;

    // Get cache metadata for all output types
    const cacheMeta = await getAllCacheMetaForUser(uid);

    // Build staleness report
    const report = {};
    for (const outputType of OUTPUT_TYPES) {
      const meta = cacheMeta[outputType];
      if (!meta) {
        report[outputType] = { stale: true, lastGenerated: null, reason: "no_cache" };
        continue;
      }

      const hashMatch = meta.dataSnapshotHash === currentHash;
      const ageDays = meta.generatedAt
        ? (Date.now() - new Date(meta.generatedAt).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;
      const maxAge = MAX_AGE_OVERRIDES[outputType] || 30;
      const ageExceeded = ageDays > maxAge;

      report[outputType] = {
        stale: !hashMatch || ageExceeded,
        lastGenerated: meta.generatedAt || null,
        hashMatch,
        ageDays: Math.round(ageDays * 10) / 10,
      };
    }

    return {
      success: true,
      ...report,
      currentHash,
      dataTier: riderData.dataTier,
    };
  } catch (error) {
    throw wrapError(error, "checkCacheStaleness");
  }
}

/**
 * Scheduled function: warm stale caches for active users.
 * Runs every 6 hours. Regenerates outputs in priority order
 * with a per-run budget ceiling.
 *
 * Cost guards:
 * - Only processes users active in the last 7 days
 * - Max 5 full output regenerations per run
 * - Skips GP Thinking Trajectory (Opus — too expensive)
 * - Kill switch via config/cacheWarming Firestore doc
 */
async function warmHandler(event) {
  console.log("[warmCache] Starting scheduled cache warming run");

  // Check kill switch
  try {
    const configDoc = await db.collection("config").doc("cacheWarming").get();
    if (configDoc.exists && configDoc.data().enabled === false) {
      console.log("[warmCache] Kill switch is OFF — skipping this run");
      return;
    }
  } catch {
    // Config doc doesn't exist — proceed (default: enabled)
  }

  // Find active users (last activity within 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const usersSnap = await db
    .collection("users")
    .where("lastActivity", ">=", sevenDaysAgo)
    .get();

  if (usersSnap.empty) {
    console.log("[warmCache] No active users found — nothing to warm");
    return;
  }

  console.log(`[warmCache] Found ${usersSnap.size} active users`);

  // Import API handlers lazily to avoid circular dependencies
  const coaching = require("./coaching");
  const dataVisualizations = require("./dataVisualizations");
  const journeyMap = require("./journeyMap");
  const grandPrixThinking = require("./grandPrixThinking");
  const physicalGuidance = require("./physicalGuidance");

  const handlers = {
    coaching: coaching.handler,
    dataVisualizations: dataVisualizations.handler,
    journeyMap: journeyMap.handler,
    grandPrixThinking: grandPrixThinking.handler,
    physicalGuidance: physicalGuidance.handler,
  };

  // Priority order for warming (most visited first)
  const warmingPriority = ["coaching", "dataVisualizations", "journeyMap", "grandPrixThinking", "physicalGuidance"];

  let regenerationCount = 0;
  const MAX_REGENERATIONS = 5;

  for (const userDoc of usersSnap.docs) {
    if (regenerationCount >= MAX_REGENERATIONS) {
      console.log(`[warmCache] Hit budget ceiling (${MAX_REGENERATIONS} regenerations) — stopping`);
      break;
    }

    const uid = userDoc.id;
    console.log(`[warmCache] Checking user ${uid}`);

    try {
      const riderData = await prepareRiderData(uid);
      if (riderData.dataTier < 1) {
        console.log(`[warmCache] User ${uid} has insufficient data (tier ${riderData.dataTier}) — skipping`);
        continue;
      }

      const currentHash = riderData.dataSnapshot?.hash;
      const cacheMeta = await getAllCacheMetaForUser(uid);

      for (const outputType of warmingPriority) {
        if (regenerationCount >= MAX_REGENERATIONS) break;

        const meta = cacheMeta[outputType];
        const isStale = !meta || meta.dataSnapshotHash !== currentHash;

        if (!isStale) continue;

        console.log(`[warmCache] Regenerating ${outputType} for user ${uid}`);

        try {
          // Create a mock request object for the handler
          const mockRequest = {
            auth: { uid },
            data: { forceRefresh: false },
          };

          // For GP Thinking, only warm the mental layer (skip trajectory — Opus)
          if (outputType === "grandPrixThinking") {
            mockRequest.data.layer = "mental";
          }

          await handlers[outputType](mockRequest);
          regenerationCount++;
          console.log(`[warmCache] Successfully regenerated ${outputType} for ${uid} (${regenerationCount}/${MAX_REGENERATIONS})`);
        } catch (err) {
          console.error(`[warmCache] Failed to regenerate ${outputType} for ${uid}:`, err.message);
          // Continue with next output type / user
        }
      }
    } catch (err) {
      console.error(`[warmCache] Error processing user ${uid}:`, err.message);
      // Continue with next user
    }
  }

  console.log(`[warmCache] Completed — ${regenerationCount} outputs regenerated`);
}

module.exports = { checkHandler, warmHandler };
