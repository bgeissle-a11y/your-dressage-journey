import { useState, useEffect, useCallback, useRef } from 'react';
import { getGrandPrixThinking, getGPTExpanded } from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase-config';
import ErrorDisplay from './ErrorDisplay';
import ElapsedTimer from './ElapsedTimer';

/**
 * Grand Prix Thinking — Redesigned March 2026
 *
 * Two-tab layout:
 *   Mental Performance (Weekly): Single AI-selected path, Week 1 detail, on-demand 4-week expansion
 *   Training Trajectory (Monthly): 3 trajectory cards with collapse/expand, Best Fit highlighted
 *
 * Architecture:
 *   - L1 receives L2 activePath for trajectory alignment (Hard Rule 1)
 *   - weeklyAssignments extracted server-side from Week 1 (Hard Rule 2)
 */
export default function GrandPrixPanel({ generationStatus }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('mental');

  // Mental layer state
  const [mentalData, setMentalData] = useState(null);
  const [mentalLoading, setMentalLoading] = useState(false);
  const [mentalError, setMentalError] = useState(null);

  // Trajectory layer state
  const [trajectoryData, setTrajectoryData] = useState(null);
  const [trajectoryLoading, setTrajectoryLoading] = useState(false);
  const [trajectoryError, setTrajectoryError] = useState(null);
  const trajectoryLoaded = useRef(false);

  // Expansion state
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [expandLoading, setExpandLoading] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);
  const [activeWeek, setActiveWeek] = useState(1);

  // Trajectory card expansion
  const [openTrajCard, setOpenTrajCard] = useState(null); // Best Fit opens by default

  // Assignment checkbox state
  const [checkedAssignments, setCheckedAssignments] = useState({});

  // General state
  const [insufficientData, setInsufficientData] = useState(null);
  const [mentalStale, setMentalStale] = useState(false);
  const [trajectoryStale, setTrajectoryStale] = useState(false);
  const [mentalRefreshing, setMentalRefreshing] = useState(false);
  const [loadStartedAt, setLoadStartedAt] = useState(null);

  // Rider display info
  const [riderInfo, setRiderInfo] = useState({ name: '', horse: '', level: '' });

  // Fetch rider display info for hero
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const [riderSnap, horsesSnap] = await Promise.all([
          getDoc(doc(db, 'riderProfiles', currentUser.uid)),
          getDoc(doc(db, 'users', currentUser.uid)),
        ]);
        const riderData = riderSnap.data();
        const displayName = riderData?.firstName || currentUser.displayName || '';
        const horseName = riderData?.primaryHorseName || '';
        const level = riderData?.currentLevel || '';
        setRiderInfo({ name: displayName, horse: horseName, level });
      } catch {
        // Silently fail — hero will show without rider info
      }
    })();
  }, [currentUser]);

  // Load saved checkbox state
  useEffect(() => {
    if (!currentUser || !mentalData?.selectedPath?.id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid, 'gptProgress', 'assignments'));
        if (snap.exists()) {
          setCheckedAssignments(snap.data()?.checked || {});
        }
      } catch {
        // Silently fail
      }
    })();
  }, [currentUser, mentalData?.selectedPath?.id]);

  // Fetch mental layer
  const fetchMental = useCallback(async ({ forceRefresh = false, staleOk = false } = {}) => {
    if (forceRefresh && mentalData) {
      setMentalRefreshing(true);
    } else if (!staleOk) {
      setMentalLoading(true);
      setLoadStartedAt(Date.now());
    }
    if (!staleOk) {
      setMentalError(null);
      setInsufficientData(null);
    }

    try {
      const result = await getGrandPrixThinking({ forceRefresh, staleOk, layer: 'mental' });

      if (!result.success) {
        if (result.error === 'insufficient_data') {
          setInsufficientData(result);
        } else if (!staleOk) {
          setMentalError({ message: 'Failed to generate your Mental Performance output.' });
        }
        return;
      }

      setMentalData(result);
      setMentalStale(!!result.stale);

      // Reset expansion state on new data
      setExpandedPlan(null);
      setExpandOpen(false);
      setActiveWeek(1);
    } catch (err) {
      if (!staleOk) {
        setMentalError({ message: typeof err.message === 'string' ? err.message : 'Something went wrong.' });
      }
    } finally {
      setMentalLoading(false);
      setMentalRefreshing(false);
    }
  }, [mentalData]);

  // Fetch trajectory layer
  const fetchTrajectory = useCallback(async ({ forceRefresh = false, staleOk = false } = {}) => {
    if (!staleOk) {
      setTrajectoryLoading(true);
      setTrajectoryError(null);
    }

    try {
      const result = await getGrandPrixThinking({ forceRefresh, staleOk, layer: 'trajectory' });

      if (!result.success) {
        if (!staleOk) {
          setTrajectoryError({ message: 'Failed to generate Training Trajectory.' });
        }
        return;
      }

      setTrajectoryData(result);
      setTrajectoryStale(!!result.stale);

      // Open Best Fit card by default
      const activePath = result.activePath;
      if (activePath) {
        setOpenTrajCard(activePath);
      }
    } catch (err) {
      if (!staleOk) {
        setTrajectoryError({ message: typeof err.message === 'string' ? err.message : 'Something went wrong.' });
      }
    } finally {
      setTrajectoryLoading(false);
    }
  }, []);

  // Initial load — mental (staleOk first, then full)
  useEffect(() => {
    fetchMental({ staleOk: true }).then(() => fetchMental());
  }, []);

  // Lazy-load trajectory on first tab switch
  useEffect(() => {
    if (activeTab === 'trajectory' && !trajectoryLoaded.current) {
      trajectoryLoaded.current = true;
      fetchTrajectory({ staleOk: true }).then(() => fetchTrajectory());
    }
  }, [activeTab]);

  // Auto-refresh on generation complete
  useEffect(() => {
    if (generationStatus?.justCompleted) {
      fetchMental({ forceRefresh: true });
      if (trajectoryLoaded.current) {
        fetchTrajectory({ forceRefresh: true });
      }
    }
  }, [generationStatus?.justCompleted]);

  // Handle 4-week expansion
  const handleExpand = async () => {
    if (expandOpen) {
      setExpandOpen(false);
      return;
    }

    setExpandOpen(true);

    if (expandedPlan) return; // Already loaded

    const pathId = mentalData?.selectedPath?.id;
    if (!pathId) return;

    setExpandLoading(true);
    try {
      const result = await getGPTExpanded(pathId);
      if (result.success) {
        setExpandedPlan(result);
      }
    } catch (err) {
      console.error('[GPT Expand]', err);
    } finally {
      setExpandLoading(false);
    }
  };

  // Toggle assignment checkbox
  const toggleAssignment = async (index) => {
    const key = `${mentalData?.selectedPath?.id}_w1_${index}`;
    const newChecked = { ...checkedAssignments, [key]: !checkedAssignments[key] };
    setCheckedAssignments(newChecked);

    // Persist to Firestore
    if (currentUser) {
      try {
        const ref = doc(db, 'users', currentUser.uid, 'gptProgress', 'assignments');
        await updateDoc(ref, { checked: newChecked }).catch(() => {
          // Document may not exist yet — create it
          setDoc(ref, { checked: newChecked });
        });
      } catch {
        // Silently fail
      }
    }
  };

  // Toggle trajectory card
  const toggleTrajCard = (cardId) => {
    setOpenTrajCard(openTrajCard === cardId ? null : cardId);
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  // ─── RENDER ────────────────────────────────────────────────

  // Insufficient data state
  if (insufficientData) {
    return (
      <div className="gpt-redesign">
        {renderHero()}
        <div className="gpt-insufficient">
          <h3>Almost there!</h3>
          <p>{insufficientData.message}</p>
          <div className="gpt-insufficient__checklist">
            <div className="gpt-insufficient__item">Rider profile completed</div>
            <div className="gpt-insufficient__item">At least one horse added</div>
            <div className="gpt-insufficient__item">3+ post-ride debriefs submitted</div>
          </div>
        </div>
      </div>
    );
  }

  function renderHero() {
    const heroSub = [riderInfo.name, riderInfo.horse, riderInfo.level]
      .filter(Boolean).join(' · ');

    return (
      <div className="gpt-hero">
        <div className="gpt-hero__eyebrow">Your Dressage Journey</div>
        <div className="gpt-hero__title">Grand Prix Thinking</div>
        {heroSub && (
          <div className="gpt-hero__sub">
            {riderInfo.name}{riderInfo.horse && <> · <strong>{riderInfo.horse}</strong></>}{riderInfo.level && <> · {riderInfo.level}</>}
          </div>
        )}
        <div className="gpt-tab-row">
          <button
            className={`gpt-tab-chip ${activeTab === 'mental' ? 'active' : ''}`}
            onClick={() => setActiveTab('mental')}
          >
            🧠 Mental Performance
            <span className="gpt-chip-badge">Weekly</span>
          </button>
          <button
            className={`gpt-tab-chip ${activeTab === 'trajectory' ? 'active' : ''}`}
            onClick={() => setActiveTab('trajectory')}
          >
            🗺 Training Trajectory
            <span className="gpt-chip-badge">Monthly</span>
          </button>
        </div>
      </div>
    );
  }

  function renderMentalTab() {
    if (mentalLoading && !mentalData) {
      return (
        <div className="gpt-loading">
          <div className="spinner" />
          <p>Generating your Mental Performance analysis...</p>
          {loadStartedAt && <ElapsedTimer startedAt={loadStartedAt} />}
        </div>
      );
    }

    if (mentalError) {
      return <ErrorDisplay error={mentalError} onRetry={() => fetchMental({ forceRefresh: true })} />;
    }

    if (!mentalData?.selectedPath) return null;

    const sp = mentalData.selectedPath;
    const week1 = sp.weeks?.[0];
    const assignments = week1?.assignments || [];

    return (
      <div className="gpt-tab-panel gpt-fade-up">
        {/* Generation meta bar */}
        <div className="gpt-gen-meta">
          <span className="gpt-gen-dot gpt-gen-dot--green" />
          <span className="gpt-gen-fresh">
            {mentalStale ? 'Update available' : 'Current'} — generated {formatDate(mentalData.generatedAt)}
          </span>
          <span className="gpt-gen-divider">·</span>
          <span>Built from {mentalData.dataSnapshot?.debriefCount || 0} debriefs &amp; {mentalData.dataSnapshot?.reflectionCount || 0} reflections</span>
          {mentalData.regenerateAfter && (
            <>
              <span className="gpt-gen-divider">·</span>
              <span>Next refresh {formatDate(mentalData.regenerateAfter)}</span>
            </>
          )}
          {mentalRefreshing && <span className="gpt-gen-refreshing">Refreshing...</span>}
        </div>

        {/* Staleness banner */}
        {mentalStale && (
          <div className="gpt-stale-banner" onClick={() => fetchMental({ forceRefresh: true })}>
            New data available — tap to update with your latest debriefs
          </div>
        )}

        {/* Section label */}
        <div className="gpt-section-label-row">
          <span className="gpt-section-pill gpt-pill-mental">
            <span className="gpt-pill-dot gpt-dot-mental" />
            Mental Performance
          </span>
          <span className="gpt-section-note">AI-selected path · Week 1 of 4</span>
        </div>

        {/* AI Path Selection Card */}
        <div className="gpt-ai-selection-card">
          <div className="gpt-ai-selection-header">
            <div className="gpt-ai-icon">🎯</div>
            <div className="gpt-ai-selection-title">Your path this week: {sp.title}</div>
            <span className="gpt-ai-selection-tag">Why This</span>
          </div>
          <div className="gpt-ai-selection-body">
            <div className="gpt-ai-why-label">Pattern from your data</div>
            <div className="gpt-ai-why-text">
              {sp.aiReasoning?.dataEvidence && (
                <span dangerouslySetInnerHTML={{
                  __html: sp.aiReasoning.dataEvidence.replace(
                    /(\d+[\.\d]*[-–]\w+\s+\w+\s+\w+)/g, '<strong>$1</strong>'
                  )
                }} />
              )}
              {!sp.aiReasoning?.dataEvidence && sp.aiReasoning?.patternCited}
            </div>
            {sp.otherPaths?.length > 0 && (
              <div className="gpt-other-paths-row">
                <span className="gpt-other-path-label">Other paths available:</span>
                {sp.otherPaths.map((op) => (
                  <button key={op.id} className="gpt-other-path-chip">
                    {op.icon} {op.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* The Path Card */}
        <div className="gpt-path-card">
          <div className="gpt-path-header">
            <div className="gpt-path-icon">{sp.icon || '🌅'}</div>
            <div className="gpt-path-header-text">
              <div className="gpt-path-title">{sp.title}</div>
              <div className="gpt-path-subtitle">{sp.subtitle}</div>
            </div>
            <span className="gpt-path-week-badge">Week 1</span>
          </div>

          <div className="gpt-week-body">
            {/* Week title row */}
            <div className="gpt-week-title-row">
              <span className="gpt-week-title">{week1?.title || 'Week 1'}</span>
              {week1?.focus && <span className="gpt-week-focus-tag">{week1.focus}</span>}
            </div>

            {/* Assignments */}
            <div className="gpt-assignments-label">This Week's Assignments</div>
            <div className="gpt-assignment-list">
              {assignments.map((a, i) => {
                const key = `${sp.id}_w1_${i}`;
                const isChecked = !!checkedAssignments[key];
                return (
                  <div
                    key={i}
                    className={`gpt-assignment-item ${isChecked ? 'checked' : ''}`}
                    onClick={() => toggleAssignment(i)}
                  >
                    <div className="gpt-a-checkbox">{isChecked ? '✓' : ''}</div>
                    <div className="gpt-assignment-text">
                      <strong>{a.title}.</strong> {a.description}
                      {a.example && <em> {a.example}</em>}
                    </div>
                    <span className="gpt-assignment-when">{a.when}</span>
                  </div>
                );
              })}
            </div>

            {/* Success metric */}
            {week1?.successMetric && (
              <div className="gpt-success-metric">
                <span className="gpt-success-icon">✓</span>
                <div>
                  <div className="gpt-success-label">This week looks like success when…</div>
                  <div className="gpt-success-text">{week1.successMetric}</div>
                </div>
              </div>
            )}

            {/* Expand button */}
            <button
              className={`gpt-expand-btn ${expandOpen ? 'open' : ''}`}
              onClick={handleExpand}
            >
              <span>{expandOpen ? 'Collapse 4-week plan' : 'View full 4-week plan'}</span>
              <span className="gpt-expand-arrow">▼</span>
            </button>

            {/* 4-week plan (expanded) */}
            {expandOpen && (
              <div className="gpt-four-week-plan open">
                {expandLoading && !expandedPlan && (
                  <div className="gpt-loading gpt-loading--inline">
                    <div className="spinner spinner--small" />
                    <span>Generating weeks 2-4...</span>
                  </div>
                )}

                {expandedPlan?.weeks && (
                  <>
                    <div className="gpt-week-nav">
                      {[1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          className={`gpt-wk-chip ${activeWeek === n ? 'active' : ''}`}
                          onClick={() => setActiveWeek(n)}
                        >
                          Week {n}
                        </button>
                      ))}
                    </div>

                    {expandedPlan.weeks.map((week, idx) => {
                      const weekNum = week.number || idx + 1;
                      if (activeWeek !== weekNum) return null;
                      return (
                        <div key={weekNum} className="gpt-week-panel active">
                          <div className="gpt-week-panel-title">
                            Week {weekNum}: {week.title}
                          </div>
                          <div className="gpt-week-panel-focus"><em>{week.focus}</em></div>
                          {(week.assignments || []).map((a, j) => (
                            <div key={j} className="gpt-mini-practice">
                              <div className="gpt-mini-practice-name">{a.title}</div>
                              <div className="gpt-mini-practice-detail">{a.description}</div>
                            </div>
                          ))}
                          {week.checkIn && (
                            <div className="gpt-check-in-box">
                              <div className="gpt-check-in-label">End-of-week check-in</div>
                              {(Array.isArray(week.checkIn) ? week.checkIn : [week.checkIn]).map((q, k) => (
                                <div key={k} className="gpt-check-in-q">{q}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Show week previews if no expanded plan yet */}
                {!expandedPlan && !expandLoading && sp.weekPreviews?.length > 0 && (
                  <div className="gpt-week-previews">
                    {sp.weekPreviews.map((wp) => (
                      <div key={wp.number} className="gpt-week-preview-item">
                        <strong>Week {wp.number}:</strong> {wp.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderTrajectoryTab() {
    if (trajectoryLoading && !trajectoryData) {
      return (
        <div className="gpt-loading">
          <div className="spinner" />
          <p>Loading Training Trajectory...</p>
        </div>
      );
    }

    if (trajectoryError) {
      return <ErrorDisplay error={trajectoryError} onRetry={() => fetchTrajectory({ forceRefresh: true })} />;
    }

    if (!trajectoryData) return null;

    const paths = trajectoryData.trajectoryPaths?.paths || [];
    const narratives = trajectoryData.pathNarratives?.path_narratives || [];
    const activePath = trajectoryData.activePath;

    // Map trajectory cards
    const TRAJ_CARDS = [
      { id: 'ambitious_competitor', name: 'Ambitious Competitor', icon: '🏆', iconClass: 'gpt-icon-gold', subtitle: 'Goal-driven. PSG debut with a score you\'re proud of.' },
      { id: 'steady_builder', name: 'Steady Builder', icon: '🧱', iconClass: 'gpt-icon-sky', subtitle: 'Mastery-first. No rush, no gaps in the foundation.' },
      { id: 'curious_explorer', name: 'Curious Explorer', icon: '🌿', iconClass: 'gpt-icon-forest', subtitle: 'Joy-centered. Breadth over timeline. Partnership first.' },
    ];

    return (
      <div className="gpt-tab-panel gpt-fade-up">
        {/* Monthly notice */}
        <div className="gpt-monthly-notice">
          <span className="gpt-monthly-notice-icon">🗓</span>
          <div>
            <strong>Updated monthly.</strong> Training Trajectory looks further out than your weekly mental performance work — it updates when your data changes significantly, you add a new horse, or 30 days have passed.
            {trajectoryData.generatedAt && <em> Last generated: {formatDate(trajectoryData.generatedAt)}.</em>}
          </div>
        </div>

        {/* Staleness banner */}
        {trajectoryStale && (
          <div className="gpt-stale-banner" onClick={() => fetchTrajectory({ forceRefresh: true })}>
            Updated trajectory available — tap to refresh
          </div>
        )}

        {/* Section label */}
        <div className="gpt-section-label-row">
          <span className="gpt-section-pill gpt-pill-gold">
            <span className="gpt-pill-dot gpt-dot-gold" />
            Training Trajectory
          </span>
          <span className="gpt-section-note">3 paths · choose your direction</span>
        </div>

        {/* Trajectory cards */}
        <div className="gpt-trajectory-grid">
          {TRAJ_CARDS.map((card) => {
            const isBestFit = activePath === card.id;
            const isOpen = openTrajCard === card.id;
            const pathData = paths.find((p) =>
              p.name?.toLowerCase().replace(/\s+/g, '_') === card.id
              || p.name === card.name
            );
            const narrative = narratives.find((n) =>
              n.path_name?.toLowerCase().replace(/\s+/g, '_') === card.id
              || n.path_name === card.name
            );

            return (
              <div key={card.id} className={`gpt-traj-card ${isBestFit ? 'primary' : ''}`}>
                <div className="gpt-traj-header" onClick={() => toggleTrajCard(card.id)}>
                  <div className={`gpt-traj-icon ${card.iconClass}`}>{card.icon}</div>
                  <div className="gpt-traj-header-text">
                    <div className="gpt-traj-title">{card.name}</div>
                    <div className="gpt-traj-subtitle">
                      {pathData?.subtitle || card.subtitle}
                    </div>
                  </div>
                  {isBestFit && <span className="gpt-primary-badge">Best Fit</span>}
                  <button className={`gpt-collapse-icon ${isOpen ? 'open' : ''}`}>▼</button>
                </div>

                {isOpen && (
                  <div className="gpt-traj-body open">
                    {/* Stats row */}
                    <div className="gpt-traj-row">
                      <div className="gpt-traj-stat">
                        <div className="gpt-traj-stat-label">Where you are now</div>
                        <div className="gpt-traj-stat-value">
                          {pathData?.philosophy || trajectoryData.currentStateAnalysis?.trajectory || ''}
                        </div>
                      </div>
                      <div className="gpt-traj-stat">
                        <div className="gpt-traj-stat-label">What this path prioritizes</div>
                        <div className="gpt-traj-stat-value">
                          {pathData?.year1?.focus || ''}
                        </div>
                      </div>
                    </div>

                    {/* Milestones */}
                    {pathData?.year1?.milestones?.length > 0 && (
                      <>
                        <div className="gpt-milestones-label">3–6 Month Milestones</div>
                        <div className="gpt-milestone-list">
                          {pathData.year1.milestones.map((m, i) => (
                            <div key={i} className="gpt-milestone-item">
                              <div className={`gpt-milestone-dot ${card.id === 'steady_builder' ? 'sky' : card.id === 'curious_explorer' ? 'forest' : ''}`} />
                              <span>{m}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Narrative / timeline projection */}
                    {narrative?.narrative && (
                      <div className="gpt-traj-timeline">
                        <strong>Trajectory projection:</strong> {narrative.narrative.substring(0, 300)}
                        {narrative.narrative.length > 300 ? '...' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="gpt-redesign">
      {renderHero()}

      {activeTab === 'mental' && renderMentalTab()}
      {activeTab === 'trajectory' && renderTrajectoryTab()}
    </div>
  );
}
