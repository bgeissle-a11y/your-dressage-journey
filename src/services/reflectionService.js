import { createBaseService } from './baseService';

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
 * }
 */

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
  return base.create(userId, {
    category: reflectionData.category || '',
    prompt: reflectionData.prompt || '',
    mainReflection: reflectionData.mainReflection || '',
    obstacleStrategy: reflectionData.category === 'obstacle'
      ? (reflectionData.obstacleStrategy || '')
      : null,
    feeling: reflectionData.feeling || '',
    influence: reflectionData.influence || ''
  });
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
