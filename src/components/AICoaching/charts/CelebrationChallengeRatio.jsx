/**
 * Chart 8: Celebration vs Challenge Ratio
 * Bar chart comparing content proportions between wins and challenges.
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
      <p><strong>{d.name}</strong></p>
      <p>{d.contentPct}% of written content</p>
      <p>Recorded in {d.rideCount} ride{d.rideCount !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function CelebrationChallengeRatio({ data }) {
  if (!data || data.length === 0) {
    return <p className="dv-no-data">No celebration/challenge data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" />
        <XAxis
          dataKey="name"
          stroke="#7A7A7A"
          fontSize={12}
          fontFamily="Work Sans"
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          stroke="#7A7A7A"
          fontSize={12}
          fontFamily="Work Sans"
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="contentPct" name="Content %" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
