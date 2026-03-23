import { useState, useCallback, useRef } from 'react';

const SECTION_CFG = {
  mental: {
    key: 'mental', label: 'Mental / Emotional', icon: '\u{1F9E0}', prefix: 'm',
    dotClass: 'sp-dot-mental', labelClass: 'sp-label-mental',
    iconClass: 'sp-icon-mental', cueClass: 'sp-cue-mental', logClass: 'sp-log-mental',
  },
  technical: {
    key: 'technical', label: 'Technical', icon: '\u{1F3C7}', prefix: 't',
    dotClass: 'sp-dot-tech', labelClass: 'sp-label-tech',
    iconClass: 'sp-icon-tech', cueClass: 'sp-cue-tech', logClass: 'sp-log-tech',
  },
  physical: {
    key: 'physical', label: 'Physical / Kinesthetic', icon: '\u{1F33F}', prefix: 'p',
    dotClass: 'sp-dot-body', labelClass: 'sp-label-body',
    iconClass: 'sp-icon-body', cueClass: 'sp-cue-body', logClass: 'sp-log-body',
  },
};

const SECTION_KEYS = ['mental', 'technical', 'physical'];

function todayStr() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Convert v1 week format (training_sessions/mental_prep) to v2 (mental/technical/physical arrays).
 * Returns the week unchanged if it already has v2 fields.
 */
function normalizeWeek(week) {
  if (!week) return week;
  if (week.mental || week.technical || week.physical) return week; // already v2

  const mental = [];
  const technical = [];
  const physical = [];

  // Convert mental_prep to mental item
  if (week.mental_prep) {
    mental.push({
      title: week.mental_prep.focus || 'Mental Preparation',
      body: week.mental_prep.practice || '',
      cue: week.mental_prep.addresses_concern || week.mental_prep.focus || '',
    });
  }

  // Convert training_sessions to technical/physical items
  (week.training_sessions || []).forEach(session => {
    const item = {
      title: session.description?.split('.')[0]?.substring(0, 40) || session.session_type || 'Training',
      body: session.description || '',
      cue: session.exercises?.[0]?.tips || session.exercises?.[0]?.purpose || session.description || '',
    };
    if (session.session_type === 'mental') {
      mental.push(item);
    } else if (session.session_type === 'logistics') {
      // skip logistics for now
    } else {
      technical.push(item);
    }
  });

  // Convert week_goals to physical items if we have none
  if (physical.length === 0 && week.week_goals?.length) {
    physical.push({
      title: 'Week Goals',
      body: week.week_goals.join('. '),
      cue: week.readiness_checkpoint || week.week_goals[0] || '',
    });
  }

  return { ...week, mental, technical, physical };
}

/**
 * Full interactive preparation plan matching ydj-show-planner-v3.html reference.
 * Features: week switching, drag-reorder sections, pin/check/log-practice, pinned bar.
 */
