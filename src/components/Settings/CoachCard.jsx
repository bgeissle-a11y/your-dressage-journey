import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  toggleCoachSharing,
  removeCoach as removeCoachFromFirestore,
} from '../../services/settingsService';

export default function CoachCard({ coach, userId, showToast, onRemoved, onUpdated }) {
  const [removing, setRemoving] = useState(false);

  const handleToggle = async (e) => {
    const newSharing = e.target.checked;
    const result = await toggleCoachSharing(
      userId,
      coach.id,
      newSharing,
      coach.optInDate
    );

    if (result.success) {
      const updates = newSharing
        ? {
            sharingEnabled: true,
            optInDate: coach.optInDate ?? new Date().toISOString().slice(0, 10),
            optOutDate: null,
          }
        : {
            sharingEnabled: false,
            optOutDate: new Date().toISOString().slice(0, 10),
          };
      onUpdated(coach.id, updates);
      showToast(newSharing ? 'Sharing enabled' : 'Sharing paused');
    } else {
      showToast('Error updating sharing');
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${coach.name}? They will no longer be on your Pre-Lesson Summary sharing list.`)) {
      return;
    }

    // Animate out
    setRemoving(true);
    setTimeout(async () => {
      const result = await removeCoachFromFirestore(userId, coach.id);
      if (result.success) {
        onRemoved(coach.id);
        showToast(`${coach.name} removed`);
      } else {
        setRemoving(false);
        showToast('Error removing coach');
      }
    }, 200);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const initial = coach.name?.charAt(0).toUpperCase() || '?';

  return (
    <div className={`coach-card${coach.sharingEnabled ? ' sharing-on' : ''}${removing ? ' removing' : ''}`}>
      <div className="coach-card-header">
        <div className="coach-avatar">{initial}</div>
        <div className="coach-info">
          <div className="coach-name">{coach.name}</div>
          <div className="coach-email">{coach.email}</div>
        </div>
        <button className="coach-remove-btn" onClick={handleRemove}>Remove</button>
      </div>
      <div className="coach-share-row">
        <div className="share-label-group">
          <div className="share-label" title={`Pre-Lesson Summary sharing with ${coach.name}`}>Sharing enabled</div>
          {coach.sharingEnabled ? (
            <div className="share-consent-date">
              &#10003; Sharing on{coach.optInDate ? ` since ${formatDate(coach.optInDate)}` : ''}
            </div>
          ) : (
            <div className="share-consent-off">Sharing off</div>
          )}
        </div>
        <label className="settings-toggle-wrap">
          <input
            type="checkbox"
            checked={coach.sharingEnabled}
            onChange={handleToggle}
          />
          <span className="settings-toggle-slider" />
        </label>
      </div>
      {coach.sharingEnabled && (
        <div className="coach-brief-link-row">
          <Link to="/lesson-prep" className="coach-brief-link">
            View & Send Pre-Lesson Summary {'\u2192'}
          </Link>
        </div>
      )}
    </div>
  );
}
