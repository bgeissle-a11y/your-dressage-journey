/**
 * Tier Classifier
 *
 * Classifies the rider into one of 4 tiers based on a 100-point
 * composite score across 4 factors (25 points each).
 *
 * Tiers:
 *   0-20  newcomer    — just getting started
 *   21-45 building    — some data, patterns forming
 *   46-70 developing  — consistent, clear patterns
 *   71-100 established — rich history, strong self-awareness
 *
 * Pure function — takes aggregated data, returns classification.
 */

// Horse level → numeric score for sophistication ranking
const HORSE_LEVEL_SCORES = {
  "beginner": 1,
  "training-not-showing": 1,
  "training": 2,
  "first": 3,
  "second": 4,
  "third": 5,
  "fourth": 6,
  "psg": 7,
  "inter1": 8,
  "inter2": 8,
  "gp": 8,
};

const SOPHISTICATION_SCORES = {
  "basic": 2,
  "intermediate": 4,
  "advanced": 6,
  "elite": 8,
};

const FREQUENCY_SCORES = {
  "1-2": 1,
  "3-4": 2,
  "5-6": 3,
  "7+": 4,
};

const COACH_SCORES = {
  "independent": 1,
  "occasional": 2,
  "biweekly": 3,
  "weekly": 4,
};

/**
 * Score a count value using thresholds.
 * thresholds is an array of [maxValue, score] pairs, checked in order.
 */
function scoreByThresholds(value, thresholds) {
  for (const [max, score] of thresholds) {
    if (value <= max) return score;
  }
  return thresholds[thresholds.length - 1][1];
}

/**
 * Factor 1: Data Volume (0-25 points)
 */
function scoreDataVolume(data) {
  const rideCount = data.rideHistory.totalRides;
  const reflectionCount = data.reflections.totalReflections;
  const observationCount = data.observations.totalObservations;
  const journeyCount = data.journey.totalEvents;
  const eventPrepCount = data.eventPrep.totalPlans;
  const hasProfile = data.profile.hasProfile;
  const hasPhysical = data.selfAssessments.physical.hasAssessment;

  const rideScore = scoreByThresholds(rideCount, [
    [0, 0], [2, 1], [5, 2], [10, 4], [20, 6], [50, 7], [Infinity, 8],
  ]);
  const reflScore = scoreByThresholds(reflectionCount, [
    [0, 0], [2, 1], [5, 2], [10, 3], [20, 4], [Infinity, 5],
  ]);
  const obsScore = scoreByThresholds(observationCount, [
    [0, 0], [2, 1], [5, 2], [Infinity, 3],
  ]);
  const journeyScore = scoreByThresholds(journeyCount, [
    [0, 0], [2, 1], [5, 2], [Infinity, 3],
  ]);
  const prepScore = scoreByThresholds(eventPrepCount, [
    [0, 0], [1, 1], [3, 2], [Infinity, 3],
  ]);
  const profileScore = hasProfile ? 2 : 0;
  const physicalScore = hasPhysical ? 1 : 0;

  return Math.min(25, rideScore + reflScore + obsScore + journeyScore + prepScore + profileScore + physicalScore);
}

/**
 * Factor 2: Riding Sophistication (0-25 points)
 */
function scoreRidingSophistication(data) {
  // Highest horse level
  const horses = data.profile.horses || [];
  let maxHorseLevel = 0;
  for (const h of horses) {
    const score = HORSE_LEVEL_SCORES[h.level] || 0;
    if (score > maxHorseLevel) maxHorseLevel = score;
  }

  // Movement sophistication
  const sophLevel = data.rideHistory.movementCoverage.sophisticationLevel;
  const sophScore = SOPHISTICATION_SCORES[sophLevel] || 0;

  // Session type diversity
  const sessionTypes = Object.keys(data.rideHistory.sessionTypeDistribution).length;
  const diversityScore = Math.min(4, sessionTypes);

  // Average ride quality
  const avgQuality = data.rideHistory.averages.overallQuality;
  let qualityScore = 0;
  if (avgQuality >= 7) qualityScore = 5;
  else if (avgQuality >= 6) qualityScore = 4;
  else if (avgQuality >= 5) qualityScore = 3;
  else if (avgQuality >= 4) qualityScore = 2;
  else if (avgQuality > 0) qualityScore = 1;

  return Math.min(25, maxHorseLevel + sophScore + diversityScore + qualityScore);
}

/**
 * Factor 3: Self-Awareness (0-25 points)
 */
