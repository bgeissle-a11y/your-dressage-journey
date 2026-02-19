/**
 * Data Visualizations Panel
 *
 * Main panel for the Data Visualizations tab in the Insights page.
 * Two-phase rendering:
 * - Phase 1: 7 client-side charts render immediately from Firestore data
 * - Phase 2: AI-derived content (themes, goals, insight narratives) loads async
 */

import { useEffect, useRef } from 'react';
import useVisualizationData from '../../hooks/useVisualizationData';
import CollapsibleSection from './CollapsibleSection';

// Chart components
import RideQualityTrend from './charts/RideQualityTrend';
import MentalStateDistribution from './charts/MentalStateDistribution';
import QualityByMentalState from './charts/QualityByMentalState';
import ThemeFrequencyMap from './charts/ThemeFrequencyMap';
import GoalProgressDashboard from './charts/GoalProgressDashboard';
import TrainingFocusDistribution from './charts/TrainingFocusDistribution';
import ConfidenceTrajectory from './charts/ConfidenceTrajectory';
import CelebrationChallengeRatio from './charts/CelebrationChallengeRatio';
import ReflectionCategoryDistribution from './charts/ReflectionCategoryDistribution';
import SelfAssessmentRadar from './charts/SelfAssessmentRadar';

// Voice color mapping for coach snippets
const VOICE_COLORS = {
  'Classical Master': '#5C4033',
  'The Classical Master': '#5C4033',
  'Empathetic Coach': '#C67B5C',
  'The Empathetic Coach': '#C67B5C',
  'Technical Coach': '#6B8E5F',
  'The Technical Coach': '#6B8E5F',
  'Practical Strategist': '#4A6274',
  'The Practical Strategist': '#4A6274',
};

/**
 * Wrapper that places an AI insight narrative below a chart.
 */
