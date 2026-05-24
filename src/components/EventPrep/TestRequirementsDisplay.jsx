import CollapsibleSection from '../AICoaching/CollapsibleSection';

/**
 * Renders AI-enriched test-level coaching context:
 *   - Level expectations + key progression from prior level
 *   - Collective marks (judges' criteria + coefficient flags)
 *   - Coefficient scoring strategy
 *   - Overall tips for the level
 *
 * The numbered movement sequence is NOT rendered here — that surface lives
 * in the Test Reference Panel's "Sequence" tab, fed by the comprehensive
 * static test database. This panel layers AI-generated strategy on top of
 * what the rider can already see in the reference panel, avoiding
 * duplicate movement lists in two places on the same page.
 */
export default function TestRequirementsDisplay({ data }) {
  const test = data.tests?.[0];
  if (!test) return null;

  return (
    <CollapsibleSection
      title={`Test Requirements — ${data.target_level || ''}`}
      icon="&#x1F4CB;"
      defaultOpen
    >
      <div className="ep-test-req">
        {/* Level context */}
        {data.level_context && (
          <div className="ep-test-req__context">
            {data.level_context.what_judges_expect && (
              <p>{data.level_context.what_judges_expect}</p>
            )}
            {data.level_context.key_progression_from_prior_level && (
              <div className="ep-test-req__progression">
                <h4>Key Progression from Prior Level</h4>
                <p>{data.level_context.key_progression_from_prior_level}</p>
              </div>
            )}
          </div>
        )}

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
