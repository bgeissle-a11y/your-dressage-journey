/**
 * Journey Events Aggregator
 *
 * Summarizes life events affecting the riding journey —
 * active issues, resolved history, and impact distribution.
 * Pure function — no Firestore reads.
 */

/**
 * @param {Object[]} journeyEvents - Array of journeyEvent documents
 * @returns {Object} Aggregated journey event summary
 */
function aggregateJourney(journeyEvents) {
  if (!journeyEvents || !journeyEvents.length) {
    return {
      totalEvents: 0,
      activeIssues: [],
      resolvedEvents: [],
      impactSummary: {
        byType: {},
        byMagnitude: {},
        activeCount: 0,
        ongoingCount: 0,
        resolvedCount: 0,
      },
      timeline: [],
    };
  }

  const sorted = [...journeyEvents].sort(
    (a, b) => (b.date || "").localeCompare(a.date || "")
  );

  // Active/ongoing issues — full detail for coaching context
  const activeIssues = sorted
    .filter((e) => e.status === "active" || e.status === "ongoing")
    .map((e) => ({
      category: e.category || "",
      type: e.type || "",
      date: e.date || "",
      description: e.description || "",
      magnitude: e.magnitude || "",
      duration: e.duration || "",
      status: e.status || "",
    }));

  // Resolved events — abbreviated, last 5
  const resolvedEvents = sorted
    .filter((e) => e.status === "resolved")
    .slice(0, 5)
    .map((e) => ({
      category: e.category || "",
      type: e.type || "",
      date: e.date || "",
      magnitude: e.magnitude || "",
      status: "resolved",
      resolutionDate: e.resolutionDate || null,
    }));

  // Impact summary — counts by type and magnitude
  const byType = {};
  const byMagnitude = {};
  let activeCount = 0;
  let ongoingCount = 0;
  let resolvedCount = 0;

  for (const e of journeyEvents) {
    if (e.type) byType[e.type] = (byType[e.type] || 0) + 1;
    if (e.magnitude) byMagnitude[e.magnitude] = (byMagnitude[e.magnitude] || 0) + 1;
    if (e.status === "active") activeCount++;
    else if (e.status === "ongoing") ongoingCount++;
    else if (e.status === "resolved") resolvedCount++;
  }

  // Timeline — all events, abbreviated, date-sorted desc
  const timeline = sorted.map((e) => ({
    date: e.date || "",
    category: e.category || "",
    type: e.type || "",
    magnitude: e.magnitude || "",
    status: e.status || "",
  }));

  return {
    totalEvents: journeyEvents.length,
    activeIssues,
    resolvedEvents,
    impactSummary: {
      byType,
      byMagnitude,
      activeCount,
      ongoingCount,
      resolvedCount,
    },
    timeline,
  };
}

module.exports = { aggregateJourney };
