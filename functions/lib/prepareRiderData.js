/**
 * Rider Data Orchestrator
 *
 * Fetches all Firestore data for a user, converts timestamps,
 * filters drafts, runs all sub-aggregators + tier classifiers,
 * and returns a single structured object ready for prompt injection.
 *
 * Output shape aligns with Platform Outputs Definition v2.0:
 * { tier, dataTier, profile, horseSummaries[], rideHistory,
 *   mentalPatterns, reflections, journey, observations, eventPrep,
 *   selfAssessments, overallStats, dataSnapshot }
 */

const { Timestamp } = require("firebase-admin/firestore");
const crypto = require("crypto");
const { db } = require("./firebase");
const { classifyTier, classifyDataTier } = require("./tierClassifier");
const { aggregateProfile } = require("../aggregators/profile");
const { aggregateRideHistory } = require("../aggregators/rideHistory");
const { aggregateReflections } = require("../aggregators/reflections");
const { aggregateJourney } = require("../aggregators/journey");
const { aggregateObservations } = require("../aggregators/observations");
const { aggregateEventPrep } = require("../aggregators/eventPrep");
const { aggregateShowPrep } = require("../aggregators/showPrep");
const { aggregateSelfAssessments } = require("../aggregators/selfAssessments");
const { aggregateMentalPatterns } = require("../aggregators/mentalPatterns");
const { aggregateHorseHealth } = require("../aggregators/horseHealth");
const { aggregateRiderHealth } = require("../aggregators/riderHealth");
const { aggregateLessonNotes } = require("../aggregators/lessonNotes");

/**
 * Output-type → required aggregators map.
 * null means "run ALL aggregators" (unchanged behavior).
 * horseSummaries is always built when both profile and rideHistory are present.
 */
const OUTPUT_DATA_NEEDS = {
  coaching: null,
  coaching_insights: null,
  journeyMap: {
    aggregators: ["profile", "rideHistory", "reflections", "journey", "observations",
      "selfAssessments", "mentalPatterns", "lessonNotes"],
  },
  dataVisualizations: {
    aggregators: ["profile", "rideHistory", "reflections"],
  },
  grandPrixMental: {
    aggregators: ["profile", "rideHistory", "reflections", "selfAssessments", "mentalPatterns",
      "lessonNotes"],
  },
  grandPrixTrajectory: {
    aggregators: ["profile", "rideHistory", "reflections", "selfAssessments",
      "mentalPatterns", "horseHealth", "riderHealth", "lessonNotes"],
  },
  physicalGuidance: {
    aggregators: ["profile", "rideHistory", "selfAssessments", "horseHealth", "riderHealth"],
  },
  eventPlanner: {
    aggregators: ["profile", "rideHistory", "reflections", "eventPrep", "showPrep", "lessonNotes"],
  },
};

/**
 * Convert Firestore Timestamp fields to ISO strings.
 */
function convertTimestamps(doc) {
  const result = { ...doc };
  for (const key of Object.keys(result)) {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate().toISOString();
    }
  }
  return result;
}

/**
 * Fetch all non-deleted documents from a collection for a user.
 */
async function fetchCollection(collectionName, uid) {
  const snapshot = await db
    .collection(collectionName)
    .where("userId", "==", uid)
    .where("isDeleted", "==", false)
    .get();
  return snapshot.docs.map((doc) => convertTimestamps({ id: doc.id, ...doc.data() }));
}

/**
 * Fetch the user profile document (keyed by UID, not queried by userId).
 */
async function fetchUserDoc(uid) {
  const doc = await db.collection("users").doc(uid).get();
  return doc.exists ? convertTimestamps({ id: doc.id, ...doc.data() }) : null;
}

/**
 * Fetch the current ISO week's weeklyContext document for a user.
 * Returns the document data or null if not found.
 */
