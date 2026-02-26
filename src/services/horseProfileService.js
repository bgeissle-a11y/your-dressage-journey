import { createBaseService } from './baseService';

const COLLECTION = 'horseProfiles';
const base = createBaseService(COLLECTION);

/**
 * Horse Profile Service
 *
 * Data model (from horse-profileV2.html):
 * {
 *   userId:            string - Firebase Auth UID
 *   riderName:         string - required
 *   horseName:         string - required
 *   birthMonth:        string - "01"-"12" or "" (V2)
 *   birthYear:         string - year or "" (V2)
 *   approxAge:         string - fallback if no birthdate known (V2)
 *   age:               number|null - computed from birthYear or approxAge (backward compat)
 *   breed:             string - optional
 *   sex:               string - "mare" | "gelding" | "stallion"
 *   partnershipMonth:  string - "01"-"12" or "" (V2)
 *   partnershipYear:   string - year or "" (V2)
 *   partnership:       string - computed from partnershipMonth/Year (backward compat)
 *   horseLevel:        string - "beginner" | "training" | "first" | ... | "gp" |
 *                               "training-not-showing" | "groundwork"
 *   arrangement:       string - "own" | "lease" | "partial-lease" | "catch-ride" | "other"
 *   strengths:         string - optional
 *   soundness:         string - "sound" | "managing" | "recovering" | "not-sound"
 *   conditions:        string - optional
 *   important:         string - required
 *   asymmetry:         object|null - { sweat, carrot, tail, hoof: {completed, observation, interpretation}, overall }
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
    // V2 structured date fields
    birthMonth: profileData.birthMonth || '',
    birthYear: profileData.birthYear || '',
    approxAge: profileData.approxAge || '',
    age: profileData.age || null,                    // backward compat (computed)
    breed: profileData.breed || '',
    sex: profileData.sex || '',
    partnershipMonth: profileData.partnershipMonth || '',
    partnershipYear: profileData.partnershipYear || '',
    partnership: profileData.partnership || '',       // backward compat (computed)
    horseLevel: profileData.horseLevel || '',
    arrangement: profileData.arrangement || '',
    strengths: profileData.strengths || '',
    soundness: profileData.soundness || '',
    conditions: profileData.conditions || '',
    important: profileData.important || '',
    asymmetry: profileData.asymmetry || null,
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
