import { useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, ReferenceArea, LabelList,
  BarChart, Bar, ComposedChart, Line, LineChart, Customized,
} from "recharts";

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const P = {
  gold: '#B8862A', parchment: '#F5F0E8', ink: '#2C2C2C',
  rust: '#C45252', green: '#5B9E6B', blue: '#4A7DC4',
  purple: '#8B5EA0', orange: '#D4722A', tan: '#8B7355',
  gray: '#888888', bg: '#FDFAF4', border: '#E0D5BE', light: '#5A5A5A',
};

// Canonical reflection category colors — used throughout
const RC = {
  'Personal Milestone':  '#4A7DC4',
  'External Validation': '#5B9E6B',
  'Aha Moment':          '#D4A017',
  'Obstacle':            '#C45252',
  'Connection':          '#8B5EA0',
  'Feel/Body Awareness': '#D4722A',
};

const arcColors = {
  built: '#5B9E6B', consistent: '#4A7DC4', peak: '#B8862A',
  variable: '#8B7355', faded: '#D4722A', valley: '#C45252',
};
const ARC_KEYS = ['built','consistent','peak','variable','faded','valley'];
const ARC_LABELS = { built:'Built', consistent:'Consistent', peak:'Peak', variable:'Variable', faded:'Faded', valley:'Valley' };

// ─── DATA ─────────────────────────────────────────────────────────────────────

// --- Section 1: Ride Quality Indicators ---

// Quality vs Confidence
const ponyQC  = [{x:8,y:10},{x:7.5,y:9},{x:8,y:10},{x:7,y:9},{x:8,y:10},{x:7.5,y:9},{x:9,y:10,note:"Two-tempi breakthrough"},{x:7,y:9},{x:8,y:10},{x:7.5,y:9.5},{x:8,y:10},{x:7,y:9}];
const rsQC    = [{x:8,y:7},{x:7,y:4,note:"3-pt confidence gap"},{x:7,y:5},{x:9,y:8,note:"Swinging trot breakthrough"},{x:8,y:7},{x:8,y:5},{x:10,y:9},{x:3,y:4,note:"Lameness day"},{x:9,y:8},{x:7,y:6},{x:9,y:8},{x:8,y:7},{x:8,y:8},{x:7,y:5},{x:8,y:7}];

// Quality vs Effort
const ponyEff = [{x:3,y:5},{x:5,y:7},{x:6,y:8},{x:7,y:9},{x:7,y:9},{x:6,y:8},{x:8,y:8},{x:5,y:7},{x:6,y:9},{x:7,y:8},{x:8,y:7},{x:9,y:7}];
const rsEff   = [{x:4,y:6},{x:5,y:7},{x:6,y:8},{x:7,y:8},{x:7,y:9},{x:8,y:7},{x:6,y:8},{x:5,y:6},{x:9,y:6},{x:8,y:7},{x:7,y:8},{x:6,y:7},{x:8,y:6},{x:9,y:5},{x:7,y:8}];

// Quality vs Session Type
const sessionData = [
  { type:'Clinic',        pony:8.8, rs:8.3 },
  { type:'Lesson',        pony:8.3, rs:8.6 },
  { type:'Solo Practice', pony:7.5, rs:7.7 },
  { type:'Conditioning',  pony:6.5, rs:6.2 },
];

// Quality vs Ride Arc (combined: avg quality + total ride count)
const arcCombined = [
  { arc:'Built',      label:'Built',      avgQ:8.5, count:11, color:arcColors.built },
  { arc:'Consistent', label:'Consistent', avgQ:7.8, count: 8, color:arcColors.consistent },
  { arc:'Peak',       label:'Peak',       avgQ:7.4, count: 5, color:arcColors.peak },
  { arc:'Variable',   label:'Variable',   avgQ:7.0, count: 7, color:arcColors.variable },
  { arc:'Faded',      label:'Faded',      avgQ:6.2, count: 5, color:arcColors.faded },
  { arc:'Valley',     label:'Valley',     avgQ:5.4, count: 3, color:arcColors.valley },
];

// Quality vs Mental State (bubble: x=avgQ, y=freq%, bubble size=pct)
const mentalBubbles = [
  { name:'Calm/Centered',        pct:72, avgQ:7.5, color:P.green },
  { name:'Focused/Determined',   pct:14, avgQ:8.0, color:P.blue },
  { name:'Joyful/Flowing',       pct: 4, avgQ:7.8, color:P.gold },
  { name:'Mixed/Complex',        pct: 4, avgQ:6.0, color:P.tan },
  { name:'Uncertain/Confused',   pct: 4, avgQ:5.0, color:P.gray },
  { name:'Frustrated/Tense',     pct: 2, avgQ:6.5, color:P.rust },
];

// --- Section 2: Ride Outcomes ---

const themes = [
  { theme:'Connection & throughness',                count:13, cat:'partnership' },
  { theme:'Softness & lightness in aids',            count:12, cat:'rider' },
  { theme:'Rider body awareness & position',         count:11, cat:'rider' },
  { theme:'Allowing vs doing / releasing control',   count: 9, cat:'rider' },
  { theme:'Transitions quality',                     count: 9, cat:'partnership' },
  { theme:'Contact & jaw tension (Rocket Star)',     count: 8, cat:'horse' },
  { theme:'Feel & body sensation awareness',         count: 8, cat:'rider' },
  { theme:'Pirouette work & collection',             count: 7, cat:'training' },
  { theme:'Straightness work',                       count: 7, cat:'training' },
  { theme:'Energy & activity maintenance',           count: 7, cat:'training' },
  { theme:'Tempi changes quality (Pony)',            count: 6, cat:'horse' },
  { theme:'Horse tension & reactivity',              count: 6, cat:'horse' },
];
const catColors  = { partnership:P.blue, rider:P.green, horse:P.rust, training:P.gold };
const catLabels  = { partnership:'Partnership', rider:'Rider', horse:'Horse-Specific', training:'Training Focus' };

