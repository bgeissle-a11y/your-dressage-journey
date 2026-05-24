/**
 * Show Plan rolling-12-month quota — enforce and increment.
 *
 * Per YDJ_Pricing_Tiers_Stripe_Reference.md:
 *   "Maximum 10 show plans per rolling 12-month period."
 *
 * Counter lives on users/{uid}:
 *   showPlansCreatedThisYear: number   — count since windowStart
 *   showPlanYearWindowStart:  ISO time — when the 12-month window opened
 *
 * Both fields are seeded by functions/api/stripe.js whenever a subscription
 * is created/updated. (Side effect: a tier change resets the counter.
 * Pre-existing behavior — out of scope for this helper.)
 *
 * Idempotency: a plan that has already started AI generation carries
 * `aiGenerationStartedAt` (ISO timestamp) on its showPreparations doc.
 * Re-running generation on an already-counted plan does NOT increment the
 * counter and bypasses the cap check, so users can regenerate work they
 * already paid for even after hitting the cap.
 *
 * Rollover: when `now - windowStart >= 365 days`, the next increment also
 * resets the counter to 1 and bumps `showPlanYearWindowStart` to `now`,
 * all in one transaction. There is no scheduled rollover job.
 *
 * Working tier can't generate at all (capability check rejects earlier);
 * Extended and Pilot are unlimited. Enforcement is a no-op for them.
 */
const { db } = require("./firebase");
const { getShowPlanAnnualCap } = require("./entitlements");

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Returns true when the current 12-month window has elapsed and a new
 * window should open on the next counted plan.
 *
 * @param {string|null} windowStartIso
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
function needsRollover(windowStartIso, now = new Date()) {
  if (!windowStartIso) return true;
  const ws = new Date(windowStartIso);
  if (Number.isNaN(ws.getTime())) return true;
  return now.getTime() - ws.getTime() >= YEAR_MS;
}

/**
 * Returns the ISO timestamp when the current window will expire (12 months
 * after windowStart). Used in user-facing rejection messages.
 *
 * @param {string|null} windowStartIso
 * @returns {string|null} ISO timestamp, or null if no window has opened yet
 */
function windowEndIso(windowStartIso) {
  if (!windowStartIso) return null;
  const ws = new Date(windowStartIso);
  if (Number.isNaN(ws.getTime())) return null;
  return new Date(ws.getTime() + YEAR_MS).toISOString();
}

/**
 * Reads the rider's current quota state from users/{uid}. Treats a missing
 * doc, missing fields, or expired window as "0 used, window opens now".
 *
 * @param {string} uid
 * @param {Date} [now=new Date()]
 * @returns {Promise<{used: number, windowStart: string|null, windowEnd: string|null, rolloverDue: boolean}>}
 */
async function getQuotaState(uid, now = new Date()) {
  const snap = await db.collection("users").doc(uid).get();
  const data = snap.exists ? snap.data() || {} : {};
  const rawWindowStart = data.showPlanYearWindowStart || null;
  const rolloverDue = needsRollover(rawWindowStart, now);
  const used = rolloverDue ? 0 : (data.showPlansCreatedThisYear || 0);
  const windowStart = rolloverDue ? null : rawWindowStart;
  return {
    used,
    windowStart,
    windowEnd: windowEndIso(windowStart),
    rolloverDue,
  };
}

/**
 * Checks whether a plan has already started AI generation (idempotency
 * marker). Regenerations of an already-counted plan bypass the cap.
 *
 * @param {string} planId
 * @returns {Promise<boolean>}
 */
async function isPlanAlreadyCounted(planId) {
  const doc = await db.collection("showPreparations").doc(planId).get();
  if (!doc.exists) return false;
  return Boolean(doc.data()?.aiGenerationStartedAt);
}

/**
 * Throws HttpsError("resource-exhausted") if the user is at or above their
 * rolling-12-month cap. Returns silently when:
 *   - cap is unlimited (Extended/Pilot), or
 *   - the plan is already counted (regen case), or
 *   - usage is below cap.
 *
 * @param {string} uid
 * @param {string} tier - normalized tier label
 * @param {string} planId - the showPreparations doc being generated
 * @throws {HttpsError}
 */
async function enforceShowPlanQuota(uid, tier, planId) {
  const { HttpsError } = require("firebase-functions/v2/https");
  const cap = getShowPlanAnnualCap(tier);
  if (cap === Number.POSITIVE_INFINITY) return;

  // Regenerations of an already-counted plan don't pay quota cost.
  if (await isPlanAlreadyCounted(planId)) return;

  const { used, windowEnd } = await getQuotaState(uid);
  if (used >= cap) {
    const resetDateText = windowEnd
      ? new Date(windowEnd).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        })
      : "your next renewal window";
    throw new HttpsError(
      "resource-exhausted",
      `You've used all ${cap} show plans included in your tier this year. ` +
      `Upgrade to Extended for unlimited show plans, or wait until ${resetDateText}.`,
      {
        code: "show_plan_quota_exceeded",
        used,
        cap,
        windowEnd,
      }
    );
  }
}

/**
 * Atomically marks a showPreparations doc as having started AI generation
 * and increments the user's rolling counter. Idempotent: if the doc was
 * already counted, no writes are performed.
 *
 * Performs rollover in the same transaction when the existing window has
 * elapsed (sets the counter to 1 and bumps windowStart to now).
 *
 * No-op when the doc doesn't exist (legacy eventPrepPlans path).
 *
 * @param {string} uid
 * @param {string} planId
 * @returns {Promise<void>}
 */
async function markPlanGenerationStarted(uid, planId) {
  const planRef = db.collection("showPreparations").doc(planId);
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const planDoc = await tx.get(planRef);
    if (!planDoc.exists) return; // legacy eventPrepPlans path — skip silently
    if (planDoc.data()?.aiGenerationStartedAt) return; // already counted

    const userDoc = await tx.get(userRef);
    const data = userDoc.exists ? userDoc.data() || {} : {};
    const now = new Date();
    const nowIso = now.toISOString();
    const rollover = needsRollover(data.showPlanYearWindowStart || null, now);

    const userUpdate = rollover
      ? {
          showPlansCreatedThisYear: 1,
          showPlanYearWindowStart: nowIso,
        }
      : {
          showPlansCreatedThisYear: (data.showPlansCreatedThisYear || 0) + 1,
        };

    tx.update(planRef, { aiGenerationStartedAt: nowIso });
    if (userDoc.exists) {
      tx.update(userRef, userUpdate);
    } else {
      // Defensive: user doc should always exist by the time generation runs.
      // Create one rather than failing silently if it somehow doesn't.
      tx.set(userRef, userUpdate, { merge: true });
    }
  });
}

module.exports = {
  needsRollover,
  windowEndIso,
  getQuotaState,
  isPlanAlreadyCounted,
  enforceShowPlanQuota,
  markPlanGenerationStarted,
  YEAR_MS,
};
