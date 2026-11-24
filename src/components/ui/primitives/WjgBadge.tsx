import React from 'react';

export type WjgBadgeVariant = 'neutral' | 'info' | 'cyan' | 'success' | 'warning' | 'danger' | 'purple';

export interface WjgBadgeProps {
  children: React.ReactNode;
  variant?: WjgBadgeVariant;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const BADGE_PALETTE: Record<WjgBadgeVariant, { color: string; bg: string; border: string }> = {
  neutral: { color: '#cbd5e1', bg: 'rgba(255, 255, 255, 0.06)', border: 'rgba(255, 255, 255, 0.12)' },
  info: { color: '#60a5fa', bg: 'rgba(37, 119, 208, 0.16)', border: 'rgba(37, 119, 208, 0.35)' },
  cyan: { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' },
  success: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.35)' },
  warning: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.35)' },
  danger: { color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.16)', border: 'rgba(239, 68, 68, 0.35)' },
  purple: { color: '#c084fc', bg: 'rgba(168, 85, 247, 0.16)', border: 'rgba(168, 85, 247, 0.35)' },
};

export const WjgBadge: React.FC<WjgBadgeProps> = ({
  children,
  variant = 'neutral',
  icon,
  style,
  className = '',
}) => {
  const palette = BADGE_PALETTE[variant];
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 9px',
        borderRadius: '9999px',
        fontSize: '0.72rem',
        fontWeight: 700,
        backgroundColor: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
};
