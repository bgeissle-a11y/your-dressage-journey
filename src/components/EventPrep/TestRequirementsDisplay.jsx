import { useState } from 'react';
import CollapsibleSection from '../AICoaching/CollapsibleSection';

/**
 * Renders test requirements: movements, coefficients, scoring strategy.
 * Wraps content in a CollapsibleSection for progressive disclosure.
 */
export default function TestRequirementsDisplay({ data }) {
  const test = data.tests?.[0];
  if (!test) return null;

  return (
    <CollapsibleSection
      title={`Test Requirements \u2014 ${data.target_level || ''}`}
      icon="&#x1F4CB;"
      defaultOpen
    >
      <div className="ep-test-req">
        {/* Level context */}
        {data.level_context && (
          <div className="ep-test-req__context">
            <p>{data.level_context.what_judges_expect}</p>
            {data.level_context.key_progression_from_prior_level && (
              <div className="ep-test-req__progression">
                <h4>Key Progression from Prior Level</h4>
                <p>{data.level_context.key_progression_from_prior_level}</p>
              </div>
            )}
          </div>
        )}

        {/* Movements */}
        <h4 className="ep-section-label">Movements ({test.movements?.length || 0})</h4>
        <div className="ep-movements">
          {(test.movements || []).map((m, i) => (
            <MovementCard key={i} movement={m} />
          ))}
        </div>

        {/* Collective Marks */}
        {test.collective_marks && test.collective_marks.length > 0 && (
          <>
            <h4 className="ep-section-label">Collective Marks</h4>
            <div className="ep-collectives">
              {test.collective_marks.map((cm, i) => (
                <div key={i} className="ep-collective-card">
                  <div className="ep-collective-card__header">
                    <strong>{cm.category}</strong>
                    {cm.coefficient && <span className="ep-coefficient-badge">&times;{cm.coefficient}</span>}
                  </div>
                  <p>{cm.what_judges_look_for}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Coefficient Strategy */}
        {test.coefficient_strategy && (
          <div className="ep-strategy-box">
            <h4>Coefficient Strategy</h4>
            <p>{test.coefficient_strategy}</p>
          </div>
        )}

        {/* Overall Tips */}
        {test.overall_tips && test.overall_tips.length > 0 && (
          <>
            <h4 className="ep-section-label">Key Tips</h4>
            <ul className="ep-tips-list">
              {test.overall_tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}


function MovementCard({ movement }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ep-movement-card">
      <div
        className="ep-movement-card__header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="ep-movement-card__title">
          <strong>{movement.movement}</strong>
          {movement.marker && (
            <span className="ep-movement-card__marker">{movement.marker}</span>
          )}
        </div>
        <span className={`collapsible-header__chevron ${expanded ? 'collapsible-header__chevron--open' : ''}`}>
          &#9662;
        </span>
      </div>
      {expanded && (
        <div className="ep-movement-card__body">
          {movement.directive && <p className="ep-movement-card__directive">{movement.directive}</p>}
          {movement.common_errors && movement.common_errors.length > 0 && (
            <div className="ep-movement-card__section">
              <h5>Common Errors</h5>
              <ul>
                {movement.common_errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          {movement.geometry_notes && (
            <div className="ep-movement-card__section">
              <h5>Geometry</h5>
              <p>{movement.geometry_notes}</p>
            </div>
          )}
          {movement.scoring_tips && (
            <div className="ep-movement-card__section">
              <h5>Scoring Tips</h5>
              <p>{movement.scoring_tips}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
