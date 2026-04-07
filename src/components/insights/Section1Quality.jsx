/**
 * Section 1 — Ride Quality Indicators (5 charts)
 *
 * 1. Quality vs. Confidence (ScatterChart + diagonal via Customized)
 * 2. Quality vs. Rider Effort (ScatterChart + ReferenceArea)
 * 3. Quality by Session Type (BarChart, grouped by horse)
 * 4. Quality by Ride Arc (ComposedChart: bars + line)
 * 5. Quality by Mental State (ScatterChart with custom bubbles)
 */

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine,
  BarChart, Bar, ComposedChart, Line,
} from 'recharts';

/* ── Horse Legend ── */
function HorseLegend({ horseColorMap }) {
  return (
    <div style={{ display: 'flex', gap: 18, marginBottom: 10, flexWrap: 'wrap' }}>
      {Object.entries(horseColorMap).map(([name, color]) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} /> {name}
        </div>
      ))}
    </div>
  );
}

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


/* ── Custom tooltips matching prototype ── */
function QCTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const gap = +(d.y - d.x).toFixed(1);
  return (
    <div className="ip-tooltip">
      <p><strong>Quality:</strong> {d.x}</p>
      <p><strong>Confidence:</strong> {d.y}</p>
      <p style={{ color: gap < 0 ? '#C45252' : '#5B9E6B', fontStyle: 'italic' }}>
        {gap < 0 ? `${Math.abs(gap)} pts below your actual output` : gap > 0 ? `${gap} pts above quality` : 'Perfectly calibrated'}
      </p>
    </div>
  );
}

function EffTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const gap = d.y - d.x;
  return (
    <div className="ip-tooltip">
      <p><strong>Rider effort:</strong> {d.x}</p>
      <p><strong>Quality:</strong> {d.y}</p>
      <p style={{ color: gap > 2 ? '#5B9E6B' : gap < 0 ? '#C45252' : '#666', fontStyle: 'italic' }}>
        {gap > 2 ? 'Quality exceeded effort — flowing' : gap < 0 ? 'Trying hard, getting less' : 'Effort and quality aligned'}
      </p>
    </div>
  );
}

/* ── Custom bar shape for arc colors ── */
function ArcBar(props) {
  const { x, y, width, height, payload } = props;
  return <rect x={x} y={y} width={width} height={height} fill={payload.color} rx={3} />;
}

/* ── Bubble tooltip ── */
function BubbleTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="ip-tooltip">
      <p style={{ fontWeight: 600, color: d.color }}>{d.name}</p>
      <p>Avg quality: <strong>{d.avgQ}</strong></p>
      <p>Frequency: <strong>{d.pct}%</strong> of rides</p>
    </div>
  );
}

/* ── Mental State Bubble shape (matches prototype) ── */
function BubbleShape({ cx, cy, payload }) {
  if (!cx || !cy || !payload) return null;
  const r = Math.sqrt(payload.pct) * 9;
  const showName = r > 14;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={payload.color} fillOpacity={0.78} stroke={payload.color} strokeWidth={1.5} />
      {showName && (
        <text x={cx} y={cy - (r > 25 ? 6 : 2)} textAnchor="middle" fill="white" fontSize={r > 25 ? 9 : 8} fontFamily="Work Sans,sans-serif">
          {payload.name.split('/')[0]}
        </text>
      )}
      <text x={cx} y={cy + (r > 25 ? 10 : r > 14 ? 8 : 4)} textAnchor="middle" fill="white" fontSize={r > 25 ? 12 : 10} fontWeight="700">
        {payload.pct}%
      </text>
    </g>
  );
}

