/**
 * Mental Patterns Cross-Cut Aggregator
 *
 * Cross-references mental state data from debriefs, self-assessments,
 * and reflections to identify patterns the AI coaching voices need.
 * Required by Platform Outputs spec for Multi-Voice Coaching,
 * GP Thinking Layer 1, and Empathetic Coach.
 *
 * Pure function — no Firestore reads.
 */

/**
 * @param {Object} rideHistory - Output from aggregateRideHistory
 * @param {Object} selfAssessments - Output from aggregateSelfAssessments
 * @param {Object} reflections - Output from aggregateReflections
 * @returns {Object} Cross-referenced mental patterns summary
 */
function aggregateMentalPatterns(rideHistory, selfAssessments, reflections) {
  // Confidence trajectory from ride data
  const recentRides = rideHistory.recentRides || [];
  const confidenceValues = recentRides
    .filter((r) => r.confidence > 0)
    .map((r) => ({ date: r.date, value: r.confidence, mentalState: r.mentalState }));

  // Mental state → quality correlation
  const mentalStateQuality = {};
  for (const ride of recentRides) {
    if (ride.mentalState && ride.quality > 0) {
      if (!mentalStateQuality[ride.mentalState]) {
        mentalStateQuality[ride.mentalState] = { total: 0, count: 0 };
      }
      mentalStateQuality[ride.mentalState].total += ride.quality;
      mentalStateQuality[ride.mentalState].count += 1;
    }
  }
  const qualityByMentalState = {};
  for (const [state, data] of Object.entries(mentalStateQuality)) {
    qualityByMentalState[state] = Math.round((data.total / data.count) * 10) / 10;
  }

  // Best-ride conditions from high-quality rides (7+)
  const bestRides = recentRides.filter((r) => r.quality >= 7);
  const bestRideConditions = {
    count: bestRides.length,
    commonMentalStates: countValues(bestRides.map((r) => r.mentalState)),
    commonRiderEnergy: countValues(bestRides.map((r) => r.riderEnergy)),
    commonHorseEnergy: countValues(bestRides.map((r) => r.horseEnergy)),
  };

  // Struggle-ride conditions from low-quality rides (≤4)
  const struggleRides = recentRides.filter((r) => r.quality > 0 && r.quality <= 4);
  const struggleRideConditions = {
    count: struggleRides.length,
    commonMentalStates: countValues(struggleRides.map((r) => r.mentalState)),
    commonRiderEnergy: countValues(struggleRides.map((r) => r.riderEnergy)),
    commonHorseEnergy: countValues(struggleRides.map((r) => r.horseEnergy)),
  };

  // Self-assessment awareness states (if available)
  const mental = selfAssessments.mental || {};
  const awarenessProfile = mental.hasAssessment
    ? {
        bestState: mental.awarenessProfile.bestState,
        losingState: mental.awarenessProfile.losingState,
        lostState: mental.awarenessProfile.lostState,
      }
    : null;

  // Self-regulation strategies
  const selfRegulation = mental.hasAssessment
    ? mental.selfRegulation
    : null;

  // Self-rated mental game score
  const mentalGameRating = mental.hasAssessment
    ? mental.selfRatings.mentalGame
    : null;

  // Reflection-based emotional patterns
  const emotionalThemes = reflections.emotionalThemes || { feelings: [] };

  // Obstacle patterns from reflections
  const obstacleStrategies = reflections.recurringPatterns
    ? reflections.recurringPatterns.obstacleStrategies
    : [];

  // Cross-reference: does the rider's self-assessment match their ride data?
  let selfPerceptionAlignment = null;
  if (mental.hasAssessment && rideHistory.totalRides >= 5) {
    const avgConfidence = rideHistory.averages.confidence;
    const selfRatedMental = mental.selfRatings.mentalGame;
    const gap = Math.abs(avgConfidence - selfRatedMental);
    if (gap <= 1) {
      selfPerceptionAlignment = "aligned";
    } else if (avgConfidence > selfRatedMental + 1) {
      selfPerceptionAlignment = "underselling";
    } else {
      selfPerceptionAlignment = "overestimating";
    }
  }

  return {
    confidenceTrajectory: {
      trend: rideHistory.trends.confidenceTrend,
      recentValues: confidenceValues,
    },
    qualityByMentalState,
    bestRideConditions,
    struggleRideConditions,
    awarenessProfile,
    selfRegulation,
    mentalGameRating,
    selfPerceptionAlignment,
    emotionalThemes: emotionalThemes.feelings,
    obstacleStrategies,
    celebrationChallengeBalance: rideHistory.celebrationChallengeRatio
      ? rideHistory.celebrationChallengeRatio.balance
      : "balanced",
  };
}

/**
 * Count occurrences of values in an array, return sorted by frequency.
 */
function countValues(arr) {
  const counts = {};
  for (const v of arr) {
    if (v) counts[v] = (counts[v] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, count }));
}

module.exports = { aggregateMentalPatterns };
