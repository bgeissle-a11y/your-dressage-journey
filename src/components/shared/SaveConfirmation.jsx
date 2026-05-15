import './SaveConfirmation.css';

/**
 * Full-screen confirmation shown after a high-investment form save flushes
 * to the server. Two visual states:
 *
 *  - Success (default): green checkmark, title, message, optional meta children,
 *    primary action (e.g. "View My Notes") and optional secondary action
 *    (e.g. "Add Another"). The user must explicitly dismiss it — no toast.
 *
 *  - syncWarning=true: amber "Still syncing" card with a spinner and no
 *    buttons. The user must keep the page open until the SDK confirms the
 *    write actually flushed (iOS Safari can resolve a write from cache while
 *    the tab is backgrounded; this state is what we show until the readback
 *    succeeds).
 *
 * Children render between the message and the action buttons in the success
 * state (e.g. a meta block summarizing what was saved). They are hidden in
 * the syncWarning state.
 */
export default function SaveConfirmation({
  title,
  message = 'Your entry has been safely saved.',
  primaryAction,
  secondaryAction,
  syncWarning = false,
  children
}) {
  if (syncWarning) {
    return (
      <div className="form-page">
        <div className="form-card">
          <div className="save-confirm save-confirm-warning" role="status" aria-live="polite">
            <div className="save-confirm-spinner" aria-hidden="true" />
            <h2>Still syncing&#x2026;</h2>
            <p>Please keep this page open until the save completes. Your phone may have lost connection briefly &mdash; once it reconnects, the save will finish on its own.</p>
            <p className="save-confirm-warning-note">
              Don&#39;t close or refresh this tab. Your draft is preserved either way.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="form-card">
        <div className="save-confirm save-confirm-success">
          <div className="save-confirm-icon" aria-hidden="true">{'✓'}</div>
          <h2>{title}</h2>
          <p>{message}</p>
          {children}
          <div className="save-confirm-actions">
            {secondaryAction && (
              <button type="button" className="btn btn-secondary" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </button>
            )}
            {primaryAction && (
              <button type="button" className="btn btn-primary" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
