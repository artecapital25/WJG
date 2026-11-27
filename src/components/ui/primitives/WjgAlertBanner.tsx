import React from 'react';
import { ALERT_TONE_TOKENS, getAlertSurfaceClassName, type WjgAlertTone } from '../alertSystem';

export interface WjgAlertBannerProps {
  tone: WjgAlertTone;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const WjgAlertBanner: React.FC<WjgAlertBannerProps> = ({
  tone,
  title,
  icon,
  action,
  children,
  compact = false,
  style,
  className = '',
}) => {
  const tokens = ALERT_TONE_TOKENS[tone];

  return (
    <div
      className={getAlertSurfaceClassName(
        tone,
        `glass-card wjg-alert-banner${compact ? ' wjg-alert-compact' : ''} ${className}`.trim()
      )}
      style={{
        margin: 0,
        padding: compact ? '10px 14px' : '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: '1 1 220px', minWidth: 0 }}>
        {icon && (
          <span style={{ color: tokens.accentColor, flexShrink: 0, display: 'inline-flex', marginTop: '1px' }}>
            {icon}
          </span>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          {title && (
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: tokens.textColor, marginBottom: '2px' }}>
              {title}
            </div>
          )}
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: title ? 'var(--text-main)' : tokens.textColor, lineHeight: 1.4 }}>
            {children}
          </div>
        </div>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
};
