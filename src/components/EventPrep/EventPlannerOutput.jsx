import TestRequirementsDisplay from './TestRequirementsDisplay';
import ReadinessAnalysisDisplay from './ReadinessAnalysisDisplay';
import PreparationPlanDisplay from './PreparationPlanDisplay';
import ShowDayGuidanceDisplay from './ShowDayGuidanceDisplay';

/**
 * Orchestrator for the 4-section AI Event Planner output.
 * Renders each display component progressively as data arrives.
 * Shows a stale-data banner when cached plan is outdated.
 */
export default function EventPlannerOutput({ data, isGenerating = false, currentStep = 0, onRegenerate }) {
  if (!data) return null;

  const { testRequirements, readinessAnalysis, preparationPlan, showDayGuidance, generatedAt, fromCache, stale, staleReason, eventPrepChanged } = data;

  const hasAnySection = testRequirements || readinessAnalysis || preparationPlan || showDayGuidance;
  if (!hasAnySection) return null;

  return (
    <div className="ep-output">
      <div className="ep-output__header">
        <div>
          <h2>AI Event Preparation Plan</h2>
          <p>
            {isGenerating
              ? `Generating... (${currentStep - 1} of 4 sections complete)`
              : 'Personalized guidance for your event'
            }
          </p>
        </div>
        <div className="ep-output__meta">
          {generatedAt && (
            <span className="panel-timestamp">
              {fromCache && !stale && 'Cached \u00B7 '}
              {new Date(generatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })}
            </span>
          )}
        </div>
      </div>

      {/* Stale data banner */}
      {stale && !isGenerating && (
        <div className="ep-stale-banner">
          <div className="ep-stale-banner__text">
            {eventPrepChanged
              ? 'Your event details have changed since this plan was generated.'
              : 'You have new training data since this plan was generated.'}
          </div>
          {onRegenerate && (
            <button className="ep-stale-banner__btn" onClick={onRegenerate}>
              Regenerate
            </button>
          )}
        </div>
      )}

      {testRequirements && <TestRequirementsDisplay data={testRequirements} />}
      {readinessAnalysis && <ReadinessAnalysisDisplay data={readinessAnalysis} />}
      {preparationPlan && <PreparationPlanDisplay data={preparationPlan} />}
      {showDayGuidance && <ShowDayGuidanceDisplay data={showDayGuidance} />}

      {/* Loading indicator for next section */}
      {isGenerating && currentStep >= 2 && currentStep <= 4 && (
        <div className="ep-section-loading">
          <div className="spinner" style={{ width: '24px', height: '24px' }} />
          <span>Loading next section...</span>
        </div>
      )}
    </div>
  );
}
