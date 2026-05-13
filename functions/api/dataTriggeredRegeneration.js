/**
 * Data-Triggered Background Regeneration
 *
 * Firestore triggers that fire when riders submit new data.
 * Two categories:
 *
 * Threshold triggers (debriefs, reflections):
 *   Only regenerate after 5 new entries since the last regeneration.
 *   This avoids costly regeneration on every single ride.
 *
 * Immediate triggers (journeyEvents, physicalAssessments, riderAssessments):
 *   Regenerate immediately on creation. These are infrequent, high-impact data.
 *
 * All triggers use the same regeneration orchestrator, which:
 * - Checks generationStatus for debounce (skip if already in progress)
 * - Runs handlers sequentially in priority order
 * - Updates generationStatus for real-time frontend progress
 * - Respects the global kill switch (config/cacheWarming.enabled)
 */

const { db } = require("../lib/firebase");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { silentCanAccess, loadSubscription } = require("../lib/loadSubscription");
const { CAPABILITIES } = require("../lib/entitlements");
const { tierFromLabel } = require("../lib/tokenBudgets");
const {
  getStatus,
  startGeneration,
  updateProgress,
  completeGeneration,
  requestRerun,
  recordError,
  getCountsAtLastRegen,
} = require("../lib/generationStatus");

// Regeneration threshold for high-frequency collections.
// Light loggers who don't accumulate this many entries still get a refresh
// via MONTHLY_REFRESH_MS below.
const REGEN_THRESHOLD = 10;

// Minimum time between regeneration runs for the same user (Multi-Voice + the
// outputs co-orchestrated with it). Token Budget Spec v2 §Part 6 #5: 4 hours
// baseline across all tiers. Separate knob from `REGEN_COOLDOWN_HOURS` in
// `cycleState.js`, which gates GPT/Physical mid-cycle regen at 2h — two
// distinct concepts, two distinct env vars.
const MULTIVOICE_COOLDOWN_HOURS = parseFloat(process.env.MULTIVOICE_COOLDOWN_HOURS || "4");
const REGEN_COOLDOWN_MS = Math.max(0, MULTIVOICE_COOLDOWN_HOURS) * 60 * 60 * 1000;

// Monthly floor: riders who log less than REGEN_THRESHOLD entries per month
// still get a coaching refresh once 28 days have passed since the last run,
// provided at least one new entry arrived. Ensures 1x-per-week riders never
// go longer than a month without fresh coaching.
const MONTHLY_REFRESH_MS = 28 * 24 * 60 * 60 * 1000;

// Output priority order (same as warmHandler)
// Skip GP Thinking Trajectory (Opus — too expensive for automated runs)
const ALL_OUTPUTS = ["coaching", "dataVisualizations", "journeyMap", "grandPrixThinking"];

/**
 * Count non-deleted documents in a collection for a user.
 * Uses Firestore count() aggregation — efficient, no document downloads.
 *
 * @param {string} collectionName
 * @param {string} uid
 * @returns {Promise<number>}
 */
async function countUserDocs(collectionName, uid) {
  const snapshot = await db
    .collection(collectionName)
    .where("userId", "==", uid)
    .where("isDeleted", "==", false)
    .count()
    .get();
  return snapshot.data().count;
}

/**
 * Check the global kill switch.
 * @returns {Promise<boolean>} true if regeneration is disabled
 */
async function isKillSwitchActive() {
  try {
    const configDoc = await db.collection("config").doc("cacheWarming").get();
    return configDoc.exists && configDoc.data().enabled === false;
  } catch {
    return false; // Default: enabled
  }
}

/**
 * Run the regeneration pipeline for a user.
 * Sequentially generates outputs in priority order, updating status after each.
 *
 * @param {string} uid - User ID
 * @param {string[]} outputTypes - Which outputs to regenerate
 * @param {string} triggeredBy - Trigger source for status tracking
 */
