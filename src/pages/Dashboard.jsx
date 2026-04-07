import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase-config';
import useDashboardData from '../hooks/useDashboardData';
import useWeeklyFocus from '../hooks/useWeeklyFocus';
import WeeklyFocusContent from '../components/WeeklyFocus/WeeklyFocusContent';
import { PracticeCardCompact } from '../components/PracticeCard/PracticeCard';
import MovementCoverageHeatmap from '../components/Dashboard/MovementCoverageHeatmap';
import ProcessGoalBars from '../components/Dashboard/ProcessGoalBars';
import JourneySnapshot from '../components/Dashboard/JourneySnapshot';
import {
  getAllDebriefs,
  getAllReflections,
  getAllObservations,
  getAllJourneyEvents,
  getAllShowPreparations,
  getAllHealthEntries,
  getAllLessonNotes,
  getAllToolkitEntries
} from '../services';
import { getAdminStats, getAdminUsageStats } from '../services/aiService';
import { exportToCSV, exportToJSON, EXPORT_COLUMNS } from '../utils/exportUtils';
import './Dashboard.css';

const ADMIN_UID = 'HwwKk5C7qZh1Bn0KYalPYIZWHmj2';
const DEFAULT_ORDER = ['stats', 'focus', 'data'];

/* ── Learn group cards ── */
const DM_LEARN = [
  { icon: '\uD83D\uDCD0', label: 'Arena Geometry Trainer', desc: 'Letters, lines, geometry', href: '/arena-geometry-trainer.html' },
  { icon: '\uD83D\uDDD2', label: 'Test Explorer', desc: 'Browse test movements & scores', to: '/learn/test-explorer' },
  { icon: '\uD83D\uDD2C', label: 'Science & Research', desc: 'Learning theory behind YDJ', to: '/learn/science' },
];

/* ── Record / Plan / Assess / Review card data ── */
const DM_RECORD = [
  { icon: '\uD83C\uDFC7', label: 'Post-Ride Debrief', desc: 'Log your ride & intentions', to: '/debriefs/new', color: 'var(--c-debrief)' },
  { icon: '\u25C7', label: 'Reflection', desc: 'Milestones, aha moments, growth', to: '/reflections/new', color: 'var(--c-reflect)' },
  { icon: '\u25CE', label: 'Observation', desc: 'What you learned watching others', to: '/observations/new', color: 'var(--c-observe)' },
  { icon: '\uD83D\uDCDD', label: 'Lesson Notes', desc: 'Instructor guidance & cues', to: '/lesson-notes/new', color: 'var(--c-lesson)' },
  { icon: '\uD83C\uDF3F', label: 'Health & Soundness', desc: 'Vet visits, bodywork, concerns', to: '/horse-health/new', color: 'var(--c-health)' },
  { icon: '\uD83D\uDCC5', label: 'Journey Event', desc: 'Life changes affecting riding', to: '/events/new', color: 'var(--c-event)' },
];
const DM_PLAN = [
  { icon: '\uD83C\uDFDF', label: 'Show Preparation', desc: 'Personalized show roadmap', to: '/show-prep/new', color: 'var(--c-show)' },
];
const DM_ASSESS = [
  { icon: '\uD83C\uDFAF', label: 'Rider Self-Assessment', desc: 'Broad skills & confidence', to: '/rider-assessments/new' },
  { icon: '\u2696\uFE0F', label: 'Technical & Philosophical', desc: 'Movement-by-movement ratings', to: '/technical-assessments/new' },
  { icon: '\uD83C\uDF3F', label: 'Physical Self-Assessment', desc: 'Body awareness & balance', to: '/physical-assessments/new' },
  { icon: '\uD83E\uDDF0', label: "Rider\u2019s Toolkit", desc: 'Off-horse discoveries & practices', to: '/toolkit/new' },
];
const DM_REVIEW = [
  { icon: '\uD83D\uDCCA', label: 'Insights', desc: 'Quality patterns, training themes, goal progress, and your journey over time.', to: '/data-insights' },
  { icon: '\uD83D\uDCCB', label: 'All Debriefs', desc: 'Browse your ride history', to: '/debriefs' },
  { icon: '\u25C7', label: 'All Reflections', desc: 'Your reflection library', to: '/reflections' },
  { icon: '\u25CE', label: 'Observations', desc: 'Your observation notes', to: '/observations' },
  { icon: '\uD83D\uDCDD', label: 'Lesson Notes', desc: 'Your lesson library', to: '/lesson-notes' },
  { icon: '\uD83C\uDF3F', label: 'Health Log', desc: 'Full soundness records', to: '/horse-health' },
  { icon: '\uD83D\uDCC5', label: 'Journey Events', desc: 'Your timeline', to: '/events' },
  { icon: '\uD83C\uDFDF', label: 'Show Preparations', desc: 'Past show prep plans', to: '/show-prep' },
  { icon: '\uD83E\uDDF0', label: 'Toolkit', desc: 'Your off-horse catalog', to: '/toolkit' },
];

