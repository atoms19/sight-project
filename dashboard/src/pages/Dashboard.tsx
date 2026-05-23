import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Activity, Zap, Cpu, Server } from 'lucide-react';

import { LiveChart } from '../components/LiveChart';
import { ControlPanel } from '../components/ControlPanel';
import { KpiCard } from '../components/KpiCard';
import { Section } from '../components/Section';
import { EnergyHistoryChart } from '../components/EnergyHistoryChart';
import { ActivityFeed } from '../components/ActivityFeed';
import { QuickActions } from '../components/QuickActions';
import { DeviceTable } from '../components/DeviceTable';
import { useWebSocket } from '../hooks/useWebSocket';

const DEFAULT_DEVICE = 'esp32_meter_01';

const Dashboard: React.FC = () => {
    const [deviceId, setDeviceId] = useState<string>(DEFAULT_DEVICE);
    const [devices, setDevices] = useState<string[]>([DEFAULT_DEVICE]);
    const [baseline, setBaseline] = useState<number>(0);

    const { data, status } = useWebSocket(
        deviceId,
        `${window.location.origin.replace(/^http/, 'ws')}`
    );

    useEffect(() => {
        axios.get('/api/devices')
            .then((res) => {
                const devs = res.data.devices ?? [];
                if (devs.length > 0) setDevices(devs);
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        axios.get(`/api/devices/${deviceId}/history`, { params: { range: '-7d' } })
            .then((res) => {
                const rows = res.data.data ?? [];
                if (rows.length > 0) {
                    const avg = rows.reduce((s: number, r: any) => s + r.power_w, 0) / rows.length;
                    setBaseline(avg);
                }
            })
            .catch(() => { });
    }, [deviceId]);

    const livePower = data ? data.power_w.toFixed(1) : '–';
    const liveEnergy = data ? data.energy_wh.toFixed(2) : '–';
    const activeCount = devices.length;

    const wsColor = status === 'open' ? 'var(--color-success)' : status === 'error' ? 'var(--color-danger)' : 'var(--color-warning)';
    const wsLabel = status === 'open' ? 'Healthy' : status === 'error' ? 'Error' : 'Reconnecting';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Top Header Row for Dashboard */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: 28, color: '#fff' }}>Overview</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Live operational data for your grid</p>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <select
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text-main)',
                            border: '1px solid var(--color-border)',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {devices.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>

                    <div className="glass" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: wsColor, boxShadow: `0 0 10px ${wsColor}` }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: wsColor }}>{wsLabel}</span>
                    </div>
                </div>
            </div>

            <Section title="Key Performance Indicators">
                <div className="kpi-grid">
                    <KpiCard icon="⚡" label="Live Power" value={livePower} unit=" W" subtext="Real-time from WebSocket" accentColor="var(--color-primary)" />
                    <KpiCard icon="🔋" label="Today's Energy" value={liveEnergy} unit=" Wh" subtext="Cumulative since midnight" accentColor="var(--color-secondary)" />
                    <KpiCard icon="📡" label="Active Devices" value={activeCount} subtext={`${deviceId} selected`} accentColor="var(--color-success)" />
                    <KpiCard icon="🛡" label="System Health" value={wsLabel} subtext={`WS: ${status}`} accentColor={wsColor} />
                </div>
            </Section>

            <Section title="Live Monitoring">
                <div className="main-grid">
                    <div className="glass" style={{ borderRadius: 'var(--radius-lg)' }}>
                        <LiveChart liveData={data} baseline={baseline} />
                    </div>
                    <ControlPanel deviceId={deviceId} liveData={data} status={status} />
                </div>
            </Section>

            <Section title="Infrastructure Map">
                <DeviceTable liveDeviceIds={[deviceId]} />
            </Section>

        </div>
    );
};

export default Dashboard;
