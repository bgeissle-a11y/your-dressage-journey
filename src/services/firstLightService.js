/**
 * First Light Service (client read wrapper)
 *
 * The First Light document at riders/{userId}/firstLight/current is
 * written exclusively by Cloud Functions (generateFirstLight /
 * regenerateFirstLight / graduateFirstLightOnThresholdCross). The client
 * only ever reads it.
 *
 * Document shape (see YDJ_FirstLight_Implementation_Brief_v3.md §9.1):
 * {
 *   generatedAt: Timestamp,
 *   primaryVoice: "classical" | "empathetic" | "technical" | "strategic",
 *   sections: { riderRead, partnershipRead, otherVoices[], whereWeBegin },
 *   inputs: { ... },
 *   regeneratedAt: Timestamp | null,
 *   graduatedAt: Timestamp | null,
 *   tokenUsage: { inputTokens, outputTokens, estimatedCostUSD },
 *   modelVersion: string,
 *   generationCount: number
 * }
 */

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase-config';

const CURRENT_DOC_PATH = (userId) => ['riders', userId, 'firstLight', 'current'];
const COLLECTION_PATH = (userId) => ['riders', userId, 'firstLight'];

function formatTimestamps(data) {
  if (!data) return data;
  const out = { ...data };
  for (const key of Object.keys(out)) {
    if (out[key] instanceof Timestamp) {
      out[key] = out[key].toDate().toISOString();
    } else if (out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      // Recursively walk nested objects (inputs.riderProfileSnapshotAt, etc.)
      out[key] = formatTimestamps(out[key]);
    }
  }
  return out;
}

/**
 * Read the current First Light document. Returns null data when the rider
 * has not yet generated First Light — this is an expected state, not an error.
 */
export async function getCurrentFirstLight(userId) {
  try {
    const ref = doc(db, ...CURRENT_DOC_PATH(userId));
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { success: true, data: null };
    }
    return { success: true, data: { id: snap.id, ...formatTimestamps(snap.data()) } };
  } catch (error) {
    console.error('Error reading First Light:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Read all archived (regenerate-superseded) First Light documents.
 * Returns docs with id !== "current", newest archive first.
 */
export async function getFirstLightHistory(userId) {
  try {
    const colRef = collection(db, ...COLLECTION_PATH(userId));
    const snap = await getDocs(colRef);
    const items = snap.docs
      .filter(d => d.id !== 'current')
      .map(d => ({ id: d.id, ...formatTimestamps(d.data()) }));
    items.sort((a, b) => {
      const aT = a.archivedAt || a.generatedAt || '';
      const bT = b.archivedAt || b.generatedAt || '';
      return bT < aT ? -1 : bT > aT ? 1 : 0;
    });
    return { success: true, data: items };
  } catch (error) {
    console.error('Error reading First Light history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Convenience flags computed from the current First Light document.
 *   exists           — the rider has generated First Light at least once
 *   regenerateAvailable — generated, not yet regenerated, not yet graduated
 *   graduated        — Multi-Voice has unlocked
 */
export function deriveFirstLightStatus(firstLightDoc) {
  if (!firstLightDoc) {
    return { exists: false, regenerateAvailable: false, graduated: false };
  }
  return {
    exists: true,
    regenerateAvailable: !firstLightDoc.regeneratedAt && !firstLightDoc.graduatedAt,
    graduated: !!firstLightDoc.graduatedAt,
  };
}

/**
 * Voice number ↔ key mapping. Aligns with VOICE_META in aiService.js
 * and the brief's primaryVoice values.
 */
export const VOICE_KEY_BY_INDEX = ['classical', 'empathetic', 'technical', 'strategic'];
export const VOICE_INDEX_BY_KEY = {
  classical: 0,
  empathetic: 1,
  technical: 2,
  strategic: 3,
};
