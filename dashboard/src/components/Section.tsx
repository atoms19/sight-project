/**
 * Section – reusable section wrapper with a heading and optional badge.
 */

import React from 'react';

interface SectionProps {
  title:    string;
  badge?:   string | number;
  action?:  React.ReactNode;
  children: React.ReactNode;
  id?:      string;
}

export const Section: React.FC<SectionProps> = ({ title, badge, action, children, id }) => (
  <section id={id} style={styles.section} aria-labelledby={id ? `${id}-heading` : undefined}>
    <div style={styles.header}>
      <h2 id={id ? `${id}-heading` : undefined} style={styles.title}>
        {title}
        {badge !== undefined && (
          <span style={styles.badge} aria-label={`${badge} items`}>{badge}</span>
        )}
      </h2>
      {action && <div style={styles.action}>{action}</div>}
    </div>
    {children}
  </section>
);

const styles: Record<string, React.CSSProperties> = {
  section: {
    display:       'flex',
    flexDirection: 'column',
    gap:           12,
  },
  header: {
    display:     'flex',
    alignItems:  'center',
    justifyContent: 'space-between',
    gap:         8,
  },
  title: {
    fontSize:   15,
    fontWeight: 700,
    color:      '#e2e8f0',
    display:    'flex',
    alignItems: 'center',
    gap:        8,
  },
  badge: {
    background:   '#334155',
    color:        '#94a3b8',
    fontSize:     11,
    fontWeight:   700,
    padding:      '2px 8px',
    borderRadius: 99,
  },
  action: {
    flexShrink: 0,
  },
};
