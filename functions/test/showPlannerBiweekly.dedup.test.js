/**
 * B10 — Show Planner bi-weekly cron same-day dedup.
 *
 * Verifies processPlan returns "skipped:duplicate" when the plan already
 * has a biweeklyContent entry for today's UTC date, and proceeds otherwise.
 * Also covers the _utcDateOnly hardening that accepts Firestore Timestamp
 * objects in addition to ISO strings.
 *
 * Run with:  node --test functions/test/showPlannerBiweekly.dedup.test.js
 */

const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

// ─── require.cache injection ───────────────────────────────────────────────
function installMock(relPath, exportsObj) {
  const abs = require.resolve(relPath, { paths: [path.resolve(__dirname, "../api")] });
  require.cache[abs] = {
    id: abs, filename: abs, loaded: true, exports: exportsObj,
    children: [], parent: null, paths: [],
  };
}

const state = {
  precisExists: true,
  precisValue: "rider précis text",
  updateCalls: [],
  callClaudeCalls: [],
};

function resetState() {
  state.precisExists = true;
  state.precisValue = "rider précis text";
  state.updateCalls = [];
  state.callClaudeCalls = [];
}

installMock("../lib/firebase", {
  db: {
    collection: () => ({
      doc: () => ({
        get: async () => ({
          exists: state.precisExists,
          data: () => ({ result: { precis: state.precisValue } }),
        }),
        update: async (data) => {
          state.updateCalls.push(data);
        },
      }),
    }),
  },
});

installMock("firebase-admin/firestore", {
  FieldValue: {
    arrayUnion: (entry) => ({ __arrayUnion: entry }),
    delete: () => ({ __delete: true }),
  },
});

installMock("../lib/claudeCall", {
  callClaude: async (args) => {
    state.callClaudeCalls.push(args);
    return "fresh biweekly check-in content";
  },
});

installMock("../lib/loadSubscription", {
  loadSubscription: async () => ({ tier: "medium", isPilot: false }),
});

installMock("../lib/entitlements", {
  CAPABILITIES: { generateShowPrepPlan: "generateShowPrepPlan" },
  canAccess: () => true,
});

installMock("../lib/tokenBudgets", {
  getMaxTokens: () => 3000,
  tierFromLabel: (label) => label || "medium",
});

const {
  processPlan,
  _utcDateOnly,
} = require("../api/showPlannerBiweeklyContent");

// ─── Tests ─────────────────────────────────────────────────────────────────

const NOW = new Date("2026-05-22T12:00:00.000Z");
const TODAY_UTC = "2026-05-22";

test("processPlan skips when plan has entry with generatedAt = today UTC", async () => {
  resetState();
  const plan = {
    id: "plan-1",
    userId: "uid-a",
    showDateStart: "2026-06-15",
    biweeklyContent: [
      { text: "earlier today", generatedAt: `${TODAY_UTC}T01:23:45.000Z`, source: "scheduled" },
    ],
  };
  const outcome = await processPlan(plan, NOW);
  assert.equal(outcome, "skipped:duplicate");
  assert.equal(state.callClaudeCalls.length, 0, "callClaude must not run on duplicate");
  assert.equal(state.updateCalls.length, 0, "no Firestore write on duplicate");
});

test("processPlan proceeds when plan has only yesterday's entry", async () => {
  resetState();
  const plan = {
    id: "plan-2",
    userId: "uid-a",
    showDateStart: "2026-06-15",
    biweeklyContent: [
      { text: "yesterday", generatedAt: "2026-05-21T23:59:00.000Z", source: "scheduled" },
    ],
  };
  const outcome = await processPlan(plan, NOW);
  assert.equal(outcome, "generated");
  assert.equal(state.callClaudeCalls.length, 1);
  assert.equal(state.updateCalls.length, 1);
});

test("processPlan proceeds when biweeklyContent is undefined", async () => {
  resetState();
  const plan = {
    id: "plan-3",
    userId: "uid-a",
    showDateStart: "2026-06-15",
    // biweeklyContent intentionally missing
  };
  const outcome = await processPlan(plan, NOW);
  assert.equal(outcome, "generated");
  assert.equal(state.callClaudeCalls.length, 1);
});

test("processPlan proceeds when biweeklyContent is empty array", async () => {
  resetState();
  const plan = {
    id: "plan-4",
    userId: "uid-a",
    showDateStart: "2026-06-15",
    biweeklyContent: [],
  };
  const outcome = await processPlan(plan, NOW);
  assert.equal(outcome, "generated");
});

test("_utcDateOnly recognizes Firestore Timestamp-shaped objects (_seconds)", async () => {
  // Today's midnight UTC = 2026-05-22T00:00:00Z = 1779696000 s
  const todaySecs = Math.floor(Date.UTC(2026, 4, 22, 6, 0, 0) / 1000); // 06:00 UTC today
  const dateStr = _utcDateOnly({ _seconds: todaySecs, _nanoseconds: 0 });
  assert.equal(dateStr, TODAY_UTC);
});

test("_utcDateOnly recognizes Firestore Timestamp-shaped objects (.toDate())", async () => {
  const ts = {
    toDate: () => new Date("2026-05-22T18:00:00.000Z"),
  };
  assert.equal(_utcDateOnly(ts), TODAY_UTC);
});

test("processPlan dedups against a Timestamp-shaped generatedAt", async () => {
  resetState();
  const todaySecs = Math.floor(Date.UTC(2026, 4, 22, 6, 0, 0) / 1000);
  const plan = {
    id: "plan-5",
    userId: "uid-a",
    showDateStart: "2026-06-15",
    biweeklyContent: [
      {
        text: "earlier today as legacy Timestamp",
        generatedAt: { _seconds: todaySecs, _nanoseconds: 0 },
        source: "scheduled",
      },
    ],
  };
  const outcome = await processPlan(plan, NOW);
  assert.equal(outcome, "skipped:duplicate");
  assert.equal(state.callClaudeCalls.length, 0);
});

test("processPlan returns skipped:no-precis when précis doc is missing", async () => {
  resetState();
  state.precisExists = false;
  const plan = {
    id: "plan-6",
    userId: "uid-a",
    showDateStart: "2026-06-15",
    biweeklyContent: [],
  };
  const outcome = await processPlan(plan, NOW);
  assert.equal(outcome, "skipped:no-precis");
  assert.equal(state.callClaudeCalls.length, 0);
});
