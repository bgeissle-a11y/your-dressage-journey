/**
 * Chart 5: Goal Progress Dashboard
 * Progress bars showing AI-mapped goal progress with evidence.
 * Uses CSS-based progress bars (not Recharts).
 */

export default function GoalProgressDashboard({ data, loading }) {
  if (loading) {
    return (
      <div className="dv-chart-loading">
        <div className="spinner spinner--small" />
        <p>Mapping your progress against goals...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="dv-no-data">Goal progress will appear here once AI insights are generated.</p>;
  }

  return (
    <div className="dv-goal-progress">
      {data.map((goal, i) => (
        <div key={i} className="dv-goal-item">
          <div className="dv-goal-item__header">
            <span className="dv-goal-item__name">
              {goal.goal}
              {goal.inferred_goal && (
                <span className="dv-goal-item__inferred"> (inferred)</span>
              )}
            </span>
            <span className="dv-goal-item__pct">{goal.progress_pct}%</span>
          </div>
          <div className="dv-goal-item__bar">
            <div
              className="dv-goal-item__fill"
              style={{ width: `${Math.min(100, Math.max(0, goal.progress_pct))}%` }}
            />
          </div>
          {goal.current_status && (
            <p className="dv-goal-item__status">{goal.current_status}</p>
          )}
          {goal.milestones && goal.milestones.length > 0 && (
            <div className="dv-goal-item__milestones">
              {goal.milestones.map((m, j) => (
                <div key={j} className="dv-goal-milestone">
                  <span className={`dv-goal-milestone__badge dv-goal-milestone__badge--${m.significance}`}>
                    {m.significance}
                  </span>
                  <span className="dv-goal-milestone__text">{m.description}</span>
                </div>
              ))}
            </div>
          )}
          {goal.next_step && (
            <p className="dv-goal-item__next"><strong>Next:</strong> {goal.next_step}</p>
          )}
        </div>
      ))}
    </div>
  );
}
