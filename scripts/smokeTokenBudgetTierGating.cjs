/**
 * Smoke test: tier gating + token budgets.
 *
 * Pure logic check — no Firestore, no Stripe, no Claude. Exercises
 * `entitlements.canAccess` across the role × capability matrix and
 * `tokenBudgets.getMaxTokens` across the output × tier matrix.
 *
 * Run: `node scripts/smokeTokenBudgetTierGating.cjs`
 *
 * Exits non-zero on any assertion failure. Frozen "now" prevents the
 * pilot lifecycle from drifting through pilot → grace → expired between runs.
 */

const path = require("path");

// Load both modules from the functions tree (same code Cloud Functions run).
const ENT_PATH = path.join(__dirname, "..", "functions", "lib", "entitlements.js");
const TB_PATH = path.join(__dirname, "..", "functions", "lib", "tokenBudgets.js");

const {
  CAPABILITIES,
  STATUS,
  TIERS,
  canAccess,
  requiredTierFor,
  getTierStatus,
} = require(ENT_PATH);
const { getMaxTokens, tierFromLabel, SPEC } = require(TB_PATH);

let failures = 0;
let passes = 0;

function assert(label, cond) {
  if (cond) {
    passes++;
    return;
  }
  failures++;
  console.error(`✗ ${label}`);
}

// Two reference dates: one inside pilot (active), one inside grace.
const PILOT_NOW = new Date("2026-05-01T12:00:00Z");
const GRACE_NOW = new Date("2026-06-15T12:00:00Z");
const EXPIRED_NOW = new Date("2026-08-01T12:00:00Z");

const subs = {
  pilot: { isPilot: true, tier: "none", status: "none" },
  pilotGrace: { isPilot: true, tier: "none", status: "none" },
  pilotExpired: { isPilot: true, tier: "none", status: "none" },
  working: { tier: "working", status: "active" },
  medium: { tier: "medium", status: "active" },
  extended: { tier: "extended", status: "active" },
  pastDue: { tier: "medium", status: "past_due" },
  canceled: { tier: "medium", status: "canceled" },
  none: { tier: "none", status: "none" },
};

console.log("── Status derivation ──");
assert("pilot active → STATUS.PILOT", getTierStatus(subs.pilot, PILOT_NOW) === STATUS.PILOT);
assert("pilot in grace → STATUS.PILOT_GRACE", getTierStatus(subs.pilotGrace, GRACE_NOW) === STATUS.PILOT_GRACE);
assert("pilot expired → STATUS.PILOT_EXPIRED", getTierStatus(subs.pilotExpired, EXPIRED_NOW) === STATUS.PILOT_EXPIRED);
assert("paid past_due → STATUS.PAID_PAST_DUE", getTierStatus(subs.pastDue) === STATUS.PAID_PAST_DUE);

console.log("── canAccess: working tier ──");
assert("working can generateCoaching", canAccess(subs.working, CAPABILITIES.generateCoaching));
assert("working can generateJourneyMap", canAccess(subs.working, CAPABILITIES.generateJourneyMap));
assert("working can generateDataVisualizations", canAccess(subs.working, CAPABILITIES.generateDataVisualizations));
assert("working CANNOT generateGrandPrixThinking", !canAccess(subs.working, CAPABILITIES.generateGrandPrixThinking));
assert("working CANNOT generatePhysicalGuidance", !canAccess(subs.working, CAPABILITIES.generatePhysicalGuidance));
assert("working CANNOT generateShowPrepPlan", !canAccess(subs.working, CAPABILITIES.generateShowPrepPlan));
assert("working CANNOT generateVisualizationScript (Medium+)", !canAccess(subs.working, CAPABILITIES.generateVisualizationScript));

console.log("── canAccess: medium tier ──");
assert("medium can generateGrandPrixThinking", canAccess(subs.medium, CAPABILITIES.generateGrandPrixThinking));
assert("medium can generatePhysicalGuidance", canAccess(subs.medium, CAPABILITIES.generatePhysicalGuidance));
assert("medium can generateShowPrepPlan", canAccess(subs.medium, CAPABILITIES.generateShowPrepPlan));
assert("medium can generateVisualizationScript", canAccess(subs.medium, CAPABILITIES.generateVisualizationScript));
assert("medium CANNOT regenerateGrandPrixThinking", !canAccess(subs.medium, CAPABILITIES.regenerateGrandPrixThinking));
assert("medium CANNOT regeneratePhysicalGuidance", !canAccess(subs.medium, CAPABILITIES.regeneratePhysicalGuidance));

console.log("── canAccess: extended tier ──");
assert("extended can regenerateGrandPrixThinking", canAccess(subs.extended, CAPABILITIES.regenerateGrandPrixThinking));
assert("extended can regeneratePhysicalGuidance", canAccess(subs.extended, CAPABILITIES.regeneratePhysicalGuidance));
assert("extended can generateVisualizationScript", canAccess(subs.extended, CAPABILITIES.generateVisualizationScript));

