import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { TIERS, createPortalSession } from '../../services/subscriptionService';

const IC_UPGRADE_WINDOW_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months

function isWithinICUpgradeWindow(enrollmentDateIso) {
  if (!enrollmentDateIso) return false;
  const enrolled = new Date(enrollmentDateIso).getTime();
  if (Number.isNaN(enrolled)) return false;
  return Date.now() - enrolled < IC_UPGRADE_WINDOW_MS;
}

export default function AccountSection({ currentUser, showToast }) {
  const subscription = useSubscription();
  const [openingPortal, setOpeningPortal] = useState(false);

  const hasActiveSub =
    subscription.tier !== 'none' &&
    (subscription.status === 'active' || subscription.status === 'trialing');

  const isPilotMonthlyActive =
    subscription.isPilot &&
    subscription.pilotDiscountActive &&
    subscription.interval === 'monthly' &&
    hasActiveSub;

  const isICActive =
    subscription.isInitialCenterline && subscription.icStatus === 'active';
  const inICUpgradeWindow =
    isICActive && isWithinICUpgradeWindow(subscription.icEnrollmentDate);

  // Display label
  let subDetail = '';
  if (subscription.loading) {
    subDetail = 'Loading…';
  } else if (subscription.isPilot && !hasActiveSub) {
    subDetail = 'Pilot';
  } else if (hasActiveSub) {
    const tierName = TIERS[subscription.tier]?.name || subscription.tier;
    const intervalLabel =
      subscription.interval === 'annual'
        ? 'Annual'
        : subscription.interval === 'monthly'
        ? 'Monthly'
        : '';
    subDetail = intervalLabel ? `${tierName} · ${intervalLabel}` : tierName;
  } else {
    subDetail = 'No active subscription';
  }

  // Status badge
  let statusLabel = '';
  if (!subscription.loading) {
    if (hasActiveSub) {
      statusLabel = subscription.status === 'trialing' ? 'Trial' : 'Active';
    } else if (subscription.isPilot) {
      statusLabel = 'Active';
    } else if (
      subscription.status === 'past_due' ||
      subscription.status === 'unpaid'
    ) {
      statusLabel = 'Payment issue';
    } else if (subscription.status === 'canceled') {
      statusLabel = 'Canceled';
    } else {
      statusLabel = 'Inactive';
    }
  }

  const handleBilling = async () => {
    if (openingPortal) return;
    try {
      setOpeningPortal(true);
      const { url } = await createPortalSession();
      if (url) {
        window.location.href = url;
        return;
      }
      showToast?.('Unable to open billing portal. Please try again.');
      setOpeningPortal(false);
    } catch (err) {
      console.error('Portal session error:', err);
      showToast?.(err?.message || 'Unable to open billing portal.');
      setOpeningPortal(false);
    }
  };

  return (
    <>
      <div className="subscription-card">
        <div>
          <div className="sub-label">Subscription</div>
          <div className="sub-value">
            {subDetail
              ? `Your Dressage Journey — ${subDetail}`
              : 'Your Dressage Journey'}
          </div>
        </div>
        {statusLabel && (
          <div className="account-status-badge">
            <span className="status-dot" /> {statusLabel}
          </div>
        )}
      </div>

      {inICUpgradeWindow && (
        <div className="account-upgrade-notice">
          <strong>You&apos;re in your founder upgrade window.</strong> To change
          tiers while keeping your founder rate, upgrade from the{' '}
          <Link to="/pricing">Pricing page</Link>. Plan changes through the
          billing portal forfeit your IC rate.
        </div>
      )}

      {isPilotMonthlyActive && (
        <div className="account-upgrade-notice">
          <strong>Your pilot discount is active.</strong> To keep your
          10%-off-for-life rate when you upgrade, use the{' '}
          <Link to="/pricing">Pricing page</Link>. Changes through the billing
          portal forfeit the pilot discount.
        </div>
      )}

      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">Email Address</div>
          <div className="setting-description">{currentUser?.email || '—'}</div>
        </div>
        <button className="settings-btn settings-btn-ghost">Change →</button>
      </div>

      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">Password</div>
          <div className="setting-description">
            {currentUser?.providerData?.[0]?.providerId === 'google.com'
              ? 'Using Google sign-in'
              : 'Change your password'}
          </div>
        </div>
        <button className="settings-btn settings-btn-ghost">Change →</button>
      </div>

      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">Manage Billing</div>
          <div className="setting-description">
            {hasActiveSub
              ? 'View invoices, update payment method, or cancel your subscription. Tier changes happen on the Pricing page.'
              : subscription.isPilot
              ? 'Pilot access is free. Choose a plan when you’re ready to continue.'
              : 'Choose a plan or start your free trial.'}
          </div>
        </div>
        {hasActiveSub ? (
          <button
            className="settings-btn settings-btn-ghost"
            onClick={handleBilling}
            disabled={openingPortal}
          >
            {openingPortal ? 'Opening…' : 'Open Stripe →'}
          </button>
        ) : (
          <Link to="/pricing" className="settings-btn settings-btn-ghost">
            View Pricing →
          </Link>
        )}
      </div>
    </>
  );
}