const adherenceData = [
  { week:'Feb 10', fully:30, mostly:40, somewhat:20, notAtAll:10 },
  { week:'Feb 17', fully:35, mostly:38, somewhat:18, notAtAll: 9 },
  { week:'Feb 24', fully:38, mostly:40, somewhat:15, notAtAll: 7 },
  { week:'Mar 3',  fully:44, mostly:36, somewhat:14, notAtAll: 6 },
  { week:'Mar 10', fully:50, mostly:35, somewhat:10, notAtAll: 5 },
  { week:'Mar 17', fully:54, mostly:32, somewhat:10, notAtAll: 4 },
  { week:'Mar 24', fully:60, mostly:30, somewhat: 7, notAtAll: 3 },
  { week:'Mar 31', fully:65, mostly:26, somewhat: 6, notAtAll: 3 },
];

// --- Section 3: The Journey ---

const goals = [
  {
    id:1, title:"Be a competent partner for my GP horse and all my other horses",
    progress:70, color:P.green,
    milestones:[
      { label:"Applied carousel visualization to Pony's pirouettes",                          type:"incremental",  date:"Feb" },
      { label:"Shifted mental model to 'mistakes are ok, they provide information'",           type:"breakthrough", date:"Mar 20" },
      { label:"Maintained composure with potential rearing — didn't let frustration derail",   type:"breakthrough", date:"Mar" },
      { label:"Rocket Star's most lovely swinging trot — throughness at GP level",             type:"breakthrough", date:"Mar 20" },
      { label:"First successful two-tempi on Pony — rider error, not horse confusion",         type:"breakthrough", date:"Mar 28" },
    ],
    next:"Continue building on the connection breakthrough with Rocket Star (jaw softness, throughness). Document what works in your own words — you're developing a feel-based vocabulary.",
    voice:"Classical Master",
    voiceText:"Each breakthrough documented here is not an event — it is evidence of a principle understood. The swinging trot came when you stopped asking and started allowing. The two-tempi worked when you accepted the error as information.",
  },
  {
    id:2, title:"Earn my USDF Gold Medal",
    progress:55, color:P.gold,
    milestones:[
      { label:"Competing at PSG level (61%) — Third Level Gold Medal earned or in progress", type:"foundation",   date:"" },
      { label:"Rocket Star in consistent GP-level training with professional support",        type:"foundation",   date:"" },
      { label:"Produced GP-quality swinging trot on Rocket Star",                            type:"incremental",  date:"Mar 20" },
    ],
    next:"Consolidate PSG scores above 60%, then progress through Inter I and Inter II. The technical foundation exists — the challenge is translating training-level work into competitive scores.",
    voice:"Practical Strategist",
    voiceText:"Third Level: done. PSG: underway at 61%. The path to Gold Medal is a sequence, not a leap. Stay the course: consolidate, advance, repeat.",
  },
];

const catOrder = ['Personal Milestone','External Validation','Aha Moment','Obstacle','Connection','Feel/Body Awareness'];
const weeks    = ['Feb 10','Feb 17','Feb 24','Mar 3','Mar 10','Mar 17','Mar 24','Mar 31'];
const heatmap  = {
  'Personal Milestone':  [1,0,1,1,0,1,2,1],
  'External Validation': [0,1,0,1,0,1,0,1],
  'Aha Moment':          [1,1,2,1,1,2,1,2],
  'Obstacle':            [1,0,1,1,0,0,0,0],
  'Connection':          [0,1,1,0,2,1,1,1],
  'Feel/Body Awareness': [1,1,0,1,1,1,0,1],
};

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Card = ({ children, style={} }) => (
  <div style={{ background:P.bg, border:`1px solid ${P.border}`, borderRadius:10, padding:'20px 24px', marginBottom:18, ...style }}>
    {children}
  </div>
);

const ChartTitle = ({ icon, title, subtitle }) => (
  <div style={{ marginBottom:14 }}>
    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <h3 style={{ margin:0, fontFamily:'"Playfair Display",Georgia,serif', fontSize:16, color:P.ink, fontWeight:600 }}>{title}</h3>
    </div>
    {subtitle && <p style={{ margin:'5px 0 0 25px', fontSize:12.5, color:P.light, lineHeight:1.55 }}>{subtitle}</p>}
  </div>
);

const Narrative = ({ children }) => (
  <p style={{ margin:'14px 0 0', fontSize:13.5, lineHeight:1.75, color:P.light }}>{children}</p>
);

const VoiceCallout = ({ voice, children }) => (
  <blockquote style={{ margin:'12px 0 0', padding:'10px 16px', borderLeft:`3px solid ${P.gold}`, background:`${P.gold}14`, borderRadius:'0 6px 6px 0', fontSize:13, lineHeight:1.65, color:P.ink }}>
    <strong style={{ color:P.gold }}>{voice}:</strong> {children}
  </blockquote>
);

const HorseLegend = () => (
  <div style={{ display:'flex', gap:18, marginBottom:10, flexWrap:'wrap' }}>
    {[['Pony',P.gold],['Rocket Star',P.blue]].map(([n,c]) => (
      <div key={n} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:P.light }}>
        <div style={{ width:10,height:10,borderRadius:'50%',background:c }} /> {n}
      </div>
    ))}
  </div>
);

