/**
 * DeviceTable – searchable, sortable device list.
 *
 * TODO: Replace MOCK_DEVICES with real data from
 *       `/api/devices` (extended payload with status & metrics)
 *       once the edge-server endpoint is updated.
 */

import React, { useState, useMemo } from 'react';

type SortKey = 'id' | 'status' | 'power_w' | 'energy_wh';
type SortDir = 'asc' | 'desc';

export interface DeviceRow {
  id:          string;
  status:      'online' | 'offline' | 'warning';
  power_w:     number;
  energy_wh:   number;
  last_seen:   string;  // ISO string
}

// TODO: Remove once real API returns extended device list.
const MOCK_DEVICES: DeviceRow[] = [
  { id: 'esp32_meter_01', status: 'online',  power_w: 428.3,  energy_wh: 514.2,  last_seen: new Date(Date.now() - 5_000).toISOString() },
  { id: 'esp32_meter_02', status: 'online',  power_w: 312.7,  energy_wh: 389.0,  last_seen: new Date(Date.now() - 12_000).toISOString() },
  { id: 'esp32_meter_03', status: 'warning', power_w: 0,      energy_wh: 210.5,  last_seen: new Date(Date.now() - 4 * 60_000).toISOString() },
  { id: 'esp32_meter_04', status: 'offline', power_w: 0,      energy_wh: 0,      last_seen: new Date(Date.now() - 25 * 60_000).toISOString() },
  { id: 'esp32_meter_05', status: 'online',  power_w: 745.1,  energy_wh: 812.9,  last_seen: new Date(Date.now() - 2_000).toISOString() },
];

const STATUS_META: Record<DeviceRow['status'], { label: string; color: string; bg: string }> = {
  online:  { label: 'Online',  color: '#4ade80', bg: '#14532d33' },
  offline: { label: 'Offline', color: '#f87171', bg: '#7f1d1d33' },
  warning: { label: 'Warning', color: '#fb923c', bg: '#7c2d1233' },
};

function sortRows(rows: DeviceRow[], key: SortKey, dir: SortDir): DeviceRow[] {
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === 'asc' ? cmp : -cmp;
  });
}

function formatPower(w: number): string {
  return w > 0 ? `${w.toFixed(1)} W` : '–';
}

function formatEnergy(wh: number): string {
  return wh > 0 ? `${wh.toFixed(1)} Wh` : '–';
}

