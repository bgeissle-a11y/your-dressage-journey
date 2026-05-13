/**
 * tokenBudgets — single source of truth for per-output `max_tokens`.
 *
 * Built from `YDJ_Token_Budget_Spec_v2.md` Part 1 + the Implementation Brief
 * Phase 2 table. Every Cloud Function `callClaude` site reads from here
 * instead of hardcoding values, so cap changes are a one-file edit.
 *
 * Per CLAUDE.md: numeric caps live in env config; defaults below match the
 * spec. If the env override is set we use it (parsed as int).
 *
 * Tier mapping:
 *   - 'working' / 'medium' / 'extended' map to spec rows
 *   - 'pilot' (passed in by handlers when the user is in pilot status) maps
 *     to 'extended' for budget purposes — pilot users have full access.
 *   - Anything else falls back to 'working' (most conservative).
 */

const TIERS = ["working", "medium", "extended"];

function envInt(name) {
  const raw = process.env[name];
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Spec table. Rows = output identifier. Cols = tier.
 * `null` means the output is gated away from that tier (caller shouldn't
 * be reaching this function for that combo, but if it does we throw).
 */
const SPEC = {
  // Multi-Voice Coaching
  "coaching-voice":            { working: 2000, medium: 2500, extended: 2500 },
  "coaching-quick-insights":   { working: 1500, medium: 2000, extended: 2000 },
  // The précis is intentionally tier-agnostic — 400 across the board per spec.
  "coaching-precis":           { working:  400, medium:  400, extended:  400 },

  // Journey Map
  "journey-map-synthesis":     { working: 3000, medium: 4000, extended: 4000 },
  "journey-map-narrative":     { working: 2000, medium: 2000, extended: 2000 },
  "journey-map-visualization": { working: 2000, medium: 2000, extended: 2000 },

  // Grand Prix Thinking
  "gpt-l1":                    { working: null, medium: 6000, extended: 6000 },
  "gpt-l2":                    { working: null, medium: 4000, extended: 4000 },

  // Physical Guidance
  "physical-protocol":         { working: null, medium: 5000, extended: 5000 },
  "physical-awareness":        { working: null, medium: 5000, extended: 5000 },

  // Show Planner
  "event-planner":             { working: null, medium: 3000, extended: 3000 },

  // Visualization Scripts
  "visualization-script":      { working: null, medium: 2000, extended: 2000 },

  // Readiness Snapshot
  "readiness-snapshot":        { working: null, medium: 2500, extended: 2500 },
};

/**
 * Per-output env override key. Set in functions/.env.example. Values
 * passed through `parseInt` — invalid entries fall back to spec.
 */
const ENV_KEYS = {
  "coaching-voice":            "TOKENS_COACHING_VOICE",
  "coaching-quick-insights":   "TOKENS_COACHING_QUICK_INSIGHTS",
  "coaching-precis":           "TOKENS_COACHING_PRECIS",
  "journey-map-synthesis":     "TOKENS_JOURNEY_MAP_SYNTHESIS",
  "journey-map-narrative":     "TOKENS_JOURNEY_MAP_NARRATIVE",
  "journey-map-visualization": "TOKENS_JOURNEY_MAP_VISUALIZATION",
  "gpt-l1":                    "TOKENS_GPT_L1",
  "gpt-l2":                    "TOKENS_GPT_L2",
  "physical-protocol":         "TOKENS_PHYSICAL_PROTOCOL",
  "physical-awareness":        "TOKENS_PHYSICAL_AWARENESS",
  "event-planner":             "TOKENS_EVENT_PLANNER",
  "visualization-script":      "TOKENS_VISUALIZATION_SCRIPT",
  "readiness-snapshot":        "TOKENS_READINESS_SNAPSHOT",
};

function normalizeTier(tier) {
  // Pilots get full-access budgets per CLAUDE.md; map to 'extended'.
  if (tier === "pilot" || tier === "pilot-grace") return "extended";
  if (TIERS.includes(tier)) return tier;
  return "working";
}

/**
 * Resolve the output's `max_tokens` for a given tier.
 *
 * @param {string} outputType - One of the SPEC row keys above.
 * @param {string} tier - 'working' | 'medium' | 'extended' | 'pilot'.
 * @returns {number} max_tokens to pass to callClaude.
 * @throws {Error} If the output is unknown, or the tier is gated away from it.
 */
function getMaxTokens(outputType, tier) {
  const row = SPEC[outputType];
  if (!row) {
    throw new Error(`tokenBudgets: unknown outputType "${outputType}"`);
  }
  const t = normalizeTier(tier);
  const specValue = row[t];
  if (specValue == null) {
    throw new Error(
      `tokenBudgets: outputType "${outputType}" is not available at tier "${t}"`
    );
  }
  const envOverride = envInt(ENV_KEYS[outputType]);
  return envOverride ?? specValue;
}

/**
 * Maps the rider tier label string used inside handler code (sometimes
 * "top" or "standard" historically) onto a spec tier. Falls back to
 * `working` if no mapping exists.
 */
function tierFromLabel(label) {
  if (!label) return "working";
  const s = String(label).toLowerCase();
  if (s.includes("extended") || s === "top") return "extended";
  if (s.includes("medium")) return "medium";
  if (s.includes("working") || s === "standard") return "working";
  if (s === "pilot" || s === "pilot-grace") return "extended";
  return "working";
}

module.exports = {
  getMaxTokens,
  tierFromLabel,
  SPEC,
  ENV_KEYS,
};
