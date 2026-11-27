import React from 'react';
import { ALERT_TONE_TOKENS, resolveProgressScale, type WjgAlertTone } from '../alertSystem';

export interface WjgProgressBarProps {
  percent: number;
  label?: React.ReactNode;
  rightText?: React.ReactNode;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  toneOverride?: WjgAlertTone;
  style?: React.CSSProperties;
  className?: string;
}

export const WjgProgressBar: React.FC<WjgProgressBarProps> = ({
  percent,
  label,
  rightText,
  showPercent = true,
  size = 'md',
  toneOverride,
  style,
  className = '',
}) => {
  const scale = resolveProgressScale(percent);
  const overrideTokens = toneOverride ? ALERT_TONE_TOKENS[toneOverride] : null;
  const fillBg = overrideTokens ? overrideTokens.accentColor : scale.gradient;
  const valueColor = overrideTokens ? overrideTokens.textColor : scale.textColor;
  const fillGlow = overrideTokens ? 'none' : scale.glow;

  const hasHeader = Boolean(label) || Boolean(rightText) || showPercent;

  return (
    <div
      className={`wjg-progress-container ${className}`.trim()}
      style={{ width: '100%', minWidth: 0, ...style }}
    >
      {hasHeader && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
            fontSize: size === 'sm' ? '0.7rem' : '0.75rem',
          }}
        >
          <span
            style={{
              color: 'var(--text-muted)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
          <span
            className="tabular-nums"
            style={{
              color: valueColor,
              fontWeight: 800,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {rightText !== undefined ? rightText : showPercent ? `${scale.percent}%` : null}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={scale.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`wjg-progress-bar-track wjg-progress-${size}`}
      >
        <div
          className="wjg-progress-bar-fill"
          style={{
            width: `${scale.percent}%`,
            background: fillBg,
            boxShadow: scale.percent > 0 ? fillGlow : 'none',
          }}
        />
      </div>
    </div>
  );
};
