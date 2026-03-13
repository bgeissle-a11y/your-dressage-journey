import useWeeklyFocus from '../hooks/useWeeklyFocus';
import WeeklyFocusContent from '../components/WeeklyFocus/WeeklyFocusContent';

export default function WeeklyFocusPage() {
  const wf = useWeeklyFocus();

  // Week range for header
  const today = new Date();
  const monday = new Date(today);
  const dayOfWeek = monday.getDay();
  monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const weekRange = `${monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}\u2013${sunday.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;

  if (wf.loading) {
    return <div className="dashboard-loading">Loading your weekly focus...</div>;
  }

  if (wf.error) {
    return <div className="dashboard-loading" style={{ color: 'var(--rust)' }}>Error: {wf.error}</div>;
  }

  return (
    <div className="page">
      <div className="welcome-strip">
        <div>
          <h1>Weekly Focus</h1>
          <div className="welcome-sub">{weekRange}</div>
        </div>
        <div className="welcome-tagline">
          {wf.progress.done} of {wf.progress.total} items touched
        </div>
      </div>

      <WeeklyFocusContent
        celebration={wf.celebration}
        coaching={wf.coaching}
        gptAssignments={wf.gptAssignments}
        physicalItems={wf.physicalItems}
        show={wf.show}
        pinned={wf.pinned}
        togglePin={wf.togglePin}
        completed={wf.completed}
        toggleDone={wf.toggleDone}
        collapsed={wf.collapsed}
        toggleCollapse={wf.toggleCollapse}
        checkedItems={wf.checkedItems}
        handleItemCheck={wf.handleItemCheck}
        mode={wf.mode}
        setMode={wf.setMode}
        hasNewerContent={wf.hasNewerContent}
        updateToLatest={wf.updateToLatest}
      />
    </div>
  );
}