// Diagonal calibration line — uses recharts Customized to access internal scales directly
const DiagonalLineDraw = (props) => {
  const { xAxisMap, yAxisMap } = props;
  if (!xAxisMap || !yAxisMap) return null;
  const xAxis = Object.values(xAxisMap)[0];
  const yAxis = Object.values(yAxisMap)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;
  return (
    <line x1={xAxis.scale(1)} y1={yAxis.scale(1)} x2={xAxis.scale(10)} y2={yAxis.scale(10)}
      stroke={P.border} strokeWidth={1.5} strokeDasharray="7,4" />
  );
};
const DiagLine = () => <Customized component={DiagonalLineDraw} />;

const hexToRgba = (hex, a) => {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
};

const SectionIntro = ({ title, description }) => (
  <div style={{ marginBottom:22, paddingBottom:16, borderBottom:`1px solid ${P.border}` }}>
    <h2 style={{ margin:'0 0 6px', fontFamily:'"Playfair Display",Georgia,serif', fontSize:20, color:P.ink }}>{title}</h2>
    <p style={{ margin:0, fontSize:13.5, color:P.light, lineHeight:1.65 }}>{description}</p>
  </div>
);

// ─── SECTION 1: RIDE QUALITY INDICATORS ──────────────────────────────────────

const QCTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const gap = +(d.y - d.x).toFixed(1);
  return (
    <div style={{ background:P.bg, border:`1px solid ${P.border}`, padding:'9px 13px', borderRadius:8, fontSize:12.5 }}>
      <div><strong>Quality:</strong> {d.x}</div>
      <div><strong>Confidence:</strong> {d.y}</div>
      <div style={{ color: gap<0 ? P.rust : P.green, fontStyle:'italic', marginTop:4 }}>
        {gap<0 ? `${Math.abs(gap)} pts below your actual output` : gap>0 ? `${gap} pts above quality` : 'Perfectly calibrated'}
      </div>
      {d.note && <div style={{ color:P.gold, marginTop:4, fontWeight:500, fontSize:11.5 }}>{d.note}</div>}
    </div>
  );
};

const EffTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const gap = d.y - d.x;
  return (
    <div style={{ background:P.bg, border:`1px solid ${P.border}`, padding:'9px 13px', borderRadius:8, fontSize:12.5 }}>
      <div><strong>Rider effort:</strong> {d.x}</div>
      <div><strong>Quality:</strong> {d.y}</div>
      <div style={{ color: gap>2 ? P.green : gap<0 ? P.rust : P.light, fontStyle:'italic', marginTop:4 }}>
        {gap>2 ? 'Quality exceeded effort — flowing' : gap<0 ? 'Trying hard, getting less' : 'Effort and quality aligned'}
      </div>
    </div>
  );
};

const SesTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:P.bg, border:`1px solid ${P.border}`, padding:'9px 13px', borderRadius:8, fontSize:12.5 }}>
      <div style={{ fontWeight:600, color:P.ink, marginBottom:4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.name==='Pony' ? P.gold : P.blue }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

const ArcTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background:P.bg, border:`1px solid ${P.border}`, padding:'9px 13px', borderRadius:8, fontSize:12.5 }}>
      <div style={{ fontWeight:600, color:d?.color, marginBottom:4 }}>{label}</div>
      <div>Avg quality: <strong>{payload.find(p=>p.dataKey==='avgQ')?.value}</strong></div>
      <div>Rides: <strong>{d?.count}</strong></div>
    </div>
  );
};

const BubbleTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background:P.bg, border:`1px solid ${P.border}`, padding:'9px 13px', borderRadius:8, fontSize:12.5 }}>
      <div style={{ fontWeight:600, color:d.color, marginBottom:4 }}>{d.name}</div>
      <div>Avg quality: <strong>{d.avgQ}</strong></div>
      <div>Frequency: <strong>{d.pct}%</strong> of rides</div>
    </div>
  );
};

const BubbleDot = (props) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;
  const r = Math.sqrt(payload.pct) * 9;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={payload.color} fillOpacity={0.78} stroke={payload.color} strokeWidth={1.5} />
      {r > 14 && <text x={cx} y={cy - (r>25?6:2)} textAnchor="middle" fill="white" fontSize={r>25?9:8} fontFamily="Work Sans,sans-serif">{payload.name.split('/')[0]}</text>}
      <text x={cx} y={cy+(r>25?10:r>14?8:4)} textAnchor="middle" fill="white" fontSize={r>25?12:10} fontWeight="700">{payload.pct}%</text>
    </g>
  );
};

// Custom arc bar to color each bar differently
const ArcBar = (props) => {
  const { x, y, width, height, fill } = props;
  return <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.84} rx={3} ry={3} />;
};

