/**
 * Observations Aggregator
 *
 * Summarizes notes from watching others ride — clinics, trainers,
 * shows, videos. Flattens nested observation entries to extract
 * learning themes. Pure function — no Firestore reads.
 */

/**
 * @param {Object[]} observations - Array of observation documents
 * @returns {Object} Aggregated observation summary
 */
function aggregateObservations(observations) {
  if (!observations || !observations.length) {
    return {
      totalObservations: 0,
      byContextType: {},
      recentObservations: [],
      learningThemes: {
        milestones: [],
        ahas: [],
        connections: [],
        validations: [],
        obstacles: [],
      },
    };
  }

  const sorted = [...observations].sort(
    (a, b) => (b.date || "").localeCompare(a.date || "")
  );

  // Count by context type
  const byContextType = {};
  for (const obs of observations) {
    if (obs.contextType) {
      byContextType[obs.contextType] = (byContextType[obs.contextType] || 0) + 1;
    }
  }

  // Recent observations — last 5 sessions with key insights
  const recentObservations = sorted.slice(0, 5).map((obs) => {
    const entries = obs.observations || [];
    const keyInsights = entries
      .flatMap((entry) => [entry.aha, entry.milestone].filter(Boolean))
      .slice(0, 5);

    const result = {
      date: obs.date || "",
      contextType: obs.contextType || "",
      entryCount: entries.length,
      keyInsights,
    };

    if (obs.clinicianName) result.clinicianName = obs.clinicianName;
    if (obs.horseName) result.horseName = obs.horseName;

    return result;
  });

  // Learning themes — flatten all nested entries, collect non-empty texts
  const themeFields = ["milestone", "aha", "connection", "validation", "obstacle"];
  const learningThemes = {};

  for (const field of themeFields) {
    const pluralKey = field === "milestone" ? "milestones"
      : field === "aha" ? "ahas"
      : field === "connection" ? "connections"
      : field === "validation" ? "validations"
      : "obstacles";

    const texts = [];
    for (const obs of sorted) {
      const entries = obs.observations || [];
      for (const entry of entries) {
        if (entry[field]) texts.push(entry[field]);
      }
    }
    learningThemes[pluralKey] = texts.slice(0, 10);
  }

  return {
    totalObservations: observations.length,
    byContextType,
    recentObservations,
    learningThemes,
  };
}

module.exports = { aggregateObservations };
