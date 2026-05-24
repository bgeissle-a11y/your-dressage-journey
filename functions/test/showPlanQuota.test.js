/**
 * B7 — Show Plan rolling-12-month quota enforcement.
 *
 * Covers:
 *   - getShowPlanAnnualCap default cap per tier + env override
 *   - enforceShowPlanQuota: cap branches, regen exemption, unlimited tiers
 *   - markPlanGenerationStarted: idempotency, rollover, missing-doc no-op
 *   - needsRollover edge cases
 *
 * Run with:  node --test functions/test/showPlanQuota.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

function installMock(relPath, exportsObj) {
  const abs = require.resolve(relPath, { paths: [path.resolve(__dirname, "../lib")] });
  require.cache[abs] = {
    id: abs,
    filename: abs,
    loaded: true,
    exports: exportsObj,
    children: [],
    parent: null,
    paths: [],
  };
}

// Mutable Firestore state.
const state = {
  userDoc: null,        // null → missing user
  planDoc: null,        // null → missing plan
  txWrites: [],         // [{ kind, ref, data, opts? }]
  capturedTransactions: 0,
};

function reset() {
  state.userDoc = null;
  state.planDoc = null;
  state.txWrites = [];
  state.capturedTransactions = 0;
}

function makeDocSnapshot(data) {
  if (data === null) return { exists: false, data: () => null };
  return { exists: true, data: () => data };
}

installMock("../lib/firebase", {
  db: {
    collection: (name) => ({
      doc: (id) => ({
        __coll: name,
        __id: id,
        get: async () => {
          if (name === "users") return makeDocSnapshot(state.userDoc);
          if (name === "showPreparations") return makeDocSnapshot(state.planDoc);
          return makeDocSnapshot(null);
        },
      }),
    }),
    runTransaction: async (fn) => {
      state.capturedTransactions++;
      const tx = {
        get: async (ref) => {
          if (ref.__coll === "users") return makeDocSnapshot(state.userDoc);
          if (ref.__coll === "showPreparations") return makeDocSnapshot(state.planDoc);
          return makeDocSnapshot(null);
        },
        update: (ref, data) => state.txWrites.push({ kind: "update", ref, data }),
        set: (ref, data, opts) => state.txWrites.push({ kind: "set", ref, data, opts }),
      };
      return await fn(tx);
    },
  },
});

installMock("firebase-functions/v2/https", {
  HttpsError: class HttpsError extends Error {
    constructor(code, message, details) {
      super(message);
      this.code = code;
      this.details = details;
    }
  },
});

// Load AFTER mocks. entitlements is real (we want the env override path).
const entitlements = require("../lib/entitlements");
const {
  needsRollover,
  windowEndIso,
  getQuotaState,
  isPlanAlreadyCounted,
  enforceShowPlanQuota,
  markPlanGenerationStarted,
  YEAR_MS,
} = require("../lib/showPlanQuota");

// ── getShowPlanAnnualCap ────────────────────────────────────────────────────

test("getShowPlanAnnualCap: medium defaults to 10", () => {
  delete process.env.SHOW_PLAN_ANNUAL_CAP_MEDIUM;
  assert.equal(entitlements.getShowPlanAnnualCap("medium"), 10);
});

test("getShowPlanAnnualCap: medium honors integer env override", () => {
  process.env.SHOW_PLAN_ANNUAL_CAP_MEDIUM = "5";
  try {
    assert.equal(entitlements.getShowPlanAnnualCap("medium"), 5);
  } finally {
    delete process.env.SHOW_PLAN_ANNUAL_CAP_MEDIUM;
  }
});

test("getShowPlanAnnualCap: medium env override 'unlimited' returns Infinity", () => {
  process.env.SHOW_PLAN_ANNUAL_CAP_MEDIUM = "unlimited";
  try {
    assert.equal(entitlements.getShowPlanAnnualCap("medium"), Number.POSITIVE_INFINITY);
  } finally {
    delete process.env.SHOW_PLAN_ANNUAL_CAP_MEDIUM;
  }
});

test("getShowPlanAnnualCap: extended always Infinity regardless of env", () => {
  process.env.SHOW_PLAN_ANNUAL_CAP_MEDIUM = "1";
  try {
    assert.equal(entitlements.getShowPlanAnnualCap("extended"), Number.POSITIVE_INFINITY);
  } finally {
    delete process.env.SHOW_PLAN_ANNUAL_CAP_MEDIUM;
  }
});

test("getShowPlanAnnualCap: pilot always Infinity", () => {
  assert.equal(entitlements.getShowPlanAnnualCap("pilot"), Number.POSITIVE_INFINITY);
});

test("getShowPlanAnnualCap: working tier is 0", () => {
  assert.equal(entitlements.getShowPlanAnnualCap("working"), 0);
});

// ── needsRollover ───────────────────────────────────────────────────────────

test("needsRollover: null windowStart triggers rollover", () => {
  assert.equal(needsRollover(null), true);
});

test("needsRollover: invalid ISO triggers rollover", () => {
  assert.equal(needsRollover("not-a-date"), true);
});

test("needsRollover: 364 days elapsed = no rollover", () => {
  const now = new Date("2026-12-31T00:00:00Z");
  const ws = new Date(now.getTime() - 364 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(needsRollover(ws, now), false);
});

test("needsRollover: 365 days elapsed = rollover due", () => {
  const now = new Date("2026-12-31T00:00:00Z");
  const ws = new Date(now.getTime() - YEAR_MS).toISOString();
  assert.equal(needsRollover(ws, now), true);
});

// ── enforceShowPlanQuota ────────────────────────────────────────────────────

test("enforceShowPlanQuota: extended tier returns silently even at high count", async () => {
  reset();
  state.userDoc = { showPlansCreatedThisYear: 999, showPlanYearWindowStart: new Date().toISOString() };
  await enforceShowPlanQuota("uid-1", "extended", "plan-1");
});

test("enforceShowPlanQuota: pilot tier returns silently even at high count", async () => {
  reset();
  state.userDoc = { showPlansCreatedThisYear: 999, showPlanYearWindowStart: new Date().toISOString() };
  await enforceShowPlanQuota("uid-1", "pilot", "plan-1");
});

test("enforceShowPlanQuota: medium under cap returns silently", async () => {
  reset();
  state.userDoc = {
    showPlansCreatedThisYear: 3,
    showPlanYearWindowStart: new Date().toISOString(),
  };
  state.planDoc = { /* no aiGenerationStartedAt */ };
  await enforceShowPlanQuota("uid-1", "medium", "plan-1");
});