console.log("── canAccess: pilot lifecycle ──");
assert("pilot can do everything (active)", canAccess(subs.pilot, CAPABILITIES.regenerateGrandPrixThinking, PILOT_NOW));
assert("pilot can generateVisualizationScript", canAccess(subs.pilot, CAPABILITIES.generateVisualizationScript, PILOT_NOW));
assert("pilot-grace can VIEW", canAccess(subs.pilotGrace, CAPABILITIES.viewCoaching, GRACE_NOW));
assert("pilot-grace CANNOT generate", !canAccess(subs.pilotGrace, CAPABILITIES.generateCoaching, GRACE_NOW));
assert("pilot-expired blocked from views", !canAccess(subs.pilotExpired, CAPABILITIES.viewCoaching, EXPIRED_NOW));

console.log("── canAccess: edge states ──");
assert("past_due allows views", canAccess(subs.pastDue, CAPABILITIES.viewCoaching));
assert("past_due blocks generate", !canAccess(subs.pastDue, CAPABILITIES.generateCoaching));
assert("canceled blocks views", !canAccess(subs.canceled, CAPABILITIES.viewCoaching));
assert("none blocks everything", !canAccess(subs.none, CAPABILITIES.viewCoaching));

console.log("── requiredTierFor ──");
assert("generateCoaching → working", requiredTierFor(CAPABILITIES.generateCoaching) === TIERS.WORKING);
assert("generateGrandPrixThinking → medium", requiredTierFor(CAPABILITIES.generateGrandPrixThinking) === TIERS.MEDIUM);
assert("generateVisualizationScript → medium", requiredTierFor(CAPABILITIES.generateVisualizationScript) === TIERS.MEDIUM);
assert("regenerateGrandPrixThinking → extended", requiredTierFor(CAPABILITIES.regenerateGrandPrixThinking) === TIERS.EXTENDED);

console.log("── tokenBudgets: spec table coverage ──");
const expectedRows = [
  "coaching-voice", "coaching-quick-insights", "coaching-precis",
  "journey-map-synthesis", "journey-map-narrative", "journey-map-visualization",
  "gpt-l1", "gpt-l2",
  "physical-protocol", "physical-awareness",
  "event-planner", "visualization-script", "readiness-snapshot",
];
for (const k of expectedRows) {
  assert(`SPEC has row "${k}"`, !!SPEC[k]);
}

console.log("── tokenBudgets: spec values ──");
assert("coaching-voice working = 2000", getMaxTokens("coaching-voice", "working") === 2000);
assert("coaching-voice medium = 2500", getMaxTokens("coaching-voice", "medium") === 2500);
assert("coaching-voice extended = 2500", getMaxTokens("coaching-voice", "extended") === 2500);
assert("coaching-quick-insights medium = 2000", getMaxTokens("coaching-quick-insights", "medium") === 2000);
assert("coaching-precis = 400 across tiers", getMaxTokens("coaching-precis", "working") === 400);
assert("journey-map-synthesis working = 3000", getMaxTokens("journey-map-synthesis", "working") === 3000);
assert("journey-map-synthesis medium = 4000", getMaxTokens("journey-map-synthesis", "medium") === 4000);
assert("journey-map-narrative = 2000", getMaxTokens("journey-map-narrative", "medium") === 2000);
assert("gpt-l1 medium = 6000", getMaxTokens("gpt-l1", "medium") === 6000);
assert("gpt-l2 extended = 4000", getMaxTokens("gpt-l2", "extended") === 4000);
assert("physical-protocol medium = 5000", getMaxTokens("physical-protocol", "medium") === 5000);
assert("physical-awareness extended = 5000", getMaxTokens("physical-awareness", "extended") === 5000);
assert("event-planner medium = 3000", getMaxTokens("event-planner", "medium") === 3000);
assert("visualization-script medium = 2000", getMaxTokens("visualization-script", "medium") === 2000);
assert("readiness-snapshot medium = 2500", getMaxTokens("readiness-snapshot", "medium") === 2500);

console.log("── tokenBudgets: gated outputs throw on Working ──");
for (const out of ["gpt-l1", "gpt-l2", "physical-protocol", "physical-awareness",
  "event-planner", "visualization-script", "readiness-snapshot"]) {
  let threw = false;
  try { getMaxTokens(out, "working"); } catch { threw = true; }
  assert(`getMaxTokens("${out}", "working") throws`, threw);
}

console.log("── tokenBudgets: pilot maps to extended ──");
assert("pilot gets extended budget for gpt-l1", getMaxTokens("gpt-l1", "pilot") === 6000);
assert("pilot can access event-planner", getMaxTokens("event-planner", "pilot") === 3000);

console.log("── tokenBudgets: tierFromLabel ──");
assert("'extended' label → extended", tierFromLabel("extended") === "extended");
assert("'top' label → extended (legacy)", tierFromLabel("top") === "extended");
assert("'standard' label → working (legacy)", tierFromLabel("standard") === "working");
assert("'Medium User' → medium", tierFromLabel("Medium User") === "medium");
assert("undefined → working", tierFromLabel(undefined) === "working");

console.log("── tokenBudgets: env override ──");
process.env.TOKENS_COACHING_VOICE = "1234";
// Re-require to pick up env (module reads on each call; clear require cache).
delete require.cache[TB_PATH];
const tbAfter = require(TB_PATH);
assert("env override applies (TOKENS_COACHING_VOICE=1234)",
  tbAfter.getMaxTokens("coaching-voice", "medium") === 1234);
delete process.env.TOKENS_COACHING_VOICE;

console.log("");
console.log(`Passed: ${passes}`);
console.log(`Failed: ${failures}`);

if (failures > 0) {
  process.exit(1);
}
