/**
 * Event Prep Aggregator
 *
 * Summarizes event preparation plans — upcoming events with full detail,
 * completed event history, and competition experience.
 * Pure function — no Firestore reads.
 *
 * Supports both multi-horse (v2) and single-horse (v1) document formats.
 */

/**
 * Extract horses array from a plan, supporting both old and new formats.
 */
function getHorses(p) {
  if (p.horses && Array.isArray(p.horses) && p.horses.length > 0) {
    return p.horses;
  }
  // Legacy single-horse format
  return [{
    horseName: p.horseName || "",
    currentLevel: p.currentLevel || "",
    targetLevel: p.targetLevel || "",
    experience: p.eventExperience || "",
    challenges: p.currentChallenges || "",
    progress: p.recentProgress || "",
    goals: p.goals || [],
    concerns: p.concerns || [],
  }];
}

/**
 * @param {Object[]} eventPrepPlans - Array of eventPrepPlan documents
 * @returns {Object} Aggregated event preparation summary
 */
function aggregateEventPrep(eventPrepPlans) {
  if (!eventPrepPlans || !eventPrepPlans.length) {
    return {
      totalPlans: 0,
      upcomingEvents: [],
      completedEvents: [],
      statusDistribution: {},
      competitionExperience: { showCount: 0, clinicCount: 0, otherCount: 0 },
    };
  }

  const today = new Date().toISOString().split("T")[0];

  // Upcoming events — planning/confirmed with future date, full detail
  const upcomingEvents = eventPrepPlans
    .filter(
      (p) =>
        (p.status === "planning" || p.status === "confirmed") &&
        (p.eventDate || "") >= today
    )
    .sort((a, b) => (a.eventDate || "").localeCompare(b.eventDate || ""))
    .map((p) => {
      const horses = getHorses(p);
      return {
        eventName: p.eventName || "",
        eventDate: p.eventDate || "",
        eventType: p.eventType || "",
        location: p.location || "",
        horses,
        horseNames: horses.map((h) => h.horseName).filter(Boolean).join(", "),
        status: p.status || "",
      };
    });

  // Completed events — last 3, abbreviated
  const completedEvents = eventPrepPlans
    .filter((p) => p.status === "completed")
    .sort((a, b) => (b.eventDate || "").localeCompare(a.eventDate || ""))
    .slice(0, 3)
    .map((p) => {
      const horses = getHorses(p);
      return {
        eventName: p.eventName || "",
        eventDate: p.eventDate || "",
        eventType: p.eventType || "",
        horseNames: horses.map((h) => h.horseName).filter(Boolean).join(", "),
        status: "completed",
      };
    });

  // Status distribution
  const statusDistribution = {};
  for (const p of eventPrepPlans) {
    if (p.status) {
      statusDistribution[p.status] = (statusDistribution[p.status] || 0) + 1;
    }
  }

  // Competition experience from completed events
  const completed = eventPrepPlans.filter((p) => p.status === "completed");
  let showCount = 0;
  let clinicCount = 0;
  let otherCount = 0;
  for (const p of completed) {
    if (p.eventType === "show") showCount++;
    else if (p.eventType === "clinic") clinicCount++;
    else otherCount++;
  }

  return {
    totalPlans: eventPrepPlans.length,
    upcomingEvents,
    completedEvents,
    statusDistribution,
    competitionExperience: { showCount, clinicCount, otherCount },
  };
}

module.exports = { aggregateEventPrep };
