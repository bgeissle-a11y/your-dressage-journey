import { createBaseService } from './baseService';

const COLLECTION = 'freshStarts';
const base = createBaseService(COLLECTION);

/**
 * Fresh Start Service
 *
 * Re-onboarding form completed when a rider returns to the platform after a
 * meaningful gap. Captures rider state at the moment of return (confidence,
 * what they've been working on if anything, how they're feeling about
 * coming back) and receives a single Empathetic Coach response — not a
 * full coaching report.
 *
 * Per YDJ_FreshStart_EmpatheticResponse_PromptSpec_v1_1.md:
 * - State A: rider has been away from riding (only fields 1 + 5 visible).
 * - State B: rider has been actively riding without logging (all 5 visible).
 * - State is determined by an explicit toggle on the form, not NLP.
 *
 * Data model:
 * {
 *   userId:                       string  - Firebase Auth UID
 *   submittedAt:                  ISO     - timestamp of submission
 *   state:                        string  - required, "A" | "B"
 *   confidence:                   number  - required, 1-10
 *   confidenceExplanation:        string  - optional
 *
 *   // State B fields (may be empty in State A — form hides them)
 *   workingOn:                    string  - optional
 *   goingWell:                    string  - optional
 *   difficult:                    string  - optional
 *
 *   // Always visible
 *   anythingElse:                 string  - optional
 *
 *   // System fields (computed at submit-time)
 *   cacheAgeAtSubmission:         number  - days since most recent
 *                                            Multi-Voice generation, or null
 *   cacheBandAtSubmission:        string  - "fresh" | "aging" | "stale" | null
 *
 *   // AI response (populated by onFreshStartSubmit Cloud Function)
 *   empatheticResponse:           string  - multi-paragraph response text
 *   empatheticResponseGeneratedAt: ISO
 *   empatheticResponseError:      string  - present only if Sonnet failed
 * }
 */

/**
 * State enum — A or B. Set by the explicit toggle on the form.
 */
export const FRESH_START_STATES = {
  AWAY: 'A',  // "No — life pulled me away" (rider has not been riding)
  RIDING: 'B', // "Yes — riding, just not logging"
};

/**
 * Submission caps. Layer 1 (client-side) defense — prevents accidental
 * over-submission and signals to the rider that Fresh Start is meant to
 * be occasional re-onboarding, not a daily reflection tool.
 *
 * Soft-deleted entries do NOT count toward the cap: getAllFreshStarts
 * filters them out via the base service's `isDeleted == false` query, so a
 * rider who deletes an accidental Fresh Start frees the slot.
 */
export const FRESH_START_MONTHLY_CAP = 1;
export const FRESH_START_YEARLY_CAP = 4;

function firstOfNextMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}
function firstOfNextYear(d = new Date()) {
  return new Date(d.getFullYear() + 1, 0, 1);
}
function formatFriendlyDate(d) {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Compute cap state from an array of active (non-soft-deleted) Fresh Start
 * entries. Counts entries in the current calendar month and calendar year.
 *
 * @param {Array<{submittedAt?: string}>} freshStarts
 * @returns {{
 *   thisMonthCount: number,
 *   thisYearCount: number,
 *   atMonthlyCap: boolean,
 *   atYearlyCap: boolean,
 *   atAnyCap: boolean,
 *   nextAvailable: Date|null,        // first date a submission would be allowed
 *   nextAvailableLabel: string|null, // friendly formatted
 *   capReason: 'monthly'|'yearly'|null,
 * }}
 */
export function computeFreshStartCaps(freshStarts) {
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisYearKey = now.getFullYear();

  let thisMonthCount = 0;
  let thisYearCount = 0;

  for (const fs of freshStarts || []) {
    if (!fs.submittedAt) continue;
    const t = new Date(fs.submittedAt);
    if (!Number.isFinite(t.getTime())) continue;
    const monthKey = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
    if (monthKey === thisMonthKey) thisMonthCount += 1;
    if (t.getFullYear() === thisYearKey) thisYearCount += 1;
  }

  const atMonthlyCap = thisMonthCount >= FRESH_START_MONTHLY_CAP;
  const atYearlyCap = thisYearCount >= FRESH_START_YEARLY_CAP;
  const atAnyCap = atMonthlyCap || atYearlyCap;

  let capReason = null;
  let nextAvailable = null;
  if (atYearlyCap) {
    capReason = 'yearly';
    nextAvailable = firstOfNextYear(now);
  } else if (atMonthlyCap) {
    capReason = 'monthly';
    nextAvailable = firstOfNextMonth(now);
  }

  return {
    thisMonthCount,
    thisYearCount,
    atMonthlyCap,
    atYearlyCap,
    atAnyCap,
    capReason,
    nextAvailable,
    nextAvailableLabel: nextAvailable ? formatFriendlyDate(nextAvailable) : null,
  };
}

/**
 * Create a new Fresh Start submission.
 *
 * The Cloud Function `onFreshStartSubmit` is triggered on document creation.
 * It computes `cacheAgeAtSubmission` / `cacheBandAtSubmission`, calls Sonnet
 * with the State A or State B prompt, and writes the response back to the
 * document.
 */
export async function createFreshStart(userId, freshStartData) {
  if (
    freshStartData.state !== FRESH_START_STATES.AWAY &&
    freshStartData.state !== FRESH_START_STATES.RIDING
  ) {
    return {
      success: false,
      error: `Invalid Fresh Start state: ${freshStartData.state}. Must be "A" or "B".`,
    };
  }

  return base.create(userId, {
    submittedAt: new Date().toISOString(),
    state: freshStartData.state,
    confidence: freshStartData.confidence ?? null,
    confidenceExplanation: freshStartData.confidenceExplanation || '',

    workingOn: freshStartData.workingOn || '',
    goingWell: freshStartData.goingWell || '',
    difficult: freshStartData.difficult || '',
    anythingElse: freshStartData.anythingElse || '',

    cacheAgeAtSubmission: freshStartData.cacheAgeAtSubmission ?? null,
    cacheBandAtSubmission: freshStartData.cacheBandAtSubmission || null,

    // AI response slots — Cloud Function fills these in
    empatheticResponse: null,
    empatheticResponseGeneratedAt: null,
  });
}

export async function getFreshStart(docId) {
  return base.read(docId);
}

export async function getAllFreshStarts(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'submittedAt',
    orderDirection: 'desc',
    ...options,
  });
}

export async function getMostRecentFreshStart(userId) {
  const result = await getAllFreshStarts(userId, { limitCount: 1 });
  if (!result.success) return result;
  return { success: true, data: result.data[0] || null };
}

export async function updateFreshStart(docId, freshStartData) {
  return base.update(docId, freshStartData);
}

export async function deleteFreshStart(docId) {
  return base.delete(docId);
}
