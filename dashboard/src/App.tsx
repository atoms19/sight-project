/**
 * App – root component for the Sight dashboard.
 *
 * Layout (top-to-bottom):
 *   1. Header          – logo, subtitle, device selector, WS status
 *   2. KPI cards       – live power, today's energy, active devices, system health
 *   3. Charts section  – live power chart + side control panel
 *   4. Energy history  – 7-day bar chart
 *   5. Activity feed + Quick actions (side-by-side)
 *   6. Device table    – searchable / sortable device list
 *   7. Footer
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';

import { LiveChart }           from './components/LiveChart';
import { ControlPanel }        from './components/ControlPanel';
import { KpiCard }             from './components/KpiCard';
import { Section }             from './components/Section';
import { EnergyHistoryChart }  from './components/EnergyHistoryChart';
import { ActivityFeed }        from './components/ActivityFeed';
import { QuickActions }        from './components/QuickActions';
import { DeviceTable }         from './components/DeviceTable';
import { useWebSocket }        from './hooks/useWebSocket';

const DEFAULT_DEVICE = 'esp32_meter_01';

const App: React.FC = () => {
  const [deviceId, setDeviceId] = useState<string>(DEFAULT_DEVICE);
  const [devices,  setDevices]  = useState<string[]>([DEFAULT_DEVICE]);
  const [baseline, setBaseline] = useState<number>(0);

  const { data, status } = useWebSocket(
    deviceId,
    `${window.location.origin.replace(/^http/, 'ws')}`,
  );

  // ── Load device list ──────────────────────────────────────────────────────
  useEffect(() => {
    axios.get('/api/devices')
      .then((res) => {
        const devs: string[] = res.data.devices ?? [];
        if (devs.length > 0) setDevices(devs);
      })
      .catch(() => {/* API not yet available – use default */});
  }, []);

  // ── Rolling baseline (7-day avg) ──────────────────────────────────────────
  useEffect(() => {
    axios.get(`/api/devices/${deviceId}/history`, { params: { range: '-7d' } })
      .then((res) => {
        const rows: { power_w: number }[] = res.data.data ?? [];
        if (rows.length > 0) {
          const avg = rows.reduce((s, r) => s + r.power_w, 0) / rows.length;
          setBaseline(avg);
        }
      })
      .catch(() => {/* InfluxDB not reachable from browser – ok in dev */});
  }, [deviceId]);

  // ── Derived KPI values ────────────────────────────────────────────────────
  const livePower    = data ? data.power_w.toFixed(1)    : '–';
  const liveEnergy   = data ? data.energy_wh.toFixed(2)  : '–';
  const activeCount  = devices.length;
  const wsColor      = status === 'open' ? '#4ade80' : status === 'error' ? '#f87171' : '#fb923c';
  const wsLabel      = status === 'open' ? 'Healthy' : status === 'error' ? 'Error' : 'Reconnecting';

  return (
    <div style={styles.app}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={styles.header}>
        <div style={styles.headerBrand}>
          <span style={styles.logo} aria-label="Sight">⚡</span>
          <div>
            <h1 style={styles.logoText}>Sight</h1>
            <p style={styles.subtitle}>Edge-AI Building Optimiser</p>
          </div>
        </div>

        <nav style={styles.headerNav} aria-label="Dashboard navigation">
          <a href="#kpis"      className="nav-link" style={styles.navLink}>Overview</a>
          <a href="#charts"    className="nav-link" style={styles.navLink}>Charts</a>
          <a href="#activity"  className="nav-link" style={styles.navLink}>Activity</a>
          <a href="#devices"   className="nav-link" style={styles.navLink}>Devices</a>
        </nav>

        <div style={styles.headerControls}>
          <label htmlFor="device-select" style={styles.srOnly}>Select device</label>
          <select
            id="device-select"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            style={styles.select}
            aria-label="Active device"
          >
            {devices.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <span
            style={{ ...styles.wsBadge, color: wsColor, borderColor: `${wsColor}44` }}
            aria-label={`WebSocket status: ${wsLabel}`}
          >
            <span style={{ ...styles.wsDot, background: wsColor }} />
            {wsLabel}
          </span>
        </div>
      </header>

      {/* ── Main scrollable content ─────────────────────────────────────── */}
      <main style={styles.main}>

        {/* 1. KPI Overview ─────────────────────────────────────────────── */}
        <Section title="Overview" id="kpis">
          <div className="kpi-grid">
            <KpiCard
              icon="⚡"
              label="Live Power"
              value={livePower}
              unit=" W"
              subtext="Real-time from WebSocket"
              accentColor="#38bdf8"
            />
            <KpiCard
              icon="🔋"
              label="Today's Energy"
              value={liveEnergy}
              unit=" Wh"
              subtext="Cumulative since midnight"
              accentColor="#a78bfa"
            />
            <KpiCard
              icon="📡"
              label="Active Devices"
              value={activeCount}
              subtext={`${deviceId} selected`}
              accentColor="#4ade80"
            />
            <KpiCard
              icon="🛡"
              label="System Health"
              value={wsLabel}
              subtext={`WS: ${status}`}
              accentColor={wsColor}
            />
          </div>
        </Section>

        {/* 2. Live Chart + Control Panel ───────────────────────────────── */}
        <Section title="Live Monitoring" id="charts">
          <div className="main-grid">
            <LiveChart liveData={data} baseline={baseline} />
            <ControlPanel deviceId={deviceId} liveData={data} status={status} />
          </div>
        </Section>

        {/* 3. Energy History ───────────────────────────────────────────── */}
        <Section title="Energy History">
          <EnergyHistoryChart deviceId={deviceId} />
        </Section>

        {/* 4. Activity Feed + Quick Actions ────────────────────────────── */}
        <div className="bottom-grid" id="activity">
          <Section title="Recent Activity" badge={6}>
            <ActivityFeed maxItems={6} />
          </Section>

          <Section title="Quick Actions">
            <div style={styles.quickWrapper}>
              <QuickActions deviceId={deviceId} />
            </div>
          </Section>
        </div>

        {/* 5. Device Table ─────────────────────────────────────────────── */}
        <Section title="Devices" id="devices" badge={devices.length}>
          <DeviceTable liveDeviceIds={[deviceId]} />
        </Section>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={styles.footer}>
        <span>Sight v1.0.0 · zero-cloud · edge-AI</span>
        <span>·</span>
        <a href="https://github.com/atoms19/sight-project" style={{ color: 'var(--color-text-muted)' }}>
          GitHub
        </a>
      </footer>
    </div>
  );
};

