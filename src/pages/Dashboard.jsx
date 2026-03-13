import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase-config';
import useDashboardData from '../hooks/useDashboardData';
import useWeeklyFocus from '../hooks/useWeeklyFocus';
import WeeklyFocusContent from '../components/WeeklyFocus/WeeklyFocusContent';
import {
  getAllDebriefs,
  getAllReflections,
  getAllObservations,
  getAllJourneyEvents,
  getAllShowPreparations,
  getAllHealthEntries,
  getAllLessonNotes
} from '../services';
import { getAdminStats } from '../services/aiService';
import { exportToCSV, exportToJSON, EXPORT_COLUMNS } from '../utils/exportUtils';
import './Dashboard.css';

const ADMIN_UID = 'HwwKk5C7qZh1Bn0KYalPYIZWHmj2';
const DEFAULT_ORDER = ['stats', 'focus', 'data'];

const INTENTION_COLORS = ['#b8862a', '#3d6b46', '#2e5c82', '#7a3f72', '#8b6340'];

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
];
const DM_REVIEW = [
  { icon: '\uD83D\uDCCB', label: 'All Debriefs', desc: 'Browse your ride history', to: '/debriefs' },
  { icon: '\u25C7', label: 'All Reflections', desc: 'Your reflection library', to: '/reflections' },
  { icon: '\u25CE', label: 'Observations', desc: 'Your observation notes', to: '/observations' },
  { icon: '\uD83D\uDCDD', label: 'Lesson Notes', desc: 'Your lesson library', to: '/lesson-notes' },
  { icon: '\uD83C\uDF3F', label: 'Health Log', desc: 'Full soundness records', to: '/horse-health' },
  { icon: '\uD83D\uDCC5', label: 'Journey Events', desc: 'Your timeline', to: '/events' },
  { icon: '\uD83C\uDFDF', label: 'Show Preparations', desc: 'Past show prep plans', to: '/show-prep' },
];

/* ── Sparkline SVG renderer ── */
function Sparkline({ values, color, label }) {
  const W = 200, H = 26, MIN = 4, MAX = 10;
  const gradId = `g-${label.replace(/\s/g, '')}`;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (W - 12) + 6;
    const y = H - ((v - MIN) / (MAX - MIN)) * (H - 8) - 4;
    return { x, y, v };
  });
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="sparkline-row">
      <div className="spark-label">{label}</div>
      <div className="spark-track">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>
          <polyline points={polyline} fill="none" stroke={`url(#${gradId})`}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y}
              r={i === pts.length - 1 ? 3.5 : 2} fill={color} />
          ))}
        </svg>
      </div>
      <div className="spark-val">{values[values.length - 1]}</div>
    </div>
  );
}

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
  const { loading, stats, recentDebriefs, upcomingEvents, sparklineData, intentionData } = useDashboardData();
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
      const [debRes, refRes, obsRes, evtRes, prepRes, healthRes, lessonRes] = await Promise.all([
        getAllDebriefs(currentUser.uid),
        getAllReflections(currentUser.uid),
        getAllObservations(currentUser.uid),
        getAllJourneyEvents(currentUser.uid),
        getAllShowPreparations(currentUser.uid),
        getAllHealthEntries(currentUser.uid),
        getAllLessonNotes(currentUser.uid)
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

  // Format date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Week range for Weekly Focus header
  const monday = new Date(today);
  const dayOfWeek = monday.getDay();
  monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const weekRange = `${monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}\u2013${sunday.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;

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
        </div>

        {/* Viz panel — flush at bottom of block */}
        <div className="viz-panel">
          <div>
            <div className="viz-col-title">Ride Quality &amp; Confidence &middot; Last 8 Rides</div>
            {sparklineData ? (
              <div className="sparkline-wrap">
                <Sparkline values={sparklineData.quality} color="#b8862a" label="Quality" />
                <Sparkline values={sparklineData.confidence} color="#2e5c82" label="Confidence" />
              </div>
            ) : (
              <div className="viz-placeholder">Your patterns will appear here after a few more rides.</div>
            )}
          </div>
          <div>
            <div className="viz-col-title">Intention Ratings &middot; 4-Week Average</div>
            {intentionData ? (
              <div className="bar-chart">
                {intentionData.map((d, i) => (
                  <div key={d.label} className="bar-row">
                    <div className="bar-label">{d.label}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{
                        width: `${(d.avg / 5) * 100}%`,
                        background: INTENTION_COLORS[i % INTENTION_COLORS.length],
                        opacity: 0.75,
                      }} />
                    </div>
                    <div className="bar-val">{d.avg}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="viz-placeholder">Your patterns will appear here after a few more rides.</div>
            )}
          </div>
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
            <div className="block-subtitle">Record &middot; Plan &middot; Assess &middot; Review &middot; Export</div>
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
        {blockOrder.map(id => blockRenderers[id] ? blockRenderers[id]() : null)}
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
    </div>
  );
}
