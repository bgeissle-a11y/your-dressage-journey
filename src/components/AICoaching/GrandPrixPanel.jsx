import { useState, useEffect, useCallback, useRef } from 'react';
import { getGrandPrixThinking, advanceWeekPointer } from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { readCycleState } from '../../services/weeklyFocusService';
import ErrorDisplay from './ErrorDisplay';
import ElapsedTimer from './ElapsedTimer';
import './ThirtyDayCycle.css';

/**
 * Grand Prix Thinking — 30-Day Cycle Architecture (April 2026)
 *
 * Two-tab layout:
 *   Mental Performance (Monthly): Full 4-week program, AI-selected path, week chip navigation
 *   Training Trajectory (Monthly): 3 trajectory cards with collapse/expand, Best Fit highlighted
 *
 * Architecture:
 *   - L1 receives L2 activePath for trajectory alignment (Hard Rule 1)
 *   - weeklyAssignments extracted server-side from current week (Hard Rule 2)
 *   - 30-day cycle with week pointer advancement
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

  // Cycle state
  const [cycleState, setCycleState] = useState(null);
  const [activeWeek, setActiveWeek] = useState(1);

  // Trajectory card expansion
  const [openTrajCard, setOpenTrajCard] = useState(null);

  // Assignment accordion state
  const [openAssignments, setOpenAssignments] = useState(new Set());

  // Check-in card open state
  const [checkInOpen, setCheckInOpen] = useState(false);

  // Assignment checkbox state
  const [checkedAssignments, setCheckedAssignments] = useState({});

  // Modals
  const [showRegenModal, setShowRegenModal] = useState(null); // 'upgrade' | 'warning' | null
  const [regenBlocked, setRegenBlocked] = useState(null);

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
        const riderSnap = await getDoc(doc(db, 'riderProfiles', currentUser.uid));
        const riderData = riderSnap.data();
        const displayName = riderData?.firstName || currentUser.displayName || '';
        const horseName = riderData?.primaryHorseName || '';
        const level = riderData?.currentLevel || '';
        setRiderInfo({ name: displayName, horse: horseName, level });
      } catch {
        // Silently fail
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

  // Read cycle state on mount and update active week
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const cs = await readCycleState(currentUser.uid, 'gpt');
      if (cs) {
        setCycleState(cs);
        setActiveWeek(cs.currentWeek || 1);
      }
    })();
  }, [currentUser]);

  // Compute cycle display info
  const cycleInfo = cycleState ? {
    startDate: cycleState.cycleStartDate ? new Date(cycleState.cycleStartDate) : null,
    currentWeek: cycleState.currentWeek || 1,
    status: cycleState.status || 'active',
    tier: cycleState.tier || 'standard',
    maxWeeks: cycleState.status === 'truncated' ? 2 : 4,
    expiresAt: cycleState.cycleStartDate
      ? new Date(new Date(cycleState.cycleStartDate).getTime() + 30 * 24 * 60 * 60 * 1000)
      : null,
  } : null;

  const daysUntilRefresh = cycleInfo?.expiresAt
    ? Math.max(0, Math.ceil((cycleInfo.expiresAt - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

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
      setRegenBlocked(null);
    }

    try {
      const result = await getGrandPrixThinking({ forceRefresh, staleOk, layer: 'mental' });

      if (!result.success) {
        if (result.error === 'insufficient_data') {
          setInsufficientData(result);
        } else if (result.error === 'regen_blocked') {
          setRegenBlocked(result);
          if (result.reason === 'standard_tier_active_cycle') {
            setShowRegenModal('upgrade');
          }
        } else if (!staleOk) {
          setMentalError({ message: 'Failed to generate your Mental Performance output.' });
        }
        return;
      }

      setMentalData(result);
      setMentalStale(!!result.stale);

      // Update cycle state from response
      if (result.cycleState) {
        setCycleState(result.cycleState);
        setActiveWeek(result.cycleState.currentWeek || 1);
      }
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

      if (result.activePath) {
        setOpenTrajCard(result.activePath);
      }
    } catch (err) {
      if (!staleOk) {
        setTrajectoryError({ message: typeof err.message === 'string' ? err.message : 'Something went wrong.' });
      }
    } finally {
      setTrajectoryLoading(false);
    }
  }, []);

  // Initial load
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

  // Handle regenerate — direct call, visible loading state
  const handleRegenerate = async () => {
    setShowRegenModal(null);
    setMentalRefreshing(true);
    try {
      const result = await getGrandPrixThinking({ forceRefresh: true, layer: 'mental' });
      if (result.success) {
        setMentalData(result);
        setMentalStale(false);
        if (result.cycleState) {
          setCycleState(result.cycleState);
          setActiveWeek(result.cycleState.currentWeek || 1);
        }
      }
    } catch (err) {
      console.error('[GPT] Regenerate error:', err);
      setMentalError({ message: 'Regeneration failed. Please try again.' });
    } finally {
      setMentalRefreshing(false);
    }
  };

  // Toggle assignment accordion
  const toggleAssignment = (key) => {
    setOpenAssignments(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Toggle assignment checkbox
  const toggleCheck = async (weekNum, index) => {
    const key = `${mentalData?.selectedPath?.id}_w${weekNum}_${index}`;
    const newChecked = { ...checkedAssignments, [key]: !checkedAssignments[key] };
    setCheckedAssignments(newChecked);

    if (currentUser) {
      try {
        const ref = doc(db, 'users', currentUser.uid, 'gptProgress', 'assignments');
        await updateDoc(ref, { checked: newChecked }).catch(() => {
          setDoc(ref, { checked: newChecked });
        });
      } catch {
        // Silently fail
      }
    }
  };

  const toggleTrajCard = (cardId) => {
    setOpenTrajCard(openTrajCard === cardId ? null : cardId);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  // ─── RENDER ──────────────────────────────────────────────────

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

  function renderCycleBar() {
    if (!cycleInfo) return null;

    // Health hold state
    if (cycleInfo.status === 'health_hold') {
      return (
        <div className="cycle-bar cycle-bar--hold">
          <span className="cycle-hold-text">
            Your current program is paused. Resume when cleared by your veterinarian or healthcare provider.
            {cycleInfo.tier === 'top' && ' You may regenerate when ready to return.'}
          </span>
        </div>
      );
    }

    // Extended state
    if (cycleInfo.status === 'extended') {
      return (
        <div className="cycle-bar cycle-bar--extended">
          <span className="cycle-extended-text">
            Cycle extended — Log 5+ rides to unlock your next program
          </span>
        </div>
      );
    }

    // Expired state
    if (cycleInfo.status === 'expired') {
      return (
        <div className="cycle-bar cycle-bar--expired" onClick={() => handleRegenerate()}>
          <span className="cycle-expired-text">
            New cycle ready — your data has grown since {formatDate(cycleInfo.startDate)}. Tap to generate your next 4-week program.
          </span>
        </div>
      );
    }

    return (
      <div className="cycle-bar">
        <div className="cycle-seg">
          <span className="cycle-label">Cycle started</span>
          <span className="cycle-value">{formatDate(cycleInfo.startDate)}</span>
        </div>
        <div className="cycle-seg">
          <span className="cycle-label">Current</span>
          <span className="cycle-value highlight">Week {cycleInfo.currentWeek} of {cycleInfo.maxWeeks}</span>
        </div>
        <div className="cycle-seg">
          <span className="cycle-label">Next refresh</span>
          <span className="cycle-value">
            {cycleInfo.expiresAt ? formatDate(cycleInfo.expiresAt) : '—'}
            {daysUntilRefresh != null && ` · ${daysUntilRefresh} days`}
          </span>
        </div>
        <button className="cycle-regen" onClick={handleRegenerate} disabled={mentalRefreshing}>
          {mentalRefreshing ? '⏳ Regenerating...' : '↺ Regenerate early'}
        </button>
      </div>
    );
  }

  function renderHero() {
    const heroSub = [riderInfo.name, riderInfo.horse, riderInfo.level]
      .filter(Boolean).join(' · ');

    return (
      <div className="gpt-hero">
        <div className="hero-eyebrow">Your Dressage Journey</div>
        <div className="hero-title">Grand Prix Thinking</div>
        {heroSub && (
          <div className="hero-sub">
            {riderInfo.name}{riderInfo.horse && <> · <strong>{riderInfo.horse}</strong></>}{riderInfo.level && <> · {riderInfo.level}</>}
          </div>
        )}
        {renderCycleBar()}
        <div className="tab-row">
          <button
            className={`tab-chip ${activeTab === 'mental' ? 'active' : ''}`}
            onClick={() => setActiveTab('mental')}
          >
            Mental Performance
            <span className="chip-badge">Monthly</span>
          </button>
          <button
            className={`tab-chip ${activeTab === 'trajectory' ? 'active' : ''}`}
            onClick={() => setActiveTab('trajectory')}
          >
            Training Trajectory
            <span className="chip-badge">Monthly</span>
          </button>
        </div>
      </div>
    );
  }

  function renderWeekNav() {
    const maxWeeks = cycleInfo?.maxWeeks || 4;
    const currentWeek = cycleInfo?.currentWeek || 1;

    return (
      <div className="week-nav-row">
        <span className="week-nav-label">Week</span>
        {Array.from({ length: maxWeeks }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            className={`wk-chip ${activeWeek === n ? 'active' : ''} ${n > currentWeek ? 'upcoming' : ''}`}
            onClick={() => setActiveWeek(n)}
          >
            Week {n}
          </button>
        ))}
      </div>
    );
  }

  function renderMentalTab() {
    if (mentalLoading && !mentalData) {
      return (
        <div className="gpt-loading">
          <div className="spinner" />
          <p>Generating your Mental Performance program...</p>
          {loadStartedAt && <ElapsedTimer startedAt={loadStartedAt} />}
        </div>
      );
    }

    if (mentalError) {
      return <ErrorDisplay message={mentalError?.message} onRetry={() => fetchMental({ forceRefresh: true })} />;
    }

    if (!mentalData?.selectedPath) return null;

    const sp = mentalData.selectedPath;
    const weeks = sp.weeks || [];
    const currentWeekData = weeks[activeWeek - 1];
    const assignments = currentWeekData?.assignments || [];

    return (
      <div className="tab-panel active gpt-fade-up">
        {/* Staleness banner */}
        {mentalStale && (
          <div className="gpt-stale-banner" onClick={() => fetchMental({ forceRefresh: true })}>
            New data available — tap to update with your latest debriefs
          </div>
        )}

        {mentalRefreshing && (
          <div className="gpt-gen-refreshing-bar">
            <div className="spinner spinner--small" /> Refreshing with your latest data...
          </div>
        )}

        {/* Section label */}
        <div className="section-label-row">
          <span className="section-pill pill-mental">
            <span className="pill-dot dot-mental" />
            Mental Performance
          </span>
          <span className="section-note">AI-selected path · {cycleInfo?.maxWeeks || 4}-week program</span>
        </div>

        {/* AI Reasoning Card */}
        <div className="ai-card">
          <div className="ai-card-header">
            <div className="ai-icon">🎯</div>
            <div className="ai-card-title">Why this path, this cycle</div>
            <span className="ai-card-tag">AI Reasoning</span>
          </div>
          <div className="ai-card-body">
            <div className="ai-why-label">Pattern from your data</div>
            <div className="ai-why-text">
              {sp.aiReasoning?.dataEvidence || sp.aiReasoning?.patternCited || 'Analysis based on your recent rides.'}
            </div>
            {sp.aiReasoning?.trajectoryLink && (
              <div className="traj-link-bar">
                <strong>Trajectory link:</strong> {sp.aiReasoning.trajectoryLink}
              </div>
            )}
            {sp.otherPaths?.length > 0 && (
              <div className="other-paths-row">
                <span className="other-paths-label">Other paths available:</span>
                {sp.otherPaths.map(op => (
                  <button
                    key={op.id}
                    className="path-chip"
                    onClick={() => setActiveTab('trajectory')}
                  >
                    {op.icon} {op.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Week Navigation */}
        {renderWeekNav()}

        {/* Week Theme */}
        {currentWeekData && (
          <div className="week-theme">
            <span className="week-num-badge">{activeWeek}</span>
            <div>
              <div className="week-theme-label">Week {activeWeek}</div>
              <div className="week-theme-title">{currentWeekData.title || `Week ${activeWeek}`}</div>
              {currentWeekData.focus && (
                <div className="week-theme-sub">{currentWeekData.focus}</div>
              )}
            </div>
          </div>
        )}

        {/* Assignment Cards */}
        {assignments.map((a, i) => {
          const cardKey = `w${activeWeek}_${i}`;
          const checkKey = `${sp.id}_w${activeWeek}_${i}`;
          const isOpen = openAssignments.has(cardKey);
          const isChecked = !!checkedAssignments[checkKey];

          return (
            <div key={cardKey} className={`assign-card ${isOpen ? 'open' : ''}`}>
              <div className="assign-header" onClick={() => toggleAssignment(cardKey)}>
                <div className="assign-icon">{a.when === 'Pre-ride' ? '🌅' : a.when === 'During ride' ? '🐴' : a.when === 'Post-ride' ? '📝' : '🧠'}</div>
                <div className="assign-title-block">
                  <div className="assign-title">{a.title}</div>
                  <div className="assign-meta">{a.description?.substring(0, 60)}...</div>
                </div>
                <span className="assign-when">{a.when}</span>
                <div className="assign-check-wrap">
                  <div
                    className={`assign-check ${isChecked ? 'checked' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleCheck(activeWeek, i); }}
                  >
                    {isChecked ? '✓' : ''}
                  </div>
                  <span className="assign-arrow">▼</span>
                </div>
              </div>
              <div className="assign-body">
                <div className="assign-desc">{a.description}</div>
                {a.example && (
                  <div className="data-callout">
                    <div className="data-callout-label">From your data</div>
                    <div className="data-callout-text">{a.example}</div>
                  </div>
                )}
                {a.trajectoryLink && (
                  <div className="wf-pin-row">
                    <span className="wf-pin">Feeds Weekly Focus</span>
                    <span className="wf-pin-text">Builds toward: {a.trajectoryLink}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Success metric */}
        {currentWeekData?.successMetric && (
          <div className="success-block">
            <span className="success-icon">✓</span>
            <div>
              <div className="success-label">This week looks like success when...</div>
              <div className="success-text">{currentWeekData.successMetric}</div>
            </div>
          </div>
        )}

        {/* Check-in questions */}
        {currentWeekData?.checkIn?.length > 0 && (
          <div className={`checkin-card ${checkInOpen ? 'open' : ''}`}>
            <div className="checkin-header" onClick={() => setCheckInOpen(!checkInOpen)}>
              <span className="checkin-title">End-of-week check-in</span>
              <span className="checkin-arrow">▼</span>
            </div>
            <div className="checkin-body">
              {currentWeekData.checkIn.map((q, k) => (
                <div key={k} className="checkin-q">
                  <span className="q-num">{k + 1}.</span>
                  <span>{q}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Focus callout */}
        <div className="wf-callout">
          <span>📌</span>
          <div className="wf-callout-text">
            <strong>Weekly Focus</strong> pulls your current week's assignments into a single view alongside coaching and physical guidance.
            <br />
            <a className="wf-link" href="/dashboard">View in This Week →</a>
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
      return <ErrorDisplay message={trajectoryError?.message} onRetry={() => fetchTrajectory({ forceRefresh: true })} />;
    }

    if (!trajectoryData) return null;

    const paths = trajectoryData.trajectoryPaths?.paths || [];
    const narratives = trajectoryData.pathNarratives?.path_narratives || [];
    const activePath = trajectoryData.activePath;

    const TRAJ_CARDS = [
      { id: 'ambitious_competitor', name: 'Ambitious Competitor', icon: '🏆', iconClass: 'gpt-icon-gold', subtitle: "Goal-driven. PSG debut with a score you're proud of." },
      { id: 'steady_builder', name: 'Steady Builder', icon: '🧱', iconClass: 'gpt-icon-sky', subtitle: 'Mastery-first. No rush, no gaps in the foundation.' },
      { id: 'curious_explorer', name: 'Curious Explorer', icon: '🌿', iconClass: 'gpt-icon-forest', subtitle: 'Joy-centered. Breadth over timeline. Partnership first.' },
    ];

    return (
      <div className="tab-panel active gpt-fade-up">
        {/* Cadence card */}
        <div className="cadence-card">
          <span>🗓</span>
          <div className="cadence-text">
            <strong>Updated monthly.</strong> Training Trajectory looks further out than your monthly mental performance work — it updates when your data changes significantly or 30 days have passed.
            {trajectoryData.generatedAt && <em> Last generated: {formatDate(trajectoryData.generatedAt)}.</em>}
          </div>
        </div>

        {trajectoryStale && (
          <div className="gpt-stale-banner" onClick={() => fetchTrajectory({ forceRefresh: true })}>
            Updated trajectory available — tap to refresh
          </div>
        )}

        <div className="section-label-row">
          <span className="section-pill pill-gold">
            <span className="pill-dot dot-gold" />
            Training Trajectory
          </span>
          <span className="section-note">3 paths · choose your direction</span>
        </div>

        {TRAJ_CARDS.map(card => {
          const isBestFit = activePath === card.id;
          const isOpen = openTrajCard === card.id;
          const pathData = paths.find(p =>
            p.name?.toLowerCase().replace(/\s+/g, '_') === card.id || p.name === card.name
          );
          const narrative = narratives.find(n =>
            n.path_name?.toLowerCase().replace(/\s+/g, '_') === card.id || n.path_name === card.name
          );

          return (
            <div key={card.id} className={`traj-card ${isBestFit ? 'active-path' : ''}`}>
              <div className="traj-header" onClick={() => toggleTrajCard(card.id)}>
                <div className={`traj-icon ${card.iconClass}`}>{card.icon}</div>
                <div className="traj-header-text">
                  <div className="traj-title">{card.name}</div>
                  <div className="traj-subtitle">{pathData?.subtitle || card.subtitle}</div>
                </div>
                {isBestFit && <span className="gpt-primary-badge">Best Fit</span>}
                <button className={`gpt-collapse-icon ${isOpen ? 'open' : ''}`}>▼</button>
              </div>

              {isOpen && (
                <div className="traj-body open">
                  <div className="traj-row">
                    <div className="traj-stat">
                      <div className="traj-stat-label">Where you are now</div>
                      <div className="traj-stat-value">
                        {pathData?.philosophy || trajectoryData.currentStateAnalysis?.trajectory || ''}
                      </div>
                    </div>
                    <div className="traj-stat">
                      <div className="traj-stat-label">What this path prioritizes</div>
                      <div className="traj-stat-value">{pathData?.year1?.focus || ''}</div>
                    </div>
                  </div>

                  {pathData?.year1?.milestones?.length > 0 && (
                    <>
                      <div className="gpt-milestones-label">3-6 Month Milestones</div>
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

                  {narrative?.narrative && (
                    <div className="gpt-traj-timeline">
                      <strong>Trajectory projection:</strong> {narrative.narrative.substring(0, 300)}
                      {narrative.narrative.length > 300 ? '...' : ''}
                    </div>
                  )}

                  {!isBestFit && narrative?.why_not_selected && (
                    <div className="traj-why-not">
                      <strong>Why not selected this cycle:</strong> {narrative.why_not_selected}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderRegenModal() {
    if (!showRegenModal) return null;

    if (showRegenModal === 'upgrade') {
      return (
        <div className="gpt-modal-overlay" onClick={() => setShowRegenModal(null)}>
          <div className="gpt-modal" onClick={e => e.stopPropagation()}>
            <h3>Early Regeneration</h3>
            <p>
              Early regeneration is available on the Top tier plan. Your current cycle runs
              until {cycleInfo?.expiresAt ? formatDate(cycleInfo.expiresAt) : 'the end of this month'}.
              Your next free refresh will incorporate all rides logged between now and then.
            </p>
            <p className="gpt-modal-note">Upgrade to Top tier to regenerate any time.</p>
            <button className="gpt-modal-btn" onClick={() => setShowRegenModal(null)}>Got it</button>
          </div>
        </div>
      );
    }

    if (showRegenModal === 'warning') {
      return (
        <div className="gpt-modal-overlay" onClick={() => setShowRegenModal(null)}>
          <div className="gpt-modal" onClick={e => e.stopPropagation()}>
            <h3>Regenerate Early?</h3>
            <p>
              This will start a new 30-day cycle and reset your week pointer to Week 1.
              Your current Week {cycleInfo?.currentWeek} progress will be replaced.
            </p>
            <div className="gpt-modal-actions">
              <button className="gpt-modal-btn gpt-modal-btn--secondary" onClick={() => setShowRegenModal(null)}>Cancel</button>
              <button className="gpt-modal-btn" onClick={handleRegenerate}>Regenerate</button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="gpt-redesign">
      {renderHero()}
      {mentalRefreshing && (
        <div className="gpt-gen-refreshing-bar">
          <div className="spinner spinner--small" />
          <span>Regenerating your Mental Performance program — this takes about 2 minutes...</span>
        </div>
      )}
      {activeTab === 'mental' && renderMentalTab()}
      {activeTab === 'trajectory' && renderTrajectoryTab()}
      {renderRegenModal()}
    </div>
  );
}
