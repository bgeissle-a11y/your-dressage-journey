import { useNavigate } from 'react-router-dom';
import './SubscriptionResult.css';

export default function SubscriptionCancel() {
  const navigate = useNavigate();

  return (
    <div className="subscription-result-page">
      <div className="result-card cancel">
        <div className="result-icon cancel-icon">&larr;</div>
        <h1>Checkout Canceled</h1>
        <p className="result-message">
          No worries — nothing was charged. You can come back and subscribe
          whenever you're ready.
        </p>
        <div className="result-actions">
          <button
            className="result-btn primary"
            onClick={() => navigate('/pricing')}
          >
            Back to Plans
          </button>
          <button
            className="result-btn secondary"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
