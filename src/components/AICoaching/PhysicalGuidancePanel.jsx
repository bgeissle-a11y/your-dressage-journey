import React, { useState, useEffect, useCallback } from 'react';
import { getPhysicalGuidance, advanceWeekPointer } from '../../services/aiService';
import { readCycleState } from '../../services/weeklyFocusService';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase-config';
import ErrorDisplay from './ErrorDisplay';
import ElapsedTimer from './ElapsedTimer';
import './ThirtyDayCycle.css';

/**
 * Physical Guidance — 30-Day Cycle Architecture (April 2026)
 *
 * Two-tab layout:
 *   Body Awareness (Monthly): 4-week program with pattern cards, week navigation
 *   Exercise Protocol (Monthly): Exercises, pre-ride ritual, body awareness profile
 *
 * Hard Rules:
 *   - Body Awareness receives Exercise Protocol as input context
 *   - Both receive active GPT trajectory as input context
 *   - weeklyFocusItems extracted server-side, never AI-generated
 */
export default function PhysicalGuidancePanel() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('awareness');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [insufficientData, setInsufficientData] = useState(null);
  const [loadStartedAt, setLoadStartedAt] = useState(null);
  const [isStale, setIsStale] = useState(false);

  // Cycle state
  const [cycleState, setCycleState] = useState(null);
  const [activeWeek, setActiveWeek] = useState(1);

  // Pattern card expansion
  const [openPatterns, setOpenPatterns] = useState(new Set());

  // Exercise card expansion
  const [openExercises, setOpenExercises] = useState(new Set());

  // Collapsible cards in Exercise Protocol tab
  const [profileOpen, setProfileOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);

  // Pre-ride checklist (NOT persisted — resets on load)
  const [preRideChecks, setPreRideChecks] = useState({});

  // Modals
  const [showRegenModal, setShowRegenModal] = useState(null);

  // Rider info
  const [riderInfo, setRiderInfo] = useState({ name: '', horse: '', level: '' });

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const riderSnap = await getDoc(doc(db, 'riderProfiles', currentUser.uid));
        const rd = riderSnap.data();
        setRiderInfo({
          name: rd?.firstName || currentUser.displayName || '',
          horse: rd?.primaryHorseName || '',
          level: rd?.currentLevel || '',
        });
      } catch { /* silently fail */ }
    })();
  }, [currentUser]);

  // Read cycle state on mount
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const cs = await readCycleState(currentUser.uid, 'physical');
      if (cs) {
        setCycleState(cs);
        setActiveWeek(cs.currentWeek || 1);
      }
    })();
  }, [currentUser]);

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

  const fetchData = useCallback(async ({ forceRefresh = false, staleOk = false } = {}) => {
    if ((forceRefresh || (data && !staleOk)) && data) {
      setRefreshing(true);
    } else if (!staleOk) {
      setLoading(true);
      setLoadStartedAt(Date.now());
    }
    if (!staleOk) {
      setError(null);
      setInsufficientData(null);
    }

    try {
      const result = await getPhysicalGuidance({ forceRefresh, staleOk });

      if (!result.success) {
        if (result.error === 'insufficient_data' || result.error === 'missing_assessment') {
          setInsufficientData(result);
        } else if (result.error === 'regen_blocked') {
          if (result.reason === 'standard_tier_active_cycle') {
            setShowRegenModal('upgrade');
          }
        } else if (!staleOk) {
          setError({ message: 'Failed to generate your Physical Guidance.' });
        }
        return;
      }

      setData(result);
      setIsStale(!!result.stale);

      if (result.cycleState) {
        setCycleState(result.cycleState);
        setActiveWeek(result.cycleState.currentWeek || 1);
      }

      if (result.stale && staleOk) {
        fetchData({ forceRefresh: false });
      }
    } catch (err) {
      if (staleOk) {
        fetchData({ forceRefresh: false });
        return;
      }
      console.error('Physical Guidance error:', err);
      if (data) {
        setError({ message: 'Could not refresh. Showing previous results.' });
      } else {
        setError({ message: err?.message || 'An error occurred.' });
      }
    } finally {
      if (!staleOk) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [data]);

  useEffect(() => {
    fetchData({ staleOk: true });
  }, []);

  const handleRegenerate = async () => {
    setShowRegenModal(null);
    setRefreshing(true);
    try {
      const result = await getPhysicalGuidance({ forceRefresh: true });
      if (result.success) {
        setData(result);
        setIsStale(false);
        if (result.cycleState) {
          setCycleState(result.cycleState);
          setActiveWeek(result.cycleState.currentWeek || 1);
        }
      }
    } catch (err) {
      console.error('[Physical] Regenerate error:', err);
      setError({ message: 'Regeneration failed. Please try again.' });
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const togglePattern = (id) => {
    setOpenPatterns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleExercise = (idx) => {
    setOpenExercises(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // ─── Insufficient Data ──
  if (insufficientData) {
    const isMissingAssessment = insufficientData.error === 'missing_assessment';
    return (
      <div className="phys-redesign">
        <div className="phys-hero">
          <div className="hero-eyebrow">Your Dressage Journey</div>
          <div className="hero-title">Physical Guidance</div>
        </div>
        <div className="panel-insufficient">
          <h3>{isMissingAssessment ? 'Complete Your Physical Self-Assessment' : 'Your Physical Guidance Awaits'}</h3>
          <p>{insufficientData.message}</p>
        </div>
      </div>
    );
  }

  // ─── Loading ──
  if (loading && !data) {
    return (
      <div className="phys-redesign">
        <div className="phys-hero">
          <div className="hero-eyebrow">Your Dressage Journey</div>
          <div className="hero-title">Physical Guidance</div>
        </div>
        <div className="panel-loading-spinner">
          <div className="spinner" />
          <p>Cross-referencing your physical assessment with your ride data...</p>
          <ElapsedTimer startedAt={loadStartedAt} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="phys-redesign">
        <div className="phys-hero">
          <div className="hero-eyebrow">Your Dressage Journey</div>
          <div className="hero-title">Physical Guidance</div>
        </div>
        <ErrorDisplay message={error.message} onRetry={() => fetchData({ forceRefresh: true })} />
      </div>
    );
  }

  if (!data) return null;

  const weeks = data.weeks || [];
  const currentWeekData = weeks[activeWeek - 1];
  const exerciseProtocol = data.exerciseProtocol || data.exercisePrescription || {};
  const bodyProfile = data.bodyAwarenessProfile || {};


  function renderCycleBar() {
    if (!cycleInfo) return null;

    if (cycleInfo.status === 'health_hold') {
      return (
        <div className="cycle-bar cycle-bar--hold">
          <span>Program paused — resume when cleared by your veterinarian or healthcare provider.</span>
        </div>
      );
    }
    if (cycleInfo.status === 'extended') {
      return (
        <div className="cycle-bar cycle-bar--extended">
          <span>Cycle extended — Log 5+ rides to unlock your next program</span>
        </div>
      );
    }
    if (cycleInfo.status === 'expired') {
      return (
        <div className="cycle-bar cycle-bar--expired" onClick={handleRegenerate}>
          <span>New cycle ready — tap to generate your next program.</span>
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
        <button className="cycle-regen" onClick={handleRegenerate} disabled={refreshing}>
          {refreshing ? '⏳ Regenerating...' : '↺ Regenerate early'}
        </button>
      </div>
    );
  }

  function renderHero() {
    return (
      <div className="phys-hero">
        <div className="hero-eyebrow">Your Dressage Journey</div>
        <div className="hero-title">Physical Guidance</div>
        {riderInfo.name && (
          <div className="hero-sub">
            {riderInfo.name}{riderInfo.horse && <> · <strong>{riderInfo.horse}</strong></>}{riderInfo.level && <> · {riderInfo.level}</>}
          </div>
        )}
        {renderCycleBar()}
        <div className="tab-row">
          <button className={`tab-chip ${activeTab === 'awareness' ? 'active' : ''}`} onClick={() => setActiveTab('awareness')}>
            Body Awareness <span className="chip-badge">4-Week Program</span>
          </button>
          <button className={`tab-chip ${activeTab === 'protocol' ? 'active' : ''}`} onClick={() => setActiveTab('protocol')}>
            Exercise Protocol <span className="chip-badge">Monthly</span>
          </button>
        </div>
      </div>
    );
  }

  function renderAwarenessTab() {
    const maxWeeks = cycleInfo?.maxWeeks || 4;
    const currentWeek = cycleInfo?.currentWeek || 1;
    const patterns = currentWeekData?.patterns || [];

    return (
      <div className="tab-panel active phys-fade-up">
        {refreshing && (
          <div className="gpt-gen-refreshing-bar">
            <div className="spinner spinner--small" /> Refreshing...
          </div>
        )}

        <div className="section-label-row">
          <span className="section-pill pill-body">
            <span className="pill-dot dot-body" />
            Body Awareness
          </span>
          <span className="section-note">{maxWeeks}-week program</span>
        </div>

        {/* Week Nav */}
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

        {/* Week Theme */}
        {currentWeekData?.theme && (
          <div className="week-theme">
            <span className="week-num-badge">{activeWeek}</span>
            <div>
              <div className="week-theme-label">Week {activeWeek}</div>
              <div className="week-theme-title">{currentWeekData.theme.title}</div>
              {currentWeekData.theme.subtitle && (
                <div className="week-theme-sub">{currentWeekData.theme.subtitle}</div>
              )}
            </div>
          </div>
        )}

        {/* Pattern Cards */}
        {patterns.map((p, i) => {
          const isOpen = openPatterns.has(p.id || i);
          const isHorse = p.isHorseHealth;

          return (
            <div key={p.id || i} className={`pattern-card ${isHorse ? 'horse' : ''} ${isOpen ? 'open' : ''}`}>
              <div className="pattern-header">
                <div className="p-icon">{isHorse ? '🐴' : '🧘'}</div>
                <div className="p-title-block">
                  <div className="p-title">{p.title}</div>
                  <div className="p-source">{p.source}</div>
                </div>
                <span className="p-badge">{p.badge || (isHorse ? 'Horse Health' : 'Primary · Rider')}</span>
              </div>

              <div className="pattern-body">
                <div className="pattern-desc">{p.description}</div>
                <div className="noticing-block">
                  <div className="noticing-label">What to notice this week</div>
                  <div className="noticing-item">
                    <span className="n-dot" />
                    <span><strong>{p.noticingCuePrimary}</strong></span>
                  </div>
                  {p.noticingCues?.map((cue, j) => (
                    <div key={j} className="noticing-item">
                      <span className="n-dot" />
                      <span>{cue}</span>
                    </div>
                  ))}
                  {p.debriefPrompt && (
                    <div className="debrief-prompt">{p.debriefPrompt}</div>
                  )}
                </div>
              </div>

              <div
                className={`p-toggle-row ${p.feedsWeeklyFocus ? 'weekly-focus-item' : ''}`}
                onClick={() => togglePattern(p.id || i)}
              >
                <span className="p-toggle-label">
                  {p.feedsWeeklyFocus ? 'Feeds Weekly Focus · expand for full pattern' : 'Expand for full pattern'}
                </span>
                {p.feedsWeeklyFocus && <span className="wf-pin">Weekly Focus</span>}
                <span className="p-arrow">▼</span>
              </div>
            </div>
          );
        })}

        {/* Success Block */}
        {currentWeekData?.successMetric && (
          <div className="success-block">
            <span className="success-icon">✓</span>
            <div>
              <div className="success-label">This week looks like success when...</div>
              <div className="success-text">{currentWeekData.successMetric}</div>
            </div>
          </div>
        )}

        {/* Reflection Nudge */}
        {currentWeekData?.reflectionNudge && (
          <div className="reflection-nudge">{currentWeekData.reflectionNudge}</div>
        )}

        {/* Weekly Focus Callout */}
        <div className="wf-callout">
          <span>📌</span>
          <div className="wf-callout-text">
            <strong>Weekly Focus</strong> pulls your current patterns into a single view alongside coaching and mental performance work.
            <br />
            <a className="wf-link" href="/dashboard">View in This Week →</a>
          </div>
        </div>
      </div>
    );
  }

  function renderProtocolTab() {
    const exercises = exerciseProtocol.exercises || data.exercisePrescription?.exercises || [];
    const preRideRitual = exerciseProtocol.preRideRitual || exerciseProtocol.pre_ride_ritual || data.exercisePrescription?.warm_up_routine?.steps || [];

    return (
      <div className="tab-panel active phys-fade-up">
        {/* Cadence card */}
        <div className="cadence-card">
          <span>📋</span>
          <div className="cadence-text">
            <strong>Updated monthly.</strong> Your Exercise Protocol is stable for the full 30-day cycle. Body Awareness noticing cues in the other tab are designed to reinforce these exercises.
            {data.generatedAt && <em> Generated: {formatDate(data.generatedAt)}.</em>}
          </div>
        </div>

        {/* Section label */}
        <div className="section-label-row">
          <span className="section-pill pill-body">
            <span className="pill-dot dot-body" />
            Exercise Protocol
          </span>
          <span className="section-note">{exercises.length} exercises prescribed</span>
        </div>

        {/* Body Awareness Profile (collapsed) */}
        {bodyProfile.level && (
          <div className={`collapse-card ${profileOpen ? 'open' : ''}`}>
            <div className="collapse-card-header" onClick={() => setProfileOpen(!profileOpen)}>
              <span className="collapse-card-icon">🧠</span>
              <span className="collapse-card-title">Body Awareness Profile</span>
              <span className="collapse-card-sub">Level {bodyProfile.level}/10</span>
              <span className="collapse-card-arrow">▼</span>
            </div>
            <div className="collapse-card-body">
              {bodyProfile.blindSpots?.length > 0 && (
                <div className="profile-section">
                  <h5>Blind Spots</h5>
                  <ul>{bodyProfile.blindSpots.map((b, i) => <li key={i}>{b}</li>)}</ul>
                </div>
              )}
              {bodyProfile.strengths?.length > 0 && (
                <div className="profile-section">
                  <h5>Strengths</h5>
                  <ul>{bodyProfile.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Priority Hierarchy */}
        <div className="section-label-row" style={{ marginTop: 4 }}>
          <span className="section-pill pill-body">
            <span className="pill-dot dot-body" />
            Priority Hierarchy
          </span>
          <span className="section-note">Work upstream before downstream</span>
        </div>
        {(() => {
          const activeTier = exerciseProtocol.priorityTier || 'proprioceptive';
          const tiers = [
            { id: 'neurological', label: 'Neurological', sublabel: 'VOR / vision' },
            { id: 'proprioceptive', label: 'Proprioceptive', sublabel: 'Calibrate feel' },
            { id: 'structural', label: 'Structural', sublabel: 'Build capacity' },
            { id: 'tension', label: 'Tension', sublabel: 'Manage symptoms' },
          ];
          const activeIndex = tiers.findIndex(t => t.id === activeTier);
          return (
            <div className="tier-row">
              {tiers.map((t, i) => {
                const isActive = i === activeIndex;
                const isPending = i < activeIndex;
                const isFuture = i > activeIndex;
                return (
                  <React.Fragment key={t.id}>
                    {i > 0 && <div className="tier-sep">→</div>}
                    <div className={`tier-seg ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''} ${isFuture ? 'future' : ''}`}>
                      <div className="tier-number">{isActive ? 'Current' : isPending ? 'Unlock first' : 'Last'}</div>
                      <div className="tier-name">{t.label}</div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          );
        })()}

        {/* Exercises (all collapsed) */}
        {exercises.map((ex, i) => {
          const isOpen = openExercises.has(i);
          return (
            <div key={i} className={`collapse-card ${isOpen ? 'open' : ''}`}>
              <div className="collapse-card-header" onClick={() => toggleExercise(i)}>
                <span className="collapse-card-icon">💪</span>
                <span className="collapse-card-title">{ex.name}</span>
                <span className="collapse-card-sub">{ex.frequency || ex.duration || ''}</span>
                <span className="collapse-card-arrow">▼</span>
              </div>
              <div className="collapse-card-body">
                <p className="ex-target">Targets: {ex.target_pattern}</p>
                <p className="ex-desc">{ex.description}</p>
                <div className="ex-riding-connection">
                  <strong>Why this helps your riding:</strong> {ex.riding_connection}
                </div>
                {ex.coach_snippet && (
                  <div className="ex-coach-snippet">
                    <em>{ex.coach_snippet.voice}:</em> {ex.coach_snippet.note}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Pre-Ride Ritual (open by default) */}
        {preRideRitual.length > 0 && (
          <>
            <div className="section-label-row" style={{ marginTop: 20 }}>
              <span className="section-pill pill-gold">
                <span className="pill-dot dot-gold" />
                Pre-Ride Ritual
              </span>
            </div>
            <div className="pre-ride-checklist">
              {preRideRitual.map((step, i) => {
                const stepName = step.name || step.instruction || step;
                const stepDetail = typeof step === 'object' ? (step.instruction || step.purpose || '') : '';
                return (
                  <div key={i} className="pre-ride-item">
                    <div
                      className={`pre-ride-check ${preRideChecks[i] ? 'checked' : ''}`}
                      onClick={() => setPreRideChecks(prev => ({ ...prev, [i]: !prev[i] }))}
                    >
                      {preRideChecks[i] ? '✓' : ''}
                    </div>
                    <div className="pre-ride-text">
                      <strong>{typeof step === 'string' ? step : stepName}</strong>
                      {stepDetail && <span className="pre-ride-detail"> — {stepDetail}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Body Awareness Prompts — Trainer & PT Coordination (collapsed) */}
        <div className={`collapse-card ${promptsOpen ? 'open' : ''}`} style={{ marginTop: 16 }}>
          <div className="collapse-card-header" onClick={() => setPromptsOpen(!promptsOpen)}>
            <span className="collapse-card-icon">💬</span>
            <span className="collapse-card-title">Body Awareness Prompts — Trainer & PT Coordination</span>
            <span className="collapse-card-sub">Working with your support team</span>
            <span className="collapse-card-arrow">▼</span>
          </div>
          <div className="collapse-card-body">
            <div className="bap-body">
              {(data.exercisePrescription?.pt_integration_notes || data.patternAnalysisLegacy?.pt_integration_notes) && (
                <div className="bap-section">
                  <div className="bap-section-title">Working with your therapist and trainer</div>
                  <div className="bap-text">
                    {data.exercisePrescription?.pt_integration_notes || data.patternAnalysisLegacy?.pt_integration_notes}
                  </div>
                </div>
              )}
              {data.exercisePrescription?.body_awareness_cues?.length > 0 && (
                <div className="bap-section">
                  <div className="bap-section-title">In-ride body awareness cues</div>
                  {data.exercisePrescription.body_awareness_cues.map((cue, i) => (
                    <div key={i} className="bap-cue">
                      <strong>{cue.trigger}:</strong> {cue.cue}
                    </div>
                  ))}
                </div>
              )}
              <div className="bap-section">
                <div className="bap-section-title">Important notice</div>
                <div className="bap-text">
                  These exercises are general fitness suggestions for riders, not medical advice. If you have existing injuries, chronic conditions, or physical limitations, consult your physician or PT before beginning. Stop any exercise immediately if you experience pain.
                </div>
              </div>
            </div>
          </div>
        </div>
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
            <p>Early regeneration is available on the Top tier plan. Your current cycle runs until {cycleInfo?.expiresAt ? formatDate(cycleInfo.expiresAt) : 'the end of this month'}.</p>
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
            <p>This will start a new 30-day cycle and reset to Week 1.</p>
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
    <div className="phys-redesign">
      {renderHero()}
      {refreshing && (
        <div className="gpt-gen-refreshing-bar">
          <div className="spinner spinner--small" />
          <span>Regenerating your Physical Guidance — this takes about 2 minutes...</span>
        </div>
      )}
      {activeTab === 'awareness' && renderAwarenessTab()}
      {activeTab === 'protocol' && renderProtocolTab()}
      {renderRegenModal()}
    </div>
  );
}
