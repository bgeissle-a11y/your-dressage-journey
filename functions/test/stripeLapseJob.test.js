/**
 * Tests for stripeLapseJob.decideOutcome — the pure decision function that
 * drives the daily past-due lapse cron. Run with:
 *
 *   node --test functions/test/stripeLapseJob.test.js
 *
 * Uses node:test (built into Node 22) so no devDependency on a test runner.
 * We test the decision logic against the three documented branches; the
 * Firestore I/O wrapper in handler() is exercised manually in staging.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { FieldValue } = require("firebase-admin/firestore");
const { decideOutcome } = require("../api/stripeLapseJob");

const DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_MS = 14 * DAY_MS;
const NOW_MS = Date.parse("2026-05-21T12:00:00.000Z");

test("backfills pastDueSince when missing", () => {
  const outcome = decideOutcome({ subscriptionStatus: "past_due" }, NOW_MS, GRACE_MS);
  assert.equal(outcome.action, "backfill");
  assert.equal(outcome.update.pastDueSince, new Date(NOW_MS).toISOString());
  assert.equal(outcome.update.subscriptionStatus, undefined);
  assert.equal(outcome.update.subscriptionTier, undefined);
});

test("skips users within grace window (3 days old)", () => {
  const pastDueSince = new Date(NOW_MS - 3 * DAY_MS).toISOString();
  const outcome = decideOutcome(
    { subscriptionStatus: "past_due", pastDueSince },
    NOW_MS,
    GRACE_MS,
  );
  assert.equal(outcome.action, "skip:within_grace");
  assert.ok(outcome.ageMs >= 3 * DAY_MS && outcome.ageMs < 4 * DAY_MS);
});

test("lapses past_due + active IC user beyond grace window (20 days old)", () => {
  const pastDueSince = new Date(NOW_MS - 20 * DAY_MS).toISOString();
  const outcome = decideOutcome(
    {
      subscriptionStatus: "past_due",
      subscriptionTier: "medium",
      pastDueSince,
      isInitialCenterline: true,
      icStatus: "active",
      pilotDiscountActive: false,
    },
    NOW_MS,
    GRACE_MS,
  );

  assert.equal(outcome.action, "lapse");
  assert.equal(outcome.icLapsed, true);
  assert.equal(outcome.pilotLapsed, false);

  const u = outcome.update;
  assert.equal(u.subscriptionStatus, "none");
  assert.equal(u.subscriptionTier, "none");
  assert.equal(u.lapseReason, "past_due_expiry");
  assert.equal(u.lapsedAt, new Date(NOW_MS).toISOString());
  // pastDueSince is cleared via FieldValue.delete() sentinel.
  assert.deepEqual(u.pastDueSince, FieldValue.delete());

  // IC lapse fields.
  assert.equal(u.icStatus, "lapsed");
  assert.equal(u.icLapseReason, "past_due_expiry");
  assert.equal(u.icLapsedAt, new Date(NOW_MS).toISOString());

  // Pilot discount not active → no pilot fields written.
  assert.equal(u.pilotDiscountActive, undefined);
  assert.equal(u.pilotDiscountLapsedAt, undefined);
});

test("lapses pilot discount when active, leaves IC alone when not enrolled", () => {
  const pastDueSince = new Date(NOW_MS - 30 * DAY_MS).toISOString();
  const outcome = decideOutcome(
    {
      subscriptionStatus: "past_due",
      subscriptionTier: "working",
      pastDueSince,
      isInitialCenterline: false,
      pilotDiscountActive: true,
    },
    NOW_MS,
    GRACE_MS,
  );

  assert.equal(outcome.action, "lapse");
  assert.equal(outcome.icLapsed, false);
  assert.equal(outcome.pilotLapsed, true);

  const u = outcome.update;
  assert.equal(u.pilotDiscountActive, false);
  assert.equal(u.pilotDiscountLapseReason, "past_due_expiry");
  assert.equal(u.icStatus, undefined);
});
