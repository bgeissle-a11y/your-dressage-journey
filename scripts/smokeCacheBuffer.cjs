/**
 * Smoke test: cacheBuffer threshold logic.
 *
 * Tests the pure `isThresholdMet(debriefs, reflections)` rule from
 * `functions/lib/cacheBuffer.js`. Exercises the three brief acceptance cases
 * (2 debriefs / 5 debriefs / 3+1) plus boundary conditions.
 *
 * Run: `node scripts/smokeCacheBuffer.cjs`
 */

const path = require("path");

const {
  isThresholdMet,
  DEBRIEF_THRESHOLD,
  COMBO_DEBRIEF_THRESHOLD,
  COMBO_REFLECTION_THRESHOLD,
} = require(path.join(__dirname, "..", "functions", "lib", "cacheBuffer.js"));

let failures = 0;
let passes = 0;

function assert(label, actual, expected) {
  if (actual === expected) {
    passes++;
  } else {
    failures++;
    console.error(`✗ ${label}\n  expected ${expected} but got ${actual}`);
  }
}

console.log("── Spec acceptance cases (brief Phase 3) ──");
assert("2 debriefs + 0 reflections → fresh", isThresholdMet(2, 0), false);
assert("5 debriefs + 0 reflections → stale", isThresholdMet(5, 0), true);
assert("3 debriefs + 1 reflection → stale", isThresholdMet(3, 1), true);

console.log("── Debrief threshold boundary ──");
assert("4 debriefs + 0 reflections → fresh (below 5)", isThresholdMet(4, 0), false);
assert("5 debriefs + 0 reflections → stale (at 5)", isThresholdMet(5, 0), true);
assert("6 debriefs + 0 reflections → stale (above 5)", isThresholdMet(6, 0), true);

console.log("── Combo threshold boundary ──");
assert("2 debriefs + 1 reflection → fresh (debrief part below 3)", isThresholdMet(2, 1), false);
assert("3 debriefs + 0 reflections → fresh (reflection part below 1)", isThresholdMet(3, 0), false);
assert("3 debriefs + 1 reflection → stale (combo met)", isThresholdMet(3, 1), true);
assert("3 debriefs + 2 reflections → stale (combo over)", isThresholdMet(3, 2), true);
assert("4 debriefs + 1 reflection → stale (combo met)", isThresholdMet(4, 1), true);

console.log("── Edge: zero activity ──");
assert("0 + 0 → fresh", isThresholdMet(0, 0), false);
assert("0 + 100 reflections → fresh (debrief floor not met)", isThresholdMet(0, 100), false);

console.log("── Edge: large activity ──");
assert("100 debriefs + 0 → stale", isThresholdMet(100, 0), true);

console.log("── Spec constants ──");
assert("DEBRIEF_THRESHOLD = 5", DEBRIEF_THRESHOLD, 5);
assert("COMBO_DEBRIEF_THRESHOLD = 3", COMBO_DEBRIEF_THRESHOLD, 3);
assert("COMBO_REFLECTION_THRESHOLD = 1", COMBO_REFLECTION_THRESHOLD, 1);

console.log("");
console.log(`Passed: ${passes}`);
console.log(`Failed: ${failures}`);
process.exit(failures > 0 ? 1 : 0);