async function fetchCurrentWeeklyContext(uid) {
  try {
    const now = new Date();
    // ISO week ID: YYYY-Www
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    const weekId = `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

    const snap = await db.collection("users").doc(uid).collection("weeklyContext").doc(weekId).get();
    if (snap.exists) {
      return convertTimestamps({ id: snap.id, ...snap.data() });
    }
    return null;
  } catch (error) {
    console.warn("[prepareRiderData] fetchCurrentWeeklyContext error:", error.message);
    return null;
  }
}

/**
 * Build merged horseSummaries array combining horse profile data
 * with per-horse ride statistics. Per Platform Outputs spec.
 */
function buildHorseSummaries(profile, rideHistory) {
  const horses = profile.horses || [];
  const rideStats = rideHistory.perHorseSummary || {};

  return horses.map((horse) => {
    const stats = rideStats[horse.name] || null;
    return {
      // Profile data
      name: horse.name,
      age: horse.age,
      breed: horse.breed,
      sex: horse.sex,
      partnershipDuration: horse.partnershipDuration,
      level: horse.level,
      arrangement: horse.arrangement,
      strengths: horse.strengths,
      soundness: horse.soundness,
      conditions: horse.conditions,
      importantNotes: horse.importantNotes,
      // V2: asymmetry assessment data
      asymmetry: horse.asymmetry || null,
      // Ride statistics (null if no rides on this horse)
      rideCount: stats ? stats.rideCount : 0,
      avgQuality: stats ? stats.avgQuality : null,
      avgConfidence: stats ? stats.avgConfidence : null,
      avgRiderEffort: stats ? stats.avgRiderEffort : null,
      avgHorseEffort: stats ? stats.avgHorseEffort : null,
      topMovements: stats ? stats.topMovements : [],
      mentalStateDistribution: stats ? stats.mentalStateDistribution : {},
    };
  });
}

/**
 * Build overallStats — quick-reference counts per Platform Outputs spec.
 */
function buildOverallStats(rawCounts, rideHistory, reflections, profile) {
  return {
    debriefCount: rawCounts.debriefs,
    reflectionCount: rawCounts.reflections,
    observationCount: rawCounts.observations,
    journeyEventCount: rawCounts.journeyEvents,
    eventPrepCount: rawCounts.eventPreps,
    horseCount: profile.horseCount,
    horseHealthCount: rawCounts.horseHealthEntries,
    lessonNoteCount: rawCounts.lessonNotes,
    ridingStreak: rideHistory.ridingStreak,
    categoryCoverage: reflections.categoryCoverage,
  };
}

/**
 * Deterministic, key-sorted JSON serialization so equal content always
 * serializes identically regardless of property insertion order. Arrays keep
 * their order (order is meaningful); object keys are sorted recursively.
 */
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
}

/**
 * Per-document content marker. Hashes the whole document MINUS its id (the id
 * is the manifest key) so ANY substantive field edit changes the marker. The
 * docs have already passed through convertTimestamps(), so every field is a
 * stable primitive/ISO string — no read-time-volatile fields exist that would
 * make the marker unstable across reads.
 */
function _docMarker(doc) {
  const { id, ...rest } = doc || {};
  return crypto.createHash("md5").update(stableStringify(rest)).digest("hex").slice(0, 8);
}

/**
 * Build the dataSnapshot: a diff-ready content MANIFEST and a hash DERIVED
 * from it (Fix 1, repetition bug-fix package).
 *
 * Previously the hash was computed from collection COUNTS only, so two
 * completely different data states with the same counts shared a hash —
 * letting edited/swapped content be served from a stale cache as if fresh
 * (the wrong-horse repetition bug, reproduced 2026-06-04).
 *
 * Now:
 *   - manifest lists, per coaching-consumed collection, every document as
 *     { id, m } (m = content marker), sorted by id → order-independent.
 *   - hash = md5(canonical manifest). Content change ⇒ marker change ⇒ hash
 *     change ⇒ correct cache invalidation. This is the SINGLE source of the
 *     hash (never computed independently elsewhere).
 *
 * The manifest is persisted alongside the cached output (see cacheManager
 * setCache `dataSnapshotManifest`) so a future generation can diff current vs
 * previous to derive "what changed" — that diff LOGIC is deferred (Fix 3); the
 * structure is built now to avoid a stored-snapshot migration later.
 *
 * `counts` is retained for backward compatibility (overallStats / existing
 * consumers) but is NOT part of the hash.
 *
 * @param {object} rawCounts - existing per-collection counts
 * @param {object} collections - map of collectionName → array of docs (each
 *   with an `id`); use the SAME non-draft arrays that feed the aggregators so
 *   drafts never churn the hash.
 */
function buildDataSnapshot(rawCounts, collections = {}) {
  const manifest = { v: 1, collections: {} };
  for (const name of Object.keys(collections).sort()) {
    const docs = Array.isArray(collections[name]) ? collections[name] : [];
    manifest.collections[name] = docs
      .map((d) => ({ id: d.id || "", m: _docMarker(d) }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  const hash = crypto.createHash("md5").update(stableStringify(manifest)).digest("hex").slice(0, 12);
  return {
    hash,
    manifest,
    counts: rawCounts,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Recompute a snapshot hash from a persisted manifest. Exported so tests (and
 * future diff logic) can verify the hash is genuinely manifest-derived rather
 * than computed on a separate path.
 */
function hashFromManifest(manifest) {
  return crypto.createHash("md5").update(stableStringify(manifest)).digest("hex").slice(0, 12);
}

/**
 * Main orchestrator — fetches all user data and produces a structured summary.
 *
 * @param {string} uid - Firebase Auth UID
 * @param {string|null} outputType - Optional output type for tiered data inclusion.
 *   When provided, only aggregators needed for that output are run,
 *   reducing the JSON payload sent to Claude. Collections are always
 *   fetched (for accurate hash computation).
 * @returns {Promise<Object>} Complete aggregated rider data for prompt injection
 */
async function prepareRiderData(uid, outputType = null) {
  // Fetch all 12 collections in parallel
  const [
    userDoc,
    riderProfiles,
    horseProfiles,
    debriefs,
    reflections,
    journeyEvents,
    observations,
    eventPrepPlans,
    showPreparations,
    physicalAssessments,
    riderAssessments,
    technicalAssessments,
    horseHealthEntries,
    riderHealthEntries,
    lessonNotes,
    weeklyContextDoc,
  ] = await Promise.all([
    fetchUserDoc(uid),
    fetchCollection("riderProfiles", uid),
    fetchCollection("horseProfiles", uid),
    fetchCollection("debriefs", uid),
    fetchCollection("reflections", uid),
    fetchCollection("journeyEvents", uid),
    fetchCollection("observations", uid),
    fetchCollection("eventPrepPlans", uid),
    fetchCollection("showPreparations", uid),
    fetchCollection("physicalAssessments", uid),
    fetchCollection("riderAssessments", uid),
    fetchCollection("technicalPhilosophicalAssessments", uid),
    fetchCollection("horseHealthEntries", uid),
    fetchCollection("riderHealthEntries", uid),
    fetchCollection("lessonNotes", uid),
    fetchCurrentWeeklyContext(uid),
  ]);

  // Filter out drafts
  const nonDraftDebriefs = debriefs.filter((d) => !d.isDraft);
  const nonDraftPhysical = physicalAssessments.filter((d) => !d.isDraft);
  const nonDraftRider = riderAssessments.filter((d) => !d.isDraft);
  const nonDraftTechnical = technicalAssessments.filter((d) => !d.isDraft);
  const nonDraftLessonNotes = lessonNotes.filter((d) => !d.isDraft);

  // Raw counts for stats and snapshot
  const rawCounts = {
    debriefs: nonDraftDebriefs.length,
    reflections: reflections.length,
    observations: observations.length,
    journeyEvents: journeyEvents.length,
    eventPreps: eventPrepPlans.length,
    showPreps: showPreparations.length,
    horses: horseProfiles.length,
    physicalAssessments: nonDraftPhysical.length,
    riderAssessments: nonDraftRider.length,
    technicalAssessments: nonDraftTechnical.length,
    horseHealthEntries: horseHealthEntries.length,
    riderHealthEntries: riderHealthEntries.length,
    lessonNotes: nonDraftLessonNotes.length,
  };

  // Run all sub-aggregators (they're pure functions, fast — no I/O).
  // All are needed for tier classification. Tiered data inclusion works by
  // nulling out unneeded sections in the return object, so buildUserDataMessage
  // serializes a smaller JSON payload to Claude.
  const riderProfile = riderProfiles[0] || null;
  const profile = aggregateProfile(riderProfile, horseProfiles);
  const rideHistory = aggregateRideHistory(nonDraftDebriefs);
  const reflectionsSummary = aggregateReflections(reflections, weeklyContextDoc);
  const journey = aggregateJourney(journeyEvents);
  const observationsSummary = aggregateObservations(observations);
  const eventPrep = aggregateEventPrep(eventPrepPlans);
  const showPrep = aggregateShowPrep(showPreparations);
  const selfAssessments = aggregateSelfAssessments(nonDraftPhysical, nonDraftRider, nonDraftTechnical);
  const horseHealth = aggregateHorseHealth(horseHealthEntries);
  const riderHealth = aggregateRiderHealth(riderHealthEntries);
  const lessonNotesSummary = aggregateLessonNotes(nonDraftLessonNotes);

  // Cross-cut aggregator: mental patterns
  const mentalPatterns = aggregateMentalPatterns(rideHistory, selfAssessments, reflectionsSummary);

  // Merged horse summaries (profile + ride stats per horse)
  const horseSummaries = buildHorseSummaries(profile, rideHistory);

  // Assemble aggregated data for tier classification
  const aggregatedData = {
    profile,
    rideHistory,
    reflections: reflectionsSummary,
    journey,
    observations: observationsSummary,
    eventPrep,
    selfAssessments,
  };

  // Classify tiers
  const tier = classifyTier(aggregatedData);
  const dataTier = classifyDataTier(aggregatedData);

  // Tiered data inclusion: determine which sections to include in the output.
  // Sections not needed for this output type are set to null, so
  // buildUserDataMessage() omits them → smaller JSON payload to Claude.
  const needs = outputType ? OUTPUT_DATA_NEEDS[outputType] : null;
  const shouldInclude = (name) => !needs || needs.aggregators.includes(name);

  // Overall stats and data snapshot
  // Build overallStats (riderHealthCount surfaced for quick reference)
  const overallStatsBase = buildOverallStats(rawCounts, rideHistory, reflectionsSummary, profile);
  overallStatsBase.riderHealthCount = rawCounts.riderHealthEntries;
  const overallStats = overallStatsBase;
  // Pass the SAME non-draft collections the aggregators (and therefore Claude)
  // see, so the content manifest/hash tracks exactly what coaching consumes and
  // drafts never churn it. weeklyContext is a single doc → 0/1-element array.
  const dataSnapshot = buildDataSnapshot(rawCounts, {
    debriefs: nonDraftDebriefs,
    reflections,
    journeyEvents,
    observations,
    eventPrepPlans,
    showPreparations,
    physicalAssessments: nonDraftPhysical,
    riderAssessments: nonDraftRider,
    technicalAssessments: nonDraftTechnical,
    horseHealthEntries,
    riderHealthEntries,
    lessonNotes: nonDraftLessonNotes,
    horseProfiles,
    riderProfiles,
    weeklyContext: weeklyContextDoc ? [weeklyContextDoc] : [],
  });

  return {
    uid,
    displayName: userDoc ? userDoc.displayName || "" : "",
    generatedAt: new Date().toISOString(),

    // Classification
    tier,
    dataTier,

    // Aggregated sections — null out sections not needed for this output type.
    // buildUserDataMessage() filters nulls → smaller JSON payload to Claude.
    profile,
    horseSummaries,
    rideHistory: shouldInclude("rideHistory") ? rideHistory : null,
    mentalPatterns: shouldInclude("mentalPatterns") ? mentalPatterns : null,
    reflections: shouldInclude("reflections") ? reflectionsSummary : null,
    journey: shouldInclude("journey") ? journey : null,
    observations: shouldInclude("observations") ? observationsSummary : null,
    eventPrep: shouldInclude("eventPrep") ? eventPrep : null,
    showPrep: shouldInclude("showPrep") ? showPrep : null,
    selfAssessments: shouldInclude("selfAssessments") ? selfAssessments : null,
    horseHealth: shouldInclude("horseHealth") ? horseHealth : null,
    // Rider health is RIDER-PRIVATE by default. Omit from any output type
    // formatted for shared audiences (coach, trainer, external). The
    // OUTPUT_DATA_NEEDS map is the single source of truth — journeyMap and
    // dataVisualizations deliberately do not list "riderHealth" so it is
    // stripped here. Do not rely on prompt instructions alone to exclude it.
    riderHealth: shouldInclude("riderHealth") ? riderHealth : null,
    lessonNotes: shouldInclude("lessonNotes") ? lessonNotesSummary : null,

    // Quick-reference stats and staleness detection
    overallStats,
    dataSnapshot,
  };
}

module.exports = { prepareRiderData, buildDataSnapshot, hashFromManifest, stableStringify };
