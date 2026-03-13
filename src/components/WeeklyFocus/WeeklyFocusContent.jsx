import WFCelebration from './WFCelebration';
import WFCoachingCard from './WFCoachingCard';
import WFGPTCard from './WFGPTCard';
import WFPhysicalCard from './WFPhysicalCard';
import WFShowCard from './WFShowCard';
import WFModeBar from './WFModeBar';

export default function WeeklyFocusContent({
  celebration,
  coaching,
  gptAssignments,
  physicalItems,
  show,
  pinned,
  togglePin,
  completed,
  toggleDone,
  collapsed,
  toggleCollapse,
  checkedItems,
  handleItemCheck,
  mode,
  setMode,
  hasNewerContent,
  updateToLatest,
}) {
  const priorityClass = mode === 'priority' ? ' priority-mode-active' : '';

  return (
    <div className={`wf-content${priorityClass}`}>
      {celebration && <WFCelebration {...celebration} />}

      <WFModeBar mode={mode} onModeChange={setMode} />

      <div className="sections-grid">
        <WFCoachingCard
          data={coaching}
          isPinned={pinned.has('coaching')}
          isDone={completed.has('coaching')}
          isCollapsed={collapsed.has('coaching')}
          onPin={() => togglePin('coaching')}
          onDone={() => toggleDone('coaching')}
          onToggle={() => toggleCollapse('coaching')}
          hasNewer={hasNewerContent?.coaching}
          onUpdate={() => updateToLatest?.('coaching')}
        />

        <WFGPTCard
          assignments={gptAssignments}
          checkedItems={checkedItems?.gpt || []}
          isPinned={pinned.has('gpt')}
          isDone={completed.has('gpt')}
          isCollapsed={collapsed.has('gpt')}
          onPin={() => togglePin('gpt')}
          onDone={() => toggleDone('gpt')}
          onToggle={() => toggleCollapse('gpt')}
          onItemCheck={handleItemCheck}
          hasNewer={hasNewerContent?.gpt}
          onUpdate={() => updateToLatest?.('gpt')}
        />

        <WFPhysicalCard
          items={physicalItems}
          checkedItems={checkedItems?.physical || []}
          isPinned={pinned.has('physical')}
          isDone={completed.has('physical')}
          isCollapsed={collapsed.has('physical')}
          onPin={() => togglePin('physical')}
          onDone={() => toggleDone('physical')}
          onToggle={() => toggleCollapse('physical')}
          onItemCheck={handleItemCheck}
          hasNewer={hasNewerContent?.physical}
          onUpdate={() => updateToLatest?.('physical')}
        />

        <WFShowCard
          show={show}
          checkedItems={checkedItems?.show || []}
          isPinned={pinned.has('show')}
          isDone={completed.has('show')}
          isCollapsed={collapsed.has('show')}
          onPin={() => togglePin('show')}
          onDone={() => toggleDone('show')}
          onToggle={() => toggleCollapse('show')}
          onItemCheck={handleItemCheck}
          hasNewer={hasNewerContent?.show}
          onUpdate={() => updateToLatest?.('show')}
        />
      </div>

      <div className="focus-footer">
        <em>Your job during the ride is to feel. Your job after is to tell the truth about what you felt.</em>
      </div>
    </div>
  );
}
