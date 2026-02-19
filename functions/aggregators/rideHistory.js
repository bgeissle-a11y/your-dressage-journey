/**
 * Ride History Aggregator
 *
 * Most complex aggregator. Computes averages, trends, distributions,
 * movement coverage with sophistication level, riding streak, and
 * per-horse summaries from debrief data.
 * Pure function — no Firestore reads.
 */

// Movement categories ported from src/services/debriefService.js (CommonJS)
const MOVEMENT_CATEGORIES = [
  {
    label: "Basics & Gaits",
    tags: ["walk-work", "trot-work", "canter-work", "transitions", "halt-salute"],
  },
  {
    label: "Figures",
    tags: ["circles", "serpentines", "figure-8", "diagonals", "centerline"],
  },
  {
    label: "Lateral Work",
    tags: ["leg-yield", "shoulder-in", "haunches-in", "renvers", "half-pass", "turn-on-forehand"],
  },
  {
    label: "Advanced Movements",
    tags: ["extensions", "counter-canter", "simple-change", "flying-change", "turn-on-haunches", "pirouette", "piaffe", "passage", "tempi-changes"],
  },
  {
    label: "Horse/Training Focus",
    tags: ["rhythm", "balance", "bend-flexion", "straightness", "impulsion", "collection"],
  },
  {
    label: "Rider Focus",
    tags: ["contact", "rider-position", "breathing", "concentration-focus", "accuracy", "test-ride-through"],
  },
];

// Build reverse lookup: tag → category label
const TAG_TO_CATEGORY = {};
for (const cat of MOVEMENT_CATEGORIES) {
  for (const tag of cat.tags) {
    TAG_TO_CATEGORY[tag] = cat.label;
  }
}

const ELITE_MOVEMENTS = new Set(["piaffe", "passage", "tempi-changes"]);

/**
 * Compute weekly riding streak.
 * Ported from src/hooks/useDashboardData.js computeStreak().
 * A "week" runs Mon–Sun. Counts consecutive weeks with at least one ride.
 */
function computeStreak(debriefs) {
  if (!debriefs.length) return 0;

  const dates = debriefs
    .map((d) => d.rideDate)
    .filter(Boolean)
    .map((d) => new Date(d + "T00:00:00"));

  if (!dates.length) return 0;

  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  const rideWeeks = new Set(dates.map(getMonday));
  const now = new Date();
  let weekStart = getMonday(now);
  let streak = 0;

  // If current week has no rides, start from the most recent week that does
  if (!rideWeeks.has(weekStart)) {
    const sorted = [...rideWeeks].sort((a, b) => b - a);
    if (sorted.length === 0) return 0;
    weekStart = sorted[0];
  }

  while (rideWeeks.has(weekStart)) {
    streak++;
    weekStart -= 7 * 24 * 60 * 60 * 1000;
  }

  return streak;
}

/**
 * Compute average of a numeric field across documents.
 */
