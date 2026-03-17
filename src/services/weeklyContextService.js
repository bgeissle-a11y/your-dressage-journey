import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';
import { getWeekId, getWeekMonday } from './weeklyFocusService';

/**
 * Weekly Context Service
 *
 * Stores per-week rider context (confidence trend, coach questions,
 * self-observed patterns) in /users/{uid}/weeklyContext/{weekId}.
 * One document per ISO week per user.
 */

/**
 * Get the weekly context for the current week (or a specific weekId).
 */
export async function getWeeklyContext(userId, weekId) {
  try {
    const wId = weekId || getWeekId();
    const ref = doc(db, 'users', userId, 'weeklyContext', wId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { success: true, data: snap.data() };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('[weeklyContextService] getWeeklyContext error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save the weekly context for the current week (fire-and-forget safe).
 */
export async function saveWeeklyContext(userId, data) {
  try {
    const weekId = getWeekId();
    const monday = getWeekMonday();
    const ref = doc(db, 'users', userId, 'weeklyContext', weekId);
    await setDoc(ref, {
      ...data,
      weekId,
      weekStartDate: monday.toISOString().split('T')[0],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('[weeklyContextService] saveWeeklyContext error:', error);
    return { success: false, error: error.message };
  }
}

export { getWeekId };
