/**
 * Regression guard — Physical Guidance budgets per the 2026-06-05 incident.
 *
 * Both Physical calls truncated at 5000 tokens in production: Call 1
 * (exercise-protocol) dropped the pre-ride ritual + body-awareness profile +
 * a 5th exercise; Call 2 (body-awareness) cut off week 4 of the 4-week
 * program. The repaired-but-partial document was cached and the cycle marked
 * fresh, so the rider got a half-built program with no error.
 *
 * Remedy mirrors journey-map-synthesis (H13, 2026-05-23): raise the cap to
 * 8000. If anyone walks these back, this test fires before deploy.
 *
 * Run with:  node --test functions/test/tokenBudgets.physical.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { getMaxTokens } = require("../lib/tokenBudgets");

test("physical-protocol budgets per 2026-06-05 incident", () => {
  assert.strictEqual(getMaxTokens("physical-protocol", "medium"), 8000);
  assert.strictEqual(getMaxTokens("physical-protocol", "extended"), 8000);
  // Pilots map to extended budgets per CLAUDE.md.
  assert.strictEqual(getMaxTokens("physical-protocol", "pilot"), 8000);
});

test("physical-awareness budgets per 2026-06-05 incident", () => {
  assert.strictEqual(getMaxTokens("physical-awareness", "medium"), 8000);
  assert.strictEqual(getMaxTokens("physical-awareness", "extended"), 8000);
  assert.strictEqual(getMaxTokens("physical-awareness", "pilot"), 8000);
});

test("Physical Guidance stays gated away from the working tier", () => {
  // Physical Guidance is a Medium+ output; working must throw, not silently
  // fall back to a budget.
  assert.throws(() => getMaxTokens("physical-protocol", "working"));
  assert.throws(() => getMaxTokens("physical-awareness", "working"));
});
