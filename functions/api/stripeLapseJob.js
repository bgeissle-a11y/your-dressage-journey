/**
 * Stripe past-due lapse job — daily scheduled trigger.
 *
 * Closes the loop on `invoice.payment_failed`. When `onPaymentFailed` flips a
 * user to `subscriptionStatus = "past_due"`, it stamps `pastDueSince`. This
 * job runs daily, finds anyone who's been past_due longer than
 * PAST_DUE_GRACE_DAYS (default 14), and:
 *   - Clears their subscription (status/tier → "none").
 *   - Lapses any active IC discount (icStatus → "lapsed").
 *   - Lapses any active pilot monthly discount (pilotDiscountActive → false).
 *
 * Stripe-side cancellation is handled by Stripe itself (auto-cancel after
 * retries exhaust). We only mirror state into Firestore so capability gates
 * stop granting paid features.
 *
 * Reads users in pages of 50 to keep memory flat on large cohorts. Each user
 * is wrapped in try/catch so a single bad doc can't abort the run.
 */

const { db } = require("../lib/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const PAGE_SIZE = 50;

function _graceMs() {
  const days = parseInt(process.env.PAST_DUE_GRACE_DAYS || "14", 10);
  const safeDays = Number.isFinite(days) && days >= 0 ? days : 14;
  return safeDays * 24 * 60 * 60 * 1000;
}

/**
 * Decide the outcome for one past_due user. Pure function for testability —
 * given the doc data and "now", returns either the Firestore update payload
 * or an explanation of why we're skipping.
 *
 * Returns one of:
 *   { action: "backfill", update: {...} }
 *   { action: "skip:within_grace", ageMs }
 *   { action: "lapse", update: {...}, icLapsed: bool, pilotLapsed: bool }
 */
function decideOutcome(userData, nowMs, graceMs) {
  const u = userData || {};
  if (!u.pastDueSince) {
    return {
      action: "backfill",
      update: { pastDueSince: new Date(nowMs).toISOString() },
    };
  }
  const ageMs = nowMs - Date.parse(u.pastDueSince);
  if (!Number.isFinite(ageMs) || ageMs < graceMs) {
    return { action: "skip:within_grace", ageMs };
  }

  const nowIso = new Date(nowMs).toISOString();
  const update = {
    subscriptionStatus: "none",
    subscriptionTier: "none",
    pastDueSince: FieldValue.delete(),
    lapsedAt: nowIso,
    lapseReason: "past_due_expiry",
  };

  let icLapsed = false;
  if (u.isInitialCenterline && u.icStatus === "active") {
    update.icStatus = "lapsed";
    update.icLapseReason = "past_due_expiry";
    update.icLapsedAt = nowIso;
    icLapsed = true;
  }

  let pilotLapsed = false;
  if (u.pilotDiscountActive) {
    update.pilotDiscountActive = false;
    update.pilotDiscountLapsedAt = nowIso;
    update.pilotDiscountLapseReason = "past_due_expiry";
    pilotLapsed = true;
  }

  return { action: "lapse", update, icLapsed, pilotLapsed };
}

async function handler(_event) {
  const startedAt = Date.now();
  const graceMs = _graceMs();
  console.log(`[stripeLapseJob] starting (grace ${graceMs / 86400000}d)`);

  const tally = {
    scanned: 0,
    lapsed: 0,
    backfilled: 0,
    skippedWithinGrace: 0,
    failed: 0,
    icLapsed: 0,
    pilotLapsed: 0,
  };

  let lastDoc = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = db.collection("users")
      .where("subscriptionStatus", "==", "past_due")
      .orderBy("__name__")
      .limit(PAGE_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      tally.scanned++;
      const uid = doc.id;
      try {
        const outcome = decideOutcome(doc.data(), Date.now(), graceMs);
        if (outcome.action === "skip:within_grace") {
          tally.skippedWithinGrace++;
          console.log(
            `[stripeLapseJob] ${uid} skipped:within_grace ` +
            `(${Math.round(outcome.ageMs / 86400000)}d / ${graceMs / 86400000}d)`
          );
          continue;
        }
        await db.collection("users").doc(uid).set(outcome.update, { merge: true });
        if (outcome.action === "backfill") {
          tally.backfilled++;
          console.log(`[stripeLapseJob] ${uid} skipped:backfilled`);
        } else {
          tally.lapsed++;
          if (outcome.icLapsed) tally.icLapsed++;
          if (outcome.pilotLapsed) tally.pilotLapsed++;
          console.log(
            `[stripeLapseJob] ${uid} lapsed` +
            (outcome.icLapsed ? " ic" : "") +
            (outcome.pilotLapsed ? " pilot" : "")
          );
        }
      } catch (err) {
        tally.failed++;
        console.error(`[stripeLapseJob] ${uid} failed:`, err.message || err);
      }
    }

    if (snap.size < PAGE_SIZE) break;
    lastDoc = snap.docs[snap.docs.length - 1];
  }

  const elapsedMs = Date.now() - startedAt;
  console.log(
    `[stripeLapseJob] done — scanned=${tally.scanned} ` +
    `lapsed=${tally.lapsed} backfilled=${tally.backfilled} ` +
    `skipped_within_grace=${tally.skippedWithinGrace} ` +
    `ic_lapsed=${tally.icLapsed} pilot_lapsed=${tally.pilotLapsed} ` +
    `failed=${tally.failed} elapsed_ms=${elapsedMs}`
  );

  return tally;
}

module.exports = { handler, decideOutcome };
