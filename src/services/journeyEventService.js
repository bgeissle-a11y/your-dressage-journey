import { createBaseService } from './baseService';

const COLLECTION = 'journeyEvents';
const base = createBaseService(COLLECTION);

/**
 * Journey Event Service
 *
 * Data model (from journey-event-log.html):
 * {
 *   userId:         string - Firebase Auth UID
 *   entryMode:      string - "planned" | "unplanned"
 *   category:       string - required, brief event summary text
 *   type:           string - "competition" | "clinic" | "evaluation" | "rider" |
 *                            "horse" | "environment" | "equipment" | "financial" | "other"
 *   date:           string - required, ISO date of event
 *   description:    string - required, detailed event description
 *   magnitude:      string - "minor" | "moderate" | "major"
 *   duration:       string - "1-week" | "2-4-weeks" | "1-3-months" |
 *                            "3-6-months" | "6-plus-months" | "ongoing"
 *   status:         string - "active" | "ongoing" | "resolved"
 *   resolutionDate: string | null - optional, ISO date (when status is "resolved")
 *   prepReference:  string | null - Firestore doc ID of linked Event Preparation plan (planned events only)
 *   reflection:     object | null - post-event reflection (planned events only):
 *     { realityVsExpectation, lessonsLearned, unexpectedOutcomes, futureApproach }
 * }
 */

// Event type options (aligned with journey-event-log.html)
export const EVENT_TYPES = [
  { value: 'competition', label: 'Competition/Show' },
  { value: 'clinic', label: 'Clinic/Educational' },
  { value: 'evaluation', label: 'Evaluation/Audit' },
  { value: 'rider', label: 'Rider Health/Physical' },
  { value: 'horse', label: 'Horse Change (barn move, new horse, retirement)' },
  { value: 'environment', label: 'Environment/Support System' },
  { value: 'equipment', label: 'Equipment/Tack' },
  { value: 'financial', label: 'Financial' },
  { value: 'other', label: 'Other' }
];

// Magnitude options
export const EVENT_MAGNITUDES = [
  { value: 'minor', label: 'Minor - Small change in routine or approach' },
  { value: 'moderate', label: 'Moderate - Noticeable change requiring adaptation' },
  { value: 'major', label: 'Major - Significant change affecting multiple aspects' }
];

// Duration options
export const IMPACT_DURATIONS = [
  { value: '1-week', label: '1 week' },
  { value: '2-4-weeks', label: '2-4 weeks' },
  { value: '1-3-months', label: '1-3 months' },
  { value: '3-6-months', label: '3-6 months' },
  { value: '6-plus-months', label: '6+ months' },
  { value: 'ongoing', label: 'Ongoing/Indefinite' }
];

// Status options
export const EVENT_STATUSES = [
  { value: 'active', label: 'Active - Currently dealing with impact' },
  { value: 'ongoing', label: 'Ongoing Management - Incorporated into new normal' },
  { value: 'resolved', label: 'Resolved - Impact has ended' }
];

/**
 * Create a new journey event
 */
export async function createJourneyEvent(userId, eventData) {
  return base.create(userId, {
    entryMode: eventData.entryMode || 'unplanned',
    category: eventData.category || '',
    type: eventData.type || '',
    date: eventData.date || '',
    description: eventData.description || '',
    magnitude: eventData.magnitude || '',
    duration: eventData.duration || '',
    status: eventData.status || 'active',
    resolutionDate: eventData.resolutionDate || null,
    prepReference: eventData.prepReference || null,
    reflection: eventData.reflection || null
  });
}

/**
 * Get a single journey event
 */
export async function getJourneyEvent(docId) {
  return base.read(docId);
}

/**
 * Get all journey events for a user (newest first)
 */
export async function getAllJourneyEvents(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'date',
    orderDirection: 'desc',
    ...options
  });
}

/**
 * Get journey events by type
 */
export async function getJourneyEventsByType(userId, type) {
  return base.queryByField(userId, 'type', '==', type);
}

/**
 * Get active journey events
 */
export async function getActiveJourneyEvents(userId) {
  return base.queryByField(userId, 'status', '==', 'active');
}

/**
 * Update a journey event
 */
export async function updateJourneyEvent(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete a journey event (soft delete)
 */
export async function deleteJourneyEvent(docId) {
  return base.delete(docId);
}