/* ── Section 1 component ── */
export default function Section1Quality({ data, insufficientData }) {
  if (!data) return null;

  const { perRideQC, perRideEffort, qualityBySessionType, qualityByArc, mentalStateBubbles, horseColorMap } = data;
  const horses = Object.keys(horseColorMap);

  // perRideQC and perRideEffort are now objects keyed by horse name
  const hasQCData = perRideQC && Object.values(perRideQC).some(arr => arr.length > 0);
  const hasEffortData = perRideEffort && Object.values(perRideEffort).some(arr => arr.length > 0);

  // Insufficient data — show empty state for Section 1
  if (insufficientData) {
    return (
      <div className="ip-section">
        <div className="ip-section__intro">
          <h2>Ride Quality Indicators</h2>
          <p>How your ride quality connects to confidence, effort, session type, arc shape, and mental state.</p>
        </div>
        <div className="ip-empty-state">
          <p>{insufficientData.message}</p>
          <p className="ip-empty-state__sub">
            You have {insufficientData.debriefCount} debrief{insufficientData.debriefCount !== 1 ? 's' : ''} so far.
            We need at least 5 to show quality patterns.
          </p>
        </div>
      </div>
    );
  }

  // Overall quality average for reference line
  const allQCPoints = perRideQC ? Object.values(perRideQC).flat() : [];
  const allEffPoints = perRideEffort ? Object.values(perRideEffort).flat() : [];
  const allQualities = [...allQCPoints.map(d => d.x), ...allEffPoints.map(d => d.y)];
  const overallAvg = allQualities.length ? Math.round((allQualities.reduce((s, v) => s + v, 0) / allQualities.length) * 10) / 10 : 5;

  return (
    <div className="ip-section">
      <div className="ip-section__intro">
        <h2>Ride Quality Indicators</h2>
        <p>How your ride quality connects to confidence, effort, session type, arc shape, and mental state.</p>
      </div>

      {/* 1. Quality vs. Confidence */}
      <ChartCard
        icon="&#x1F3AF;"
        title="Quality vs. Confidence"
        subtitle="Each dot = one ride. Dashed diagonal = perfect calibration. Dots below the line mean you underestimated yourself."
        legend={<HorseLegend horseColorMap={horseColorMap} />}
        annotation="&#x2199; Below diagonal: underestimating yourself    Above diagonal: confidence exceeds quality &#x2197;"
        narrative="Dots clustering below the diagonal suggest you're more capable than you believe — quality exceeds confidence. Dots above suggest confidence may be outpacing quality. Both patterns are valuable to notice. The gap between quality and confidence, repeated across sessions, is not imposter syndrome — it's untapped capability."
        voiceCallout={{ voice: 'Empathetic Coach', text: 'A confidence gap repeated across sessions is not imposter syndrome — it\'s untapped capability. The data is asking you to catch up to yourself.' }}
      >
        {hasQCData ? (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 24, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0D5BECC" />
              <XAxis dataKey="x" type="number" domain={[1, 10]} name="Quality"
                tick={{ fontSize: 11, fill: '#5A5A5A' }}
                label={{ value: 'Quality Rating', position: 'insideBottom', offset: -12, fontSize: 12, fill: '#5A5A5A' }} />
              <YAxis dataKey="y" type="number" domain={[1, 10]} name="Confidence"
                tick={{ fontSize: 11, fill: '#5A5A5A' }}
                label={{ value: 'Confidence Rating', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#5A5A5A' }} />
              <Tooltip content={<QCTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#E0D5BE' }} />
              <ReferenceLine segment={[{ x: 1, y: 1 }, { x: 10, y: 10 }]}
                stroke="#B8A88A" strokeWidth={2} strokeDasharray="7 4" ifOverflow="extendDomain" />
              {horses.map(horse => (
                <Scatter key={horse} name={horse} data={perRideQC[horse] || []}
                  fill={horseColorMap[horse]} fillOpacity={0.82} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        ) : <p className="ip-no-data">Not enough data with both quality and confidence ratings.</p>}
      </ChartCard>

      {/* 2. Quality vs. Rider Effort */}
      <ChartCard
        icon="&#x1F4AA;"
        title="Quality vs. Rider Effort"
        subtitle="The green band marks your optimal effort zone. Beyond effort-8, quality trends down."
        legend={<HorseLegend horseColorMap={horseColorMap} />}
        annotation="&#x25B2; Optimal zone: effort 5-7.5"
        narrative="Your highest-quality rides cluster at effort 5-7, not at maximum exertion. Above effort-8, quality falls — especially with the more sensitive horse. This is the allowing vs. doing pattern your theme data already named in words, now visible as a shape in your numbers."
        voiceCallout={{ voice: 'Classical Master', text: 'The masters did not try harder. They became clearer. When you force throughness, the horse closes. When you create the conditions and wait, he offers it. Your data shows you already know this. The work now is applying it deliberately rather than arriving at it by accident.' }}
      >
        {hasEffortData ? (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 24, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0D5BECC" />
              <ReferenceArea x1={5} x2={7.5} fill="#5B9E6B" fillOpacity={0.07} />
              <XAxis dataKey="x" type="number" domain={[2, 10]} name="Effort"
                tick={{ fontSize: 11, fill: '#5A5A5A' }}
                label={{ value: 'Rider Effort', position: 'insideBottom', offset: -12, fontSize: 12, fill: '#5A5A5A' }} />
              <YAxis dataKey="y" type="number" domain={[4, 10]} name="Quality"
                tick={{ fontSize: 11, fill: '#5A5A5A' }}
                label={{ value: 'Session Quality', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#5A5A5A' }} />
              <Tooltip content={<EffTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#E0D5BE' }} />
              {horses.map(horse => (
                <Scatter key={horse} name={horse} data={perRideEffort[horse] || []}
                  fill={horseColorMap[horse]} fillOpacity={0.82} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        ) : <p className="ip-no-data">Not enough data with both quality and effort ratings.</p>}
      </ChartCard>

      {/* 3. Quality by Session Type */}
      <ChartCard
        icon="&#x1F3C7;"
        title="Quality by Session Type"
        subtitle="Average ride quality across different session types."
        legend={<HorseLegend horseColorMap={horseColorMap} />}
        narrative="Clinic sessions produce your highest quality across both horses — a skilled external eye consistently raises the work. The lesson-to-solo gap is worth naming: whatever changes when the trainer is present, make it a skill."
        voiceCallout={{ voice: 'Practical Strategist', text: 'Your lesson-to-solo gap is real. That\'s coachability, not dependency — but coachability only counts if you can eventually coach yourself. Name what changes when the trainer is present. Then bring it deliberately to solo sessions.' }}
      >
        {qualityBySessionType && qualityBySessionType.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={qualityBySessionType} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" />
              <XAxis dataKey="type" fontSize={11} />
              <YAxis domain={[0, 10]} fontSize={11} />
              <ReferenceLine y={overallAvg} stroke="#8B7355" strokeDasharray="5 3" label={{ value: `Avg ${overallAvg}`, position: 'right', fontSize: 10, fill: '#8B7355' }} />
              <Tooltip />
              {horses.map(horse => (
                <Bar key={horse} dataKey={horse} fill={horseColorMap[horse]} radius={[3, 3, 0, 0]} barSize={20} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="ip-no-data">No session type data available yet.</p>}
      </ChartCard>

      {/* 4. Quality by Ride Arc */}
      <ChartCard
        icon="&#x1F4C8;"
        title="Quality by Ride Arc"
        subtitle="How ride shape affects average quality. Bars = avg quality (left), dashed line = ride count (right)."
        narrative="Sessions that built produce your highest quality and they're also your most frequent arc. Valley rides score lowest and occurred rarely. Variable arcs may still contain quality-9 moments. The arc is a diagnostic, not a verdict."
        voiceCallout={{ voice: 'Technical Coach', text: 'A ride that fades usually fades for a reason. Were you asking for something new too late in the session? Starting before the horse was through? Map your faded sessions — the pattern will name itself.' }}
      >
        {qualityByArc && qualityByArc.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={qualityByArc} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis yAxisId="left" domain={[0, 10]} fontSize={11}
                label={{ value: 'Avg Quality', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#999' }} />
              <YAxis yAxisId="right" orientation="right" fontSize={11}
                label={{ value: 'Ride Count', angle: 90, position: 'insideRight', fontSize: 10, fill: '#999' }} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="avgQ" name="Avg Quality" shape={<ArcBar />} barSize={30} />
              <Line yAxisId="right" type="monotone" dataKey="count" name="Ride Count"
                stroke="var(--ink, #3D3024)" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : <p className="ip-no-data">No ride arc data available yet.</p>}
      </ChartCard>

      {/* 5. Quality by Mental State */}
      <ChartCard
        icon="&#x1F9E0;"
        title="Quality by Mental State"
        subtitle="Bubble size = % of rides in that state. Position = average quality."
        narrative="Your most frequent mental state delivers reliable quality at scale, not just under optimal conditions. States in the lower-left confirm that mental state shifts precede quality shifts. When you lose calm, the work follows."
        voiceCallout={{ voice: 'Classical Master', text: 'The horse mirrors the rider\'s state — your data proves it. When you ride from calm, the horse produces a swinging trot. When you ride from delight, he waits for your aids. Tension or uncertainty, and the quality drops. The horse doesn\'t lie.' }}
      >
        {mentalStateBubbles && mentalStateBubbles.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 36, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0D5BECC" />
                <XAxis dataKey="avgQ" type="number" domain={[4, 9.5]} name="Avg Quality"
                  tick={{ fontSize: 11, fill: '#5A5A5A' }}
                  label={{ value: 'Average Quality Rating', position: 'insideBottom', offset: -15, fontSize: 12, fill: '#5A5A5A' }} />
                <YAxis dataKey="pct" type="number" domain={[0, 82]} name="Frequency"
                  tick={{ fontSize: 11, fill: '#5A5A5A' }}
                  label={{ value: '% of Rides', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#5A5A5A' }} />
                <Tooltip content={<BubbleTooltip />} />
                <Scatter data={mentalStateBubbles} shape={(props) => <BubbleShape {...props} />} />
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
              {mentalStateBubbles.map(ms => (
                <div key={ms.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#5A5A5A' }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: ms.color }} /> {ms.name}
                </div>
              ))}
            </div>
          </>
        ) : <p className="ip-no-data">No mental state data available yet.</p>}
      </ChartCard>
    </div>
  );
}
