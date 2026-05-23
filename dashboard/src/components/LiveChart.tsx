/**
 * LiveChart – real-time power chart with a 7-day baseline reference line.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { LiveState } from '../hooks/useWebSocket';

interface DataPoint {
  time:     string;
  power_w:  number;
  baseline: number;
}

interface LiveChartProps {
  liveData:  LiveState | null;
  baseline?: number;
  maxPoints?: number;
}

const MAX_DEFAULT_POINTS = 60; // 60 s of history at 1 Hz

export const LiveChart: React.FC<LiveChartProps> = ({
  liveData,
  baseline = 0,
  maxPoints = MAX_DEFAULT_POINTS,
}) => {
  const [points, setPoints] = useState<DataPoint[]>([]);
  const prevDataRef = useRef<LiveState | null>(null);

  useEffect(() => {
    if (!liveData || liveData === prevDataRef.current) return;
    prevDataRef.current = liveData;

    const time = new Date(liveData.updated_at).toLocaleTimeString();
    setPoints((prev) => {
      const next = [
        ...prev,
        { time, power_w: liveData.power_w, baseline },
      ];
      return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
    });
  }, [liveData, baseline, maxPoints]);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Live Power (W)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={points} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" W" />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155' }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ color: '#e2e8f0' }} />
          {baseline > 0 && (
            <ReferenceLine
              y={baseline}
              stroke="#fb923c"
              strokeDasharray="6 3"
              label={{ value: '7-day avg', fill: '#fb923c', fontSize: 11 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="power_w"
            name="Power (W)"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
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
	},
	title: {
		color: '#e2e8f0',
		fontSize: 14,
		marginBottom: 12,
	},
};