function scoreSelfAwareness(data) {
  // Reflection category coverage (0-6)
  const categoryCoverage = data.reflections.categoryCoverage.covered.length;

  // Has rider assessment (0-4)
  const hasRiderAssessment = data.selfAssessments.mental.hasAssessment ? 4 : 0;

  // Has physical assessment (0-4)
  const hasPhysical = data.selfAssessments.physical.hasAssessment ? 4 : 0;

  // Kinesthetic level (0-3)
  let kinestheticScore = 0;
  if (data.selfAssessments.physical.hasAssessment) {
    const level = data.selfAssessments.physical.kinestheticLevel || 5;
    if (level >= 7) kinestheticScore = 3;
    else if (level >= 4) kinestheticScore = 2;
    else kinestheticScore = 1;
  }

  // Self-ratings average (0-4)
  let ratingsScore = 0;
  if (data.selfAssessments.mental.hasAssessment) {
    const ratings = data.selfAssessments.mental.selfRatings;
    const values = [
      ratings.positionAndSeat,
      ratings.aidsAndCommunication,
      ratings.feelAndTiming,
      ratings.knowledgeAndUnderstanding,
      ratings.mentalGame,
    ];
    const avgRating = values.reduce((s, v) => s + v, 0) / values.length;
    if (avgRating >= 7) ratingsScore = 4;
    else if (avgRating >= 5) ratingsScore = 3;
    else if (avgRating >= 3) ratingsScore = 2;
    else ratingsScore = 1;
  }

  // Observation learning (0-4)
  const obsCount = data.observations.totalObservations;
  const obsScore = scoreByThresholds(obsCount, [
    [0, 0], [2, 1], [5, 2], [10, 3], [Infinity, 4],
  ]);

  return Math.min(25, categoryCoverage + hasRiderAssessment + hasPhysical + kinestheticScore + ratingsScore + obsScore);
}

/**
 * Factor 4: Engagement (0-25 points)
 */
function scoreEngagement(data) {
  // Riding streak (0-6)
  const streak = data.rideHistory.ridingStreak;
  let streakScore = 0;
  if (streak >= 10) streakScore = 6;
  else if (streak >= 7) streakScore = 5;
  else if (streak >= 4) streakScore = 3;
  else if (streak >= 2) streakScore = 2;
  else if (streak >= 1) streakScore = 1;

  // Riding frequency from profile (0-4)
  const freq = data.profile.rider ? data.profile.rider.ridingFrequency : "";
  const freqScore = FREQUENCY_SCORES[freq] || 0;

  // Coach engagement (0-4)
  const coach = data.profile.rider ? data.profile.rider.coachEngagement : "";
  const coachScore = COACH_SCORES[coach] || 0;

  // Upcoming events (0-3)
  const upcomingCount = data.eventPrep.upcomingEvents.length;
  const upcomingScore = Math.min(3, upcomingCount);

  // Recency — days since last ride (0-4)
  let recencyScore = 0;
  const latestDate = data.rideHistory.dateRange.latest;
  if (latestDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(latestDate + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince <= 7) recencyScore = 4;
    else if (daysSince <= 14) recencyScore = 3;
    else if (daysSince <= 30) recencyScore = 2;
    else if (daysSince <= 90) recencyScore = 1;
  }

  // Active journey management (0-4)
  let journeyScore = 0;
  if (data.journey.impactSummary.resolvedCount > 0) journeyScore += 2;
  if (data.journey.impactSummary.activeCount > 0 || data.journey.impactSummary.ongoingCount > 0) {
    journeyScore += 2;
  }

  return Math.min(25, streakScore + freqScore + coachScore + upcomingScore + recencyScore + journeyScore);
}

/**
 * Generate a dynamic summary based on tier and factor distribution.
 */
function generateSummary(tier, factors) {
  const entries = Object.entries(factors);
  entries.sort((a, b) => b[1] - a[1]);
  const strongest = entries[0][0];
  const weakest = entries[entries.length - 1][0];

  const tierSummaries = {
    newcomer: {
      default: "Just getting started. Building initial data to enable personalized coaching.",
      dataVolume: "Profile set up — great start. Adding ride debriefs will unlock the first coaching insights.",
    },
    building: {
      default: "Building ride history and beginning to see patterns. More data will sharpen coaching.",
      selfAwareness: "Good foundational data. Completing a self-assessment would significantly deepen coaching.",
      engagement: "Has good foundational data. More consistent riding will reveal clearer patterns.",
    },
    developing: {
      default: "Consistent riding with clear patterns emerging. Strong foundation for targeted coaching.",
      selfAwareness: "Strong ride data with advancing skills. Deepening self-reflection would unlock richer coaching.",
      ridingSophistication: "Advancing technical range with consistent work. Patterns are clear for targeted coaching.",
    },
    established: {
      default: "Rich history with strong self-awareness. Deep data enables nuanced, personalized coaching.",
      default2: "Comprehensive data across all areas. Coaching can draw on deep patterns and cross-references.",
    },
  };

  const templates = tierSummaries[tier] || tierSummaries.newcomer;

  // For established tier, use balanced message if factors are even
  if (tier === "established") {
    const range = entries[0][1] - entries[entries.length - 1][1];
    if (range <= 5) return templates.default2;
    return templates.default;
  }

  // Use weakest-factor-specific message if available
  if (templates[weakest] && weakest !== strongest) {
    return templates[weakest];
  }

  return templates.default;
}

