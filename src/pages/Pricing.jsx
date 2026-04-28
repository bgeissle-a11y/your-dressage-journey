import { useEffect, useState } from 'react';
import {
  TIERS,
  createCheckoutSession,
  createPortalSession,
  changeSubscriptionPlan,
  getPricingEligibility,
  onCohortStatusChange,
} from '../services/subscriptionService';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import './Pricing.css';

const TIER_ORDER = ['working', 'medium', 'extended'];
const TIER_RANK = { working: 1, medium: 2, extended: 3 };
const SPOTS_VISIBLE_THRESHOLD = 20;
const IC_UPGRADE_WINDOW_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months

function isWithinICUpgradeWindow(enrollmentDateIso) {
  if (!enrollmentDateIso) return false;
  const enrolled = new Date(enrollmentDateIso).getTime();
  if (Number.isNaN(enrolled)) return false;
  return Date.now() - enrolled < IC_UPGRADE_WINDOW_MS;
}

export default function Pricing() {
  const { currentUser } = useAuth();
  const subscription = useSubscription();
  const [isAnnual, setIsAnnual] = useState(true);
  const [loadingKey, setLoadingKey] = useState(null);
  const [error, setError] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [cohort, setCohort] = useState(null);
  const [pendingUpgrade, setPendingUpgrade] = useState(null);

  // Fetch initial eligibility (depends on auth state)
  useEffect(() => {
    let cancelled = false;
    if (currentUser === undefined) return; // wait for auth resolve
    getPricingEligibility()
      .then((data) => {
        if (!cancelled) {
          setEligibility(data);
          setCohort(data.cohort);
        }
      })
      .catch((err) => {
        console.error('Eligibility fetch failed:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  // Live cohort updates (only relevant during the IC window)
  useEffect(() => {
    const unsub = onCohortStatusChange((next) => setCohort(next));
    return unsub;
  }, []);

  const hasActiveSub =
    subscription.tier !== 'none' &&
    (subscription.status === 'active' || subscription.status === 'trialing');

  // Decision: when to show IC pricing on annual cards
  const isPilot = !!eligibility?.isPilot;
  const showIC = !!cohort?.isOpen && !subscription.isInitialCenterline && !hasActiveSub;
  const showSpotsCounter =
    !!cohort?.isOpen && cohort.spotsRemaining <= SPOTS_VISIBLE_THRESHOLD;
  const showTrialCTA =
    !!eligibility?.trialEligible && !hasActiveSub && !isPilot;

  // IC upgrade eligibility: active IC member, within 6-month window, looking
  // at a higher annual tier than their current IC tier.
  const isICActive =
    subscription.isInitialCenterline && subscription.icStatus === 'active';
  const inICUpgradeWindow =
    isICActive && isWithinICUpgradeWindow(subscription.icEnrollmentDate);
  function isICUpgradeTarget(targetTier) {
    if (!inICUpgradeWindow || !isAnnual) return false;
    const fromRank = TIER_RANK[subscription.icTier] || 0;
    const toRank = TIER_RANK[targetTier] || 0;
    return toRank > fromRank;
  }

  // Pilot monthly upgrade eligibility: active pilot subscriber on monthly
  // billing, looking at a higher monthly tier. Pilot discount carries over.
  const isPilotMonthlyActive =
    subscription.isPilot &&
    subscription.pilotDiscountActive &&
    subscription.interval === 'monthly' &&
    hasActiveSub;
  function isPilotMonthlyUpgradeTarget(targetTier) {
    if (!isPilotMonthlyActive || isAnnual) return false;
    const fromRank = TIER_RANK[subscription.tier] || 0;
    const toRank = TIER_RANK[targetTier] || 0;
    return toRank > fromRank;
  }

  async function handleSubscribe(tierKey, flow = 'standard') {
    if (!currentUser) {
      window.location.href = `/signin?next=${encodeURIComponent('/pricing')}`;
      return;
    }
    const interval = flow === 'pilot_monthly' ? 'monthly' : isAnnual ? 'annual' : 'monthly';
    const lookupKey = `${tierKey}_${interval}`;
    setLoadingKey(`${flow}:${lookupKey}`);
    setError(null);

    try {
      const { url } = await createCheckoutSession(lookupKey, { flow });
      window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err?.message || 'Unable to start checkout. Please try again.');
      setLoadingKey(null);
    }
  }

  async function handleStartTrial() {
    if (!currentUser) {
      window.location.href = `/signin?next=${encodeURIComponent('/pricing')}`;
      return;
    }
    setLoadingKey('trial');
    setError(null);
    try {
      const { url } = await createCheckoutSession('medium_monthly', { flow: 'trial' });
      window.location.href = url;
    } catch (err) {
      console.error('Trial start error:', err);
      setError(err?.message || 'Unable to start your free trial. Please try again.');
      setLoadingKey(null);
    }
  }

  function requestUpgrade(tierKey, flow) {
    const tier = TIERS[tierKey];
    if (flow === 'ic_upgrade') {
      setPendingUpgrade({
        flow,
        targetTier: tierKey,
        targetTierName: tier.name,
        targetPrice: tier.icAnnualPrice,
        targetStandard: tier.annualPrice,
        targetInterval: 'annual',
        targetPeriodLabel: '/year',
        fromTier: subscription.tier,
        fromTierName: TIERS[subscription.tier]?.name || subscription.tier,
      });
    } else if (flow === 'pilot_monthly_upgrade') {
      setPendingUpgrade({
        flow,
        targetTier: tierKey,
        targetTierName: tier.name,
        targetPrice: tier.pilotMonthlyPrice,
        targetStandard: tier.monthlyPrice,
        targetInterval: 'monthly',
        targetPeriodLabel: '/month',
        fromTier: subscription.tier,
        fromTierName: TIERS[subscription.tier]?.name || subscription.tier,
      });
    }
  }

  async function confirmUpgrade() {
    if (!pendingUpgrade) return;
    const { flow, targetTier, targetInterval, fromTier } = pendingUpgrade;
    const lookupKey = `${targetTier}_${targetInterval}`;
    setLoadingKey(`${flow}:${lookupKey}`);
    setError(null);
    try {
      await changeSubscriptionPlan(lookupKey, flow);
      // Redirect to success page — it waits for the Firestore listener to
      // confirm the new tier before showing the celebratory state.
      window.location.href =
        `/subscription/success?source=upgrade&fromTier=${fromTier}&toTier=${targetTier}`;
    } catch (err) {
      console.error('Upgrade error:', err);
      setError(err?.message || 'Unable to upgrade. Please try again.');
      setLoadingKey(null);
      setPendingUpgrade(null);
    }
  }

  function cancelUpgrade() {
    setPendingUpgrade(null);
  }

  async function handleManageBilling() {
    setLoadingKey('portal');
    setError(null);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      console.error('Portal error:', err);
      setError('Unable to open billing portal. Please try again.');
      setLoadingKey(null);
    }
  }

  // Pick the price + label combo for a given tier card based on flow choice
  function getCardPricing(tierKey) {
    const tier = TIERS[tierKey];
    // IC upgrade for an existing IC member viewing a higher tier (annual)
    if (isICUpgradeTarget(tierKey)) {
      return {
        amount: tier.icAnnualPrice,
        period: '/year',
        flow: 'ic_upgrade',
        secondary: `Founder upgrade · save $${tier.icDiscount}/year forever`,
      };
    }
    // Pilot monthly upgrade for an existing pilot subscriber on monthly
    if (isPilotMonthlyUpgradeTarget(tierKey)) {
      return {
        amount: tier.pilotMonthlyPrice,
        period: '/month',
        flow: 'pilot_monthly_upgrade',
        secondary: 'Pilot rate carries over · 10% off monthly for life',
      };
    }
    if (isAnnual && showIC) {
      return {
        amount: tier.icAnnualPrice,
        period: '/year',
        flow: 'ic',
        secondary: `Founder rate · save $${tier.icDiscount}/year forever`,
      };
    }
    if (!isAnnual && isPilot) {
      return {
        amount: tier.pilotMonthlyPrice,
        period: '/month',
        flow: 'pilot_monthly',
        secondary: 'Pilot discount · 10% off monthly for life',
      };
    }
    if (isAnnual) {
      return {
        amount: tier.annualPrice,
        period: '/year',
        flow: 'standard',
        secondary: `$${tier.annualMonthly}/mo · Save $${tier.annualSavings}/year`,
      };
    }
    return {
      amount: tier.monthlyPrice,
      period: '/month',
      flow: 'standard',
      secondary: null,
    };
  }

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>
          Every tier includes full access to all data entry forms, voice input,
          and your complete riding history. Choose the coaching depth that fits
          your journey.
        </p>
      </div>

      {/* Initial Centerline banner (shown only while window is open) */}
      {showIC && (
        <div className="ic-banner">
          <div className="ic-banner-text">
            <strong>Initial Centerline · Founder pricing</strong>
            <p>
              Annual founder rates locked in for life — only available through
              July&nbsp;7,&nbsp;2026 or until the first 100 riders join.
            </p>
          </div>
          {showSpotsCounter && (
            <div className="ic-spots-counter">
              <span className="ic-spots-number">{cohort.spotsRemaining}</span>
              <span className="ic-spots-label">spots left</span>
            </div>
          )}
        </div>
      )}

      {/* Pilot conversion banner */}
      {isPilot && !hasActiveSub && (
        <div className="pilot-banner">
          <strong>Welcome back, pilot rider.</strong> You have two paths to keep
          going: an annual founder rate (the strongest long-term reward), or
          monthly with 10% off for life. Pick whichever fits your rhythm — they
          can&apos;t be combined.
        </div>
      )}

      {/* IC upgrade window notice */}
      {inICUpgradeWindow && (
        <div className="pilot-banner">
          <strong>You&apos;re in the founder upgrade window.</strong> Within 6
          months of your IC enrollment, upgrades to a higher annual tier keep
          your founder rate at the new tier — locked in for life. Switching to
          monthly or downgrading forfeits your IC rate.
        </div>
      )}

      {/* Pilot monthly active subscriber notice */}
      {isPilotMonthlyActive && (
        <div className="pilot-banner">
          <strong>Your pilot rate is active.</strong> Upgrades to a higher
          monthly tier carry your 10%-off-for-life discount automatically — but
          only if you upgrade from this page. Plan changes through the billing
          portal forfeit the pilot discount.
        </div>
      )}

      {/* Free trial CTA */}
      {showTrialCTA && (
        <div className="trial-banner">
          <div>
            <strong>Try YDJ free for 30 days.</strong>
            <p>
              Full Medium-tier access. Card required, charged on day 31 unless
              cancelled. After trial: 10% off your first year on any plan.
            </p>
          </div>
          <button
            className="trial-banner-btn"
            onClick={handleStartTrial}
            disabled={!!loadingKey}
          >
            {loadingKey === 'trial' ? 'Starting...' : 'Start Free Trial'}
          </button>
        </div>
      )}

      {/* Billing toggle */}
      <div className="billing-toggle">
        <span
          className={`billing-toggle-label ${!isAnnual ? 'active' : ''}`}
          onClick={() => setIsAnnual(false)}
        >
          Monthly
        </span>
        <button
          className={`billing-toggle-switch ${isAnnual ? 'annual' : ''}`}
          onClick={() => setIsAnnual(!isAnnual)}
          aria-label="Toggle billing period"
        >
          <span className="billing-toggle-knob" />
        </button>
        <span
          className={`billing-toggle-label ${isAnnual ? 'active' : ''}`}
          onClick={() => setIsAnnual(true)}
        >
          Annual
        </span>
        {isAnnual && !showIC && (
          <span className="billing-savings-badge">2 months free</span>
        )}
        {isAnnual && showIC && (
          <span className="billing-savings-badge">Founder rate</span>
        )}
      </div>

      {error && (
        <div className="pricing-error">
          <p>{error}</p>
        </div>
      )}

      {/* Tier cards */}
      <div className="pricing-grid">
        {TIER_ORDER.map((tierKey) => {
          const tier = TIERS[tierKey];
          const isCurrentTier = hasActiveSub && subscription.tier === tierKey;
          const pricing = getCardPricing(tierKey);
          const lookupKey = `${tierKey}_${isAnnual ? 'annual' : 'monthly'}`;
          const btnKey = `${pricing.flow}:${lookupKey}`;

          const isICCard = pricing.flow === 'ic' || pricing.flow === 'ic_upgrade';
          const isUpgradeCard =
            pricing.flow === 'ic_upgrade' || pricing.flow === 'pilot_monthly_upgrade';

          return (
            <div
              key={tierKey}
              className={`tier-card ${tier.popular ? 'popular' : ''} ${
                isICCard ? 'ic-card' : ''
              }`}
            >
              {tier.popular && !isICCard && (
                <span className="popular-badge">Most Popular</span>
              )}
              {isICCard && (
                <span className="ic-badge">
                  {pricing.flow === 'ic_upgrade' ? 'Founder Upgrade' : 'Founder Rate'}
                </span>
              )}

              <div className="tier-card-header">
                <div className="tier-name">{tier.name}</div>
                <div className="tier-position">{tier.position}</div>
                <div className="tier-price">
                  <span className="tier-price-amount">${pricing.amount}</span>
                  <span className="tier-price-period">{pricing.period}</span>
                </div>
                {isICCard && (
                  <div className="tier-price-strikethrough">
                    Standard: <s>${tier.annualPrice}/year</s>
                  </div>
                )}
                {pricing.secondary && (
                  <div className="tier-price-annual-note">{pricing.secondary}</div>
                )}
              </div>

              <div className="tier-card-body">
                <ul className="tier-features">
                  {tier.features.map((feature, i) => (
                    <li
                      key={i}
                      className={feature.endsWith(':') ? 'section-header' : ''}
                    >
                      {feature}
                    </li>
                  ))}
                  {tier.notIncluded.map((feature, i) => (
                    <li key={`not-${i}`} className="not-included">
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrentTier ? (
                  <div className="tier-current-badge">Current Plan</div>
                ) : isUpgradeCard ? (
                  <button
                    className="tier-subscribe-btn popular"
                    onClick={() => requestUpgrade(tierKey, pricing.flow)}
                    disabled={!!loadingKey}
                  >
                    {loadingKey === btnKey
                      ? 'Upgrading...'
                      : pricing.flow === 'ic_upgrade'
                      ? 'Upgrade to Founder Rate'
                      : 'Upgrade at Pilot Rate'}
                  </button>
                ) : hasActiveSub ? (
                  <button
                    className="tier-subscribe-btn"
                    onClick={handleManageBilling}
                    disabled={!!loadingKey}
                  >
                    {loadingKey === 'portal' ? 'Opening...' : 'Change Plan'}
                  </button>
                ) : (
                  <button
                    className={`tier-subscribe-btn ${tier.popular ? 'popular' : ''}`}
                    onClick={() => handleSubscribe(tierKey, pricing.flow)}
                    disabled={!!loadingKey}
                  >
                    {loadingKey === btnKey
                      ? 'Redirecting...'
                      : pricing.flow === 'ic'
                      ? 'Lock in Founder Rate'
                      : pricing.flow === 'pilot_monthly'
                      ? 'Continue at Pilot Rate'
                      : 'Subscribe'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pricing-footer">
        <p>
          All plans renew automatically. You can cancel or change plans anytime
          from your account settings. Annual pricing equals 10 months — 2 months
          free.
        </p>
        {showIC && (
          <p className="pricing-footer-fineprint">
            Initial Centerline: annual only · locked to the tier you sign up at ·
            permanent rate · cannot stack with other discounts. Downgrading,
            switching to monthly, or letting your subscription lapse forfeits
            the founder rate.
          </p>
        )}
        {hasActiveSub && (
          <p style={{ marginTop: '0.75rem' }}>
            <button
              onClick={handleManageBilling}
              disabled={!!loadingKey}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--gold)',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.85rem',
              }}
            >
              Manage billing &amp; invoices
            </button>
          </p>
        )}
      </div>

      {/* Upgrade confirmation modal (handles both IC and pilot-monthly flows) */}
      {pendingUpgrade && (
        <div
          className="upgrade-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelUpgrade();
          }}
        >
          <div className="upgrade-modal" role="dialog" aria-modal="true">
            <h2>
              Upgrade {pendingUpgrade.fromTierName} →{' '}
              {pendingUpgrade.targetTierName}
            </h2>
            <p className="upgrade-modal-lead">
              {pendingUpgrade.flow === 'ic_upgrade'
                ? "You're inside your founder upgrade window, so you keep the IC rate at the new tier — locked in for life."
                : 'Your pilot 10%-off-for-life discount carries over to the new tier and stays as long as your monthly subscription is continuous.'}
            </p>

            <div className="upgrade-modal-summary">
              <div className="upgrade-modal-row">
                <span>Today</span>
                <span className="upgrade-modal-row-detail">
                  Prorated charge to your card on file (the unused portion of
                  {' '}{pendingUpgrade.fromTierName} is credited)
                </span>
              </div>
              <div className="upgrade-modal-row">
                <span>Renewal</span>
                <span className="upgrade-modal-row-detail">
                  ${pendingUpgrade.targetPrice}
                  {pendingUpgrade.targetPeriodLabel}
                  <s style={{ marginLeft: '0.5rem', opacity: 0.55 }}>
                    ${pendingUpgrade.targetStandard}
                  </s>
                </span>
              </div>
              {pendingUpgrade.flow === 'ic_upgrade' && (
                <div className="upgrade-modal-row">
                  <span>Cohort</span>
                  <span className="upgrade-modal-row-detail">
                    Your founder spot
                    {subscription.icCohortNumber
                      ? ` (#${subscription.icCohortNumber})`
                      : ''}{' '}
                    carries over — no new cohort claim.
                  </span>
                </div>
              )}
              {pendingUpgrade.flow === 'pilot_monthly_upgrade' && (
                <div className="upgrade-modal-row">
                  <span>Discount</span>
                  <span className="upgrade-modal-row-detail">
                    PILOT_MONTHLY_10 stays attached. Lapsing or switching to
                    annual ends the discount permanently.
                  </span>
                </div>
              )}
            </div>

            <p className="upgrade-modal-fineprint">
              Stripe emails you a receipt with the exact prorated amount.
              You&apos;ll have full {pendingUpgrade.targetTierName}-tier access
              the moment this completes.
            </p>

            <div className="upgrade-modal-actions">
              <button
                className="upgrade-modal-btn cancel"
                onClick={cancelUpgrade}
                disabled={!!loadingKey}
              >
                Cancel
              </button>
              <button
                className="upgrade-modal-btn confirm"
                onClick={confirmUpgrade}
                disabled={!!loadingKey}
              >
                {loadingKey &&
                (loadingKey.startsWith('ic_upgrade:') ||
                  loadingKey.startsWith('pilot_monthly_upgrade:'))
                  ? 'Upgrading...'
                  : 'Confirm Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
