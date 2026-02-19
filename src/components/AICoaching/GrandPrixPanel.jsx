import { useState, useEffect, useCallback } from 'react';
import { getGrandPrixThinking, VOICE_META } from '../../services/aiService';
import CollapsibleSection from './CollapsibleSection';
import ErrorDisplay from './ErrorDisplay';
import ElapsedTimer from './ElapsedTimer';

const PATH_COLORS = {
  'pre-ride': '#6B8E5F',
  'in-saddle': '#C67B5C',
  'resilience': '#4A6274',
  'steady-builder': '#6B8E5F',
  'ambitious-competitor': '#C67B5C',
  'curious-explorer': '#4A6274',
};

const PATH_ICONS = {
  'pre-ride': '\ud83c\udf05',
  'in-saddle': '\ud83c\udfc7',
  'resilience': '\ud83d\udcaa',
  'steady-builder': '\ud83c\udfe0',
  'ambitious-competitor': '\ud83c\udfc6',
  'curious-explorer': '\ud83e\udded',
};

const VOICE_LOOKUP = {};
VOICE_META.forEach((v) => { VOICE_LOOKUP[v.name] = v; });
VOICE_META.forEach((v) => { VOICE_LOOKUP[v.name.replace('The ', '')] = v; });

/**
 * Grand Prix Thinking — two-layer tab display.
 * Mental Performance: 3-path accordion with 4-week drilldowns.
 * Training Trajectory: 4-call pipeline with state analysis, 3 paths, movement maps, narratives.
 */
