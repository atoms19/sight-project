import React, { useEffect, useState } from 'react';
import { SightAPI, EsgSummaryResponse } from '../api/client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export const EsgReport: React.FC = () => {
    const [esgData, setEsgData] = useState<EsgSummaryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [range, setRange] = useState('-30d');

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);

        SightAPI.getEsgSummary(range)
            .then(data => {
                if (mounted) setEsgData(data);
            })
            .catch(err => {
                if (mounted) setError(err.message);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => { mounted = false; };
    }, [range]);

    if (error) {
        return (
            <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-lg)', borderColor: '#ef444433' }}>
                <h3 style={{ color: '#ef4444', fontSize: 18, marginBottom: 8 }}>ESG Reporting Error</h3>
                <p style={{ color: '#94a3b8', fontSize: 14 }}>{error}</p>
            </div>
        );
    }

    const pieData = esgData ? [
        { name: 'Estimated Emissions', value: esgData.total_co2_kg, color: '#f59e0b' },
        { name: 'Emissions Prevented', value: esgData.saved_co2_kg, color: '#10b981' }
    ] : [];

    return (
        <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h3 style={{ color: '#fff', fontSize: 18 }}>Carbon Footprint & ESG</h3>
                    <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Scope 2 Emissions Tracker</p>
                </div>
                <select 
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    style={{ background: '#09090b', color: '#e2e8f0', border: '1px solid #3f3f46', borderRadius: 4, padding: '4px 8px', fontSize: 12 }}
                >
                    <option value="-7d">Last 7 Days</option>
                    <option value="-30d">Last 30 Days</option>
                    <option value="-90d">Last 90 Days</option>
                </select>
            </div>

            {loading || !esgData ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    Calculating emissions...
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ background: '#00000033', padding: 16, borderRadius: 8, marginBottom: 12 }}>
                            <p style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Total Energy (KWh)</p>
                            <p style={{ color: '#e2e8f0', fontSize: 24, fontWeight: 'bold' }}>{esgData.total_energy_kwh.toLocaleString()}</p>
                        </div>
                        <div style={{ background: '#14532d33', border: '1px solid #16653455', padding: 16, borderRadius: 8 }}>
                            <p style={{ color: '#34d399', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>CO₂ Prevented via Shedding</p>
                            <p style={{ color: '#10b981', fontSize: 24, fontWeight: 'bold' }}>{esgData.saved_co2_kg.toLocaleString()} kg</p>
                        </div>
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 200, height: 200 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};
