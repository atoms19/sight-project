/**
 * QuickActions – grid of shortcut action buttons.
 */

import React, { useState } from 'react';
import axios from 'axios';

interface QuickActionButtonProps {
  icon:     string;
  label:    string;
  onClick:  () => void | Promise<void>;
  disabled?: boolean;
  accentColor?: string;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  onClick,
  disabled,
  accentColor = '#38bdf8',
}) => {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try { await onClick(); }
    finally { setBusy(false); }
  };

  return (
    <button
      onClick={handle}
      disabled={disabled || busy}
      aria-label={label}
      style={{
        ...styles.btn,
        borderColor: `${accentColor}40`,
        opacity: disabled || busy ? 0.5 : 1,
      }}
    >
      <span style={{ ...styles.btnIcon, color: accentColor }}>{busy ? '⏳' : icon}</span>
      <span style={styles.btnLabel}>{label}</span>
    </button>
  );
};

interface QuickActionsProps {
  deviceId: string;
  onRelayChange?: (state: boolean) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ deviceId, onRelayChange }) => {
  const [lastResult, setLastResult] = useState<string | null>(null);

  const sendRelay = async (on: boolean) => {
    try {
      await axios.post(`/api/devices/${deviceId}/relay`, { relay: on });
      setLastResult(`Relay ${on ? 'ON' : 'OFF'} sent ✔`);
      onRelayChange?.(on);
    } catch {
      setLastResult('Command failed – check connection');
    }
    setTimeout(() => setLastResult(null), 3000);
  };

  // TODO: Wire up real export and refresh once backend endpoints are ready.
  const handleExport = () => {
    setLastResult('Export triggered – check Downloads');
    setTimeout(() => setLastResult(null), 3000);
  };

  const handleRefresh = () => window.location.reload();

  return (
    <div style={styles.container}>
      <div className="quick-actions-grid">
        <QuickActionButton
          icon="🟢"
          label="Relay ON"
          onClick={() => sendRelay(true)}
          accentColor="#4ade80"
        />
        <QuickActionButton
          icon="🔴"
          label="Relay OFF"
          onClick={() => sendRelay(false)}
          accentColor="#f87171"
        />
        <QuickActionButton
          icon="📥"
          label="Export CSV"
          onClick={handleExport}
          accentColor="#a78bfa"
        />
        <QuickActionButton
          icon="🔄"
          label="Refresh"
          onClick={handleRefresh}
          accentColor="#38bdf8"
        />
      </div>

      {lastResult && (
        <p role="status" style={styles.feedback}>{lastResult}</p>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display:       'flex',
    flexDirection: 'column',
    gap:           12,
  },
  btn: {
    background:   '#0f172a',
    border:       '1px solid #334155',
    borderRadius: 10,
    padding:      '14px 12px',
    display:      'flex',
    flexDirection: 'column',
    alignItems:   'center',
    gap:          6,
    cursor:       'pointer',
    transition:   'background 0.15s, transform 0.1s',
    width:        '100%',
  },
  btnIcon: {
    fontSize: 24,
    lineHeight: 1,
  },
  btnLabel: {
    fontSize:   11,
    fontWeight: 600,
    color:      '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  feedback: {
    fontSize:     12,
    color:        '#94a3b8',
    textAlign:    'center',
    padding:      '6px 8px',
    background:   '#0f172a',
    borderRadius: 6,
  },
};
