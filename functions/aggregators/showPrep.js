/**
 * Show Preparation Aggregator
 *
 * Summarizes show preparation plans — upcoming shows with full detail,
 * completed show history, and competition experience.
 * Pure function — no Firestore reads.
 */

/**
 * @param {Object[]} showPreparations - Array of showPreparation documents
 * @returns {Object} Aggregated show preparation summary
 */
function aggregateShowPrep(showPreparations) {
  if (!showPreparations || !showPreparations.length) {
    return {
      totalPlans: 0,
      upcomingShows: [],
      completedShows: [],
      statusDistribution: {},
      competitionExperience: { recognizedCount: 0, schoolingCount: 0, otherCount: 0 },
    };
  }

  const today = new Date().toISOString().split("T")[0];

  // Upcoming shows — draft/active with future date, full detail
  const upcomingShows = showPreparations
    .filter(
      (p) =>
        (p.status === "draft" || p.status === "active") &&
        (p.showDateStart || "") >= today
    )
    .sort((a, b) => (a.showDateStart || "").localeCompare(b.showDateStart || ""))
    .map((p) => ({
      showName: p.showName || "",
      showDateStart: p.showDateStart || "",
      showDateEnd: p.showDateEnd || "",
      showDuration: p.showDuration || "single",
      showType: p.showType || "",
      showLocation: p.showLocation || "",
      horseName: p.horseName || "",
      currentLevel: p.currentLevel || "",
      showExperience: p.showExperience || "",
      testType: p.testType || "standard",
      testsSelected: p.testsSelected || [],
      goals: p.goals || [],
      concerns: p.concerns || [],
      status: p.status || "",
    }));

  // Completed shows — last 3, abbreviated
  const completedShows = showPreparations
    .filter((p) => p.status === "completed")
    .sort((a, b) => (b.showDateStart || "").localeCompare(a.showDateStart || ""))
    .slice(0, 3)
    .map((p) => ({
      showName: p.showName || "",
      showDateStart: p.showDateStart || "",
      showType: p.showType || "",
      horseName: p.horseName || "",
      status: "completed",
    }));

  // Status distribution
  const statusDistribution = {};
  for (const p of showPreparations) {
    if (p.status) {
      statusDistribution[p.status] = (statusDistribution[p.status] || 0) + 1;
    }
  }

  // Competition experience from completed shows
  const completed = showPreparations.filter((p) => p.status === "completed");
  let recognizedCount = 0;
  let schoolingCount = 0;
  let otherCount = 0;
  for (const p of completed) {
    if (p.showType === "recognized") recognizedCount++;
    else if (p.showType === "schooling") schoolingCount++;
    else otherCount++;
  }

  return {
    totalPlans: showPreparations.length,
    upcomingShows,
    completedShows,
    statusDistribution,
    competitionExperience: { recognizedCount, schoolingCount, otherCount },
  };
}

module.exports = { aggregateShowPrep };
