import { createBaseService } from './baseService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase-config';

const COLLECTION = 'riderProfiles';
const base = createBaseService(COLLECTION);

/**
 * Rider Profile Service
 *
 * Data model (from rider-profilev2.html):
 * {
 *   userId:         string   - Firebase Auth UID
 *   fullName:       string   - required
 *   email:          string   - required
 *   level:          string   - "beginning" | "while" | "block"
 *   frequency:      string   - "1-2" | "3-4" | "5-6" | "7+"
 *   coach:          string   - "weekly" | "biweekly" | "occasional" | "independent"
 *   trainingTime:   string   - "1-3" | "4-6" | "7-10" | "11-15" | "16+"
 *   compLevel:      string   - "none" | "intro" | "training" | ... | "grand-prix"
 *   recentScores:   string   - optional, free text
 *   ownership:      string[] - ["own", "lease", "schoolHorse", "training"]
 *   numHorses:      number   - 1-20, required
 *   whyRide:        string   - required
 *   enjoyMost:      string   - optional
 *   longTermGoals:  string   - required
 *   learningStyle:  string[] - ["visual", "verbal", "kinesthetic", "reading"]
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
    level: profileData.level || '',
    frequency: profileData.frequency || '',
    coach: profileData.coach || '',
    trainingTime: profileData.trainingTime || '',
    compLevel: profileData.compLevel || '',
    recentScores: profileData.recentScores || '',
    ownership: profileData.ownership || [],
    numHorses: profileData.numHorses || 1,
    whyRide: profileData.whyRide || '',
    enjoyMost: profileData.enjoyMost || '',
    longTermGoals: profileData.longTermGoals || '',
    learningStyle: profileData.learningStyle || []
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
