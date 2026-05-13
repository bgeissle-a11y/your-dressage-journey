import { useState, useEffect, useCallback, useRef } from 'react';
import { getMultiVoiceCoaching, getQuickInsights, VOICE_META } from '../../services/aiService';
import { readInflightLock } from '../../services/weeklyFocusService';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useEntitlements } from '../../hooks/useEntitlements';
import { CAPABILITIES } from '../../constants/entitlements';
import { getInitialActiveVoiceIndex } from '../../utils/voicePreferences';
import CollapsibleSection from './CollapsibleSection';
import CoachingVoiceCard from './CoachingVoiceCard';
import ErrorDisplay from './ErrorDisplay';
import ElapsedTimer from './ElapsedTimer';
import OrientingQuestion from './OrientingQuestion';
import PriorityCloser from './PriorityCloser';
import UpgradeNotice from './UpgradeNotice';
import BudgetExhaustionBanner from './BudgetExhaustionBanner';
import YDJLoading from '../YDJLoading';
import CadenceStrip from '../InfoTip/CadenceStrip';

/**
 * Extract error category and retryable flag from a Firebase HttpsError.
 * The backend passes these via error.details (HttpsError 3rd parameter).
 */
function parseErrorDetails(err) {
  const details = err?.details || err?.customData || {};
  const rawMessage = err?.message;
  return {
    category: details.category || 'unknown',
    retryable: details.retryable !== false,
    message: (typeof rawMessage === 'string' ? rawMessage : null) || 'An error occurred while generating coaching insights.',
  };
}

/**
 * Container for Quick Insights summary + tabbed coaching voices.
 *
 * Uses progressive rendering: fires 5 individual calls (4 voices + quick insights)
 * in parallel. Each voice renders as soon as its call returns, so the user sees
 * content streaming in rather than waiting for all voices to complete.
 */
