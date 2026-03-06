/**
 * Self-Assessments Aggregator
 *
 * Combines physicalAssessments + riderAssessments + technicalPhilosophicalAssessments
 * into a coaching-ready self-awareness summary. Uses the most recent non-draft entry
 * for each type. Pure function — no Firestore reads.
 */

const { aggregateTechnicalPhilosophical } = require("./technicalPhilosophical");

/**
 * Extract the most recent document by createdAt.
 */
function getMostRecent(docs) {
  if (!docs || !docs.length) return null;
  return [...docs].sort(
    (a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")
  )[0];
}

/**
 * @param {Object[]} physicalAssessments - Array of physical assessment documents (non-draft)
 * @param {Object[]} riderAssessments - Array of rider assessment documents (non-draft)
 * @param {Object[]} technicalAssessments - Array of technical/philosophical assessment documents (non-draft)
 * @returns {Object} Aggregated self-assessment summary
 */
function aggregateSelfAssessments(physicalAssessments, riderAssessments, technicalAssessments) {
  const physicals = physicalAssessments || [];
  const riders = riderAssessments || [];
  const technicals = technicalAssessments || [];

  // Physical assessment — most recent only
  const latestPhysical = getMostRecent(physicals);
  let physical;

  if (latestPhysical) {
    physical = {
      hasAssessment: true,
      occupation: latestPhysical.occupation || "",
      challenges: latestPhysical.physicalChallenges || "",
      strengths: latestPhysical.physicalStrengths || "",
      asymmetries: latestPhysical.asymmetries || "",
      coachCues: latestPhysical.coachCues || "",
      ptStatus: latestPhysical.ptStatus || "",
      ptType: latestPhysical.ptType || "",
      ptCues: latestPhysical.ptCues || "",
      kinestheticLevel: latestPhysical.kinestheticLevel || 5,
      tensionPattern: {
        daily: latestPhysical.dailyTensionAreas || [],
        riding: latestPhysical.ridingTensionAreas || [],
        comparison: latestPhysical.tensionComparison || "",
      },
      pelvicClock: latestPhysical.bodyMapping?.pelvicClock || null,
    };
  } else {
    physical = { hasAssessment: false };
  }

  // Rider assessment — most recent only
  const latestRider = getMostRecent(riders);
  let mental;

  if (latestRider) {
    mental = {
      hasAssessment: true,
      awarenessProfile: {
        bestState: {
          when: latestRider.bestWhen || "",
          feelings: latestRider.bestFeelings || "",
          dialogue: latestRider.bestDialogue || "",
        },
        losingState: {
          when: latestRider.losingWhen || "",
          feelings: latestRider.losingFeelings || "",
          dialogue: latestRider.losingDialogue || "",
        },
        lostState: {
          when: latestRider.lostWhen || "",
          feelings: latestRider.lostFeelings || "",
          dialogue: latestRider.lostDialogue || "",
        },
      },
      journey: {
        roleModels: latestRider.roleModels || "",
        roleModelQualities: latestRider.roleModelQualities || "",
        biggestChallenge: latestRider.biggestChallenge || "",
        challengeResolution: latestRider.challengeResolution || "",
        greatestPerformance: latestRider.greatestPerformance || "",
        performanceFactors: latestRider.performanceFactors || "",
      },
      selfRegulation: {
        energizers: latestRider.energizers || "",
        relaxers: latestRider.relaxers || "",
      },
      attributes: {
        currentStrengths: latestRider.currentStrengths || [],
        growthAreas: latestRider.growthAreas || [],
      },
      selfRatings: {
        positionAndSeat: latestRider.positionAndSeat || 5,
        aidsAndCommunication: latestRider.aidsAndCommunication || 5,
        feelAndTiming: latestRider.feelAndTiming || 5,
        knowledgeAndUnderstanding: latestRider.knowledgeAndUnderstanding || 5,
        mentalGame: latestRider.mentalGame || 5,
      },
    };
  } else {
    mental = { hasAssessment: false };
  }

  // Technical & philosophical assessment
  const technical = aggregateTechnicalPhilosophical(technicals);

  return {
    physical,
    mental,
    technical,
    assessmentCount: {
      physical: physicals.length,
      rider: riders.length,
      technical: technicals.length,
    },
  };
}

module.exports = { aggregateSelfAssessments };
