/**
 * Onboarding Flags Service
 *
 * Single document at riders/{userId}/onboardingFlags/state holds all
 * onboarding-flow flags. Keeping them in one document avoids per-flag
 * Firestore reads scaling with the number of onboarding moments.
 *
 * Currently tracked:
 *   firstReflectionIntroShownAt — server timestamp set after the rider
 *     dismisses the one-time post-First-Light reflection-form intro.
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase-config';

const FLAG_DOC_PATH = (userId) => ['riders', userId, 'onboardingFlags', 'state'];

async function ensureFreshToken() {
  try {
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }
  } catch (err) {
    console.warn('Token refresh failed:', err.message);
  }
}

function formatTimestamps(data) {
  if (!data) return data;
  const out = { ...data };
  for (const key of Object.keys(out)) {
    if (out[key] instanceof Timestamp) {
      out[key] = out[key].toDate().toISOString();
    }
  }
  return out;
}

/**
 * Read all onboarding flags for the user. Returns an empty object
 * (not an error) if the doc doesn't exist yet.
 */
export async function getOnboardingFlags(userId) {
  try {
    const ref = doc(db, ...FLAG_DOC_PATH(userId));
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { success: true, data: {} };
    }
    return { success: true, data: formatTimestamps(snap.data()) };
  } catch (error) {
    console.error('Error reading onboarding flags:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set a single flag. Uses merge so other flags are preserved.
 * `value` may be a literal (boolean, string) or omitted to write a server timestamp.
 */
export async function setOnboardingFlag(userId, flagName, value) {
  try {
    await ensureFreshToken();
    const ref = doc(db, ...FLAG_DOC_PATH(userId));
    const payload = {};
    payload[flagName] = value === undefined ? serverTimestamp() : value;
    await setDoc(ref, payload, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error setting onboarding flag:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Convenience: mark the first-reflection-intro as shown.
 * Writes a server timestamp so we know when it was dismissed.
 */
export async function markFirstReflectionIntroShown(userId) {
  return setOnboardingFlag(userId, 'firstReflectionIntroShownAt');
}
