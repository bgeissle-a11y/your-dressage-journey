import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase-config';
import { MOVEMENT_CATEGORIES } from '../../services/debriefService';

/* Map count → CSS level class */
function countToLevel(c) {
  if (c === 0) return 'lv0';
  if (c <= 2) return 'lv1';
  if (c <= 5) return 'lv2';
  if (c <= 8) return 'lv3';
  return 'lv4';
}

/* Extract timestamp as ms */
function toMs(ts) {
  if (!ts) return 0;
  if (ts.toDate) return ts.toDate().getTime();
  if (typeof ts === 'string') return new Date(ts).getTime();
  return 0;
}

export default function MovementCoverageHeatmap() {
  const { currentUser } = useAuth();
  const [counts, setCounts] = useState(null);
  const [debriefCount, setDebriefCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    async function fetchData() {
      try {
        // Top-level debriefs collection, scoped by userId, exclude soft-deleted
        const q = query(
          collection(db, 'debriefs'),
          where('userId', '==', currentUser.uid),
          where('isDeleted', '==', false)
        );
        const snap = await getDocs(q);
        const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Sort by submittedAt descending, take last 12
        allDocs.sort((a, b) => toMs(b.submittedAt) - toMs(a.submittedAt));
        const recent = allDocs.slice(0, 12);
        setDebriefCount(recent.length);

        const tagCounts = {};
        recent.forEach(debrief => {
          (debrief.movements || []).forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        });
        setCounts(tagCounts);
      } catch (err) {
        console.warn('MovementCoverageHeatmap fetch error:', err);
        setCounts({});
      }
      setLoading(false);
    }
    fetchData();
  }, [currentUser]);

  if (loading) return null;

  // Empty state: < 3 debriefs
  if (debriefCount < 3) {
    return (
      <div>
        <div className="viz-col-title">What You've Been Working On &middot; Last 12 Rides</div>
        <div className="viz-placeholder">Log a few more rides to see your training coverage.</div>
      </div>
    );
  }

  const rideLabel = debriefCount === 1 ? '1 Ride' : `${debriefCount} Rides`;

  return (
    <div>
      <div className="viz-col-title">What You've Been Working On &middot; Last {rideLabel}</div>
      <div className="mvmt-heatmap">
        {MOVEMENT_CATEGORIES.map(cat => (
          <div key={cat.label} className="mvmt-category">
            <div className="mvmt-cat-label">{cat.label}</div>
            <div className="mvmt-chips">
              {cat.tags.map(tag => {
                const c = (counts && counts[tag.value]) || 0;
                const lvl = countToLevel(c);
                const tip = c > 0
                  ? `${c} of last ${debriefCount} rides`
                  : 'Not logged recently';
                return (
                  <span key={tag.value} className={`mvmt-chip ${lvl}`} title={tip}>
                    {tag.label}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mvmt-legend">
        <span className="mvmt-legend-label">Not logged</span>
        <div className="mvmt-legend-swatches">
          <span className="mvmt-legend-swatch mvmt-chip lv0">&nbsp;</span>
          <span className="mvmt-legend-swatch mvmt-chip lv1">&nbsp;</span>
          <span className="mvmt-legend-swatch mvmt-chip lv2">&nbsp;</span>
          <span className="mvmt-legend-swatch mvmt-chip lv3">&nbsp;</span>
          <span className="mvmt-legend-swatch mvmt-chip lv4">&nbsp;</span>
        </div>
        <span className="mvmt-legend-label">1&ndash;2 &middot; 3&ndash;5 &middot; 6&ndash;8 &middot; 9+ rides</span>
      </div>

      <div className="viz-note">Darker = worked on more recently or more often &middot; Faded = not touched lately</div>
    </div>
  );
}
