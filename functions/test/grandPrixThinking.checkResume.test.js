/**
 * B12 — Trajectory step-1 resume detection.
 *
 * The `checkResume` branch in grandPrixThinking.js handler returns metadata
 * about whether a partial step-1 cache can be resumed (steps 2+3 only) so
 * the rider avoids paying for a fresh Opus call. Critical invariant:
 *   - canResume:true requires a fresh step-1 cache that's NEWER than any
 *     final-trajectory cache and hash-matched to the current snapshot.
 *   - The checkResume call MUST NOT fire any Claude calls.
 *
 * Run with:  node --test functions/test/grandPrixThinking.checkResume.test.js
 *
 * Tests _countL2OpusThisMonth too (B13) since the same fixture installs the
 * Firestore mock we need.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

function installMock(relPath, exportsObj) {
  const abs = require.resolve(relPath, { paths: [path.resolve(__dirname, "../api")] });
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

const state = {
  // Map outputType → cache row (or null). cacheManager.getCache reads from here.
  cacheRows: {},
  // Counts of every callClaude({context}) — must remain 0 across checkResume tests.
  claudeCallCount: 0,
  // For _countL2OpusThisMonth: the snapshot rows the where-chain resolves to.
  usageLogRows: [],
  // For _countL2OpusThisMonth: records the where() args so we can assert the
  // query was built with the expected timestamp range.
  whereCalls: [],
};

function reset() {
  state.cacheRows = {};
  state.claudeCallCount = 0;
  state.usageLogRows = [];
  state.whereCalls = [];
}

installMock("../lib/auth", {
  validateAuth: (req) => req?.auth?.uid || "uid-test",
});

installMock("../lib/loadSubscription", {
  enforceCapability: async () => ({ tier: "extended", isPilot: false }),
});

installMock("../lib/entitlements", {
  CAPABILITIES: {
    generateGrandPrixThinking: "generateGrandPrixThinking",
    regenerateGrandPrixThinking: "regenerateGrandPrixThinking",
  },
});

installMock("../lib/errors", {
  wrapError: (err) => err,
});

installMock("../lib/prepareRiderData", {
  prepareRiderData: async (uid) => ({
    uid,
    dataTier: 2,
    tier: { label: "extended" },
    dataSnapshot: { hash: "hash-current" },
    horseProfiles: [{ horseName: "Star" }],
    horseSummaries: [{ name: "Star" }],
  }),
});

installMock("../lib/claudeCall", {
  callClaude: async () => {
    state.claudeCallCount += 1;
    throw new Error("checkResume must not call Claude");
  },
});

installMock("../lib/promptBuilder", {
  buildGPTL1Prompt: () => ({ system: "sys", userMessage: "msg" }),
  buildTrajectoryCall1Prompt: () => ({ system: "sys", userMessage: "msg" }),
  buildTrajectoryCall2Prompt: () => ({ system: "sys", userMessage: "msg" }),
  buildTrajectoryCall3Prompt: () => ({ system: "sys", userMessage: "msg" }),
  buildTrajectoryCall4Prompt: () => ({ system: "sys", userMessage: "msg" }),
});

installMock("../lib/testDatabase", {
  buildTestDatabaseContext: () => "",
});

installMock("../lib/cacheManager", {
  getCache: async (uid, outputType, options = {}) => {
    const row = state.cacheRows[outputType];
    if (!row) return null;
    if (options.currentHash && row.dataSnapshotHash && row.dataSnapshotHash !== options.currentHash) {
      return null; // hash mismatch → cache miss (mirrors real behavior)
    }
    return row;
  },
  setCache: async () => {},
  getStaleCache: async () => null,
});

installMock("../lib/generationStatus", {
  getStatus: async () => null,
});

installMock("../lib/inflightLock", {
  tryAcquireLock: async () => true,
  releaseLock: async () => {},
});

installMock("../lib/cycleState", {
  getCycleState: async () => null,
  initCycle: async () => {},
  checkRegenPermission: async () => ({ allowed: true }),
  recordRegen: async () => {},
  extractWeeklyFocusItems: () => [],
  advanceWeekAndExtract: async () => ({ advanced: false }),
  shouldExtendCycle: () => false,
  shouldTruncateFirstCycle: () => false,
  getUserTier: async () => "extended",
  computeCurrentWeek: () => 1,
});

installMock("../lib/weeklyFocusSnapshot", {
  refreshWeeklyFocusSnapshotSection: async () => {},
});

installMock("../lib/tokenBudgets", {
  getMaxTokens: () => 2000,
  tierFromLabel: () => "extended",
});

installMock("../lib/budgetExhaustion", {
  isBudgetExceeded: () => false,
  buildGracefulResponse: async () => ({ success: true, graceful: true }),
});

installMock("../lib/lastRegenError", {
  writeLastRegenError: async () => {},
  clearLastRegenError: async () => {},
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

// Mock firebase admin db so _countL2OpusThisMonth's where-chain can run.
// The chain: db.collection("usageLogs").where(...).where(...).where(...).get()
function makeQuery() {
  return {
    where(field, op, value) {
      state.whereCalls.push({ field, op, value });
      return makeQuery();
    },
    async get() {
      return {
        forEach(cb) {
          for (const data of state.usageLogRows) {
            cb({ data: () => data });
          }
        },
      };
    },
  };
}
installMock("../lib/firebase", {
  db: {
    collection: (_name) => ({
      where: (field, op, value) => {
        state.whereCalls.push({ field, op, value });
        return makeQuery();
      },
    }),
  },
});

const grandPrixThinking = require("../api/grandPrixThinking");
const { handler, _countL2OpusThisMonth } = grandPrixThinking;

// ─── B12 checkResume tests ────────────────────────────────────────────────

const TRAJECTORY_STEP1_KEY = "grandPrixTrajectoryStep1";
const OUTPUT_TYPE_TRAJECTORY = "grandPrixTrajectory";

const baseReq = { auth: { uid: "uid-test" }, data: { layer: "trajectory", checkResume: true } };

test("checkResume: canResume=true when step1 exists, no final, hashes match", async () => {
  reset();
  state.cacheRows[TRAJECTORY_STEP1_KEY] = {
    result: { currentStateAnalysis: { current_level: "second" } },
    generatedAt: "2026-05-22T10:00:00.000Z",
    dataSnapshotHash: "hash-current",
  };
  // No final-trajectory cache.

  const res = await handler(baseReq);

  assert.equal(res.success, true);
  assert.equal(res.mode, "checkResume");
  assert.equal(res.canResume, true);
  assert.equal(res.step1GeneratedAt, "2026-05-22T10:00:00.000Z");
  assert.equal(res.finalTrajectoryGeneratedAt, null);
  assert.equal(state.claudeCallCount, 0, "no Claude call fired");
});

test("checkResume: canResume=false when final-trajectory cache is newer than step1", async () => {
  reset();
  state.cacheRows[TRAJECTORY_STEP1_KEY] = {
    result: { currentStateAnalysis: { current_level: "second" } },
    generatedAt: "2026-05-20T10:00:00.000Z",
    dataSnapshotHash: "hash-current",
  };
  state.cacheRows[OUTPUT_TYPE_TRAJECTORY] = {
    result: { activePath: "ambitious" },
    generatedAt: "2026-05-21T10:00:00.000Z",
    dataSnapshotHash: "hash-current",
  };

  const res = await handler(baseReq);

  assert.equal(res.success, true);
  assert.equal(res.canResume, false, "a fresher final trajectory means a prior resume completed");
  assert.equal(state.claudeCallCount, 0);
});

test("checkResume: canResume=false when step1 hash is stale", async () => {
  reset();
  // Step 1 cache exists but for an earlier data snapshot (rider added a
  // debrief between steps). cacheManager.getCache filters this out.
  state.cacheRows[TRAJECTORY_STEP1_KEY] = {
    result: { currentStateAnalysis: { current_level: "second" } },
    generatedAt: "2026-05-22T10:00:00.000Z",
    dataSnapshotHash: "hash-stale",
  };

  const res = await handler(baseReq);

  assert.equal(res.success, true);
  assert.equal(res.canResume, false, "stale hash must not be resumable");
  assert.equal(res.step1GeneratedAt, null, "no usable step1 → null");
  assert.equal(state.claudeCallCount, 0);
});

test("checkResume: canResume=false when no step1 cache exists at all", async () => {
  reset();
  // Empty cacheRows — nothing to resume.

  const res = await handler(baseReq);

  assert.equal(res.success, true);
  assert.equal(res.canResume, false);
  assert.equal(res.step1GeneratedAt, null);
  assert.equal(res.finalTrajectoryGeneratedAt, null);
  assert.equal(state.claudeCallCount, 0);
});

test("checkResume: handler returns without firing any Claude call", async () => {
  reset();
  state.cacheRows[TRAJECTORY_STEP1_KEY] = {
    result: { currentStateAnalysis: { current_level: "second" } },
    generatedAt: "2026-05-22T10:00:00.000Z",
    dataSnapshotHash: "hash-current",
  };

  await handler(baseReq);

  assert.equal(state.claudeCallCount, 0,
    "checkResume is metadata-only — callClaude must not be invoked");
});

// ─── B13 _countL2OpusThisMonth tests ─────────────────────────────────────

test("_countL2OpusThisMonth: counts only Opus model rows from current month", async () => {
  reset();
  state.usageLogRows = [
    { model: "claude-opus-4-6", timestamp: "2026-05-01T00:00:00Z" },
    { model: "claude-opus-4-6", timestamp: "2026-05-15T00:00:00Z" },
    { model: "claude-opus-4-6", timestamp: "2026-05-20T00:00:00Z" },
    // The query already filtered by timestamp ≥ monthStart, so the snapshot
    // wouldn't include April rows in real Firestore. The post-filter only
    // sees what the query returned. We simulate that contract here.
  ];

  const count = await _countL2OpusThisMonth("uid-test");
  assert.equal(count, 3);
});

test("_countL2OpusThisMonth: builds query with timestamp range filter for current UTC month", async () => {
  reset();
  state.usageLogRows = [];

  await _countL2OpusThisMonth("uid-test");

  // Spec: third where() is timestamp >= "YYYY-MM-01T00:00:00.000Z"
  const tsWhere = state.whereCalls.find((w) => w.field === "timestamp");
  assert.ok(tsWhere, "must include a where() on timestamp");
  assert.equal(tsWhere.op, ">=");
  const now = new Date();
  const expectedMonthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01T00:00:00.000Z`;
  assert.equal(tsWhere.value, expectedMonthStart);

  // Sanity: uid + context filters also present
  assert.ok(state.whereCalls.find((w) => w.field === "uid" && w.op === "==" && w.value === "uid-test"));
  assert.ok(state.whereCalls.find((w) => w.field === "context" && w.op === "==" && w.value === "trajectory-call1-state-analysis"));
});

test("_countL2OpusThisMonth: excludes Sonnet rows from the count (post-filter)", async () => {
  reset();
  state.usageLogRows = [
    { model: "claude-opus-4-6", timestamp: "2026-05-15T00:00:00Z" },
    { model: "claude-sonnet-4-5-20250929", timestamp: "2026-05-15T00:00:00Z" },
    { model: "claude-sonnet-4-6", timestamp: "2026-05-20T00:00:00Z" },
  ];

  const count = await _countL2OpusThisMonth("uid-test");
  assert.equal(count, 1, "only the Opus row should count");
});
