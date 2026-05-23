/**
 * ActivityFeed – recent events panel.
 *
 * TODO: Replace MOCK_EVENTS with a real API call once the
 *       `/api/events` endpoint is available in the edge-server.
 */

import React, { useEffect, useState } from 'react';

export type EventKind = 'info' | 'warning' | 'success' | 'error';

export interface ActivityEvent {
  id:        string;
  kind:      EventKind;
  title:     string;
  detail?:   string;
  timestamp: string;
}

const KIND_META: Record<EventKind, { icon: string; color: string }> = {
  info:    { icon: 'ℹ',  color: '#38bdf8' },
  warning: { icon: '⚠',  color: '#fb923c' },
  success: { icon: '✔',  color: '#4ade80' },
  error:   { icon: '✖',  color: '#f87171' },
};

// TODO: Remove once the `/api/events` endpoint is implemented.
const MOCK_EVENTS: ActivityEvent[] = [
  {
    id: '1', kind: 'success',
    title:  'Relay turned ON',
    detail: 'esp32_meter_01 – manual override',
    timestamp: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: '2', kind: 'warning',
    title:  'Power spike detected',
    detail: 'esp32_meter_01 – 1,247 W (threshold 1,000 W)',
    timestamp: new Date(Date.now() - 8 * 60_000).toISOString(),
  },
  {
    id: '3', kind: 'info',
    title:  'Device connected',
    detail: 'esp32_meter_02 joined the network',
    timestamp: new Date(Date.now() - 15 * 60_000).toISOString(),
  },
  {
    id: '4', kind: 'success',
    title:  'NILM model updated',
    detail: 'ml-pipeline v2.1.0 deployed',
    timestamp: new Date(Date.now() - 35 * 60_000).toISOString(),
  },
  {
    id: '5', kind: 'error',
    title:  'InfluxDB connection lost',
    detail: 'Reconnect attempt 3 of 10',
    timestamp: new Date(Date.now() - 62 * 60_000).toISOString(),
  },
  {
    id: '6', kind: 'info',
    title:  'Scheduled report generated',
    detail: 'Daily summary – sent to admin',
    timestamp: new Date(Date.now() - 90 * 60_000).toISOString(),
  },
];

function formatRelative(iso: string): string {
  const diffMs   = Date.now() - new Date(iso).getTime();
  const diffMins = Math.round(diffMs / 60_000);
  if (diffMins < 1)  return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.round(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.round(diffHrs / 24)}d ago`;
}

interface ActivityFeedProps {
  maxItems?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ maxItems = 6 }) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    // TODO: Fetch real events from `/api/events` when the endpoint exists.
    // axios.get('/api/events').then((res) => setEvents(res.data.events ?? [])).catch(() => {});
    setEvents(MOCK_EVENTS.slice(0, maxItems));
  }, [maxItems]);

  return (
    <div style={styles.container} role="log" aria-live="polite" aria-label="Recent activity">
      {events.length === 0 && (
        <p style={styles.empty}>No recent events.</p>
      )}
      {events.map((ev) => {
        const meta = KIND_META[ev.kind];
        return (
          <div key={ev.id} style={styles.item}>
            <span
              style={{ ...styles.dot, background: `${meta.color}22`, color: meta.color }}
              aria-hidden="true"
            >
              {meta.icon}
            </span>
            <div style={styles.text}>
              <p style={styles.title}>{ev.title}</p>
              {ev.detail && <p style={styles.detail}>{ev.detail}</p>}
            </div>
            <time dateTime={ev.timestamp} style={styles.time} title={new Date(ev.timestamp).toLocaleString()}>
              {formatRelative(ev.timestamp)}
            </time>
          </div>
        );
      })}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#18181b', // Zinc-900
    borderRadius: 6, // Sharper, professional radius
    border: '1px solid #27272a', // Zinc-800
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  empty: {
    padding: '32px 20px',
    color: '#52525b', // Zinc-500
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  item: {
    display: 'flex',
    alignItems: 'center', // Centered for cleaner alignment of single-line events
    gap: 12,
    padding: '10px 16px',
    borderBottom: '1px solid #27272a', // Using the subtle border color
    background: 'transparent',
    transition: 'background 0.1s ease',
    cursor: 'pointer',
  },
  /* The "Dot" now acts as a technical status indicator or icon container */
  dot: {
    width: 28,
    height: 28,
    borderRadius: 4, // More squared/engineered look
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    // Note: Background should be dynamic (e.g., Emerald for OK, Red for Alert)
    // Professional tools often use 15% opacity backgrounds with 100% opacity text
    background: 'rgba(16, 185, 129, 0.1)', 
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  text: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: 500, // Medium weight is cleaner than Bold for dense lists
    color: '#f4f4f5', // Zinc-100
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    letterSpacing: '-0.01em',
  },
  detail: {
    fontSize: 12,
    color: '#71717a', // Zinc-400
    marginTop: 0, // Tightened
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  time: {
    fontSize: 11,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', // Monospace feels "log-like"
    color: '#52525b', // Zinc-500
    flexShrink: 0,
    whiteSpace: 'nowrap',
    paddingLeft: 8,
  },
};
