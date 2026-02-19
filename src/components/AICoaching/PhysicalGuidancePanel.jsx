/**
 * Physical Guidance Panel
 *
 * Renders personalized physical fitness and body awareness guidance:
 * - Position Pattern Analysis (from PG-1)
 * - Off-Horse Exercises (from PG-2)
 * - Pre-Ride Warm-Up Routine (from PG-2)
 * - In-Ride Body Awareness Cues (from PG-2)
 *
 * Medical disclaimer displayed persistently at the top.
 * Single-fetch pattern: calls getPhysicalGuidance once, renders all sections.
 */

import { useState, useEffect, useCallback } from 'react';
import { getPhysicalGuidance, VOICE_META } from '../../services/aiService';
import CollapsibleSection from './CollapsibleSection';
import ErrorDisplay from './ErrorDisplay';
import ElapsedTimer from './ElapsedTimer';

// Build voice lookup for coach snippets
const VOICE_LOOKUP = {};
VOICE_META.forEach((v) => {
  VOICE_LOOKUP[v.name] = v;
  VOICE_LOOKUP[v.name.replace('The ', '')] = v;
});

// ─── Medical Disclaimer ────────────────────────────────────────────

function MedicalDisclaimer() {
  return (
    <div className="pg-medical-disclaimer">
      <div className="pg-medical-disclaimer__icon">&#9888;&#65039;</div>
      <div className="pg-medical-disclaimer__content">
        <strong>Important Notice</strong>
        <p>
          The exercises and body awareness suggestions provided here are general
          fitness suggestions for riders, not medical advice. All exercises are
          conservative and gentle. If you have existing injuries, chronic
          conditions, or physical limitations, please consult your physician,
          physical therapist, or qualified healthcare provider before beginning
          any new exercise program. Stop any exercise immediately if you
          experience pain.
        </p>
      </div>
    </div>
  );
}

// ─── Pattern Analysis Section ──────────────────────────────────────

