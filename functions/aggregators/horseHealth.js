/**
 * Horse Health & Soundness Aggregator
 *
 * Summarizes per-horse health records — ongoing concerns,
 * recent emergencies, maintenance patterns, and outstanding next steps.
 * Pure function — no Firestore reads.
 */

/**
 * Check if a date string is within the last N days.
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @param {number} days - Number of days to look back
 * @returns {boolean}
 */
function isRecent(dateStr, days) {
  if (!dateStr) return false;
  const entryDate = new Date(dateStr + "T00:00:00");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return entryDate >= cutoff;
}

/**
 * @param {Object[]} healthEntries - Array of horseHealthEntry documents
 * @returns {Object} Aggregated horse health summary
 */
function aggregateHorseHealth(healthEntries) {
  if (!healthEntries || !healthEntries.length) {
    return {
      totalEntries: 0,
      ongoingConcerns: [],
      recentEmergencies: [],
      maintenanceCount: 0,
      resolvedHistory: [],
      outstandingNextSteps: [],
      perHorseSummary: {},
    };
  }

  const sorted = [...healthEntries].sort(
    (a, b) => (b.date || "").localeCompare(a.date || "")
  );

  // Ongoing concerns (not maintenance) — full detail for coaching context
  const ongoingConcerns = sorted
    .filter((e) => e.status === "ongoing" && e.issueType !== "maintenance")
    .map((e) => ({
      horseName: e.horseName || "",
      date: e.date || "",
      issueType: e.issueType || "",
      title: e.title || "",
      notes: e.notes || "",
      professionals: e.professionals || [],
      nextSteps: e.nextSteps || "",
    }));

  // Recent emergencies (within last 90 days)
  const recentEmergencies = sorted
    .filter((e) => e.issueType === "emergency" && isRecent(e.date, 90))
    .map((e) => ({
      horseName: e.horseName || "",
      date: e.date || "",
      title: e.title || "",
      status: e.status || "",
      results: e.results || "",
    }));

  // Maintenance count
  const maintenanceCount = healthEntries.filter(
    (e) => e.issueType === "maintenance"
  ).length;

  // Resolved history — abbreviated, last 5
  const resolvedHistory = sorted
    .filter((e) => e.status === "resolved")
    .slice(0, 5)
    .map((e) => ({
      horseName: e.horseName || "",
      date: e.date || "",
      issueType: e.issueType || "",
      title: e.title || "",
      resolvedDate: e.resolvedDate || null,
    }));

  // Outstanding next steps (ongoing entries that have nextSteps text)
  const outstandingNextSteps = sorted
    .filter((e) => e.status === "ongoing" && e.nextSteps)
    .map((e) => ({
      horseName: e.horseName || "",
      date: e.date || "",
      title: e.title || "",
      nextSteps: e.nextSteps,
    }));

  // Per-horse summary
  const byHorse = {};
  for (const entry of healthEntries) {
    const name = entry.horseName || "Unknown";
    if (!byHorse[name]) byHorse[name] = [];
    byHorse[name].push(entry);
  }

  const perHorseSummary = {};
  for (const [horseName, entries] of Object.entries(byHorse)) {
    const ongoing = entries.filter(
      (e) => e.status === "ongoing" && e.issueType !== "maintenance"
    );
    const emergencies = entries.filter((e) => e.issueType === "emergency");
    const maintenance = entries.filter((e) => e.issueType === "maintenance");
    const resolved = entries.filter((e) => e.status === "resolved");

    const parts = [];
    if (ongoing.length) {
      parts.push(
        `ONGOING: ${ongoing.map((e) => `${e.title} (${e.date})`).join(", ")}`
      );
    }
    if (emergencies.length) {
      parts.push(
        `EMERGENCIES (all time): ${emergencies.map((e) => `${e.title} — ${e.status}`).join(", ")}`
      );
    }
    if (maintenance.length) {
      parts.push(`Maintenance visits logged: ${maintenance.length}`);
    }
    if (resolved.length) {
      parts.push(`Resolved issues: ${resolved.length}`);
    }

    perHorseSummary[horseName] = {
      total: entries.length,
      ongoingCount: ongoing.length,
      emergencyCount: emergencies.length,
      maintenanceCount: maintenance.length,
      resolvedCount: resolved.length,
      summary: parts.join(" | ") || "No health records.",
    };
  }

  return {
    totalEntries: healthEntries.length,
    ongoingConcerns,
    recentEmergencies,
    maintenanceCount,
    resolvedHistory,
    outstandingNextSteps,
    perHorseSummary,
  };
}

module.exports = { aggregateHorseHealth };
