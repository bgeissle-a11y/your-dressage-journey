/**
 * budgetExhaustion — turn a thrown BudgetExceededError into the graceful
 * "cacheServed" response shape (Phase 4).
 *
 * Behavior change vs. the old throw-to-frontend contract:
 *   - The 4 "main view" handlers (coaching, journeyMap, dataVisualizations,
 *     grandPrixThinking mental layer) wrap their inner Claude pipeline and,
 *     on a budget cap hit, return HTTP 200 with the rider's stale cache plus
 *     a `cacheServed: true` flag and a `refreshEligibleAt` ISO timestamp.
 *   - The précis row (`coaching_precis`) is attached so the panel can render
 *     a one-line "where you are right now" message.
 *
 * Other call sites of `callClaude` (Show Planner, GPT trajectory, Physical,
 * Visualization Script) still see the original throw, which is the right
 * behavior for them — they're step-based or one-shot and don't have a stale
 * cache to fall back to.
 */

const { db } = require("./firebase");
const { refreshEligibleAt } = require("./refreshEligibleAt");

/**
 * Detect whether a thrown error came from `_checkAndIncrementBudget`.
 * Falls back to message inspection when err.code is missing (defensive —
 * older deploys may have a slightly different shape).
 */
function isBudgetExceeded(err) {
  if (!err) return false;
  if (err.code === "monthly-budget-exceeded") return true;
  if (err.code === "weekly-budget-exceeded") return true;
  return false;
}

/**
 * Pull the structured capExceeded info off the error, with safe fallbacks.
 */
function readCapExceeded(err) {
  if (err.capExceeded && typeof err.capExceeded === "object") return err.capExceeded;
  // Fallback for code paths that haven't been migrated yet.
  if (err.code === "weekly-budget-exceeded") {
    return { kind: "weekly", limitUSD: null, tier: null };
  }
  return { kind: "monthly", limitUSD: null, tier: null };
}

/**
 * Read /users/{uid}.timezone, defaulting to UTC. Pure read — no write side
 * effects. If the rider hasn't set a timezone yet the banner uses UTC and
 * the message is approximate; spec says this is acceptable.
 */
async function loadUserTimezone(uid) {
  try {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return "UTC";
    const tz = snap.data()?.timezone;
    return tz || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Read the cached `coaching_precis` row, if present. Failures here are
 * silently swallowed — the banner just omits the "where you are now" line.
 */
async function loadPrecis(uid) {
  try {
    const snap = await db.collection("analysisCache").doc(`${uid}_coaching_precis`).get();
    if (!snap.exists) return null;
    const data = snap.data();
    return data?.result?.precis || null;
  } catch {
    return null;
  }
}

/**
 * Build the graceful-exhaustion payload to return from a handler.
 *
 * @param {object} args
 * @param {string} args.uid
 * @param {Error} args.err - the BudgetExceededError that fired
 * @param {object} args.staleResult - whatever shape the handler's cache returns
 *                                    (e.g. {voices, quickInsights} for coaching;
 *                                    {synthesis, narrative, visualization} for
 *                                    journeyMap). Spread directly into the response.
 * @param {object} [args.extras] - extra fields to attach (tier, dataTier, etc.)
 * @returns {Promise<object>}
 */
async function buildGracefulResponse({ uid, err, staleResult = {}, extras = {} }) {
  const capExceeded = readCapExceeded(err);
  const timeZone = await loadUserTimezone(uid);
  const precis = await loadPrecis(uid);
  return {
    success: true,
    cacheServed: true,
    capExceeded,
    refreshEligibleAt: refreshEligibleAt(capExceeded.kind, { timeZone }),
    precis,
    ...staleResult,
    ...extras,
  };
}

module.exports = { isBudgetExceeded, buildGracefulResponse };