/* ── DmCard ── */
function DmCard({ icon, label, desc, to, color, variant = 'default', arrow = '\uFF0B' }) {
  const cls = `dm-card${variant !== 'default' ? ` ${variant}` : ''}`;
  return (
    <Link to={to} className={cls} style={color ? { borderLeftColor: color } : undefined}>
      <div className="dm-icon">{icon}</div>
      <div className="dm-text">
        <div className="dm-label">{label}</div>
        <div className="dm-desc">{desc}</div>
      </div>
      <div className="dm-arrow">{arrow}</div>
    </Link>
  );
}

/* ── DmGroup ── */
function DmGroup({ label, children }) {
  return (
    <div className="dm-group">
      <div className="dm-group-label">{label}</div>
      <div className="dm-cards">{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════ */
export default function Dashboard() {
  const { currentUser } = useAuth();
  const { loading, stats, recentDebriefs, upcomingEvents } = useDashboardData();
  const wf = useWeeklyFocus();

  // Arrange mode
  const [arrangeMode, setArrangeMode] = useState(false);
  const [blockOrder, setBlockOrder] = useState(DEFAULT_ORDER);
  const [blockOrderLoaded, setBlockOrderLoaded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const draggedRef = useRef(null);
  const dragOverRef = useRef(null);

  // Load block order from Firestore
  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
      if (snap.exists() && snap.data().dashboardBlockOrder) {
        setBlockOrder(snap.data().dashboardBlockOrder);
      }
      setBlockOrderLoaded(true);
    }).catch(() => setBlockOrderLoaded(true));
  }, [currentUser]);

  // Export
  const [exporting, setExporting] = useState(false);

  // Admin
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const isAdmin = currentUser?.uid === ADMIN_UID;

  // Admin usage stats
  const [usageData, setUsageData] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState(null);
  const [usageDays, setUsageDays] = useState(30);
  const [usageView, setUsageView] = useState('byOutput'); // byOutput | byUser | byModel | dailyTrend | topCalls

  function toggleArrange() {
    if (arrangeMode && currentUser) {
      // Save to Firestore on exit
      updateDoc(doc(db, 'users', currentUser.uid), { dashboardBlockOrder: blockOrder })
        .catch(err => console.warn('Failed to save block order:', err));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2200);
    }
    setArrangeMode(!arrangeMode);
  }

  // Drag handlers
  function handleDragStart(blockId) {
    draggedRef.current = blockId;
  }
  function handleDragOver(e, blockId) {
    e.preventDefault();
    dragOverRef.current = blockId;
  }
  function handleDrop(e, targetId) {
    e.preventDefault();
    const draggedId = draggedRef.current;
    if (!draggedId || draggedId === targetId) return;

    setBlockOrder(prev => {
      const next = [...prev];
      const fromIdx = next.indexOf(draggedId);
      const toIdx = next.indexOf(targetId);
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, draggedId);
      return next;
    });
    draggedRef.current = null;
    dragOverRef.current = null;
  }

  // Export all
  async function handleExportAll(format) {
    if (!currentUser || exporting) return;
    setExporting(true);
    try {
      const [debRes, refRes, obsRes, evtRes, prepRes, healthRes, lessonRes, tkRes] = await Promise.all([
        getAllDebriefs(currentUser.uid),
        getAllReflections(currentUser.uid),
        getAllObservations(currentUser.uid),
        getAllJourneyEvents(currentUser.uid),
        getAllShowPreparations(currentUser.uid),
        getAllHealthEntries(currentUser.uid),
        getAllLessonNotes(currentUser.uid),
        getAllToolkitEntries(currentUser.uid)
      ]);
      const exportFn = format === 'csv' ? exportToCSV : exportToJSON;
      const today = new Date().toISOString().split('T')[0];
      if (debRes.success && debRes.data.length) exportFn(debRes.data, `ydj-debriefs-${today}`, EXPORT_COLUMNS.debriefs);
      if (refRes.success && refRes.data.length) exportFn(refRes.data, `ydj-reflections-${today}`, EXPORT_COLUMNS.reflections);
      if (obsRes.success && obsRes.data.length) exportFn(obsRes.data, `ydj-observations-${today}`, EXPORT_COLUMNS.observations);
      if (evtRes.success && evtRes.data.length) exportFn(evtRes.data, `ydj-journey-events-${today}`, EXPORT_COLUMNS.journeyEvents);
      if (prepRes.success && prepRes.data.length) exportFn(prepRes.data, `ydj-show-preps-${today}`, EXPORT_COLUMNS.showPreparations);
      if (healthRes.success && healthRes.data.length) exportFn(healthRes.data, `ydj-horse-health-${today}`, EXPORT_COLUMNS.horseHealthEntries);
      if (lessonRes.success && lessonRes.data.length) exportFn(lessonRes.data, `ydj-lesson-notes-${today}`, EXPORT_COLUMNS.lessonNotes);
      if (tkRes.success && tkRes.data.length) {
        const tkExport = tkRes.data.map(e => ({ ...e, bodyTags: Array.isArray(e.bodyTags) ? e.bodyTags.join('|') : e.bodyTags }));
        exportFn(tkExport, `toolkit-${today}`, EXPORT_COLUMNS.riderToolkitEntries);

        // Export visualization sessions from subcollections
        const vizEntries = tkRes.data.filter(e => e.entryType === 'visualization-script' && e.sessionCount > 0);
        if (vizEntries.length > 0) {
          const allSessions = [];
          for (const entry of vizEntries) {
            try {
              const sessionsSnap = await getDocs(collection(db, 'riderToolkitEntries', entry.id, 'sessions'));
              sessionsSnap.forEach(sDoc => {
                const s = sDoc.data();
                allSessions.push({
                  scriptId: entry.id,
                  movementLabel: entry.movementLabel || entry.name,
                  sessionDate: s.sessionDate || '',
                  reflectionResponse: s.reflectionResponse || '',
                  completedBlocks: Array.isArray(s.completedBlocks) ? s.completedBlocks.join('|') : '',
                  sessionLength: s.sessionLength || '',
                });
              });
            } catch (e) {
              console.warn('Failed to fetch sessions for', entry.id, e);
            }
          }
          if (allSessions.length > 0) {
            exportFn(allSessions, `visualization-sessions-${today}`, EXPORT_COLUMNS.visualizationSessions);
          }
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExporting(false);
  }

  // Admin stats
  async function handleAdminStats() {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const data = await getAdminStats();
      setAdminData(data);
    } catch (err) {
      setAdminError(err.message || 'Failed to load admin stats');
    }
    setAdminLoading(false);
  }

  // Admin usage stats
  async function handleUsageStats(days = usageDays) {
    setUsageLoading(true);
    setUsageError(null);
    try {
      const data = await getAdminUsageStats({ days });
      setUsageData(data);
    } catch (err) {
      setUsageError(err.message || 'Failed to load usage stats');
    }
    setUsageLoading(false);
  }

  // Format date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Week range for Weekly Focus header
  const monday = new Date(today);
  const dayOfWeek = monday.getDay();
  monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const weekRange = sameMonth
    ? `${monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}\u2013${sunday.getDate()}, ${sunday.getFullYear()}`
    : `${monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} \u2013 ${sunday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  if (loading) {
    return <div className="dashboard-loading">Loading your journey...</div>;
  }

  // Stat card variants
  const ridesOk = stats && stats.debriefCount >= 5;
  const reflOk = stats && stats.reflectionCount >= 3;
  const catOk = stats && stats.categoryCoverage.covered >= 6;
  const anyThresholdUnmet = !ridesOk || !reflOk || !catOk;

  /* ── Block renderers ── */
  function renderStatsBlock() {
    return (
      <div
        className="block"
        data-block="stats"
        draggable={arrangeMode}
        onDragStart={() => handleDragStart('stats')}
        onDragOver={e => handleDragOver(e, 'stats')}
        onDrop={e => handleDrop(e, 'stats')}
      >
        <div className="block-header">
          <div className="block-header-left">
            <div className="block-title">Current Stats</div>
            <div className="block-subtitle">Your journey so far</div>
          </div>
          {arrangeMode && (
            <div className="drag-handle" title="Drag to reorder">
              <span className="grip">&#10303;&#10303;</span> Drag
            </div>
          )}
        </div>

        <div className="block-body">
          {stats && (
            <div className="stat-cards">
              <div className={`stat-card${ridesOk ? ' ok' : ' warn'}`}>
                <div className="stat-value">{stats.debriefCount}</div>
                <div className="stat-label">Rides Logged</div>
                {!ridesOk && <div className="stat-hint">Log {5 - stats.debriefCount} more for AI coaching</div>}
              </div>
              <div className={`stat-card${reflOk ? ' ok' : ' warn'}`}>
                <div className="stat-value">{stats.reflectionCount}</div>
                <div className="stat-label">Reflections</div>
                {!reflOk && <div className="stat-hint">Try {3 - stats.reflectionCount} more reflection{3 - stats.reflectionCount !== 1 ? 's' : ''}</div>}
              </div>
              <div className={`stat-card${catOk ? ' ok' : ' warn'}`}>
                <div className="stat-value">{stats.categoryCoverage.covered}<small>/{stats.categoryCoverage.total}</small></div>
                <div className="stat-label">Reflection Categories</div>
                {!catOk && <div className="stat-hint">{stats.categoryCoverage.total - stats.categoryCoverage.covered} categories not yet tried</div>}
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.streak}<small>wk</small></div>
                <div className="stat-label">Riding Streak</div>
              </div>
            </div>
          )}

          {stats && anyThresholdUnmet && (
            <div className="progress-nudge">
              <div className="nudge-icon">&#128161;</div>
              <div className="nudge-body">
                <div className="nudge-title">Your AI coaching gets richer as you log more</div>
                <div className="nudge-text">
                  {ridesOk && reflOk && !catOk && (
                    <>Rides and reflections are looking good. To unlock the full depth of pattern analysis, try logging in <strong>all 6 reflection categories</strong> at least once. Still missing: <strong>{stats.categoryCoverage.missingLabels.join(', ')}</strong>.</>
                  )}
                  {!ridesOk && (
                    <>Log at least <strong>5 rides</strong> to activate AI pattern analysis. You have {stats.debriefCount} so far.</>
                  )}
                  {ridesOk && !reflOk && (
                    <>Great riding streak! Try adding <strong>{3 - stats.reflectionCount} more reflection{3 - stats.reflectionCount !== 1 ? 's' : ''}</strong> to give the AI more to work with.</>
                  )}
                </div>
                <div className="nudge-actions">
                  {!catOk && <Link to="/reflections/new" className="nudge-btn">&#xFF0B; Add a Reflection</Link>}
                  <Link to="/quickstart" className="nudge-btn">&#9672; View Quick Start Map</Link>
                </div>
              </div>
            </div>
          )}

          <JourneySnapshot />
        </div>

        {/* Viz panel — movement coverage + process goals */}
        <div className="viz-panel">
          <MovementCoverageHeatmap />
          <ProcessGoalBars />
        </div>
      </div>
    );
  }

  function renderFocusBlock() {
    return (
      <div
        className="block"
        data-block="focus"
        draggable={arrangeMode}
        onDragStart={() => handleDragStart('focus')}
        onDragOver={e => handleDragOver(e, 'focus')}
        onDrop={e => handleDrop(e, 'focus')}
      >
        <div className="block-header">
          <div className="block-header-left">
            <div className="block-title">Weekly Focus</div>
            <div className="block-subtitle">{weekRange}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="block-meta">
              {wf.progress.done} of {wf.progress.total} items touched
            </div>
            {arrangeMode && (
              <div className="drag-handle" title="Drag to reorder">
                <span className="grip">&#10303;&#10303;</span> Drag
              </div>
            )}
          </div>
        </div>
        <div className="block-body">
          <WeeklyFocusContent
            celebration={wf.celebration}
            coaching={wf.coaching}
            gptAssignments={wf.gptAssignments}
            physicalItems={wf.physicalItems}
            visualization={wf.visualization}
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
          <PracticeCardCompact />
        </div>
      </div>
    );
  }

  function renderDataBlock() {
    return (
      <div
        className="block"
        data-block="data"
        draggable={arrangeMode}
        onDragStart={() => handleDragStart('data')}
        onDragOver={e => handleDragOver(e, 'data')}
        onDrop={e => handleDrop(e, 'data')}
      >
        <div className="block-header">
          <div className="block-header-left">
            <div className="block-title">Your Data</div>
            <div className="block-subtitle">Record &middot; Plan &middot; Learn &middot; Assess &middot; Review &middot; Export</div>
          </div>
          {arrangeMode && (
            <div className="drag-handle" title="Drag to reorder">
              <span className="grip">&#10303;&#10303;</span> Drag
            </div>
          )}
        </div>
        <div className="block-body">
          <div className="dm-sections">
            <DmGroup label="Record">
              {DM_RECORD.map(c => <DmCard key={c.to} {...c} />)}
            </DmGroup>

            <DmGroup label="Plan">
              {DM_PLAN.map(c => <DmCard key={c.to} {...c} />)}
            </DmGroup>

            <DmGroup label="Learn">
              {DM_LEARN.map(c => (
                c.href ? (
                  <a key={c.href} href={c.href} className="dm-card learn-card">
                    <div className="dm-icon">{c.icon}</div>
                    <div className="dm-text">
                      <div className="dm-label">{c.label}</div>
                      <div className="dm-desc">{c.desc}</div>
                    </div>
                    <div className="dm-arrow">&rarr;</div>
                  </a>
                ) : (
                  <DmCard key={c.to} {...c} variant="learn-card" color="var(--c-learn)" arrow="&rarr;" />
                )
              ))}
            </DmGroup>

            <DmGroup label="Assess">
              {DM_ASSESS.map(c => (
                <DmCard key={c.to} {...c} variant="assess" color="var(--c-assess)" arrow="&rarr;" />
              ))}
            </DmGroup>

            <DmGroup label="Review">
              {DM_REVIEW.map(c => (
                <DmCard key={c.to} {...c} variant="review" arrow="&rarr;" />
              ))}
            </DmGroup>

            <DmGroup label="Export">
              <div className="export-strip">
                <div className="export-label">
                  <strong>Download My Data</strong>
                  <span>All collections in one go &mdash; each as a separate file.</span>
                </div>
                <div className="export-btns">
                  <button className="btn-export" onClick={() => handleExportAll('csv')} disabled={exporting}>
                    &#11015; Export as CSV
                  </button>
                  <button className="btn-export" onClick={() => handleExportAll('json')} disabled={exporting}>
                    &#11015; Export as JSON
                  </button>
                </div>
              </div>
            </DmGroup>
          </div>
        </div>
      </div>
    );
  }

  const blockRenderers = {
    stats: renderStatsBlock,
    focus: renderFocusBlock,
    data: renderDataBlock,
  };

  return (
    <div className={`page${arrangeMode ? ' arrange-mode' : ''}`}>
      {/* Welcome strip */}
      <div className="welcome-strip">
        <div>
          <h1>Welcome back, {currentUser?.displayName || 'Rider'}.</h1>
          <div className="welcome-sub">{dateStr}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <div className="welcome-tagline">Illuminate Your Journey</div>
          <button className={`arrange-btn${arrangeMode ? ' active' : ''}`} onClick={toggleArrange}>
            <span className="arrange-icon">{arrangeMode ? '\u2713' : '\u2807'}</span>
            {arrangeMode ? ' Done' : ' Arrange'}
          </button>
        </div>
      </div>

      {/* Toast */}
      <div className={`order-toast${showToast ? ' show' : ''}`}>Layout saved &#10003;</div>

      {/* Blocks */}
      <div className="block-container">
        {blockOrder.map(id => blockRenderers[id] ? <React.Fragment key={id}>{blockRenderers[id]()}</React.Fragment> : null)}
      </div>

      {/* Admin Stats */}
      {isAdmin && (
        <div className="block" style={{ marginTop: '1.5rem' }}>
          <div className="block-header">
            <div className="block-header-left">
              <div className="block-title">Pilot Activity</div>
              <div className="block-subtitle">Cross-user summary</div>
            </div>
          </div>
          <div className="block-body">
            <button className="btn-export" onClick={handleAdminStats} disabled={adminLoading}>
              {adminLoading ? 'Loading...' : 'View User Activity'}
            </button>
            {adminError && <p style={{ color: 'var(--rust)', marginTop: '0.5rem' }}>{adminError}</p>}
            {adminData && (
              <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                <p style={{ marginBottom: '0.5rem', color: 'var(--gold)' }}>
                  {adminData.userCount} users as of {new Date(adminData.generatedAt).toLocaleDateString()}
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--parchment-dark)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Name</th>
                      <th style={{ padding: '0.5rem' }}>Email</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Rides</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Reflect.</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Obs.</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
                      <th style={{ padding: '0.5rem' }}>Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminData.users.map(u => (
                      <tr key={u.uid} style={{ borderBottom: '1px solid var(--parchment-dark)' }}>
                        <td style={{ padding: '0.5rem' }}>{u.displayName || '\u2014'}</td>
                        <td style={{ padding: '0.5rem' }}>{u.email || '\u2014'}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{u.debriefs || 0}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{u.reflections || 0}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{u.observations || 0}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{u.total}</td>
                        <td style={{ padding: '0.5rem' }}>{u.lastActivity ? new Date(u.lastActivity).toLocaleDateString() : '\u2014'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin API Usage Stats */}
      {isAdmin && (
        <div className="block" style={{ marginTop: '1.5rem' }}>
          <div className="block-header">
            <div className="block-header-left">
              <div className="block-title">API Token Usage</div>
              <div className="block-subtitle">Cost tracking by output, user, and model</div>
            </div>
          </div>
          <div className="block-body">
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={usageDays}
                onChange={e => setUsageDays(Number(e.target.value))}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--parchment-dark)', fontSize: '0.85rem', background: 'var(--cream)' }}
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button className="btn-export" onClick={() => handleUsageStats(usageDays)} disabled={usageLoading}>
                {usageLoading ? 'Loading...' : 'Load Usage Stats'}
              </button>
            </div>
            {usageError && <p style={{ color: 'var(--rust)', marginTop: '0.5rem' }}>{usageError}</p>}
            {usageData && (
              <div style={{ marginTop: '1rem' }}>
                {/* Summary cards */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div style={{ background: 'var(--cream)', border: '1px solid var(--parchment-dark)', borderRadius: '8px', padding: '0.75rem 1rem', flex: '1 1 120px', minWidth: '120px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>API Calls</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brown)' }}>{usageData.totals.callCount.toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'var(--cream)', border: '1px solid var(--parchment-dark)', borderRadius: '8px', padding: '0.75rem 1rem', flex: '1 1 120px', minWidth: '120px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Tokens</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brown)' }}>{(usageData.totals.totalTokens / 1_000_000).toFixed(2)}M</div>
                  </div>
                  <div style={{ background: 'var(--cream)', border: '1px solid var(--parchment-dark)', borderRadius: '8px', padding: '0.75rem 1rem', flex: '1 1 120px', minWidth: '120px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. Cost</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brown)' }}>${(usageData.totals.estimatedCostCents / 100).toFixed(2)}</div>
                  </div>
                  <div style={{ background: 'var(--cream)', border: '1px solid var(--parchment-dark)', borderRadius: '8px', padding: '0.75rem 1rem', flex: '1 1 120px', minWidth: '120px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input / Output</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brown)' }}>
                      {(usageData.totals.inputTokens / 1_000_000).toFixed(2)}M / {(usageData.totals.outputTokens / 1_000_000).toFixed(2)}M
                    </div>
                  </div>
                </div>

                {/* View tabs */}
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {[
                    ['byOutput', 'By Output'],
                    ['byUser', 'By User'],
                    ['byModel', 'By Model'],
                    ['dailyTrend', 'Daily Trend'],
                    ['topCalls', 'Top Calls'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setUsageView(key)}
                      style={{
                        padding: '0.3rem 0.7rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer',
                        border: usageView === key ? '1px solid var(--gold)' : '1px solid var(--parchment-dark)',
                        background: usageView === key ? 'var(--gold)' : 'transparent',
                        color: usageView === key ? 'white' : 'var(--brown)',
                        fontWeight: usageView === key ? 600 : 400,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* By Output table */}
                {usageView === 'byOutput' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--parchment-dark)', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem' }}>Output</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Calls</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Input Tokens</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Output Tokens</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageData.byOutput.map(o => (
                          <tr key={o.outputType} style={{ borderBottom: '1px solid var(--parchment-dark)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: 500 }}>{o.outputType}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{o.callCount}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(o.inputTokens / 1000).toFixed(1)}k</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(o.outputTokens / 1000).toFixed(1)}k</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>${(o.costCents / 100).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* By User table */}
                {usageView === 'byUser' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--parchment-dark)', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem' }}>User</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Calls</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Tokens</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Cost</th>
                          <th style={{ padding: '0.5rem' }}>Top Output</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageData.byUser.map(u => {
                          const topOutput = Object.entries(u.outputs || {}).sort(([,a], [,b]) => b.costCents - a.costCents)[0];
                          return (
                            <tr key={u.uid} style={{ borderBottom: '1px solid var(--parchment-dark)' }}>
                              <td style={{ padding: '0.5rem' }}>{u.displayName || u.email || u.uid?.slice(0, 8) + '...'}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right' }}>{u.callCount}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(u.totalTokens / 1000).toFixed(1)}k</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>${(u.costCents / 100).toFixed(2)}</td>
                              <td style={{ padding: '0.5rem', fontSize: '0.8rem' }}>{topOutput ? `${topOutput[0]} ($${(topOutput[1].costCents / 100).toFixed(2)})` : '\u2014'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* By Model table */}
                {usageView === 'byModel' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--parchment-dark)', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem' }}>Model</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Calls</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Input</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Output</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageData.byModel.map(m => (
                          <tr key={m.model} style={{ borderBottom: '1px solid var(--parchment-dark)' }}>
                            <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{m.model}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{m.callCount}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(m.inputTokens / 1000).toFixed(1)}k</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(m.outputTokens / 1000).toFixed(1)}k</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>${(m.costCents / 100).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Daily Trend table */}
                {usageView === 'dailyTrend' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--parchment-dark)', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem' }}>Date</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Calls</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Input</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Output</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageData.dailyTrend.map(d => (
                          <tr key={d.date} style={{ borderBottom: '1px solid var(--parchment-dark)' }}>
                            <td style={{ padding: '0.5rem' }}>{d.date}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{d.callCount}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(d.inputTokens / 1000).toFixed(1)}k</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(d.outputTokens / 1000).toFixed(1)}k</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>${(d.costCents / 100).toFixed(2)}</td>
                          </tr>
                        ))}
                        {usageData.dailyTrend.length === 0 && (
                          <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: 'var(--brown-light)' }}>No usage data yet. Data starts logging after deploy.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Top Calls table */}
                {usageView === 'topCalls' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--parchment-dark)', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem' }}>Context</th>
                          <th style={{ padding: '0.5rem' }}>Model</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>In</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Out</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Cost</th>
                          <th style={{ padding: '0.5rem' }}>When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageData.topCalls.map((c, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--parchment-dark)' }}>
                            <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.context}</td>
                            <td style={{ padding: '0.5rem', fontSize: '0.8rem' }}>{c.model?.includes('opus') ? 'Opus' : 'Sonnet'}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(c.inputTokens / 1000).toFixed(1)}k</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(c.outputTokens / 1000).toFixed(1)}k</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>${c.costCents.toFixed(2)}</td>
                            <td style={{ padding: '0.5rem', fontSize: '0.8rem' }}>{c.timestamp ? new Date(c.timestamp).toLocaleString() : '\u2014'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--brown-light)' }}>
                  Generated {new Date(usageData.generatedAt).toLocaleString()} &middot; {usageData.days}-day window
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
