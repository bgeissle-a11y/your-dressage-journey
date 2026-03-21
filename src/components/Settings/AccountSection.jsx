export default function AccountSection({ currentUser, showToast }) {
  const handleBilling = () => {
    showToast('Stripe billing portal coming soon');
  };

  return (
    <>
      <div className="subscription-card">
        <div>
          <div className="sub-label">Subscription</div>
          <div className="sub-value">Your Dressage Journey — Pilot</div>
        </div>
        <div className="account-status-badge">
          <span className="status-dot" /> Active
        </div>
      </div>

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
            View invoices, update payment method, or cancel your subscription via Stripe.
          </div>
        </div>
        <button className="settings-btn settings-btn-ghost" onClick={handleBilling}>
          Open Stripe →
        </button>
      </div>
    </>
  );
}
