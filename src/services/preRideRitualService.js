import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase-config';

/**
 * Force-refresh the Firebase Auth token before a write operation.
 */
async function ensureFreshToken() {
  try {
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }
  } catch (err) {
    console.warn('Token refresh failed:', err.message);
  }
}

const DEFAULT_BLOCKS = [
  { id: 'physical', type: 'physical', label: 'Physical Check-In', active: true, order: 0 },
  { id: 'gpt', type: 'gpt', label: 'Mental Performance Check-In', active: true, order: 1 },
  { id: 'practice', type: 'practice', label: 'Open Practice Card', active: true, order: 2 },
  { id: 'viz', type: 'viz', label: 'Visualization', active: false, order: 3 },
];

/**
 * Read the rider's pre-ride ritual document.
 * Returns { blocks, researchHidden } or defaults if not found.
 */
export async function readPreRideRitual(userId) {
  try {
    const ref = doc(db, 'riders', userId, 'preRideRitual', 'config');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return {
        success: true,
        data: {
          blocks: data.blocks || DEFAULT_BLOCKS,
          researchHidden: data.researchHidden || false,
          version: data.version || 1,
        },
        exists: true,
      };
    }
    return {
      success: true,
      data: {
        blocks: DEFAULT_BLOCKS.map(b => ({ ...b })),
        researchHidden: false,
        version: 1,
      },
      exists: false,
    };
  } catch (error) {
    console.error('Error reading pre-ride ritual:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save the full pre-ride ritual document (replaces entire doc).
 */
export async function savePreRideRitual(userId, blocks, researchHidden) {
  try {
    await ensureFreshToken();
    const ref = doc(db, 'riders', userId, 'preRideRitual', 'config');
    const orderedBlocks = blocks.map((b, i) => ({
      id: b.id,
      type: b.type,
      label: b.label,
      active: b.active,
      order: i,
    }));
    await setDoc(ref, {
      blocks: orderedBlocks,
      researchHidden: researchHidden,
      version: 1,
      lastUpdated: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving pre-ride ritual:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Persist researchHidden without replacing the full document.
 */
export async function hideResearchPanel(userId) {
  try {
    await ensureFreshToken();
    const ref = doc(db, 'riders', userId, 'preRideRitual', 'config');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { researchHidden: true });
    } else {
      // Doc doesn't exist yet — write defaults with researchHidden true
      await setDoc(ref, {
        blocks: DEFAULT_BLOCKS,
        researchHidden: true,
        version: 1,
        lastUpdated: serverTimestamp(),
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error hiding research panel:', error);
    return { success: false, error: error.message };
  }
}

export { DEFAULT_BLOCKS };
