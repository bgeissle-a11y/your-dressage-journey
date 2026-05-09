/**
 * Context helpers for the Empathetic Coach micro-debrief and Fresh Start
 * response Cloud Functions.
 *
 * These functions read the rider's existing data state to produce three
 * pieces of context the prompt builders need:
 *
 *   1. detectRiderState(uid) — branches the prompt across:
 *        - "new_no_first_light"   (no First Light yet, thin data)
 *        - "new_with_first_light" (First Light exists, no Multi-Voice cache)
 *        - "established"          (Multi-Voice cache exists)
 *
 *   2. getCoachingContext(uid) — for established riders, reads the
 *      cached précis (from coaching_precis side-extract), the latest
 *      Journey Map trajectory, and computes the cache freshness band.
 *      Returns null if no coaching cache exists.
 *
 *   3. getFirstLightContext(uid) — for new_with_first_light riders, reads
 *      the active First Light themes/intentions and computes its age.
 *
 * Source of truth:
 * - YDJ_MicroDebrief_EmpatheticResponse_PromptSpec.md §"Rider States"
 * - YDJ_FreshStart_EmpatheticResponse_PromptSpec_v1_1.md §"Cached Coaching Context"
 * - YDJ_MultiVoicePrecis_Spec.md (précis is cached via cacheManager as
 *   outputType "coaching_precis").
 */

const { db } = require("./firebase");

const FIRST_LIGHT_PATH = (uid) =>
  db.collection("riders").doc(uid).collection("firstLight").doc("current");

const ANALYSIS_CACHE = "analysisCache";

const FRESHNESS_FRESH_DAYS = 14;
const FRESHNESS_AGING_DAYS = 30;

/**
 * Cheap server-side check: does a Multi-Voice cache row exist for this rider?
 * Voice 0 (Classical Master) is checked as the canonical signal — every MVC
 * generation writes all four voices in parallel, so voice 0 presence implies
 * the rider has crossed the 5-debrief Multi-Voice threshold at least once.
 */
async function hasMultiVoiceCache(uid) {
  const snap = await db.collection(ANALYSIS_CACHE).doc(`${uid}_coaching_0`).get();
  return snap.exists;
}

/**
 * Detect the rider's state per the micro-debrief spec.
 *
 * Order of checks is cheap-first:
 *   1. Multi-Voice cache exists → established (one Firestore read)
 *   2. First Light exists → new_with_first_light (one Firestore read)
 *   3. Otherwise → new_no_first_light
 *
 * Total cost: 1-2 Firestore document reads.
 *
 * @param {string} uid
 * @returns {Promise<"new_no_first_light"|"new_with_first_light"|"established">}
 */
async function detectRiderState(uid) {
  if (await hasMultiVoiceCache(uid)) return "established";
  const flSnap = await FIRST_LIGHT_PATH(uid).get();
  if (flSnap.exists) return "new_with_first_light";
  return "new_no_first_light";
}

/**
 * Compute days between an ISO timestamp string and now.
 */
