import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MultiVoicePanel from '../components/AICoaching/MultiVoicePanel';
import JourneyMapPanel from '../components/AICoaching/JourneyMapPanel';
import GrandPrixPanel from '../components/AICoaching/GrandPrixPanel';

import PhysicalGuidancePanel from '../components/AICoaching/PhysicalGuidancePanel';
import InsightsPage from '../components/insights/InsightsPage';
import YDJLoading from '../components/YDJLoading';
import useGenerationStatus from '../hooks/useGenerationStatus';
import { useEntitlements } from '../hooks/useEntitlements';
import { CAPABILITIES } from '../constants/entitlements';
import './Insights.css';

const TABS = [
  { id: 'coaching',       label: 'Coaching Voices',     icon: '\ud83c\udf99\ufe0f', viewCap: CAPABILITIES.viewCoaching },
  { id: 'journey',        label: 'Journey Map',         icon: '\ud83d\uddfa\ufe0f', viewCap: CAPABILITIES.viewJourneyMap },
  { id: 'grandprix',      label: 'Grand Prix Thinking', icon: '\ud83e\udde0',       viewCap: CAPABILITIES.viewGrandPrixThinking },
  { id: 'physical',       label: 'Physical Guidance',   icon: '\ud83e\uddd8',       viewCap: CAPABILITIES.viewPhysicalGuidance },
  { id: 'visualizations', label: 'Data Visualizations', icon: '\ud83d\udcca',       viewCap: CAPABILITIES.viewDataVisualizations },
];

export default function Insights() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'coaching');
  const generationStatus = useGenerationStatus();
  const ent = useEntitlements();

  // Sync tab when URL params change (e.g. navigating from nav links)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && TABS.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const totalOutputs = generationStatus.outputsCompleted.length + generationStatus.outputsRemaining.length;
  const completedCount = generationStatus.outputsCompleted.length;

  return (
    <div className="insights-page">
      <div className="insights-header">
        <h1>AI Coaching Insights</h1>
        <p>Personalized coaching intelligence powered by your journey data</p>
      </div>

      {/* Generation status banner */}
      {generationStatus.isGenerating && (
        <div className="generation-banner">
          <YDJLoading
            size="sm"
            message={
              totalOutputs > 0
                ? `Updating your insights (${completedCount} of ${totalOutputs} ready)`
                : 'Updating your insights with new data'
            }
          />
        </div>
      )}
      {generationStatus.justCompleted && (
        <div className="generation-banner generation-banner--complete">
          <span>Your insights have been updated!</span>
        </div>
      )}

      <div className="insights-tabs">
        {TABS.map((tab) => {
          const allowed = ent.loading || !tab.viewCap || ent.can(tab.viewCap);
          const required = tab.viewCap ? ent.requiredTierLabel(tab.viewCap) : null;
          // Disabled buttons don't fire :hover in Chromium, so the native
          // `title` tooltip never appears. Show the required tier as an
          // always-visible badge instead and use aria-disabled so screen
          // readers still pick up the announcement.
          return (
            <button
              key={tab.id}
              type="button"
              className={`insights-tab ${activeTab === tab.id ? 'insights-tab--active' : ''} ${allowed ? '' : 'insights-tab--disabled'}`}
              onClick={() => allowed && setActiveTab(tab.id)}
              aria-disabled={!allowed}
              aria-label={allowed ? tab.label : `${tab.label} (requires ${required || 'paid'} plan)`}
            >
              <span className="insights-tab__icon">{tab.icon}</span>
              <span className="insights-tab__label">{tab.label}</span>
              {!allowed && required && (
                <span className="insights-tab__lock">{required}+</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="insights-content">
        {activeTab === 'coaching' && <MultiVoicePanel generationStatus={generationStatus} />}
        {activeTab === 'journey' && <JourneyMapPanel generationStatus={generationStatus} />}
        {activeTab === 'grandprix' && <GrandPrixPanel generationStatus={generationStatus} />}
        {activeTab === 'physical' && <PhysicalGuidancePanel />}
        {activeTab === 'visualizations' && <InsightsPage embedded />}
      </div>
    </div>
  );
}
