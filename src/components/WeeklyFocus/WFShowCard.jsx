import { Link } from 'react-router-dom';

function DaysOutBadge({ daysOut }) {
  const color = daysOut > 30 ? 'var(--sage)' : daysOut > 7 ? 'var(--gold)' : 'var(--rust)';
  return (
    <span className="show-days-badge" style={{ color, borderColor: color }}>
      {daysOut} day{daysOut !== 1 ? 's' : ''} out
    </span>
  );
}

export default function WFShowCard({ show, checkedItems, isPinned, isDone, isCollapsed, onPin, onDone, onToggle, onItemCheck, hasNewer, onUpdate }) {
  const state = show?.state || 'no_shows';
  const hasShow = state !== 'no_shows';

  return (
    <div className={`insight-card${isPinned ? ' pinned' : ''}${isDone ? ' completed' : ''}`}>
      <div className="done-stripe" />
      <div className="card-header" onClick={onToggle}>
        <div className="card-icon icon-show">&#127951;</div>
        <div className="card-title-block">
          <div className="card-label label-show">
            Show Planning
            {hasNewer && <span className="newer-dot" title="Updated insights available" />}
          </div>
          <div className="card-title">
            {state === 'show_week' ? 'SHOW WEEK!' : hasShow ? show.name : 'Nothing on the calendar yet'}
          </div>
        </div>
        <div className="card-actions">
          <button className={`pin-btn${isPinned ? ' active' : ''}`} onClick={e => { e.stopPropagation(); onPin(); }}>&#128204;</button>
          <button className={`check-btn${isDone ? ' active' : ''}`} onClick={e => { e.stopPropagation(); onDone(); }}>&checkmark;</button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="card-body">
          {/* State 1: Active week with EP-3 content */}
          {state === 'active_week' && (
            <>
              <div className="show-meta">
                <DaysOutBadge daysOut={show.daysOut} />
                {show.horseName && <span className="show-horse">{show.horseName}</span>}
                <span className="show-week-badge">Week {show.weekNumber} of {show.totalWeeks}</span>
              </div>
              {show.primaryFocus && (
                <div className="show-focus"><strong>Focus:</strong> {show.primaryFocus}</div>
              )}
              {show.weekGoals?.length > 0 && (
                <ul className="gpt-list">
                  {show.weekGoals.map((goal, i) => (
                    <li key={i} className="gpt-item">
                      <div
                        className={`gpt-check${checkedItems?.[i] ? ' done' : ''}`}
                        onClick={() => onItemCheck?.('show', i)}
                      >&checkmark;</div>
                      <div className="gpt-title">{goal}</div>
                    </li>
                  ))}
                </ul>
              )}
              {show.trainingHighlights?.length > 0 && (
                <div className="show-training">
                  {show.trainingHighlights.map((h, i) => (
                    <div key={i} className="show-highlight">
                      <span className="show-highlight-type">{h.type}</span> {h.description}
                    </div>
                  ))}
                </div>
              )}
              {show.mentalPrepFocus && (
                <div className="reflection-nudge">{show.mentalPrepFocus}</div>
              )}
              {show.readinessCheckpoint && (
                <div className="show-checkpoint">
                  <strong>End-of-week check:</strong> {show.readinessCheckpoint}
                </div>
              )}
              <Link to={`/show-prep/${show.showId}/plan`} className="insight-link" style={{ marginTop: '10px', display: 'inline-flex' }}>
                View full show plan &rarr;
              </Link>
              {hasNewer && (
                <button className="update-btn" onClick={onUpdate}>Update to latest</button>
              )}
            </>
          )}

          {/* State 2: Show week — EP-4 highlights */}
          {state === 'show_week' && (
            <>
              <div className="show-meta">
                <DaysOutBadge daysOut={show.daysOut} />
                {show.horseName && <span className="show-horse">{show.horseName}</span>}
                <span className="show-week-badge show-week-live">Show Day!</span>
              </div>
              {show.warmUpSummary && (
                <div className="show-focus"><strong>Warm-up:</strong> {show.warmUpSummary}</div>
              )}
              {show.mentalCue && (
                <div className="reflection-nudge">{show.mentalCue}</div>
              )}
              <Link to={`/show-prep/${show.showId}/plan`} className="insight-link" style={{ marginTop: '10px', display: 'inline-flex' }}>
                View show-day plan &rarr;
              </Link>
            </>
          )}

          {/* State 3: Plan not yet generated */}
          {state === 'plan_not_generated' && (
            <>
              <div className="show-meta">
                <DaysOutBadge daysOut={show.daysOut} />
                {show.horseName && <span className="show-horse">{show.horseName}</span>}
              </div>
              <p className="show-cta-text">
                Your show plan will create week-by-week preparation guidance tailored to you and {show.horseName || 'your horse'}.
              </p>
              <Link to={`/show-prep/${show.showId}/plan`} className="insight-link show-cta" style={{ marginTop: '10px', display: 'inline-flex' }}>
                Generate your AI show plan &rarr;
              </Link>
            </>
          )}

          {/* State 4: No upcoming shows */}
          {state === 'no_shows' && (
            <div className="no-show-state">
              <div className="no-show-icon">&#128197;</div>
              No upcoming shows on the calendar &mdash; enjoy the training journey.
              <Link to="/show-prep/new" className="insight-link" style={{ marginTop: '10px', display: 'inline-flex' }}>
                Plan a show &rarr;
              </Link>
            </div>
          )}

          {/* State 5a: Before plan date range */}
          {state === 'before_plan' && (
            <>
              <div className="show-meta">
                <DaysOutBadge daysOut={show.daysOut} />
                {show.horseName && <span className="show-horse">{show.horseName}</span>}
              </div>
              <p className="show-cta-text">
                Show prep begins {new Date(show.planStartDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
              <Link to={`/show-prep/${show.showId}/plan`} className="insight-link" style={{ marginTop: '10px', display: 'inline-flex' }}>
                View full show plan &rarr;
              </Link>
            </>
          )}

          {/* State 5b: After plan date range but before show */}
          {state === 'after_plan' && (
            <>
              <div className="show-meta">
                <DaysOutBadge daysOut={show.daysOut} />
                {show.horseName && <span className="show-horse">{show.horseName}</span>}
              </div>
              <p className="show-cta-text">
                Preparation plan complete &mdash; trust the work you&rsquo;ve done!
              </p>
              <Link to={`/show-prep/${show.showId}/plan`} className="insight-link" style={{ marginTop: '10px', display: 'inline-flex' }}>
                View show-day plan &rarr;
              </Link>
            </>
          )}

          {/* State: outside_range fallback */}
          {state === 'outside_range' && (
            <>
              <div className="show-meta">
                <DaysOutBadge daysOut={show.daysOut} />
                {show.horseName && <span className="show-horse">{show.horseName}</span>}
              </div>
              <Link to={`/show-prep/${show.showId}/plan`} className="insight-link" style={{ marginTop: '10px', display: 'inline-flex' }}>
                View show plan &rarr;
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
