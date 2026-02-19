/**
 * Profile Aggregator
 *
 * Combines riderProfile + horseProfiles into a coaching-ready summary.
 * Pure function — no Firestore reads.
 */

/**
 * @param {Object|null} riderProfile - Single riderProfile document or null
 * @param {Object[]} horseProfiles - Array of horseProfile documents
 * @returns {Object} Aggregated profile summary
 */
function aggregateProfile(riderProfile, horseProfiles) {
  const horses = (horseProfiles || [])
    .map((h) => ({
      name: h.horseName || "",
      age: h.age || null,
      breed: h.breed || "",
      sex: h.sex || "",
      partnershipDuration: h.partnership || "",
      level: h.horseLevel || "",
      arrangement: h.arrangement || "",
      strengths: h.strengths || "",
      soundness: h.soundness || "",
      conditions: h.conditions || "",
      importantNotes: h.important || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!riderProfile) {
    return {
      rider: null,
      horses,
      horseCount: horses.length,
      hasProfile: false,
    };
  }

  return {
    rider: {
      name: riderProfile.fullName || "",
      level: riderProfile.level || "",
      ridingFrequency: riderProfile.frequency || "",
      coachEngagement: riderProfile.coach || "",
      ownership: riderProfile.ownership || [],
      whyRide: riderProfile.whyRide || "",
      enjoyMost: riderProfile.enjoyMost || "",
    },
    horses,
    horseCount: horses.length,
    hasProfile: true,
  };
}

module.exports = { aggregateProfile };
