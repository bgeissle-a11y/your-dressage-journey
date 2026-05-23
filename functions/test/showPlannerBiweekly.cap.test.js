/**
 * B11 — Show Planner bi-weekly cron global spend cap.
 *
 * Verifies _runFire honors both the plan-count cap and the USD spend cap,
 * tallies correctly across generated/skipped/error outcomes, and surfaces
 * planIds only when collectPlanIds is true.
 *
 * Run with:  node --test functions/test/showPlannerBiweekly.cap.test.js
 *
 * The lib mocks below stub the dependencies showPlannerBiweeklyContent
 * pulls in so the module loads under node:test. The cap tests then drive
 * behavior through the _runFire injection seams (capOverrides,
 * _queryActivePlans, _processPlan) rather than mutating require.cache —
 * cleaner per-test control without module-resolution churn.
 */

const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

function installMock(relPath, exportsObj) {
  const abs = require.resolve(relPath, { paths: [path.resolve(__dirname, "../api")] });
  require.cache[abs] = {
    id: abs, filename: abs, loaded: true, exports: exportsObj,
    children: [], parent: null, paths: [],
  };
}

// Module-load stubs — _runFire only cares about the injected impls in tests,
// but require()-ing the module still resolves these.
installMock("../lib/firebase", {
  db: { collection: () => ({ doc: () => ({ get: async () => ({ exists: false, data: () => null }), update: async () => {} }) }) },
});
installMock("firebase-admin/firestore", {
  FieldValue: { arrayUnion: (e) => e, delete: () => null },
});
installMock("../lib/claudeCall", { callClaude: async () => "" });
installMock("../lib/loadSubscription", { loadSubscription: async () => ({ tier: "medium", isPilot: false }) });
installMock("../lib/entitlements", { CAPABILITIES: { generateShowPrepPlan: "x" }, canAccess: () => true });
installMock("../lib/tokenBudgets", { getMaxTokens: () => 3000, tierFromLabel: () => "medium" });

const { _runFire } = require("../api/showPlannerBiweeklyContent");

const NOW = new Date("2026-05-22T12:00:00.000Z");

// Helper: make N fake plan docs (just IDs are needed for the cap tests).
function plans(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `plan-${i + 1}`, userId: `uid-${i + 1}` }));
}

// ─── Tests ─────────────────────────────────────────────────────────────────

test("plan_count_cap aborts immediately at zero limit", async () => {
  const tally = await _runFire(NOW, {
    capOverrides: { maxPlans: 0, maxUsd: 100, estPerPlan: 0.05 },
    _queryActivePlans: async () => plans(3),
    _processPlan: async () => "generated",
  });
  assert.equal(tally.aborted, "plan_count_cap");
  assert.equal(tally.generated, 0);
  assert.equal(tally.skipped, 0);
  assert.equal(tally.error, 0);
});

test("usd_cost_cap aborts after exactly floor(maxUsd / estPerPlan) generations", async () => {
  // $0.10 / $0.05 → 2 successful generates, then the third iteration
  // detects estimatedCostSoFar (2 * 0.05 = 0.10) >= maxUsd and aborts.
  const tally = await _runFire(NOW, {
    capOverrides: { maxPlans: 100, maxUsd: 0.10, estPerPlan: 0.05 },
    _queryActivePlans: async () => plans(5),
    _processPlan: async () => "generated",
  });
  assert.equal(tally.aborted, "usd_cost_cap");
  assert.equal(tally.generated, 2);
});

test("'skipped:duplicate' increments skipped, not generated (cost math stays accurate)", async () => {
  // All 5 plans skipped → generated stays at 0, USD cap never fires.
  const tally = await _runFire(NOW, {
    capOverrides: { maxPlans: 100, maxUsd: 0.10, estPerPlan: 0.05 },
    _queryActivePlans: async () => plans(5),
    _processPlan: async () => "skipped:duplicate",
  });
  assert.equal(tally.aborted, undefined);
  assert.equal(tally.generated, 0);
  assert.equal(tally.skipped, 5);
  assert.equal(tally.error, 0);
});

test("processPlan throwing is caught; loop continues to subsequent plans", async () => {
  let i = 0;
  const tally = await _runFire(NOW, {
    capOverrides: { maxPlans: 100, maxUsd: 100, estPerPlan: 0.05 },
    _queryActivePlans: async () => plans(3),
    _processPlan: async () => {
      i++;
      if (i === 2) throw new Error("synthetic mid-loop failure");
      return "generated";
    },
  });
  assert.equal(tally.aborted, undefined);
  assert.equal(tally.generated, 2, "plans 1 and 3 still generated");
  assert.equal(tally.error, 1, "plan 2 counted as error");
  assert.equal(tally.skipped, 0);
});

test("collectPlanIds=true populates planIds with {id, outcome}; false omits", async () => {
  const planList = plans(3);
  let i = 0;
  const tallyWith = await _runFire(NOW, {
    collectPlanIds: true,
    capOverrides: { maxPlans: 100, maxUsd: 100, estPerPlan: 0.05 },
    _queryActivePlans: async () => planList,
    _processPlan: async () => {
      i++;
      return i === 2 ? "skipped:no-precis" : "generated";
    },
  });
  assert.deepEqual(tallyWith.planIds, [
    { id: "plan-1", outcome: "generated" },
    { id: "plan-2", outcome: "skipped:no-precis" },
    { id: "plan-3", outcome: "generated" },
  ]);

  const tallyWithout = await _runFire(NOW, {
    capOverrides: { maxPlans: 100, maxUsd: 100, estPerPlan: 0.05 },
    _queryActivePlans: async () => planList,
    _processPlan: async () => "generated",
  });
  assert.equal(tallyWithout.planIds, undefined);
});

test("empty plan list returns zero-tally with no aborted field", async () => {
  const tally = await _runFire(NOW, {
    capOverrides: { maxPlans: 100, maxUsd: 100, estPerPlan: 0.05 },
    _queryActivePlans: async () => [],
    _processPlan: async () => "generated",
  });
  assert.deepEqual(tally, { generated: 0, skipped: 0, error: 0 });
});

test("planIds collected up to abort point include the boundary plan", async () => {
  // Cap at 1 plan → first iteration generates, second iteration aborts
  // BEFORE calling processPlan, so planIds should have just one entry.
  const tally = await _runFire(NOW, {
    collectPlanIds: true,
    capOverrides: { maxPlans: 1, maxUsd: 100, estPerPlan: 0.05 },
    _queryActivePlans: async () => plans(3),
    _processPlan: async () => "generated",
  });
  assert.equal(tally.aborted, "plan_count_cap");
  assert.equal(tally.generated, 1);
  assert.equal(tally.planIds.length, 1);
  assert.deepEqual(tally.planIds[0], { id: "plan-1", outcome: "generated" });
});
