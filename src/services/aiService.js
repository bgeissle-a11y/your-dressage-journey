/**
 * AI Coaching Service
 *
 * Frontend wrappers for the AI coaching Cloud Functions.
 * Uses Firebase httpsCallable to invoke server-side functions.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase-config';

// Voice metadata — matches functions/lib/promptBuilder.js VOICE_META
export const VOICE_META = [
  {
    index: 0,
    name: 'The Classical Master',
    catchphrase: 'Why not the first time?',
    icon: '\ud83c\udfaf',
    color: '#5C4033',
    perspective: 'Principles & Philosophy',
  },
  {
    index: 1,
    name: 'The Empathetic Coach',
    catchphrase: "You've got this",
    icon: '\u2b50',
    color: '#C67B5C',
    perspective: 'Rider Psychology & Partnership',
  },
  {
    index: 2,
    name: 'The Technical Coach',
    catchphrase: 'Did you feel that?',
    icon: '\ud83d\udd2c',
    color: '#6B8E5F',
    perspective: 'Biomechanics & Precision',
  },
  {
    index: 3,
    name: 'The Practical Strategist',
    catchphrase: 'Be accurate!',
    icon: '\ud83d\udccb',
    color: '#4A6274',
    perspective: 'Goal Achievement & Planning',
  },
];

/**
 * Generate Multi-Voice Coaching insights + Quick Insights summary.
 *
 * @param {object} [options]
 * @param {number} [options.voiceIndex] - Specific voice (0-3), or omit for all 4
 * @param {boolean} [options.forceRefresh] - Skip cache
 * @returns {Promise<object>} { success, voices, quickInsights, tier, dataTier, ... }
 */
export async function getMultiVoiceCoaching(options = {}) {
  const fn = httpsCallable(functions, 'getMultiVoiceCoaching', { timeout: 120_000 });
  const result = await fn(options);
  return result.data;
}

/**
 * Generate Journey Map.
 *
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh] - Skip cache
 * @param {boolean} [options.staleOk] - Return cached data instantly (even if stale)
 * @returns {Promise<object>} { success, synthesis, narrative, visualization, ... }
 */
export async function getJourneyMap(options = {}) {
  // staleOk fast path uses a shorter timeout — only reads cache, no Claude calls
  const timeout = options.staleOk ? 30_000 : 300_000;
  const fn = httpsCallable(functions, 'getJourneyMap', { timeout });
  const result = await fn(options);
  return result.data;
}

/**
 * Generate Grand Prix Thinking dashboard.
 *
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh] - Skip cache
 * @param {boolean} [options.staleOk] - Return cached data instantly (even if stale)
 * @param {string} [options.layer] - "mental" (default) or "trajectory"
 * @returns {Promise<object>} Mental: { success, selectedPath, weeklyAssignments, activeTrajectory, ... }
 *                            Trajectory: { success, currentStateAnalysis, trajectoryPaths, activePath, ... }
 */
export async function getGrandPrixThinking(options = {}) {
  const timeout = options.staleOk ? 30_000 : 300_000;
  const fn = httpsCallable(functions, 'getGrandPrixThinking', { timeout });
  const result = await fn(options);
  return result.data;
}

/**
 * Advance the week pointer for a 30-day cycle output.
 * No API call — reads from cached document.
 *
 * @param {string} outputType - "mental" for GPT, "physical" for Physical Guidance
 * @returns {Promise<object>} { success, advanced, currentWeek, cycleState }
 */
export async function advanceWeekPointer(outputType = 'mental') {
  const fnName = outputType === 'physical' ? 'getPhysicalGuidance' : 'getGrandPrixThinking';
  const fn = httpsCallable(functions, fnName, { timeout: 30_000 });
  const result = await fn({ advanceWeek: true });
  return result.data;
}

/**
 * Generate Data Visualizations (AI-derived charts + insight narratives).
 *
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh] - Skip cache
 * @param {boolean} [options.staleOk] - Return cached data instantly (even if stale)
 * @returns {Promise<object>} { success, patternExtraction, goalMapping, insightNarratives, ... }
 */
export async function getDataVisualizations(options = {}) {
  const timeout = options.staleOk ? 30_000 : 300_000;
  const fn = httpsCallable(functions, 'getDataVisualizations', { timeout });
  const result = await fn(options);
  return result.data;
}