test("enforceShowPlanQuota: medium AT cap throws resource-exhausted", async () => {
  reset();
  state.userDoc = {
    showPlansCreatedThisYear: 10,
    showPlanYearWindowStart: new Date().toISOString(),
  };
  state.planDoc = null; // brand new plan

  await assert.rejects(
    () => enforceShowPlanQuota("uid-1", "medium", "plan-new"),
    (err) => {
      assert.equal(err.code, "resource-exhausted");
      assert.equal(err.details?.code, "show_plan_quota_exceeded");
      assert.equal(err.details?.used, 10);
      assert.equal(err.details?.cap, 10);
      assert.match(err.message, /10 show plans/);
      return true;
    },
  );
});

test("enforceShowPlanQuota: regen of already-counted plan bypasses cap", async () => {
  reset();
  state.userDoc = {
    showPlansCreatedThisYear: 10,
    showPlanYearWindowStart: new Date().toISOString(),
  };
  state.planDoc = { aiGenerationStartedAt: "2026-04-01T00:00:00Z" };
  // No throw — already counted, regen is free.
  await enforceShowPlanQuota("uid-1", "medium", "plan-existing");
});

test("enforceShowPlanQuota: expired window treats used as 0", async () => {
  reset();
  // Window opened 400 days ago → rollover; effective used = 0 → allow.
  const ws = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
  state.userDoc = { showPlansCreatedThisYear: 10, showPlanYearWindowStart: ws };
  state.planDoc = null;
  await enforceShowPlanQuota("uid-1", "medium", "plan-new"); // no throw
});

// ── markPlanGenerationStarted ───────────────────────────────────────────────

test("markPlanGenerationStarted: increments counter and stamps marker on first call", async () => {
  reset();
  state.userDoc = { showPlansCreatedThisYear: 2, showPlanYearWindowStart: new Date().toISOString() };
  state.planDoc = { someOtherField: true };

  await markPlanGenerationStarted("uid-1", "plan-1");

  assert.equal(state.capturedTransactions, 1);
  const planUpdate = state.txWrites.find((w) => w.kind === "update" && w.ref.__coll === "showPreparations");
  const userUpdate = state.txWrites.find((w) => w.kind === "update" && w.ref.__coll === "users");
  assert.ok(planUpdate, "plan doc updated");
  assert.ok(planUpdate.data.aiGenerationStartedAt, "aiGenerationStartedAt stamped");
  assert.ok(userUpdate, "user doc updated");
  assert.equal(userUpdate.data.showPlansCreatedThisYear, 3);
});

