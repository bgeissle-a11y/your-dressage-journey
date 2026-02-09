import { createBaseService } from './baseService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase-config';

const COLLECTION = 'riderProfiles';
const base = createBaseService(COLLECTION);

/**
 * Rider Profile Service
 *
 * Data model (from rider-profile.html):
 * {
 *   userId:       string   - Firebase Auth UID
 *   fullName:     string   - required
 *   email:        string   - required
 *   phone:        string   - optional
 *   level:        string   - "beginning" | "while" | "block"
 *   frequency:    string   - "1-2" | "3-4" | "5-6" | "7+"
 *   coach:        string   - "weekly" | "biweekly" | "occasional" | "independent"
 *   ownership:    string[] - ["own", "lease", "schoolHorse", "training"]
 *   numHorses:    number   - 1-20
 *   whyRide:      string   - required
 *   enjoyMost:    string   - optional
 *   devices:      string[] - ["mobile", "tablet", "desktop"]
 *   mobileType:   string   - "apple" | "android" | "both" | "neither"
 *   consent:      string[] - ["age", "commitment", "survey", "understand"]
 * }
 */

/**
 * Create a rider profile
 * Each user should have only one rider profile
 */
export async function createRiderProfile(userId, profileData) {
  // Check if profile already exists
  const existing = await getRiderProfile(userId);
  if (existing.success) {
    return { success: false, error: 'Rider profile already exists. Use update instead.' };
  }

  return base.create(userId, {
    fullName: profileData.fullName || '',
    email: profileData.email || '',
    phone: profileData.phone || '',
    level: profileData.level || '',
    frequency: profileData.frequency || '',
    coach: profileData.coach || '',
    ownership: profileData.ownership || [],
    numHorses: profileData.numHorses || 1,
    whyRide: profileData.whyRide || '',
    enjoyMost: profileData.enjoyMost || '',
    devices: profileData.devices || [],
    mobileType: profileData.mobileType || '',
    consent: profileData.consent || []
  });
}

/**
 * Get the rider profile for a user (returns the single profile)
 */
export async function getRiderProfile(userId) {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('isDeleted', '==', false)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { success: false, error: 'No rider profile found' };
    }
    const doc = snapshot.docs[0];
    return { success: true, data: { id: doc.id, ...doc.data() } };
  } catch (error) {
    console.error('Error getting rider profile:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update rider profile
 */
export async function updateRiderProfile(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete rider profile (soft delete)
 */
export async function deleteRiderProfile(docId) {
  return base.delete(docId);
}
