/**
 * Chart 3: Quality by Mental State
 * Bar chart showing average ride quality grouped by mental state.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="dv-tooltip">
      <p><strong>{d.state}</strong></p>
      <p>Avg Quality: {d.avgQuality}/10</p>
      <p>{d.rideCount} ride{d.rideCount !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function QualityByMentalState({ data }) {
  if (!data || data.length === 0) {
    return <p className="dv-no-data">No quality data by mental state yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" />
        <XAxis
          dataKey="state"
          stroke="#7A7A7A"
          fontSize={12}
          fontFamily="Work Sans"
        />
        <YAxis
          domain={[0, 10]}
          stroke="#7A7A7A"
          fontSize={12}
          fontFamily="Work Sans"
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="avgQuality" name="Avg Quality" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
