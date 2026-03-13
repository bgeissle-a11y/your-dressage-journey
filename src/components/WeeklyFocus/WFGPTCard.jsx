import { Link } from 'react-router-dom';

export default function WFGPTCard({ assignments, checkedItems, isPinned, isDone, isCollapsed, onPin, onDone, onToggle, onItemCheck, hasNewer, onUpdate }) {
  return (
    <div className={`insight-card${isPinned ? ' pinned' : ''}${isDone ? ' completed' : ''}`}>
      <div className="done-stripe" />
      <div className="card-header" onClick={onToggle}>
        <div className="card-icon icon-gpt">&#129504;</div>
        <div className="card-title-block">
          <div className="card-label label-gpt">
            Grand Prix Thinking
            {hasNewer && <span className="newer-dot" title="Updated insights available" />}
          </div>
          <div className="card-title">This week&rsquo;s assignments</div>
        </div>
        <div className="card-actions">
          <button className={`pin-btn${isPinned ? ' active' : ''}`} onClick={e => { e.stopPropagation(); onPin(); }}>&#128204;</button>
          <button className={`check-btn${isDone ? ' active' : ''}`} onClick={e => { e.stopPropagation(); onDone(); }}>&checkmark;</button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="card-body">
          {assignments && assignments.length > 0 ? (
            <>
              <ul className="gpt-list">
                {assignments.map((a, i) => (
                  <li key={i} className="gpt-item">
                    <div
                      className={`gpt-check${checkedItems[i] ? ' done' : ''}`}
                      onClick={() => onItemCheck('gpt', i)}
                    >&checkmark;</div>
                    <div>
                      <div className="gpt-title">{a.title}</div>
                      <div className="gpt-desc">{a.description}</div>
                      <div className="gpt-note">&nearr; Builds toward: {a.buildToward}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <Link to="/insights?tab=grandprix" className="insight-link" style={{ marginTop: '10px', display: 'inline-flex' }}>
                View full Grand Prix Thinking &rarr;
              </Link>
              {hasNewer && (
                <button className="update-btn" onClick={onUpdate}>Update to latest</button>
              )}
            </>
          ) : (
            <div className="no-show-state">
              <div className="no-show-icon">&#129504;</div>
              Grand Prix Thinking assignments will appear here after your data reaches the analysis threshold.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
