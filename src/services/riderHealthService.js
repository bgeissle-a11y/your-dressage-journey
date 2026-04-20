import { createBaseService } from './baseService';

const COLLECTION = 'riderHealthEntries';
const base = createBaseService(COLLECTION);

/**
 * Rider Health & Wellness Log Service
 *
 * A training journal for the rider's own body — not a medical record.
 * Riders log dated events that are currently affecting their riding:
 * appointments, injuries, recurring tightness, flare-ups, preventive care.
 *
 * Data model:
 * {
 *   userId:          string - Firebase Auth UID
 *   title:           string - required, short rider-written title
 *   date:            string - required, ISO date (e.g. "2026-04-18")
 *   issueType:       string - required, one of "maintenance" | "concern" | "injury"
 *   status:          string - "ongoing" | "resolved" (default "ongoing")
 *   impact:          string - required, one of "minor" | "moderate" | "significant" | "sidelined"
 *   notes:           string - optional, "what's going on"
 *   bodyAreas:       string[] - optional, from RIDER_BODY_AREAS
 *   professionals:   string[] - optional, from RIDER_PROFESSIONAL_TYPES
 *   inSaddleNotes:   string - optional, "what you're noticing in the saddle"
 *   workingOnNotes:  string - optional, "what you're working on"
 *   resolvedDate:    string | null - ISO date when marked resolved
 * }
 */

export const RIDER_ISSUE_TYPES = [
  { value: 'maintenance', label: 'Maintenance', icon: '\uD83C\uDF3F', description: 'Routine, preventive' },
  { value: 'concern',     label: 'Concern',     icon: '\uD83D\uDC41', description: 'Monitor over time' },
  { value: 'injury',      label: 'Injury',      icon: '\uD83E\uDE79', description: 'Acute event' }
];

export const RIDER_IMPACT_LEVELS = [
  { value: 'minor',       label: 'Minor' },
  { value: 'moderate',    label: 'Moderate' },
  { value: 'significant', label: 'Significant' },
  { value: 'sidelined',   label: 'Not riding' }
];

export const RIDER_HEALTH_STATUSES = [
  { value: 'ongoing',  label: 'Ongoing' },
  { value: 'resolved', label: 'Resolved' }
];

export const RIDER_BODY_AREAS = [
  'Head / Neck',
  'Shoulders',
  'Arms / Elbows / Wrists / Hands',
  'Upper back',
  'Lower back',
  'Core / Abdomen',
  'Hips',
  'Pelvis / SI joint',
  'Glutes',
  'Thighs / Hamstrings',
  'Knees',
  'Calves / Ankles / Feet',
  'Whole body / Systemic'
];

export const RIDER_PROFESSIONAL_TYPES = [
  'Physician / Doctor',
  'Physical Therapist',
  'Chiropractor',
  'Massage Therapist',
  'Bodyworker',
  'Acupuncturist',
  'Yoga / Pilates Instructor',
  'Personal Trainer',
  'Other'
];

export const RIDER_ISSUE_LABELS = Object.fromEntries(
  RIDER_ISSUE_TYPES.map(t => [t.value, t.label])
);

export const RIDER_IMPACT_LABELS = Object.fromEntries(
  RIDER_IMPACT_LEVELS.map(i => [i.value, i.label])
);

/**
 * Create a new rider health entry
 */
export async function createRiderHealthEntry(userId, entryData) {
  return base.create(userId, {
    title: entryData.title || '',
    date: entryData.date || '',
    issueType: entryData.issueType || '',
    status: entryData.status || 'ongoing',
    impact: entryData.impact || '',
    notes: entryData.notes || '',
    bodyAreas: entryData.bodyAreas || [],
    professionals: entryData.professionals || [],
    inSaddleNotes: entryData.inSaddleNotes || '',
    workingOnNotes: entryData.workingOnNotes || '',
    resolvedDate: entryData.resolvedDate || null
  });
}

/**
 * Get a single rider health entry
 */
export async function getRiderHealthEntry(docId) {
  return base.read(docId);
}

/**
 * Get all rider health entries for a user, sorted by date desc
 */
export async function getAllRiderHealthEntries(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'date',
    orderDirection: 'desc',
    ...options
  });
}

/**
 * Update a rider health entry
 */
export async function updateRiderHealthEntry(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete a rider health entry (soft delete)
 */
export async function deleteRiderHealthEntry(docId) {
  return base.delete(docId);
}