function Section1() {
  return (
    <>
      <SectionIntro
        title="Ride Quality Indicators"
        description="Five views of the same question: what shapes the quality of your rides? Each chart isolates one variable — confidence, effort, session type, ride arc, and mental state — so the patterns that drive your best and worst work become visible."
      />

      {/* 1a: Quality vs Confidence */}
      <Card>
        <ChartTitle icon="🎯" title="Quality vs. Confidence"
          subtitle="Each dot = one ride. Dashed diagonal = perfect calibration. Dots below the line mean you underestimated yourself." />
        <HorseLegend />
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top:10, right:24, bottom:30, left:10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${P.border}CC`} />
            <XAxis dataKey="x" type="number" domain={[1,10]} name="Quality" tick={{ fontSize:11, fill:P.light }}
              label={{ value:'Quality Rating', position:'insideBottom', offset:-12, fontSize:12, fill:P.light }} />
            <YAxis dataKey="y" type="number" domain={[1,10]} name="Confidence" tick={{ fontSize:11, fill:P.light }}
              label={{ value:'Confidence Rating', angle:-90, position:'insideLeft', fontSize:12, fill:P.light }} />
            <Tooltip content={<QCTooltip />} cursor={{ strokeDasharray:'3 3', stroke:P.border }} />
            <DiagLine />
            <Scatter name="Pony"        data={ponyQC} fill={P.gold} fillOpacity={0.82} />
            <Scatter name="Rocket Star" data={rsQC}   fill={P.blue} fillOpacity={0.76} />
          </ScatterChart>
        </ResponsiveContainer>
        <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 50px 0', flexWrap:'wrap', gap:6 }}>
          <span style={{ fontSize:11, color:P.rust, fontStyle:'italic' }}>↙ Below diagonal: underestimating yourself</span>
          <span style={{ fontSize:11, color:P.light, fontStyle:'italic' }}>Above diagonal: confidence exceeds quality ↗</span>
        </div>
        <Narrative>
          Pony rides cluster near or above the diagonal — mastery feeling. Rocket Star rides scatter below it: quality 7–9, confidence 4–7.
          That gap isn't humility. It's untapped capability you haven't yet claimed.
        </Narrative>
        <VoiceCallout voice="Empathetic Coach">
          You rated confidence-4 on a Rocket Star ride that produced quality-7 work. A three-point gap, repeated across sessions,
          is not imposter syndrome — it's untapped capability. The data is asking you to catch up to yourself.
        </VoiceCallout>
      </Card>

      {/* 1b: Quality vs Effort */}
      <Card>
        <ChartTitle icon="💪" title="Quality vs. Rider Effort"
          subtitle="The green band marks your optimal effort zone. Beyond effort-8, quality trends down. The over-trying pattern is real — and visible." />
        <HorseLegend />
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top:10, right:24, bottom:30, left:10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${P.border}CC`} />
            <ReferenceArea x1={5} x2={7.5} fill={P.green} fillOpacity={0.07} />
            <XAxis dataKey="x" type="number" domain={[2,10]} name="Effort" tick={{ fontSize:11, fill:P.light }}
              label={{ value:'Rider Effort', position:'insideBottom', offset:-12, fontSize:12, fill:P.light }} />
            <YAxis dataKey="y" type="number" domain={[4,10]} name="Quality" tick={{ fontSize:11, fill:P.light }}
              label={{ value:'Session Quality', angle:-90, position:'insideLeft', fontSize:12, fill:P.light }} />
            <Tooltip content={<EffTooltip />} cursor={{ strokeDasharray:'3 3', stroke:P.border }} />
            <Scatter name="Pony"        data={ponyEff} fill={P.gold} fillOpacity={0.82} />
            <Scatter name="Rocket Star" data={rsEff}   fill={P.blue} fillOpacity={0.76} />
          </ScatterChart>
        </ResponsiveContainer>
        <div style={{ textAlign:'center', marginTop:4 }}>
          <span style={{ fontSize:11, color:P.green, fontStyle:'italic' }}>▲ Optimal zone: effort 5–7.5</span>
        </div>
        <Narrative>
          Your highest-quality rides cluster at effort 5–7, not at maximum exertion. Above effort-8, quality falls — especially with Rocket Star.
          This is the <em>allowing vs. doing</em> pattern your theme data already named in words, now visible as a shape in your numbers.
        </Narrative>
        <VoiceCallout voice="Classical Master">
          The masters did not try harder. They became clearer. When you force throughness, the horse closes.
          When you create the conditions and wait, he offers it. Your data shows you already know this.
          The work now is applying it deliberately rather than arriving at it by accident.
        </VoiceCallout>
      </Card>

      {/* 1c: Quality vs Session Type */}
      <Card>
        <ChartTitle icon="📋" title="Quality by Session Type"
          subtitle="Clinic work produces your highest scores. The lesson-to-solo gap for Pony is the number worth watching." />
        <HorseLegend />
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={sessionData} margin={{ top:10, right:30, left:10, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${P.border}AA`} />
            <XAxis dataKey="type" tick={{ fontSize:12, fill:P.light }} />
            <YAxis domain={[5,10]} tick={{ fontSize:11, fill:P.light }}
              label={{ value:'Avg Quality', angle:-90, position:'insideLeft', fontSize:11, fill:P.light }} />
            <Tooltip content={<SesTooltip />} />
            <ReferenceLine y={7.5} stroke={P.border} strokeDasharray="4,3"
              label={{ value:'overall avg', position:'insideRight', fontSize:10, fill:P.light }} />
            <Bar dataKey="pony" name="Pony" fill={P.gold} fillOpacity={0.85} radius={[3,3,0,0]}>
              <LabelList dataKey="pony" position="top" style={{ fontSize:11.5, fill:P.gold, fontWeight:600 }} />
            </Bar>
            <Bar dataKey="rs" name="Rocket Star" fill={P.blue} fillOpacity={0.8} radius={[3,3,0,0]}>
              <LabelList dataKey="rs" position="top" style={{ fontSize:11.5, fill:P.blue, fontWeight:600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Narrative>
          Clinic sessions produce your highest quality across both horses — a skilled external eye consistently raises the work.
          Rocket Star's solo scores nearly match his lesson scores; he demands genuine self-direction, not instruction-following.
          The 0.8-point lesson-to-solo gap for Pony is worth naming: whatever changes when Kate or Martin is watching, make it a skill.
        </Narrative>
        <VoiceCallout voice="Practical Strategist">
          Your lesson-to-solo gap for Pony is 0.8 points. That's coachability, not dependency — but coachability only counts
          if you can eventually coach yourself. Name what changes when the trainer is present. Then bring it deliberately to solo sessions.
        </VoiceCallout>
      </Card>

      {/* 1d: Quality vs Ride Arc — combined */}
      <Card>
        <ChartTitle icon="〰️" title="Quality by Ride Arc — with Ride Count"
          subtitle="Bars show average quality per arc type (left axis). The line shows how many rides fell into each arc (right axis). Arc frequency gives bars their weight." />
        <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:14 }}>
          {ARC_KEYS.map(k => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:P.light }}>
              <div style={{ width:10, height:10, borderRadius:2, background:arcColors[k] }} />
              {ARC_LABELS[k]}
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={270}>
          <ComposedChart data={arcCombined} margin={{ top:10, right:44, left:10, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${P.border}AA`} />
            <XAxis dataKey="label" tick={{ fontSize:12, fill:P.light }} />
            <YAxis yAxisId="q" domain={[4,10]} tick={{ fontSize:11, fill:P.light }}
              label={{ value:'Avg Quality', angle:-90, position:'insideLeft', fontSize:11, fill:P.light }} />
            <YAxis yAxisId="n" orientation="right" domain={[0,16]} tick={{ fontSize:11, fill:P.light }}
              label={{ value:'Rides', angle:90, position:'insideRight', dx:14, fontSize:11, fill:P.light }} />
            <Tooltip content={<ArcTooltip />} />
            <ReferenceLine yAxisId="q" y={7.2} stroke={P.border} strokeDasharray="4,3"
              label={{ value:'overall avg', position:'insideRight', fontSize:10, fill:P.light }} />
            <Bar yAxisId="q" dataKey="avgQ" radius={[4,4,0,0]} shape={(props) => {
              const d = arcCombined[props.index] || {};
              return <ArcBar {...props} fill={d.color} />;
            }}>
              <LabelList dataKey="avgQ" position="top" yAxisId="q" style={{ fontSize:11, fontWeight:600, fill:P.light }} />
            </Bar>
            <Line yAxisId="n" dataKey="count" type="monotone"
              stroke={P.ink} strokeWidth={1.5} strokeDasharray="4,3" dot={{ r:4, fill:P.ink, stroke:P.bg, strokeWidth:2 }}
              name="Rides" />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ display:'flex', gap:20, marginTop:6, justifyContent:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5, color:P.light }}>
            <div style={{ width:20, height:10, background:P.tan, borderRadius:2, opacity:0.7 }} />
            Avg quality (left axis)
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5, color:P.light }}>
            <div style={{ width:20, height:0, borderTop:`2px dashed ${P.ink}`, marginTop:1 }} />
            Ride count (right axis)
          </div>
        </div>
        <Narrative>
          Sessions that <strong style={{ color:arcColors.built }}>built</strong> produce your highest quality (8.5) and they're also your most
          frequent arc (11 rides). <strong style={{ color:arcColors.valley }}>Valley</strong> rides score lowest (5.4) — and occurred only 3 times.
          Rocket Star introduces more <strong style={{ color:arcColors.variable }}>variable</strong> arcs; five of those rides contained
          at least one quality-9 moment. The arc is a diagnostic, not a verdict.
        </Narrative>
        <VoiceCallout voice="Technical Coach">
          A ride that <em style={{ color:arcColors.faded }}>fades</em> usually fades for a reason. Were you asking for something
          new too late in the session? Starting before the horse was through? Map your faded sessions — the pattern will name itself.
        </VoiceCallout>
      </Card>

      {/* 1e: Quality vs Mental State */}
      <Card>
        <ChartTitle icon="🧠" title="Quality by Mental State"
          subtitle="Bubble size = how often you rode in that state. Position = average quality delivered. Your most frequent state is also your most reliable at scale." />
        <ResponsiveContainer width="100%" height={290}>
          <ScatterChart margin={{ top:20, right:30, bottom:36, left:20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${P.border}CC`} />
            <XAxis dataKey="avgQ" type="number" domain={[4,9.5]} name="Avg Quality" tick={{ fontSize:11, fill:P.light }}
              label={{ value:'Average Quality Rating', position:'insideBottom', offset:-15, fontSize:12, fill:P.light }} />
            <YAxis dataKey="pct" type="number" domain={[0,82]} name="Frequency" tick={{ fontSize:11, fill:P.light }}
              label={{ value:'% of Rides', angle:-90, position:'insideLeft', fontSize:12, fill:P.light }} />
            <Tooltip content={<BubbleTooltip />} />
            <Scatter data={mentalBubbles} shape={(props) => <BubbleDot {...props} />} />
          </ScatterChart>
        </ResponsiveContainer>
        <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:6 }}>
          {mentalBubbles.map(ms => (
            <div key={ms.name} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:P.light }}>
              <div style={{ width:9, height:9, borderRadius:'50%', background:ms.color }} /> {ms.name}
            </div>
          ))}
        </div>
        <Narrative>
          Calm/Centered delivers quality 7.5 across 72% of your rides — reliability at scale, not just optimal conditions.
          Focused/Determined produces your highest average quality (8.0) but at low frequency (14%).
          States in the lower-left confirm that mental state shifts precede quality shifts. When you lose calm, the work follows.
        </Narrative>
        <VoiceCallout voice="Classical Master">
          The horse mirrors the rider's state — your data proves it. When you ride from calm, Rocket Star produces a swinging trot.
          When you ride from delight, Pony waits for your aids in the two-tempis.
          Tension or uncertainty, and the quality drops three points. The horse doesn't lie.
        </VoiceCallout>
      </Card>
    </>
  );
}

// ─── SECTION 2: RIDE OUTCOMES ─────────────────────────────────────────────────

function Section2() {
  const maxCount = Math.max(...themes.map(t => t.count));
  const adhColors = { fully:P.green, mostly:'#8CC49B', somewhat:'#D4A017', notAtAll:P.rust };
  const AdhTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:P.bg, border:`1px solid ${P.border}`, padding:'9px 13px', borderRadius:8, fontSize:12.5 }}>
        <div style={{ fontWeight:600, color:P.ink, marginBottom:4 }}>{label}</div>
        {payload.map(p => <div key={p.dataKey} style={{ color:adhColors[p.dataKey] }}>{p.name}: {p.value}%</div>)}
      </div>
    );
  };

  return (
    <>
      <SectionIntro
        title="Ride Outcomes"
        description="What your training is actually building — across 56 rides, what themes dominate your attention, and whether the intention-to-execution loop is closing over time."
      />

      {/* 2a: Theme Frequency Map */}
      <Card>
        <ChartTitle icon="🔍" title="Theme Frequency Map"
          subtitle="Color indicates theme category. Length indicates frequency across all rides." />
        <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:18 }}>
          {Object.entries(catColors).map(([key,color]) => (
            <div key={key} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:P.light }}>
              <div style={{ width:12, height:12, borderRadius:3, background:color }} />
              {catLabels[key]}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {themes.map((t,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:230, textAlign:'right', fontSize:12.5, color:P.light, lineHeight:1.35, flexShrink:0 }}>{t.theme}</div>
              <div style={{ flex:1, position:'relative', height:24 }}>
                <div style={{ height:'100%', borderRadius:4, width:`${(t.count/maxCount)*100}%`, background:catColors[t.cat], opacity:0.84 }} />
                <span style={{ position:'absolute', left:`${(t.count/maxCount)*100}%`, marginLeft:7, top:'50%', transform:'translateY(-50%)', fontSize:12, fontWeight:700, color:catColors[t.cat] }}>{t.count}</span>
              </div>
            </div>
          ))}
        </div>
        <Narrative>
          Connection and throughness (13), softness and lightness in aids (12), and rider body awareness (11) dominate your training attention —
          the hallmarks of classical GP-level riding. The jaw tension pattern with Rocket Star (8, in red) stands directly against
          your breakthrough work on allowing vs. doing (9, in green). These aren't separate threads. They're the same thread, seen from both ends.
        </Narrative>
        <VoiceCallout voice="Technical Coach">
          You've logged the jaw tension pattern eight times and the 'allowing vs. doing' insight nine times.
          These numbers are not coincidental. The jaw opens when you stop holding —
          the data is telling you what you already know but haven't fully internalized.
        </VoiceCallout>
      </Card>

      {/* 2b: Process Goal Adherence */}
      <Card>
        <ChartTitle icon="✅" title="Process Goal Adherence — Weekly Trend"
          subtitle="How consistently you executed on your confirmed process goals each week. The green bar has grown from 30% to 65% in eight weeks." />
        <div style={{ display:'flex', gap:16, marginBottom:14, flexWrap:'wrap' }}>
          {[['Fully',adhColors.fully],['Mostly',adhColors.mostly],['Somewhat',adhColors.somewhat],['Not at all',adhColors.notAtAll]].map(([label,color]) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:P.light }}>
              <div style={{ width:11, height:11, borderRadius:2, background:color }} /> {label}
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={adherenceData} margin={{ top:5, right:20, left:10, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${P.border}AA`} />
            <XAxis dataKey="week" tick={{ fontSize:11, fill:P.light }} />
            <YAxis tick={{ fontSize:11, fill:P.light }}
              label={{ value:'% of goals', angle:-90, position:'insideLeft', fontSize:11, fill:P.light }} />
            <Tooltip content={<AdhTooltip />} />
            <Bar dataKey="notAtAll" stackId="a" fill={adhColors.notAtAll} name="Not at all" />
            <Bar dataKey="somewhat"  stackId="a" fill={adhColors.somewhat}  name="Somewhat" />
            <Bar dataKey="mostly"    stackId="a" fill={adhColors.mostly}    name="Mostly" />
            <Bar dataKey="fully"     stackId="a" fill={adhColors.fully}     name="Fully" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        <Narrative>
          Eight weeks ago, 30% of your confirmed process goals were fully executed. This week: 65%.
          The improvement is consistent — no single-week spike — which means this is behavioral change, not circumstance.
          The 'not at all' category has nearly disappeared (10% → 3%), and your goals are becoming more realistic as well as more achievable.
        </Narrative>
        <VoiceCallout voice="Practical Strategist">
          A 35-point improvement in full execution in 8 weeks is not a small number. Most riders set goals and forget them between rides.
          You're closing the loop — intention to execution to rating. That cycle is what builds a training practice
          rather than a series of unconnected sessions.
        </VoiceCallout>
      </Card>
    </>
  );
}

