import { useState } from 'react';

/**
 * Individual coaching voice display.
 * When asTab=true, renders as full tab content (no card wrapper, always expanded).
 * When asTab=false (default), renders as a standalone card with expand/collapse.
 */
export default function CoachingVoiceCard({ voiceMeta, content, loading, error, asTab = false }) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    if (asTab) {
      return (
        <div className="coaching-voice-content__loading">
          <div className="voice-card__skeleton">
            <div className="skeleton-line skeleton-line--long" />
            <div className="skeleton-line skeleton-line--medium" />
            <div className="skeleton-line skeleton-line--long" />
            <div className="skeleton-line skeleton-line--short" />
          </div>
        </div>
      );
    }
    return (
      <div className="voice-card voice-card--loading" style={{ borderLeftColor: voiceMeta.color }}>
        <div className="voice-card__header">
          <span className="voice-card__icon">{voiceMeta.icon}</span>
          <div>
            <h3 className="voice-card__name">{voiceMeta.name}</h3>
            <p className="voice-card__perspective">{voiceMeta.perspective}</p>
          </div>
        </div>
        <div className="voice-card__skeleton">
          <div className="skeleton-line skeleton-line--long" />
          <div className="skeleton-line skeleton-line--medium" />
          <div className="skeleton-line skeleton-line--long" />
          <div className="skeleton-line skeleton-line--short" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={asTab ? '' : 'voice-card voice-card--error'} style={asTab ? undefined : { borderLeftColor: voiceMeta.color }}>
        {!asTab && (
          <div className="voice-card__header">
            <span className="voice-card__icon">{voiceMeta.icon}</span>
            <div>
              <h3 className="voice-card__name">{voiceMeta.name}</h3>
              <p className="voice-card__perspective">{voiceMeta.perspective}</p>
            </div>
          </div>
        )}
        <p className="voice-card__error-message">Unable to generate this voice's analysis. Please try again.</p>
      </div>
    );
  }

  if (!content) return null;

  // Extract the narrative (full text) and structured data
  const narrative = content.narrative || '';
  const structuredData = getStructuredSections(voiceMeta.index, content);
  const showAll = asTab || expanded;

  // Tab mode: render content inline (no card wrapper)
  if (asTab) {
    return (
      <div>
        {/* Voice identity */}
        <div className="coaching-voice-content__meta">
          <span style={{ fontSize: '1.3em' }}>{voiceMeta.icon}</span>
          <h3 className="coaching-voice-content__name">{voiceMeta.name}</h3>
          {content._meta?.fromCache && (
            <span className="voice-card__cache-badge">Cached</span>
          )}
        </div>
        <p className="coaching-voice-content__catchphrase">"{voiceMeta.catchphrase}"</p>

        {/* All structured sections */}
        <div className="voice-card__insights">
          {structuredData.map((section, i) => (
            <div key={i} className="voice-card__insight-section">
              <h4>{section.label}</h4>
              {renderSectionValue(section.value)}
            </div>
          ))}
        </div>

        {/* Full narrative */}
        {narrative && (
          <div className="voice-card__narrative">
            <h4>Full Analysis</h4>
            <div className="voice-card__narrative-text">
              {narrative.split('\n').map((para, i) => (
                para.trim() ? <p key={i}>{para}</p> : null
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Card mode (legacy/standalone)
  return (
    <div className="voice-card" style={{ borderLeftColor: voiceMeta.color }}>
      <div className="voice-card__header">
        <span className="voice-card__icon">{voiceMeta.icon}</span>
        <div>
          <h3 className="voice-card__name">{voiceMeta.name}</h3>
          <p className="voice-card__catchphrase">"{voiceMeta.catchphrase}"</p>
        </div>
        {content._meta?.fromCache && (
          <span className="voice-card__cache-badge">Cached</span>
        )}
      </div>

      {/* Structured insights preview */}
      <div className="voice-card__insights">
        {structuredData.slice(0, showAll ? structuredData.length : 2).map((section, i) => (
          <div key={i} className="voice-card__insight-section">
            <h4>{section.label}</h4>
            {renderSectionValue(section.value)}
          </div>
        ))}
      </div>

      {/* Full narrative */}
      {showAll && narrative && (
        <div className="voice-card__narrative">
          <h4>Full Analysis</h4>
          <div className="voice-card__narrative-text">
            {narrative.split('\n').map((para, i) => (
              para.trim() ? <p key={i}>{para}</p> : null
            ))}
          </div>
        </div>
      )}

      {/* Expand/collapse */}
      {(structuredData.length > 2 || narrative) && (
        <button
          className="voice-card__toggle"
          onClick={() => setExpanded(!expanded)}
          style={{ color: voiceMeta.color }}
        >
          {expanded ? 'Show less' : 'Read full analysis'}
        </button>
      )}
    </div>
  );
}

/**
 * Render a section value (string, array, or object).
 */
function renderSectionValue(value) {
  if (Array.isArray(value)) {
    return (
      <ul>
        {value.map((item, j) => (
          <li key={j}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object' && value !== null) {
    return (
      <div className="voice-card__insight-object">
        {Object.entries(value).map(([k, v]) => (
          v && <p key={k}><strong>{formatLabel(k)}:</strong> {String(v)}</p>
        ))}
      </div>
    );
  }
  return <p>{value}</p>;
}

/**
 * Extract structured sections based on voice index.
 */
function getStructuredSections(voiceIndex, content) {
  switch (voiceIndex) {
    case 0: // Classical Master
      return [
        content.classical_assessment && { label: 'Classical Assessment', value: content.classical_assessment },
        content.training_scale_progress && { label: 'Training Scale Progress', value: content.training_scale_progress },
        content.philosophical_reflection && { label: 'Philosophical Reflection', value: content.philosophical_reflection },
        content.patience_points && { label: 'Patience Points', value: content.patience_points },
      ].filter(Boolean);

    case 1: // Empathetic Coach
      return [
        content.emotional_patterns && { label: 'Emotional Patterns', value: content.emotional_patterns },
        content.confidence_trajectory && { label: 'Confidence Trajectory', value: content.confidence_trajectory },
        content.partnership_insights && { label: 'Partnership Insights', value: content.partnership_insights },
        content.mindset_suggestions && { label: 'Mindset Suggestions', value: content.mindset_suggestions },
      ].filter(Boolean);

    case 2: // Technical Coach
      return [
        content.key_observations && { label: 'Key Observations', value: content.key_observations },
        content.technical_priorities && { label: 'Technical Priorities', value: content.technical_priorities },
        content.exercises && { label: 'Recommended Exercises', value: content.exercises },
        content.position_notes && { label: 'Position Notes', value: content.position_notes },
      ].filter(Boolean);

    case 3: // Practical Strategist
      return [
        content.priorities && { label: 'Priorities', value: content.priorities },
        content.weekly_plan && { label: 'Weekly Plan', value: content.weekly_plan },
        content.measurable_goals && { label: 'Measurable Goals', value: content.measurable_goals },
        content.timeline && { label: 'Timeline', value: content.timeline },
      ].filter(Boolean);

    default:
      return [];
  }
}

function formatLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