export default function MultiVoicePanel({ generationStatus }) {
  const { currentUser } = useAuth();
  const { preferences, loaded: settingsLoaded } = useSettings();
  const ent = useEntitlements();
  const canGenerate = ent.can(CAPABILITIES.generateCoaching);
  const [voices, setVoices] = useState({});
  const [quickInsights, setQuickInsights] = useState(null);
  const [activeVoice, setActiveVoice] = useState(() => getInitialActiveVoiceIndex(preferences));
  // Settings load async — seed the initial active voice once they're available.
  // After this one-shot seed, the rider's tab clicks fully control activeVoice.
  const seededActiveVoiceRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [insufficientData, setInsufficientData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loadStartedAt, setLoadStartedAt] = useState(null);
  const [isStale, setIsStale] = useState(false);
  // Phase 4: graceful exhaustion. When the backend returns cacheServed:true
  // we render a banner with the next refresh date and the cached précis.
  const [budgetExhausted, setBudgetExhausted] = useState(null);

  const hasRealVoiceData = Object.values(voices).some(
    (v) => v && !v._loading && !v._error
  );

  // Ref mirror of voices so fetchCoaching can read the latest value without
  // taking a dependency on it. fetchCoaching mutates voices via setVoices,
  // which would otherwise recreate the callback and re-fire the mount effect —
  // causing a 5-call API fan-out on every state update.
  const voicesRef = useRef(voices);
  voicesRef.current = voices;

  const fetchCoaching = useCallback(async (forceRefresh = false) => {
    const hasRealVoiceDataNow = Object.values(voicesRef.current).some(
      (v) => v && !v._loading && !v._error
    );

    // Stale-while-revalidate: keep existing data visible during refresh
    if (forceRefresh && hasRealVoiceDataNow) {
      setRefreshing(true);
    } else {
      // Pre-set all voices to loading state for progressive tab rendering
      setVoices({
        0: { _loading: true },
        1: { _loading: true },
        2: { _loading: true },
        3: { _loading: true },
      });
      setLoading(true);
      setLoadStartedAt(Date.now());
    }
    setError(null);
    setInsufficientData(null);

    // Quick insights call (independent)
    const quickInsightsPromise = getQuickInsights({ forceRefresh })
      .then((result) => {
        if (!result.success) {
          if (result.error === 'insufficient_data') {
            setInsufficientData(result);
          }
          return;
        }
        if (result.cacheServed && result.capExceeded) {
          setBudgetExhausted({
            capExceeded: result.capExceeded,
            refreshEligibleAt: result.refreshEligibleAt,
            precis: result.precis,
          });
        }
        setQuickInsights(result.quickInsights || null);
        setMeta((prev) => ({
          ...prev,
          tier: result.tier,
          dataTier: result.dataTier,
          dataSnapshot: result.dataSnapshot,
          generatedAt: result.generatedAt,
        }));
      })
      .catch((err) => {
        console.error('Quick insights error:', err);
        const parsed = parseErrorDetails(err);
        if (parsed.category === 'rate_limited') {
          setError(parsed);
        }
      });

    // Individual voice calls — each renders as soon as it resolves
    let anyStale = false;
    const voicePromises = [0, 1, 2, 3].map((idx) =>
      getMultiVoiceCoaching({ voiceIndex: idx, forceRefresh })
        .then((result) => {
          if (!result.success) {
            if (result.error === 'insufficient_data') {
              setInsufficientData(result);
            }
            return;
          }
          if (result.cacheServed && result.capExceeded) {
            setBudgetExhausted({
              capExceeded: result.capExceeded,
              refreshEligibleAt: result.refreshEligibleAt,
              precis: result.precis,
            });
          }
          if (result.voices?.[idx]) {
            const voice = result.voices[idx];
            // Detect stale data from backend
            if (voice._meta?.stale) anyStale = true;
            setVoices((prev) => ({ ...prev, [idx]: voice }));
          }
        })
        .catch((err) => {
          console.error(`Voice ${idx} error:`, err);
          const parsed = parseErrorDetails(err);
          if (parsed.category === 'rate_limited') {
            setError(parsed);
          }
          setVoices((prev) => {
            // Preserve cached content if already displayed (stale-while-revalidate).
            // Only replace with an error card if the voice had no real content.
            const existing = prev[idx];
            if (existing && !existing._loading && !existing._error) {
              return prev;
            }
            return {
              ...prev,
              [idx]: {
                _error: true,
                _errorMessage: parsed.message || 'This coaching voice encountered a temporary issue.',
              },
            };
          });
        })
    );

    await Promise.allSettled([quickInsightsPromise, ...voicePromises]);
    setIsStale(anyStale);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchCoaching();
    // fetchCoaching is intentionally stable (empty deps) so this runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!settingsLoaded || seededActiveVoiceRef.current) return;
    setActiveVoice(getInitialActiveVoiceIndex(preferences));
    seededActiveVoiceRef.current = true;
  }, [settingsLoaded, preferences]);

  // If a regeneration started in a previous tab or visit is still running
  // when we mount, surface the regenerating UI immediately. The polling
  // effect below swaps in fresh content when the lock releases.
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const lock = await readInflightLock(currentUser.uid, 'coaching');
      if (lock) setRegenerating(true);
    })();
  }, [currentUser]);

  // Poll the lock doc directly while another session is regenerating;
  // a backend probe would risk triggering a parallel fan-out, while a
  // lock read is a single cheap Firestore get. When the lock disappears
  // (the upstream regen finished), do a one-shot fetchCoaching to swap
  // in the fresh content. Gives up after 4 minutes.
  useEffect(() => {
    if (!regenerating || !currentUser) return;
    const startedAt = Date.now();
    const MAX_MS = 4 * 60 * 1000;
    const timer = setInterval(async () => {
      if (Date.now() - startedAt > MAX_MS) {
        setRegenerating(false);
        clearInterval(timer);
        return;
      }
      try {
        const lock = await readInflightLock(currentUser.uid, 'coaching');
        if (!lock) {
          fetchCoaching();
          setRegenerating(false);
          clearInterval(timer);
        }
      } catch {
        // Ignore transient poll failures; keep trying until MAX_MS.
      }
    }, 15_000);
    return () => clearInterval(timer);
  }, [regenerating, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh when stale data is detected on initial load.
  // Guard with !error so a rate-limited refresh doesn't loop.
  useEffect(() => {
    if (isStale && hasRealVoiceData && !refreshing && !loading && !error) {
      fetchCoaching(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStale]);

  // Auto-refresh when background generation completes
  useEffect(() => {
    if (generationStatus?.justCompleted && hasRealVoiceData) {
      fetchCoaching();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationStatus?.justCompleted]);

  /**
   * Retry a single failed voice by calling the backend with voiceIndex.
   */
  const retryVoice = useCallback(async (voiceIndex) => {
    try {
      setVoices((prev) => ({
        ...prev,
        [voiceIndex]: { _loading: true },
      }));

      const result = await getMultiVoiceCoaching({ voiceIndex, forceRefresh: true });
      if (result.success && result.voices?.[voiceIndex]) {
        setVoices((prev) => ({
          ...prev,
          [voiceIndex]: result.voices[voiceIndex],
        }));
      }
    } catch (err) {
      console.error(`Retry voice ${voiceIndex} failed:`, err);
      setVoices((prev) => ({
        ...prev,
        [voiceIndex]: {
          _error: true,
          _errorMessage: 'Retry failed. Please try again.',
        },
      }));
    }
  }, []);

  // Insufficient data state
  if (insufficientData) {
    return (
      <div className="panel-insufficient">
        <div className="panel-insufficient__icon">
          <span role="img" aria-label="seedling">&#x1F331;</span>
        </div>
        <h3>Building Your Coaching Foundation</h3>
        <p>{insufficientData.message}</p>
        <div className="panel-insufficient__checklist">
          <p>To unlock AI coaching insights, you need:</p>
          <ul>
            <li>A completed rider profile</li>
            <li>At least one horse profile</li>
            <li>At least 3 post-ride debriefs</li>
          </ul>
        </div>
      </div>
    );
  }

  const hasVoiceEntries = Object.keys(voices).length > 0;

  return (
    <div className="multi-voice-panel">
      <div className="multi-voice-panel__header">
        <div>
          <h2>Your Coaching Team</h2>
          <p>Four expert perspectives on your riding journey</p>
        </div>
        <div className="multi-voice-panel__actions">
          {meta?.generatedAt && (
            <span className={`panel-timestamp${isStale ? ' panel-timestamp--stale' : ''}`}>
              {(isStale && refreshing) || regenerating ? 'Updating... \u00b7 ' : ''}
              {isStale && !refreshing && !regenerating ? 'Updated ' : ''}
              {new Date(meta.generatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })}
            </span>
          )}
          <button
            className="btn-refresh"
            onClick={() => fetchCoaching(true)}
            disabled={loading || refreshing || regenerating || !canGenerate}
            aria-label={!canGenerate ? `Generate Fresh Insights — requires the ${ent.requiredTierLabel(CAPABILITIES.generateCoaching) || 'paid'} plan` : undefined}
          >
            {loading || refreshing || regenerating ? 'Generating...' : 'Generate Fresh Insights'}
            {!canGenerate && (
              <span className="locked-tag">{ent.requiredTierLabel(CAPABILITIES.generateCoaching) || 'Paid'}+</span>
            )}
          </button>
        </div>
      </div>

      {!canGenerate && !ent.loading && (
        <UpgradeNotice
          capability={CAPABILITIES.generateCoaching}
          requiredTierLabel={ent.requiredTierLabel(CAPABILITIES.generateCoaching)}
          status={ent.status}
        />
      )}

      {budgetExhausted && (
        <BudgetExhaustionBanner
          capExceeded={budgetExhausted.capExceeded}
          refreshEligibleAt={budgetExhausted.refreshEligibleAt}
          precis={budgetExhausted.precis}
        />
      )}

      <CadenceStrip outputSlug="multi-voice" lastRefreshedAt={meta?.generatedAt} />

      {/* Refreshing banner (stale-while-revalidate) */}
      {(refreshing || regenerating) && (
        <div className="panel-refreshing">
          <YDJLoading size="sm" message="Consulting the coaching team" />
        </div>
      )}

      {/* Error display */}
      {error && !refreshing && !regenerating && (
        <ErrorDisplay
          message={error.message}
          category={error.category}
          retryable={error.retryable !== false}
          onRetry={() => fetchCoaching(true)}
          retrying={loading}
        />
      )}

      {/* Quick Insights Summary */}
      {quickInsights && (
        <div className="quick-insights">
          <h2>Quick Insights</h2>

          {/* Top 3 Patterns — collapsible, default open */}
          {quickInsights.top_patterns && quickInsights.top_patterns.length > 0 && (
            <div className="quick-insights__patterns">
              <CollapsibleSection title="Top 3 Patterns This Week" defaultOpen>
                <ul>
                  {quickInsights.top_patterns.map((pattern, i) => (
                    <li key={i}>{pattern}</li>
                  ))}
                </ul>
              </CollapsibleSection>
            </div>
          )}

          {/* Priority — always visible */}
          {quickInsights.priority_this_week && (
            <div className="quick-insights__priority">
              <h3>Your Priority This Week</h3>
              <p>{quickInsights.priority_this_week}</p>
            </div>
          )}

          {/* Celebration — collapsible, default closed */}
          {quickInsights.celebration && (
            <div className="quick-insights__celebration">
              <CollapsibleSection title="This Week's Celebration" icon="&#x1F31F;">
                <p>{quickInsights.celebration}</p>
              </CollapsibleSection>
            </div>
          )}
        </div>
      )}

      {/* Orienting Question — between Quick Insights and voices */}
      {quickInsights && hasVoiceEntries && <OrientingQuestion />}

      {/* Tabbed Coaching Voices — appears immediately with per-voice loading */}
      {hasVoiceEntries && (
        <div className="coaching-voice-tabs">
          <div className="coaching-voice-tabs__header">
            <h2>Coaching Perspectives</h2>
          </div>

          {/* Tab Navigation */}
          <div className="coaching-voice-tabs__nav">
            {VOICE_META.map((vm) => (
              <button
                key={vm.index}
                className={`coaching-voice-tab ${activeVoice === vm.index ? 'coaching-voice-tab--active' : ''}${voices[vm.index]?._error ? ' coaching-voice-tab--error' : ''}`}
                onClick={() => setActiveVoice(vm.index)}
              >
                <span className="coaching-voice-tab__icon">{vm.icon}</span>
                <span className="coaching-voice-tab__label">{vm.name.replace('The ', '')}</span>
              </button>
            ))}
          </div>

          {/* Active Voice Content */}
          <div className="coaching-voice-content">
            {voices[activeVoice]?._error ? (
              <ErrorDisplay
                message={voices[activeVoice]._errorMessage || 'This coaching voice encountered an issue.'}
                category="transient"
                retryable
                onRetry={() => retryVoice(activeVoice)}
                compact
              />
            ) : voices[activeVoice]?._loading ? (
              <CoachingVoiceCard
                voiceMeta={VOICE_META[activeVoice]}
                content={null}
                loading
                error={null}
                asTab
              />
            ) : voices[activeVoice] ? (
              <CoachingVoiceCard
                voiceMeta={VOICE_META[activeVoice]}
                content={voices[activeVoice]}
                loading={false}
                error={null}
                asTab
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Priority Closer — after all voices */}
      {quickInsights?.priority_closer && hasRealVoiceData && (
        <PriorityCloser closer={quickInsights.priority_closer} />
      )}

      {/* Loading state — only shown if no voice entries exist at all */}
      {loading && !hasVoiceEntries && !error && (
        <div className="panel-loading-spinner">
          <YDJLoading message="Consulting the masters" />
          <ElapsedTimer startedAt={loadStartedAt} />
        </div>
      )}
    </div>
  );
}
