/**
 * InsightsPage — Dedicated data insights page
 *
 * Three sections:
 *   1. Ride Quality Indicators (5 charts)
 *   2. Ride Outcomes (2 charts)
 *   3. The Journey (goal progress + reflection heatmap)
 */

import { useState } from 'react';
import useInsightsData, { REFLECTION_CATEGORY_COLORS, buildHorseColorMap } from '../../hooks/useInsightsData';
import Section1Quality from './Section1Quality';
import Section2Outcomes from './Section2Outcomes';
import Section3Journey from './Section3Journey';
import './InsightsPage.css';

const SECTIONS = [
  { id: 'quality', label: 'Ride Quality Indicators', count: 5 },
  { id: 'outcomes', label: 'Ride Outcomes', count: 2 },
  { id: 'journey', label: 'The Journey', count: 3 },
];

export default function InsightsPage({ embedded = false }) {
  const { data, loading, error, insufficientData } = useInsightsData();
  const [activeSection, setActiveSection] = useState('quality');

  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="ip-page">
        {!embedded && (
          <div className="ip-header">
            <h1 className="ip-header__title">Insights</h1>
          </div>
        )}
        <div className="ip-loading">
          <div className="ip-skeleton-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="ip-skeleton-card">
                <div className="skeleton-line skeleton-line--long" />
                <div className="skeleton-line skeleton-line--medium" />
                <div className="ip-skeleton-chart" />
                <div className="skeleton-line skeleton-line--long" />
                <div className="skeleton-line skeleton-line--short" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ip-page">
        {!embedded && (
          <div className="ip-header">
            <h1 className="ip-header__title">Insights</h1>
          </div>
        )}
        <div className="ip-error">
          <p>Something went wrong loading your insights. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ip-page">
      {!embedded && (
        <div className="ip-header">
          <h1 className="ip-header__title">Insights</h1>
          <p className="ip-header__subtitle">
            Your Dressage Journey &middot; {data?.riderName || 'Rider'} &middot; {monthYear}
          </p>
        </div>
      )}

      {/* Section tab nav */}
      <div className="ip-section-nav">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`ip-section-tab${activeSection === s.id ? ' ip-section-tab--active' : ''}`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.label}
            <span className="ip-section-tab__count">{s.count}</span>
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="ip-content">
        {activeSection === 'quality' && (
          <Section1Quality
            data={data}
            insufficientData={insufficientData}
          />
        )}
        {activeSection === 'outcomes' && (
          <Section2Outcomes data={data} />
        )}
        {activeSection === 'journey' && (
          <Section3Journey data={data} />
        )}
      </div>
    </div>
  );
}
