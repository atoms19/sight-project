/**
 * KpiCard – compact metric card shown in the overview strip.
 */

import React from 'react';

interface TrendProps {
  value: number;   // percentage change (positive or negative)
  label: string;   // e.g. "vs yesterday"
}

export interface KpiCardProps {
  icon:        React.ReactNode;
  label:       string;
  value:       string | number;
  unit?:       string;
  subtext?:    string;
  trend?:      TrendProps;
  accentColor?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  icon,
  label,
  value,
  unit,
  subtext,
  trend,
  accentColor = '#38bdf8',
}) => {
  const trendPositive = trend && trend.value >= 0;

  return (
    <article style={styles.card} aria-label={`${label}: ${value}${unit ?? ''}`}>
      <div style={{ ...styles.iconBox, background: `${accentColor}22`, color: accentColor }}>
        {icon}
      </div>
      <div style={styles.body}>
        <p style={styles.label}>{label}</p>
        <p style={{ ...styles.value, color: accentColor }}>
          {value}
          {unit && <span style={styles.unit}>{unit}</span>}
        </p>
        {trend && (
          <p style={{ ...styles.trend, color: trendPositive ? '#4ade80' : '#f87171' }}>
            {trendPositive ? '▲' : '▼'} {Math.abs(trend.value).toFixed(1)}% {trend.label}
          </p>
        )}
        {subtext && !trend && <p style={styles.subtext}>{subtext}</p>}
      </div>
    </article>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    background:   '#1e293b',
    border:       '1px solid #334155',
    borderRadius: 10,
    padding:      '16px 20px',
    display:      'flex',
    alignItems:   'center',
    gap:          16,
    minWidth:     0,
  },
  iconBox: {
    width:        44,
    height:       44,
    borderRadius: 10,
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    fontSize:     22,
    flexShrink:   0,
  },
  body: {
    display:        'flex',
    flexDirection:  'column',
    gap:            2,
    minWidth:       0,
    overflow:       'hidden',
  },
  label: {
    fontSize:      12,
    color:         '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight:    600,
    whiteSpace:    'nowrap',
  },
  value: {
    fontSize:   26,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  unit: {
    fontSize:   13,
    fontWeight: 500,
    marginLeft: 3,
  },
  trend: {
    fontSize:   12,
    fontWeight: 600,
  },
  subtext: {
    fontSize: 12,
    color:    '#64748b',
  },
};
