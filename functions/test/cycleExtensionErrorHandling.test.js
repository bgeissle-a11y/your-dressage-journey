/**
 * H7 — Cycle-extension error path hardening.
 *
 * Both physicalGuidance.js and grandPrixThinking.js have a cycle-extension
 * branch that runs when forceRefresh:true and the user isn't on the top tier.
 * If shouldExtendCycle, getStaleCache, or the follow-up getCycleState throw,
 * the handler must fall through to fresh generation rather than surfacing a
 * hard failure to the rider. The cost of taking the fresh-gen path is
 * ≤$0.10/case; the cost of an error message is rider-trust.
 *
 * Test strategy: mock dependencies so each handler reaches the extension
 * branch with forceRefresh:true and tier≠"top". Force the extension branch
 * to throw (or succeed normally for the regression case), then assert:
 *   - the handler did NOT throw
 *   - we proceeded past the extension branch (tryAcquireLock mock returns
 *     false, so the response shape includes regenerating:true,noCache:true)
 *   - console.warn fired with the expected log line for error cases
 *
 * Run with:  node --test functions/test/cycleExtensionErrorHandling.test.js
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

// Mutable state — reset before each case so mocks can be reconfigured.
const DEFAULT_CYCLE_STATE = {
  status: "expired",
  cycleStartDate: "2026-04-01T00:00:00.000Z",
  currentWeek: 4,
};

const state = {
  shouldExtendCycleImpl: async () => false,
  // getStaleCacheImpl receives (callIndex, ...args). Default: null on all calls.
  getStaleCacheImpl: async () => null,
  getStaleCacheCallCount: 0,
  // getCycleStateImpl receives (callIndex, ...args). Default: returns the
  // standard expired cycle state on every call.
  getCycleStateImpl: async () => DEFAULT_CYCLE_STATE,
  getCycleStateCallCount: 0,
  tryAcquireLockImpl: async () => false, // false → handler short-circuits with noCache:true
  warnMessages: [],
};

function reset() {
  state.shouldExtendCycleImpl = async () => false;
  state.getStaleCacheImpl = async () => null;
  state.getStaleCacheCallCount = 0;
  state.getCycleStateImpl = async () => DEFAULT_CYCLE_STATE;
  state.getCycleStateCallCount = 0;
  state.tryAcquireLockImpl = async () => false;
  state.warnMessages = [];
}

// ─── Mocks shared by both handlers ────────────────────────────────────────

installMock("../lib/auth", {
  validateAuth: (req) => req?.auth?.uid || "uid-test",
});

installMock("../lib/loadSubscription", {
  enforceCapability: async () => ({ tier: "medium", isPilot: false }),
});

installMock("../lib/entitlements", {
  CAPABILITIES: {
    generateGrandPrixThinking: "generateGrandPrixThinking",
    regenerateGrandPrixThinking: "regenerateGrandPrixThinking",
    generatePhysicalGuidance: "generatePhysicalGuidance",
    regeneratePhysicalGuidance: "regeneratePhysicalGuidance",
  },
});

installMock("../lib/errors", {
  wrapError: (err) => err,
});

installMock("../lib/prepareRiderData", {
  prepareRiderData: async (uid) => ({
    uid,
    dataTier: 2,
    tier: { label: "medium" },
    dataSnapshot: { hash: "hash-current", debriefCount: 6, assessmentCount: 1 },
    horseProfiles: [{ horseName: "Star" }],
    horseSummaries: [{ name: "Star" }],
    selfAssessments: {
      physical: { hasAssessment: true, kinestheticLevel: 5, bodyMapping: {} },
    },
  }),
});

installMock("../lib/claudeCall", {
  callClaude: async () => {
    throw new Error("Claude should not be called in cycle-extension tests");
  },
});

installMock("../lib/promptBuilder", {
  buildGPTL1Prompt: () => ({ system: "sys", userMessage: "msg" }),
  buildTrajectoryCall1Prompt: () => ({ system: "sys", userMessage: "msg" }),
  buildTrajectoryCall2Prompt: () => ({ system: "sys", userMessage: "msg" }),
  buildTrajectoryCall3Prompt: () => ({ system: "sys", userMessage: "msg" }),
  buildTrajectoryCall4Prompt: () => ({ system: "sys", userMessage: "msg" }),
  buildPhysicalGuidancePrompt: () => ({ system: "sys", userMessage: "msg" }),
});

installMock("../lib/testDatabase", {
  buildTestDatabaseContext: () => "",
});

installMock("../lib/cacheManager", {
  getCache: async () => null,
  setCache: async () => {},
  getStaleCache: async (...args) => {
    state.getStaleCacheCallCount += 1;
    return state.getStaleCacheImpl(state.getStaleCacheCallCount, ...args);
  },
});

installMock("../lib/generationStatus", {
  getStatus: async () => null,
});

installMock("../lib/inflightLock", {
  tryAcquireLock: async (...args) => state.tryAcquireLockImpl(...args),
  releaseLock: async () => {},
});

installMock("../lib/cycleState", {
  getCycleState: async (...args) => {
    state.getCycleStateCallCount += 1;
    return state.getCycleStateImpl(state.getCycleStateCallCount, ...args);
  },
  initCycle: async () => {},
  checkRegenPermission: async () => ({ allowed: true }),
  recordRegen: async () => {},
  extractWeeklyFocusItems: () => [],
  advanceWeekAndExtract: async () => ({ advanced: false }),
  shouldExtendCycle: async (...args) => state.shouldExtendCycleImpl(...args),
  shouldTruncateFirstCycle: () => false,
  getUserTier: async () => "medium", // non-"top" so extension branch fires
  computeCurrentWeek: () => 1,
});

installMock("../lib/weeklyFocusSnapshot", {
  refreshWeeklyFocusSnapshotSection: async () => {},
});

installMock("../lib/tokenBudgets", {
  getMaxTokens: () => 5000,
  tierFromLabel: () => "medium",
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

installMock("../lib/firebase", {
  db: {
    collection: () => ({
      where: () => ({
        where: () => ({
          where: () => ({
            get: async () => ({ forEach: () => {} }),
          }),
        }),
      }),
    }),
  },
});

// Spy on console.warn so we can assert the correct log lines fire.
const originalWarn = console.warn;
console.warn = (...args) => {
  state.warnMessages.push(args.map(String).join(" "));
};

// Suppress console.log noise from handlers.
const originalLog = console.log;
console.log = () => {};

const gptModule = require("../api/grandPrixThinking");
const physicalModule = require("../api/physicalGuidance");

const baseReq = {
  auth: { uid: "uid-test" },
  data: { layer: "mental", forceRefresh: true },
};

const physicalReq = {
  auth: { uid: "uid-test" },
  data: { forceRefresh: true },
};

// ─── GPT L1 — error path tests ────────────────────────────────────────────

test("gpt-l1: shouldExtendCycle throws → handler falls through, warn fires", async () => {
  reset();
  state.shouldExtendCycleImpl = async () => {
    throw new Error("debriefs query failed");
  };

  const res = await gptModule.handler(baseReq);

  // tryAcquireLock returns false → handler short-circuits with noCache:true.
  // The fact that we got there proves we fell through the extension branch.
  assert.equal(res.success, false);
  assert.equal(res.regenerating, true);
  assert.equal(res.noCache, true);

  // Warn line proves the catch fired (not the happy path).
  assert.ok(
    state.warnMessages.some((m) => m.includes("[gpt-l1] Cycle-extension flow failed")),
    `expected warn for cycle-extension failure, got: ${JSON.stringify(state.warnMessages)}`
  );
});

test("gpt-l1: getStaleCache throws after extend=true → handler falls through", async () => {
  reset();
  state.shouldExtendCycleImpl = async () => true;
  // Only the FIRST getStaleCache call (inside extension branch) throws.
  // Later calls (in-flight contention branch) succeed normally so the
  // handler can complete its fall-through to the lock-failed response.
  state.getStaleCacheImpl = async (callIndex) => {
    if (callIndex === 1) throw new Error("stale cache read failed");
    return null;
  };

  const res = await gptModule.handler(baseReq);

  assert.equal(res.success, false);
  assert.equal(res.regenerating, true);
  assert.ok(
    state.warnMessages.some((m) => m.includes("[gpt-l1] Cycle-extension flow failed")),
    "expected warn for stale-cache failure"
  );
});

test("gpt-l1: post-extension getCycleState throws → handler falls through", async () => {
  reset();
  state.shouldExtendCycleImpl = async () => true;
  state.getStaleCacheImpl = async () => ({
    result: { selectedPath: { weeks: [] } },
    generatedAt: "2026-04-01T00:00:00.000Z",
  });
  // generateMentalLayer makes a getCycleState call before the cache check
  // (line 243), one inside the extension branch (line 310), and one inside
  // the in-flight contention branch (line 343). Throw only on the second.
  state.getCycleStateImpl = async (callIndex) => {
    if (callIndex === 2) throw new Error("cycle state read failed");
    return DEFAULT_CYCLE_STATE;
  };

  const res = await gptModule.handler(baseReq);

  // Fall-through is successful: extension branch failed (extended:true must
  // NOT be set), the warn fired, and the handler continued without throwing.
  // The downstream in-flight contention branch may legitimately return
  // success:true with stale cache — either outcome is acceptable.
  assert.notEqual(res, undefined);
  assert.notEqual(res.extended, true, "extension branch must not have returned its response");
  assert.ok(
    state.warnMessages.some((m) => m.includes("[gpt-l1] Cycle-extension flow failed")),
    "expected warn for post-extension cycle-state failure"
  );
});

test("gpt-l1: happy path — extension succeeds, returns extended:true (regression guard)", async () => {
  reset();
  state.shouldExtendCycleImpl = async () => true;
  state.getStaleCacheImpl = async () => ({
    result: { selectedPath: { weeks: [{ assignments: [] }] }, weeklyAssignments: [] },
    generatedAt: "2026-04-01T00:00:00.000Z",
  });

  const res = await gptModule.handler(baseReq);

  assert.equal(res.success, true);
  assert.equal(res.extended, true);
  assert.equal(res.fromCache, true);
  // No warn lines on the happy path.
  assert.equal(
    state.warnMessages.filter((m) => m.includes("Cycle-extension flow failed")).length,
    0,
    "no extension-failure warn on the happy path"
  );
});

// ─── Physical Guidance — error path tests ────────────────────────────────

test("physical: shouldExtendCycle throws → handler falls through, warn fires", async () => {
  reset();
  state.shouldExtendCycleImpl = async () => {
    throw new Error("debriefs query failed");
  };

  const res = await physicalModule.handler(physicalReq);

  assert.equal(res.success, false);
  assert.equal(res.regenerating, true);
  assert.equal(res.noCache, true);
  assert.ok(
    state.warnMessages.some((m) => m.includes("[physical] Cycle-extension flow failed")),
    `expected warn for cycle-extension failure, got: ${JSON.stringify(state.warnMessages)}`
  );
});

test("physical: getStaleCache throws after extend=true → handler falls through", async () => {
  reset();
  state.shouldExtendCycleImpl = async () => true;
  // First call is inside the extension branch (line 171); subsequent calls
  // (in-flight contention branch) succeed so the handler can complete.
  state.getStaleCacheImpl = async (callIndex) => {
    if (callIndex === 1) throw new Error("stale cache read failed");
    return null;
  };

  const res = await physicalModule.handler(physicalReq);

  assert.equal(res.success, false);
  assert.equal(res.regenerating, true);
  assert.ok(
    state.warnMessages.some((m) => m.includes("[physical] Cycle-extension flow failed")),
    "expected warn for stale-cache failure"
  );
});

test("physical: post-extension getCycleState throws → handler falls through", async () => {
  reset();
  state.shouldExtendCycleImpl = async () => true;
  state.getStaleCacheImpl = async () => ({
    result: { weeks: [] },
    generatedAt: "2026-04-01T00:00:00.000Z",
  });
  // physicalGuidance.handler calls getCycleState at line 132 (initial), line
  // 172 (inside extension branch), and line 192 (in-flight contention).
  // Throw only on the second call.
  state.getCycleStateImpl = async (callIndex) => {
    if (callIndex === 2) throw new Error("cycle state read failed");
    return DEFAULT_CYCLE_STATE;
  };

  const res = await physicalModule.handler(physicalReq);

  // Fall-through is successful: extension branch failed (extended:true must
  // NOT be set), the warn fired, and the handler continued without throwing.
  assert.notEqual(res, undefined);
  assert.notEqual(res.extended, true, "extension branch must not have returned its response");
  assert.ok(
    state.warnMessages.some((m) => m.includes("[physical] Cycle-extension flow failed")),
    "expected warn for post-extension cycle-state failure"
  );
});

test("physical: happy path — extension succeeds, returns extended:true (regression guard)", async () => {
  reset();
  state.shouldExtendCycleImpl = async () => true;
  state.getStaleCacheImpl = async () => ({
    result: { weeks: [{ patterns: [] }], exerciseProtocol: {} },
    generatedAt: "2026-04-01T00:00:00.000Z",
  });

  const res = await physicalModule.handler(physicalReq);

  assert.equal(res.success, true);
  assert.equal(res.extended, true);
  assert.equal(res.fromCache, true);
  assert.equal(
    state.warnMessages.filter((m) => m.includes("Cycle-extension flow failed")).length,
    0,
    "no extension-failure warn on the happy path"
  );
});

// Restore console after suite
test("cleanup: restore console", () => {
  console.warn = originalWarn;
  console.log = originalLog;
});
