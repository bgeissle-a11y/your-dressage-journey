/**
 * H13 regression guard — journey-map-synthesis budgets per spec (2026-05-23).
 *
 * Synthesis is the Journey Map call most prone to truncation under Medium /
 * Extended data volumes. Working stays at 4000; Medium and Extended are
 * 8000. If anyone walks these back, this test fires before deploy.
 *
 * Run with:  node --test functions/test/tokenBudgets.journeyMap.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { getMaxTokens } = require("../lib/tokenBudgets");

test("journey-map-synthesis budgets per H13 (2026-05-23)", () => {
  assert.strictEqual(getMaxTokens("journey-map-synthesis", "working"), 4000);
  assert.strictEqual(getMaxTokens("journey-map-synthesis", "medium"), 8000);
  assert.strictEqual(getMaxTokens("journey-map-synthesis", "extended"), 8000);
});

test("journey-map-narrative budgets unchanged", () => {
  assert.strictEqual(getMaxTokens("journey-map-narrative", "working"), 2000);
  assert.strictEqual(getMaxTokens("journey-map-narrative", "medium"), 2000);
  assert.strictEqual(getMaxTokens("journey-map-narrative", "extended"), 2000);
});

test("journey-map-visualization budgets unchanged", () => {
  assert.strictEqual(getMaxTokens("journey-map-visualization", "working"), 2000);
  assert.strictEqual(getMaxTokens("journey-map-visualization", "medium"), 2000);
  assert.strictEqual(getMaxTokens("journey-map-visualization", "extended"), 2000);
});