export default function GrandPrixPanel({ generationStatus }) {
  const [activeLayer, setActiveLayer] = useState('mental');

  // Mental layer state
  const [mentalData, setMentalData] = useState(null);
  const [mentalLoading, setMentalLoading] = useState(false);
  const [mentalError, setMentalError] = useState(null);
  const [expandedPath, setExpandedPath] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);

  // Trajectory layer state
  const [trajectoryData, setTrajectoryData] = useState(null);
  const [trajectoryLoading, setTrajectoryLoading] = useState(false);
  const [trajectoryError, setTrajectoryError] = useState(null);

  const [insufficientData, setInsufficientData] = useState(null);

  const [mentalRefreshing, setMentalRefreshing] = useState(false);
  const [trajectoryRefreshing, setTrajectoryRefreshing] = useState(false);
  const [loadStartedAt, setLoadStartedAt] = useState(null);

  // Fetch mental layer
  const fetchMental = useCallback(async (forceRefresh = false) => {
    if (forceRefresh && mentalData) {
      setMentalRefreshing(true);
    } else {
      setMentalLoading(true);
      setLoadStartedAt(Date.now());
    }
    setMentalError(null);
    setInsufficientData(null);

    try {
      const result = await getGrandPrixThinking({ forceRefresh, layer: 'mental' });

      if (!result.success) {
        if (result.error === 'insufficient_data') {
          setInsufficientData(result);
        } else {
          setMentalError({ message: 'Failed to generate your Grand Prix Thinking dashboard.' });
        }
        return;
      }

      setMentalData(result);
      if (result.recommendedPath) {
        setExpandedPath(result.recommendedPath);
      }
    } catch (err) {
      console.error('Grand Prix Thinking error:', err);
      const details = err?.details || err?.customData || {};
      const parsed = {
        category: details.category || 'unknown',
        retryable: details.retryable !== false,
        message: err?.message || 'An error occurred.',
      };
      if (forceRefresh && mentalData) {
        setMentalError({ ...parsed, message: 'Could not refresh. Showing previous results.' });
      } else {
        setMentalError(parsed);
      }
    } finally {
      setMentalLoading(false);
      setMentalRefreshing(false);
    }
  }, [mentalData]);

  // Fetch trajectory layer (lazy — only on first tab switch)
  const fetchTrajectory = useCallback(async (forceRefresh = false) => {
    if (forceRefresh && trajectoryData) {
      setTrajectoryRefreshing(true);
    } else {
      setTrajectoryLoading(true);
      setLoadStartedAt(Date.now());
    }
    setTrajectoryError(null);

    try {
      const result = await getGrandPrixThinking({ forceRefresh, layer: 'trajectory' });

      if (!result.success) {
        if (result.error === 'insufficient_data') {
          setInsufficientData(result);
        } else {
          setTrajectoryError({ message: 'Failed to generate training trajectory paths.' });
        }
        return;
      }

      setTrajectoryData(result);
    } catch (err) {
      console.error('Training trajectory error:', err);
      const details = err?.details || err?.customData || {};
      const parsed = {
        category: details.category || 'unknown',
        retryable: details.retryable !== false,
        message: err?.message || 'An error occurred.',
      };
      if (forceRefresh && trajectoryData) {
        setTrajectoryError({ ...parsed, message: 'Could not refresh. Showing previous results.' });
      } else {
        setTrajectoryError(parsed);
      }
    } finally {
      setTrajectoryLoading(false);
      setTrajectoryRefreshing(false);
    }
  }, [trajectoryData]);

  // Load mental layer on mount
  useEffect(() => {
    fetchMental();
  }, [fetchMental]);

  // Load trajectory on first tab switch
  useEffect(() => {
    if (activeLayer === 'trajectory' && !trajectoryData && !trajectoryLoading) {
      fetchTrajectory();
    }
  }, [activeLayer, trajectoryData, trajectoryLoading, fetchTrajectory]);

  // Auto-refresh when background generation completes
  useEffect(() => {
    if (generationStatus?.justCompleted) {
      if (mentalData) fetchMental();
      if (trajectoryData) fetchTrajectory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationStatus?.justCompleted]);

  if (insufficientData) {
    return (
      <div className="panel-insufficient">
        <div className="panel-insufficient__icon">
          <span role="img" aria-label="brain">&#x1F9E0;</span>
        </div>
        <h3>Preparing Your Mental Performance Dashboard</h3>
        <p>{insufficientData.message}</p>
        <div className="panel-insufficient__checklist">
          <p>To unlock Grand Prix Thinking, you need:</p>
          <ul>
            <li>A completed rider profile</li>
            <li>At least one horse profile</li>
            <li>At least 3 post-ride debriefs</li>
            <li>A rider self-assessment (for best results)</li>
          </ul>
        </div>
      </div>
    );
  }

  const isLoading = activeLayer === 'mental' ? mentalLoading : trajectoryLoading;
  const currentData = activeLayer === 'mental' ? mentalData : trajectoryData;

  if (isLoading && !currentData) {
    return (
      <div className="gpt-panel gpt-panel--loading">
        <div className="gpt-panel__header">
          <h2>Grand Prix Thinking</h2>
          <p>{activeLayer === 'mental'
            ? 'Building your personalized mental performance paths...'
            : 'Mapping your long-term training trajectory...'
          }</p>
        </div>
        <div className="panel-loading-spinner">
          <div className="spinner" />
          <p>{activeLayer === 'mental'
            ? 'Creating your 3-path dashboard with 4 weeks of personalized practices...'
            : 'Analyzing your current level, mapping movement progressions, and generating three unique trajectory paths...'
          }</p>
          <ElapsedTimer startedAt={loadStartedAt} />
        </div>
      </div>
    );
  }

  return (
    <div className="gpt-panel">
      <div className="gpt-panel__header">
        <div>
          <h2>Grand Prix Thinking</h2>
          <p>Your personalized strategic performance system</p>
        </div>
        <div className="gpt-panel__actions">
          {currentData?.generatedAt && (
            <span className="panel-timestamp">
              {currentData.fromCache && 'Cached \u00B7 '}
              {new Date(currentData.generatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })}
            </span>
          )}
          <button
            className="btn-refresh"
            onClick={() => activeLayer === 'mental' ? fetchMental(true) : fetchTrajectory(true)}
            disabled={isLoading || mentalRefreshing || trajectoryRefreshing}
          >
            {isLoading || mentalRefreshing || trajectoryRefreshing ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Layer Tabs */}
      <div className="gpt-layer-tabs">
        <button
          className={`gpt-layer-tab ${activeLayer === 'mental' ? 'gpt-layer-tab--active' : ''}`}
          onClick={() => setActiveLayer('mental')}
        >
          <span className="gpt-layer-tab__icon">&#x1F3AF;</span>
          Mental Performance
        </button>
        <button
          className={`gpt-layer-tab ${activeLayer === 'trajectory' ? 'gpt-layer-tab--active' : ''}`}
          onClick={() => setActiveLayer('trajectory')}
        >
          <span className="gpt-layer-tab__icon">&#x1F4C8;</span>
          Your Long-Term Path
        </button>
      </div>

      {/* Refreshing banner */}
      {(activeLayer === 'mental' ? mentalRefreshing : trajectoryRefreshing) && (
        <div className="panel-refreshing">
          <div className="spinner spinner--small" />
          <span>Refreshing with your latest data...</span>
        </div>
      )}

      {/* Error */}
      {(() => {
        const err = activeLayer === 'mental' ? mentalError : trajectoryError;
        const isRefreshing = activeLayer === 'mental' ? mentalRefreshing : trajectoryRefreshing;
        if (!err || isRefreshing) return null;
        return (
          <ErrorDisplay
            message={err.message}
            category={err.category}
            retryable={err.retryable !== false}
            onRetry={() => activeLayer === 'mental' ? fetchMental(true) : fetchTrajectory(true)}
            retrying={isLoading}
          />
        );
      })()}

      {/* Staleness banner */}
      {currentData?.fromCache && currentData?.dataSnapshot && (
        <div className="gpt-staleness-banner">
          Your dashboard reflects your data as of {new Date(currentData.generatedAt).toLocaleDateString()}.
          {' '}Click "Regenerate" to update with your latest rides and reflections.
        </div>
      )}

      {/* Mental Performance Layer */}
      {activeLayer === 'mental' && mentalData && (
        <MentalPaths
          paths={mentalData.paths}
          expandedPath={expandedPath}
          setExpandedPath={setExpandedPath}
          expandedWeek={expandedWeek}
          setExpandedWeek={setExpandedWeek}
          crossRef={buildMentalCrossRef(trajectoryData)}
        />
      )}

      {/* Training Trajectory Layer */}
      {activeLayer === 'trajectory' && trajectoryData && (
        <TrajectoryPaths data={trajectoryData} mentalCrossRef={buildTrajectoryCrossRef(mentalData)} />
      )}

      {/* Loading indicator for lazy-loaded trajectory */}
      {activeLayer === 'trajectory' && trajectoryLoading && !trajectoryData && (
        <div className="panel-loading-spinner">
          <div className="spinner" />
          <p>Generating your training trajectory projections...</p>
        </div>
      )}

      {mentalData?.personalizationNotes && activeLayer === 'mental' && (
        <p className="gpt-panel__notes">{mentalData.personalizationNotes}</p>
      )}
    </div>
  );
}

