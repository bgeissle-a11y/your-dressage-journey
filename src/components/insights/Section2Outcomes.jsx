/**
 * Section 2 — Ride Outcomes (2 charts)
 *
 * 1. Theme Frequency Map (horizontal bars, color-coded by category)
 * 2. Process Goal Adherence (stacked bar chart by week)
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

const THEME_CATEGORY_COLORS = {
  partnership: '#4A7DC4',
  rider: '#5B9E6B',
  'horse-specific': '#C45252',
  'training focus': '#B8862A',
};

const ADHERENCE_COLORS = {
  fully:    '#5B9E6B',
  mostly:   '#8CC49B',
  somewhat: '#D4A017',
  notAtAll: '#C45252',
};

/* ── Chart Card wrapper ── */
function ChartCard({ icon, title, subtitle, legend, annotation, narrative, voiceCallout, children }) {
  return (
    <div className="ip-chart-card">
      <div className="ip-chart-card__header">
        {icon && <span className="ip-chart-card__icon">{icon}</span>}
        <div>
          <h3 className="ip-chart-card__title">{title}</h3>
          {subtitle && <p className="ip-chart-card__subtitle">{subtitle}</p>}
        </div>
      </div>
      {legend}
      <div className="ip-chart-card__chart">
        {children}
      </div>
      {annotation && <p className="ip-chart-card__annotation">{annotation}</p>}
      {narrative && <p className="ip-chart-card__narrative">{narrative}</p>}
      {voiceCallout && (
        <blockquote className="ip-voice-callout">
          {typeof voiceCallout === 'object' ? (
            <><strong style={{ color: '#B8862A' }}>{voiceCallout.voice}:</strong> {voiceCallout.text}</>
          ) : voiceCallout}
        </blockquote>
      )}
    </div>
  );
}

/* ── Custom rounded top bar for "Fully" ── */
function RoundedTopBar(props) {
  const { x, y, width, height } = props;
  if (!height || height <= 0) return null;
  const r = Math.min(4, height / 2, width / 2);
  return (
    <path
      d={`M${x},${y + r}
          Q${x},${y} ${x + r},${y}
          L${x + width - r},${y}
          Q${x + width},${y} ${x + width},${y + r}
          L${x + width},${y + height}
          L${x},${y + height}
          Z`}
      fill={ADHERENCE_COLORS.fully}
    />
  );
}

export default function Section2Outcomes({ data }) {
  if (!data) return null;

  const { themes, adherenceByWeek } = data;

  return (
    <div className="ip-section">
      <div className="ip-section__intro">
        <h2>Ride Outcomes</h2>
        <p>Training themes emerging from your rides and how consistently you&apos;re following through on process goals.</p>
      </div>

      {/* 1. Theme Frequency Map */}
      <ChartCard
        icon="&#x1F50D;"
        title="Theme Frequency Map"
        subtitle="Top training themes from your coaching analysis, color-coded by category."
        legend={
          <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
            {Object.entries(THEME_CATEGORY_COLORS).map(([cat, color]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </div>
            ))}
          </div>
        }
        narrative="Your dominant themes reveal what your riding is actually about right now — beyond what you plan to work on. When a pattern appears in both the rider and horse-specific categories, they aren't separate threads. They're the same thread, seen from both ends."
        voiceCallout={{ voice: 'Technical Coach', text: 'The patterns that recur across both horses and multiple weeks are not coincidental. The data is telling you what you already know but haven\'t fully internalized.' }}
      >
        {themes && themes.length > 0 ? (() => {
          const maxRank = themes.length;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {themes.map((t, i) => {
                const color = THEME_CATEGORY_COLORS[t.category] || '#8B7355';
                const barPct = ((maxRank - i) / maxRank) * 100;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 260, textAlign: 'right', fontSize: 12.5, color: '#5A5A5A', lineHeight: 1.35, flexShrink: 0 }}>{t.name}</div>
                    <div style={{ flex: 1, position: 'relative', height: 24 }}>
                      <div style={{ height: '100%', borderRadius: 4, width: `${barPct}%`, background: color, opacity: 0.84 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })() : (
          <div className="ip-empty-state">
            <p>Theme patterns will appear here after your first Journey Map is generated.</p>
            <p className="ip-empty-state__sub">Add reflections and debriefs, then generate your Journey Map from the AI Coaching section.</p>
          </div>
        )}
      </ChartCard>

      {/* 2. Process Goal Adherence */}
      <ChartCard
        icon="&#x1F3AF;"
        title="Process Goal Adherence"
        subtitle="How consistently you follow through on process goals each week."
        legend={
          <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Fully', color: ADHERENCE_COLORS.fully },
              { label: 'Mostly', color: ADHERENCE_COLORS.mostly },
              { label: 'Somewhat', color: ADHERENCE_COLORS.somewhat },
              { label: 'Not at all', color: ADHERENCE_COLORS.notAtAll },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} /> {item.label}
              </div>
            ))}
          </div>
        }
        narrative="The improvement in full execution is consistent — no single-week spike — which means this is behavioral change, not circumstance. The 'not at all' category shrinking over time means your goals are becoming more realistic as well as more achievable."
        voiceCallout={{ voice: 'Practical Strategist', text: 'Most riders set goals and forget them between rides. You\'re closing the loop — intention to execution to rating. That cycle is what builds a training practice rather than a series of unconnected sessions.' }}
      >
        {adherenceByWeek && adherenceByWeek.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={adherenceByWeek} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" />
              <XAxis dataKey="week" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="notAtAll" name="Not at all" stackId="a" fill={ADHERENCE_COLORS.notAtAll} />
              <Bar dataKey="somewhat" name="Somewhat" stackId="a" fill={ADHERENCE_COLORS.somewhat} />
              <Bar dataKey="mostly" name="Mostly" stackId="a" fill={ADHERENCE_COLORS.mostly} />
              <Bar dataKey="fully" name="Fully" stackId="a" shape={<RoundedTopBar />} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="ip-empty-state">
            <p>Goal adherence data will appear after you start rating your process goals in debriefs.</p>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
