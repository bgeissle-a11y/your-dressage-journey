/**
 * Section 3 — The Journey (3 items)
 *
 * 1. Goal 1 progress card (milestone path SVG + milestones + voice callout)
 * 2. Goal 2 progress card (same structure)
 * 3. Reflection Category Balance (heatmap table)
 */

import { REFLECTION_CATEGORY_COLORS } from '../../hooks/useInsightsData';

/* ── Helpers ── */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCellAlpha(count) {
  if (count === 0) return 0;
  if (count === 1) return 0.28;
  if (count === 2) return 0.62;
  return 0.88;
}

/* ── Chart Card wrapper ── */
function ChartCard({ icon, title, subtitle, narrative, voiceCallout, children }) {
  return (
    <div className="ip-chart-card">
      <div className="ip-chart-card__header">
        {icon && <span className="ip-chart-card__icon">{icon}</span>}
        <div>
          <h3 className="ip-chart-card__title">{title}</h3>
          {subtitle && <p className="ip-chart-card__subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="ip-chart-card__chart">
        {children}
      </div>
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

/* ── Milestone Path SVG ── */
function MilestonePath({ progress = 0, color = '#B8862A', milestones = [] }) {
  const width = 500;
  const height = 60;
  const trackY = 30;
  const trackStart = 20;
  const trackEnd = width - 20;
  const trackWidth = trackEnd - trackStart;
  const progressX = trackStart + (trackWidth * (progress / 100));

  return (
    <div className="ip-milestone-path" style={{ width: '100%', maxWidth: 520 }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        {/* Base track */}
        <line x1={trackStart} y1={trackY} x2={trackEnd} y2={trackY}
          stroke="var(--border, #E0D5C7)" strokeWidth={4} strokeLinecap="round" />
        {/* Progress fill */}
        <line x1={trackStart} y1={trackY} x2={progressX} y2={trackY}
          stroke={color} strokeWidth={5} strokeLinecap="round" />

        {/* Milestone markers */}
        {milestones.map((m, i) => {
          const mx = trackStart + (trackWidth * (m.position / 100));
          if (m.type === 'breakthrough') {
            return (
              <g key={i}>
                <polygon
                  points={`${mx},${trackY - 10} ${mx + 5},${trackY - 3} ${mx + 3},${trackY + 4} ${mx - 3},${trackY + 4} ${mx - 5},${trackY - 3}`}
                  fill={mx <= progressX ? color : '#D4D0C8'} stroke="none"
                />
              </g>
            );
          }
          if (m.type === 'foundation') {
            return <circle key={i} cx={mx} cy={trackY} r={5} fill={mx <= progressX ? '#C4B08B' : '#D4D0C8'} stroke="none" />;
          }
          return <circle key={i} cx={mx} cy={trackY} r={4} fill={mx <= progressX ? color : '#D4D0C8'} stroke="none" />;
        })}

        {/* Progress marker */}
        <line x1={progressX} y1={trackY - 14} x2={progressX} y2={trackY + 14}
          stroke={color} strokeWidth={1.5} strokeDasharray="3 2" />
        <rect x={progressX - 14} y={trackY - 22} width={28} height={16} rx={3} fill={color} />
        <text x={progressX} y={trackY - 11} textAnchor="middle" fontSize={9} fill="white" fontWeight={600}>
          {progress}%
        </text>

        {/* Goal endpoint */}
        <circle cx={trackEnd} cy={trackY} r={8} fill="none" stroke={color} strokeWidth={1.5} />
        <text x={trackEnd} y={trackY + 22} textAnchor="middle" fontSize={8} fill="#999" fontWeight={600}>GOAL</text>
      </svg>
      {/* Legend */}
      <div className="ip-milestone-legend">
        <span><svg width="10" height="10"><polygon points="5,0 10,7 8,11 2,11 0,7" fill={color} /></svg> Breakthrough</span>
        <span><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill={color} /></svg> Incremental</span>
        <span><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#C4B08B" /></svg> Foundation</span>
      </div>
    </div>
  );
}

/* ── Goal colors by index ── */
const GOAL_COLORS = ['#5B9E6B', '#B8862A', '#4A7DC4', '#C45252', '#8B5EA0'];

/* ── Goal Progress Card — per clarification doc rendering spec ── */
function GoalCard({ goal, index }) {
  if (!goal) return null;

  const text = typeof goal === 'string' ? goal : goal.text || goal.description || '';
  const progress = goal.progress || 0;
  const milestones = goal.milestones || [];
  const nextSteps = goal.nextSteps || '';
  const voiceCallout = goal.voiceCallout || null;
  const color = GOAL_COLORS[index % GOAL_COLORS.length];

  return (
    <div className="ip-chart-card">
      {/* 1. Goal title + progress % — flex row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: '"Playfair Display",Georgia,serif', fontSize: 16, color: '#2C2C2C', lineHeight: 1.4, flex: 1 }}>
          {text}
        </h3>
        <span style={{ fontSize: 26, fontWeight: 700, color, fontFamily: '"Playfair Display",serif', marginLeft: 18, flexShrink: 0 }}>
          {progress}%
        </span>
      </div>

      {/* 2. Thin progress bar */}
      <div style={{ height: 5, background: 'var(--border, #E0D5C7)', borderRadius: 3, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: color, borderRadius: 3 }} />
      </div>

      {/* 3. MilestonePath SVG */}
      <MilestonePath progress={progress} color={color} milestones={milestones} />

      {/* 4. Milestone list with type badges */}
      {milestones.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13 }}>
              <div style={{
                padding: '2px 7px', borderRadius: 3, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.5px',
                background: `${m.type === 'foundation' ? '#8B7355' : color}18`,
                color: m.type === 'foundation' ? '#8B7355' : color,
                border: `1px solid ${m.type === 'foundation' ? '#8B7355' : color}44`,
                flexShrink: 0, marginTop: 1,
              }}>
                {(m.type || 'incremental').toUpperCase()}
              </div>
              <span style={{ color: '#5A5A5A', lineHeight: 1.55, flex: 1 }}>{m.label || m.text || m.title}</span>
              {m.date && <span style={{ color: '#B8862A', fontSize: 11, flexShrink: 0, marginTop: 2 }}>{m.date}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Evidence narrative */}
      {goal.evidence && (
        <p style={{ margin: '14px 0 0', fontSize: 13.5, lineHeight: 1.75, color: '#5A5A5A' }}>
          {goal.evidence}
        </p>
      )}

      {/* 5. NEXT block */}
      {nextSteps && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: `${color}0D`, borderRadius: 8, borderLeft: `3px solid ${color}55` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 5, letterSpacing: '0.6px' }}>NEXT</div>
          <p style={{ margin: 0, fontSize: 13, color: '#5A5A5A', lineHeight: 1.65 }}>
            {typeof nextSteps === 'string' ? nextSteps : Array.isArray(nextSteps) ? nextSteps.join(' ') : ''}
          </p>
        </div>
      )}

      {/* 6. VoiceCallout — only if voice_callout exists */}
      {voiceCallout && voiceCallout.text && (
        <blockquote style={{
          margin: '12px 0 0', padding: '10px 16px',
          borderLeft: '3px solid #B8862A', background: 'rgba(184,134,42,0.08)',
          borderRadius: '0 6px 6px 0', fontSize: 13, lineHeight: 1.65, color: '#2C2C2C',
        }}>
          <strong style={{ color: '#B8862A' }}>{voiceCallout.voice}:</strong> {voiceCallout.text}
        </blockquote>
      )}
    </div>
  );
}