function PatternAnalysisSection({ analysis }) {
  if (!analysis) return <p className="pg-empty">No pattern analysis available.</p>;

  return (
    <div className="pg-patterns">
      {/* Physical Patterns */}
      {analysis.physical_patterns?.length > 0 && (
        <div className="pg-patterns__group">
          <h4>Key Physical Patterns</h4>
          {analysis.physical_patterns.map((p, i) => (
            <div key={i} className={`pg-pattern-card pg-pattern-card--${p.severity}`}>
              <div className="pg-pattern-card__header">
                <span className="pg-pattern-card__name">{p.pattern}</span>
                <span className={`pg-pattern-card__badge pg-pattern-card__badge--${p.severity}`}>
                  {p.severity}
                </span>
              </div>
              <p className="pg-pattern-card__impact">{p.riding_impact}</p>
              {p.evidence?.length > 0 && (
                <ul className="pg-pattern-card__evidence">
                  {p.evidence.map((e, j) => <li key={j}>{e}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tension Comparison */}
      {analysis.riding_tension_vs_daily && (
        <div className="pg-patterns__group">
          <h4>Tension: Daily Life vs Riding</h4>
          <div className="pg-tension-comparison">
            {analysis.riding_tension_vs_daily.overlap_areas?.length > 0 && (
              <div className="pg-tension-column">
                <h5>Both</h5>
                {analysis.riding_tension_vs_daily.overlap_areas.map((a, i) => (
                  <span key={i} className="pg-tension-tag pg-tension-tag--overlap">{a}</span>
                ))}
              </div>
            )}
            {analysis.riding_tension_vs_daily.riding_only_areas?.length > 0 && (
              <div className="pg-tension-column">
                <h5>Riding Only</h5>
                {analysis.riding_tension_vs_daily.riding_only_areas.map((a, i) => (
                  <span key={i} className="pg-tension-tag pg-tension-tag--riding">{a}</span>
                ))}
              </div>
            )}
            {analysis.riding_tension_vs_daily.daily_only_areas?.length > 0 && (
              <div className="pg-tension-column">
                <h5>Daily Only</h5>
                {analysis.riding_tension_vs_daily.daily_only_areas.map((a, i) => (
                  <span key={i} className="pg-tension-tag pg-tension-tag--daily">{a}</span>
                ))}
              </div>
            )}
          </div>
          {analysis.riding_tension_vs_daily.interpretation && (
            <p className="pg-tension-interpretation">
              {analysis.riding_tension_vs_daily.interpretation}
            </p>
          )}
        </div>
      )}

      {/* Asymmetries */}
      {analysis.asymmetries?.length > 0 && (
        <div className="pg-patterns__group">
          <h4>Asymmetries</h4>
          {analysis.asymmetries.map((a, i) => (
            <div key={i} className="pg-asymmetry-item">
              <strong>{a.description}</strong>
              <p>{a.riding_manifestation}</p>
              <span className="pg-asymmetry-sources">
                Sources: {a.sources?.join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Kinesthetic Calibration */}
      {analysis.kinesthetic_calibration && (
        <div className="pg-patterns__group">
          <h4>Your Body Awareness Profile</h4>
          <div className="pg-kinesthetic">
            <div className="pg-kinesthetic__level">
              Level {analysis.kinesthetic_calibration.rated_level}/10
            </div>
            <p>{analysis.kinesthetic_calibration.observed_accuracy}</p>
            {analysis.kinesthetic_calibration.blind_spots?.length > 0 && (
              <div className="pg-kinesthetic__section">
                <h5>Blind Spots to Watch</h5>
                <ul>
                  {analysis.kinesthetic_calibration.blind_spots.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.kinesthetic_calibration.strengths?.length > 0 && (
              <div className="pg-kinesthetic__section">
                <h5>Awareness Strengths</h5>
                <ul>
                  {analysis.kinesthetic_calibration.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Exercise List Section ─────────────────────────────────────────

function ExerciseListSection({ exercises }) {
  if (!exercises?.length) return <p className="pg-empty">No exercises prescribed.</p>;

  return (
    <div className="pg-exercises">
      {exercises.map((ex, i) => {
        const voiceMeta = ex.coach_snippet
          ? VOICE_LOOKUP[ex.coach_snippet.voice]
          : null;
        return (
          <div key={i} className="pg-exercise-card">
            <div className="pg-exercise-card__header">
              <h4>{ex.name}</h4>
              <div className="pg-exercise-card__meta">
                <span className={`pg-difficulty pg-difficulty--${ex.difficulty}`}>
                  {ex.difficulty}
                </span>
                <span className="pg-exercise-card__frequency">{ex.frequency}</span>
                <span className="pg-exercise-card__duration">{ex.duration}</span>
              </div>
            </div>
            <p className="pg-exercise-card__target">Targets: {ex.target_pattern}</p>
            <p className="pg-exercise-card__description">{ex.description}</p>
            <div className="pg-exercise-card__riding-connection">
              <strong>Why this helps your riding:</strong> {ex.riding_connection}
            </div>
            {ex.coach_snippet && (
              <div
                className="gpt-coach-perspective"
                style={voiceMeta ? { borderLeftColor: voiceMeta.color } : undefined}
              >
                <span className="gpt-coach-perspective__voice">
                  {voiceMeta?.icon} {ex.coach_snippet.voice}:
                </span>{' '}
                <span className="gpt-coach-perspective__note">
                  {ex.coach_snippet.note}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Warm-Up Section ───────────────────────────────────────────────

function WarmUpSection({ warmUp }) {
  if (!warmUp) return <p className="pg-empty">No warm-up routine generated.</p>;

  return (
    <div className="pg-warmup">
      <div className="pg-warmup__meta">
        <span className="pg-warmup__time">{warmUp.total_time}</span>
        <span className="pg-warmup__context">{warmUp.context}</span>
      </div>
      <ol className="pg-warmup__steps">
        {(warmUp.steps || []).map((step, i) => (
          <li key={i} className="pg-warmup__step">
            <div className="pg-warmup__step-name">{step.name}</div>
            <p className="pg-warmup__step-instruction">{step.instruction}</p>
            <div className="pg-warmup__step-meta">
              <span className="pg-warmup__step-purpose">{step.purpose}</span>
              <span className="pg-warmup__step-duration">{step.duration}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Body Awareness Cues Section ───────────────────────────────────

function BodyAwarenessCuesSection({ cues }) {
  if (!cues?.length) return <p className="pg-empty">No body awareness cues generated.</p>;

  return (
    <div className="pg-cues">
      {cues.map((cue, i) => (
        <div key={i} className="pg-cue-card">
          <div className="pg-cue-card__trigger">{cue.trigger}</div>
          <div className="pg-cue-card__cue">{cue.cue}</div>
          <div className="pg-cue-card__meta">
            <span className="pg-cue-card__target">For: {cue.target_pattern}</span>
            <span className="pg-cue-card__check">{cue.check_method}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────

export default function PhysicalGuidancePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [insufficientData, setInsufficientData] = useState(null);
  const [loadStartedAt, setLoadStartedAt] = useState(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh && data) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setLoadStartedAt(Date.now());
    }
    setError(null);
    setInsufficientData(null);

    try {
      const result = await getPhysicalGuidance({ forceRefresh });

      if (!result.success) {
        if (
          result.error === 'insufficient_data' ||
          result.error === 'missing_assessment'
        ) {
          setInsufficientData(result);
        } else {
          setError({ message: 'Failed to generate your Physical Guidance.' });
        }
        return;
      }

      setData(result);
    } catch (err) {
      console.error('Physical Guidance error:', err);
      const details = err?.details || err?.customData || {};
      const parsed = {
        category: details.category || 'unknown',
        retryable: details.retryable !== false,
        message: err?.message || 'An error occurred.',
      };
      if (forceRefresh && data) {
        setError({
          ...parsed,
          message: 'Could not refresh. Showing previous results.',
        });
      } else {
        setError(parsed);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    fetchData();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // --- Insufficient Data State ---
  if (insufficientData) {
    const isMissingAssessment = insufficientData.error === 'missing_assessment';
    return (
      <div className="panel-insufficient">
        <div className="panel-insufficient__icon">
          <span role="img" aria-label="body">&#x1F9D8;</span>
        </div>
        <h3>
          {isMissingAssessment
            ? 'Complete Your Physical Self-Assessment'
            : 'Your Physical Guidance Awaits'}
        </h3>
        <p>{insufficientData.message}</p>
        <div className="panel-insufficient__checklist">
          <p>To unlock Physical Guidance, you need:</p>
          <ul>
            <li>A completed Physical Self-Assessment</li>
            <li>A completed rider profile</li>
            <li>At least one horse profile</li>
            <li>At least 3 post-ride debriefs</li>
          </ul>
        </div>
      </div>
    );
  }

  // --- Loading State ---
  if (loading && !data) {
    return (
      <div className="pg-panel pg-panel--loading">
        <div className="pg-panel__header">
          <h2>Physical Guidance</h2>
          <p>
            Analyzing your body patterns and creating personalized exercises...
          </p>
        </div>
        <div className="panel-loading-spinner">
          <div className="spinner" />
          <p>
            Cross-referencing your physical assessment with your ride data...
          </p>
          <ElapsedTimer startedAt={loadStartedAt} />
        </div>
      </div>
    );
  }

  // --- Error State (no prior data) ---
  if (error && !data) {
    return (
      <div className="pg-panel">
        <div className="pg-panel__header">
          <h2>Physical Guidance</h2>
        </div>
        <ErrorDisplay
          message={error.message}
          category={error.category}
          retryable={error.retryable !== false}
          onRetry={() => fetchData(true)}
          retrying={loading}
        />
      </div>
    );
  }

  if (!data) return null;

  const { patternAnalysis, exercisePrescription } = data;

  return (
    <div className="pg-panel">
      {/* Medical Disclaimer — persistent at top */}
      <MedicalDisclaimer />

      <div className="pg-panel__header">
        <div>
          <h2>Physical Guidance</h2>
          <p>Personalized exercises and body awareness cues for your riding</p>
        </div>
        <div className="pg-panel__actions">
          {data.generatedAt && (
            <span className="panel-timestamp">
              {data.fromCache && 'Cached \u00B7 '}
              {new Date(data.generatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}
          <button
            className="btn-refresh"
            onClick={() => fetchData(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Refreshing banner */}
      {refreshing && (
        <div className="panel-refreshing">
          <div className="spinner spinner--small" />
          <span>Refreshing with your latest data...</span>
        </div>
      )}

      {/* Error with existing data */}
      {error && !refreshing && (
        <ErrorDisplay
          message={error.message}
          category={error.category}
          retryable={error.retryable !== false}
          onRetry={() => fetchData(true)}
          retrying={loading}
          compact
        />
      )}

      {/* Personalization Summary */}
      {exercisePrescription?.personalization_summary && (
        <div className="pg-personalization-summary">
          {exercisePrescription.personalization_summary}
        </div>
      )}

      {/* Section 1: Position Pattern Analysis */}
      <CollapsibleSection
        title="Position Pattern Analysis"
        icon="&#x1F50D;"
        defaultOpen
      >
        <PatternAnalysisSection analysis={patternAnalysis} />
      </CollapsibleSection>

      {/* Section 2: Off-Horse Exercises */}
      <CollapsibleSection
        title="Off-Horse Exercises"
        icon="&#x1F4AA;"
        defaultOpen
      >
        <ExerciseListSection exercises={exercisePrescription?.exercises} />
      </CollapsibleSection>

      {/* Section 3: Pre-Ride Warm-Up */}
      <CollapsibleSection
        title="Pre-Ride Preparation"
        icon="&#x2600;&#xFE0F;"
        defaultOpen
      >
        <WarmUpSection warmUp={exercisePrescription?.warm_up_routine} />
      </CollapsibleSection>

      {/* Section 4: In-Ride Body Awareness Cues */}
      <CollapsibleSection title="Body Awareness Prompts" icon="&#x1F9E0;">
        <BodyAwarenessCuesSection
          cues={exercisePrescription?.body_awareness_cues}
        />
      </CollapsibleSection>

      {/* PT Integration Notes */}
      {exercisePrescription?.pt_integration_notes && (
        <div className="pg-pt-notes">
          <strong>Working with your therapist/trainer:</strong>{' '}
          {exercisePrescription.pt_integration_notes}
        </div>
      )}
    </div>
  );
}
