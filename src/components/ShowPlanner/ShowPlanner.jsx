import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getShowPreparation, resolveTestNames, getAllDebriefs } from '../../services';
import { getTestData, getShortLabel } from '../../services/testDatabase';
import { getEventPlannerStep } from '../../services/aiService';
import TestReferencePanel from '../TestReferencePanel/TestReferencePanel';
import ReadinessSnapshotCard from '../ReadinessSnapshotCard';
import './ShowPlanner.css';

/* ── Section config ────────────────────────────────────────── */

const SECTION_CFG = {
  mental: {
    key: 'mental', label: 'Mental / Emotional', icon: '\u{1F9E0}', prefix: 'm',
    dot: 'var(--mental-color)', labelColor: 'var(--mental-color)',
    iconBg: 'var(--mental-bg)', cueBg: 'var(--mental-bg)', cueBorder: 'var(--mental-color)',
    logBg: 'var(--mental-bg)', logColor: 'var(--mental-color)', logBorder: 'var(--mental-border)',
  },
  technical: {
    key: 'technical', label: 'Technical', icon: '\u{1F3C7}', prefix: 't',
    dot: 'var(--tech-color)', labelColor: 'var(--tech-color)',
    iconBg: 'var(--tech-bg)', cueBg: 'var(--tech-bg)', cueBorder: 'var(--tech-color)',
    logBg: 'var(--tech-bg)', logColor: 'var(--tech-color)', logBorder: 'var(--tech-border)',
  },
  physical: {
    key: 'physical', label: 'Physical / Kinesthetic', icon: '\u{1F33F}', prefix: 'p',
    dot: 'var(--body-color)', labelColor: 'var(--body-color)',
    iconBg: 'var(--body-bg)', cueBg: 'var(--body-bg)', cueBorder: 'var(--body-color)',
    logBg: 'var(--body-bg)', logColor: 'var(--body-color)', logBorder: 'var(--body-border)',
  },
};

const WEEK_THEMES = { 8:'Foundation', 7:'Establish', 6:'Build', 5:'Refine', 4:'Sharpen', 3:'Solidify', 2:'Peak Prep', 1:'Show Week' };
const WEEK_SUBS = {
  8:'Foundation \u2014 establish the physical and mental baseline',
  7:'Technical \u2014 geometry, accuracy, and test knowledge',
  6:'Build \u2014 condition your recovery reflexes',
  5:'Refine \u2014 peak schooling, quality over quantity',
  4:'Sharpen \u2014 entries, halts, and test accuracy',
  3:'Solidify \u2014 no new experiments',
  2:'Trust \u2014 the horse, the training, yourself',
  1:'Arrive ready \u2014 mindset, routines, peak readiness',
};

function todayStr() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Renumber weeks so 1 = Show Week (closest) and N = farthest out, sorted descending. */
function renumberWeeks(weeks) {
  const total = weeks.length;
  return weeks
    .sort((a, b) => a.week_number - b.week_number) // raw order: 1=farthest
    .map((w, i) => ({ ...w, week_number: total - i })) // flip: farthest=N, closest=1
    .sort((a, b) => b.week_number - a.week_number); // display: N→...→1
}

function normalizeWeek(week) {
  if (!week) return week;
  if (week.mental || week.technical || week.physical) return week;
  const mental = [], technical = [], physical = [];
  if (week.mental_prep) {
    mental.push({ title: week.mental_prep.focus || 'Mental Preparation', body: week.mental_prep.practice || '', cue: week.mental_prep.addresses_concern || week.mental_prep.focus || '' });
  }
  (week.training_sessions || []).forEach(s => {
    const item = { title: (s.description || s.session_type || 'Training').split('.')[0].substring(0, 40), body: s.description || '', cue: s.exercises?.[0]?.tips || s.exercises?.[0]?.purpose || s.description || '' };
    if (s.session_type === 'mental') mental.push(item);
    else if (s.session_type !== 'logistics') technical.push(item);
  });
  if (physical.length === 0 && week.week_goals?.length) {
    physical.push({ title: 'Week Goals', body: week.week_goals.join('. '), cue: week.readiness_checkpoint || week.week_goals[0] || '' });
  }
  return { ...week, mental, technical, physical };
}

/* ── Main Component ────────────────────────────────────────── */