function avg(docs, field) {
  const values = docs.map((d) => d[field]).filter((v) => typeof v === "number");
  if (!values.length) return 0;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

/**
 * Count occurrences of each value in a field.
 */
function distribution(docs, field) {
  const counts = {};
  for (const d of docs) {
    const val = d[field];
    if (val) counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

/**
 * Classify movement sophistication based on which categories appear.
 */
function classifySophistication(movementSet) {
  const hasElite = [...movementSet].some((m) => ELITE_MOVEMENTS.has(m));
  if (hasElite) return "elite";

  const categories = new Set();
  for (const m of movementSet) {
    if (TAG_TO_CATEGORY[m]) categories.add(TAG_TO_CATEGORY[m]);
  }

  const hasAdvanced = categories.has("Advanced Movements");
  const hasLateralOrTraining = categories.has("Lateral Work") || categories.has("Horse/Training Focus");

  if (hasAdvanced) return "advanced";
  if (hasLateralOrTraining) return "intermediate";
  return "basic";
}

/**
 * Determine trend direction by comparing recent vs older averages.
 */
function computeTrend(recentAvg, olderAvg) {
  const diff = recentAvg - olderAvg;
  if (diff >= 0.5) return "improving";
  if (diff <= -0.5) return "declining";
  return "stable";
}

/**
 * @param {Object[]} debriefs - Array of debrief documents (non-draft only)
 * @returns {Object} Aggregated ride history summary
 */
function aggregateRideHistory(debriefs) {
  if (!debriefs || !debriefs.length) {
    return {
      totalRides: 0,
      dateRange: { earliest: null, latest: null },
      recentRides: [],
      averages: { overallQuality: 0, confidence: 0, riderEffort: 0, horseEffort: 0 },
      trends: {
        qualityTrend: "insufficient-data",
        confidenceTrend: "insufficient-data",
        recentAvgQuality: 0,
        olderAvgQuality: 0,
      },
      sessionTypeDistribution: {},
      riderEnergyDistribution: {},
      horseEnergyDistribution: {},
      mentalStateDistribution: {},
      movementCoverage: {
        allMovements: [],
        totalUnique: 0,
        byCategory: {},
        mostPracticed: [],
        sophisticationLevel: "basic",
      },
      ridingStreak: 0,
      perHorseSummary: {},
      celebrationChallengeRatio: {
        winsContentPct: 0,
        challengesContentPct: 0,
        ridesWithWins: 0,
        ridesWithChallenges: 0,
        balance: "balanced",
      },
      recurringChallenges: [],
    };
  }

  // Sort by rideDate descending
  const sorted = [...debriefs].sort(
    (a, b) => (b.rideDate || "").localeCompare(a.rideDate || "")
  );

  const dates = sorted.map((d) => d.rideDate).filter(Boolean);

  // Date range
  const dateRange = {
    earliest: dates[dates.length - 1] || null,
    latest: dates[0] || null,
  };

  // Recent rides — last 10 with full qualitative data
  const recentRides = sorted.slice(0, 10).map((d) => ({
    date: d.rideDate || "",
    horse: d.horseName || "",
    sessionType: d.sessionType || "",
    quality: d.overallQuality || 0,
    confidence: d.confidenceLevel || 0,
    riderEffort: d.riderEffort || 0,
    horseEffort: d.horseEffort || 0,
    riderEnergy: d.riderEnergy || "",
    horseEnergy: d.horseEnergy || "",
    mentalState: d.mentalState || "",
    movements: d.movements || [],
    wins: d.wins || "",
    challenges: d.challenges || "",
    ahaRealization: d.ahaRealization || "",
    horseNotices: d.horseNotices || "",
    workFocus: d.workFocus || "",
  }));

  // Averages across all rides
  const averages = {
    overallQuality: avg(debriefs, "overallQuality"),
    confidence: avg(debriefs, "confidenceLevel"),
    riderEffort: avg(debriefs, "riderEffort"),
    horseEffort: avg(debriefs, "horseEffort"),
  };

  // Trends — compare last 10 vs prior 10
  let trends;
  if (sorted.length < 5) {
    trends = {
      qualityTrend: "insufficient-data",
      confidenceTrend: "insufficient-data",
      recentAvgQuality: averages.overallQuality,
      olderAvgQuality: 0,
    };
  } else {
    const recent10 = sorted.slice(0, 10);
    const older = sorted.slice(10, 20).length > 0 ? sorted.slice(10, 20) : sorted.slice(10);
    const recentAvgQuality = avg(recent10, "overallQuality");
    const olderAvgQuality = older.length > 0 ? avg(older, "overallQuality") : recentAvgQuality;
    const recentAvgConf = avg(recent10, "confidenceLevel");
    const olderAvgConf = older.length > 0 ? avg(older, "confidenceLevel") : recentAvgConf;

    trends = {
      qualityTrend: older.length > 0 ? computeTrend(recentAvgQuality, olderAvgQuality) : "insufficient-data",
      confidenceTrend: older.length > 0 ? computeTrend(recentAvgConf, olderAvgConf) : "insufficient-data",
      recentAvgQuality,
      olderAvgQuality,
    };
  }

  // Distributions
  const sessionTypeDistribution = distribution(debriefs, "sessionType");
  const riderEnergyDistribution = distribution(debriefs, "riderEnergy");
  const horseEnergyDistribution = distribution(debriefs, "horseEnergy");
  const mentalStateDistribution = distribution(debriefs, "mentalState");

  // Movement coverage
  const movementCounts = {};
  for (const d of debriefs) {
    for (const m of (d.movements || [])) {
      movementCounts[m] = (movementCounts[m] || 0) + 1;
    }
  }

  const allMovements = Object.keys(movementCounts);
  const movementSet = new Set(allMovements);

  // Group by category
  const byCategory = {};
  for (const cat of MOVEMENT_CATEGORIES) {
    const catMovements = cat.tags.filter((t) => movementSet.has(t));
    if (catMovements.length > 0) {
      byCategory[cat.label] = catMovements;
    }
  }

  // Most practiced — top 5
  const mostPracticed = Object.entries(movementCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([movement, count]) => ({ movement, count }));

  const movementCoverage = {
    allMovements,
    totalUnique: allMovements.length,
    byCategory,
    mostPracticed,
    sophisticationLevel: classifySophistication(movementSet),
  };

  // Riding streak
  const ridingStreak = computeStreak(debriefs);

  // Celebration vs Challenge ratio (wins vs challenges content analysis)
  let totalWinsLength = 0;
  let totalChallengesLength = 0;
  let ridesWithWins = 0;
  let ridesWithChallenges = 0;
  for (const d of debriefs) {
    const winsLen = (d.wins || "").trim().length;
    const challLen = (d.challenges || "").trim().length;
    totalWinsLength += winsLen;
    totalChallengesLength += challLen;
    if (winsLen > 0) ridesWithWins++;
    if (challLen > 0) ridesWithChallenges++;
  }
  const totalContent = totalWinsLength + totalChallengesLength;
  const celebrationChallengeRatio = {
    winsContentPct: totalContent > 0 ? Math.round((totalWinsLength / totalContent) * 100) : 0,
    challengesContentPct: totalContent > 0 ? Math.round((totalChallengesLength / totalContent) * 100) : 0,
    ridesWithWins,
    ridesWithChallenges,
    balance: totalWinsLength >= totalChallengesLength ? "celebration-leaning" :
      totalChallengesLength > totalWinsLength * 2 ? "challenge-heavy" : "balanced",
  };

  // Recurring challenges — extract from challenge text across all rides
  const challengeTexts = debriefs
    .map((d) => d.challenges)
    .filter((t) => t && t.trim().length > 0);
  const recurringChallenges = challengeTexts.slice(0, 10);

  // Per-horse summary
  const perHorseSummary = {};
  const horseGroups = {};
  for (const d of debriefs) {
    const name = d.horseName || "Unknown";
    if (!horseGroups[name]) horseGroups[name] = [];
    horseGroups[name].push(d);
  }

  for (const [name, rides] of Object.entries(horseGroups)) {
    const horseMvCounts = {};
    for (const d of rides) {
      for (const m of (d.movements || [])) {
        horseMvCounts[m] = (horseMvCounts[m] || 0) + 1;
      }
    }
    const topMovements = Object.entries(horseMvCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([m]) => m);

    const horseMentalStates = distribution(rides, "mentalState");

    perHorseSummary[name] = {
      rideCount: rides.length,
      avgQuality: avg(rides, "overallQuality"),
      avgConfidence: avg(rides, "confidenceLevel"),
      avgRiderEffort: avg(rides, "riderEffort"),
      avgHorseEffort: avg(rides, "horseEffort"),
      topMovements,
      mentalStateDistribution: horseMentalStates,
    };
  }

  return {
    totalRides: debriefs.length,
    dateRange,
    recentRides,
    averages,
    trends,
    sessionTypeDistribution,
    riderEnergyDistribution,
    horseEnergyDistribution,
    mentalStateDistribution,
    movementCoverage,
    ridingStreak,
    perHorseSummary,
    celebrationChallengeRatio,
    recurringChallenges,
  };
}

module.exports = { aggregateRideHistory, MOVEMENT_CATEGORIES };
