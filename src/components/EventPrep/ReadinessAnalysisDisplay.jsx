import CollapsibleSection from '../AICoaching/CollapsibleSection';
import { CoachSnippet, getScoreLevel } from './eventPlannerShared.jsx';

/**
 * Renders readiness analysis: score, strengths, gaps, risk areas.
 * Uses nested CollapsibleSections for deep-dive progressive disclosure.
 */
export default function ReadinessAnalysisDisplay({ data }) {
  return (
    <CollapsibleSection
      title="Readiness Analysis"
      icon="&#x1F4CA;"
      defaultOpen
    >
      <div className="ep-readiness">
        {/* Readiness Score */}
        <div className="ep-readiness__score-row">
          <div className="ep-readiness__score-circle" data-level={getScoreLevel(data.readiness_score)}>
            <span className="ep-readiness__score-value">{data.readiness_score}</span>
            <span className="ep-readiness__score-label">{data.readiness_label || 'Readiness'}</span>
          </div>
          {data.horse_readiness && (
            <div className="ep-readiness__sub-scores">
              <div className="ep-readiness__sub-score">
                <span className="ep-readiness__sub-score-value">{data.horse_readiness.score}</span>
                <span className="ep-readiness__sub-score-label">Horse</span>
              </div>
              {data.mental_readiness && (
                <div className="ep-readiness__sub-score">
                  <span className="ep-readiness__sub-score-value">{data.mental_readiness.score}</span>
                  <span className="ep-readiness__sub-score-label">Mental</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Overall Assessment */}
        {data.overall_assessment && (
          <div className="ep-readiness__assessment">
            <p>{data.overall_assessment}</p>
          </div>
        )}

        {/* Strengths */}
        {data.strengths && data.strengths.length > 0 && (
          <CollapsibleSection title="Strengths" icon="&#x2705;" defaultOpen>
            <div className="ep-strength-gap-list">
              {data.strengths.map((s, i) => (
                <div key={i} className="ep-strength-card">
                  <h5>{s.area}</h5>
                  <p className="ep-evidence">{s.evidence}</p>
                  {s.relevance_to_test && <p className="ep-relevance">{s.relevance_to_test}</p>}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Gaps */}
        {data.gaps && data.gaps.length > 0 && (
          <CollapsibleSection title="Areas to Address" icon="&#x26A0;&#xFE0F;">
            <div className="ep-strength-gap-list">
              {data.gaps.map((g, i) => (
                <div key={i} className={`ep-gap-card ep-gap-card--${g.severity}`}>
                  <div className="ep-gap-card__header">
                    <h5>{g.area}</h5>
                    <span className={`ep-severity-badge ep-severity-badge--${g.severity}`}>
                      {g.severity}
                    </span>
                  </div>
                  <p className="ep-evidence">{g.evidence}</p>
                  {g.recommended_action && (
                    <div className="ep-gap-card__action">
                      <h6>Recommended Action</h6>
                      <p>{g.recommended_action}</p>
                    </div>
                  )}
                  {g.timeline_to_address && (
                    <p className="ep-gap-card__timeline">{g.timeline_to_address}</p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Movement Readiness */}
        {data.horse_readiness?.specific_movement_readiness && (
          <CollapsibleSection title="Movement Readiness" icon="&#x1F3C7;">
            <div className="ep-movement-readiness">
              {data.horse_readiness.specific_movement_readiness.map((m, i) => (
                <div key={i} className="ep-movement-readiness__item">
                  <div className="ep-movement-readiness__header">
                    <span className="ep-movement-readiness__name">{m.movement}</span>
                    <span className={`ep-readiness-badge ep-readiness-badge--${m.readiness}`}>
                      {m.readiness}
                    </span>
                  </div>
                  {m.notes && <p className="ep-movement-readiness__notes">{m.notes}</p>}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Principles Health */}
        {data.principles_health && (
          <CollapsibleSection title="Training Principles Health" icon="&#x1F3DB;&#xFE0F;">
            <div className="ep-principles">
              {['relaxation', 'forwardness', 'trust_in_hand'].map(key => {
                const p = data.principles_health[key];
                if (!p) return null;
                const label = key === 'trust_in_hand' ? 'Trust in the Hand' : key.charAt(0).toUpperCase() + key.slice(1);
                return (
                  <div key={key} className={`ep-principle-card ep-principle-card--${p.status}`}>
                    <div className="ep-principle-card__header">
                      <strong>{label}</strong>
                      <span className={`ep-principle-status ep-principle-status--${p.status}`}>
                        {p.status}
                      </span>
                    </div>
                    <p>{p.evidence}</p>
                  </div>
                );
              })}
              {data.principles_health.overall && (
                <div className="ep-principles__overall">
                  <p>{data.principles_health.overall}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Risk Areas */}
        {data.risk_areas && data.risk_areas.length > 0 && (
          <CollapsibleSection title="Risk Areas" icon="&#x1F6A8;">
            <div className="ep-strength-gap-list">
              {data.risk_areas.map((r, i) => (
                <div key={i} className={`ep-gap-card ep-gap-card--${r.risk_level}`}>
                  <div className="ep-gap-card__header">
                    <h5>{r.area}</h5>
                    <span className={`ep-severity-badge ep-severity-badge--${r.risk_level}`}>
                      {r.risk_level}
                    </span>
                  </div>
                  <p>{r.mitigation}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Coach Perspective */}
        {data.coach_perspective && (
          <div className="ep-coach-perspective">
            <div className="ep-coach-perspective__voice">{data.coach_perspective.voice}</div>
            <p className="ep-coach-perspective__text">{data.coach_perspective.assessment}</p>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
