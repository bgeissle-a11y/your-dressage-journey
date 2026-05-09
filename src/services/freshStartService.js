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