function ChartWithInsight({ insight, children }) {
  return (
    <div className="dv-chart-with-insight">
      <div className="dv-chart-container">
        {children}
      </div>
      {insight && (
        <div className="dv-insight">
          <p className="dv-insight__narrative">{insight.narrative}</p>
          {insight.coach_snippet && (
            <div
              className="dv-insight__coach-snippet"
              style={{ borderLeftColor: VOICE_COLORS[insight.coach_snippet.voice] || '#8B7355' }}
            >
              <strong>{insight.coach_snippet.voice}:</strong> {insight.coach_snippet.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DataVisualizationsPanel({ generationStatus }) {
  const {
    clientData,
    clientLoading,
    aiData,
    aiLoading,
    aiError,
    insufficientData,
    refreshAiData,
  } = useVisualizationData();

  // Auto-refresh when background generation completes
  const prevJustCompleted = useRef(false);
  useEffect(() => {
    if (generationStatus?.justCompleted && !prevJustCompleted.current && aiData) {
      refreshAiData();
    }
    prevJustCompleted.current = generationStatus?.justCompleted || false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationStatus?.justCompleted]);

  const insights = aiData?.insightNarratives?.chart_insights || {};

  // Insufficient data state
  if (insufficientData) {
    return (
      <div className="panel-insufficient">
        <div className="panel-insufficient__icon">
          <span role="img" aria-label="chart">&#x1F4CA;</span>
        </div>
        <h3>Your Visualizations Await</h3>
        <p>{insufficientData.message}</p>
        <div className="panel-insufficient__checklist">
          <p>To unlock your data visualizations, you need:</p>
          <ul>
            <li>At least 3 post-ride debriefs</li>
            <li>A completed rider profile (for goal tracking)</li>
            <li>Weekly reflections (for full category coverage)</li>
          </ul>
        </div>
      </div>
    );
  }

  // Initial loading
  if (clientLoading) {
    return (
      <div className="dv-panel dv-panel--loading">
        <div className="dv-panel__header">
          <h2>Data Visualizations</h2>
          <p>Preparing your charts...</p>
        </div>
        <div className="panel-loading-spinner">
          <div className="spinner" />
          <p>Loading your ride data...</p>
        </div>
      </div>
    );
  }

  if (!clientData) return null;

  return (
    <div className="dv-panel">
      <div className="dv-panel__header">
        <div>
          <h2>Data Visualizations</h2>
          <p>Your journey through charts and insights</p>
        </div>
        <div className="dv-panel__actions">
          {aiData?.generatedAt && (
            <span className="panel-timestamp">
              {aiData.fromCache && 'Cached \u00B7 '}
              {new Date(aiData.generatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          )}
          <button
            className="btn-refresh"
            onClick={() => refreshAiData(true)}
            disabled={aiLoading}
          >
            {aiLoading ? 'Analyzing...' : 'Refresh AI Insights'}
          </button>
        </div>
      </div>

      {/* Overall Summary (AI-derived) */}
      {aiData?.insightNarratives?.overall_summary && (
        <div className="dv-overall-summary">
          <p>{aiData.insightNarratives.overall_summary}</p>
        </div>
      )}

      {/* AI Loading Banner */}
      {aiLoading && (
        <div className="dv-ai-loading-banner">
          <div className="spinner spinner--small" />
          <span>Generating AI insights for your charts...</span>
        </div>
      )}

      {/* AI Error */}
      {aiError && (
        <div className="panel-error">
          <p>{aiError}</p>
          <button onClick={() => refreshAiData(true)} className="btn-retry">Try Again</button>
        </div>
      )}

      {/* Chart Grid */}
      <div className="dv-chart-grid">
        {/* Ride Quality Trend */}
        <CollapsibleSection title="Ride Quality Over Time" icon="&#x1F4C8;" defaultOpen>
          <ChartWithInsight insight={insights.ride_quality_trend}>
            <RideQualityTrend data={clientData.rideQualityTrend} />
          </ChartWithInsight>
        </CollapsibleSection>

        {/* Confidence Trajectory */}
        <CollapsibleSection title="Confidence Trajectory" icon="&#x2B50;" defaultOpen>
          <ChartWithInsight insight={insights.confidence_trajectory}>
            <ConfidenceTrajectory data={clientData.confidenceTrajectory} />
          </ChartWithInsight>
        </CollapsibleSection>

        {/* Mental State Distribution */}
        <CollapsibleSection title="Mental State Distribution" icon="&#x1F9E0;" defaultOpen>
          <ChartWithInsight insight={insights.mental_state_distribution}>
            <MentalStateDistribution data={clientData.mentalStateDistribution} />
          </ChartWithInsight>
        </CollapsibleSection>

        {/* Quality by Mental State */}
        <CollapsibleSection title="Quality by Mental State" icon="&#x1F3AF;" defaultOpen>
          <ChartWithInsight insight={insights.quality_by_mental_state}>
            <QualityByMentalState data={clientData.qualityByMentalState} />
          </ChartWithInsight>
        </CollapsibleSection>

        {/* Training Focus Distribution */}
        <CollapsibleSection title="Training Focus Distribution" icon="&#x1F3C7;" defaultOpen>
          <ChartWithInsight insight={insights.training_focus}>
            <TrainingFocusDistribution data={clientData.trainingFocusDistribution} />
          </ChartWithInsight>
        </CollapsibleSection>

        {/* Theme Frequency Map (AI-derived) */}
        <CollapsibleSection title="Theme Frequency Map" icon="&#x1F50D;">
          <ChartWithInsight insight={insights.theme_frequency}>
            <ThemeFrequencyMap
              data={aiData?.patternExtraction?.themes}
              loading={aiLoading && !aiData}
            />
          </ChartWithInsight>
        </CollapsibleSection>

        {/* Goal Progress (AI-derived) */}
        <CollapsibleSection title="Goal Progress" icon="&#x1F3AF;">
          <ChartWithInsight insight={insights.goal_progress}>
            <GoalProgressDashboard
              data={aiData?.goalMapping?.goals}
              loading={aiLoading && !aiData}
            />
          </ChartWithInsight>
        </CollapsibleSection>

        {/* Celebrations vs Challenges */}
        <CollapsibleSection title="Celebrations vs Challenges" icon="&#x1F389;" defaultOpen>
          <ChartWithInsight insight={insights.celebration_challenge}>
            <CelebrationChallengeRatio data={clientData.celebrationChallengeRatio} />
          </ChartWithInsight>
        </CollapsibleSection>

        {/* Reflection Categories */}
        <CollapsibleSection title="Reflection Categories" icon="&#x1F4DD;" defaultOpen>
          <ChartWithInsight insight={insights.reflection_categories}>
            <ReflectionCategoryDistribution data={clientData.reflectionCategoryDistribution} />
          </ChartWithInsight>
        </CollapsibleSection>

        {/* Self-Assessment Radar (P2 placeholder) */}
        <CollapsibleSection title="Self-Assessment Radar" icon="&#x1F4CB;">
          <ChartWithInsight insight={insights.self_assessment_radar}>
            <SelfAssessmentRadar />
          </ChartWithInsight>
        </CollapsibleSection>
      </div>
    </div>
  );
}
