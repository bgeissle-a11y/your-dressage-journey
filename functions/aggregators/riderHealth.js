/**
 * Rider Health & Wellness Log Aggregator
 *
 * Summarizes the rider's own dated health events affecting their riding —
 * appointments, injuries, recurring tightness, flare-ups, preventive care.
 *
 * This is a training journal, not a medical record. Numeric body data
 * (weight, BF%, BMR, measurements), specific medication/dosage references,
 * or clinical codes that slip through into notes must be preserved in the
 * raw data so downstream prompt rules can detect and strip them — but the
 * summary fields below are structured so the model doesn't have to parse
 * notes to find impact/status.
 *
 * Pure function — no Firestore reads.
 */

function isRecent(dateStr, days) {
  if (!dateStr) return false;
  const entryDate = new Date(dateStr + "T00:00:00");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return entryDate >= cutoff;
}

/**
 * @param {Object[]} riderHealthEntries - Array of riderHealthEntry documents
 * @returns {Object} Aggregated rider health summary
 */
function aggregateRiderHealth(riderHealthEntries) {
  if (!riderHealthEntries || !riderHealthEntries.length) {
    return {
      totalEntries: 0,
      ongoingEntries: [],
      resolvedWithin30Days: [],
      recurringBodyAreas: [],
      allEntries: [],
    };
  }

  const sorted = [...riderHealthEntries].sort(
    (a, b) => (b.date || "").localeCompare(a.date || "")
  );

  const mapEntry = (e) => ({
    date: e.date || "",
    title: e.title || "",
    issueType: e.issueType || "",
    status: e.status || "",
    impact: e.impact || "",
    bodyAreas: e.bodyAreas || [],
    professionals: e.professionals || [],
    notes: e.notes || "",
    inSaddleNotes: e.inSaddleNotes || "",
    workingOnNotes: e.workingOnNotes || "",
    resolvedDate: e.resolvedDate || null,
  });

  const ongoingEntries = sorted
    .filter((e) => e.status === "ongoing")
    .map(mapEntry);

  const resolvedWithin30Days = sorted
    .filter((e) => e.status === "resolved" && isRecent(e.resolvedDate, 30))
    .map(mapEntry);

  // Recurring body areas — any body area appearing in 3+ entries
  const bodyAreaCounts = {};
  for (const entry of sorted) {
    for (const area of entry.bodyAreas || []) {
      bodyAreaCounts[area] = (bodyAreaCounts[area] || 0) + 1;
    }
  }
  const recurringBodyAreas = Object.entries(bodyAreaCounts)
    .filter(([, count]) => count >= 3)
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);

  // Full list of entries so the prompt can do temporal correlation
  const allEntries = sorted.map(mapEntry);

  return {
    totalEntries: riderHealthEntries.length,
    ongoingEntries,
    resolvedWithin30Days,
    recurringBodyAreas,
    allEntries,
  };
}

module.exports = { aggregateRiderHealth };
