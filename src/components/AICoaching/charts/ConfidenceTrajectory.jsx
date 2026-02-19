/**
 * Chart 7: Confidence Trajectory
 * Area chart showing confidence level over time with rolling average.
 */

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="dv-tooltip">
      <p className="dv-tooltip__date">{formatDate(d.date)}</p>
      <p><strong>Confidence:</strong> {d.confidence}/10</p>
      <p><strong>3-Ride Avg:</strong> {d.rollingAvg}/10</p>
      {d.horse && <p><strong>Horse:</strong> {d.horse}</p>}
      {d.sessionType && <p><strong>Session:</strong> {d.sessionType}</p>}
    </div>
  );
}

export default function ConfidenceTrajectory({ data }) {
  if (!data || data.length === 0) {
    return <p className="dv-no-data">No confidence data yet. Rate your confidence in your debriefs!</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4A574" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#D4A574" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="#7A7A7A"
          fontSize={12}
          fontFamily="Work Sans"
        />
        <YAxis domain={[1, 10]} stroke="#7A7A7A" fontSize={12} fontFamily="Work Sans" />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontFamily: 'Work Sans', fontSize: '0.85rem' }} />
        <Area
          type="monotone"
          dataKey="confidence"
          stroke="#D4A574"
          fill="url(#confidenceGradient)"
          strokeWidth={1.5}
          dot={{ fill: '#D4A574', r: 3 }}
          name="Confidence"
        />
        <Area
          type="monotone"
          dataKey="rollingAvg"
          stroke="#8B7355"
          fill="none"
          strokeWidth={2.5}
          strokeDasharray="5 5"
          dot={false}
          name="3-Ride Average"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
