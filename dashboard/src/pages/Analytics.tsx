import React from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { EsgReport } from '../components/EsgReport';
import { WeatherConfigPanel } from '../components/WeatherConfigPanel';

const mockDataTime = [
    { time: '00:00', load: 4000, capacity: 5000 },
    { time: '04:00', load: 3000, capacity: 5000 },
    { time: '08:00', load: 6000, capacity: 8000 },
    { time: '12:00', load: 8500, capacity: 9000 },
    { time: '16:00', load: 7000, capacity: 8000 },
    { time: '20:00', load: 5500, capacity: 6000 },
    { time: '24:00', load: 4200, capacity: 5000 },
];

const mockDataRadar = [
    { subject: 'Uptime', A: 99, fullMark: 100 },
    { subject: 'Efficiency', A: 85, fullMark: 100 },
    { subject: 'Load', A: 75, fullMark: 100 },
    { subject: 'Cooling', A: 90, fullMark: 100 },
    { subject: 'Security', A: 95, fullMark: 100 },
    { subject: 'Network', A: 100, fullMark: 100 },
];

const Analytics: React.FC = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
                <h2 style={{ fontSize: 28, color: '#fff' }}>Analytics & Reporting</h2>
                <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Deep dive into your infrastructure metrics</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--gap-lg)' }}>

                {/* ESG Report */}
                <EsgReport />

                {/* Weather Config Panel */}
                <WeatherConfigPanel />

                {/* Load over Time */}
                <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ color: '#fff', fontSize: 18, marginBottom: 20 }}>System Load (24h Window)</h3>
                    <div style={{ height: 300, width: '100%' }}>
                        <ResponsiveContainer>
                            <AreaChart data={mockDataTime}>
                                <defs>
                                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCap" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="time" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
                                <Area type="monotone" dataKey="capacity" stroke="#818cf8" fillOpacity={1} fill="url(#colorCap)" />
                                <Area type="monotone" dataKey="load" stroke="#38bdf8" fillOpacity={1} fill="url(#colorLoad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Radar Metrics */}
                <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ color: '#fff', fontSize: 18, marginBottom: 20 }}>Facility Health Index</h3>
                    <div style={{ height: 300, width: '100%' }}>
                        <ResponsiveContainer>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={mockDataRadar}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569' }} />
                                <Radar name="Cluster A" dataKey="A" stroke="#34d399" fill="#34d399" fillOpacity={0.5} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Peak Demand */}
                <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ color: '#fff', fontSize: 18, marginBottom: 20 }}>Peak Demand by Shift</h3>
                    <div style={{ height: 300, width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={mockDataTime}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="time" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                                <Bar dataKey="load" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Analytics;
