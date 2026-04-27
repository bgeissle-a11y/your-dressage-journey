/**
 * In-Flight Generation Lock
 *
 * Per-(uid, outputType) Firestore lock that prevents concurrent invocations
 * of the same expensive AI pipeline. When a second caller arrives while a
 * pipeline is running, it acquires() returns false and the caller should
 * return a "regenerating" response instead of running a parallel pipeline.
 *
 * A lock is considered stale (and eligible to be overwritten) once it
 * exceeds `ttlMs` — typically because the holding function crashed without
 * releasing. Default TTL is 10 minutes, well above legitimate pipeline
 * runtimes (trajectory ~2 min worst case).
 *
 * Collection: generationLocks/{uid}_{outputType}
 *
 * Fail-open design: any Firestore error during acquire is treated as
 * "lock acquired" so legitimate work is never blocked by infrastructure
 * issues. Correctness cost: a one-off lock collision may slip through.
 */

const { db } = require("./firebase");

const COLLECTION = "generationLocks";
const DEFAULT_TTL_MS = 10 * 60 * 1000;

function buildDocId(uid, outputType) {
  return `${uid}_${outputType}`;
}

/**
 * Try to acquire a lock. Returns true if acquired (caller should proceed
 * and call releaseLock in a finally block), false if another caller holds
 * a fresh lock (caller should return a regenerating response).
 *
 * @param {string} uid
 * @param {string} outputType - e.g. "grandPrixTrajectory", "coaching"
 * @param {number} [ttlMs] - Lock TTL; locks older than this are overwritten
 * @returns {Promise<boolean>}
 */
async function tryAcquireLock(uid, outputType, ttlMs = DEFAULT_TTL_MS) {
  const docRef = db.collection(COLLECTION).doc(buildDocId(uid, outputType));
  const now = Date.now();

  try {
    return await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      if (doc.exists) {
        const data = doc.data();
        const acquiredAt = data?.acquiredAtMs || 0;
        if (now - acquiredAt < ttlMs) {
          return false;
        }
        console.warn(
          `[inflightLock] Overwriting stale lock for ${uid}_${outputType} ` +
            `(age: ${Math.round((now - acquiredAt) / 1000)}s)`
        );
      }
      tx.set(docRef, {
        uid,
        outputType,
        acquiredAt: new Date(now).toISOString(),
        acquiredAtMs: now,
      });
      return true;
    });
  } catch (err) {
    console.warn(
      `[inflightLock] Acquire failed for ${uid}_${outputType}: ${err.message} — proceeding without lock`
    );
    return true;
  }
}

/**
 * Release a lock. Safe to call even if acquire failed — delete of a
 * non-existent doc is a no-op in Firestore.
 *
 * @param {string} uid
 * @param {string} outputType
 */
async function releaseLock(uid, outputType) {
  try {
    await db.collection(COLLECTION).doc(buildDocId(uid, outputType)).delete();
  } catch (err) {
    console.warn(
      `[inflightLock] Release failed for ${uid}_${outputType}: ${err.message}`
    );
  }
}

module.exports = { tryAcquireLock, releaseLock };
