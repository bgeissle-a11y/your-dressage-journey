import { createBaseService } from './baseService';

const COLLECTION = 'technicalPhilosophicalAssessments';
const base = createBaseService(COLLECTION);

/**
 * Technical & Philosophical Self-Assessment Service
 *
 * Data model (from technical-philosophical-self-assessment.html):
 * {
 *   userId:               string  - Firebase Auth UID
 *   // Section 1: Arena Geometry
 *   arenaGeometry: {
 *     confidenceRating:   number  - 1-10 arena geometry confidence
 *     quarterlines:       string  - concept check response
 *     geometryUsage:      string  - how rider uses geometry
 *     geometryGap:        string  - most confusing aspect
 *   }
 *   // Section 2: Gait Mechanics
 *   gaitMechanics: {
 *     walkUnderstanding:  number  - 1-10
 *     trotUnderstanding:  number  - 1-10
 *     canterUnderstanding: number - 1-10
 *     timingConcept:      string  - concept check response
 *     gaitInsight:        string  - hardest timing concept
 *   }
 *   // Section 3: Movement Understanding
 *   movements: {
 *     pirouetteDiff:      string  - haunches-in vs pirouette
 *     lateralMovements:   string  - shoulder-in/travers/renvers
 *     currentMovement:    string  - movement currently working on
 *     movementQuality:    string  - what high quality looks like
 *     hardestConcept:     string  - hardest movement concept
 *   }
 *   // Section 4: Training Scale (dual sliders per pillar)
 *   trainingScale: {
 *     rhythm:       { understanding: number, application: number }
 *     suppleness:   { understanding: number, application: number }
 *     contact:      { understanding: number, application: number }
 *     impulsion:    { understanding: number, application: number }
 *     straightness: { understanding: number, application: number }
 *     collection:   { understanding: number, application: number }
 *     biggestGap:   string  - largest understanding-application gap
 *   }
 *   // Section 5: Rider Skills
 *   riderSkills: {
 *     independentSeat: { rating: number }  - 1-10
 *     unilateralAids:  { rating: number }  - 1-10
 *     timingOfAid:     { rating: number }  - 1-10
 *     prioritySkill:   string  - which skill limits effectiveness most
 *   }
 *   // Section 6: Synthesis (all optional)
 *   synthesis: {
 *     dressagePhilosophy:  string
 *     knowledgeBodyGap:    string
 *     formativeInfluences: string
 *     burningQuestion:     string
 *   }
 * }
 */

// Training Scale pillar definitions
export const TRAINING_SCALE_PILLARS = [
  {
    key: 'rhythm',
    name: '1. Rhythm',
    definition: 'Maintaining a consistent tempo and pure footfall in all three gaits.'
  },
  {
    key: 'suppleness',
    name: '2. Suppleness',
    definition: 'Mental relaxation and physical elasticity through the horse\'s topline.'
  },
  {
    key: 'contact',
    name: '3. Contact',
    definition: 'A soft, steady connection from seat and leg through to the rider\'s hand.'
  },
  {
    key: 'impulsion',
    name: '4. Impulsion',
    definition: 'The horse\'s natural energy harnessed into powerful, controlled forward movement.'
  },
  {
    key: 'straightness',
    name: '5. Straightness',
    definition: 'Aligning the horse so the hind legs follow the tracks of the front legs on all lines.'
  },
  {
    key: 'collection',
    name: '6. Collection',
    definition: 'Shifting the horse\'s center of gravity toward the hindquarters to lighten the forehand.'
  }
];

// Gait understanding scale definitions
export const GAIT_UNDERSTANDING_SCALES = [
  {
    key: 'walkUnderstanding',
    label: 'Walk',
    hint: '4-beat footfall, lateral vs. diagonal pairs, what collection does to the rhythm.',
    leftAnchor: 'Hazy',
    rightAnchor: 'Crystal clear'
  },
  {
    key: 'trotUnderstanding',
    label: 'Trot',
    hint: 'Diagonal pairs, moment of suspension, posting vs. sitting implications for the horse\'s back.',
    leftAnchor: 'Hazy',
    rightAnchor: 'Crystal clear'
  },
  {
    key: 'canterUnderstanding',
    label: 'Canter',
    hint: '3-beat footfall, lead-specific mechanics, moment of suspension, how collection shortens the stride.',
    leftAnchor: 'Hazy',
    rightAnchor: 'Crystal clear'
  }
];

