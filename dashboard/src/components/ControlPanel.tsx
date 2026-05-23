/**
 * ControlPanel – manual relay override and live metrics display.
 */

import React, { useState } from 'react';
import axios from 'axios';
import { LiveState, WSStatus } from '../hooks/useWebSocket';

interface ControlPanelProps {
  deviceId: string;
  liveData: LiveState | null;
  status:   WSStatus;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  deviceId,
  liveData,
  status,
}) => {
  const [sending, setSending] = useState(false);
  const [lastCmd, setLastCmd] = useState<string | null>(null);

  const sendRelayCmd = async (relay: boolean) => {
    setSending(true);
    try {
      await axios.post(`/api/devices/${deviceId}/relay`, { relay });
      setLastCmd(relay ? 'ON' : 'OFF');
    } catch (err) {
      setLastCmd('Error – check connection');
    } finally {
      setSending(false);
    }
  };

  const statusColor =
    status === 'open' ? '#4ade80' :
    status === 'error' ? '#f87171' : '#94a3b8';

  const relayOn  = liveData?.relay_state === 1;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Control Panel – {deviceId}</h3>

      {/* Connection status */}
      <div style={styles.row}>
        <span style={styles.label}>WS Status</span>
        <span style={{ ...styles.badge, color: statusColor }}>
          {status.toUpperCase()}
        </span>
      </div>

      {/* Live metrics */}
      <div style={styles.metrics}>
        <Metric label="Power"    value={liveData ? `${liveData.power_w.toFixed(1)} W`  : '–'} />
        <Metric label="Current"  value={liveData ? `${liveData.irms_a.toFixed(3)} A`   : '–'} />
        <Metric label="Voltage"  value={liveData ? `${liveData.vrms_v.toFixed(1)} V`   : '–'} />
        <Metric label="Energy"   value={liveData ? `${liveData.energy_wh.toFixed(4)} Wh` : '–'} />
        <Metric
          label="Relay"
          value={liveData ? (relayOn ? 'ON ✓' : 'OFF ✗') : '–'}
          valueColor={relayOn ? '#4ade80' : '#f87171'}
        />
      </div>

      {/* Manual relay control */}
      <div style={styles.row}>
        <button
          onClick={() => sendRelayCmd(true)}
          disabled={sending}
          style={{ ...styles.btn, background: '#166534', color: '#4ade80' }}
        >
          Relay ON
        </button>
        <button
          onClick={() => sendRelayCmd(false)}
          disabled={sending}
          style={{ ...styles.btn, background: '#7f1d1d', color: '#f87171' }}
        >
          Relay OFF
        </button>
      </div>

      {lastCmd && (
        <p style={styles.feedback}>Last command: <strong>{lastCmd}</strong></p>
      )}
    </div>
  );
};

interface MetricProps {
  label:       string;
  value:       string;
  valueColor?: string;
}

const Metric: React.FC<MetricProps> = ({ label, value, valueColor = '#e2e8f0' }) => (
  <div style={styles.metric}>
    <span style={styles.metricLabel}>{label}</span>
    <span style={{ ...styles.metricValue, color: valueColor }}>{value}</span>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#18181b', // Zinc-900
    borderRadius: 6,
    padding: '16px',
    border: '1px solid #27272a', // Zinc-800
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  },
  title: {
    marginBottom: 16,
    color: '#fafafa', // Zinc-50
    fontSize: 13, // Slightly smaller for density
    fontWeight: 600,
    textTransform: 'uppercase', // Professional "Header" look
    letterSpacing: '0.02em',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  label: {
    color: '#71717a', // Zinc-400
    fontSize: 12,
    minWidth: 80,
    fontWeight: 500,
  },
  badge: {
    fontSize: 10, // Small but punchy
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    padding: '2px 6px',
    borderRadius: 4,
    // Note: Style mapping should handle color (e.g., bg: rgba(16, 185, 129, 0.1))
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 16,
  },
  metric: {
    background: '#09090b', // Zinc-950: Darker than container for a "recessed" look
    borderRadius: 4,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    border: '1px solid #27272a',
  },
  metricLabel: {
    color: '#52525b', // Zinc-500
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#10b981', // Emerald-500 for the actual "data"
    fontFamily: 'ui-monospace, SFMono-Regular, "Roboto Mono", monospace', // Monospace is key for monitoring
  },
  btn: {
    border: '1px solid #3f3f46', // Zinc-700
    background: '#27272a', // Zinc-800
    color: '#fafafa',
    borderRadius: 4,
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    width: '100%', // Full width buttons feel more like "Controls"
  },
  feedback: {
    marginTop: 10,
    fontSize: 11,
    color: '#52525b', // Zinc-500
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
};
