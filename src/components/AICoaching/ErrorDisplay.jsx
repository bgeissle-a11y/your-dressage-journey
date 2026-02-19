/**
 * Shared error display component for AI coaching panels.
 * Shows category-specific messages with optional retry button.
 *
 * @param {object} props
 * @param {string} props.message - The error message to display
 * @param {string} [props.category] - Error category: transient | data_issue | permanent | unknown
 * @param {boolean} [props.retryable] - Whether to show a retry button
 * @param {Function} [props.onRetry] - Callback for retry button
 * @param {boolean} [props.retrying] - Whether retry is in progress
 * @param {boolean} [props.compact] - Use compact/inline style (e.g., inside a voice card)
 */
export default function ErrorDisplay({
  message,
  category,
  retryable = true,
  onRetry,
  retrying = false,
  compact = false,
}) {
  const className = compact ? 'panel-error panel-error--compact' : 'panel-error';

  return (
    <div className={className}>
      <p>{message}</p>
      {retryable && onRetry && (
        <button
          onClick={onRetry}
          className="btn-retry"
          disabled={retrying}
        >
          {retrying ? 'Retrying...' : 'Try Again'}
        </button>
      )}
      {category === 'permanent' && (
        <p className="panel-error__hint">
          If this continues, please contact support.
        </p>
      )}
    </div>
  );
}
