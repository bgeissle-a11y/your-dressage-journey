/**
 * Settings Service
 * Firestore operations for rider settings: preferences, notifications, privacy, and coaches.
 *
 * Data model (subcollection-based):
 *   /riders/{userId}/settings/preferences
 *   /riders/{userId}/settings/notifications
 *   /riders/{userId}/settings/privacy
 *   /riders/{userId}/settings/coaches/{coachId}
 *
 * Preferences/notifications/privacy are single documents (batch save).
 * Coaches are a subcollection with immediate per-mutation writes.
 */

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase-config';

// ── Token refresh (matches baseService pattern) ──

async function ensureFreshToken() {
  try {
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }
  } catch (err) {
    console.warn('Token refresh failed:', err.message);
  }
}

function friendlyError(error) {
  const msg = error.message || '';
  const code = error.code || '';
  if (code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
    return 'Your session may have expired. Please refresh the page or log out and back in, then try again.';
  }
  if (code === 'unavailable' || msg.includes('Failed to get document')) {
    return 'Unable to reach the server. Please check your internet connection and try again.';
  }
  if (msg.includes('network') || msg.includes('ECONNREFUSED') || msg.includes('fetch')) {
    return 'A network error occurred. Please check your connection and try again.';
  }
  return msg;
}

// ── Defaults (Section 6 of brief) ──

export const SETTINGS_DEFAULTS = {
  preferences: {
    landingPage: 'quickstart',
    outputView: 'full',
    defaultVoice: 'all',
    voiceFragments: true,
    weeklyFocusBlock: true,
  },
  notifications: {
    productUpdates: true,
    outputReady: false,
    streakReminder: true,
  },
  privacy: {
    aggregateOptIn: true,
    analyticsCookies: true,
  },
};

// ── Helpers ──

function settingsDocRef(userId, docName) {
  return doc(db, 'riders', userId, 'settings', docName);
}

function coachesCollectionRef(userId) {
  return collection(db, 'riders', userId, 'settings', 'coaches');
}

function coachDocRef(userId, coachId) {
  return doc(db, 'riders', userId, 'settings', 'coaches', coachId);
}

// ── Load all settings (Section 5) ──

export async function loadAllSettings(userId) {
  try {
    const [prefsSnap, notifsSnap, privacySnap, coachesSnap] = await Promise.all([
      getDoc(settingsDocRef(userId, 'preferences')),
      getDoc(settingsDocRef(userId, 'notifications')),
      getDoc(settingsDocRef(userId, 'privacy')),
      getDocs(coachesCollectionRef(userId)),
    ]);

    const preferences = prefsSnap.exists()
      ? prefsSnap.data()
      : { ...SETTINGS_DEFAULTS.preferences };

    const notifications = notifsSnap.exists()
      ? notifsSnap.data()
      : { ...SETTINGS_DEFAULTS.notifications };

    const privacy = privacySnap.exists()
      ? privacySnap.data()
      : { ...SETTINGS_DEFAULTS.privacy };

    const coaches = coachesSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    // Strip updatedAt timestamps from state (they're server-side only)
    delete preferences.updatedAt;
    delete notifications.updatedAt;
    delete privacy.updatedAt;

    return { success: true, data: { preferences, notifications, privacy, coaches } };
  } catch (error) {
    console.error('Error loading settings:', error);
    return { success: false, error: friendlyError(error) };
  }
}

// ── Batch save preferences + notifications + privacy (Section 4a) ──

export async function saveSettings(userId, { preferences, notifications, privacy }) {
  try {
    await ensureFreshToken();
    const batch = writeBatch(db);

    batch.set(
      settingsDocRef(userId, 'preferences'),
      { ...preferences, updatedAt: serverTimestamp() },
      { merge: true }
    );

    batch.set(
      settingsDocRef(userId, 'notifications'),
      { ...notifications, updatedAt: serverTimestamp() },
      { merge: true }
    );

    batch.set(
      settingsDocRef(userId, 'privacy'),
      { ...privacy, updatedAt: serverTimestamp() },
      { merge: true }
    );

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, error: friendlyError(error) };
  }
}

// ── Coach mutations (Section 4b — immediate writes) ──

export async function addCoach(userId, { name, email, existingCoaches }) {
  // Uniqueness check (case-insensitive)
  const normalizedEmail = email.trim().toLowerCase();
  const duplicate = existingCoaches.some(
    c => c.email.toLowerCase() === normalizedEmail
  );
  if (duplicate) {
    return { success: false, error: 'This email is already in your coach list' };
  }

  try {
    await ensureFreshToken();
    const docRef = await addDoc(coachesCollectionRef(userId), {
      name: name.trim(),
      email: normalizedEmail,
      sharingEnabled: true,
      optInDate: new Date().toISOString().slice(0, 10),
      optOutDate: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding coach:', error);
    return { success: false, error: friendlyError(error) };
  }
}

export async function toggleCoachSharing(userId, coachId, sharingEnabled, existingOptInDate) {
  try {
    await ensureFreshToken();
    const update = sharingEnabled
      ? {
          sharingEnabled: true,
          optInDate: existingOptInDate ?? new Date().toISOString().slice(0, 10),
          optOutDate: null,
          updatedAt: serverTimestamp(),
        }
      : {
          sharingEnabled: false,
          optOutDate: new Date().toISOString().slice(0, 10),
          updatedAt: serverTimestamp(),
        };

    await updateDoc(coachDocRef(userId, coachId), update);
    return { success: true };
  } catch (error) {
    console.error('Error toggling coach sharing:', error);
    return { success: false, error: friendlyError(error) };
  }
}

export async function removeCoach(userId, coachId) {
  try {
    await ensureFreshToken();
    await deleteDoc(coachDocRef(userId, coachId));
    return { success: true };
  } catch (error) {
    console.error('Error removing coach:', error);
    return { success: false, error: friendlyError(error) };
  }
}

// ── Load preferences only (for useSettings context — lightweight) ──

export async function loadPreferences(userId) {
  try {
    const snap = await getDoc(settingsDocRef(userId, 'preferences'));
    if (snap.exists()) {
      const data = snap.data();
      delete data.updatedAt;
      return { success: true, data };
    }
    return { success: true, data: { ...SETTINGS_DEFAULTS.preferences } };
  } catch (error) {
    console.error('Error loading preferences:', error);
    return { success: false, error: friendlyError(error) };
  }
}