export default function PreparationPlanDisplay({ data }) {
  const [activeWeek, setActiveWeek] = useState(data.weeks?.[0]?.week_number || 1);
  const [sectionOrder, setSectionOrder] = useState(SECTION_KEYS);
  const [pins, setPins] = useState({});
  const [checks, setChecks] = useState({});
  const [logs, setLogs] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [cardTitles, setCardTitles] = useState({});
  const dragSrc = useRef(null);

  const totalWeeks = data.total_weeks || data.weeks?.length || 0;
  const rawWeek = data.weeks?.find(w => w.week_number === activeWeek) || data.weeks?.[0];
  const week = normalizeWeek(rawWeek);
  const progress = totalWeeks > 0 ? Math.round(((totalWeeks - activeWeek + 1) / totalWeeks) * 100) : 0;

  // Pin/check/log handlers
  const togglePin = useCallback((id, title) => {
    setPins(prev => ({ ...prev, [id]: !prev[id] }));
    setCardTitles(prev => ({ ...prev, [id]: title }));
  }, []);

  const toggleCheck = useCallback((id) => {
    setChecks(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const logPractice = useCallback((id) => {
    const today = todayStr();
    setLogs(prev => {
      const existing = prev[id] || [];
      if (existing.includes(today)) return prev;
      return { ...prev, [id]: [...existing, today] };
    });
  }, []);

  const toggleCollapse = useCallback((key) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Drag handlers for section reordering
  const onDragStart = useCallback((key) => {
    dragSrc.current = key;
  }, []);

  const onDrop = useCallback((targetKey) => {
    if (!dragSrc.current || dragSrc.current === targetKey) return;
    setSectionOrder(prev => {
      const next = [...prev];
      const srcIdx = next.indexOf(dragSrc.current);
      const tgtIdx = next.indexOf(targetKey);
      next.splice(srcIdx, 1);
      next.splice(tgtIdx, 0, dragSrc.current);
      return next;
    });
    dragSrc.current = null;
  }, []);

  // Pinned items list
  const pinnedItems = Object.entries(pins)
    .filter(([, v]) => v)
    .map(([id]) => cardTitles[id])
    .filter(Boolean);

  // Debug: log the actual data shape to help troubleshoot rendering
  console.log('[PreparationPlanDisplay] data:', JSON.stringify({
    hasWeeks: !!data.weeks,
    weekCount: data.weeks?.length,
    firstWeekKeys: data.weeks?.[0] ? Object.keys(data.weeks[0]) : [],
    hasMental: !!data.weeks?.[0]?.mental,
    hasTechnical: !!data.weeks?.[0]?.technical,
    hasPhysical: !!data.weeks?.[0]?.physical,
    hasTrainingSessions: !!data.weeks?.[0]?.training_sessions,
  }));

  if (!week) {
    console.warn('[PreparationPlanDisplay] No matching week found. activeWeek:', activeWeek, 'weeks:', data.weeks?.map(w => w.week_number));
    return <div style={{ padding: '1rem', color: '#7A7A7A', fontStyle: 'italic' }}>No preparation plan weeks available. Try regenerating the plan.</div>;
  }

  return (
    <div className="sp-plan" style={{ border: '2px solid #E0D5C7', borderRadius: '16px', padding: '1.5rem', marginTop: '1.5rem', background: '#FAF8F5' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.2rem' }}>{'\u{1F4C5}'}</span>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#8B7355', margin: 0 }}>
          Preparation Plan — {totalWeeks} Weeks
        </h3>
      </div>

      {/* Summary */}
      {data.plan_summary && (
        <div className="sp-plan-summary">
          <p>{data.plan_summary}</p>
        </div>
      )}

      {/* Week chips */}
      {data.weeks && data.weeks.length > 1 && (
        <div className="sp-week-chips">
          {data.weeks.map(w => (
            <button
              key={w.week_number}
              className={`sp-week-chip${w.week_number === activeWeek ? ' active' : ''}`}
              onClick={() => setActiveWeek(w.week_number)}
            >
              {w.week_number === 1 ? 'Show Wk' : `Wk ${w.week_number}`}
            </button>
          ))}
        </div>
      )}

      {/* Week header */}
      <div className="sp-week-header">
        <div>
          <div className="sp-week-heading">
            {week.week_number === 1 ? 'Show Week!' : `Week ${week.week_number}`}
            {week.theme && <span className="sp-week-theme"> &middot; {week.theme}</span>}
          </div>
          {week.primary_focus && (
            <div className="sp-week-focus">{week.primary_focus}</div>
          )}
        </div>
        <div className="sp-week-progress">
          <div className="sp-week-progress-label">Prep Progress</div>
          <div className="sp-week-progress-bar">
            <div className="sp-week-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Pinned bar */}
      {pinnedItems.length > 0 && (
        <div className="sp-pinned-bar">
          <div className="sp-pinned-label">{'\u{1F4CC}'} Pinned This Week</div>
          <div className="sp-pinned-list">
            {pinnedItems.map((title, i) => (
              <span key={i} className="sp-pinned-tag">{'\u{1F4CC}'} {title}</span>
            ))}
          </div>
        </div>
      )}

      {/* Reorder hint */}
      <div className="sp-reorder-hint">{'\u2807'} Drag sections into your preferred order</div>

      {/* Sections */}
      <div className="sp-sections">
        {sectionOrder.map(key => {
          const items = week[key] || [];
          if (items.length === 0) return null;
          const cfg = SECTION_CFG[key];
          return (
            <SectionBlock
              key={key}
              cfg={cfg}
              items={items}
              weekNum={activeWeek}
              collapsed={!!collapsed[key]}
              onToggleCollapse={() => toggleCollapse(key)}
              pins={pins}
              checks={checks}
              logs={logs}
              onTogglePin={togglePin}
              onToggleCheck={toggleCheck}
              onLogPractice={logPractice}
              onDragStart={() => onDragStart(key)}
              onDrop={() => onDrop(key)}
            />
          );
        })}
      </div>

      {/* Readiness checkpoint */}
      {week.readiness_checkpoint && (
        <div className="sp-checkpoint">
          <div className="sp-checkpoint-label">End-of-Week Check</div>
          <p>{week.readiness_checkpoint}</p>
        </div>
      )}
    </div>
  );
}


function SectionBlock({
  cfg, items, weekNum, collapsed, onToggleCollapse,
  pins, checks, logs, onTogglePin, onToggleCheck, onLogPractice,
  onDragStart, onDrop,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`sp-section-block${dragOver ? ' sp-drag-over' : ''}${dragging ? ' sp-dragging' : ''}`}
      draggable
      onDragStart={(e) => { setDragging(true); e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
      onDragEnd={() => { setDragging(false); setDragOver(false); }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onDrop(); }}
    >
      <div className="sp-section-drag-header">
        <span className="sp-drag-grip">{'\u2807'}</span>
        <div className={`sp-section-dot ${cfg.dotClass}`} />
        <div className={`sp-section-label ${cfg.labelClass}`}>{cfg.label}</div>
        <div className="sp-section-count">{items.length} items</div>
        <button
          className="sp-section-collapse-btn"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '\u25B6' : '\u25BC'}
        </button>
      </div>
      {!collapsed && (
        <div className="sp-section-items">
          {items.map((item, i) => {
            const id = `${cfg.prefix}_w${weekNum}_${i}`;
            return (
              <ItemCard
                key={id}
                id={id}
                item={item}
                cfg={cfg}
                pinned={!!pins[id]}
                checked={!!checks[id]}
                logDates={logs[id] || []}
                onTogglePin={onTogglePin}
                onToggleCheck={onToggleCheck}
                onLogPractice={onLogPractice}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}


function ItemCard({ id, item, cfg, pinned, checked, logDates, onTogglePin, onToggleCheck, onLogPractice }) {
  const [bodyOpen, setBodyOpen] = useState(!checked);
  const today = todayStr();
  const loggedToday = logDates.includes(today);

  return (
    <div className={`sp-item-card${pinned ? ' sp-pinned' : ''}${checked ? ' sp-checked' : ''}`}>
      <div className="sp-done-stripe" />
      <div className="sp-item-header" onClick={() => setBodyOpen(!bodyOpen)}>
        <div className={`sp-item-icon ${cfg.iconClass}`}>{cfg.icon}</div>
        <div className="sp-item-title-block">
          <div className={`sp-item-label ${cfg.labelClass}`}>{cfg.label}</div>
          <div className="sp-item-title">{item.title}</div>
        </div>
        <div className="sp-item-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`sp-pin-btn${pinned ? ' active' : ''}`}
            title="Pin"
            onClick={() => onTogglePin(id, item.title)}
          >{'\u{1F4CC}'}</button>
          <button
            className={`sp-check-btn${checked ? ' active' : ''}`}
            title="Mark done"
            onClick={() => onToggleCheck(id)}
          >{'\u2713'}</button>
        </div>
      </div>
      {bodyOpen && !checked && (
        <div className="sp-item-body">
          <p className="sp-item-text">{item.body}</p>
          <div className={`sp-item-cue ${cfg.cueClass}`}>
            <span className="sp-cue-icon">{'\u2192'}</span>
            <span>{item.cue}</span>
          </div>
          <div className="sp-log-row">
            <button
              className={`sp-log-btn ${cfg.logClass}${loggedToday ? ' logged' : ''}`}
              onClick={() => !loggedToday && onLogPractice(id)}
              disabled={loggedToday}
            >
              {loggedToday
                ? <>{'\u2713'} Practiced <span className="sp-log-date">&middot; {today}</span></>
                : '+ Log practice today'
              }
            </button>
            {logDates.length > 0 && (
              <span className="sp-log-count">{logDates.length}&times; this plan</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