// ─── Cross-Layer Reference Helpers ──────────────────────────────────

/**
 * Extract per-path cross-layer callouts from trajectory data
 * for display inside mental performance path cards.
 */
function buildMentalCrossRef(trajectoryData) {
  if (!trajectoryData?.currentStateAnalysis) return null;

  const { currentStateAnalysis, movementMaps, pathNarratives } = trajectoryData;
  const recommended = pathNarratives?.recommended_path;
  const nextTransition = currentStateAnalysis.critical_transitions_ahead?.[0];
  const topMovement = movementMaps?.movement_maps?.[0];

  return {
    'pre-ride': nextTransition
      ? `Your body scan work supports your path toward ${nextTransition.transition}. ${nextTransition.key_challenge} \u2014 addressing physical patterns now builds the foundation.`
      : null,
    'in-saddle': topMovement
      ? `Your focus skills are training the self-regulation you\u2019ll need for ${topMovement.gp_form}. Your current ${topMovement.current} work is building toward this.`
      : null,
    'resilience': recommended
      ? `Your growth mindset practice supports your ${recommended.path_name} trajectory. ${(recommended.reason || '').split('.')[0]}.`
      : null,
  };
}

/**
 * Extract a single cross-layer callout from mental data
 * for display inside trajectory path cards.
 */
