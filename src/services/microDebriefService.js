import { createBaseService } from './baseService';

const COLLECTION = 'microDebriefs';
const base = createBaseService(COLLECTION);

/**
 * Micro-Debrief Service
 *
 * Lightweight ride entry for moments when the rider doesn't have time for a
 * full post-ride debrief — at the trailer, between work calls, after a quick
 * hack. Captures the headline of the ride in ~60-90 seconds and receives a
 * brief Empathetic Coach acknowledgment (not a full coaching response).
 *
 * Per YDJ_HabitLoop_Implementation_Brief.md and
 * YDJ_MicroDebrief_EmpatheticResponse_PromptSpec.md: micros are signal but
 * NOT substitute for full debriefs. They do not count toward the 5-debrief
 * unlock threshold for Multi-Voice Coaching.
 *
 * Data model:
 * {
 *   userId:                       string  - Firebase Auth UID
 *   date:                         string  - required, ISO date of the ride
 *   horseId:                      string  - required, ref to horse profile
 *   horseName:                    string  - required, denormalized
 *   quality:                      number  - required, 1-10
 *   mentalState:                  string  - required, matches debrief enum
 *                                            (calm, focused, joyful, confident,
 *                                             mixed, uncertain, worried,
 *                                             frustrated, tired, distracted)
 *   momentText:                   string  - optional
 *
 *   // System fields (computed at submit-time by client OR Cloud Function)
 *   submittedAt:                  ISO     - timestamp of submission
 *   riderState:                   string  - "new_no_first_light" |
 *                                           "new_with_first_light" |
 *                                           "established"
 *   cacheAgeAtSubmission:         number  - days since most recent
 *                                            Multi-Voice generation, or null
 *   cacheBandAtSubmission:        string  - "fresh" (≤14d) | "aging" (15-30d)
 *                                           | "stale" (31+d) | null
 *
 *   // AI response (populated by onMicroDebriefSubmit Cloud Function)
 *   empatheticResponse:           string  - the response text shown to rider
 *   empatheticResponseGeneratedAt: ISO    - timestamp
 *   empatheticResponseError:      string  - present only if Sonnet failed
 *                                            and a fallback was written
 *
 *   voiceUsed:                    string  - always "empathetic" for v1;
 *                                            reserved for possible future use
 * }
 */

/**
 * Mental state enum — REUSES the existing debrief enum so downstream
 * prompts can treat micro and full debriefs interchangeably for state
 * signal. Imported indirectly via debriefService at form-render time;
 * exported here for convenience.
 *
 * Source of truth: src/services/debriefService.js MENTAL_STATE_GROUPS.
 * Do NOT redefine values here — keep them in lockstep with debriefs.
 */
export { MENTAL_STATE_GROUPS, MENTAL_STATES } from './debriefService';

/**
 * Create a new micro-debrief.
 *
 * The Cloud Function `onMicroDebriefSubmit` is triggered on document
 * creation. It computes/refines `riderState` and `cache*` fields, then
 * writes back the Empathetic Coach response. Clients SHOULD pre-compute
 * `riderState` and `cache*` for analytics consistency, but the Cloud
 * Function authoritatively sets the final values.
 */
export async function createMicroDebrief(userId, microData) {
  return base.create(userId, {
    date: microData.date || '',
    horseId: microData.horseId || '',
    horseName: microData.horseName || '',
    quality: microData.quality ?? null,
    mentalState: microData.mentalState || '',
    momentText: microData.momentText || '',

    submittedAt: new Date().toISOString(),
    riderState: microData.riderState || null,
    cacheAgeAtSubmission: microData.cacheAgeAtSubmission ?? null,
    cacheBandAtSubmission: microData.cacheBandAtSubmission || null,

    // AI response slots — Cloud Function fills these in
    empatheticResponse: null,
    empatheticResponseGeneratedAt: null,
    voiceUsed: 'empathetic',
  });
}

export async function getMicroDebrief(docId) {
  return base.read(docId);
}

export async function getAllMicroDebriefs(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'submittedAt',
    orderDirection: 'desc',
    ...options,
  });
}

export async function getMicroDebriefsByHorse(userId, horseName) {
  return base.queryByField(userId, 'horseName', '==', horseName);
}

export async function updateMicroDebrief(docId, microData) {
  return base.update(docId, microData);
}

export async function deleteMicroDebrief(docId) {
  return base.delete(docId);
}
