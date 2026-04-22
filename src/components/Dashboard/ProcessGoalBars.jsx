import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase-config';

const BAR_COLORS = ['#b8862a', '#3d6b46', '#2e5c82', '#7a3f72', '#8b6340'];

const RATING_WEIGHTS = {
  'not-at-all': 0,
  'somewhat':   33,
  'mostly':     67,
  'fully':      100,
};

/* Helper: extract timestamp as ms number */
function toMs(ts) {
  if (!ts) return 0;
  if (ts.toDate) return ts.toDate().getTime();
  if (typeof ts === 'string') return new Date(ts).getTime();
  if (typeof ts === 'number') return ts;
  return 0;
}

export default function ProcessGoalBars() {
  const { currentUser } = useAuth();
  const [goalData, setGoalData] = useState(null);
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

        // Sort by submittedAt descending
        allDocs.sort((a, b) => toMs(b.submittedAt) - toMs(a.submittedAt));

        // The most recent debrief (for current goal detection)
        const mostRecent = allDocs[0] || {};
        const currentGoalTexts = new Set();
        ['processGoal1', 'processGoal2', 'processGoal3'].forEach(key => {
          const val = mostRecent[key];
          if (val && typeof val === 'string' && val.trim()) {
            currentGoalTexts.add(val.trim());
          }
        });

        // Filter to debriefs with prevGoalRatings, take first 20
        const withRatings = allDocs
          .filter(d => d.prevGoalRatings && typeof d.prevGoalRatings === 'object')
          .slice(0, 20);

        if (withRatings.length === 0) {
          setGoalData(null);
          setLoading(false);
          return;
        }

        // Group by goal text — accumulate weighted score across each rating's independent weight
        const goalMap = {};
        withRatings.forEach(debrief => {
          const ratings = debrief.prevGoalRatings || {};
          ['goal1', 'goal2', 'goal3'].forEach(key => {
            const entry = ratings[key];
            if (!entry || !entry.text || !entry.text.trim()) return;
            const weight = RATING_WEIGHTS[entry.rating];
            if (weight === undefined) return;
            const text = entry.text.trim();
            if (!goalMap[text]) {
              goalMap[text] = { text, scoreSum: 0, total: 0, lastSeen: debrief.submittedAt };
            }
            goalMap[text].total++;
            goalMap[text].scoreSum += weight;
          });
        });

        // Sort by most recently seen, cap at 5
        const sorted = Object.values(goalMap)
          .sort((a, b) => toMs(b.lastSeen) - toMs(a.lastSeen))
          .slice(0, 5);

        // Mark current vs previous
        const result = sorted.map(g => ({
          ...g,
          pct: Math.round(g.scoreSum / g.total),
          isCurrent: currentGoalTexts.has(g.text),
        }));

        setGoalData({ goals: result, rideCount: withRatings.length });
      } catch (err) {
        console.warn('ProcessGoalBars fetch error:', err);
        setGoalData(null);
      }
      setLoading(false);
    }
    fetchData();
  }, [currentUser]);

  if (loading) return null;

  const rideLabel = goalData ? `${goalData.rideCount}` : '20';

  // Empty state
  if (!goalData || goalData.goals.length === 0) {
    return (
      <div>
        <div className="viz-col-title">Process Goals &middot; Follow-Through Rate</div>
        <div className="viz-placeholder">Follow-through data appears after your second debrief with process goals.</div>
      </div>
    );
  }

  const currentGoals = goalData.goals.filter(g => g.isCurrent);
  const previousGoals = goalData.goals.filter(g => !g.isCurrent);

  return (
    <div>
      <div className="viz-col-title">Process Goals &middot; Follow-Through Rate</div>
      <div className="bar-chart">
        {currentGoals.map((g, i) => (
          <GoalBar key={g.text} goal={g} color={BAR_COLORS[i % BAR_COLORS.length]} opacity={1} />
        ))}
        {currentGoals.length > 0 && previousGoals.length > 0 && (
          <div className="goal-divider">Previous goals</div>
        )}
        {previousGoals.map((g, i) => (
          <GoalBar key={g.text} goal={g} color={BAR_COLORS[(currentGoals.length + i) % BAR_COLORS.length]} opacity={0.55} />
        ))}
      </div>
      <div className="viz-note">Weighted follow-through score (Not at all 0 &middot; Somewhat 33 &middot; Mostly 67 &middot; Fully 100) &middot; Last {rideLabel} rides</div>
    </div>
  );
}

function GoalBar({ goal, color, opacity }) {
  const truncated = goal.text.length > 28
    ? goal.text.slice(0, 28) + '\u2026'
    : goal.text;

  return (
    <div className="bar-row" style={{ opacity }} title={goal.text}>
      <div className="bar-label">{truncated}</div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${goal.pct}%`, background: color }} />
      </div>
      <div className="bar-val">{goal.pct}%</div>
    </div>
  );
}
