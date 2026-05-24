/**
 * B30 — EP-3 movement validation.
 *
 * Pure-function tests for `extractReferencedMovementNumbers` and
 * `validateEP3Movements`. The handler-level retry loop is covered by
 * the live smoke test in deploy step 6.
 *
 * Run with:  node --test functions/test/eventPlannerValidators.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

function installMock(relPath, fromDir, exportsObj) {
  const abs = require.resolve(relPath, { paths: [path.resolve(__dirname, fromDir)] });
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

// Stub every lib dependency eventPlanner.js loads at module-eval time so
// the import doesn't try to bootstrap firebase-admin in the test env. The
// handler isn't exercised here — only the pure validators.
installMock("../lib/firebase", "../api", { db: {} });
installMock("../lib/auth", "../api", { validateAuth: () => "", validateOwnership: async () => ({}) });
installMock("../lib/loadSubscription", "../api", { enforceCapability: async () => ({}) });
installMock("../lib/entitlements", "../api", { CAPABILITIES: { generateShowPrepPlan: "x" } });
installMock("../lib/errors", "../api", { wrapError: (e) => e });
installMock("../lib/prepareRiderData", "../api", { prepareRiderData: async () => ({}) });
installMock("../lib/claudeCall", "../api", { callClaude: async () => ({}) });
installMock("../lib/promptBuilder", "../api", { buildEventPlannerPrompt: () => ({ system: "", userMessage: "" }) });
installMock("../lib/testDatabase", "../api", { buildDetailedTestContext: () => ({}), inferLevelFromTests: () => "" });
installMock("../lib/cacheManager", "../api", { getCache: async () => null, setCache: async () => {}, getStaleCache: async () => null });
installMock("../lib/inflightLock", "../api", { tryAcquireLock: async () => true, releaseLock: async () => {} });
installMock("../lib/tokenBudgets", "../api", { getMaxTokens: () => 3000, tierFromLabel: () => "medium" });
installMock("../lib/showPlanQuota", "../api", { enforceShowPlanQuota: async () => {}, markPlanGenerationStarted: async () => {} });
installMock("firebase-functions/v2/https", "../api", {
  HttpsError: class HttpsError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  },
});

const {
  extractReferencedMovementNumbers,
  validateEP3Movements,
} = require("../api/eventPlanner");

// ── extractReferencedMovementNumbers ───────────────────────────────────────

test("extractReferencedMovementNumbers: finds all three reference forms", () => {
  const text = "Practice movement 3 carefully. Then move on to Movement 10 and movement #12.";
  const nums = extractReferencedMovementNumbers(text);
  assert.deepEqual([...nums].sort((a, b) => a - b), [3, 10, 12]);
});

test("extractReferencedMovementNumbers: empty set on text with no references", () => {
  const nums = extractReferencedMovementNumbers("Focus on the half-pass and your collected canter.");
  assert.equal(nums.size, 0);
});

test("extractReferencedMovementNumbers: walks nested mental/technical/physical arrays", () => {
  const plan = {
    weeks: [
      {
        mental: [
          { title: "Focus", body: "Visualize Movement 5 in the warm-up.", cue: "" },
        ],
        technical: [
          { title: "Test rehearsal", body: "Movement #7 needs more time.", cue: "movement 9 transition" },
        ],
        physical: [
          { title: "Core", body: "No movement reference here.", cue: "" },
        ],
      },
    ],
  };
  const nums = extractReferencedMovementNumbers(plan);
  assert.deepEqual([...nums].sort((a, b) => a - b), [5, 7, 9]);
});

test("extractReferencedMovementNumbers: number reference matches movement number 7 form", () => {
  const nums = extractReferencedMovementNumbers("See movement number 7 for context.");
  assert.deepEqual([...nums], [7]);
});

// ── validateEP3Movements ───────────────────────────────────────────────────

test("validateEP3Movements: ok when EP-1 has no numbered movements", () => {
  const plan = { weeks: [{ mental: [{ body: "Movement 99 doesn't exist" }] }] };
  const test = { tests: [{ movements: [{ /* no number */ }] }] };
  const result = validateEP3Movements(plan, test);
  assert.deepEqual(result, { ok: true });
});

test("validateEP3Movements: ok when all referenced numbers exist", () => {
  const plan = { weeks: [{ mental: [{ body: "Practice movement 3 and Movement 5." }] }] };
  const test = { tests: [{ movements: [{ number: 1 }, { number: 3 }, { number: 5 }, { number: 7 }] }] };
  const result = validateEP3Movements(plan, test);
  assert.deepEqual(result, { ok: true });
});

test("validateEP3Movements: not ok when EP-3 references missing movement number", () => {
  const plan = { weeks: [{ technical: [{ body: "Refine movement 10 before the test." }] }] };
  const test = { tests: [{ movements: [{ number: 1 }, { number: 2 }, { number: 3 }] }] };
  const result = validateEP3Movements(plan, test);
  assert.equal(result.ok, false);
  assert.deepEqual(result.invalid, [10]);
  assert.deepEqual(result.validNumbers.sort((a, b) => a - b), [1, 2, 3]);
});

test("validateEP3Movements: handles missing tests array gracefully (ok=true)", () => {
  const plan = { weeks: [{ mental: [{ body: "any movement 1" }] }] };
  assert.deepEqual(validateEP3Movements(plan, {}), { ok: true });
  assert.deepEqual(validateEP3Movements(plan, null), { ok: true });
});

test("validateEP3Movements: handles empty preparationPlan", () => {
  const test = { tests: [{ movements: [{ number: 1 }, { number: 2 }] }] };
  assert.deepEqual(validateEP3Movements({}, test), { ok: true });
});
