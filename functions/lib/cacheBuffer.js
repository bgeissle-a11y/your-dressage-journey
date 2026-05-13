/**
 * cacheBuffer — Lever 1 implementation (Token Budget Spec v2 §Part 2).
 *
 * Replaces the per-`dataSnapshotHash` invalidation that previously fired on
 * every new debrief. The cache is now treated as fresh until *enough* new
 * activity has accumulated since the cached generation:
 *
 *   ≥ 5 new debriefs, OR
 *   ≥ 3 new debriefs + ≥ 1 new reflection
 *
 * When neither threshold is met, hash mismatches are ignored and the cache
 * is served as fresh. When the threshold is met, the cache is treated as
 * stale (the normal regen path resumes).
 *
 * Scope: only Multi-Voice Coaching and Journey Map. Show Planner, GPT, and
 * Physical have their own 30-day cycle cadence and must NOT call into here.
 *
 * Auto-regen triggers (`REGEN_THRESHOLD = 10` in dataTriggeredRegeneration)
 * and the 28-day monthly floor are unchanged — the buffer only governs the
 * on-demand `getCache` read path.
 */

const { db } = require("./firebase");

// Spec thresholds. Spec §Part 2 + §Part 7 §4.
const DEBRIEF_THRESHOLD = 5;
const COMBO_DEBRIEF_THRESHOLD = 3;
const COMBO_REFLECTION_THRESHOLD = 1;

// Per-instance in-process cache. Cloud Functions reuse a warm instance for
// minutes, so when the coaching fan-out reads cache 5 times for the same uid
// in one invocation, this avoids 10 Firestore count() calls (5 debriefs + 5
// reflections). TTL is short (60s) so an instance that survives across two
// requests doesn't go stale.
const COUNT_TTL_MS = 60 * 1000;
const countCache = new Map(); // uid → { generatedAt, debriefs, reflections, fetchedAt }

function _cacheKey(uid, generatedAt) {
  return `${uid}::${generatedAt}`;
}

async function _countSince(collectionName, uid, sinceIso) {
  const snap = await db
    .collection(collectionName)
    .where("userId", "==", uid)
    .where("isDeleted", "==", false)
    .where("createdAt", ">", new Date(sinceIso))
    .count()
    .get();
  return snap.data().count;
}

/**
 * Count debriefs and reflections created since `generatedAt`.
 * Both counts respect soft-delete (isDeleted=false).
 *
 * Falls back to {debriefs:0, reflections:0} on any error — fail-open here is
 * the safer behavior because the alternative is invalidating cache on
 * transient Firestore hiccups.
 *
 * @param {object} args
 * @param {string} args.uid
 * @param {string} args.generatedAt - ISO timestamp of the cached generation
 * @returns {Promise<{debriefs: number, reflections: number}>}
 */
async function countActivitySince({ uid, generatedAt }) {
  if (!uid || !generatedAt) {
    return { debriefs: 0, reflections: 0 };
  }

  const key = _cacheKey(uid, generatedAt);
  const cached = countCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < COUNT_TTL_MS) {
    return { debriefs: cached.debriefs, reflections: cached.reflections };
  }

  try {
    const [debriefs, reflections] = await Promise.all([
      _countSince("debriefs", uid, generatedAt),
      _countSince("reflections", uid, generatedAt),
    ]);
    countCache.set(key, { debriefs, reflections, fetchedAt: Date.now() });
    return { debriefs, reflections };
  } catch (err) {
    console.warn(
      `[cacheBuffer] count failed for ${uid} since ${generatedAt}:`,
      err.message || err
    );
    return { debriefs: 0, reflections: 0 };
  }
}

/**
 * Has enough activity accumulated since `generatedAt` to invalidate the cache?
 *
 * @param {object} args
 * @param {string} args.uid
 * @param {string} args.generatedAt - ISO timestamp of the cached generation
 * @returns {Promise<boolean>}
 */
async function bufferThresholdMet({ uid, generatedAt }) {
  const { debriefs, reflections } = await countActivitySince({ uid, generatedAt });
  if (debriefs >= DEBRIEF_THRESHOLD) return true;
  if (debriefs >= COMBO_DEBRIEF_THRESHOLD && reflections >= COMBO_REFLECTION_THRESHOLD) {
    return true;
  }
  return false;
}

/**
 * Pure version of the threshold check — exported for unit testing the rule
 * without touching Firestore.
 */
function isThresholdMet(debriefs, reflections) {
  if (debriefs >= DEBRIEF_THRESHOLD) return true;
  if (debriefs >= COMBO_DEBRIEF_THRESHOLD && reflections >= COMBO_REFLECTION_THRESHOLD) {
    return true;
  }
  return false;
}

/** Test/maintenance helper — clears the in-process count cache. */
function _resetCountCache() {
  countCache.clear();
}

module.exports = {
  bufferThresholdMet,
  countActivitySince,
  isThresholdMet,
  _resetCountCache,
  DEBRIEF_THRESHOLD,
  COMBO_DEBRIEF_THRESHOLD,
  COMBO_REFLECTION_THRESHOLD,
};
