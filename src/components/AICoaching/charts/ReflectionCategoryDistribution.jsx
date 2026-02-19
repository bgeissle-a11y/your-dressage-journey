/**
 * Chart 9: Reflection Category Distribution
 * Radar chart showing count per reflection category.
 */

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="dv-tooltip">
      <p><strong>{d.category}</strong></p>
      <p>{d.value} reflection{d.value !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function ReflectionCategoryDistribution({ data }) {
  if (!data || data.length === 0 || data.every(d => d.value === 0)) {
    return <p className="dv-no-data">No reflection data yet. Submit weekly reflections to see this chart!</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#E0D5C7" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fontSize: 12, fontFamily: 'Work Sans', fill: '#3A3A3A' }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 'auto']}
          tick={{ fontSize: 10, fill: '#7A7A7A' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Radar
          name="Reflections"
          dataKey="value"
          stroke="#8B7355"
          fill="#D4A574"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
