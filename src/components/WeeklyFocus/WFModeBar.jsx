export default function WFModeBar({ mode, onModeChange }) {
  return (
    <>
      <div className="mode-bar">
        <div className="mode-label">View</div>
        <div className="mode-toggle">
          <button
            className={`mode-btn${mode === 'all' ? ' active' : ''}`}
            onClick={() => onModeChange('all')}
          >All</button>
          <button
            className={`mode-btn${mode === 'priority' ? ' active' : ''}`}
            onClick={() => onModeChange('priority')}
          >My Priorities</button>
        </div>
      </div>
      <div className={`mode-hint${mode === 'priority' ? ' visible' : ''}`}>
        Pin what matters most this week &mdash; everything else will step back.
      </div>
    </>
  );
}
