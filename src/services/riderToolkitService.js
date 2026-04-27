import { createBaseService } from './baseService';
import { db } from '../firebase-config';
import {
  doc, collection, addDoc, updateDoc, getDoc,
  serverTimestamp, increment,
} from 'firebase/firestore';

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
 * Get all toolkit entries for a user (newest first).
 * Sorts by `date` when present, falling back to `createdAt` so entries
 * without a user-entered date (e.g., visualization scripts) still surface
 * at the top of the list when freshly created.
 */
export async function getAllToolkitEntries(userId, options = {}) {
  const result = await base.readAll(userId, options);
  if (!result.success) return result;

  const sorted = [...result.data].sort((a, b) => {
    const aKey = a.date || a.createdAt || '';
    const bKey = b.date || b.createdAt || '';
    if (aKey < bKey) return 1;
    if (aKey > bKey) return -1;
    return 0;
  });

  return { ...result, data: sorted };
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

// ═══════════════════════════════════════════════
// Visualization Script — specialized CRUD
// ═══════════════════════════════════════════════

/**
 * Create a visualization script toolkit entry with the full data shape
 * that the standalone HTML form used (movement, scriptContent, etc.).
 */
export async function createVisualizationScript(userId, formData, script, movementLabel) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      userId,
      entryType: 'visualization-script',
      movement: formData.movement,
      movementSub: formData.movementSub || null,
      movementSub2: formData.movementSub2 || null,
      movementLabel,
      problemFocus: formData.problemFocus,
      referenceType: formData.referenceType,
      referenceText: formData.referenceText || null,
      context: formData.context,
      sensoryPreference: formData.sensoryPreference || null,
      scriptLength: formData.scriptLength || 'standard',
      scriptContent: JSON.stringify(script),
      category: 'mental',
      status: 'currently-using',
      name: `Visualization: ${movementLabel}`,
      date: new Date().toISOString().split('T')[0],
      sessionCount: 0,
      lastSessionDate: null,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, data: { id: docRef.id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Load an existing visualization script by its toolkit entry ID.
 */
export async function getVisualizationScriptEntry(docId) {
  try {
    const snap = await getDoc(doc(db, COLLECTION, docId));
    if (!snap.exists()) return { success: false, error: 'Not found' };
    return { success: true, data: { id: snap.id, ...snap.data() } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Save a visualization session to the sessions subcollection
 * and bump sessionCount / lastSessionDate on the parent entry.
 */
export async function saveVisualizationSession(scriptId, sessionData) {
  try {
    const parentRef = doc(db, COLLECTION, scriptId);
    const sessionsRef = collection(parentRef, 'sessions');
    const today = new Date().toISOString().split('T')[0];

    await addDoc(sessionsRef, {
      sessionDate: today,
      reflectionResponse: sessionData.reflectionText || '',
      completedBlocks: sessionData.completedBlocks || [],
      sessionLength: sessionData.scriptLength || 'standard',
      createdAt: serverTimestamp(),
    });

    await updateDoc(parentRef, {
      sessionCount: increment(1),
      lastSessionDate: today,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
