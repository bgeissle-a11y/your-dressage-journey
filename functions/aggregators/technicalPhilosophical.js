/**
 * Technical & Philosophical Assessment Aggregator
 *
 * Extracts the most recent non-draft technical assessment into a
 * coaching-ready summary. Pure function — no Firestore reads.
 *
 * Key computed field: Training Scale understanding-application gap
 * per pillar. Positive gap = understands more than can apply (body-learning
 * problem). Negative gap = applies better than can explain (intuitive rider).
 */

const PILLAR_KEYS = [
  "rhythm",
  "suppleness",
  "contact",
  "impulsion",
  "straightness",
  "collection",
];

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
 * @param {Object[]} technicalAssessments - Array of technical assessment documents (non-draft)
 * @returns {Object} Aggregated technical & philosophical summary
 */
function aggregateTechnicalPhilosophical(technicalAssessments) {
  const docs = technicalAssessments || [];
  const latest = getMostRecent(docs);

  if (!latest) {
    return { hasAssessment: false };
  }

  // Build training scale profile with computed gaps
  const trainingScaleProfile = {};
  for (const key of PILLAR_KEYS) {
    const pillar = latest.trainingScale?.[key] || {};
    const understanding = pillar.understanding || 5;
    const application = pillar.application || 5;
    trainingScaleProfile[key] = {
      understanding,
      application,
      gap: understanding - application,
    };
  }

  return {
    hasAssessment: true,
    updatedAt: latest.updatedAt || latest.createdAt || "",
    arenaGeometry: {
      confidenceRating: latest.arenaGeometry?.confidenceRating || 5,
      quarterlines: latest.arenaGeometry?.quarterlines || "",
      geometryUsage: latest.arenaGeometry?.geometryUsage || "",
      geometryGap: latest.arenaGeometry?.geometryGap || "",
    },
    gaitMechanics: {
      walkUnderstanding: latest.gaitMechanics?.walkUnderstanding || 5,
      trotUnderstanding: latest.gaitMechanics?.trotUnderstanding || 5,
      canterUnderstanding: latest.gaitMechanics?.canterUnderstanding || 5,
      timingConcept: latest.gaitMechanics?.timingConcept || "",
      gaitInsight: latest.gaitMechanics?.gaitInsight || "",
    },
    movements: {
      pirouetteDiff: latest.movements?.pirouetteDiff || "",
      lateralMovements: latest.movements?.lateralMovements || "",
      currentMovement: latest.movements?.currentMovement || "",
      movementQuality: latest.movements?.movementQuality || "",
      hardestConcept: latest.movements?.hardestConcept || "",
    },
    trainingScaleProfile,
    trainingScaleBiggestGap: latest.trainingScale?.biggestGap || "",
    riderSkills: {
      independentSeat: latest.riderSkills?.independentSeat?.rating || 5,
      unilateralAids: latest.riderSkills?.unilateralAids?.rating || 5,
      timingOfAid: latest.riderSkills?.timingOfAid?.rating || 5,
      prioritySkill: latest.riderSkills?.prioritySkill || "",
    },
    synthesis: {
      dressagePhilosophy: latest.synthesis?.dressagePhilosophy || "",
      knowledgeBodyGap: latest.synthesis?.knowledgeBodyGap || "",
      formativeInfluences: latest.synthesis?.formativeInfluences || "",
      burningQuestion: latest.synthesis?.burningQuestion || "",
    },
    assessmentCount: docs.length,
  };
}

module.exports = { aggregateTechnicalPhilosophical };
