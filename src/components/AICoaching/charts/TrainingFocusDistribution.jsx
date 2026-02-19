/**
 * Chart 6: Training Focus Distribution
 * Pie/donut chart showing movement tag counts grouped by category.
 */

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="dv-tooltip">
      <p><strong>{d.name}</strong></p>
      <p>{d.value} tag selection{d.value !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function TrainingFocusDistribution({ data }) {
  if (!data || data.length === 0) {
    return <p className="dv-no-data">No movement data yet. Tag your exercises in your debriefs!</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          labelLine={{ stroke: '#7A7A7A' }}
          fontSize={12}
          fontFamily="Work Sans"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontFamily: 'Work Sans', fontSize: '0.85rem' }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