function formatSeen(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.round(diffMs / 1000);
  if (s < 60)       return `${s}s ago`;
  if (s < 3600)     return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

interface DeviceTableProps {
  /** If provided, uses live-connected device IDs to mark as online. */
  liveDeviceIds?: string[];
}

export const DeviceTable: React.FC<DeviceTableProps> = ({ liveDeviceIds }) => {
  const [query,   setQuery]   = useState('');
  const [filter,  setFilter]  = useState<'all' | DeviceRow['status']>('all');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const rows = useMemo(() => {
    // TODO: Merge with real API data when available.
    let base = liveDeviceIds
      ? MOCK_DEVICES.map((d) => ({
          ...d,
          status: liveDeviceIds.includes(d.id) ? ('online' as const) : d.status,
        }))
      : MOCK_DEVICES;

    if (query)         base = base.filter((d) => d.id.toLowerCase().includes(query.toLowerCase()));
    if (filter !== 'all') base = base.filter((d) => d.status === filter);
    return sortRows(base, sortKey, sortDir);
  }, [query, filter, sortKey, sortDir, liveDeviceIds]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon: React.FC<{ col: SortKey }> = ({ col }) => {
    if (sortKey !== col) return <span style={styles.sortIconInactive} aria-hidden="true">⇅</span>;
    return <span style={styles.sortIconActive} aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div className="table-toolbar">
        <input
          type="search"
          placeholder="Search devices…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search devices"
          style={styles.search}
        />
        <div style={styles.filters} role="group" aria-label="Filter by status">
          {(['all', 'online', 'offline', 'warning'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              style={{
                ...styles.filterBtn,
                background: filter === f ? '#334155' : 'transparent',
                color:      filter === f ? '#e2e8f0' : '#94a3b8',
              }}
            >
              {f === 'all' ? 'All' : STATUS_META[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableWrapper} role="region" aria-label="Device list">
        <table style={styles.table}>
          <thead>
            <tr>
              {(
                [
                  { key: 'id',        label: 'Device ID'    },
                  { key: 'status',    label: 'Status'       },
                  { key: 'power_w',   label: 'Live Power'   },
                  { key: 'energy_wh', label: 'Today Energy' },
                ] as const
              ).map(({ key, label }) => (
                <th
                  key={key}
                  style={styles.th}
                  onClick={() => toggleSort(key)}
                  aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleSort(key)}
                >
                  {label} <SortIcon col={key} />
                </th>
              ))}
              <th style={styles.th}>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={styles.empty}>No devices match your filters.</td>
              </tr>
            )}
            {rows.map((d) => {
              const meta = STATUS_META[d.status];
              return (
                <tr key={d.id} style={styles.tr}>
                  <td style={styles.td}>
                    <code style={styles.deviceId}>{d.id}</code>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, color: meta.color, background: meta.bg }}>
                      {meta.label}
                    </span>
                  </td>
                  <td style={styles.td}>{formatPower(d.power_w)}</td>
                  <td style={styles.td}>{formatEnergy(d.energy_wh)}</td>
                  <td style={{ ...styles.td, color: '#64748b' }}>{formatSeen(d.last_seen)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={styles.note}>⚠ Sample data – live metrics will replace these rows once the API is extended.</p>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#18181b', // Zinc-900
    borderRadius: 6,
    border: '1px solid #27272a', // Zinc-800
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
  },
  tableWrapper: {
    overflowX: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#3f3f46 #09090b',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12, // Reduced for data density
    lineHeight: '1.2',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    background: '#09090b', // Darker "Pinned" header look
    color: '#71717a', // Zinc-400
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '2px solid #27272a',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  tr: {
    borderBottom: '1px solid #27272a',
    transition: 'background 0.1s ease',
    // Pro Tip: Apply background: 'rgba(255,255,255,0.02)' to even rows for zebra striping
  },
  td: {
    padding: '10px 16px',
    color: '#e4e4e7', // Zinc-200
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #27272a',
  },
  empty: {
    padding: '40px 16px',
    textAlign: 'center',
    color: '#52525b', // Zinc-500
    fontSize: 13,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 4, // Squared for "Industrial" feel
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    display: 'inline-block',
  },
  deviceId: {
    fontFamily: 'ui-monospace, SFMono-Regular, "Roboto Mono", monospace',
    fontSize: 12,
    color: '#34d399', // Emerald-400 (The "Live" ID color)
    fontWeight: 500,
  },
  search: {
    background: '#09090b', // Inset/recessed look
    border: '1px solid #3f3f46', // Zinc-700
    borderRadius: 4,
    padding: '6px 12px',
    fontSize: 13,
    color: '#fafafa',
    outline: 'none',
    flex: 1,
    minWidth: 140,
    transition: 'border-color 0.2s',
  },
  filters: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterBtn: {
    background: '#27272a',
    border: '1px solid #3f3f46',
    color: '#a1a1aa',
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  sortIconInactive: {
    color: '#3f3f46', // Zinc-700
    fontSize: 10,
    marginLeft: 6,
  },
  sortIconActive: {
    color: '#10b981', // Emerald-500
    fontSize: 10,
    marginLeft: 6,
  },
  note: {
    padding: '8px 16px',
    fontSize: 11,
    color: '#52525b', // Zinc-500
    background: '#09090b',
    borderTop: '1px solid #27272a',
  },
};
