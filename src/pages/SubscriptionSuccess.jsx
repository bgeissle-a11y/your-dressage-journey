import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { TIERS, createPortalSession } from '../services/subscriptionService';
import './SubscriptionResult.css';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subscription = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const source = searchParams.get('source'); // "upgrade" | null
  const fromTierKey = searchParams.get('fromTier');
  const toTierKey = searchParams.get('toTier');
  const isUpgrade = source === 'upgrade' && toTierKey;

  // For upgrades: wait until Firestore reflects the new tier (webhook ~1-3s).
  // For new subscriptions: wait until Firestore shows an active subscription.
  const isReady = isUpgrade
    ? subscription.tier === toTierKey && subscription.status === 'active'
    : subscription.tier !== 'none' &&
      (subscription.status === 'active' || subscription.status === 'trialing');

  const tierInfo = TIERS[subscription.tier];
  const fromTierInfo = fromTierKey ? TIERS[fromTierKey] : null;

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch {
      setPortalLoading(false);
    }
  }

  return (
    <div className="subscription-result-page">
      <div className="result-card success">
        <div className="result-icon">&#10003;</div>
        <h1>
          {isUpgrade ? 'Upgrade Complete' : 'Welcome to Your Dressage Journey'}
        </h1>

        {isReady ? (
          <>
            <p className="result-message">
              {isUpgrade && fromTierInfo ? (
                <>
                  You&apos;re now on{' '}
                  <strong>{tierInfo?.name || subscription.tier}</strong> at the
                  founder rate. Your IC enrollment carries over from{' '}
                  {fromTierInfo.name} — locked in for life. Stripe is emailing
                  you a receipt with the prorated charge.
                </>
              ) : (
                <>
                  Your{' '}
                  <strong>{tierInfo?.name || subscription.tier}</strong>{' '}
                  subscription is active. All your coaching features are ready
                  to go.
                </>
              )}
            </p>
            <div className="result-actions">
              <button
                className="result-btn primary"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </button>
              <button
                className="result-btn secondary"
                onClick={handleManageBilling}
                disabled={portalLoading}
              >
                {portalLoading ? 'Opening...' : 'Manage Billing'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="result-message">
              {isUpgrade
                ? 'Applying your upgrade... this usually takes just a moment.'
                : 'Setting up your subscription... This usually takes just a moment.'}
            </p>
            <div className="result-spinner" />
          </>
        )}
      </div>
    </div>
  );
}
