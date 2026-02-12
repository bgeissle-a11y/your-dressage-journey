import { createBaseService } from './baseService';

const COLLECTION = 'debriefs';
const base = createBaseService(COLLECTION);

/**
 * Post-Ride Debrief Service
 *
 * Data model (from post-ride-debrief-with-intentions.html):
 * {
 *   userId:           string  - Firebase Auth UID
 *   rideDate:         string  - required, ISO date
 *   horseName:        string  - required
 *   sessionType:      string  - "lesson" | "schooling" | "conditioning" | "clinic" |
 *                                "show-schooling" | "show-test" | "other"
 *   overallQuality:   number  - required, 1-10 range
 *   riderEnergy:      string  - "low" | "moderate" | "high" | "variable"
 *   horseEnergy:      string  - "low" | "moderate" | "high" | "variable" | "tense"
 *   mentalState:      string  - "calm" | "focused" | "frustrated" | "uncertain" | "joyful" | "mixed"
 *   intentionRatings: object  - { intentionText: ratingValue(1-5) }
 *   wins:             string  - optional, personal milestones / external validation
 *   ahaRealization:   string  - optional, aha moments
 *   horseNotices:     string  - optional, connection and feel observations
 *   challenges:       string  - optional, obstacles encountered
 *   workFocus:        string  - optional, what was specifically worked on
 *   isDraft:          boolean - true if saved as draft
 * }
 */

// Session type options
export const SESSION_TYPES = [
  { value: 'lesson', label: 'Lesson' },
  { value: 'schooling', label: 'Schooling/Practice' },
  { value: 'conditioning', label: 'Conditioning/Hacking' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'show-schooling', label: 'Show Schooling' },
  { value: 'show-test', label: 'Show Test' },
  { value: 'other', label: 'Other' }
];

// Energy level options
export const RIDER_ENERGY_LEVELS = [
  { value: 'low', label: 'Low/Fatigued' },
  { value: 'moderate', label: 'Moderate/Steady' },
  { value: 'high', label: 'High/Energized' },
  { value: 'variable', label: 'Variable/Mixed' }
];

export const HORSE_ENERGY_LEVELS = [
  { value: 'low', label: 'Low/Sluggish' },
  { value: 'moderate', label: 'Moderate/Steady' },
  { value: 'high', label: 'High/Forward' },
  { value: 'variable', label: 'Variable/Inconsistent' },
  { value: 'tense', label: 'Tense/Reactive' }
];

// Mental state options
export const MENTAL_STATES = [
  { value: 'calm', label: 'Calm/Centered' },
  { value: 'focused', label: 'Focused/Determined' },
  { value: 'frustrated', label: 'Frustrated/Tense' },
  { value: 'uncertain', label: 'Uncertain/Confused' },
  { value: 'joyful', label: 'Joyful/Flowing' },
  { value: 'mixed', label: 'Mixed/Complex' }
];

// Movement/exercise tag categories
export const MOVEMENT_CATEGORIES = [
  {
    label: 'Basics & Gaits',
    tags: [
      { value: 'walk-work', label: 'Walk Work' },
      { value: 'trot-work', label: 'Trot Work' },
      { value: 'canter-work', label: 'Canter Work' },
      { value: 'transitions', label: 'Transitions' },
      { value: 'halt-salute', label: 'Halt/Salute' }
    ]
  },
  {
    label: 'Figures',
    tags: [
      { value: 'circles', label: 'Circles' },
      { value: 'serpentines', label: 'Serpentines' },
      { value: 'figure-8', label: 'Figure 8' },
      { value: 'diagonals', label: 'Diagonals' },
      { value: 'centerline', label: 'Centerline' }
    ]
  },
  {
    label: 'Lateral Work',
    tags: [
      { value: 'leg-yield', label: 'Leg Yield' },
      { value: 'shoulder-in', label: 'Shoulder-In' },
      { value: 'haunches-in', label: 'Haunches-In (Travers)' },
      { value: 'renvers', label: 'Renvers' },
      { value: 'half-pass', label: 'Half-Pass' },
      { value: 'turn-on-forehand', label: 'Turn on Forehand' }
    ]
  },
  {
    label: 'Advanced Movements',
    tags: [
      { value: 'extensions', label: 'Extensions' },
      { value: 'counter-canter', label: 'Counter Canter' },
      { value: 'simple-change', label: 'Simple Change' },
      { value: 'flying-change', label: 'Flying Change' },
      { value: 'turn-on-haunches', label: 'Turn on Haunches' },
      { value: 'pirouette', label: 'Pirouette' },
      { value: 'piaffe', label: 'Piaffe' },
      { value: 'passage', label: 'Passage' },
      { value: 'tempi-changes', label: 'Tempi Changes' }
    ]
  },
  {
    label: 'Horse/Training Focus',
    tags: [
      { value: 'rhythm', label: 'Rhythm' },
      { value: 'balance', label: 'Balance' },
      { value: 'bend-flexion', label: 'Bend & Flexion' },
      { value: 'straightness', label: 'Straightness' },
      { value: 'impulsion', label: 'Impulsion' },
      { value: 'collection', label: 'Collection' }
    ]
  },
  {
    label: 'Rider Focus',
    tags: [
      { value: 'contact', label: 'Contact/Connection' },
      { value: 'rider-position', label: 'Rider Position' },
      { value: 'breathing', label: 'Breathing' },
      { value: 'concentration-focus', label: 'Concentration/Focus' },
      { value: 'accuracy', label: 'Accuracy' },
      { value: 'test-ride-through', label: 'Test Ride-Through' }
    ]
  }
];

/**
 * Create a new post-ride debrief
 */
export async function createDebrief(userId, debriefData) {
  return base.create(userId, {
    rideDate: debriefData.rideDate || '',
    horseName: debriefData.horseName || '',
    sessionType: debriefData.sessionType || '',
    overallQuality: debriefData.overallQuality || 5,
    confidenceLevel: debriefData.confidenceLevel || 5,
    riderEffort: debriefData.riderEffort || 5,
    horseEffort: debriefData.horseEffort || 5,
    riderEnergy: debriefData.riderEnergy || '',
    horseEnergy: debriefData.horseEnergy || '',
    mentalState: debriefData.mentalState || '',
    movements: debriefData.movements || [],
    intentionRatings: debriefData.intentionRatings || {},
    wins: debriefData.wins || '',
    ahaRealization: debriefData.ahaRealization || '',
    horseNotices: debriefData.horseNotices || '',
    challenges: debriefData.challenges || '',
    workFocus: debriefData.workFocus || '',
    isDraft: debriefData.isDraft || false
  });
}

/**
 * Get a single debrief
 */
export async function getDebrief(docId) {
  return base.read(docId);
}

/**
 * Get all debriefs for a user (newest first)
 */
export async function getAllDebriefs(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'rideDate',
    orderDirection: 'desc',
    ...options
  });
}

/**
 * Get debriefs for a specific horse
 */
export async function getDebriefsByHorse(userId, horseName) {
  return base.queryByField(userId, 'horseName', '==', horseName);
}

/**
 * Get draft debriefs
 */
export async function getDraftDebriefs(userId) {
  return base.queryByField(userId, 'isDraft', '==', true);
}

/**
 * Update a debrief
 */
export async function updateDebrief(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete a debrief (soft delete)
 */
export async function deleteDebrief(docId) {
  return base.delete(docId);
}
