/**
 * EnergyHistoryChart – daily energy bar chart (last 7 days).
 *
 * TODO: Replace MOCK_DATA with a real API call once the
 *       `/api/devices/:id/history?range=-7d&bucket=1d` endpoint returns
 *       aggregated daily totals.
 */

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DailyEnergy {
  day:      string;   // e.g. "Mon"
  energy_wh: number;
}

interface EnergyHistoryChartProps {
  deviceId: string;
}

// Generates deterministic mock daily energy data seeded by the device string.
// TODO: Remove once real API data is available.
function buildMockData(seed: string): DailyEnergy[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now   = new Date();
  const base  = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d   = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const pseudo = ((base * (i + 1) * 1234567) % 800) + 200; // 200–999 Wh range
    return { day: days[d.getDay()], energy_wh: Math.round(pseudo) };
  });
}

export const EnergyHistoryChart: React.FC<EnergyHistoryChartProps> = ({ deviceId }) => {
  const [data, setData] = useState<DailyEnergy[]>([]);

  useEffect(() => {
    setData(buildMockData(deviceId)); // Immediate mock render

    // TODO: Uncomment once the API supports aggregated daily totals.
    // axios.get(`/api/devices/${deviceId}/history`, { params: { range: '-7d', bucket: '1d' } })
    //   .then((res) => {
    //     const rows: { time: string; energy_wh: number }[] = res.data.data ?? [];
    //     if (rows.length > 0) {
    //       const mapped = rows.map((r) => ({
    //         day:       new Date(r.time).toLocaleDateString('en', { weekday: 'short' }),
    //         energy_wh: Math.round(r.energy_wh),
    //       }));
    //       setData(mapped);
    //     }
    //   })
    //   .catch(() => { /* keep mock data */ });
  }, [deviceId]);

  const peak = Math.max(...data.map((d) => d.energy_wh), 1);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>7-Day Energy History (Wh)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" Wh" axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: '#334155' }}
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(v: number) => [`${v} Wh`, 'Energy']}
          />
          <Bar dataKey="energy_wh" name="Energy" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.day}
                fill={entry.energy_wh === peak ? '#38bdf8' : '#2563eb'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={styles.note}>⚠ Sample data – replace with live API once available.</p>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
	container: {
		background: '#18181b', // Zinc-900
		borderRadius: 6,
		border: '1px solid #27272a', // Zinc-800
		padding: '16px',
		boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
	},
	title: {
		marginBottom: 16,
		color: '#fafafa', // Zinc-50
		fontSize: 13,
		fontWeight: 600,
		textAlign: 'center',
	},
	note: {
		marginTop: 12,
		color: '#64748b', // Zinc-500
		fontSize: 11,
		textAlign: 'center',
	},
};