/* ── Reflection Heatmap ── */
function ReflectionHeatmap({ heatmap }) {
  if (!heatmap || !heatmap.weeks.length) {
    return (
      <div className="ip-empty-state">
        <p>Reflection patterns will appear here once you have a few weeks of reflection entries.</p>
      </div>
    );
  }

  const { categories, weeks, counts } = heatmap;

  // Detect absence patterns (3+ consecutive zero weeks)
  const absencePatterns = [];
  categories.forEach(cat => {
    const catCounts = counts[cat] || [];
    let consecutive = 0;
    for (let i = catCounts.length - 1; i >= 0; i--) {
      if (catCounts[i] === 0) consecutive++;
      else break;
    }
    if (consecutive >= 3) {
      absencePatterns.push(cat);
    }
  });

  // Compute totals per category
  const totals = {};
  categories.forEach(cat => {
    totals[cat] = (counts[cat] || []).reduce((s, v) => s + v, 0);
  });

  return (
    <div className="ip-heatmap-wrapper">
      <div className="ip-heatmap-scroll">
        <table className="ip-heatmap">
          <thead>
            <tr>
              <th className="ip-heatmap__label-col"></th>
              {weeks.map((wk, i) => (
                <th key={i} className="ip-heatmap__week-col">{wk}</th>
              ))}
              <th className="ip-heatmap__total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => {
              const catColor = REFLECTION_CATEGORY_COLORS[cat];
              const catCounts = counts[cat] || [];
              return (
                <tr key={cat}>
                  <td className="ip-heatmap__label" style={{ color: catColor }}>{cat}</td>
                  {catCounts.map((count, i) => {
                    const alpha = getCellAlpha(count);
                    const bg = count > 0
                      ? hexToRgba(catColor, alpha)
                      : hexToRgba('#E0D5C7', 0.33);
                    return (
                      <td key={i} className="ip-heatmap__cell" style={{ background: bg }}>
                        {count > 0 ? count : ''}
                      </td>
                    );
                  })}
                  <td className="ip-heatmap__total" style={{ color: catColor, fontWeight: 700 }}>
                    {totals[cat]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Absence pattern narrative */}
      {absencePatterns.length > 0 && (
        <p className="ip-chart-card__narrative" style={{ marginTop: 12 }}>
          Notice that{' '}
          {absencePatterns.map((cat, i) => (
            <span key={cat}>
              {i > 0 && (i === absencePatterns.length - 1 ? ' and ' : ', ')}
              <span style={{ color: REFLECTION_CATEGORY_COLORS[cat], fontWeight: 600 }}>{cat}</span>
            </span>
          ))}{' '}
          {absencePatterns.length === 1 ? 'has' : 'have'} been absent for several consecutive weeks.
          This might be worth exploring — sometimes the categories we avoid hold the most growth potential.
        </p>
      )}
    </div>
  );
}

/* ── Section 3 Component ── */
export default function Section3Journey({ data }) {
  if (!data) return null;

  const { goals, hasJourneyMap, reflectionHeatmap } = data;

  return (
    <div className="ip-section">
      <div className="ip-section__intro">
        <h2>The Journey</h2>
        <p>Your long-term goals, milestone progress, and the balance of your reflective practice.</p>
      </div>

      {/* Goal progress cards */}
      {goals && goals.length > 0 ? (
        goals.map((goal, i) => (
          <GoalCard key={i} goal={goal} index={i} />
        ))
      ) : (
        <div className="ip-chart-card">
          <div className="ip-chart-card__header">
            <span className="ip-chart-card__icon">&#x1F3AF;</span>
            <div>
              <h3 className="ip-chart-card__title">Goal Progress</h3>
            </div>
          </div>
          <div className="ip-empty-state">
            {!hasJourneyMap ? (
              <>
                <p>Progress tracking will appear here after your first Journey Map is generated.</p>
                <p className="ip-empty-state__sub">Complete your reflections and debriefs, then generate your Journey Map.</p>
              </>
            ) : (
              <>
                <p>Goal progress data is being calculated.</p>
                <p className="ip-empty-state__sub">Regenerate your Journey Map to update this view.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reflection Category Balance — Heatmap */}
      <ChartCard
        icon="&#x1F4DD;"
        title="Reflection Category Balance"
        subtitle="Your reflection entries across the 6 categories over the past 8 weeks."
        narrative="A balanced reflective practice touches all six categories over time. Heavy concentration in one or two categories is natural, but check whether you're avoiding certain types of reflection — especially obstacles and feel/body awareness."
        voiceCallout={{ voice: 'Empathetic Coach', text: 'The Obstacle category isn\'t about what went wrong — it\'s about what you\'re learning to navigate. Weeks without one doesn\'t mean weeks without challenge. It might mean weeks of labeling challenges as something else, and letting them disappear before they can teach you anything.' }}
      >
        <ReflectionHeatmap heatmap={reflectionHeatmap} />
      </ChartCard>
    </div>
  );
}
