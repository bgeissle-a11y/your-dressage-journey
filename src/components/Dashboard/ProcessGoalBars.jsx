import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase-config';

const BAR_COLORS = ['#b8862a', '#3d6b46', '#2e5c82', '#7a3f72', '#8b6340'];

export default function ProcessGoalBars() {
  const { currentUser } = useAuth();
  const [goalData, setGoalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    async function fetchData() {
      try {
        // Fetch last 20 debriefs with prevGoalRatings
        const q = query(
          collection(db, `users/${currentUser.uid}/debriefs`),
          where('prevGoalRatings', '!=', null),
          orderBy('prevGoalRatings'),
          orderBy('submittedAt', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => d.data());

        if (docs.length === 0) {
          setGoalData(null);
          setLoading(false);
          return;
        }

        // Also fetch the most recent debrief to find current goals
        const recentQ = query(
          collection(db, `users/${currentUser.uid}/debriefs`),
          orderBy('submittedAt', 'desc'),
          limit(1)
        );
        const recentSnap = await getDocs(recentQ);
        const mostRecent = recentSnap.docs[0]?.data() || {};
        const currentGoalTexts = new Set();
        ['processGoal1', 'processGoal2', 'processGoal3'].forEach(key => {
          const val = mostRecent[key];
          if (val && typeof val === 'string' && val.trim()) {
            currentGoalTexts.add(val.trim());
          }
        });

        // Group by goal text
        const goalMap = {};
        docs.forEach(debrief => {
          const ratings = debrief.prevGoalRatings || {};
          ['goal1', 'goal2', 'goal3'].forEach(key => {
            const entry = ratings[key];
            if (!entry || !entry.text || !entry.text.trim()) return;
            const text = entry.text.trim();
            if (!goalMap[text]) {
              goalMap[text] = { text, met: 0, total: 0, lastSeen: debrief.submittedAt };
            }
            goalMap[text].total++;
            if (entry.rating === 'mostly' || entry.rating === 'fully') {
              goalMap[text].met++;
            }
          });
        });

        // Sort by most recently seen, cap at 5
        const sorted = Object.values(goalMap)
          .sort((a, b) => {
            const aTime = a.lastSeen?.toDate ? a.lastSeen.toDate().getTime() : (a.lastSeen || 0);
            const bTime = b.lastSeen?.toDate ? b.lastSeen.toDate().getTime() : (b.lastSeen || 0);
            return bTime - aTime;
          })
          .slice(0, 5);

        // Mark current vs previous
        const result = sorted.map(g => ({
          ...g,
          pct: Math.round((g.met / g.total) * 100),
          isCurrent: currentGoalTexts.has(g.text),
        }));

        setGoalData({ goals: result, rideCount: docs.length });
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
      <div className="viz-note">% of rides rated &ldquo;Mostly&rdquo; or &ldquo;Fully&rdquo; met &middot; Last {rideLabel} rides</div>
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
