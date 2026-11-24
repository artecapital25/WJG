import React from 'react';

export interface WjgStatCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  accentColor?: string;
  style?: React.CSSProperties;
}

export const WjgStatCard: React.FC<WjgStatCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  accentColor = 'var(--brand-cyan)',
  style,
}) => {
  return (
    <div
      className="glass-card"
      style={{
        margin: 0,
        padding: '14px 16px',
        borderColor: 'var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {label}
        </span>
        {icon && <span style={{ color: accentColor }}>{icon}</span>}
      </div>
      <div
        className="tabular-nums"
        style={{
          fontSize: '1.35rem',
          fontWeight: 900,
          fontFamily: 'var(--font-display)',
          color: accentColor,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>{subtitle}</div>
      )}
    </div>
  );
};