function daysSince(isoString) {
  if (!isoString) return null;
  const t = new Date(isoString).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

/**
 * Compute the cache freshness band per the micro-debrief spec.
 *
 *   0–14 days  → "fresh"
 *   15–30 days → "aging"
 *   31+ days   → "stale"
 */
function freshnessBand(ageDays) {
  if (ageDays == null) return null;
  if (ageDays <= FRESHNESS_FRESH_DAYS) return "fresh";
  if (ageDays <= FRESHNESS_AGING_DAYS) return "aging";
  return "stale";
}

/**
 * For an established rider, fetch the coaching context the empathetic
 * response prompts need: précis text, Journey Map trajectory, current focus
 * statement, and cache freshness.
 *
 * Returns null if no cache exists. Returns partial data (e.g. précis only,
 * no journey map) when one or more side-cache rows are missing.
 *
 * @param {string} uid
 * @returns {Promise<{
 *   precis: string|null,
 *   trajectory: string|null,
 *   focus: string|null,
 *   cacheAgeDays: number|null,
 *   cacheBand: string|null,
 * }|null>}
 */
async function getCoachingContext(uid) {
  const [precisSnap, jmSnap, voice0Snap] = await Promise.all([
    db.collection(ANALYSIS_CACHE).doc(`${uid}_coaching_precis`).get(),
    db.collection(ANALYSIS_CACHE).doc(`${uid}_journeyMap`).get(),
    db.collection(ANALYSIS_CACHE).doc(`${uid}_coaching_0`).get(),
  ]);

  // Anchor cache age on the voice cache itself — the précis can be missing
  // (rider's MVC predates the précis change) but the rider is still
  // established. Fall back to précis row if voice 0 is gone but précis
  // somehow remains.
  const ageAnchor = voice0Snap.exists
    ? voice0Snap.data().generatedAt
    : (precisSnap.exists ? precisSnap.data().generatedAt : null);

  if (!ageAnchor) return null;

  const cacheAgeDays = daysSince(ageAnchor);
  const cacheBand = freshnessBand(cacheAgeDays);

  const precis = precisSnap.exists ? (precisSnap.data().result?.precis || null) : null;

  let trajectory = null;
  let focus = null;
  if (jmSnap.exists) {
    const jmResult = jmSnap.data().result || {};
    // Journey Map result shape varies; try the common locations.
    trajectory =
      jmResult.trajectory ||
      jmResult.overallTrajectory ||
      jmResult.summary?.trajectory ||
      jmResult.summary?.overallTrajectory ||
      null;
    focus =
      jmResult.currentFocus ||
      jmResult.summary?.currentFocus ||
      jmResult.summary?.focus ||
      null;
  }

  return {
    precis,
    trajectory,
    focus,
    cacheAgeDays: cacheAgeDays != null ? Math.round(cacheAgeDays * 10) / 10 : null,
    cacheBand,
  };
}

/**
 * For a new_with_first_light rider, fetch First Light themes and intentions.
 * Returns null if First Light doesn't exist.
 *
 * The First Light document shape varies slightly by version; we extract a
 * compact set of "themes" and "intentions" the prompt can reference without
 * needing the full output.
 *
 * @param {string} uid
 * @returns {Promise<{
 *   themes: string[],
 *   intentions: string[],
 *   ageDays: number|null,
 * }|null>}
 */
async function getFirstLightContext(uid) {
  const snap = await FIRST_LIGHT_PATH(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};

  // Themes can live under several keys depending on First Light version.
  const themes = []
    .concat(data.themes || [])
    .concat(data.coreThemes || [])
    .concat(data.identifiedThemes || [])
    .filter((t) => typeof t === "string" && t.trim())
    .slice(0, 5);

  const intentions = []
    .concat(data.intentions || [])
    .concat(data.identifiedIntentions || [])
    .concat(data.focusAreas || [])
    .filter((t) => typeof t === "string" && t.trim())
    .slice(0, 3);

  // Generation timestamp may be under generatedAt (ISO) or createdAt
  // (Firestore Timestamp). Normalize to ISO before age math.
  let generatedIso = null;
  if (typeof data.generatedAt === "string") {
    generatedIso = data.generatedAt;
  } else if (data.generatedAt?.toDate) {
    generatedIso = data.generatedAt.toDate().toISOString();
  } else if (data.createdAt?.toDate) {
    generatedIso = data.createdAt.toDate().toISOString();
  }

  const ageDays = daysSince(generatedIso);
  return {
    themes,
    intentions,
    ageDays: ageDays != null ? Math.round(ageDays) : null,
  };
}

module.exports = {
  detectRiderState,
  getCoachingContext,
  getFirstLightContext,
  freshnessBand, // exported for testing
  daysSince, // exported for testing
};