/* ── Inline styles (dark-mode, slate palette) ─────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight:     '100vh',
    display:       'flex',
    flexDirection: 'column',
    background:    '#0f172a',
  },

  /* Header */
  header: {
    display:        'flex',
    alignItems:     'center',
    gap:            16,
    padding:        '12px 24px',
    borderBottom:   '1px solid #1e293b',
    background:     '#0d1526',
    position:       'sticky',
    top:            0,
    zIndex:         10,
    flexWrap:       'wrap',
  },
  headerBrand: {
    display:    'flex',
    alignItems: 'center',
    gap:        10,
    flexShrink: 0,
  },
  logo: {
    fontSize:   28,
    lineHeight: 1,
  },
  logoText: {
    fontSize:   18,
    fontWeight: 800,
    color:      '#38bdf8',
    lineHeight: 1.1,
  },
  subtitle: {
    color:    '#475569',
    fontSize: 11,
  },
  headerNav: {
    display:  'flex',
    gap:      4,
    flex:     1,
    flexWrap: 'wrap',
  },
  navLink: {
    color:        '#64748b',
    fontSize:     13,
    fontWeight:   500,
    padding:      '4px 10px',
    borderRadius: 6,
    transition:   'color 0.15s, background 0.15s',
    textDecoration: 'none',
  },
  headerControls: {
    display:    'flex',
    alignItems: 'center',
    gap:        10,
    flexShrink: 0,
  },
  select: {
    background:   '#1e293b',
    color:        '#e2e8f0',
    border:       '1px solid #334155',
    borderRadius: 6,
    padding:      '6px 12px',
    fontSize:     13,
    outline:      'none',
  },
  wsBadge: {
    display:      'flex',
    alignItems:   'center',
    gap:          5,
    fontSize:     12,
    fontWeight:   600,
    border:       '1px solid',
    borderRadius: 99,
    padding:      '4px 10px',
  },
  wsDot: {
    width:        7,
    height:       7,
    borderRadius: '50%',
    display:      'inline-block',
  },

  /* Main content */
  main: {
    flex:          1,
    display:       'flex',
    flexDirection: 'column',
    gap:           28,
    padding:       '24px',
    maxWidth:      1400,
    width:         '100%',
    margin:        '0 auto',
    alignSelf:     'stretch',
  },

  quickWrapper: {
    background:   '#1e293b',
    border:       '1px solid #334155',
    borderRadius: 10,
    padding:      16,
  },

  srOnly: {
    position: 'absolute',
    width:    1,
    height:   1,
    padding:  0,
    margin:   -1,
    overflow: 'hidden',
    clip:     'rect(0,0,0,0)',
    border:   0,
  } as React.CSSProperties,

  /* Footer */
  footer: {
    padding:        '14px 24px',
    borderTop:      '1px solid #1e293b',
    color:          '#475569',
    fontSize:       12,
    display:        'flex',
    gap:            8,
    justifyContent: 'center',
    alignItems:     'center',
  },
};

export default App;