async function runRegeneration(uid, outputTypes, triggeredBy) {
  // Check kill switch
  if (await isKillSwitchActive()) {
    console.log(`[dataRegen] Kill switch active — skipping regeneration for ${uid}`);
    return;
  }

  // Capability gate (silent). Pilot-grace and pilot-expired users keep
  // writing data but should not trigger background AI runs against their
  // own dollar budget. canAccess returns true for active pilots / paid
  // tiers that own `generateCoaching`; otherwise we no-op.
  if (!(await silentCanAccess(uid, CAPABILITIES.generateCoaching))) {
    console.log(`[dataRegen] ${uid} lacks generateCoaching capability — skipping ${triggeredBy} regen`);
    return;
  }

  // Check if generation is already in progress (debounce)
  const currentStatus = await getStatus(uid);
  if (currentStatus?.status === "in_progress") {
    console.log(`[dataRegen] Generation already in progress for ${uid} — requesting rerun`);
    await requestRerun(uid);
    return;
  }

  // Cooldown: skip if last regeneration completed less than 2 hours ago
  if (currentStatus?.completedAt) {
    const lastCompleted = new Date(currentStatus.completedAt).getTime();
    const elapsed = Date.now() - lastCompleted;
    if (elapsed < REGEN_COOLDOWN_MS) {
      const minutesLeft = Math.ceil((REGEN_COOLDOWN_MS - elapsed) / 60000);
      console.log(`[dataRegen] Cooldown active for ${uid} — ${minutesLeft}m remaining, skipping`);
      return;
    }
  }

  // Start generation
  await startGeneration(uid, outputTypes, triggeredBy);

  // Lazy-import API handlers to avoid circular dependencies
  const coaching = require("./coaching");
  const dataVisualizations = require("./dataVisualizations");
  const journeyMap = require("./journeyMap");
  const grandPrixThinking = require("./grandPrixThinking");

  const handlers = {
    coaching: coaching.handler,
    dataVisualizations: dataVisualizations.handler,
    journeyMap: journeyMap.handler,
    grandPrixThinking: grandPrixThinking.handler,
  };

  let completedCount = 0;

  for (const outputType of outputTypes) {
    try {
      // Create a mock request object (same pattern as warmHandler)
      const mockRequest = {
        auth: { uid },
        data: { forceRefresh: false },
      };

      // For GP Thinking, only warm the mental layer (skip trajectory — Opus)
      if (outputType === "grandPrixThinking") {
        mockRequest.data.layer = "mental";
      }

      await handlers[outputType](mockRequest);
      completedCount++;

      await updateProgress(uid, outputType);
      console.log(`[dataRegen] ${uid}: completed ${outputType} (${completedCount}/${outputTypes.length})`);
    } catch (err) {
      console.error(`[dataRegen] ${uid}: failed ${outputType}:`, err.message);
      await recordError(uid, `${outputType}: ${err.message}`);
      // Continue with next output (don't abort the whole pipeline)
    }
  }

  // Get current counts for threshold tracking
  const [debriefCount, reflectionCount] = await Promise.all([
    countUserDocs("debriefs", uid),
    countUserDocs("reflections", uid),
  ]);

  // Complete generation and check for pending rerun
  const needsRerun = await completeGeneration(uid, {
    debriefCount,
    reflectionCount,
  });

  console.log(`[dataRegen] ${uid}: regeneration complete (${completedCount}/${outputTypes.length} succeeded)`);

  // If new data arrived during generation, re-run
  if (needsRerun) {
    console.log(`[dataRegen] ${uid}: rerun requested — starting new cycle`);
    await runRegeneration(uid, outputTypes, "data_change");
  }
}

/**
 * Returns true iff a regeneration on `generationStatus/{uid}` completed
 * within the current calendar UTC month. Used to enforce the Working-tier
 * max-1-monthly rule (Token Budget Spec v2 §Part 6 #3).
 */
function _regenCompletedThisMonth(status, now = new Date()) {
  if (!status?.completedAt) return false;
  const completed = new Date(status.completedAt);
  if (Number.isNaN(completed.getTime())) return false;
  return (
    completed.getUTCFullYear() === now.getUTCFullYear() &&
    completed.getUTCMonth() === now.getUTCMonth()
  );
}

/**
 * Handler for debrief creation.
 * Threshold trigger: only regenerate after 5 new debriefs since last regen.
 *
 * @param {object} event - Firestore onDocumentCreated event
 */
async function handleDebriefCreated(event) {
  const data = event.data?.data();
  const uid = data?.userId;

  if (!uid) {
    console.warn("[dataRegen] Debrief created without userId — skipping");
    return;
  }

  // Skip drafts
  if (data.isDraft) {
    console.log(`[dataRegen] Skipping draft debrief for ${uid}`);
    return;
  }

  console.log(`[dataRegen] Debrief created for ${uid} — checking threshold`);

  try {
    const currentCount = await countUserDocs("debriefs", uid);
    const { debriefCountAtLastRegen } = await getCountsAtLastRegen(uid);
    const delta = currentCount - debriefCountAtLastRegen;

    const status = await getStatus(uid);
    const lastCompletedMs = status?.completedAt ? new Date(status.completedAt).getTime() : null;
    const elapsedSinceLastRegenMs = lastCompletedMs ? Date.now() - lastCompletedMs : Infinity;

    console.log(`[dataRegen] ${uid}: ${currentCount} debriefs total, ${debriefCountAtLastRegen} at last regen, delta=${delta}, ${Math.round(elapsedSinceLastRegenMs / 86400000)}d since last regen`);

    const thresholdReached = delta >= REGEN_THRESHOLD;
    const monthlyFloorReached = delta >= 1 && elapsedSinceLastRegenMs >= MONTHLY_REFRESH_MS;

    if (!thresholdReached && !monthlyFloorReached) {
      console.log(`[dataRegen] ${uid}: ${delta} new debriefs (threshold ${REGEN_THRESHOLD}) and monthly floor not reached — skipping`);
      return;
    }

    // Working-tier max-1-monthly gate (Spec §Part 6 #3). If the user is on
    // Working AND a regeneration already completed this calendar month, skip.
    // Medium/Extended bypass this gate. Pilots and unpaid users also bypass
    // (no enforcement at the data-trigger layer for them).
    const sub = await loadSubscription(uid);
    const budgetTier = sub.isPilot ? "extended" : tierFromLabel(sub.tier);
    if (budgetTier === "working" && _regenCompletedThisMonth(status)) {
      console.log(`[dataRegen] ${uid}: Working tier already had a regen this calendar month — skipping (max-1-monthly)`);
      return;
    }

    const trigger = thresholdReached
      ? `threshold reached (${delta} new debriefs)`
      : `monthly floor reached (${Math.round(elapsedSinceLastRegenMs / 86400000)}d since last, ${delta} new debrief${delta === 1 ? "" : "s"})`;
    console.log(`[dataRegen] ${uid}: ${trigger} — starting regeneration`);
    await runRegeneration(uid, ALL_OUTPUTS, "data_change");
  } catch (err) {
    console.error(`[dataRegen] Error handling debrief trigger for ${uid}:`, err.message);
  }
}

