/**
 * BudgetExhaustionBanner — "you're out of fresh-coaching for this period"
 * surface (Token Budget Spec v2 §Part 7 #3, Phase 4 of the brief).
 *
 * Shown above the panel content whenever the Cloud Function returns
 * `cacheServed: true`. The body explains which cap was hit, when it rolls
 * over, and includes the cached Multi-Voice précis as a one-line "where
 * you are right now" hook.
 *
 * Precís is loaded server-side (`buildGracefulResponse` in
 * functions/lib/budgetExhaustion.js); if absent we omit the line cleanly.
 */

function _formatRefresh(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

export default function BudgetExhaustionBanner({ capExceeded, refreshEligibleAt, precis }) {
  if (!capExceeded) return null;
  const { kind, limitUSD } = capExceeded;
  const when = _formatRefresh(refreshEligibleAt);
  const period = kind === "weekly" ? "weekly" : "monthly";
  const limitClause = limitUSD ? ` ($${limitUSD})` : "";

  return (
    <div className="budget-banner">
      <div className="budget-banner__line">
        Your {period} fresh-coaching allowance{limitClause} is used.
        {when ? <> Next refresh: <strong>{when}</strong>.</> : null}
        {' '}Your existing coaching is below.
      </div>
      {precis ? (
        <div className="budget-banner__precis">
          <em>Where you are right now:</em> {precis}
        </div>
      ) : null}
    </div>
  );
}
