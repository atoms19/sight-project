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
    background: '#1e293b',
    borderRadius: 8,
    padding: 16,
    border: '1px solid #334155',
  },
  title: {
    marginBottom: 16,
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: 600,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    minWidth: 80,
  },
  badge: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 16,
  },
  metric: {
    background: '#0f172a',
    borderRadius: 6,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 700,
  },
  btn: {
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    opacity: 1,
    transition: 'opacity 0.2s',
  },
  feedback: {
    marginTop: 8,
    fontSize: 12,
    color: '#94a3b8',
  },
};
