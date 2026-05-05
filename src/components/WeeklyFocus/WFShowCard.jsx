import { Link } from 'react-router-dom';
import CadenceInfoTip from '../InfoTip/CadenceInfoTip';

const WEEK_SUBS = {
  10: 'Intention — set your direction and take stock',
  9: 'Groundwork — habits, transitions, and body awareness',
  8: 'Foundation — establish the physical and mental baseline',
  7: 'Technical — geometry, accuracy, and test knowledge',
  6: 'Build — condition your recovery reflexes',
  5: 'Refine — peak schooling, quality over quantity',
  4: 'Sharpen — entries, halts, and test accuracy',
  3: 'Solidify — no new experiments',
  2: 'Trust — the horse, the training, yourself',
  1: 'Arrive ready — mindset, routines, peak readiness',
};

const BADGE_CLASS = { mental: 'badge-mental', tech: 'badge-tech', technical: 'badge-tech', physical: 'badge-physical' };
const AREA_LABEL = { mental: 'Mental', tech: 'Technical', technical: 'Technical', physical: 'Physical' };

export default function WFShowCard({ show, checkedItems, isPinned, isDone, isCollapsed, onPin, onDone, onToggle, onItemCheck, hasNewer, onUpdate }) {
  const state = show?.state || 'no_shows';
  const hasActiveShow = state === 'active_show';

  // For active state: build the 3 tasks (one per area)
  const tasks = show?.showTasks || [];
  const weekNum = show?.weekNum || 0;

  function handleCheck(area) {
    const key = `${weekNum}-${area}`;
    onItemCheck?.('show', key);
  }

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
            {hasActiveShow
              ? `${show.name} · ${show.daysOut} day${show.daysOut !== 1 ? 's' : ''} out`
              : 'Nothing on the calendar yet'}
            <CadenceInfoTip outputSlug="event-planner" />
          </div>
        </div>
        <div className="card-actions">
          <button className={`pin-btn${isPinned ? ' active' : ''}`} onClick={e => { e.stopPropagation(); onPin(); }}>&#128204;</button>
          <button className={`check-btn${isDone ? ' active' : ''}`} onClick={e => { e.stopPropagation(); onDone(); }}>{'\u2713'}</button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="card-body">
          {/* Active state — show within 60 days */}
          {hasActiveShow && (
            <>
              <div className="show-callout">
                <span>&#128197;</span>
                <span>Week {weekNum} &middot; {WEEK_SUBS[weekNum] || ''}</span>
              </div>
              <ul className="show-tasks">
                {tasks.map(task => {
                  const key = `${weekNum}-${task.area}`;
                  const checked = !!checkedItems?.[key];
                  return (
                    <li key={task.area} className="show-task">
                      <div
                        className={`show-checkbox${checked ? ' done' : ''}`}
                        onClick={() => handleCheck(task.area)}
                      >{'\u2713'}</div>
                      <div className="show-task-body">
                        <div className={`show-task-title${checked ? ' done-text' : ''}`}>{task.title}</div>
                        <div className="show-task-cue">{task.cue}</div>
                      </div>
                      <div className={`show-area-badge ${BADGE_CLASS[task.area] || ''}`}>{AREA_LABEL[task.area] || task.area}</div>
                    </li>
                  );
                })}
              </ul>
              <Link to={`/show-planner/${show.showId}`} className="insight-link" style={{ marginTop: '14px', display: 'inline-flex', color: 'var(--rust)' }}>
                View full Show Plan &rarr;
              </Link>
              {hasNewer && (
                <button className="update-btn" onClick={onUpdate}>Update to latest</button>
              )}
            </>
          )}

          {/* Empty state — no show within 60 days */}
          {!hasActiveShow && (
            <div className="no-show-state">
              <div className="no-show-icon">&#128197;</div>
              No upcoming shows logged. When you add an event in the Journey Event Log,
              your preparation checklist and timeline will appear here automatically.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
