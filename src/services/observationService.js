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
 *   contextType:    string - "clinic" | "trainer-riding" | "schooling" | "show" | "video"
 *
 *   // Context-specific fields (populated based on contextType):
 *   clinicianName:  string | null - when contextType is "clinic"
 *   pairObserved:   string | null - when contextType is "clinic"
 *   horseName:      string | null - when contextType is "trainer-riding"
 *   description:    string | null - when contextType is "schooling" | "show" | "video"
 *
 *   // Repeatable observation entries (array of objects):
 *   observations: [
 *     {
 *       milestone:   string - instructional cues / riding techniques
 *       aha:         string - what resonated
 *       connection:  string - horse-rider connection notes
 *       validation:  string - concepts confirmed/validated
 *       obstacle:    string - challenges observed
 *       notes:       string - additional observations
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
  { value: 'video', label: 'Video' }
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
      contextFields.horseName = observationData.horseName || '';
      contextFields.description = null;
      break;
    case 'schooling':
    case 'show':
    case 'video':
      contextFields.clinicianName = null;
      contextFields.pairObserved = null;
      contextFields.horseName = null;
      contextFields.description = observationData.description || '';
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
    observations: (observationData.observations || []).map(obs => ({
      milestone: obs.milestone || '',
      aha: obs.aha || '',
      connection: obs.connection || '',
      validation: obs.validation || '',
      obstacle: obs.obstacle || '',
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
