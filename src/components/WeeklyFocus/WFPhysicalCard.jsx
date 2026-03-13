import { Link } from 'react-router-dom';

export default function WFPhysicalCard({ items, checkedItems, isPinned, isDone, isCollapsed, onPin, onDone, onToggle, onItemCheck, hasNewer, onUpdate }) {
  return (
    <div className={`insight-card${isPinned ? ' pinned' : ''}${isDone ? ' completed' : ''}`}>
      <div className="done-stripe" />
      <div className="card-header" onClick={onToggle}>
        <div className="card-icon icon-physical">&#127807;</div>
        <div className="card-title-block">
          <div className="card-label label-physical">
            Physical Awareness
            {hasNewer && <span className="newer-dot" title="Updated insights available" />}
          </div>
          <div className="card-title">What your body keeps saying</div>
        </div>
        <div className="card-actions">
          <button className={`pin-btn${isPinned ? ' active' : ''}`} onClick={e => { e.stopPropagation(); onPin(); }}>&#128204;</button>
          <button className={`check-btn${isDone ? ' active' : ''}`} onClick={e => { e.stopPropagation(); onDone(); }}>&checkmark;</button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="card-body">
          {items && items.length > 0 ? (
            <>
              <ul className="phys-list">
                {items.map((item, i) => (
                  <li key={i} className="phys-item">
                    <div
                      className="phys-dot"
                      style={item.isHorseHealth ? { background: 'var(--rust)' } : undefined}
                    />
                    <div
                      className="phys-text"
                      style={item.isHorseHealth ? { color: 'var(--rust)' } : undefined}
                    >
                      <strong>{item.text}</strong>
                      {item.sub && <div className="phys-sub">{item.sub}</div>}
                    </div>
                    <div
                      className={`phys-check${checkedItems[i] ? ' done' : ''}`}
                      onClick={() => onItemCheck('physical', i)}
                    >&checkmark;</div>
                  </li>
                ))}
              </ul>
              <div className="reflection-nudge">These aren&rsquo;t corrections to force. They&rsquo;re things to feel.</div>
              <Link to="/insights" className="insight-link" style={{ marginTop: '10px', display: 'inline-flex' }}>
                View full Physical Guidance &rarr;
              </Link>
              {hasNewer && (
                <button className="update-btn" onClick={onUpdate}>Update to latest</button>
              )}
            </>
          ) : (
            <div className="no-show-state">
              <div className="no-show-icon">&#127807;</div>
              Physical awareness items will appear here after you complete a Physical Self-Assessment.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
