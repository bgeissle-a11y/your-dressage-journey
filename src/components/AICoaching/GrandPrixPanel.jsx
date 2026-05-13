import { useState, useEffect, useCallback, useRef } from 'react';
import { getGrandPrixThinking, advanceWeekPointer } from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';
import { getRiderProfile } from '../../services';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { readCycleState, readInflightLock } from '../../services/weeklyFocusService';
import { useEntitlements } from '../../hooks/useEntitlements';
import { CAPABILITIES } from '../../constants/entitlements';
import ErrorDisplay from './ErrorDisplay';
import ElapsedTimer from './ElapsedTimer';
import UpgradeNotice from './UpgradeNotice';
import BudgetExhaustionBanner from './BudgetExhaustionBanner';
import YDJLoading from '../YDJLoading';
import CadenceStrip from '../InfoTip/CadenceStrip';
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
  const ent = useEntitlements();
  const canGenerate = ent.can(CAPABILITIES.generateGrandPrixThinking);
  const canRegenerate = ent.can(CAPABILITIES.regenerateGrandPrixThinking);
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('mental');

  // Mental layer state
  const [mentalData, setMentalData] = useState(null);
  const [mentalLoading, setMentalLoading] = useState(false);
  const [mentalError, setMentalError] = useState(null);
  const [budgetExhausted, setBudgetExhausted] = useState(null);

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

  // Scroll to week section when navigated from Pre-Ride Ritual
  useEffect(() => {
    if (window.location.hash === '#gpt-this-week') {
      const timer = setTimeout(() => {
        const el = document.getElementById('gpt-this-week');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mentalData]);

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

  // Regenerating state — set when another tab/session is already generating
  // for this user. While true, we poll for fresh data via staleOk instead of
  // firing a second full-timeout pipeline call.
  const [mentalRegenerating, setMentalRegenerating] = useState(false);
  const [trajectoryRegenerating, setTrajectoryRegenerating] = useState(false);

  // Trajectory chunked-pipeline progress: 0=idle, 1=running step 1, 2=step 2, 3=step 3.
  // Drives the "Step N of 3..." progress text during a manual regen.
  const [trajectoryStep, setTrajectoryStep] = useState(0);

  // Rider display info
  const [riderInfo, setRiderInfo] = useState({ name: '', horse: '', level: '' });

  // Fetch rider display info for hero
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const result = await getRiderProfile(currentUser.uid);
        if (result.success && result.data) {
          const riderData = result.data;
          const displayName = riderData.firstName || riderData.name || currentUser.displayName || '';
          const horseName = riderData.primaryHorseName || '';
          const level = riderData.currentLevel || '';
          setRiderInfo({ name: displayName, horse: horseName, level });
        }
      } catch (err) {
        console.error('[GPT] Failed to load rider info:', err.message);
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
      } catch (err) {
        console.error('[GPT] Failed to load checkbox state:', err.message);
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

  // If a regeneration started in a previous tab or visit is still running
  // when we mount, surface the regenerating UI immediately so the user
  // doesn't see apparently-stale data while it finishes. The existing
  // polling effects will swap in fresh content as soon as the lock releases.
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const [mentalLock, trajectoryLock] = await Promise.all([
        readInflightLock(currentUser.uid, 'grandPrixThinking'),
        readInflightLock(currentUser.uid, 'grandPrixTrajectory'),
      ]);
      if (mentalLock) setMentalRegenerating(true);
      if (trajectoryLock) setTrajectoryRegenerating(true);
    })();
  }, [currentUser]);

  // Compute cycle display info.
  // Derive status='expired' from cycleStartDate once the 30-day mark has passed —
  // the backend computes expiry at request time but never persists it to the cycle doc,
  // so the "New cycle ready" banner relies on this client-side derivation.
  const cycleStartDateObj = cycleState?.cycleStartDate ? new Date(cycleState.cycleStartDate) : null;
  const cycleExpiresAtObj = cycleStartDateObj
    ? new Date(cycleStartDateObj.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const backendCycleStatus = cycleState?.status || 'active';
  const isCycleExpired = cycleExpiresAtObj
    && cycleExpiresAtObj < new Date()
    && (backendCycleStatus === 'active' || backendCycleStatus === 'truncated');

  const cycleInfo = cycleState ? {
    startDate: cycleStartDateObj,
    currentWeek: cycleState.currentWeek || 1,
    status: isCycleExpired ? 'expired' : backendCycleStatus,
    tier: cycleState.tier || 'standard',
    maxWeeks: cycleState.status === 'truncated' ? 2 : 4,
    expiresAt: cycleExpiresAtObj,
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
        } else if (result.regenerating) {
          // Another session is already generating for this user.
          // Don't fire another pipeline — poll for the fresh result instead.
          setMentalRegenerating(true);
          setMentalError(null);
        } else if (staleOk) {
          // No cache available — trigger full load with loading UI
          fetchMental({ forceRefresh: false });
          return;
        } else {
          setMentalError({ message: 'Failed to generate your Mental Performance output.' });
        }
        return;
      }

      setMentalData(result);
      setMentalStale(!!result.stale);
      if (result.cacheServed && result.capExceeded) {
        setBudgetExhausted({
          capExceeded: result.capExceeded,
          refreshEligibleAt: result.refreshEligibleAt,
          precis: result.precis,
        });
      } else {
        setBudgetExhausted(null);
      }

      // Update cycle state from response
      if (result.cycleState) {
        setCycleState(result.cycleState);
        setActiveWeek(result.cycleState.currentWeek || 1);
      }

      // Server reported another generation in flight — show the loading
      // horse and poll for fresh data rather than retrying.
      if (result.regenerating) {
        setMentalRegenerating(true);
      } else {
        setMentalRegenerating(false);
      }

      // If stale cache returned from fast path and server isn't already
      // regenerating, trigger a background refresh.
      if (result.stale && staleOk && !result.regenerating) {
        fetchMental({ forceRefresh: false });
      }
    } catch (err) {
      // On staleOk error (e.g. timeout), fall through to full load
      if (staleOk) {
        fetchMental({ forceRefresh: false });
        return;
      }
      console.error('Grand Prix Thinking mental error:', err);
      if (mentalData) {
        setMentalError({ message: 'Could not refresh. Showing previous results.' });
      } else {
        setMentalError({ message: typeof err.message === 'string' ? err.message : 'Something went wrong.' });
      }
    } finally {
      if (!staleOk) {
        setMentalLoading(false);
        setMentalRefreshing(false);
      }
    }
  }, [mentalData]);

  // Fetch trajectory layer.
  //
  // Reads use the legacy single-call path with staleOk:true (cache-only,
  // returns the final assembled trajectory).
  //
  // Regenerations go through the 3-step chunked pipeline: each step is a
  // separate Cloud Function call so individual Claude calls fit under the
  // 540s timeout and the rider can navigate away mid-pipeline without
  // losing partial progress (intermediate caches let step 2/3 resume).
  const fetchTrajectory = useCallback(async ({ forceRefresh = false, staleOk = false } = {}) => {
    // ── Cache-only read path (mount, tab switch, post-regen verification) ──
    if (!forceRefresh) {
      if (!staleOk) {
        setTrajectoryLoading(true);
        setTrajectoryError(null);
      }

      try {
        const result = await getGrandPrixThinking({ forceRefresh: false, staleOk, layer: 'trajectory' });

        if (!result.success) {
          if (result.error === 'insufficient_data') return;
          if (result.regenerating) {
            setTrajectoryRegenerating(true);
            setTrajectoryError(null);
            return;
          }
          if (staleOk) {
            // No cache — try non-stale read (may also miss; that's fine —
            // the empty state UI will offer a regen)
            fetchTrajectory({ forceRefresh: false });
            return;
          }
          setTrajectoryError({ message: 'Failed to load Training Trajectory.' });
          return;
        }

        setTrajectoryData(result);
        setTrajectoryStale(!!result.stale);
        if (result.activePath) setOpenTrajCard(result.activePath);

        if (result.regenerating) setTrajectoryRegenerating(true);
        else setTrajectoryRegenerating(false);
      } catch (err) {
        if (staleOk) {
          fetchTrajectory({ forceRefresh: false });
          return;
        }
        console.error('Grand Prix Thinking trajectory error:', err);
        setTrajectoryError({ message: typeof err.message === 'string' ? err.message : 'Something went wrong.' });
      } finally {
        if (!staleOk) setTrajectoryLoading(false);
      }
      return;
    }

    // ── Chunked regen path: step 1 → 2 → 3 ──
    setTrajectoryError(null);
    setTrajectoryRegenerating(true);
    try {
      // Step 1: Current State Analysis (Opus, ~2-3 min)
      setTrajectoryStep(1);
      const step1 = await getGrandPrixThinking({
        layer: 'trajectory',
        step: 1,
      });
      if (!step1?.success) {
        throw new Error('Trajectory step 1 failed');
      }

      // Step 2: Trajectory Paths (Opus) + Movement Maps (Sonnet) in parallel (~3-4 min)
      setTrajectoryStep(2);
      const step2 = await getGrandPrixThinking({
        layer: 'trajectory',
        step: 2,
        priorResults: { currentStateAnalysis: step1.currentStateAnalysis },
      });
      if (!step2?.success) {
        throw new Error('Trajectory step 2 failed');
      }

      // Step 3: Path Narratives (Sonnet) + assemble + cache final (~1-2 min)
      setTrajectoryStep(3);
      const step3 = await getGrandPrixThinking({
        layer: 'trajectory',
        step: 3,
        priorResults: {
          currentStateAnalysis: step1.currentStateAnalysis,
          trajectoryPaths: step2.trajectoryPaths,
          movementMaps: step2.movementMaps,
          movementMapsError: step2.movementMapsError,
        },
      });
      if (!step3?.success) {
        throw new Error('Trajectory step 3 failed');
      }

      // step3 is the full assembled trajectory result
      setTrajectoryData(step3);
      setTrajectoryStale(false);
      if (step3.activePath) setOpenTrajCard(step3.activePath);
    } catch (err) {
      console.error('Grand Prix Thinking trajectory regen error:', err);
      setTrajectoryError({
        message: typeof err.message === 'string'
          ? err.message
          : 'Trajectory regeneration failed. Please try again.',
      });
    } finally {
      setTrajectoryStep(0);
      setTrajectoryRegenerating(false);
    }
  }, []);

  // Initial load — staleOk fast path handles its own follow-up via self-healing
  useEffect(() => {
    fetchMental({ staleOk: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy-load trajectory on first tab switch
  useEffect(() => {
    if (activeTab === 'trajectory' && !trajectoryLoaded.current) {
      trajectoryLoaded.current = true;
      fetchTrajectory({ staleOk: true });
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

  // Poll for fresh data while another session is regenerating.
  // Checks every 15s via staleOk (cache-only, no Claude calls), gives up
  // after 9 minutes — matches the function's 540s timeout. The mental layer
  // generates a 4-week program and can take 3-5 min for top-tier riders;
  // 3 min was timing the polling out before legitimate regens completed.
  useEffect(() => {
    if (!mentalRegenerating) return;
    const startedAt = Date.now();
    const MAX_MS = 9 * 60 * 1000;
    const timer = setInterval(async () => {
      if (Date.now() - startedAt > MAX_MS) {
        setMentalRegenerating(false);
        clearInterval(timer);
        return;
      }
      try {
        const result = await getGrandPrixThinking({ staleOk: true, layer: 'mental' });
        if (result?.success && !result.regenerating && !result.stale) {
          setMentalData(result);
          setMentalStale(false);
          if (result.cycleState) {
            setCycleState(result.cycleState);
            setActiveWeek(result.cycleState.currentWeek || 1);
          }
          setMentalRegenerating(false);
          clearInterval(timer);
        }
      } catch {
        // Ignore transient poll failures; keep trying until MAX_MS.
      }
    }, 15_000);
    return () => clearInterval(timer);
  }, [mentalRegenerating]);

  useEffect(() => {
    if (!trajectoryRegenerating) return;
    const startedAt = Date.now();
    const MAX_MS = 9 * 60 * 1000;
    const timer = setInterval(async () => {
      if (Date.now() - startedAt > MAX_MS) {
        setTrajectoryRegenerating(false);
        clearInterval(timer);
        return;
      }
      try {
        const result = await getGrandPrixThinking({ staleOk: true, layer: 'trajectory' });
        if (result?.success && !result.regenerating && !result.stale) {
          setTrajectoryData(result);
          setTrajectoryStale(false);
          if (result.activePath) setOpenTrajCard(result.activePath);
          setTrajectoryRegenerating(false);
          clearInterval(timer);
        }
      } catch {
        // Ignore transient poll failures; keep trying until MAX_MS.
      }
    }, 15_000);
    return () => clearInterval(timer);
  }, [trajectoryRegenerating]);

  // Handle regenerate — direct call, visible loading state.
  // Sets mentalRegenerating so the polling effect picks up the cache write
  // even if the user navigates away and comes back before the call returns.
  const handleRegenerate = async () => {
    setShowRegenModal(null);
    setMentalRefreshing(true);
    setMentalRegenerating(true);
    try {
      const result = await getGrandPrixThinking({ forceRefresh: true, layer: 'mental' });
      if (result.success) {
        setMentalData(result);
        setMentalStale(false);
        if (result.cycleState) {
          setCycleState(result.cycleState);
          setActiveWeek(result.cycleState.currentWeek || 1);
        }
        setMentalRegenerating(false);
      }
    } catch (err) {
      console.error('[GPT] Regenerate error:', err);
      setMentalError({ message: 'Regeneration failed. Please try again.' });
      setMentalRegenerating(false);
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
      } catch (err) {
        console.error('[GPT] Failed to save checkbox state:', err.message);
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

    // Expired state — surface the confirm-refresh modal first so the rider
    // sees the time estimate and "navigate away" guidance before kicking off
    // a 3-5 minute Claude call.
    if (cycleInfo.status === 'expired') {
      return (
        <div
          className="cycle-bar cycle-bar--expired"
          onClick={() => setShowRegenModal('confirm-refresh')}
          role="button"
          tabIndex={0}
        >
          <span className="cycle-expired-text">
            Ready to refresh? Tap here to generate your next 4-week program.
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
        <button
          className="cycle-regen"
          onClick={() => setShowRegenModal('confirm-refresh')}
          disabled={mentalRefreshing || !canRegenerate}
          aria-label={!canRegenerate ? `Regenerate early — requires the ${ent.requiredTierLabel(CAPABILITIES.regenerateGrandPrixThinking) || 'Extended'} plan` : undefined}
        >
          {mentalRefreshing ? '⏳ Regenerating...' : '↺ Regenerate early'}
          {!canRegenerate && (
            <span className="locked-tag">{ent.requiredTierLabel(CAPABILITIES.regenerateGrandPrixThinking) || 'Extended'}+</span>
          )}
        </button>
      </div>
    );
  }

  function renderHero() {
    const heroSub = [riderInfo.name, riderInfo.horse, riderInfo.level]
      .filter(Boolean).join(' · ');

    return (
      <div className="gpt-hero">
        <div className="hero-eyebrow">Grand Prix Thinking</div>
        <div className="hero-title">The mental game behind the movement</div>
        <div className="hero-sub">
          {mentalData?.generatedAt && <>Generated {formatDate(mentalData.generatedAt)}</>}
          {mentalData?.selectedPath?.title && <> · Path selected: <strong>{mentalData.selectedPath.title}</strong></>}
          {' · '}{cycleInfo?.maxWeeks || 4}-week program active
        </div>
        {renderCycleBar()}
        <div className="tab-row">
          <button
            className={`tab-chip ${activeTab === 'mental' ? 'active' : ''}`}
            onClick={() => setActiveTab('mental')}
          >
            Mental Performance
            <span className="chip-badge">4-Week Program</span>
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
      <div className="week-nav-row" id="gpt-this-week">
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
    if (mentalRegenerating && !mentalData?.selectedPath) {
      return (
        <div className="gpt-loading">
          <YDJLoading message="Your program is being prepared" />
          <p style={{ textAlign: 'center', color: '#8B7355', marginTop: 12, maxWidth: 420, padding: '0 16px' }}>
            Another session is already generating your Mental Performance program.
            This usually takes about 2 minutes — come back soon and it will be ready for you.
          </p>
        </div>
      );
    }

    if (mentalLoading && !mentalData) {
      return (
        <div className="gpt-loading">
          <YDJLoading message="Designing your mental game" />
          {loadStartedAt && <ElapsedTimer startedAt={loadStartedAt} />}
        </div>
      );
    }

    if (mentalError) {
      return <ErrorDisplay message={mentalError?.message} onRetry={() => fetchMental({ forceRefresh: true })} />;
    }

    if (!mentalData?.selectedPath) {
      return (
        <div className="tab-panel active gpt-fade-up">
          <div className="gpt-insufficient">
            <h3>Generating your program...</h3>
            <p>Your Mental Performance program is being prepared. Please check back in a few minutes.</p>
          </div>
        </div>
      );
    }

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
            <YDJLoading size="sm" message="Updating your mental program" />
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

  // Map step number → label for the chunked-pipeline progress text.
  const trajectoryStepLabel = (() => {
    if (trajectoryStep === 1) return 'Step 1 of 3 · Analyzing your current state';
    if (trajectoryStep === 2) return 'Step 2 of 3 · Mapping the three trajectory paths';
    if (trajectoryStep === 3) return 'Step 3 of 3 · Writing your path narratives';
    return null;
  })();

  function renderTrajectoryTab() {
    if (trajectoryRegenerating && !trajectoryData) {
      return (
        <div className="gpt-loading">
          <YDJLoading message={trajectoryStepLabel || 'Your trajectory is being prepared'} />
          <p style={{ textAlign: 'center', color: '#8B7355', marginTop: 12, maxWidth: 460, padding: '0 16px' }}>
            {trajectoryStep > 0
              ? "Each step takes 2-4 minutes. You can leave this page — we'll keep working in the background and the page will update when you come back."
              : 'Your Training Trajectory is generating in another session. This usually takes 6-9 minutes — come back soon and it will be ready for you.'}
          </p>
        </div>
      );
    }

    if (trajectoryLoading && !trajectoryData) {
      return (
        <div className="gpt-loading">
          <YDJLoading message="Charting your training trajectory" />
        </div>
      );
    }

    if (trajectoryError) {
      return <ErrorDisplay message={trajectoryError?.message} onRetry={() => fetchTrajectory({ forceRefresh: true })} />;
    }

    if (!trajectoryData) {
      return (
        <div className="tab-panel active gpt-fade-up">
          <div className="gpt-insufficient">
            <h3>Generating your trajectories...</h3>
            <p>Your Training Trajectory is being prepared. Please check back in a few minutes.</p>
          </div>
        </div>
      );
    }

    const paths = trajectoryData.trajectoryPaths?.paths || [];
    const narratives = trajectoryData.pathNarratives?.path_narratives || [];
    const activePath = trajectoryData.activePath;

    const TRAJ_CARDS = [
      { id: 'ambitious_competitor', name: 'Ambitious Competitor', icon: '🏆', iconClass: 'gpt-icon-gold', subtitle: "Goal-driven. PSG debut with a score you're proud of." },
      { id: 'steady_builder', name: 'Steady Builder', icon: '🧱', iconClass: 'gpt-icon-sky', subtitle: 'Mastery-first. No rush, no gaps in the foundation.' },
      { id: 'curious_explorer', name: 'Curious Explorer', icon: '🌿', iconClass: 'gpt-icon-forest', subtitle: 'Joy-centered. Breadth over timeline. Partnership first.' },
    ];

    // Separate active from alternatives
    const activeCard = TRAJ_CARDS.find(c => c.id === activePath);
    const altCards = TRAJ_CARDS.filter(c => c.id !== activePath);

    const findPathData = (cardId, cardName) => paths.find(p =>
      p.name?.toLowerCase().replace(/\s+/g, '_') === cardId || p.name === cardName
    );
    const findNarrative = (cardId, cardName) => narratives.find(n =>
      n.path_name?.toLowerCase().replace(/\s+/g, '_') === cardId || n.path_name === cardName
    );

    return (
      <div className="tab-panel active gpt-fade-up">
        {/* Section label */}
        <div className="section-label-row">
          <span className="section-pill pill-gold">
            <span className="pill-dot dot-gold" />
            Training Trajectory
          </span>
          <span className="section-note">Monthly · 3 paths · Choose your direction</span>
        </div>

        {/* Cadence card */}
        <div className="cadence-card">
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🗓</span>
          <div>
            <div className="cadence-text">
              <strong>Training Trajectory looks further out than weekly mental performance work.</strong> It updates when your data changes significantly, you add a new horse, reach a major milestone, or 30 days have passed. The active path informs which mental performance path is selected above.
              {trajectoryData.generatedAt && <em> Last generated: {formatDate(trajectoryData.generatedAt)}.</em>}
            </div>
            <button className="regen-btn-sm" onClick={() => fetchTrajectory({ forceRefresh: true })}>
              ↺ Refresh trajectory
            </button>
          </div>
        </div>

        {trajectoryStale && (
          <div className="gpt-stale-banner" onClick={() => fetchTrajectory({ forceRefresh: true })}>
            Updated trajectory available — tap to refresh
          </div>
        )}

        {/* Active Path section */}
        <div className="section-label-row">
          <span className="section-pill pill-mental">
            <span className="pill-dot dot-mental" />
            Active Path
          </span>
          <span className="section-note">Informing Mental Performance this cycle</span>
        </div>

        {activeCard && (() => {
          const pathData = findPathData(activeCard.id, activeCard.name);
          const narrative = findNarrative(activeCard.id, activeCard.name);
          const isOpen = openTrajCard === activeCard.id;

          return (
            <div className={`traj-card active-path ${isOpen ? 'open' : ''}`}>
              <div className="traj-header" onClick={() => toggleTrajCard(activeCard.id)}>
                <div className={`traj-icon ${activeCard.iconClass}`}>{activeCard.icon}</div>
                <div className="traj-header-text">
                  <div className="traj-title">{pathData?.name || activeCard.name}</div>
                  <div className="traj-subtitle">{pathData?.subtitle || activeCard.subtitle}</div>
                </div>
                <span className="traj-badge badge-active">Active Path</span>
                <span className="traj-arrow">▾</span>
              </div>

              {isOpen && (
                <div className="traj-body">
                  {/* Why this trajectory */}
                  {pathData?.philosophy && (
                    <>
                      <div className="traj-section-label">Why this trajectory</div>
                      <div className="traj-why-text">{pathData.philosophy}</div>
                    </>
                  )}

                  {/* Where you are now */}
                  {pathData?.year1?.training_emphasis && (
                    <>
                      <div className="traj-section-label">Where you are now</div>
                      <div className="traj-why-text">{pathData.year1.training_emphasis}</div>
                    </>
                  )}

                  {/* Milestones */}
                  {pathData?.year1?.milestones?.length > 0 && (
                    <>
                      <div className="traj-section-label">3-month milestones</div>
                      <div className="milestones-block">
                        {pathData.year1.milestones.map((m, i) => (
                          <div key={i} className="milestone-item">
                            <div className={`m-dot ${i === 0 ? 'done' : i === 1 ? 'current' : ''}`} />
                            <span>{m}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Trajectory projection / position */}
                  {narrative?.narrative && (
                    <div className="traj-position-block">
                      <div className="traj-position-label">Current position in trajectory</div>
                      <div className="traj-position-text">{narrative.narrative}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Other Paths Available */}
        {altCards.length > 0 && (
          <>
            <div className="section-label-row" style={{ marginTop: 8 }}>
              <span className="section-pill pill-body">
                <span className="pill-dot dot-body" />
                Other Paths Available
              </span>
              <span className="section-note">Tap to explore</span>
            </div>

            {altCards.map(card => {
              const pathData = findPathData(card.id, card.name);
              const narrative = findNarrative(card.id, card.name);
              const isOpen = openTrajCard === card.id;

              return (
                <div key={card.id} className={`traj-card ${isOpen ? 'open' : ''}`}>
                  <div className="traj-header" onClick={() => toggleTrajCard(card.id)}>
                    <div className={`traj-icon ${card.iconClass}`}>{card.icon}</div>
                    <div className="traj-header-text">
                      <div className="traj-title">{pathData?.name || card.name}</div>
                      <div className="traj-subtitle">{pathData?.subtitle || card.subtitle}</div>
                    </div>
                    <span className="traj-badge badge-alt">Alternative</span>
                    <span className="traj-arrow">▾</span>
                  </div>

                  {isOpen && (
                    <div className="traj-body">
                      {pathData?.philosophy && (
                        <div className="traj-why-text">{pathData.philosophy}</div>
                      )}
                      {narrative?.narrative && (
                        <div className="traj-position-block">
                          <div className="traj-position-label">Why not selected this cycle</div>
                          <div className="traj-position-text">{narrative.narrative}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
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

    if (showRegenModal === 'confirm-refresh') {
      return (
        <div className="gpt-modal-overlay" onClick={() => setShowRegenModal(null)}>
          <div className="gpt-modal" onClick={e => e.stopPropagation()}>
            <h3>Ready to refresh?</h3>
            <p>
              Regenerating your Grand Prix Thinking program takes about <strong>3–5 minutes</strong>. We analyze your latest rides,
              reflections, and lessons to produce a fresh 4-week mental program.
            </p>
            <p>
              You can leave this page and come back later — we'll keep working in the background and your home page will update automatically when it's ready.
            </p>
            <div className="gpt-modal-actions">
              <button className="gpt-modal-btn gpt-modal-btn--secondary" onClick={() => setShowRegenModal(null)}>Not now</button>
              <button className="gpt-modal-btn" onClick={handleRegenerate}>Start refresh</button>
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
      {!canGenerate && !ent.loading && (
        <UpgradeNotice
          capability={CAPABILITIES.generateGrandPrixThinking}
          requiredTierLabel={ent.requiredTierLabel(CAPABILITIES.generateGrandPrixThinking)}
          status={ent.status}
        />
      )}
      {budgetExhausted && activeTab === 'mental' && (
        <BudgetExhaustionBanner
          capExceeded={budgetExhausted.capExceeded}
          refreshEligibleAt={budgetExhausted.refreshEligibleAt}
          precis={budgetExhausted.precis}
        />
      )}
      <CadenceStrip
        outputSlug="grand-prix"
        lastRefreshedAt={mentalData?.generatedAt}
        nextRefreshAt={cycleInfo?.expiresAt}
      />
      {mentalRefreshing && (
        <div className="gpt-gen-refreshing-bar">
          <div className="spinner spinner--small" />
          <span>Regenerating your Mental Performance program — this takes about 2 minutes...</span>
        </div>
      )}
      {(mentalRegenerating && mentalData?.selectedPath) && (
        <div className="gpt-gen-refreshing-bar">
          <div className="spinner spinner--small" />
          <span>A fresh version is being prepared in another session — come back soon for the update.</span>
        </div>
      )}
      {(trajectoryRegenerating && trajectoryData) && (
        <div className="gpt-gen-refreshing-bar">
          <div className="spinner spinner--small" />
          <span>
            {trajectoryStepLabel
              ? `${trajectoryStepLabel} — feel free to navigate away.`
              : 'Your trajectory is refreshing in another session — come back soon.'}
          </span>
        </div>
      )}
      {activeTab === 'mental' && renderMentalTab()}
      {activeTab === 'trajectory' && renderTrajectoryTab()}
      {renderRegenModal()}
    </div>
  );
}
