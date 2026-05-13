/**
 * Smoke test: Phase 6 rules (cooldown / Opus cap / Working max-1-monthly).
 *
 * Pure logic only — no Firestore. Exercises the rule predicates the
 * handlers depend on. Run: `node scripts/smokePhase6.cjs`
 */

const path = require("path");

// We load modules with stubbed env where it matters. To exercise multiple
// env settings we delete-and-re-require — module init reads env once.
function freshRequire(rel) {
  const p = path.join(__dirname, "..", "functions", rel);
  delete require.cache[require.resolve(p)];
  return require(p);
}

let failures = 0;
let passes = 0;

function assert(label, actual, expected) {
  if (actual === expected) passes++;
  else {
    failures++;
    console.error(`✗ ${label}\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(actual)}`);
  }
}

console.log("── 6a: Multi-Voice cooldown env ──");
// Default: 4h
delete process.env.MULTIVOICE_COOLDOWN_HOURS;
let regen = freshRequire("api/dataTriggeredRegeneration.js");
assert("default cooldown = 4h", regen.MULTIVOICE_COOLDOWN_HOURS, 4);
assert("default cooldown ms  = 14400000", regen.REGEN_COOLDOWN_MS, 14400000);

// Override to 8h
process.env.MULTIVOICE_COOLDOWN_HOURS = "8";
regen = freshRequire("api/dataTriggeredRegeneration.js");
assert("env override = 8h", regen.MULTIVOICE_COOLDOWN_HOURS, 8);
assert("env override ms = 28800000", regen.REGEN_COOLDOWN_MS, 28800000);

// Override to 0.5h (30 min)
process.env.MULTIVOICE_COOLDOWN_HOURS = "0.5";
regen = freshRequire("api/dataTriggeredRegeneration.js");
assert("env fractional 0.5h", regen.MULTIVOICE_COOLDOWN_HOURS, 0.5);
assert("env fractional ms 1800000", regen.REGEN_COOLDOWN_MS, 1800000);

// Reset for downstream tests
delete process.env.MULTIVOICE_COOLDOWN_HOURS;

console.log("── 6c: _regenCompletedThisMonth (Working max-1-monthly rule) ──");
regen = freshRequire("api/dataTriggeredRegeneration.js");
const FN = regen._regenCompletedThisMonth;

const NOW = new Date("2026-05-11T15:00:00Z");
assert("null status → false", FN(null, NOW), false);
assert("status with no completedAt → false", FN({ status: "in_progress" }, NOW), false);
assert("invalid completedAt → false", FN({ completedAt: "garbage" }, NOW), false);
assert(
  "completed earlier same UTC month → true",
  FN({ completedAt: "2026-05-01T00:00:00.000Z" }, NOW),
  true
);
assert(
  "completed later same UTC month → true",
  FN({ completedAt: "2026-05-30T23:59:59.000Z" }, NOW),
  true
);
assert(
  "completed previous UTC month → false",
  FN({ completedAt: "2026-04-30T23:59:59.000Z" }, NOW),
  false
);
assert(
  "completed previous UTC year → false",
  FN({ completedAt: "2025-12-31T23:59:59.000Z" }, NOW),
  false
);
assert(
  "completed future month → false",
  FN({ completedAt: "2026-06-01T00:00:00.000Z" }, NOW),
  false
);
// UTC boundary case: completedAt is "2026-05-01T00:00:00Z" — last second of
// April in some local zones but May in UTC. We use UTC throughout.
assert(
  "May 1 00:00:00 UTC → true (UTC, not local)",
  FN({ completedAt: "2026-05-01T00:00:00.000Z" }, NOW),
  true
);

console.log("── 6b: GPT_L2_OPUS_MONTHLY_CAP env parsing ──");
delete process.env.GPT_L2_OPUS_MONTHLY_CAP;
let gpt = freshRequire("api/grandPrixThinking.js");
assert("default cap = 4", gpt.GPT_L2_OPUS_MONTHLY_CAP, 4);

process.env.GPT_L2_OPUS_MONTHLY_CAP = "10";
gpt = freshRequire("api/grandPrixThinking.js");
assert("env cap = 10", gpt.GPT_L2_OPUS_MONTHLY_CAP, 10);

process.env.GPT_L2_OPUS_MONTHLY_CAP = "0";
gpt = freshRequire("api/grandPrixThinking.js");
assert("env cap = 0 (disabled)", gpt.GPT_L2_OPUS_MONTHLY_CAP, 0);

process.env.GPT_L2_OPUS_MONTHLY_CAP = "-3";
gpt = freshRequire("api/grandPrixThinking.js");
assert("negative env clamped to 0", gpt.GPT_L2_OPUS_MONTHLY_CAP, 0);

process.env.GPT_L2_OPUS_MONTHLY_CAP = "not-a-number";
gpt = freshRequire("api/grandPrixThinking.js");
assert(
  "invalid env falls back to safe default 4 (cap stays on)",
  gpt.GPT_L2_OPUS_MONTHLY_CAP,
  4
);

delete process.env.GPT_L2_OPUS_MONTHLY_CAP;

console.log("");
console.log(`Passed: ${passes}`);
console.log(`Failed: ${failures}`);
process.exit(failures > 0 ? 1 : 0);
