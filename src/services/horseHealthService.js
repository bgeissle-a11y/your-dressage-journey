import { createBaseService } from './baseService';

const COLLECTION = 'horseHealthEntries';
const base = createBaseService(COLLECTION);

/**
 * Horse Health & Soundness Service
 *
 * Data model:
 * {
 *   userId:        string - Firebase Auth UID
 *   horseName:     string - required
 *   date:          string - ISO date (e.g. "2026-03-01")
 *   issueType:     string - "maintenance" | "concern" | "emergency"
 *   title:         string - short description of issue/condition
 *   notes:         string - details / what was observed
 *   professionals: string[] - who was involved
 *   results:       string - what happened / findings
 *   nextSteps:     string - follow-up actions
 *   status:        string - "ongoing" | "resolved"
 *   resolvedDate:  string | null - ISO date when resolved
 * }
 */

// Issue type options
export const ISSUE_TYPES = [
  { value: 'maintenance', label: 'Maintenance', icon: '\uD83D\uDD27', description: 'Routine care — chiro, massage, farrier, PPE check-in' },
  { value: 'concern', label: 'Concern', icon: '\uD83D\uDC40', description: 'Something worth monitoring — mild lameness, behavior shift, subtle change' },
  { value: 'emergency', label: 'Emergency', icon: '\uD83D\uDEA8', description: 'Acute or serious — colic, injury, significant lameness episode' }
];

// Professional types
export const PROFESSIONAL_TYPES = [
  { value: 'Veterinarian', label: 'Veterinarian' },
  { value: 'Body Worker', label: 'Body Worker' },
  { value: 'Saddle Fitter', label: 'Saddle Fitter' },
  { value: 'Farrier', label: 'Farrier' },
  { value: 'Trainer', label: 'Trainer' },
  { value: 'Self-observed', label: 'Self-observed' },
  { value: 'Other', label: 'Other' }
];

// Status options
export const HEALTH_STATUSES = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'resolved', label: 'Resolved' }
];

/**
 * Create a new health entry
 */
export async function createHealthEntry(userId, entryData) {
  return base.create(userId, {
    horseName: entryData.horseName || '',
    date: entryData.date || '',
    issueType: entryData.issueType || '',
    title: entryData.title || '',
    notes: entryData.notes || '',
    professionals: entryData.professionals || [],
    results: entryData.results || '',
    nextSteps: entryData.nextSteps || '',
    status: entryData.status || 'ongoing',
    resolvedDate: entryData.resolvedDate || null
  });
}

/**
 * Get a single health entry
 */
export async function getHealthEntry(docId) {
  return base.read(docId);
}

/**
 * Get all health entries for a user (newest first)
 */
export async function getAllHealthEntries(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'date',
    orderDirection: 'desc',
    ...options
  });
}

/**
 * Get ongoing health entries for a user
 */
export async function getOngoingHealthEntries(userId) {
  return base.queryByField(userId, 'status', '==', 'ongoing');
}

/**
 * Get health entries for a specific horse
 */
export async function getHealthEntriesByHorse(userId, horseName) {
  return base.queryByField(userId, 'horseName', '==', horseName);
}

/**
 * Update a health entry
 */
export async function updateHealthEntry(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete a health entry (soft delete)
 */
export async function deleteHealthEntry(docId) {
  return base.delete(docId);
}
