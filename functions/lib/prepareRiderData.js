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
const { aggregateSelfAssessments } = require("../aggregators/selfAssessments");
const { aggregateMentalPatterns } = require("../aggregators/mentalPatterns");
const { aggregateHorseHealth } = require("../aggregators/horseHealth");

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
    ridingStreak: rideHistory.ridingStreak,
    categoryCoverage: reflections.categoryCoverage,
  };
}

/**
 * Build dataSnapshot hash for staleness detection.
 * Per GP Thinking spec: "A dataSnapshot hash is stored with each
 * generation so the frontend can compare and prompt for regeneration."
 */
function buildDataSnapshot(rawCounts) {
  const snapshotData = JSON.stringify(rawCounts);
  const hash = crypto.createHash("md5").update(snapshotData).digest("hex").slice(0, 12);
  return {
    hash,
    counts: rawCounts,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Main orchestrator — fetches all user data and produces a structured summary.
 *
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<Object>} Complete aggregated rider data for prompt injection
 */
async function prepareRiderData(uid) {
  // Fetch all 11 collections in parallel
  const [
    userDoc,
    riderProfiles,
    horseProfiles,
    debriefs,
    reflections,
    journeyEvents,
    observations,
    eventPrepPlans,
    physicalAssessments,
    riderAssessments,
    horseHealthEntries,
  ] = await Promise.all([
    fetchUserDoc(uid),
    fetchCollection("riderProfiles", uid),
    fetchCollection("horseProfiles", uid),
    fetchCollection("debriefs", uid),
    fetchCollection("reflections", uid),
    fetchCollection("journeyEvents", uid),
    fetchCollection("observations", uid),
    fetchCollection("eventPrepPlans", uid),
    fetchCollection("physicalAssessments", uid),
    fetchCollection("riderAssessments", uid),
    fetchCollection("horseHealthEntries", uid),
  ]);

  // Filter out drafts
  const nonDraftDebriefs = debriefs.filter((d) => !d.isDraft);
  const nonDraftPhysical = physicalAssessments.filter((d) => !d.isDraft);
  const nonDraftRider = riderAssessments.filter((d) => !d.isDraft);

  // Raw counts for stats and snapshot
  const rawCounts = {
    debriefs: nonDraftDebriefs.length,
    reflections: reflections.length,
    observations: observations.length,
    journeyEvents: journeyEvents.length,
    eventPreps: eventPrepPlans.length,
    horses: horseProfiles.length,
    physicalAssessments: nonDraftPhysical.length,
    riderAssessments: nonDraftRider.length,
    horseHealthEntries: horseHealthEntries.length,
  };

  // Run all 8 base sub-aggregators
  const riderProfile = riderProfiles[0] || null;
  const profile = aggregateProfile(riderProfile, horseProfiles);
  const rideHistory = aggregateRideHistory(nonDraftDebriefs);
  const reflectionsSummary = aggregateReflections(reflections);
  const journey = aggregateJourney(journeyEvents);
  const observationsSummary = aggregateObservations(observations);
  const eventPrep = aggregateEventPrep(eventPrepPlans);
  const selfAssessments = aggregateSelfAssessments(nonDraftPhysical, nonDraftRider);
  const horseHealth = aggregateHorseHealth(horseHealthEntries);

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

  // Overall stats and data snapshot
  const overallStats = buildOverallStats(rawCounts, rideHistory, reflectionsSummary, profile);
  const dataSnapshot = buildDataSnapshot(rawCounts);

  return {
    uid,
    displayName: userDoc ? userDoc.displayName || "" : "",
    generatedAt: new Date().toISOString(),

    // Classification
    tier,
    dataTier,

    // Aggregated sections (per Platform Outputs spec)
    profile,
    horseSummaries,
    rideHistory,
    mentalPatterns,
    reflections: reflectionsSummary,
    journey,
    observations: observationsSummary,
    eventPrep,
    selfAssessments,
    horseHealth,

    // Quick-reference stats and staleness detection
    overallStats,
    dataSnapshot,
  };
}

module.exports = { prepareRiderData };