test("markPlanGenerationStarted: no-op when aiGenerationStartedAt already set", async () => {
  reset();
  state.userDoc = { showPlansCreatedThisYear: 5, showPlanYearWindowStart: new Date().toISOString() };
  state.planDoc = { aiGenerationStartedAt: "2026-04-01T00:00:00Z" };

  await markPlanGenerationStarted("uid-1", "plan-1");

  assert.equal(state.capturedTransactions, 1, "transaction ran");
  assert.equal(state.txWrites.length, 0, "no writes — already counted");
});

test("markPlanGenerationStarted: no-op when plan doc missing (legacy eventPrepPlans)", async () => {
  reset();
  state.userDoc = { showPlansCreatedThisYear: 0, showPlanYearWindowStart: new Date().toISOString() };
  state.planDoc = null;

  await markPlanGenerationStarted("uid-1", "legacy-plan");

  assert.equal(state.txWrites.length, 0);
});

test("markPlanGenerationStarted: rollover resets counter to 1 and bumps window", async () => {
  reset();
  // Window 400 days old → rollover triggers in same transaction.
  const oldWindow = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
  state.userDoc = { showPlansCreatedThisYear: 8, showPlanYearWindowStart: oldWindow };
  state.planDoc = {};

  await markPlanGenerationStarted("uid-1", "plan-1");

  const userUpdate = state.txWrites.find((w) => w.kind === "update" && w.ref.__coll === "users");
  assert.ok(userUpdate);
  assert.equal(userUpdate.data.showPlansCreatedThisYear, 1, "counter reset to 1");
  assert.ok(userUpdate.data.showPlanYearWindowStart, "windowStart bumped");
  // Bumped to (approximately) now — within last 5 seconds.
  const bumped = new Date(userUpdate.data.showPlanYearWindowStart).getTime();
  assert.ok(Math.abs(Date.now() - bumped) < 5000);
});

test("markPlanGenerationStarted: missing user doc creates one with counter=1", async () => {
  reset();
  state.userDoc = null;
  state.planDoc = {};

  await markPlanGenerationStarted("uid-new", "plan-1");

  const userSet = state.txWrites.find((w) => w.kind === "set" && w.ref.__coll === "users");
  assert.ok(userSet, "user doc set via merge");
  assert.equal(userSet.data.showPlansCreatedThisYear, 1);
  assert.deepEqual(userSet.opts, { merge: true });
});

// ── windowEndIso ────────────────────────────────────────────────────────────

test("windowEndIso: returns null for null/invalid input", () => {
  assert.equal(windowEndIso(null), null);
  assert.equal(windowEndIso("not-a-date"), null);
});

test("windowEndIso: returns windowStart + 365 days", () => {
  const start = "2026-01-01T00:00:00.000Z";
  const end = windowEndIso(start);
  const diff = new Date(end).getTime() - new Date(start).getTime();
  assert.equal(diff, YEAR_MS);
});

// ── getQuotaState ───────────────────────────────────────────────────────────

test("getQuotaState: missing user doc returns used=0, rolloverDue=true", async () => {
  reset();
  state.userDoc = null;
  const q = await getQuotaState("uid-1");
  assert.equal(q.used, 0);
  assert.equal(q.windowStart, null);
  assert.equal(q.rolloverDue, true);
});

test("getQuotaState: valid window returns counter as-is", async () => {
  reset();
  const ws = new Date().toISOString();
  state.userDoc = { showPlansCreatedThisYear: 4, showPlanYearWindowStart: ws };
  const q = await getQuotaState("uid-1");
  assert.equal(q.used, 4);
  assert.equal(q.windowStart, ws);
  assert.equal(q.rolloverDue, false);
});

// ── isPlanAlreadyCounted ────────────────────────────────────────────────────

test("isPlanAlreadyCounted: true when aiGenerationStartedAt is set", async () => {
  reset();
  state.planDoc = { aiGenerationStartedAt: "2026-04-01T00:00:00Z" };
  assert.equal(await isPlanAlreadyCounted("plan-1"), true);
});

test("isPlanAlreadyCounted: false when field missing", async () => {
  reset();
  state.planDoc = { other: 1 };
  assert.equal(await isPlanAlreadyCounted("plan-1"), false);
});

test("isPlanAlreadyCounted: false when doc missing", async () => {
  reset();
  state.planDoc = null;
  assert.equal(await isPlanAlreadyCounted("plan-1"), false);
});
