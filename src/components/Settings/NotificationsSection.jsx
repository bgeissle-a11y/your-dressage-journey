export default function NotificationsSection({ notifications, onChange }) {
  return (
    <>
      {/* Transactional — always on (chip, not toggle) */}
      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">Transactional Emails</div>
          <div className="setting-description">Password resets, account confirmations, and essential system messages.</div>
        </div>
        <div className="setting-control">
          <span className="settings-chip-on">&#10003; Always on</span>
        </div>
      </div>

      {/* Product Updates */}
      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">Feature Updates & News</div>
          <div className="setting-description">Occasional email when meaningful new features are released. Not marketing.</div>
        </div>
        <div className="setting-control">
          <label className="settings-toggle-wrap">
            <input
              type="checkbox"
              checked={notifications.productUpdates}
              onChange={(e) => onChange('productUpdates', e.target.checked)}
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>
      </div>

      {/* Output Ready */}
      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">Output Ready Notification</div>
          <div className="setting-description">Email when your coaching output has finished generating.</div>
        </div>
        <div className="setting-control">
          <label className="settings-toggle-wrap">
            <input
              type="checkbox"
              checked={notifications.outputReady}
              onChange={(e) => onChange('outputReady', e.target.checked)}
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>
      </div>

      {/* Streak Reminder */}
      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">Streak Reminder</div>
          <div className="setting-description">Nudge after 7+ days without a logged ride.</div>
        </div>
        <div className="setting-control">
          <label className="settings-toggle-wrap">
            <input
              type="checkbox"
              checked={notifications.streakReminder}
              onChange={(e) => onChange('streakReminder', e.target.checked)}
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>
      </div>
    </>
  );
}