/**
 * Handler for reflection creation.
 * Threshold trigger: only regenerate after 5 new reflections since last regen.
 *
 * @param {object} event - Firestore onDocumentCreated event
 */
async function handleReflectionCreated(event) {
  const data = event.data?.data();
  const uid = data?.userId;

  if (!uid) {
    console.warn("[dataRegen] Reflection created without userId — skipping");
    return;
  }

  console.log(`[dataRegen] Reflection created for ${uid} — checking threshold`);

  try {
    const currentCount = await countUserDocs("reflections", uid);
    const { reflectionCountAtLastRegen } = await getCountsAtLastRegen(uid);
    const delta = currentCount - reflectionCountAtLastRegen;

    const status = await getStatus(uid);
    const lastCompletedMs = status?.completedAt ? new Date(status.completedAt).getTime() : null;
    const elapsedSinceLastRegenMs = lastCompletedMs ? Date.now() - lastCompletedMs : Infinity;

    console.log(`[dataRegen] ${uid}: ${currentCount} reflections total, ${reflectionCountAtLastRegen} at last regen, delta=${delta}, ${Math.round(elapsedSinceLastRegenMs / 86400000)}d since last regen`);

    const thresholdReached = delta >= REGEN_THRESHOLD;
    const monthlyFloorReached = delta >= 1 && elapsedSinceLastRegenMs >= MONTHLY_REFRESH_MS;

    if (!thresholdReached && !monthlyFloorReached) {
      console.log(`[dataRegen] ${uid}: ${delta} new reflections (threshold ${REGEN_THRESHOLD}) and monthly floor not reached — skipping`);
      return;
    }

    // Reflections affect coaching, journey map, and data viz (not GP thinking)
    const outputs = ["coaching", "dataVisualizations", "journeyMap"];
    const trigger = thresholdReached
      ? `threshold reached (${delta} new reflections)`
      : `monthly floor reached (${Math.round(elapsedSinceLastRegenMs / 86400000)}d since last, ${delta} new reflection${delta === 1 ? "" : "s"})`;
    console.log(`[dataRegen] ${uid}: ${trigger} — starting regeneration`);
    await runRegeneration(uid, outputs, "data_change");
  } catch (err) {
    console.error(`[dataRegen] Error handling reflection trigger for ${uid}:`, err.message);
  }
}

/**
 * Handler for immediate-trigger collections (journeyEvents, assessments).
 * Regenerates immediately on document creation.
 *
 * @param {object} event - Firestore onDocumentCreated event
 */
async function handleImmediateChange(event) {
  const data = event.data?.data();
  const uid = data?.userId;

  if (!uid) {
    console.warn("[dataRegen] Document created without userId — skipping");
    return;
  }

  // Skip drafts
  if (data.isDraft) {
    console.log(`[dataRegen] Skipping draft document for ${uid}`);
    return;
  }

  // Determine collection from the document path
  const docPath = event.data?.ref?.path || "";
  const collection = docPath.split("/")[0] || "unknown";

  console.log(`[dataRegen] ${collection} created for ${uid} — immediate regeneration`);

  try {
    // Journey events affect journey map + coaching
    // Assessments affect coaching
    let outputs;
    if (collection === "journeyEvents") {
      outputs = ["coaching", "journeyMap"];
    } else {
      // physicalAssessments, riderAssessments
      outputs = ["coaching"];
    }

    await runRegeneration(uid, outputs, "data_change");
  } catch (err) {
    console.error(`[dataRegen] Error handling ${collection} trigger for ${uid}:`, err.message);
  }
}

module.exports = {
  handleDebriefCreated,
  handleReflectionCreated,
  handleImmediateChange,
  // Exported for unit tests:
  _regenCompletedThisMonth,
  REGEN_COOLDOWN_MS,
  MULTIVOICE_COOLDOWN_HOURS,
};
