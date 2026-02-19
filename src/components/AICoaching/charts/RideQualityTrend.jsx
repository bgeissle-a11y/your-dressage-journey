/**
 * Chart 1: Ride Quality Trend
 * Line chart showing ride quality over time with a 3-ride rolling average.
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
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
      <p><strong>Quality:</strong> {d.quality}/10</p>
      <p><strong>3-Ride Avg:</strong> {d.rollingAvg}/10</p>
      {d.horse && <p><strong>Horse:</strong> {d.horse}</p>}
      {d.mentalState && <p><strong>Mental State:</strong> {d.mentalState}</p>}
    </div>
  );
}

export default function RideQualityTrend({ data }) {
  if (!data || data.length === 0) {
    return <p className="dv-no-data">No ride quality data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
        <Line
          type="monotone"
          dataKey="quality"
          stroke="#D4A574"
          strokeWidth={1.5}
          dot={{ fill: '#D4A574', r: 3 }}
          name="Ride Quality"
        />
        <Line
          type="monotone"
          dataKey="rollingAvg"
          stroke="#8B7355"
          strokeWidth={2.5}
          dot={false}
          strokeDasharray="5 5"
          name="3-Ride Average"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
