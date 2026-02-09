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

/**
 * Create a new post-ride debrief
 */
export async function createDebrief(userId, debriefData) {
  return base.create(userId, {
    rideDate: debriefData.rideDate || '',
    horseName: debriefData.horseName || '',
    sessionType: debriefData.sessionType || '',
    overallQuality: debriefData.overallQuality || 5,
    riderEnergy: debriefData.riderEnergy || '',
    horseEnergy: debriefData.horseEnergy || '',
    mentalState: debriefData.mentalState || '',
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
