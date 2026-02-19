import { useState, useEffect, useCallback } from 'react';
import { getMultiVoiceCoaching, getQuickInsights, VOICE_META } from '../../services/aiService';
import CollapsibleSection from './CollapsibleSection';
import CoachingVoiceCard from './CoachingVoiceCard';
import ErrorDisplay from './ErrorDisplay';
import ElapsedTimer from './ElapsedTimer';

/**
 * Extract error category and retryable flag from a Firebase HttpsError.
 * The backend passes these via error.details (HttpsError 3rd parameter).
 */
function parseErrorDetails(err) {
  const details = err?.details || err?.customData || {};
  return {
    category: details.category || 'unknown',
    retryable: details.retryable !== false,
    message: err?.message || 'An error occurred while generating coaching insights.',
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
  const [voices, setVoices] = useState({});
  const [quickInsights, setQuickInsights] = useState(null);
  const [activeVoice, setActiveVoice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [insufficientData, setInsufficientData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loadStartedAt, setLoadStartedAt] = useState(null);
  const [isStale, setIsStale] = useState(false);

  const hasRealVoiceData = Object.values(voices).some(
    (v) => v && !v._loading && !v._error
  );

  const fetchCoaching = useCallback(async (forceRefresh = false) => {
    // Stale-while-revalidate: keep existing data visible during refresh
    if (forceRefresh && hasRealVoiceData) {
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
          setVoices((prev) => ({
            ...prev,
            [idx]: {
              _error: true,
              _errorMessage: parsed.message || 'This coaching voice encountered a temporary issue.',
            },
          }));
        })
    );

    await Promise.allSettled([quickInsightsPromise, ...voicePromises]);
    setIsStale(anyStale);
    setLoading(false);
    setRefreshing(false);
  }, [hasRealVoiceData]);

  useEffect(() => {
    fetchCoaching();
  }, [fetchCoaching]);

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
            <span className={`multi-voice-panel__timestamp${isStale ? ' multi-voice-panel__timestamp--stale' : ''}`}>
              {isStale ? 'Cached \u00b7 ' : ''}
              {new Date(meta.generatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })}
            </span>
          )}
          <button
            className="btn-refresh"
            onClick={() => fetchCoaching(true)}
            disabled={loading || refreshing}
          >
            {loading || refreshing ? 'Generating...' : 'Generate Fresh Insights'}
          </button>
        </div>
      </div>

      {/* Refreshing banner (stale-while-revalidate) */}
      {refreshing && (
        <div className="panel-refreshing">
          <div className="spinner spinner--small" />
          <span>Refreshing with your latest data...</span>
        </div>
      )}

      {/* Error display */}
      {error && !refreshing && (
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

      {/* Loading state — only shown if no voice entries exist at all */}
      {loading && !hasVoiceEntries && !error && (
        <div className="panel-loading-spinner">
          <div className="spinner" />
          <p>Generating your coaching perspectives...</p>
          <ElapsedTimer startedAt={loadStartedAt} />
        </div>
      )}
    </div>
  );
}
