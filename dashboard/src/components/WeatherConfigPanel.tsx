import React, { useEffect, useState } from 'react';
import { SightAPI, WeatherConfig } from '../api/client';

const COMMON_CITIES: WeatherConfig[] = [
    { city: 'London', lat: 51.5074, lon: -0.1278 },
    { city: 'New York', lat: 40.7128, lon: -74.0060 },
    { city: 'Tokyo', lat: 35.6762, lon: 139.6503 },
    { city: 'Sydney', lat: -33.8688, lon: 151.2093 },
    { city: 'San Francisco', lat: 37.7749, lon: -122.4194 }
];

export const WeatherConfigPanel: React.FC = () => {
    const [config, setConfig] = useState<WeatherConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        SightAPI.getWeatherConfig()
            .then(setConfig)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const handleSelectCity = async (cityConfig: WeatherConfig) => {
        setSaving(true);
        setError(null);
        try {
            const resp = await SightAPI.setWeatherConfig(cityConfig);
            setConfig(resp.config);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ color: '#fff', fontSize: 18 }}>Weather Forecasting</h3>
                <p style={{ color: '#64748b', fontSize: 14, marginTop: 12 }}>Loading configuration...</p>
            </div>
        );
    }

    return (
        <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ color: '#fff', fontSize: 18 }}>Weather Forecasting Configuration</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, marginBottom: 20 }}>
                Set the facility location to correlate energy usage with external weather data. This lays the groundwork for predictive ML models.
            </p>

            {error && (
                <div style={{ background: '#7f1d1d33', border: '1px solid #f8717155', padding: '8px 12px', borderRadius: 4, marginBottom: 16 }}>
                    <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>
                </div>
            )}

            <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p style={{ color: '#a1a1aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Current Target Location</p>
                <p style={{ color: '#34d399', fontSize: 20, fontWeight: 600 }}>{config?.city || 'Not Set'}</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <p style={{ color: '#71717a', fontSize: 13 }}>Lat: {config?.lat.toFixed(4)}</p>
                    <p style={{ color: '#71717a', fontSize: 13 }}>Lon: {config?.lon.toFixed(4)}</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COMMON_CITIES.map((c) => (
                    <button
                        key={c.city}
                        disabled={saving || config?.city === c.city}
                        onClick={() => handleSelectCity(c)}
                        style={{
                            background: config?.city === c.city ? '#1e293b' : 'transparent',
                            color: config?.city === c.city ? '#38bdf8' : '#e2e8f0',
                            border: `1px solid ${config?.city === c.city ? '#38bdf855' : '#3f3f46'}`,
                            padding: '8px 16px',
                            borderRadius: 6,
                            cursor: (saving || config?.city === c.city) ? 'default' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: saving ? 0.6 : 1,
                        }}
                    >
                        {c.city}
                    </button>
                ))}
            </div>
            
            <p style={{ color: '#52525b', fontSize: 11, marginTop: 16 }}>
                * Note: Real-time data will only be fetched if OWM_API_KEY is configured on the backend. Otherwise, mock baseline data is stored for ML pipelining.
            </p>
        </div>
    );
};