/**
 * Generate Physical Guidance (pattern analysis + exercise prescription).
 *
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh] - Skip cache
 * @param {boolean} [options.staleOk] - Return cached data instantly (even if stale)
 * @returns {Promise<object>} { success, patternAnalysis, exercisePrescription, ... }
 */
export async function getPhysicalGuidance(options = {}) {
  const timeout = options.staleOk ? 30_000 : 300_000;
  const fn = httpsCallable(functions, 'getPhysicalGuidance', { timeout });
  const result = await fn(options);
  return result.data;
}

/**
 * Generate Event Planner step (client-orchestrated 4-step pipeline).
 *
 * @param {object} options
 * @param {string} options.eventPrepPlanId - Firestore document ID of the event prep plan
 * @param {number} options.step - Step number (1-4)
 * @param {object} [options.priorResults] - Results from prior steps (steps 2-4)
 * @param {boolean} [options.forceRefresh] - Skip cache (step 1 only)
 * @returns {Promise<object>} Step result
 */
export async function getEventPlannerStep(options = {}) {
  const fn = httpsCallable(functions, 'getEventPlanner', { timeout: 540_000 });
  const result = await fn(options);
  return result.data;
}

/**
 * Generate or refresh a Readiness Snapshot for a show plan.
 *
 * @param {object} options
 * @param {string} options.planId - Show preparation document ID
 * @param {boolean} [options.refresh] - If true, refresh an existing snapshot
 * @returns {Promise<object>} { success, narrative, generatedAt, refreshCount }
 */
export async function getReadinessSnapshot(options = {}) {
  const fn = httpsCallable(functions, 'getReadinessSnapshot', { timeout: 120_000 });
  const result = await fn(options);
  return result.data;
}

/**
 * Generate Quick Insights only (no coaching voices).
 * Used by progressive voice rendering to load quick insights independently.
 *
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh] - Skip cache
 * @returns {Promise<object>} { success, quickInsights, ... }
 */
export async function getQuickInsights(options = {}) {
  const fn = httpsCallable(functions, 'getMultiVoiceCoaching', { timeout: 120_000 });
  const result = await fn({ ...options, quickInsightsOnly: true });
  return result.data;
}

/**
 * Check cache staleness for the current user.
 * Returns a report of which outputs are stale. Zero Claude API calls.
 *
 * @returns {Promise<object>} { coaching: { stale, lastGenerated }, ... }
 */
export async function checkCacheStaleness() {
  const fn = httpsCallable(functions, 'checkCacheStaleness', { timeout: 30_000 });
  const result = await fn({});
  return result.data;
}

/**
 * Admin: cross-user activity summary.
 * Requires admin custom claim on the caller's Firebase Auth account.
 *
 * @returns {Promise<object>} { success, userCount, users: [...], generatedAt }
 */
export async function getAdminStats() {
  const fn = httpsCallable(functions, 'getAdminStats', { timeout: 60_000 });
  const result = await fn({});
  return result.data;
}

/**
 * Admin: API token usage stats — per-user, per-output, per-model breakdowns.
 * Requires admin custom claim on the caller's Firebase Auth account.
 *
 * @param {object} [options]
 * @param {number} [options.days=30] - Number of days to query
 * @param {string} [options.uid] - Filter to a specific user
 * @returns {Promise<object>} { success, totals, byUser, byOutput, byModel, dailyTrend, topCalls, generatedAt }
 */
export async function getAdminUsageStats(options = {}) {
  const fn = httpsCallable(functions, 'getAdminUsageStats', { timeout: 120_000 });
  const result = await fn(options);
  return result.data;
}

/**
 * Visualization Script: generate a PETTLEP mental rehearsal script.
 *
 * @param {object} formData - Form fields (movement, problemFocus, referenceType, context, etc.)
 * @returns {Promise<object>} { success, script: { title, totalMinutes, blocks[], reflectionPrompt, recordingTip } }
 */
export async function getVisualizationScript(formData) {
  const fn = httpsCallable(functions, 'getVisualizationScript', { timeout: 120_000 });
  const result = await fn({ formData });
  return result.data;
}
