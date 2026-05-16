/**
 * loadSubscription — fetch the user's subscription record + run capability gate.
 *
 * Cloud Functions need the same shape that frontend `useSubscription` produces
 * so `entitlements.canAccess` / `assertCanAccess` give consistent answers on
 * both sides. This pulls the raw `users/{uid}` document, normalizes the field
 * names that `getTierStatus` accepts (it tolerates either
 * `subscriptionTier`/`subscriptionStatus` or `tier`/`status`), and returns it.
 *
 * `enforceCapability` composes the load + the gate and throws an HttpsError
 * on deny — the canonical handler-side guard.
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { db } = require("./firebase");
const { assertCanAccess, canAccess } = require("./entitlements");

async function loadSubscription(uid) {
  const snap = await db.collection("users").doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  return {
    tier: data.subscriptionTier || "none",
    status: data.subscriptionStatus || "none",
    isPilot: !!data.isPilot,
    isFounder: !!data.isFounder,
    interval: data.subscriptionInterval || null,
  };
}

/**
 * Throws a Firebase HttpsError("permission-denied") if the user can't access
 * this capability. Returns the loaded subscription on allow so callers can
 * reuse it (e.g. for tier-aware token budget lookups).
 */
async function enforceCapability(uid, capability) {
  const sub = await loadSubscription(uid);
  const denial = assertCanAccess(sub, capability);
  if (denial) {
    throw new HttpsError(denial.code, denial.message, denial.details);
  }
  return sub;
}

/**
 * Non-throwing variant for Firestore-trigger functions that should silently
 * no-op when access is denied (e.g. pilot-grace user logs a debrief — we
 * don't regenerate but we don't surface an error either).
 */
async function silentCanAccess(uid, capability) {
  const sub = await loadSubscription(uid);
  return canAccess(sub, capability);
}

module.exports = { loadSubscription, enforceCapability, silentCanAccess };
