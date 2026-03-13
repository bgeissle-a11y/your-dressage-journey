import { Link } from 'react-router-dom';

const VOICE_CLASSES = {
  classical_master: 'voice-0',
  empathetic_coach: 'voice-1',
  technical_coach: 'voice-2',
  practical_strategist: 'voice-3',
};

const VOICE_LABELS = {
  classical_master: 'The Classical Master',
  empathetic_coach: 'The Empathetic Coach',
  technical_coach: 'The Technical Coach',
  practical_strategist: 'The Practical Strategist',
};

export default function WFCoachingCard({ data, isPinned, isDone, isCollapsed, onPin, onDone, onToggle, hasNewer, onUpdate }) {
  return (
    <div className={`insight-card${isPinned ? ' pinned' : ''}${isDone ? ' completed' : ''}`}>
      <div className="done-stripe" />
      <div className="card-header" onClick={onToggle}>
        <div className="card-icon icon-coaching">&#127919;</div>
        <div className="card-title-block">
          <div className="card-label label-coaching">
            Key Insight &middot; Multi-Voice
            {hasNewer && <span className="newer-dot" title="Updated insights available" />}
          </div>
          <div className="card-title">{data?.title || 'Coaching Insight'}</div>
        </div>
        <div className="card-actions">
          <button className={`pin-btn${isPinned ? ' active' : ''}`} onClick={e => { e.stopPropagation(); onPin(); }}>&#128204;</button>
          <button className={`check-btn${isDone ? ' active' : ''}`} onClick={e => { e.stopPropagation(); onDone(); }}>&checkmark;</button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="card-body">
          {data ? (
            <>
              {data.excerpts.map((ex, i) => (
                <div key={i}>
                  <div className={`voice-tag ${VOICE_CLASSES[ex.voice] || 'voice-2'}`}>
                    {VOICE_LABELS[ex.voice] || ex.voice}
                  </div>
                  <div className="insight-text" style={i > 0 ? { fontSize: '12px', marginBottom: '10px' } : undefined}>
                    &ldquo;{ex.text}&rdquo;
                  </div>
                </div>
              ))}
              <Link to="/insights?tab=coaching" className="insight-link">View full Multi-Voice Analysis &rarr;</Link>
              {data.reflectionNudge && (
                <div className="reflection-nudge">{data.reflectionNudge}</div>
              )}
              {hasNewer && (
                <button className="update-btn" onClick={onUpdate}>Update to latest</button>
              )}
            </>
          ) : (
            <div className="no-show-state">
              <div className="no-show-icon">&#127919;</div>
              Your coaching insight will appear here after your first Multi-Voice analysis.
              Log at least 5 rides to activate AI coaching.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
