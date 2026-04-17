/**
 * App – root component for the Sight dashboard.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LiveChart } from './components/LiveChart';
import { ControlPanel } from './components/ControlPanel';
import { useWebSocket } from './hooks/useWebSocket';

const DEFAULT_DEVICE = 'esp32_meter_01';

const App: React.FC = () => {
  const [deviceId, setDeviceId] = useState<string>(DEFAULT_DEVICE);
  const [devices,  setDevices]  = useState<string[]>([DEFAULT_DEVICE]);
  const [baseline, setBaseline] = useState<number>(0);

  const { data, status } = useWebSocket(deviceId, `${window.location.origin.replace(/^http/, 'ws')}`);

  // Load device list
  useEffect(() => {
    axios.get('/api/devices').then((res) => {
      const devs: string[] = res.data.devices ?? [];
      if (devs.length > 0) setDevices(devs);
    }).catch(() => {/* API not yet available – use default */});
  }, []);

  // Compute rolling baseline from history (7-day avg ≈ last hour for demo)
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

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.logo}>⚡ Sight</h1>
        <span style={styles.subtitle}>Edge-AI Building Optimiser</span>

        {/* Device selector */}
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          style={styles.select}
        >
          {devices.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </header>

      {/* Main grid */}
      <main style={styles.grid}>
        <div style={styles.chartCol}>
          <LiveChart liveData={data} baseline={baseline} />
        </div>
        <div style={styles.controlCol}>
          <ControlPanel deviceId={deviceId} liveData={data} status={status} />
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>Sight v1.0.0 · zero-cloud · edge-AI</span>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '0 16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 0',
    borderBottom: '1px solid #334155',
    marginBottom: 24,
  },
  logo: {
    fontSize: 22,
    fontWeight: 800,
    color: '#38bdf8',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    flex: 1,
  },
  select: {
    background: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 13,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 16,
    flex: 1,
  },
  chartCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  controlCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  footer: {
    padding: '16px 0',
    borderTop: '1px solid #334155',
    marginTop: 24,
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
  },
};

export default App;
