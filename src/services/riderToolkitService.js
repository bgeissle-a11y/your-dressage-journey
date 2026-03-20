import { createBaseService } from './baseService';

const COLLECTION = 'riderToolkitEntries';
const base = createBaseService(COLLECTION);

/**
 * Rider's Toolkit Service
 *
 * Data model:
 * {
 *   userId:           string - Firebase Auth UID
 *   name:             string - required, display name of the entry
 *   category:         string - required, one of TOOLKIT_CATEGORIES values
 *   date:             string - ISO date (e.g. "2026-03-19")
 *   description:      string - optional, free-text notes
 *   ridingConnection: string - optional, how this supports riding
 *   bodyTags:         string[] - optional, from BODY_TAGS list
 *   status:           string - one of TOOLKIT_STATUSES values
 *   source:           string - optional, trainer/book/podcast/etc.
 *   followupNotes:    string - optional, what happened when tried
 * }
 */

export const TOOLKIT_CATEGORIES = [
  { value: 'movement', label: 'Movement & Bodywork', color: '#7B9E8A' },
  { value: 'strength', label: 'Strength & Conditioning', color: '#8A6E9E' },
  { value: 'nutrition', label: 'Nutrition & Supplements', color: '#C68B5C' },
  { value: 'recovery', label: 'Recovery & Rest', color: '#5C8BA8' },
  { value: 'mental', label: 'Mindfulness & Mental', color: '#9E7B8A' },
  { value: 'research', label: 'Reading & Learning', color: '#8B8355' },
  { value: 'other', label: 'Other', color: '#7A7A7A' }
];

export const TOOLKIT_STATUSES = [
  { value: 'want-to-try', label: 'Want to try' },
  { value: 'currently-using', label: 'Currently using' },
  { value: 'tried-it', label: 'Tried it' },
  { value: 'on-pause', label: 'On pause' },
  { value: 'not-for-me', label: 'Not for me' }
];

export const BODY_TAGS = [
  'Hips', 'Lower back', 'Core', 'Shoulders', 'Arms & hands', 'Neck',
  'Pelvis', 'Legs', 'Seat', 'Balance', 'Symmetry', 'Focus & attention',
  'Energy & stamina', 'Anxiety & nerves', 'Recovery', 'Whole body'
];

export const CATEGORY_LABELS = Object.fromEntries(
  TOOLKIT_CATEGORIES.map(c => [c.value, c.label])
);

export const STATUS_LABELS = Object.fromEntries(
  TOOLKIT_STATUSES.map(s => [s.value, s.label])
);

/**
 * Create a new toolkit entry
 */
export async function createToolkitEntry(userId, entryData) {
  return base.create(userId, {
    name: entryData.name || '',
    category: entryData.category || '',
    date: entryData.date || '',
    description: entryData.description || '',
    ridingConnection: entryData.ridingConnection || '',
    bodyTags: entryData.bodyTags || [],
    status: entryData.status || 'want-to-try',
    source: entryData.source || '',
    followupNotes: entryData.followupNotes || ''
  });
}

/**
 * Get a single toolkit entry
 */
export async function getToolkitEntry(docId) {
  return base.read(docId);
}

/**
 * Get all toolkit entries for a user (newest first)
 */
export async function getAllToolkitEntries(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'date',
    orderDirection: 'desc',
    ...options
  });
}

/**
 * Update a toolkit entry
 */
export async function updateToolkitEntry(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete a toolkit entry (soft delete)
 */
export async function deleteToolkitEntry(docId) {
  return base.delete(docId);
}
