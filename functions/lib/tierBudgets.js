/**
 * Tier-aware cost budgets — YDJ_Pricing_Discounts_Consolidation_v2.md Part 3.
 *
 *   Tier      Monthly ceiling   Weekly cap
 *   Working   $10               (none)
 *   Medium    $40               $20
 *   Extended  $80               $20
 *
 * Values are read from environment variables so they can be calibrated against
 * pilot usage data without code changes:
 *
 *   TIER_WORKING_MONTHLY_BUDGET_USD
 *   TIER_MEDIUM_MONTHLY_BUDGET_USD
 *   TIER_EXTENDED_MONTHLY_BUDGET_USD
 *   TIER_MEDIUM_WEEKLY_BUDGET_USD
 *   TIER_EXTENDED_WEEKLY_BUDGET_USD
 *   DEFAULT_WEEKLY_BUDGET_USD       // backstop for users with no paid tier
 *
 * All amounts internally are millicents (1/1000 of a cent) to match the
 * cost-tracking convention used by claudeCall.js _logUsage.
 *   1 USD = 100,000 millicents
 */

const MILLICENTS_PER_USD = 100_000;

function parseDollarsToMillicents(rawValue, defaultUSD) {
  const raw = rawValue !== undefined && rawValue !== "" ? rawValue : defaultUSD;
  const usd = Number(raw);
  if (!Number.isFinite(usd) || usd <= 0) return null;
  return Math.round(usd * MILLICENTS_PER_USD);
}

/**
 * Resolve the cost caps that apply to a given subscription tier.
 *
 * @param {string|null|undefined} tier  "working" | "medium" | "extended" | "none" | null
 * @returns {{
 *   tier: string|null,
 *   weeklyMillicents: number|null,
 *   monthlyMillicents: number|null,
 * }}  A `null` cap means "no cap of that kind for this tier".
 */
function getTierBudgets(tier) {
  const monthlyByTier = {
    working: parseDollarsToMillicents(process.env.TIER_WORKING_MONTHLY_BUDGET_USD, 10),
    medium: parseDollarsToMillicents(process.env.TIER_MEDIUM_MONTHLY_BUDGET_USD, 40),
    extended: parseDollarsToMillicents(process.env.TIER_EXTENDED_MONTHLY_BUDGET_USD, 80),
  };
  const weeklyByTier = {
    working: null, // spec: no weekly cap on Working
    medium: parseDollarsToMillicents(process.env.TIER_MEDIUM_WEEKLY_BUDGET_USD, 20),
    extended: parseDollarsToMillicents(process.env.TIER_EXTENDED_WEEKLY_BUDGET_USD, 20),
  };
  const defaultWeekly = parseDollarsToMillicents(process.env.DEFAULT_WEEKLY_BUDGET_USD, 20);

  if (tier && Object.prototype.hasOwnProperty.call(monthlyByTier, tier)) {
    return {
      tier,
      weeklyMillicents: weeklyByTier[tier],
      monthlyMillicents: monthlyByTier[tier],
    };
  }

  // Free pilot, "none", or anything we don't recognize: backstop weekly cap
  // only. No monthly ceiling — these accounts are not paying, and the weekly
  // backstop is enough to bound runaway usage.
  return {
    tier: tier || null,
    weeklyMillicents: defaultWeekly,
    monthlyMillicents: null,
  };
}

/**
 * Resolve the per-day Claude call limit for a given subscription tier.
 *
 * Spec: H4 in LAUNCH_FINAL_REMEDIATION_LIST. The cost caps in
 * getTierBudgets handle the dollar ceiling; this caps raw call count
 * to prevent runaway page-reload loops or compounding background
 * triggers from burning through monthly quota in one day.
 *
 *   Working    30 calls/day   (≈1 full Insights refresh)
 *   Medium     60 calls/day   (≈3 full Insights refreshes)
 *   Extended  100 calls/day   (power users + show planner step-through)
 *   pilot/none 30 calls/day   (backstop — same as Working)
 *
 * Env overrides:
 *   TIER_WORKING_DAILY_CALL_LIMIT
 *   TIER_MEDIUM_DAILY_CALL_LIMIT
 *   TIER_EXTENDED_DAILY_CALL_LIMIT
 *   DEFAULT_DAILY_CALL_LIMIT
 *
 * @param {string|null|undefined} tier  "working" | "medium" | "extended" | "pilot" | "none" | null
 * @returns {number} max Claude calls per UTC day for this tier
 */
function getDailyCallLimit(tier) {
  function parseInt_(raw, fallback) {
    if (raw === undefined || raw === "" || raw === null) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  const limitsByTier = {
    working: parseInt_(process.env.TIER_WORKING_DAILY_CALL_LIMIT, 30),
    medium: parseInt_(process.env.TIER_MEDIUM_DAILY_CALL_LIMIT, 60),
    extended: parseInt_(process.env.TIER_EXTENDED_DAILY_CALL_LIMIT, 100),
  };
  const defaultLimit = parseInt_(process.env.DEFAULT_DAILY_CALL_LIMIT, 30);

  // Pilot users get full access during pilot window — match Extended.
  // After pilot-grace ends they're blocked at the capability layer, so we
  // don't need pilot-expired handling here.
  if (tier === "pilot" || tier === "pilot-grace") return limitsByTier.extended;
  if (tier && Object.prototype.hasOwnProperty.call(limitsByTier, tier)) {
    return limitsByTier[tier];
  }
  return defaultLimit;
}

module.exports = { getTierBudgets, getDailyCallLimit, MILLICENTS_PER_USD };
