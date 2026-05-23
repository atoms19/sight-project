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
          <span style={styles.logo} aria-label="Sight"></span>
          <div>
            <h1 style={styles.logoText}>CODEX</h1>
            <p style={styles.subtitle}>Energy Monitoring System</p>
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
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    // Zinc-950: Deeper, more neutral professional black
    background: '#09090b', 
    color: '#fafafa',
    fontFamily: 'Inter, system-ui, sans-serif',
  },

  /* Header - Compact & High Contrast */
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    padding: '8px 20px', // Thinner header for more workspace
    borderBottom: '1px solid #27272a', // Zinc-800
    background: '#09090b',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    flexWrap: 'wrap',
  },
  headerBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  logo: {
    fontSize: 22,
    lineHeight: 1,
  },
  logoText: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#10b981', // Emerald-500: Standard for Energy/Go/Work
    textTransform: 'uppercase',
    lineHeight: 1.1,
  },
  subtitle: {
    color: '#71717a', // Zinc-400
    fontSize: 11,
    fontWeight: 500,
  },
  headerNav: {
    display: 'flex',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  navLink: {
    color: '#a1a1aa', // Zinc-400
    fontSize: 13,
    fontWeight: 500,
    padding: '6px 12px',
    borderRadius: 4,
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    border: '1px solid transparent',
  },
  // Note: For active state, use background: '#18181b' and color: '#fff'

  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  select: {
    background: '#18181b', // Zinc-900
    color: '#f4f4f5',
    border: '1px solid #3f3f46', // Zinc-700
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 12,
    outline: 'none',
    cursor: 'pointer',
  },
  
  /* Status Badges - Professional "Live" indicator */
  wsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 600,
    background: 'rgba(16, 185, 129, 0.1)', // Subtle Emerald tint
    color: '#34d399', 
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: 4,
    padding: '2px 8px',
    textTransform: 'uppercase',
  },
  wsDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 8px #10b981', // Subtle glow for "Online"
  },

  /* Main content */
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: '20px',
    maxWidth: 1600, // Wider for multi-column dashboards
    width: '100%',
    margin: '0 auto',
    alignSelf: 'stretch',
  },

  /* Card styling for widgets/monitors */
  quickWrapper: {
    background: '#18181b', // Zinc-900
    border: '1px solid #27272a', // Zinc-800
    borderRadius: 6,
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },

  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    border: 0,
  } as React.CSSProperties,

  /* Footer */
  footer: {
    padding: '12px 24px',
    borderTop: '1px solid #27272a',
    background: '#09090b',
    color: '#52525b', // Zinc-500
    fontSize: 11,
    display: 'flex',
    gap: 16,
    justifyContent: 'space-between', // Spread info across the bottom
    alignItems: 'center',
  },
};
export default App;
