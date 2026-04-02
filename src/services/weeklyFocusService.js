import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';

/**
 * Compute ISO 8601 week ID string: YYYY-WNN
 * Week starts Monday. Uses ISO week numbering.
 */
export function getWeekId(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday (ISO week date algorithm)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Get the Monday of the current ISO week.
 */
export function getWeekMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Read the weekly focus state (snapshot + interaction state) for a given week.
 */
export async function getWeekState(userId, weekId) {
  try {
    const ref = doc(db, 'users', userId, 'weeklyFocus', weekId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { success: true, data: snap.data() };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('[weeklyFocusService] getWeekState error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save (merge) the weekly focus state for a given week.
 */
export async function saveWeekState(userId, weekId, data) {
  try {
    const ref = doc(db, 'users', userId, 'weeklyFocus', weekId);
    await setDoc(ref, {
      ...data,
      weekId,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('[weeklyFocusService] saveWeekState error:', error);
    return { success: false, error: error.message };
  }
}

// ── Direct analysisCache reads ──

/**
 * Read a cached AI output document from analysisCache.
 * Returns { generatedAt, result, ...rest } or null if not found.
 */
export async function readAnalysisCache(uid, cacheKey) {
  try {
    const docId = `${uid}_${cacheKey}`;
    const ref = doc(db, 'analysisCache', docId);
    const snap = await getDoc(ref);
    if (snap.exists() && !snap.data().isDeleted) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.warn('[weeklyFocusService] readAnalysisCache error:', cacheKey, error.message);
    return null;
  }
}

/**
 * Read all 4 coaching voice caches.
 * Returns { voices: {0: ..., 1: ..., 2: ..., 3: ...}, generatedAt } or null.
 */
export async function readCoachingCaches(uid) {
  const voices = {};
  let latestGeneratedAt = null;

  const results = await Promise.allSettled(
    [0, 1, 2, 3].map(i => readAnalysisCache(uid, `coaching_${i}`))
  );

  let hasAny = false;
  for (let i = 0; i < 4; i++) {
    if (results[i].status === 'fulfilled' && results[i].value) {
      voices[i] = results[i].value.result || results[i].value;
      const genAt = results[i].value.generatedAt;
      if (genAt && (!latestGeneratedAt || genAt > latestGeneratedAt)) {
        latestGeneratedAt = genAt;
      }
      hasAny = true;
    }
  }

  if (!hasAny) return null;
  return { voices, generatedAt: latestGeneratedAt };
}

/**
 * Read the GPT L1 (mental) cache.
 */
export async function readGPTCache(uid) {
  const cached = await readAnalysisCache(uid, 'grandPrixThinking');
  if (!cached?.result) return null;
  return {
    ...cached.result,
    generatedAt: cached.generatedAt,
  };
}

/**
 * Read the Physical Guidance cache.
 */
export async function readPhysicalCache(uid) {
  const cached = await readAnalysisCache(uid, 'physicalGuidance');
  if (!cached?.result) return null;
  return {
    ...cached.result,
    generatedAt: cached.generatedAt,
  };
}

/**
 * Read the cycle state document for GPT or Physical Guidance.
 * Used by Weekly Focus and output pages to determine current week.
 *
 * @param {string} uid - User ID
 * @param {string} outputType - "gpt" | "physical"
 * @returns {Promise<object|null>} Cycle state or null
 */
export async function readCycleState(uid, outputType) {
  const paths = {
    gpt: 'grandPrixThinkingCycle',
    physical: 'physicalGuidanceCycle',
  };
  const path = paths[outputType];
  if (!path) return null;

  try {
    const ref = doc(db, path, uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error(`[weeklyFocusService] readCycleState(${outputType}) error:`, error);
    return null;
  }
}

/**
 * Read the Practice Card cache for a user.
 * Returns the practiceCard data or null if not found.
 */
export async function readPracticeCardCache(uid) {
  const cached = await readAnalysisCache(uid, "coaching_practiceCard");
  if (!cached?.result) return null;
  return {
    ...cached.result,
    generatedAt: cached.generatedAt,
  };
}

/**
 * Read the Visualization Suggestion cache for a user.
 * Returns the visualizationSuggestion data or null if not found.
 */
export async function readVisualizationSuggestionCache(uid) {
  const cached = await readAnalysisCache(uid, "coaching_visualizationSuggestion");
  if (!cached?.result) return null;
  return {
    ...cached.result,
    generatedAt: cached.generatedAt,
  };
}

/**
 * Write confirmedAt timestamp + confirmedGoals for a Practice Card.
 * Called when the rider taps "Ready to ride".
 * @param {string} uid - User ID
 * @param {string[]} confirmedGoals - The goals the rider locked with (may differ from suggested)
 * @param {boolean[]} goalsEdited - Which goals were modified from the AI suggestion
 */
export async function confirmPracticeCard(uid, confirmedGoals, goalsEdited) {
  try {
    const docId = `${uid}_coaching_practiceCard`;
    const ref = doc(db, "analysisCache", docId);
    const now = new Date();
    const confirmedDate = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    const updates = {
      "result.confirmedAt": now.toISOString(),
      "result.confirmedDate": confirmedDate,
    };
    if (confirmedGoals) {
      updates["result.confirmedGoals"] = confirmedGoals;
    }
    if (goalsEdited) {
      updates["result.goalsEdited"] = goalsEdited;
    }
    await updateDoc(ref, updates);
    return { success: true, confirmedAt: now.toISOString(), confirmedDate };
  } catch (error) {
    console.error("[weeklyFocusService] confirmPracticeCard error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Read a show planner cache for a specific plan ID.
 */
export async function readShowPlanCache(uid, planId) {
  const cached = await readAnalysisCache(uid, `showPlanner_${planId}`);
  if (!cached) return null;
  return {
    result: cached.result,
    generatedAt: cached.generatedAt,
  };
}
