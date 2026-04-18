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
    background:   '#1e293b',
    borderRadius: 10,
    border:       '1px solid #334155',
    overflow:     'hidden',
  },
  empty: {
    padding: '24px 20px',
    color:   '#64748b',
    fontSize: 13,
  },
  item: {
    display:    'flex',
    alignItems: 'flex-start',
    gap:        12,
    padding:    '12px 16px',
    borderBottom: '1px solid #1e293b',
    background: 'transparent',
    transition: 'background 0.15s',
  },
  dot: {
    width:          30,
    height:         30,
    borderRadius:   8,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       14,
    flexShrink:     0,
    marginTop:      1,
  },
  text: {
    flex:    1,
    minWidth: 0,
  },
  title: {
    fontSize:  13,
    fontWeight: 600,
    color:     '#e2e8f0',
    whiteSpace: 'nowrap',
    overflow:  'hidden',
    textOverflow: 'ellipsis',
  },
  detail: {
    fontSize:  12,
    color:     '#94a3b8',
    marginTop: 1,
    whiteSpace: 'nowrap',
    overflow:  'hidden',
    textOverflow: 'ellipsis',
  },
  time: {
    fontSize:  11,
    color:     '#64748b',
    flexShrink: 0,
    paddingTop: 2,
    whiteSpace: 'nowrap',
  },
};
