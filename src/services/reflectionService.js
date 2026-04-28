import { createBaseService } from './baseService';
import {
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase-config';

const COLLECTION = 'reflections';
const base = createBaseService(COLLECTION);

/**
 * Reflection Service
 *
 * Data model (from dressage-reflection-form.html):
 * {
 *   userId:           string - Firebase Auth UID
 *   category:         string - "personal" | "validation" | "aha" | "obstacle" | "connection" | "feel"
 *   prompt:           string - the reflection prompt text shown to user
 *   mainReflection:   string - required, user's reflection response
 *   obstacleStrategy: string | null - required when category is "obstacle", null otherwise
 *   feeling:          string - required, how the reflection makes them feel
 *   influence:        string - required, how this influences future rides
 *   source:           string | undefined - optional provenance tag.
 *                     "first-light-entry" indicates the reflection was created
 *                     from the First Light wizard. Absent for regular reflections.
 * }
 */

/**
 * Reflection source — the provenance flag for traceability and analytics.
 * Add new sources here when introducing other structured-entry surfaces.
 */
export const REFLECTION_SOURCE_FIRST_LIGHT = 'first-light-entry';

// Valid reflection categories
export const REFLECTION_CATEGORIES = [
  { value: 'personal', label: 'Personal Milestone' },
  { value: 'validation', label: 'External Validation' },
  { value: 'aha', label: 'Aha Moment' },
  { value: 'obstacle', label: 'Obstacle' },
  { value: 'connection', label: 'Connection' },
  { value: 'feel', label: 'Feel' }
];

/**
 * Create a new reflection
 */
export async function createReflection(userId, reflectionData) {
  const payload = {
    category: reflectionData.category || '',
    prompt: reflectionData.prompt || '',
    mainReflection: reflectionData.mainReflection || '',
    obstacleStrategy: reflectionData.category === 'obstacle'
      ? (reflectionData.obstacleStrategy || '')
      : null,
    feeling: reflectionData.feeling || '',
    influence: reflectionData.influence || ''
  };
  if (reflectionData.source) {
    payload.source = reflectionData.source;
  }
  return base.create(userId, payload);
}

/**
 * Find a reflection by (source, category) tuple — used by the First Light
 * wizard to detect when the rider is editing a previously-saved entry.
 *
 * Implementation note: uses the same 3-equality query shape as the rest of
 * the codebase (userId + isDeleted + one extra field) and filters by
 * category client-side. A 4-equality query would require a composite index
 * the existing project doesn't ship; matching the proven shape here avoids
 * silent index-missing failures that previously caused the wizard to
 * create duplicate docs each save.
 *
 * Returns the matching reflection or null.
 */
export async function findReflectionBySourceAndCategory(userId, source, category) {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('isDeleted', '==', false),
      where('source', '==', source)
    );
    const snap = await getDocs(q);
    if (snap.empty) return { success: true, data: null };
    const matching = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(r => r.category === category);
    if (matching.length === 0) return { success: true, data: null };
    matching.sort((a, b) => {
      const aT = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bT = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bT - aT;
    });
    return { success: true, data: matching[0] };
  } catch (error) {
    console.error('[reflectionService] findReflectionBySourceAndCategory failed:', error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Upsert a First Light wizard reflection.
 * Creates a new document or updates the existing one for this (userId, category)
 * within source === "first-light-entry". The wizard uses this so that going back
 * and editing a saved screen replaces the prior entry rather than duplicating it.
 *
 * @returns {Promise<{ success: boolean, id?: string, error?: string, replaced?: boolean }>}
 */
export async function upsertFirstLightReflection(userId, reflectionData) {
  try {
    const category = reflectionData.category;
    if (!category) {
      return { success: false, error: 'category is required' };
    }

    const existingResult = await findReflectionBySourceAndCategory(
      userId,
      REFLECTION_SOURCE_FIRST_LIGHT,
      category
    );
    if (!existingResult.success) {
      console.error('[reflectionService] upsert: lookup failed —', existingResult.error);
      return { success: false, error: `Could not check for existing reflection: ${existingResult.error}` };
    }

    const data = {
      category,
      prompt: reflectionData.prompt || '',
      mainReflection: reflectionData.mainReflection || '',
      obstacleStrategy: category === 'obstacle'
        ? (reflectionData.obstacleStrategy || '')
        : null,
      feeling: reflectionData.feeling || '',
      influence: reflectionData.influence || ''
    };

    if (existingResult.data) {
      console.log('[reflectionService] upsert: updating existing', existingResult.data.id, '(category:', category + ')');
      const updateResult = await base.update(existingResult.data.id, data);
      if (!updateResult.success) {
        console.error('[reflectionService] upsert: update failed —', updateResult.error);
        return updateResult;
      }
      return { success: true, id: existingResult.data.id, replaced: true };
    }

    console.log('[reflectionService] upsert: creating new (category:', category + ')');
    const createResult = await createReflection(userId, { ...data, source: REFLECTION_SOURCE_FIRST_LIGHT });
    if (!createResult.success) {
      console.error('[reflectionService] upsert: create failed —', createResult.error);
    }
    return createResult;
  } catch (err) {
    // Defensive: never let an unexpected throw bubble silently from the
    // wizard's await — return as a normal failure so the UI can display it.
    console.error('[reflectionService] upsert: unexpected exception —', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Get all First Light wizard reflections for the user, keyed by category.
 * Returns { success, data: { personal: {...}|null, validation: {...}|null, ... } }.
 */
export async function getFirstLightReflectionsByCategory(userId) {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('isDeleted', '==', false),
      where('source', '==', REFLECTION_SOURCE_FIRST_LIGHT)
    );
    const snap = await getDocs(q);
    const byCategory = {
      personal: null,
      validation: null,
      aha: null,
      obstacle: null,
      connection: null,
      feel: null
    };
    snap.docs.forEach(d => {
      const r = { id: d.id, ...d.data() };
      if (r.category in byCategory) byCategory[r.category] = r;
    });
    return { success: true, data: byCategory };
  } catch (error) {
    console.error('Error reading First Light reflections:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a single reflection
 */
export async function getReflection(docId) {
  return base.read(docId);
}

/**
 * Get all reflections for a user (newest first)
 */
export async function getAllReflections(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'createdAt',
    orderDirection: 'desc',
    ...options
  });
}

/**
 * Get reflections by category
 */
export async function getReflectionsByCategory(userId, category) {
  return base.queryByField(userId, 'category', '==', category);
}

/**
 * Update a reflection
 */
export async function updateReflection(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete a reflection (soft delete)
 */
export async function deleteReflection(docId) {
  return base.delete(docId);
}
