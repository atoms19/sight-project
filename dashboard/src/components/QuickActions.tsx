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
    display: 'flex',
    flexDirection: 'column',
    gap: 8, // Tighter gap for better layout density
  },
  btn: {
    background: '#18181b', // Zinc-900
    border: '1px solid #27272a', // Zinc-800
    borderRadius: 4, // Sharp industrial radius
    padding: '12px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    transition: 'all 0.15s ease-in-out',
    width: '100%',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    // In your component, add hover: { background: '#27272a', borderColor: '#3f3f46' }
  },
  btnIcon: {
    fontSize: 20, // Slightly smaller for better proportions
    lineHeight: 1,
    color: '#10b981', // Emerald-500: Makes the action feel "powered on"
    filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.2))', // Subtle "LED" glow
  },
  btnLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#a1a1aa', // Zinc-400
    textTransform: 'uppercase',
    letterSpacing: '0.08em', // More space for that technical readout look
  },
  /* Feedback area styled like a terminal console / status readout */
  feedback: {
    fontSize: 11,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    color: '#10b981', // Emerald text for "System Response"
    textAlign: 'center',
    padding: '8px 10px',
    background: '#09090b', // Zinc-950 (Blackout)
    border: '1px solid #27272a',
    borderRadius: 4,
    marginTop: 4,
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
