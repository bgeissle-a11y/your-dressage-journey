/**
 * Generation Status Manager
 *
 * Tracks background AI output regeneration state per user via
 * `generationStatus/{uid}` Firestore documents. The frontend
 * listens to these documents in real-time (onSnapshot) to show
 * progress and auto-refresh when generation completes.
 *
 * Also stores debrief/reflection counts at last regeneration
 * for threshold-based trigger logic (regenerate after 5 new entries).
 */

const { db } = require("./firebase");

const COLLECTION = "generationStatus";

/**
 * Get the current generation status for a user.
 * Returns null if no status document exists.
 *
 * @param {string} uid - User ID
 * @returns {Promise<object|null>}
 */
async function getStatus(uid) {
  const docSnap = await db.collection(COLLECTION).doc(uid).get();
  if (!docSnap.exists) return null;
  return docSnap.data();
}

/**
 * Mark generation as in-progress for a user.
 *
 * @param {string} uid - User ID
 * @param {string[]} outputTypes - Outputs to regenerate (e.g., ['coaching', 'dataVisualizations'])
 * @param {string} triggeredBy - 'data_change' | 'scheduled' | 'login' | 'manual'
 */
async function startGeneration(uid, outputTypes, triggeredBy) {
  await db.collection(COLLECTION).doc(uid).set(
    {
      status: "in_progress",
      currentOutput: outputTypes[0] || null,
      outputsCompleted: [],
      outputsRemaining: outputTypes,
      startedAt: new Date().toISOString(),
      completedAt: null,
      triggeredBy,
      pendingRerun: false,
      error: null,
    },
    { merge: true }
  );
  console.log(`[genStatus] Started generation for ${uid} — ${outputTypes.length} outputs (${triggeredBy})`);
}

/**
 * Update progress after a single output completes.
 * Moves the output from remaining to completed and advances currentOutput.
 *
 * @param {string} uid - User ID
 * @param {string} completedOutput - The output type that just finished
 */
async function updateProgress(uid, completedOutput) {
  const status = await getStatus(uid);
  if (!status) return;

  const completed = [...(status.outputsCompleted || []), completedOutput];
  const remaining = (status.outputsRemaining || []).filter((o) => o !== completedOutput);

  await db.collection(COLLECTION).doc(uid).update({
    outputsCompleted: completed,
    outputsRemaining: remaining,
    currentOutput: remaining[0] || null,
  });
  console.log(`[genStatus] ${uid}: completed ${completedOutput} (${completed.length}/${completed.length + remaining.length})`);
}

/**
 * Mark generation as complete. Updates counters and resets status.
 *
 * @param {string} uid - User ID
 * @param {object} [currentCounts] - Current data counts to store for threshold checking
 * @param {number} [currentCounts.debriefCount] - Current total debrief count
 * @param {number} [currentCounts.reflectionCount] - Current total reflection count
 * @returns {Promise<boolean>} Whether a rerun was requested during generation
 */
async function completeGeneration(uid, currentCounts = {}) {
  const status = await getStatus(uid);
  const hadPendingRerun = status?.pendingRerun === true;

  const updateData = {
    status: "complete",
    currentOutput: null,
    outputsRemaining: [],
    completedAt: new Date().toISOString(),
    error: null,
  };

  // Update counters if provided (for threshold-based triggers)
  if (currentCounts.debriefCount !== undefined) {
    updateData.debriefCountAtLastRegen = currentCounts.debriefCount;
  }
  if (currentCounts.reflectionCount !== undefined) {
    updateData.reflectionCountAtLastRegen = currentCounts.reflectionCount;
  }

  if (hadPendingRerun) {
    updateData.pendingRerun = false;
  }

  await db.collection(COLLECTION).doc(uid).update(updateData);
  console.log(`[genStatus] ${uid}: generation complete${hadPendingRerun ? " (rerun pending)" : ""}`);

  return hadPendingRerun;
}

/**
 * Set the pendingRerun flag when new data arrives during an active generation.
 * This tells the generation loop to re-run after completing the current cycle.
 *
 * @param {string} uid - User ID
 */
async function requestRerun(uid) {
  await db.collection(COLLECTION).doc(uid).update({
    pendingRerun: true,
  });
  console.log(`[genStatus] ${uid}: rerun requested (generation in progress)`);
}

/**
 * Record an error during generation without stopping the overall process.
 *
 * @param {string} uid - User ID
 * @param {string} errorMessage - Error description
 */
async function recordError(uid, errorMessage) {
  await db.collection(COLLECTION).doc(uid).update({
    error: errorMessage,
  });
}

/**
 * Get the stored counts from the last regeneration for threshold checking.
 * Returns { debriefCountAtLastRegen, reflectionCountAtLastRegen } or defaults of 0.
 *
 * @param {string} uid - User ID
 * @returns {Promise<{debriefCountAtLastRegen: number, reflectionCountAtLastRegen: number}>}
 */
async function getCountsAtLastRegen(uid) {
  const status = await getStatus(uid);
  return {
    debriefCountAtLastRegen: status?.debriefCountAtLastRegen || 0,
    reflectionCountAtLastRegen: status?.reflectionCountAtLastRegen || 0,
  };
}

module.exports = {
  getStatus,
  startGeneration,
  updateProgress,
  completeGeneration,
  requestRerun,
  recordError,
  getCountsAtLastRegen,
};
