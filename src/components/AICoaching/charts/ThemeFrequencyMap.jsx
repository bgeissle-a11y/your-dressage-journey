/**
 * Chart 4: Theme Frequency Map
 * Horizontal bar chart showing AI-extracted themes from debrief narratives.
 * Shows loading state while AI is processing.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const SENTIMENT_COLORS = {
  positive: '#6B8E5F',
  negative: '#C67B5C',
  neutral: '#7A7A7A',
  mixed: '#D4A574',
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="dv-tooltip">
      <p><strong>{d.theme}</strong></p>
      <p>Appears in {d.count} debrief{d.count !== 1 ? 's' : ''}</p>
      <p>Sentiment: {d.sentiment}</p>
      {d.example_quotes?.[0] && (
        <p className="dv-tooltip__quote">"{d.example_quotes[0]}"</p>
      )}
    </div>
  );
}

export default function ThemeFrequencyMap({ data, loading }) {
  if (loading) {
    return (
      <div className="dv-chart-loading">
        <div className="spinner spinner--small" />
        <p>Analyzing your debrief themes...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="dv-no-data">Theme analysis will appear here once AI insights are generated.</p>;
  }

  // Sort by count descending, take top 12
  const chartData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map(d => ({
      ...d,
      fill: SENTIMENT_COLORS[d.sentiment] || '#8B7355',
    }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" horizontal={false} />
        <XAxis type="number" stroke="#7A7A7A" fontSize={12} fontFamily="Work Sans" />
        <YAxis
          type="category"
          dataKey="theme"
          width={140}
          stroke="#7A7A7A"
          fontSize={12}
          fontFamily="Work Sans"
          tick={{ width: 130 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="Occurrences" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
