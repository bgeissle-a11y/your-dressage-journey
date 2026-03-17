import { createBaseService } from './baseService';

const COLLECTION = 'observations';
const base = createBaseService(COLLECTION);

/**
 * Observation Service
 *
 * Data model (from observation-form.html):
 * {
 *   userId:         string - Firebase Auth UID
 *   date:           string - required, ISO date
 *   contextType:    string - "clinic" | "trainer-riding" | "schooling" | "show" | "video" | "own-video"
 *
 *   // Context-specific fields (populated based on contextType):
 *   clinicianName:  string | null - when contextType is "clinic"
 *   pairObserved:   string | null - when contextType is "clinic"
 *   clinicRiderLevel: string | null - "similar-to-me"|"above-me"|"significantly-above"|"not-sure"
 *   description:    string | null - when contextType is "schooling" | "show" | "video"
 *   showLevel:      string | null - when contextType is "show"
 *   // trainer-riding enriched fields:
 *   trainerHorseName: string | null
 *   trainerName:      string | null
 *   trainerSessionFocus: string | null
 *   trainerHorseDiff:   string | null
 *   trainerAids:        string | null
 *   // own-video fields:
 *   ownVideoDetails:  string | null
 *   ownVideoSurprise: string | null  (proprioceptive calibration data)
 *   ownVideoMoment:   string | null
 *
 *   // Repeatable observation entries (array of objects):
 *   observations: [
 *     {
 *       milestone:         string - technical insight (display label: "Technical Insight")
 *       aha:               string - what resonated
 *       connection:        string - horse-rider connection notes
 *       selfBridge:        string - "In your own riding" observation-to-self bridge
 *       validation:        string - concepts confirmed/validated
 *       obstacle:          string - challenges observed
 *       transferIntention: string - "What I'll try next ride"
 *       notes:             string - additional observations
 *     }
 *   ]
 * }
 */

// Context type options
export const CONTEXT_TYPES = [
  { value: 'clinic', label: 'Clinic' },
  { value: 'trainer-riding', label: 'Trainer Riding' },
  { value: 'schooling', label: 'Schooling' },
  { value: 'show', label: 'Show' },
  { value: 'video', label: 'Video' },
  { value: 'own-video', label: 'My Own Video / Footage' }
];

/**
 * Create a new observation
 */
export async function createObservation(userId, observationData) {
  // Build context-specific fields based on contextType
  const contextFields = {};
  switch (observationData.contextType) {
    case 'clinic':
      contextFields.clinicianName = observationData.clinicianName || '';
      contextFields.pairObserved = observationData.pairObserved || '';
      contextFields.horseName = null;
      contextFields.description = null;
      break;
    case 'trainer-riding':
      contextFields.clinicianName = null;
      contextFields.pairObserved = null;
      contextFields.horseName = null;
      contextFields.description = null;
      contextFields.trainerHorseName = observationData.trainerHorseName || '';
      contextFields.trainerName = observationData.trainerName || '';
      contextFields.trainerSessionFocus = observationData.trainerSessionFocus || '';
      contextFields.trainerHorseDiff = observationData.trainerHorseDiff || '';
      contextFields.trainerAids = observationData.trainerAids || '';
      break;
    case 'schooling':
    case 'video':
      contextFields.clinicianName = null;
      contextFields.pairObserved = null;
      contextFields.horseName = null;
      contextFields.description = observationData.description || '';
      break;
    case 'show':
      contextFields.clinicianName = null;
      contextFields.pairObserved = null;
      contextFields.horseName = null;
      contextFields.description = observationData.description || '';
      contextFields.showLevel = observationData.showLevel || '';
      break;
    case 'own-video':
      contextFields.clinicianName = null;
      contextFields.pairObserved = null;
      contextFields.horseName = null;
      contextFields.description = null;
      contextFields.ownVideoDetails = observationData.ownVideoDetails || '';
      contextFields.ownVideoSurprise = observationData.ownVideoSurprise || '';
      contextFields.ownVideoMoment = observationData.ownVideoMoment || '';
      break;
    default:
      contextFields.clinicianName = null;
      contextFields.pairObserved = null;
      contextFields.horseName = null;
      contextFields.description = null;
  }

  return base.create(userId, {
    date: observationData.date || '',
    contextType: observationData.contextType || '',
    ...contextFields,
    clinicRiderLevel: observationData.clinicRiderLevel || null,
    observations: (observationData.observations || []).map(obs => ({
      milestone: obs.milestone || '',
      aha: obs.aha || '',
      connection: obs.connection || '',
      selfBridge: obs.selfBridge || '',
      validation: obs.validation || '',
      obstacle: obs.obstacle || '',
      transferIntention: obs.transferIntention || '',
      notes: obs.notes || ''
    }))
  });
}

/**
 * Get a single observation
 */
export async function getObservation(docId) {
  return base.read(docId);
}

/**
 * Get all observations for a user (newest first)
 */
export async function getAllObservations(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'date',
    orderDirection: 'desc',
    ...options
  });
}

/**
 * Get observations by context type
 */
export async function getObservationsByContext(userId, contextType) {
  return base.queryByField(userId, 'contextType', '==', contextType);
}

/**
 * Update an observation
 */
export async function updateObservation(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete an observation (soft delete)
 */
export async function deleteObservation(docId) {
  return base.delete(docId);
}
