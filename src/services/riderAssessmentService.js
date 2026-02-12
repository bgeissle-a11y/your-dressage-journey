import { createBaseService } from './baseService';

const COLLECTION = 'riderAssessments';
const base = createBaseService(COLLECTION);

/**
 * Rider Self-Assessment Service
 *
 * Data model (from rider-self-assessment.html):
 * {
 *   userId:               string  - Firebase Auth UID
 *   // Section 1: Awareness - 3 scenarios
 *   bestWhen:             string  - when rider feels at best
 *   bestFeelings:         string  - feelings when going well
 *   bestDialogue:         string  - internal dialogue at best
 *   losingWhen:           string  - when starting to lose it
 *   losingFeelings:       string  - feelings when losing it
 *   losingDialogue:       string  - internal dialogue when losing
 *   lostWhen:             string  - when rider has lost it
 *   lostFeelings:         string  - feelings when lost it
 *   lostDialogue:         string  - internal dialogue when lost
 *   // Section 2: Dressage Journey
 *   roleModels:           string  - dressage role models
 *   roleModelQualities:   string  - what admired about them
 *   biggestChallenge:     string  - biggest horse-related challenge
 *   challengeResolution:  string  - how overcame/working through it
 *   greatestPerformance:  string  - greatest performance
 *   performanceFactors:   string  - what helped achieve it
 *   // Section 3: Self-Regulation
 *   energizers:           string  - what makes more energetic
 *   relaxers:             string  - what helps relax
 *   // Section 4 & 5: Attributes (max 4 each)
 *   currentStrengths:     array   - up to 4 current strength attributes
 *   growthAreas:          array   - up to 4 desired growth attributes
 *   // Section 6: Self-Ratings (1-10)
 *   positionAndSeat:      number  - position & seat rating
 *   aidsAndCommunication: number  - aids & communication rating
 *   feelAndTiming:        number  - feel & timing rating
 *   knowledgeAndUnderstanding: number - knowledge rating
 *   mentalGame:           number  - mental game rating
 * }
 */

// Rider attributes (shared between strengths and growth areas)
export const RIDER_ATTRIBUTES = [
  'Curious',
  'Resilient',
  'Adaptable',
  'Proactive',
  'Self-directed',
  'Passionate',
  'Purpose-driven',
  'Responsive',
  'Focused',
  'Courageous',
  'Grateful',
  'Joyful',
  'Confident',
  'Committed',
  'Dedicated',
  'Composed',
  'Empathetic'
];

// Self-rating scale definitions
export const SELF_RATING_SCALES = [
  {
    key: 'positionAndSeat',
    label: 'Position & Seat',
    hint: 'Alignment, balance, ability to follow the horse\'s movement',
    leftAnchor: 'Still developing basics',
    rightAnchor: 'Secure & independent'
  },
  {
    key: 'aidsAndCommunication',
    label: 'Aids & Communication',
    hint: 'Clarity, timing, and coordination of leg, seat, and hand aids',
    leftAnchor: 'Learning to coordinate',
    rightAnchor: 'Subtle & refined'
  },
  {
    key: 'feelAndTiming',
    label: 'Feel & Timing',
    hint: 'Sensing what the horse is doing, responding in the right moment',
    leftAnchor: 'Building awareness',
    rightAnchor: 'Instinctive & precise'
  },
  {
    key: 'knowledgeAndUnderstanding',
    label: 'Knowledge & Understanding',
    hint: 'Theory, training scale concepts, understanding why exercises work',
    leftAnchor: 'Still exploring',
    rightAnchor: 'Deep & connected'
  },
  {
    key: 'mentalGame',
    label: 'Mental Game',
    hint: 'Focus, confidence, composure under pressure, resilience after setbacks',
    leftAnchor: 'Easily rattled',
    rightAnchor: 'Mentally tough'
  }
];

export async function createRiderAssessment(userId, data) {
  return base.create(userId, {
    // Awareness scenarios
    bestWhen: data.bestWhen || '',
    bestFeelings: data.bestFeelings || '',
    bestDialogue: data.bestDialogue || '',
    losingWhen: data.losingWhen || '',
    losingFeelings: data.losingFeelings || '',
    losingDialogue: data.losingDialogue || '',
    lostWhen: data.lostWhen || '',
    lostFeelings: data.lostFeelings || '',
    lostDialogue: data.lostDialogue || '',
    // Journey
    roleModels: data.roleModels || '',
    roleModelQualities: data.roleModelQualities || '',
    biggestChallenge: data.biggestChallenge || '',
    challengeResolution: data.challengeResolution || '',
    greatestPerformance: data.greatestPerformance || '',
    performanceFactors: data.performanceFactors || '',
    // Self-Regulation
    energizers: data.energizers || '',
    relaxers: data.relaxers || '',
    // Attributes
    currentStrengths: data.currentStrengths || [],
    growthAreas: data.growthAreas || [],
    // Self-Ratings
    positionAndSeat: data.positionAndSeat || 5,
    aidsAndCommunication: data.aidsAndCommunication || 5,
    feelAndTiming: data.feelAndTiming || 5,
    knowledgeAndUnderstanding: data.knowledgeAndUnderstanding || 5,
    mentalGame: data.mentalGame || 5
  });
}

export async function getRiderAssessment(docId) {
  return base.read(docId);
}

export async function getAllRiderAssessments(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'createdAt',
    orderDirection: 'desc',
    ...options
  });
}

export async function updateRiderAssessment(docId, data) {
  return base.update(docId, data);
}

export async function deleteRiderAssessment(docId) {
  return base.delete(docId);
}