function buildTrajectoryCrossRef(mentalData) {
  if (!mentalData?.paths) return null;

  const recommended = mentalData.paths.find(p => p.recommended);
  if (!recommended) return null;

  return {
    recommendedMentalPath: recommended.title,
    snippet: `Your Mental Performance dashboard recommends the ${recommended.title} path: ${recommended.why || recommended.description || ''}`,
  };
}

/**
 * Mental Performance paths — 3-path accordion with 4-week drilldowns.
 */
function MentalPaths({ paths, expandedPath, setExpandedPath, expandedWeek, setExpandedWeek, crossRef }) {
  return (
    <div className="gpt-paths">
      {(paths || []).map((path) => {
        const isExpanded = expandedPath === path.id;
        const color = PATH_COLORS[path.id] || '#8B7355';
        const icon = PATH_ICONS[path.id] || '\u2728';

        // Handle failed path (from Promise.allSettled partial results)
        if (path._error) {
          return (
            <div
              key={path.id}
              className="gpt-path-card gpt-path-card--error"
              style={{ borderLeftColor: color, opacity: 0.7 }}
            >
              <div className="gpt-path-card__header">
                <div className="gpt-path-card__title-row">
                  <span className="gpt-path-card__icon">{icon}</span>
                  <div>
                    <h3>{path.id.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</h3>
                    <p className="gpt-path-card__subtitle">{path._errorMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={path.id}
            className={`gpt-path-card ${isExpanded ? 'gpt-path-card--expanded' : ''}`}
            style={{ borderLeftColor: color }}
          >
            <div
              className="gpt-path-card__header"
              onClick={() => setExpandedPath(isExpanded ? null : path.id)}
            >
              <div className="gpt-path-card__title-row">
                <span className="gpt-path-card__icon">{icon}</span>
                <div>
                  <h3>{path.title}</h3>
                  <p className="gpt-path-card__subtitle">{path.subtitle}</p>
                </div>
                {path.recommended && (
                  <span className="gpt-path-card__recommended">Recommended</span>
                )}
              </div>
              <span className={`gpt-path-card__chevron ${isExpanded ? 'open' : ''}`}>&#9662;</span>
            </div>

            {isExpanded && (
              <div className="gpt-path-card__body">
                <p className="gpt-path-card__description">{path.description}</p>
                {path.why && (
                  <p className="gpt-path-card__why"><strong>Why this path for you:</strong> {path.why}</p>
                )}

                {path.weeks && (
                  <div className="gpt-weeks">
                    {path.weeks.map((week) => {
                      const weekKey = `${path.id}-${week.week}`;
                      const isWeekOpen = expandedWeek === weekKey;

                      return (
                        <div key={weekKey} className={`gpt-week ${isWeekOpen ? 'gpt-week--open' : ''}`}>
                          <div
                            className="gpt-week__header"
                            onClick={() => setExpandedWeek(isWeekOpen ? null : weekKey)}
                          >
                            <h4>Week {week.week}: {week.theme}</h4>
                            <span className={`gpt-week__chevron ${isWeekOpen ? 'open' : ''}`}>&#9662;</span>
                          </div>

                          {isWeekOpen && (
                            <div className="gpt-week__body">
                              {week.daily && week.daily.length > 0 && (
                                <div className="gpt-week__section">
                                  <h5>Daily Practices</h5>
                                  <ul>
                                    {week.daily.map((item, i) => <li key={i}>{item}</li>)}
                                  </ul>
                                </div>
                              )}
                              {week.practices && week.practices.length > 0 && (
                                <div className="gpt-week__section">
                                  <h5>Specific Practices</h5>
                                  <ul>
                                    {week.practices.map((item, i) => {
                                      const text = typeof item === 'string' ? item : item.text;
                                      const cp = typeof item === 'object' ? item.coach_perspective : null;
                                      const voiceMeta = cp ? (VOICE_LOOKUP[cp.voice] || null) : null;

                                      return (
                                        <li key={i}>
                                          {text}
                                          {cp && cp.note && (
                                            <div
                                              className="gpt-coach-perspective"
                                              style={voiceMeta ? { borderLeftColor: voiceMeta.color } : undefined}
                                            >
                                              <span className="gpt-coach-perspective__voice">
                                                {voiceMeta ? voiceMeta.icon : ''} {cp.voice}:
                                              </span>{' '}
                                              <span className="gpt-coach-perspective__note">{cp.note}</span>
                                            </div>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}
                              {week.check_in && (
                                <div className="gpt-week__section">
                                  <h5>End-of-Week Check-In</h5>
                                  <p className="gpt-week__checkin">{week.check_in}</p>
                                </div>
                              )}
                              {week.success && (
                                <div className="gpt-week__section">
                                  <h5>Success Looks Like</h5>
                                  <p className="gpt-week__success">{week.success}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {crossRef?.[path.id] && (
                  <div className="gpt-cross-layer-callout">
                    <span className="gpt-cross-layer-callout__icon">&#x1F517;</span>
                    <span className="gpt-cross-layer-callout__label">Long-Term Path Connection:</span>
                    <span className="gpt-cross-layer-callout__text">{crossRef[path.id]}</span>
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

// ─── Training Trajectory V2 ────────────────────────────────────────

/**
 * Training Trajectory — 4-call pipeline results displayed as:
 * CurrentStateSummary → 3 TrajectoryPathCards → MovementConnectionMap → RecommendedPathBanner
 */
function TrajectoryPaths({ data, mentalCrossRef }) {
  const [activePathIndex, setActivePathIndex] = useState(null);

  // V1 backward compatibility: old format has data.paths array directly
  const isV2 = Boolean(data?.trajectoryPaths);

  // Auto-expand recommended path for V2
  useEffect(() => {
    if (isV2 && data?.pathNarratives?.recommended_path) {
      const idx = (data.trajectoryPaths.paths || []).findIndex(
        p => p.name === data.pathNarratives.recommended_path.path_name
      );
      if (idx >= 0) setActivePathIndex(idx);
    }
  }, [data, isV2]);

  // V1 fallback: show old-format data with regenerate prompt
  if (!isV2) {
    return (
      <div className="trajectory-v2">
        <div className="trajectory-v2__upgrade-banner">
          <p>A new, more detailed trajectory analysis is available with year-by-year roadmaps,
            movement progression maps, and personalized path narratives.</p>
          <p>Click <strong>Regenerate</strong> above to generate your updated Training Trajectory.</p>
        </div>
        {/* Render old-format paths as simple cards */}
        <div className="trajectory-paths">
          {(data?.paths || []).map((path, idx) => (
            <CollapsibleSection key={path.id || idx} title={path.title} defaultOpen={idx === 0} className="trajectory-card">
              {path.current_position && <p>{path.current_position}</p>}
              {path.timeline_projection && <p><strong>Timeline:</strong> {path.timeline_projection}</p>}
            </CollapsibleSection>
          ))}
        </div>
      </div>
    );
  }

  const { currentStateAnalysis, trajectoryPaths, movementMaps, pathNarratives } = data;
  const paths = trajectoryPaths?.paths || [];
  const narratives = pathNarratives?.path_narratives || [];
  const recommended = pathNarratives?.recommended_path;

  return (
    <div className="trajectory-v2">
      {/* Current State Summary */}
      <CurrentStateSummary analysis={currentStateAnalysis} />

      {/* Three Path Cards */}
      <div className="trajectory-v2__paths">
        {paths.map((path, idx) => {
          const narrative = narratives.find(n => n.path_name === path.name);
          const isRecommended = recommended?.path_name === path.name;
          return (
            <TrajectoryPathCard
              key={path.name}
              path={path}
              narrative={narrative}
              isRecommended={isRecommended}
              isExpanded={activePathIndex === idx}
              onToggle={() => setActivePathIndex(activePathIndex === idx ? null : idx)}
              mentalCrossRef={mentalCrossRef}
            />
          );
        })}
      </div>

      {/* Movement Connection Map */}
      {movementMaps && <MovementConnectionMap maps={movementMaps} />}

      {/* Recommended Path Banner */}
      {recommended && <RecommendedPathBanner recommendation={recommended} />}
    </div>
  );
}

function CurrentStateSummary({ analysis }) {
  if (!analysis) return null;

  return (
    <div className="trajectory-v2__state-summary">
      <h3>Your Current Position</h3>

      <div className="trajectory-v2__level-badges">
        {analysis.current_level?.confirmed_competition_level && (
          <span className="trajectory-v2__level-badge trajectory-v2__level-badge--competition">
            Competition: {analysis.current_level.confirmed_competition_level}
          </span>
        )}
        {analysis.current_level?.training_level && (
          <span className="trajectory-v2__level-badge trajectory-v2__level-badge--training">
            Training: {analysis.current_level.training_level}
          </span>
        )}
      </div>

      {analysis.trajectory && (
        <p className="trajectory-v2__summary-text">{analysis.trajectory}</p>
      )}

      {analysis.horse_factors?.partnership_assessment && (
        <p className="trajectory-v2__summary-text">
          <strong>{analysis.horse_factors.primary_horse}:</strong> {analysis.horse_factors.partnership_assessment}
        </p>
      )}

      {analysis.timeline_reality_check && (
        <div className="trajectory-v2__reality-check">
          <strong>Timeline Reality Check:</strong> {analysis.timeline_reality_check}
        </div>
      )}

      {analysis.critical_transitions_ahead?.length > 0 && (
        <div className="trajectory-v2__transitions">
          <h4>Critical Transitions Ahead</h4>
          {analysis.critical_transitions_ahead.map((t, i) => (
            <div key={i} className="trajectory-v2__transition-item">
              <span className="trajectory-v2__transition-label">{t.transition}</span>
              <span>{t.key_challenge} ({t.estimated_timeline})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrajectoryPathCard({ path, narrative, isRecommended, isExpanded, onToggle, mentalCrossRef }) {
  const [activeTab, setActiveTab] = useState('overview');
  const pathKey = path.name.toLowerCase().replace(/\s+/g, '-');
  const color = PATH_COLORS[pathKey] || '#8B7355';
  const icon = PATH_ICONS[pathKey] || '\u2728';

  return (
    <div
      className={`trajectory-v2-card ${isExpanded ? 'trajectory-v2-card--expanded' : ''}`}
      style={{ borderLeftColor: color }}
    >
      <div className="trajectory-v2-card__header" onClick={onToggle}>
        <span className="trajectory-v2-card__icon">{icon}</span>
        <div className="trajectory-v2-card__titles">
          <h3>{path.name}</h3>
          {path.subtitle && <p className="trajectory-v2-card__philosophy">{path.subtitle}</p>}
        </div>
        {isRecommended && <span className="gpt-path-card__recommended">Recommended</span>}
        <span className={`gpt-path-card__chevron ${isExpanded ? 'open' : ''}`}>&#9662;</span>
      </div>

      {isExpanded && (
        <div className="trajectory-v2-card__body">
          {/* Philosophy */}
          {path.philosophy && (
            <p className="trajectory-v2-card__narrative">{path.philosophy}</p>
          )}

          {/* Narrative + First Step */}
          {narrative && (
            <div className="trajectory-v2-card__narrative-section">
              <p>{narrative.narrative}</p>
              {narrative.first_step && (
                <div className="trajectory-v2-card__first-step">
                  <strong>Start this week:</strong> {narrative.first_step}
                </div>
              )}
            </div>
          )}

          {mentalCrossRef && (
            <div className="gpt-cross-layer-callout">
              <span className="gpt-cross-layer-callout__icon">&#x1F3AF;</span>
              <span className="gpt-cross-layer-callout__label">Mental Performance Connection:</span>
              <span className="gpt-cross-layer-callout__text">{mentalCrossRef.snippet}</span>
            </div>
          )}

          {/* Sub-tabs */}
          <div className="trajectory-v2-card__tabs">
            <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={activeTab === 'roadmap' ? 'active' : ''} onClick={() => setActiveTab('roadmap')}>Year-by-Year</button>
            <button className={activeTab === 'movements' ? 'active' : ''} onClick={() => setActiveTab('movements')}>Movements</button>
            <button className={activeTab === 'tests' ? 'active' : ''} onClick={() => setActiveTab('tests')}>Target Tests</button>
          </div>

          {activeTab === 'overview' && <PathOverviewTab path={path} narrative={narrative} />}
          {activeTab === 'roadmap' && <PathRoadmapTab path={path} />}
          {activeTab === 'movements' && <PathMovementsTab path={path} />}
          {activeTab === 'tests' && <PathTestsTab path={path} />}

          {/* Coach Perspectives */}
          {path.coach_perspectives?.length > 0 && (
            <div className="trajectory-v2-card__coaches">
              {path.coach_perspectives.map((cp, i) => {
                const voiceMeta = VOICE_LOOKUP[cp.voice] || null;
                return (
                  <div key={i} className="gpt-coach-perspective" style={voiceMeta ? { borderLeftColor: voiceMeta.color } : undefined}>
                    <span className="gpt-coach-perspective__voice">{voiceMeta?.icon} {cp.voice}:</span>{' '}
                    <span className="gpt-coach-perspective__note">{cp.note}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PathOverviewTab({ path, narrative }) {
  return (
    <div className="trajectory-v2__tab-content">
      {path.strengths_leveraged?.length > 0 && (
        <div className="trajectory-v2__overview-section">
          <h5>Strengths This Path Builds On</h5>
          <ul>{path.strengths_leveraged.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {path.risks?.length > 0 && (
        <div className="trajectory-v2__overview-section">
          <h5>Risks to Watch</h5>
          <ul>{path.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}
      {narrative?.your_strengths_here?.length > 0 && (
        <div className="trajectory-v2__overview-section">
          <h5>Your Strengths Here</h5>
          <ul>{narrative.your_strengths_here.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {narrative?.watch_out_for?.length > 0 && (
        <div className="trajectory-v2__overview-section">
          <h5>Watch Out For</h5>
          <ul>{narrative.watch_out_for.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}
      {narrative?.voice_perspectives?.length > 0 && (
        <div className="trajectory-v2__overview-section">
          <h5>Coach Endorsements</h5>
          {narrative.voice_perspectives.map((vp, i) => {
            const voiceMeta = VOICE_LOOKUP[vp.voice] || null;
            return (
              <div key={i} className="gpt-coach-perspective" style={voiceMeta ? { borderLeftColor: voiceMeta.color } : undefined}>
                <span className="gpt-coach-perspective__voice">{voiceMeta?.icon} {vp.voice}:</span>{' '}
                <span className="gpt-coach-perspective__note">{vp.endorsement}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PathRoadmapTab({ path }) {
  const years = [
    { key: 'year1', label: 'Year 1', data: path.year1 },
    { key: 'year2', label: 'Year 2', data: path.year2 },
    { key: 'year3_5', label: 'Years 3-5', data: path.year3_5 },
  ].filter(y => y.data);

  return (
    <div className="trajectory-v2__roadmap">
      {years.map((year) => (
        <div key={year.key} className="trajectory-v2__year">
          <div className="trajectory-v2__year-marker">{year.key === 'year3_5' ? '3+' : year.key.replace('year', '')}</div>
          <h5>{year.label}: {year.data.focus}</h5>
          <p className="trajectory-v2__year-focus">{year.data.training_emphasis}</p>
          {year.data.milestones?.length > 0 && (
            <ul className="trajectory-v2__year-milestones">
              {year.data.milestones.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
          {year.data.tests_to_target?.length > 0 && (
            <div className="trajectory-v2__year-tests">
              <span className="trajectory-v2__year-tests-label">Target tests:</span>{' '}
              {year.data.tests_to_target.join(', ')}
            </div>
          )}
          {year.data.vision && (
            <p className="trajectory-v2__year-vision"><em>{year.data.vision}</em></p>
          )}
        </div>
      ))}
    </div>
  );
}

function PathMovementsTab({ path }) {
  const movements = path.movements_progression || [];
  if (movements.length === 0) return <p className="trajectory-v2__empty">No movement progression data for this path.</p>;

  return (
    <div className="trajectory-v2__movement-list">
      {movements.map((m, i) => (
        <div key={i} className="trajectory-v2__movement-item">
          <div className="trajectory-v2__movement-name">{m.movement}</div>
          <div className="trajectory-v2__movement-detail">
            <strong>Introduce at:</strong> {m.introduce_at}
          </div>
          {m.prerequisites && (
            <div className="trajectory-v2__movement-detail">
              <strong>Prerequisites:</strong> {m.prerequisites}
            </div>
          )}
          {m.progression_notes && (
            <div className="trajectory-v2__movement-detail">{m.progression_notes}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function PathTestsTab({ path }) {
  const tests = path.tests_to_target || [];
  if (tests.length === 0) return <p className="trajectory-v2__empty">No specific test targets for this path.</p>;

  return (
    <div className="trajectory-v2__test-list">
      {tests.map((t, i) => (
        <div key={i} className="trajectory-v2__test-item">
          <span className="trajectory-v2__test-timeframe">{t.target_timeframe}</span>
          <div>
            <div className="trajectory-v2__test-name">{t.test_name}</div>
            {t.readiness_indicators && (
              <div className="trajectory-v2__test-readiness">{t.readiness_indicators}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MovementConnectionMap({ maps }) {
  const movementMaps = maps?.movement_maps || [];
  if (movementMaps.length === 0) return null;

  return (
    <div className="trajectory-v2__movement-map">
      <h3>Your Work Today → Grand Prix</h3>
      {maps.overall_connection_narrative && (
        <p className="trajectory-v2__movement-map-intro">{maps.overall_connection_narrative}</p>
      )}
      {movementMaps.map((m, i) => (
        <div key={i} className="trajectory-v2__map-chain">
          <div className="trajectory-v2__map-chain-header">
            <span className="trajectory-v2__map-current">{m.current}</span>
            <span className="trajectory-v2__map-arrow">→</span>
            <span className="trajectory-v2__map-gp">{m.gp_form}</span>
          </div>
          {m.progression_steps?.length > 0 && (
            <div className="trajectory-v2__map-steps">
              {m.progression_steps.map((step, j) => (
                <span key={j} className="trajectory-v2__map-step">
                  {step.level}: {step.form}
                </span>
              ))}
            </div>
          )}
          {m.current_relevance && (
            <p className="trajectory-v2__map-relevance">{m.current_relevance}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function RecommendedPathBanner({ recommendation }) {
  return (
    <div className="trajectory-v2__recommendation">
      <h3>Our Recommendation: {recommendation.path_name}</h3>
      <p>{recommendation.reason}</p>
    </div>
  );
}