export default function ShowPlanner() {
  const { planId } = useParams();
  const { currentUser } = useAuth();

  const [plan, setPlan] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interactive state
  const [activeWeek, setActiveWeek] = useState(null);
  const [sectionOrder, setSectionOrder] = useState(['mental', 'technical', 'physical']);
  const [pins, setPins] = useState({});
  const [checks, setChecks] = useState({});
  const [logs, setLogs] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [cardTitles, setCardTitles] = useState({});
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const [flagState, setFlagState] = useState({});
  const [debriefsCount, setDebriefsCount] = useState(0);
  const [needsGeneration, setNeedsGeneration] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [genError, setGenError] = useState(null);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const dragSrc = useRef(null);

  // Load data
  useEffect(() => {
    if (!planId || !currentUser) return;
    loadData();
  }, [planId, currentUser]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // Load show prep doc
      const prepResult = await getShowPreparation(planId);
      if (!prepResult.success) { setError('Show prep not found.'); setLoading(false); return; }
      const prepData = prepResult.data;
      setPlan(prepData);

      // Load test data
      const testIds = prepData.testsSelected || prepData.tests?.selected || [];
      if (testIds.length > 0) {
        setTestData(getTestData(testIds[0]));
      }

      // Load debrief count for refresh gate
      try {
        const debriefResult = await getAllDebriefs(currentUser.uid);
        if (debriefResult.success) {
          setDebriefsCount(debriefResult.data?.length || 0);
        }
      } catch (e) {
        console.log('[ShowPlanner] Could not load debrief count:', e);
      }

      // Try to load cached week content
      const cached = await getEventPlannerStep({ showPrepPlanId: planId, step: 1, cacheOnly: true });
      if (cached.success && cached.allSections && cached.preparationPlan) {
        const rawWeeks = cached.preparationPlan.weeks || [];
        const normalized = renumberWeeks(rawWeeks.map(normalizeWeek));
        setWeeks(normalized);
        if (normalized.length > 0) setActiveWeek(normalized[0].week_number);
      } else {
        // No cache — show empty state with generate button, not an error
        setWeeks([]);
        setNeedsGeneration(true);
      }
    } catch (err) {
      console.error('ShowPlanner load error:', err);
      setError('Failed to load show planner data.');
    } finally {
      setLoading(false);
    }
  }

  async function generatePlan() {
    setGenerating(true);
    setGenError(null);
    setGenStep(0);
    let accumulated = {};

    try {
      for (let step = 1; step <= 4; step++) {
        setGenStep(step);
        const payload = { showPrepPlanId: planId, step };
        if (step === 1) payload.forceRefresh = false;
        if (step >= 2) {
          payload.priorResults = {};
          if (accumulated.testRequirements) payload.priorResults.testRequirements = accumulated.testRequirements;
          if (accumulated.readinessAnalysis) payload.priorResults.readinessAnalysis = accumulated.readinessAnalysis;
          if (accumulated.preparationPlan) payload.priorResults.preparationPlan = accumulated.preparationPlan;
        }

        const result = await getEventPlannerStep(payload);

        // Cache hit — full plan returned
        if (result.allSections && result.fromCache) {
          if (result.preparationPlan) {
            const rawWeeks = result.preparationPlan.weeks || [];
            const normalized = renumberWeeks(rawWeeks.map(normalizeWeek));
            setWeeks(normalized);
            if (normalized.length > 0) setActiveWeek(normalized[0].week_number);
          }
          setNeedsGeneration(false);
          setGenerating(false);
          setGenStep(0);
          return;
        }

        if (!result.success) {
          if (result.error === 'insufficient_data') {
            setGenError(result.message || 'Not enough data yet. Complete your rider profile, add a horse, and submit at least 3 debriefs.');
            setGenerating(false);
            setGenStep(0);
            return;
          }
          throw new Error(result.message || `Step ${step} failed.`);
        }

        if (step === 1) accumulated.testRequirements = result.testRequirements;
        if (step === 2) accumulated.readinessAnalysis = result.readinessAnalysis;
        if (step === 3) accumulated.preparationPlan = result.preparationPlan;
      }

      // After step 4 completes, reload from cache
      const cached = await getEventPlannerStep({ showPrepPlanId: planId, step: 1, cacheOnly: true });
      if (cached.success && cached.allSections && cached.preparationPlan) {
        const rawWeeks = cached.preparationPlan.weeks || [];
        const normalized = renumberWeeks(rawWeeks.map(normalizeWeek));
        setWeeks(normalized);
        if (normalized.length > 0) setActiveWeek(normalized[0].week_number);
      } else if (accumulated.preparationPlan) {
        // Fallback: use the data we already have from step 3
        const rawWeeks = accumulated.preparationPlan.weeks || [];
        const normalized = renumberWeeks(rawWeeks.map(normalizeWeek));
        setWeeks(normalized);
        if (normalized.length > 0) setActiveWeek(normalized[0].week_number);
      }
      setNeedsGeneration(false);
    } catch (err) {
      console.error('ShowPlanner generation error:', err);
      const isTimeout = err.message && (err.message.includes('deadline') || err.message.includes('DEADLINE') || err.message.includes('timed out'));
      setGenError(isTimeout
        ? 'The AI is taking longer than expected. Please try again — it often works on the second attempt.'
        : (err.message || 'An error occurred during plan generation.'));
    } finally {
      setGenerating(false);
      setGenStep(0);
    }
  }

  // Handlers
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

  const onDragStart = useCallback((key) => { dragSrc.current = key; }, []);
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

  const handleFlagChange = useCallback((testId, itemId, isFlagged) => {
    setFlagState(prev => ({
      ...prev,
      [testId]: { ...prev[testId], [itemId]: isFlagged }
    }));
  }, []);

  // Derived values
  const currentWeek = weeks.find(w => w.week_number === activeWeek) || null;
  const totalWeeks = weeks.length;
  const progress = totalWeeks > 0 && activeWeek ? Math.round(((totalWeeks - activeWeek + 1) / totalWeeks) * 100) : 0;

  const horseName = plan?.horseName || plan?.horse?.name || '';
  const showDateStart = plan?.showDateStart || plan?.showDetails?.dateStart || '';
  const showName = plan?.showName || plan?.showDetails?.name || '';
  const testIds = plan?.testsSelected || plan?.tests?.selected || [];
  const primaryTestId = testIds[0] || '';

  const daysOut = showDateStart ? Math.ceil((new Date(showDateStart + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const weeksOut = daysOut !== null ? Math.ceil(daysOut / 7) : null;

  const showDateFormatted = showDateStart
    ? new Date(showDateStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const pinnedItems = Object.entries(pins).filter(([, v]) => v).map(([id]) => cardTitles[id]).filter(Boolean);

  // Loading / error states
  if (loading) return <div className="slp-page"><div className="slp-loading"><div className="spinner" /><p>Loading your show planner...</p></div></div>;

  if (error) return (
    <div className="slp-page">
      <div className="slp-empty">
        <h3>Show Planner</h3>
        <p>{error}</p>
        <Link to="/show-prep" className="btn btn-secondary">Back to Show Preparations</Link>
      </div>
    </div>
  );

  return (
    <div className="slp-page">

      {/* ── Hero ── */}
      <div className="slp-hero">
        <div className="slp-hero-eyebrow">Competition Countdown</div>
        <div className="slp-hero-title">{testData?.label || showName}</div>
        <div className="slp-hero-horse">
          with <strong>{horseName}</strong> &middot; Target: <strong>{showDateFormatted}</strong>
        </div>
        <div className="slp-countdown-row">
          {daysOut !== null && daysOut >= 0 && (
            <>
              <div className="slp-countdown-block">
                <div className="slp-countdown-num">{daysOut}</div>
                <div className="slp-countdown-label">Days</div>
              </div>
              <div className="slp-countdown-divider" />
              <div className="slp-countdown-block">
                <div className="slp-countdown-num">{weeksOut}</div>
                <div className="slp-countdown-label">Weeks</div>
              </div>
              <div className="slp-countdown-divider" />
            </>
          )}
          <div className="slp-weeks-row">
            {weeks.map(w => (
              <button
                key={w.week_number}
                className={`slp-week-chip${w.week_number === activeWeek ? ' active' : ''}`}
                onClick={() => setActiveWeek(w.week_number)}
              >
                {w.week_number === 1 ? 'Show Wk' : `Wk ${w.week_number}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Packing List Link ── */}
      <div className="slp-toggle" onClick={() => window.open('/packing-list.html', '_blank')}>
        <span className="slp-toggle-icon">{'\u{1F9F3}'}</span>
        <div className="slp-toggle-label">
          Horse Show Packing List
          <div className="slp-toggle-sub">Tack, attire, documents &amp; barn supplies</div>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--ink-light)' }}>{'\u2197'}</span>
      </div>

      {/* ── Test Reference Panel ── */}
      {testData && (
        <>
          <div className="slp-toggle" onClick={() => setTestPanelOpen(!testPanelOpen)}>
            <span className="slp-toggle-icon">{'\u{1F4CB}'}</span>
            <div className="slp-toggle-label">
              Test Reference: {testData.label}
              <div className="slp-toggle-sub">Directives, movements, coefficients &amp; score strategy</div>
            </div>
            <span className="slp-toggle-badge">{testData.org} &middot; {testData.duration}</span>
            <span className={`slp-toggle-caret${testPanelOpen ? ' open' : ''}`}>{'\u25BC'}</span>
          </div>
          {testPanelOpen && (
            <div className="slp-test-panel">
              <TestReferencePanel
                testId={primaryTestId}
                onFlagChange={handleFlagChange}
                flagState={flagState}
                defaultTab="overview"
                compact={false}
                flagTabLabel="My Concerns"
              />
            </div>
          )}
        </>
      )}

      {/* ── Readiness Snapshot ── */}
      <div className="slp-toggle" onClick={() => setSnapshotOpen(!snapshotOpen)}>
        <span className="slp-toggle-icon">{'\u{1F3AF}'}</span>
        <div className="slp-toggle-label">
          Readiness Snapshot
          <div className="slp-toggle-sub">Technical Coach assessment of your show readiness</div>
        </div>
        <span className={`slp-toggle-caret${snapshotOpen ? ' open' : ''}`}>{'\u25BC'}</span>
      </div>
      {snapshotOpen && (
        <ReadinessSnapshotCard
          planId={planId}
          userId={currentUser?.uid}
          currentDebriefsCount={debriefsCount}
        />
      )}

      {/* ── Generate Prompt ── */}
      {needsGeneration && !generating && (
        <div className="slp-generate-prompt">
          <p>Your preparation plan hasn't been generated yet.</p>
          {genError && <p className="slp-gen-error">{genError}</p>}
          <button className="btn btn-primary" onClick={generatePlan}>
            {genError ? 'Try Again' : 'Generate Plan →'}
          </button>
        </div>
      )}
      {generating && (
        <div className="slp-generate-prompt">
          <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 12px' }} />
          <p>{genStep === 1 ? 'Analyzing test requirements...' : genStep === 2 ? 'Evaluating readiness...' : genStep === 3 ? 'Building preparation plan...' : 'Creating show-day guidance...'}</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-light)' }}>Step {genStep} of 4 — this takes a few minutes</p>
        </div>
      )}

      {/* ── Pinned Bar ── */}
      {pinnedItems.length > 0 && (
        <div className="slp-pinned-bar">
          <div className="slp-pinned-label">{'\u{1F4CC}'} Pinned This Week</div>
          <div className="slp-pinned-list">
            {pinnedItems.map((title, i) => <span key={i} className="slp-pinned-tag">{'\u{1F4CC}'} {title}</span>)}
          </div>
        </div>
      )}

      {/* ── Week Header ── */}
      {currentWeek && (
        <>
          <div className="slp-week-header">
            <div>
              <div className="slp-week-heading">
                {activeWeek === 1 ? 'Show Week!' : `Week ${activeWeek}`}
                {activeWeek && ` \u00b7 ${(activeWeek - 1) * 7}\u2013${activeWeek * 7} Days Out`}
              </div>
              <div className="slp-week-subheading">{WEEK_SUBS[activeWeek] || currentWeek.primary_focus || ''}</div>
            </div>
            <div className="slp-progress-wrap">
              <div className="slp-progress-label">Prep Progress</div>
              <div className="slp-progress-bar">
                <div className="slp-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className="slp-reorder-hint">{'\u2807'} Drag sections into your preferred order</div>

          {/* ── Sections ── */}
          <div className="slp-sections">
            {sectionOrder.map(key => {
              const items = currentWeek[key] || [];
              if (items.length === 0) return null;
              return (
                <SectionBlock
                  key={key}
                  cfg={SECTION_CFG[key]}
                  items={items}
                  weekNum={activeWeek}
                  isCollapsed={!!collapsed[key]}
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
        </>
      )}

      {/* ── Back link ── */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <Link to="/show-prep" style={{ fontSize: '0.85rem', color: 'var(--ink-light)' }}>
          &larr; Back to Show Preparations
        </Link>
      </div>
    </div>
  );
}


/* ── Section Block ─────────────────────────────────────────── */

function SectionBlock({ cfg, items, weekNum, isCollapsed, onToggleCollapse, pins, checks, logs, onTogglePin, onToggleCheck, onLogPractice, onDragStart, onDrop }) {
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`slp-section${dragOver ? ' drag-over' : ''}${dragging ? ' dragging' : ''}`}
      draggable
      onDragStart={(e) => { setDragging(true); e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
      onDragEnd={() => { setDragging(false); setDragOver(false); }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onDrop(); }}
    >
      <div className="slp-section-header">
        <span className="slp-drag-grip">{'\u2807'}</span>
        <div className="slp-section-dot" style={{ background: cfg.dot }} />
        <div className="slp-section-label" style={{ color: cfg.labelColor }}>{cfg.label}</div>
        <div className="slp-section-count">{items.length} items</div>
        <button className="slp-collapse-btn" onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}>
          {isCollapsed ? '\u25B6' : '\u25BC'}
        </button>
      </div>
      {!isCollapsed && (
        <div className="slp-section-items">
          {items.map((item, i) => {
            const id = `${cfg.prefix}_w${weekNum}_${i}`;
            return (
              <ItemCard
                key={id} id={id} item={item} cfg={cfg}
                pinned={!!pins[id]} checked={!!checks[id]} logDates={logs[id] || []}
                onTogglePin={onTogglePin} onToggleCheck={onToggleCheck} onLogPractice={onLogPractice}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}


/* ── Item Card ─────────────────────────────────────────────── */

function ItemCard({ id, item, cfg, pinned, checked, logDates, onTogglePin, onToggleCheck, onLogPractice }) {
  const [bodyOpen, setBodyOpen] = useState(!checked);
  const today = todayStr();
  const loggedToday = logDates.includes(today);

  return (
    <div className={`slp-card${pinned ? ' pinned' : ''}${checked ? ' checked' : ''}`}>
      <div className="slp-done-stripe" />
      <div className="slp-card-header" onClick={() => setBodyOpen(!bodyOpen)}>
        <div className="slp-card-icon" style={{ background: cfg.iconBg }}>{cfg.icon}</div>
        <div className="slp-card-title-block">
          <div className="slp-card-label" style={{ color: cfg.labelColor }}>{cfg.label}</div>
          <div className="slp-card-title">{item.title}</div>
        </div>
        <div className="slp-card-actions" onClick={(e) => e.stopPropagation()}>
          <button className={`slp-pin-btn${pinned ? ' active' : ''}`} title="Pin" onClick={() => onTogglePin(id, item.title)}>{'\u{1F4CC}'}</button>
          <button className={`slp-check-btn${checked ? ' active' : ''}`} title="Mark done" onClick={() => onToggleCheck(id)}>{'\u2713'}</button>
        </div>
      </div>
      {bodyOpen && !checked && (
        <div className="slp-card-body">
          <p className="slp-card-text">{item.body}</p>
          <div className="slp-card-cue" style={{ background: cfg.cueBg, borderLeft: `3px solid ${cfg.cueBorder}` }}>
            <span className="slp-cue-icon">{'\u2192'}</span>
            <span>{item.cue}</span>
          </div>
          <div className="slp-log-row">
            <button
              className={`slp-log-btn${loggedToday ? ' logged' : ''}`}
              style={!loggedToday ? { background: cfg.logBg, color: cfg.logColor, borderColor: cfg.logBorder } : undefined}
              onClick={() => !loggedToday && onLogPractice(id)}
              disabled={loggedToday}
            >
              {loggedToday
                ? <>{'\u2713'} Practiced <span className="slp-log-date">&middot; {today}</span></>
                : '+ Log practice today'
              }
            </button>
            {logDates.length > 0 && <span className="slp-log-count">{logDates.length}&times; this plan</span>}
          </div>
        </div>
      )}
    </div>
  );
}
