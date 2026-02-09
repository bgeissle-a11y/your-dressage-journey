import { createBaseService } from './baseService';

const COLLECTION = 'horseProfiles';
const base = createBaseService(COLLECTION);

/**
 * Horse Profile Service
 *
 * Data model (from horse-profile.html):
 * {
 *   userId:       string - Firebase Auth UID
 *   riderName:    string - required
 *   horseName:    string - required
 *   age:          number - optional (1-40)
 *   breed:        string - optional
 *   sex:          string - "mare" | "gelding" | "stallion"
 *   partnership:  string - optional, e.g. "2 years"
 *   horseLevel:   string - "beginner" | "training" | "first" | "second" | "third" |
 *                          "fourth" | "psg" | "inter1" | "inter2" | "gp" | "training-not-showing"
 *   arrangement:  string - "own" | "lease" | "partial-lease" | "catch-ride" | "other"
 *   strengths:    string - optional
 *   soundness:    string - "sound" | "managing" | "recovering" | "not-sound"
 *   conditions:   string - optional
 *   important:    string - required
 * }
 *
 * Users can have multiple horse profiles.
 */

/**
 * Create a horse profile
 */
export async function createHorseProfile(userId, profileData) {
  return base.create(userId, {
    riderName: profileData.riderName || '',
    horseName: profileData.horseName || '',
    age: profileData.age || null,
    breed: profileData.breed || '',
    sex: profileData.sex || '',
    partnership: profileData.partnership || '',
    horseLevel: profileData.horseLevel || '',
    arrangement: profileData.arrangement || '',
    strengths: profileData.strengths || '',
    soundness: profileData.soundness || '',
    conditions: profileData.conditions || '',
    important: profileData.important || ''
  });
}

/**
 * Get a single horse profile by document ID
 */
export async function getHorseProfile(docId) {
  return base.read(docId);
}

/**
 * Get all horse profiles for a user
 */
export async function getAllHorseProfiles(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'horseName',
    orderDirection: 'asc',
    ...options
  });
}

/**
 * Get horse profiles by name (for debrief horse selection)
 */
export async function getHorseByName(userId, horseName) {
  return base.queryByField(userId, 'horseName', '==', horseName);
}

/**
 * Update a horse profile
 */
export async function updateHorseProfile(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete a horse profile (soft delete)
 */
export async function deleteHorseProfile(docId) {
  return base.delete(docId);
}