/**
 * @param {Object} aggregatedData - Full aggregated data from all sub-aggregators
 * @returns {Object} Tier classification result
 */
function classifyTier(aggregatedData) {
  const dataVolume = scoreDataVolume(aggregatedData);
  const ridingSophistication = scoreRidingSophistication(aggregatedData);
  const selfAwareness = scoreSelfAwareness(aggregatedData);
  const engagement = scoreEngagement(aggregatedData);

  const score = dataVolume + ridingSophistication + selfAwareness + engagement;

  let tier;
  if (score <= 20) tier = "newcomer";
  else if (score <= 45) tier = "building";
  else if (score <= 70) tier = "developing";
  else tier = "established";

  const factors = { dataVolume, ridingSophistication, selfAwareness, engagement };
  const summary = generateSummary(tier, factors);

  return { tier, score, factors, summary };
}

/**
 * Classify data sufficiency tier for output generation quality.
 * Per GP Thinking Personalization Spec, Section 7A:
 *
 *   Tier 1 (Starter): Rider Profile + Self-Assessment + 1 Horse + 3 Debriefs
 *   Tier 2 (Informed): + Physical Assessment + 5 Debriefs + 3 Reflections + 1 Event
 *   Tier 3 (Full): 15+ Debriefs + multiple horses + 10+ Reflections + Observations + Events
 *
 * The AI explicitly acknowledges data gaps at lower tiers.
 *
 * @param {Object} aggregatedData - Full aggregated data
 * @returns {Object} Data tier classification
 */
function classifyDataTier(aggregatedData) {
  const hasProfile = aggregatedData.profile.hasProfile;
  const hasRiderAssessment = aggregatedData.selfAssessments.mental.hasAssessment;
  const hasPhysicalAssessment = aggregatedData.selfAssessments.physical.hasAssessment;
  const horseCount = aggregatedData.profile.horseCount;
  const rideCount = aggregatedData.rideHistory.totalRides;
  const reflectionCount = aggregatedData.reflections.totalReflections;
  const observationCount = aggregatedData.observations.totalObservations;
  const eventCount = aggregatedData.journey.totalEvents;

  // Check Tier 3 requirements
  const isTier3 = rideCount >= 15 &&
    horseCount >= 2 &&
    reflectionCount >= 10 &&
    observationCount >= 1 &&
    eventCount >= 2 &&
    hasProfile &&
    hasRiderAssessment &&
    hasPhysicalAssessment;

  if (isTier3) {
    return {
      dataTier: 3,
      label: "full",
      description: "Comprehensive data enables deep, personalized coaching across all outputs.",
      dataGaps: [],
    };
  }

  // Check Tier 2 requirements
  const isTier2 = rideCount >= 5 &&
    reflectionCount >= 3 &&
    eventCount >= 1 &&
    hasProfile &&
    hasRiderAssessment &&
    hasPhysicalAssessment &&
    horseCount >= 1;

  if (isTier2) {
    const gaps = [];
    if (rideCount < 15) gaps.push(`${15 - rideCount} more debriefs for full personalization`);
    if (reflectionCount < 10) gaps.push(`${10 - reflectionCount} more reflections for richer patterns`);
    if (horseCount < 2) gaps.push("Adding another horse profile would enable cross-horse insights");
    if (observationCount < 1) gaps.push("Observation entries would deepen learning pattern analysis");
    return {
      dataTier: 2,
      label: "informed",
      description: "Good data foundation. Some outputs will be more general until more data is available.",
      dataGaps: gaps,
    };
  }

  // Tier 1 — check minimum viability
  const isTier1 = hasProfile && hasRiderAssessment && horseCount >= 1 && rideCount >= 3;

  if (isTier1) {
    const gaps = [];
    if (!hasPhysicalAssessment) gaps.push("Physical assessment needed for body-specific coaching");
    if (rideCount < 5) gaps.push(`${5 - rideCount} more debriefs for pattern recognition`);
    if (reflectionCount < 3) gaps.push(`${3 - reflectionCount} more reflections for emotional patterns`);
    if (eventCount < 1) gaps.push("Journey events provide important context for coaching");
    return {
      dataTier: 1,
      label: "starter",
      description: "Minimum data available. Coaching will improve significantly as more data is added.",
      dataGaps: gaps,
    };
  }

  // Below Tier 1 — insufficient for quality output
  const gaps = [];
  if (!hasProfile) gaps.push("Rider profile is required");
  if (!hasRiderAssessment) gaps.push("Rider self-assessment is required");
  if (horseCount < 1) gaps.push("At least one horse profile is required");
  if (rideCount < 3) gaps.push(`${3 - rideCount} more debrief${3 - rideCount === 1 ? "" : "s"} needed (minimum 3)`);
  return {
    dataTier: 0,
    label: "insufficient",
    description: "Not enough data for personalized coaching yet. Complete the required forms to get started.",
    dataGaps: gaps,
  };
}

module.exports = { classifyTier, classifyDataTier };