// Rider skill scale definitions
export const RIDER_SKILL_SCALES = [
  {
    key: 'independentSeat',
    label: 'Independent Seat',
    description: 'The ability to remain balanced and deep in the saddle without using the reins for stability, allowing the hips to follow the horse\'s three-dimensional movement.',
    question: 'How would you rate the independence of your seat right now?',
    leftAnchor: 'I rely on the reins often',
    rightAnchor: 'Completely independent'
  },
  {
    key: 'unilateralAids',
    label: 'Unilateral Aids',
    description: 'Applying a leg or rein aid on one side without the other side mirroring the tension \u2014 each side of your body operates independently.',
    question: 'How consistently can you apply aids unilaterally \u2014 one side acting while the other stays quiet?',
    leftAnchor: 'Both sides mirror each other',
    rightAnchor: 'Each side fully independent'
  },
  {
    key: 'timingOfAid',
    label: 'Timing of the Aid',
    description: 'Applying pressure at the exact micro-second a horse\'s leg is leaving the ground to influence the flight path of that limb \u2014 the skill that separates effective communication from noise.',
    question: 'How would you rate your overall timing of aids?',
    leftAnchor: 'I apply aids without timing',
    rightAnchor: 'I feel and catch the moment'
  }
];

export async function createTechnicalAssessment(userId, data) {
  return base.create(userId, {
    // Section 1: Arena Geometry
    arenaGeometry: {
      confidenceRating: data.arenaGeometry?.confidenceRating || 5,
      quarterlines: data.arenaGeometry?.quarterlines || '',
      geometryUsage: data.arenaGeometry?.geometryUsage || '',
      geometryGap: data.arenaGeometry?.geometryGap || ''
    },
    // Section 2: Gait Mechanics
    gaitMechanics: {
      walkUnderstanding: data.gaitMechanics?.walkUnderstanding || 5,
      trotUnderstanding: data.gaitMechanics?.trotUnderstanding || 5,
      canterUnderstanding: data.gaitMechanics?.canterUnderstanding || 5,
      timingConcept: data.gaitMechanics?.timingConcept || '',
      gaitInsight: data.gaitMechanics?.gaitInsight || ''
    },
    // Section 3: Movement Understanding
    movements: {
      pirouetteDiff: data.movements?.pirouetteDiff || '',
      lateralMovements: data.movements?.lateralMovements || '',
      currentMovement: data.movements?.currentMovement || '',
      movementQuality: data.movements?.movementQuality || '',
      hardestConcept: data.movements?.hardestConcept || ''
    },
    // Section 4: Training Scale
    trainingScale: {
      rhythm: { understanding: data.trainingScale?.rhythm?.understanding || 5, application: data.trainingScale?.rhythm?.application || 5 },
      suppleness: { understanding: data.trainingScale?.suppleness?.understanding || 5, application: data.trainingScale?.suppleness?.application || 5 },
      contact: { understanding: data.trainingScale?.contact?.understanding || 5, application: data.trainingScale?.contact?.application || 5 },
      impulsion: { understanding: data.trainingScale?.impulsion?.understanding || 5, application: data.trainingScale?.impulsion?.application || 5 },
      straightness: { understanding: data.trainingScale?.straightness?.understanding || 5, application: data.trainingScale?.straightness?.application || 5 },
      collection: { understanding: data.trainingScale?.collection?.understanding || 5, application: data.trainingScale?.collection?.application || 5 },
      biggestGap: data.trainingScale?.biggestGap || ''
    },
    // Section 5: Rider Skills
    riderSkills: {
      independentSeat: { rating: data.riderSkills?.independentSeat?.rating || 5 },
      unilateralAids: { rating: data.riderSkills?.unilateralAids?.rating || 5 },
      timingOfAid: { rating: data.riderSkills?.timingOfAid?.rating || 5 },
      prioritySkill: data.riderSkills?.prioritySkill || ''
    },
    // Section 6: Synthesis (all optional)
    synthesis: {
      dressagePhilosophy: data.synthesis?.dressagePhilosophy || '',
      knowledgeBodyGap: data.synthesis?.knowledgeBodyGap || '',
      formativeInfluences: data.synthesis?.formativeInfluences || '',
      burningQuestion: data.synthesis?.burningQuestion || ''
    },
    // Meta
    isDraft: data.isDraft || false
  });
}

export async function getTechnicalAssessment(docId) {
  return base.read(docId);
}

export async function getAllTechnicalAssessments(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'createdAt',
    orderDirection: 'desc',
    ...options
  });
}

export async function updateTechnicalAssessment(docId, data) {
  return base.update(docId, data);
}

export async function deleteTechnicalAssessment(docId) {
  return base.delete(docId);
}
