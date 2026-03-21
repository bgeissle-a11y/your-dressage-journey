export default function PrivacySection({ privacy, onChange, showToast }) {
  const handleExport = () => {
    showToast('Preparing your export...');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action will be processed within 30 days and cannot be undone.')) {
      showToast('Your deletion request has been submitted');
    }
  };

  return (
    <>
      {/* Aggregate Data */}
      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">Include my data in anonymized platform analysis</div>
          <div className="setting-description">
            Contributes to aggregate pattern research that improves the platform for all riders. Your data is never shared individually. Opt out at any time.
          </div>
        </div>
        <div className="setting-control">
          <label className="settings-toggle-wrap">
            <input
              type="checkbox"
              checked={privacy.aggregateOptIn}
              onChange={(e) => onChange('aggregateOptIn', e.target.checked)}
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>
      </div>

      {/* Analytics Cookies */}
      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">Analytics Cookies</div>
          <div className="setting-description">
            Allows Google Analytics to track anonymized usage patterns. Helps us understand which features riders actually use.
          </div>
        </div>
        <div className="setting-control">
          <label className="settings-toggle-wrap">
            <input
              type="checkbox"
              checked={privacy.analyticsCookies}
              onChange={(e) => onChange('analyticsCookies', e.target.checked)}
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>
      </div>

      <div style={{ height: 8 }} />

      {/* Export */}
      <div className="data-action-row">
        <div className="setting-label-block">
          <div className="setting-label">Download My Data</div>
          <div className="setting-description">
            Export all your debriefs, reflections, profile data, and AI outputs as JSON + CSV.
          </div>
        </div>
        <button className="settings-btn settings-btn-ghost" onClick={handleExport}>
          Export →
        </button>
      </div>

      {/* Delete Account */}
      <div className="data-action-row">
        <div className="setting-label-block">
          <div className="setting-label" style={{ color: 'var(--s-danger)' }}>Delete My Account</div>
          <div className="setting-description">
            Permanently removes your account and all data within 30 days. This cannot be undone.
          </div>
        </div>
        <button className="settings-btn settings-btn-danger-ghost" onClick={handleDeleteAccount}>
          Delete →
        </button>
      </div>
    </>
  );
}
