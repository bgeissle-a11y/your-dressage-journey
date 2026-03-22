import { useState } from 'react';
import CollapsibleSection from '../AICoaching/CollapsibleSection';

const SECTION_CFG = {
  mental: {
    key: 'mental',
    label: 'Mental / Emotional',
    icon: '\u{1F9E0}',
    colorVar: '--mental-color',
    bgVar: '--mental-bg',
    borderVar: '--mental-border',
  },
  technical: {
    key: 'technical',
    label: 'Technical',
    icon: '\u{1F3C7}',
    colorVar: '--tech-color',
    bgVar: '--tech-bg',
    borderVar: '--tech-border',
  },
  physical: {
    key: 'physical',
    label: 'Physical / Kinesthetic',
    icon: '\u{1F33F}',
    colorVar: '--body-color',
    bgVar: '--body-bg',
    borderVar: '--body-border',
  },
};

/**
 * Renders the week-by-week preparation plan with 3 sections per week:
 * Mental, Technical, Physical — each with title/body/cue items.
 */
export default function PreparationPlanDisplay({ data }) {
  const [activeWeek, setActiveWeek] = useState(data.weeks?.[0]?.week_number || 1);
  const totalWeeks = data.total_weeks || data.weeks?.length || 0;
  const week = data.weeks?.find(w => w.week_number === activeWeek) || data.weeks?.[0];

  return (
    <CollapsibleSection
      title={`Preparation Plan \u2014 ${totalWeeks} Weeks`}
      icon="&#x1F4C5;"
      defaultOpen
    >
      <div className="sp-plan">
        {/* Summary */}
        {data.plan_summary && (
          <div className="sp-plan-summary">
            <p>{data.plan_summary}</p>
          </div>
        )}

        {/* Week chips */}
        {data.weeks && data.weeks.length > 1 && (
          <div className="sp-week-chips">
            {data.weeks.map(w => (
              <button
                key={w.week_number}
                className={`sp-week-chip${w.week_number === activeWeek ? ' active' : ''}`}
                onClick={() => setActiveWeek(w.week_number)}
              >
                {w.week_number === 1 ? 'Show Wk' : `Wk ${w.week_number}`}
              </button>
            ))}
          </div>
        )}

        {/* Active week content */}
        {week && <WeekContent week={week} totalWeeks={totalWeeks} />}
      </div>
    </CollapsibleSection>
  );
}

function WeekContent({ week, totalWeeks }) {
  const progress = totalWeeks > 0 ? Math.round(((totalWeeks - week.week_number + 1) / totalWeeks) * 100) : 0;

  return (
    <div className="sp-week">
      <div className="sp-week-header">
        <div>
          <div className="sp-week-heading">
            {week.week_number === 1 ? 'Show Week' : `Week ${week.week_number}`}
            {week.theme && <span className="sp-week-theme"> \u00b7 {week.theme}</span>}
          </div>
          {week.primary_focus && (
            <div className="sp-week-focus">{week.primary_focus}</div>
          )}
        </div>
        <div className="sp-week-progress">
          <div className="sp-week-progress-label">Prep Progress</div>
          <div className="sp-week-progress-bar">
            <div className="sp-week-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="sp-sections">
        {['mental', 'technical', 'physical'].map(key => {
          const items = week[key] || [];
          if (items.length === 0) return null;
          return <SectionBlock key={key} sectionKey={key} items={items} />;
        })}
      </div>

      {week.readiness_checkpoint && (
        <div className="sp-checkpoint">
          <div className="sp-checkpoint-label">End-of-Week Check</div>
          <p>{week.readiness_checkpoint}</p>
        </div>
      )}
    </div>
  );
}

function SectionBlock({ sectionKey, items }) {
  const cfg = SECTION_CFG[sectionKey];
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="sp-section-block">
      <div
        className="sp-section-header"
        onClick={() => setCollapsed(!collapsed)}
        role="button"
        tabIndex={0}
      >
        <span className="sp-section-dot" style={{ background: `var(${cfg.colorVar})` }} />
        <span className="sp-section-label" style={{ color: `var(${cfg.colorVar})` }}>
          {cfg.label}
        </span>
        <span className="sp-section-count">{items.length} items</span>
        <span className="sp-section-chevron">{collapsed ? '\u25B6' : '\u25BC'}</span>
      </div>
      {!collapsed && (
        <div className="sp-section-items">
          {items.map((item, i) => (
            <ItemCard key={i} item={item} cfg={cfg} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, cfg }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="sp-item-card">
      <div className="sp-item-header" onClick={() => setExpanded(!expanded)}>
        <div className="sp-item-icon" style={{ background: `var(${cfg.bgVar})` }}>
          {cfg.icon}
        </div>
        <div className="sp-item-title-block">
          <div className="sp-item-label" style={{ color: `var(${cfg.colorVar})` }}>
            {cfg.label}
          </div>
          <div className="sp-item-title">{item.title}</div>
        </div>
        <span className="sp-item-chevron">{expanded ? '\u25BC' : '\u25B6'}</span>
      </div>
      {expanded && (
        <div className="sp-item-body">
          <p className="sp-item-text">{item.body}</p>
          <div className="sp-item-cue" style={{
            background: `var(${cfg.bgVar})`,
            borderLeft: `3px solid var(${cfg.colorVar})`
          }}>
            <span className="sp-item-cue-icon">\u2192</span>
            <span>{item.cue}</span>
          </div>
        </div>
      )}
    </div>
  );
}
