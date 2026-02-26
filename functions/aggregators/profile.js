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
    .map((h) => {
      // Compute age: prefer birthYear calculation, fall back to approxAge, then legacy age
      let computedAge = h.age || null;
      if (h.birthYear) {
        computedAge = new Date().getFullYear() - parseInt(h.birthYear, 10);
      } else if (h.approxAge) {
        computedAge = parseInt(h.approxAge, 10) || null;
      }

      // Compute partnership duration: prefer month/year, fall back to legacy string
      let partnershipDuration = h.partnership || "";
      if (h.partnershipMonth && h.partnershipYear) {
        const now = new Date();
        const start = new Date(parseInt(h.partnershipYear), parseInt(h.partnershipMonth) - 1);
        const totalMonths =
          (now.getFullYear() - start.getFullYear()) * 12 +
          (now.getMonth() - start.getMonth());
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        const parts = [];
        if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
        if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);
        partnershipDuration = parts.join(", ") || "less than a month";
      } else if (h.partnershipYear) {
        partnershipDuration = `since ${h.partnershipYear}`;
      }

      return {
        name: h.horseName || "",
        age: computedAge,
        breed: h.breed || "",
        sex: h.sex || "",
        partnershipDuration,
        level: h.horseLevel || "",
        arrangement: h.arrangement || "",
        strengths: h.strengths || "",
        soundness: h.soundness || "",
        conditions: h.conditions || "",
        importantNotes: h.important || "",
        asymmetry: h.asymmetry || null,
      };
    })
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
      trainingTime: riderProfile.trainingTime || "",
      compLevel: riderProfile.compLevel || "",
      recentScores: riderProfile.recentScores || "",
      ownership: riderProfile.ownership || [],
      whyRide: riderProfile.whyRide || "",
      enjoyMost: riderProfile.enjoyMost || "",
      longTermGoals: riderProfile.longTermGoals || "",
      learningStyle: riderProfile.learningStyle || [],
    },
    horses,
    horseCount: horses.length,
    hasProfile: true,
    // Top-level aliases for promptBuilder direct access
    goals: riderProfile.longTermGoals || "",
    learningStyle: riderProfile.learningStyle || [],
  };
}

module.exports = { aggregateProfile };