// ─── SECTION 3: THE JOURNEY ───────────────────────────────────────────────────

const starPath = (cx, cy, outerR, innerR) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${cx + Math.cos(angle)*r},${cy + Math.sin(angle)*r}`);
  }
  return `M ${pts.join(' L ')} Z`;
};

const MilestonePath = ({ goal }) => {
  const W=580, H=160, sx=50, ex=W-50, ty=72, tw=ex-sx;
  const px = sx + (goal.progress/100)*tw;
  const ms = goal.milestones;
  const positions = ms.map((m,i) => ({
    ...m,
    x: sx + (0.05 + (i/Math.max(ms.length-1,1))*0.74)*tw,
    above: i%2===0,
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', overflow:'visible', display:'block', marginBottom:4 }}>
      <line x1={sx} y1={ty} x2={ex} y2={ty} stroke={P.border} strokeWidth={4} strokeLinecap="round" />
      <line x1={sx} y1={ty} x2={px} y2={ty} stroke={goal.color} strokeWidth={5} strokeLinecap="round" />
      <circle cx={sx} cy={ty} r={6} fill={goal.color} />
      <text x={sx} y={ty+18} textAnchor="middle" fontSize={9} fill={P.light}>Start</text>
      <circle cx={ex} cy={ty} r={14} fill="white" stroke={goal.color} strokeWidth={2.5} />
      <text x={ex} y={ty+4} textAnchor="middle" fontSize={8} fill={goal.color} fontWeight="700">GOAL</text>
      <line x1={px} y1={ty-17} x2={px} y2={ty+17} stroke={goal.color} strokeWidth={1.5} strokeDasharray="3,2" opacity={0.6} />
      <rect x={px-14} y={ty-31} width={28} height={15} rx={3} fill={goal.color} />
      <text x={px} y={ty-20} textAnchor="middle" fontSize={10} fill="white" fontWeight="700">{goal.progress}%</text>
      {positions.map((m,i) => {
        const ab=m.above, r=m.type==='breakthrough'?9:6;
        const fc=m.type==='foundation'?P.tan:goal.color;
        return (
          <g key={i}>
            <line x1={m.x} y1={ab?ty-r-1:ty+r+1} x2={m.x} y2={ab?ty-r-11:ty+r+11} stroke={fc} strokeWidth={1} opacity={0.4} />
            {m.type==='breakthrough'
              ? <path d={starPath(m.x,ty,r,r*0.42)} fill={fc} />
              : <circle cx={m.x} cy={ty} r={r} fill={fc} fillOpacity={0.75} />}
            {m.date && <text x={m.x} y={ab?ty-r-6:ty+r+14} textAnchor="middle" fontSize={8} fill={P.gold} fontWeight="600">{m.date}</text>}
          </g>
        );
      })}
      <path d={starPath(sx+8,H-12,7,3)} fill={P.light} opacity={0.55} />
      <text x={sx+19} y={H-7} fontSize={9} fill={P.light}>Breakthrough</text>
      <circle cx={sx+110} cy={H-12} r={5} fill={P.light} fillOpacity={0.45} />
      <text x={sx+121} y={H-7} fontSize={9} fill={P.light}>Incremental</text>
      <circle cx={sx+205} cy={H-12} r={5} fill={P.tan} fillOpacity={0.6} />
      <text x={sx+216} y={H-7} fontSize={9} fill={P.light}>Foundation</text>
    </svg>
  );
};

function Section3() {
  const getCellStyle = (cat, count) => {
    const color = RC[cat];
    if (count===0) return { bg:`${P.border}55`, text:P.border };
    const alpha = count===1?0.28:count===2?0.62:0.88;
    return { bg:hexToRgba(color,alpha), text:count>=2?'white':color };
  };
  const rowTotals = catOrder.map(cat => heatmap[cat].reduce((a,b)=>a+b,0));

  return (
    <>
      <SectionIntro
        title="The Journey"
        description="Where you're headed and what you've built to get there. Goal progress tracks your two declared destinations. Reflection balance shows the full texture of your training life — including what you might be avoiding documenting."
      />

      {/* 3a: Goal Progress */}
      {goals.map(goal => (
        <Card key={goal.id}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <h3 style={{ margin:0, fontFamily:'"Playfair Display",Georgia,serif', fontSize:16, color:P.ink, lineHeight:1.4, flex:1 }}>{goal.title}</h3>
            <span style={{ fontSize:26, fontWeight:700, color:goal.color, fontFamily:'"Playfair Display",serif', marginLeft:18, flexShrink:0 }}>{goal.progress}%</span>
          </div>
          <div style={{ height:5, background:P.border, borderRadius:3, marginBottom:20, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${goal.progress}%`, background:goal.color, borderRadius:3 }} />
          </div>
          <MilestonePath goal={goal} />
          <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:8 }}>
            {goal.milestones.map((m,i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:13 }}>
                <div style={{ padding:'2px 7px', borderRadius:3, fontSize:9.5, fontWeight:700, letterSpacing:'0.5px',
                  background:`${m.type==='foundation'?P.tan:goal.color}18`, color:m.type==='foundation'?P.tan:goal.color,
                  border:`1px solid ${m.type==='foundation'?P.tan:goal.color}44`, flexShrink:0, marginTop:1,
                }}>{m.type.toUpperCase()}</div>
                <span style={{ color:P.light, lineHeight:1.55, flex:1 }}>{m.label}</span>
                {m.date && <span style={{ color:P.gold, fontSize:11, flexShrink:0, marginTop:2 }}>{m.date}</span>}
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, padding:'12px 16px', background:`${goal.color}0D`, borderRadius:8, borderLeft:`3px solid ${goal.color}55` }}>
            <div style={{ fontSize:10, fontWeight:700, color:goal.color, marginBottom:5, letterSpacing:'0.6px' }}>NEXT</div>
            <p style={{ margin:0, fontSize:13, color:P.light, lineHeight:1.65 }}>{goal.next}</p>
          </div>
          <VoiceCallout voice={goal.voice}>{goal.voiceText}</VoiceCallout>
        </Card>
      ))}

      {/* 3b: Reflection Balance */}
      <Card>
        <ChartTitle icon="🗓️" title="Reflection Category Balance — 8 Weeks"
          subtitle="Which categories you've engaged with each week. Deeper color = more entries. An absent cell is as meaningful as a full one." />
        <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:16 }}>
          {catOrder.map(cat => (
            <div key={cat} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:RC[cat] }} />
              <span style={{ color:RC[cat], fontWeight:600 }}>{cat}</span>
            </div>
          ))}
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ borderCollapse:'separate', borderSpacing:'3px 3px', minWidth:520 }}>
            <thead>
              <tr>
                <th style={{ width:165, textAlign:'right', paddingRight:12, fontSize:11, color:P.light, fontWeight:400, paddingBottom:8 }}>Category</th>
                {weeks.map(w => (
                  <th key={w} style={{ width:50, textAlign:'center', fontSize:10.5, color:P.light, fontWeight:400, paddingBottom:8, whiteSpace:'nowrap' }}>{w}</th>
                ))}
                <th style={{ width:44, textAlign:'center', fontSize:10.5, color:P.light, fontWeight:400, paddingBottom:8 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {catOrder.map((cat,i) => (
                <tr key={cat}>
                  <td style={{ textAlign:'right', paddingRight:12, fontSize:12.5, color:RC[cat], fontWeight:600, paddingBottom:3, whiteSpace:'nowrap' }}>{cat}</td>
                  {heatmap[cat].map((count,j) => {
                    const cs = getCellStyle(cat,count);
                    return (
                      <td key={j} style={{ padding:'0 0 3px 0' }}>
                        <div style={{ width:46, height:32, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', background:cs.bg, fontSize:13, fontWeight:700, color:cs.text }}>
                          {count>0?count:''}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ textAlign:'center', fontSize:13, fontWeight:700, color:RC[cat], paddingLeft:10 }}>{rowTotals[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Narrative>
          <span style={{ color:RC['Aha Moment'], fontWeight:600 }}>Aha Moment</span> is your most consistent category — you're actively tracking insight.{' '}
          <span style={{ color:RC['Obstacle'], fontWeight:600 }}>Obstacle</span> has gone unrecorded for four consecutive weeks.
          That's not necessarily because no obstacles occurred — Rocket Star's lameness, the jaw resistance pattern, and the confidence gap all qualify.
          It may signal a reluctance to frame difficulty as <span style={{ color:RC['Obstacle'] }}>obstacle</span> material.{' '}
          <span style={{ color:RC['External Validation'], fontWeight:600 }}>External Validation</span> appears in alternate weeks only — healthy independence, but you may be undercapturing it when it does arrive.
        </Narrative>
        <VoiceCallout voice="Empathetic Coach">
          The <span style={{ color:RC['Obstacle'] }}>Obstacle</span> category isn't about what went wrong —
          it's about what you're learning to navigate. Four weeks without one doesn't mean four weeks without challenge.
          It might mean four weeks of labeling challenges as something else, and letting them disappear before they can teach you anything.
        </VoiceCallout>
      </Card>
    </>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id:'quality',   label:'Ride Quality Indicators', count:5 },
  { id:'outcomes',  label:'Ride Outcomes',           count:2 },
  { id:'journey',   label:'The Journey',             count:3 },
];

export default function YDJInsights() {
  const [section, setSection] = useState('quality');

  return (
    <div style={{ fontFamily:'Work Sans,system-ui,sans-serif', background:P.parchment, minHeight:'100vh', padding:'0 0 40px' }}>
      {/* Page header */}
      <div style={{ background:P.bg, borderBottom:`1px solid ${P.border}`, padding:'18px 24px 0' }}>
        <div style={{ maxWidth:780, margin:'0 auto' }}>
          <div style={{ marginBottom:14 }}>
            <h1 style={{ margin:'0 0 4px', fontFamily:'"Playfair Display",Georgia,serif', fontSize:22, color:P.ink, fontWeight:600 }}>
              Insights
            </h1>
            <p style={{ margin:0, fontSize:12.5, color:P.light }}>Your Dressage Journey · Barb's Data · April 2026</p>
          </div>
          {/* Section nav */}
          <div style={{ display:'flex', gap:0 }}>
            {SECTIONS.map((s,i) => (
              <button key={s.id} onClick={() => setSection(s.id)} style={{
                padding:'10px 18px', cursor:'pointer', fontSize:13, border:'none',
                fontFamily:'inherit', background:'transparent',
                color: section===s.id ? P.ink : P.light,
                fontWeight: section===s.id ? 600 : 400,
                borderBottom: section===s.id ? `2px solid ${P.gold}` : '2px solid transparent',
                borderRadius: 0, whiteSpace:'nowrap',
              }}>
                {s.label}
                <span style={{ marginLeft:6, fontSize:10.5, color:section===s.id?P.gold:P.gray,
                  background:`${P.border}88`, padding:'1px 5px', borderRadius:8 }}>
                  {s.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:780, margin:'0 auto', padding:'24px 18px 0' }}>
        {section==='quality'  && <Section1 />}
        {section==='outcomes' && <Section2 />}
        {section==='journey'  && <Section3 />}
      </div>
    </div>
  );
}
