/**
 * JourneySnapshot — compact dashboard card showing trajectory direction,
 * emerging themes, and a one-sentence excerpt from the Journey Map.
 *
 * Reads from analysis/journeyMap/users/{uid} → dashboardSummary
 * See: YDJ_JourneyMap_DashboardCard_Implementation_Brief.md
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useAuth } from '../../contexts/AuthContext';

const TRAJECTORY_COLORS = {
  'Ascending':            '#5B9E6B',
  'Productive Stability': '#B8862A',
  'Stretching':           '#4A9EC4',
  'Plateauing':           '#C4943A',
  'Struggling':           '#C45252',
  'Recalibrating':        '#8B5EA0',
};

const TRAJECTORY_ICONS = {
  'Ascending':            '↑',
  'Productive Stability': '◆',
  'Stretching':           '⟳',
  'Plateauing':           '—',
  'Struggling':           '↓',
  'Recalibrating':        '⟲',
};

const TRAJECTORY_LABELS = {
  'Ascending':            'Ascending',
  'Productive Stability': 'Stable',
  'Stretching':           'Stretching',
  'Plateauing':           'Plateauing',
  'Struggling':           'Struggling',
  'Recalibrating':        'Recalibrating',
};

export default function JourneySnapshot() {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    async function fetchSummary() {
      try {
        const ref = doc(db, 'analysis', 'journeyMap', 'users', currentUser.uid);
        const snap = await getDoc(ref);
        if (!cancelled && snap.exists()) {
          setData(snap.data().dashboardSummary || null);
        }
      } catch (err) {
        console.error('[JourneySnapshot] fetch failed:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSummary();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Loading shimmer
  if (loading) {
    return (
      <>
        <div className="snapshot-section-header">
          <span className="snapshot-label">🗺 Your Journey</span>
        </div>
        <div className="journey-snapshot journey-snapshot--loading">
          <div className="journey-snapshot-shimmer journey-snapshot-shimmer--lg" />
          <div className="journey-snapshot-shimmer journey-snapshot-shimmer--sm" />
        </div>
      </>
    );
  }

  // Empty state — no dashboardSummary
  if (!data || !data.trajectoryDirection) {
    return (
      <>
        <div className="snapshot-section-header">
          <span className="snapshot-label">🗺 Your Journey</span>
        </div>
        <div className="journey-snapshot journey-snapshot--empty">
          <p className="journey-snapshot-excerpt">
            Generate your Journey Map to see your trajectory here.
          </p>
        </div>
      </>
    );
  }

  const direction = data.trajectoryDirection;
  const color = TRAJECTORY_COLORS[direction] || '#B8862A';

  return (
    <>
      <div className="snapshot-section-header">
        <span className="snapshot-label">🗺 Your Journey</span>
      </div>
      <div
        className="journey-snapshot"
        data-trajectory={direction}
        style={{ '--trajectory-color': color }}
      >
        <div className="journey-snapshot-badge">
          <span className="trajectory-icon">{TRAJECTORY_ICONS[direction]}</span>
          <span className="trajectory-label">{TRAJECTORY_LABELS[direction]}</span>
        </div>

        <div className="journey-snapshot-content">
          <p className="journey-snapshot-excerpt">{data.excerpt}</p>

          {data.emergingThemes?.length > 0 && (
            <div className="journey-snapshot-themes">
              {data.emergingThemes.map((theme, i) => (
                <span key={i} className="theme-chip">{theme}</span>
              ))}
            </div>
          )}

          <Link to="/outputs/journey-map" className="journey-snapshot-link">
            View your Journey Map →
          </Link>
        </div>
      </div>
    </>
  );
}
