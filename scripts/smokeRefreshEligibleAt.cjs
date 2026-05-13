/**
 * Smoke test: refreshEligibleAt timezone math.
 *
 * Phase 4 surfaces the next bucket-rollover moment to the rider. The math
 * is fiddly (DST, Sunday wraparound, monthly bucket UTC), so this exercises
 * a fixed set of scenarios.
 *
 * Run: `node scripts/smokeRefreshEligibleAt.cjs`
 */

const path = require("path");

const {
  refreshEligibleAt,
  nextMondayMidnight,
  nextMonthFirstUTC,
  _isValidTimezone,
} = require(path.join(__dirname, "..", "functions", "lib", "refreshEligibleAt.js"));

let failures = 0;
let passes = 0;

function assert(label, actual, expected) {
  if (actual === expected) passes++;
  else {
    failures++;
    console.error(`✗ ${label}\n  expected ${expected}\n  got      ${actual}`);
  }
}

console.log("── Timezone validation ──");
assert("UTC is valid", _isValidTimezone("UTC"), true);
assert("America/New_York is valid", _isValidTimezone("America/New_York"), true);
assert("garbage rejected", _isValidTimezone("Not/A/Zone"), false);
assert("empty rejected", _isValidTimezone(""), false);
assert("null rejected", _isValidTimezone(null), false);

console.log("── Monthly bucket: first-of-next-month UTC ──");
assert(
  "2026-05-11 → 2026-06-01T00:00Z",
  nextMonthFirstUTC(new Date("2026-05-11T15:00:00Z")).toISOString(),
  "2026-06-01T00:00:00.000Z"
);
assert(
  "2026-12-31 → 2027-01-01",
  nextMonthFirstUTC(new Date("2026-12-31T23:59:59Z")).toISOString(),
  "2027-01-01T00:00:00.000Z"
);
assert(
  "leap-year Feb 29 → 2024-03-01",
  nextMonthFirstUTC(new Date("2024-02-29T12:00:00Z")).toISOString(),
  "2024-03-01T00:00:00.000Z"
);

console.log("── Weekly bucket: next Monday midnight in zone ──");
// 2026-05-11 is a Monday in America/New_York (UTC-4 EDT, so 04:00 UTC = 00:00 EDT).
// At 12:00Z that's 08:00 EDT Monday — next Monday is one full week later.
const mondayResult = nextMondayMidnight(
  new Date("2026-05-11T12:00:00Z"),
  "America/New_York"
);
// Next Monday 2026-05-18 at midnight ET = 2026-05-18T04:00Z (EDT, UTC-4).
assert(
  "Mon 08:00 ET → next Mon 00:00 ET (=04:00Z)",
  mondayResult.toISOString(),
  "2026-05-18T04:00:00.000Z"
);

// Sunday 2026-05-10 23:00 UTC = 19:00 EDT Sunday → next Monday is the very next day.
const sundayResult = nextMondayMidnight(
  new Date("2026-05-10T23:00:00Z"),
  "America/New_York"
);
assert(
  "Sun 19:00 ET → next Mon 00:00 ET",
  sundayResult.toISOString(),
  "2026-05-11T04:00:00.000Z"
);

// UTC fallback when no timezone provided.
const utcResult = nextMondayMidnight(new Date("2026-05-11T15:00:00Z"), "UTC");
assert(
  "Mon 15:00 UTC → next Mon 00:00 UTC",
  utcResult.toISOString(),
  "2026-05-18T00:00:00.000Z"
);

// Invalid TZ falls back to UTC.
const invalidTz = nextMondayMidnight(new Date("2026-05-11T15:00:00Z"), "Not/A/Zone");
assert(
  "invalid TZ falls back to UTC",
  invalidTz.toISOString(),
  "2026-05-18T00:00:00.000Z"
);

console.log("── refreshEligibleAt dispatcher ──");
assert(
  "weekly routes to Monday",
  refreshEligibleAt("weekly", { now: new Date("2026-05-11T12:00:00Z"), timeZone: "America/New_York" }),
  "2026-05-18T04:00:00.000Z"
);
assert(
  "monthly routes to first-of-next-month",
  refreshEligibleAt("monthly", { now: new Date("2026-05-11T15:00:00Z") }),
  "2026-06-01T00:00:00.000Z"
);

console.log("");
console.log(`Passed: ${passes}`);
console.log(`Failed: ${failures}`);
process.exit(failures > 0 ? 1 : 0);
