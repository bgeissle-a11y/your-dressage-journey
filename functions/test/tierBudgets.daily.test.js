/**
 * H4 — Tier-aware daily Claude call limit resolver.
 *
 * Verifies getDailyCallLimit() returns the right cap per tier and respects
 * environment overrides. Pilot/pilot-grace map to Extended (full access
 * during pilot window). Unknown/null tiers fall back to the backstop.
 *
 * Run with:  node --test functions/test/tierBudgets.daily.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { getDailyCallLimit } = require("../lib/tierBudgets");

// Save env keys we may mutate so afterEach can restore them.
const ENV_KEYS = [
  "TIER_WORKING_DAILY_CALL_LIMIT",
  "TIER_MEDIUM_DAILY_CALL_LIMIT",
  "TIER_EXTENDED_DAILY_CALL_LIMIT",
  "DEFAULT_DAILY_CALL_LIMIT",
];

function snapshotEnv() {
  const snap = {};
  for (const k of ENV_KEYS) snap[k] = process.env[k];
  return snap;
}
function restoreEnv(snap) {
  for (const k of ENV_KEYS) {
    if (snap[k] === undefined) delete process.env[k];
    else process.env[k] = snap[k];
  }
}

test("getDailyCallLimit: working tier → 30", () => {
  const snap = snapshotEnv();
  for (const k of ENV_KEYS) delete process.env[k]; // ensure defaults
  try {
    assert.equal(getDailyCallLimit("working"), 30);
  } finally { restoreEnv(snap); }
});

test("getDailyCallLimit: medium tier → 60", () => {
  const snap = snapshotEnv();
  for (const k of ENV_KEYS) delete process.env[k];
  try {
    assert.equal(getDailyCallLimit("medium"), 60);
  } finally { restoreEnv(snap); }
});

test("getDailyCallLimit: extended tier → 100", () => {
  const snap = snapshotEnv();
  for (const k of ENV_KEYS) delete process.env[k];
  try {
    assert.equal(getDailyCallLimit("extended"), 100);
  } finally { restoreEnv(snap); }
});

test("getDailyCallLimit: pilot maps to Extended (100)", () => {
  const snap = snapshotEnv();
  for (const k of ENV_KEYS) delete process.env[k];
  try {
    assert.equal(getDailyCallLimit("pilot"), 100);
  } finally { restoreEnv(snap); }
});

test("getDailyCallLimit: pilot-grace maps to Extended (100)", () => {
  const snap = snapshotEnv();
  for (const k of ENV_KEYS) delete process.env[k];
  try {
    assert.equal(getDailyCallLimit("pilot-grace"), 100);
  } finally { restoreEnv(snap); }
});

test("getDailyCallLimit: null → backstop 30", () => {
  const snap = snapshotEnv();
  for (const k of ENV_KEYS) delete process.env[k];
  try {
    assert.equal(getDailyCallLimit(null), 30);
  } finally { restoreEnv(snap); }
});

test("getDailyCallLimit: unknown tier string → backstop 30", () => {
  const snap = snapshotEnv();
  for (const k of ENV_KEYS) delete process.env[k];
  try {
    assert.equal(getDailyCallLimit("garbage"), 30);
  } finally { restoreEnv(snap); }
});

test("getDailyCallLimit: env override applies (TIER_MEDIUM_DAILY_CALL_LIMIT=75)", () => {
  const snap = snapshotEnv();
  try {
    process.env.TIER_MEDIUM_DAILY_CALL_LIMIT = "75";
    assert.equal(getDailyCallLimit("medium"), 75);
  } finally { restoreEnv(snap); }
});

test("getDailyCallLimit: garbage env value falls back to default", () => {
  const snap = snapshotEnv();
  try {
    process.env.TIER_MEDIUM_DAILY_CALL_LIMIT = "abc";
    assert.equal(getDailyCallLimit("medium"), 60, "non-numeric → default");

    process.env.TIER_MEDIUM_DAILY_CALL_LIMIT = "0";
    assert.equal(getDailyCallLimit("medium"), 60, "0 is not > 0 → default");

    process.env.TIER_MEDIUM_DAILY_CALL_LIMIT = "-5";
    assert.equal(getDailyCallLimit("medium"), 60, "negative → default");
  } finally { restoreEnv(snap); }
});
