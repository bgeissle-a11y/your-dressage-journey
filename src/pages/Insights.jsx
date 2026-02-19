import { useState } from 'react';
import MultiVoicePanel from '../components/AICoaching/MultiVoicePanel';
import JourneyMapPanel from '../components/AICoaching/JourneyMapPanel';
import GrandPrixPanel from '../components/AICoaching/GrandPrixPanel';
import DataVisualizationsPanel from '../components/AICoaching/DataVisualizationsPanel';
import PhysicalGuidancePanel from '../components/AICoaching/PhysicalGuidancePanel';
import useGenerationStatus from '../hooks/useGenerationStatus';
import './Insights.css';

const TABS = [
  { id: 'coaching', label: 'Coaching Voices', icon: '\ud83c\udf99\ufe0f' },
  { id: 'journey', label: 'Journey Map', icon: '\ud83d\uddfa\ufe0f' },
  { id: 'grandprix', label: 'Grand Prix Thinking', icon: '\ud83e\udde0' },
  { id: 'dataviz', label: 'Data Visualizations', icon: '\ud83d\udcca' },
  { id: 'physical', label: 'Physical Guidance', icon: '\ud83e\uddd8' },
];

export default function Insights() {
  const [activeTab, setActiveTab] = useState('coaching');
  const generationStatus = useGenerationStatus();

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
          <div className="spinner spinner--small" />
          <span>
            Updating your insights with new data...
            {totalOutputs > 0 && ` (${completedCount} of ${totalOutputs} ready)`}
          </span>
        </div>
      )}
      {generationStatus.justCompleted && (
        <div className="generation-banner generation-banner--complete">
          <span>Your insights have been updated!</span>
        </div>
      )}

      <div className="insights-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`insights-tab ${activeTab === tab.id ? 'insights-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="insights-tab__icon">{tab.icon}</span>
            <span className="insights-tab__label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="insights-content">
        {activeTab === 'coaching' && <MultiVoicePanel generationStatus={generationStatus} />}
        {activeTab === 'journey' && <JourneyMapPanel generationStatus={generationStatus} />}
        {activeTab === 'grandprix' && <GrandPrixPanel generationStatus={generationStatus} />}
        {activeTab === 'dataviz' && <DataVisualizationsPanel generationStatus={generationStatus} />}
        {activeTab === 'physical' && <PhysicalGuidancePanel />}
      </div>
    </div>
  );
}
