import React from 'react';
import { getAlertSurfaceClassName, type WjgAlertTone } from '../alertSystem';

export interface WjgCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'highlight' | 'subtle';
  alertTone?: WjgAlertTone;
  padding?: string;
}

export const WjgCard: React.FC<WjgCardProps> = ({
  variant = 'default',
  alertTone,
  padding,
  children,
  className = '',
  style,
  ...rest
}) => {
  const baseClass =
    variant === 'highlight'
      ? 'glass-card highlight'
      : 'glass-card';
  const variantClass = alertTone ? getAlertSurfaceClassName(alertTone, baseClass) : baseClass;

  return (
    <div
      className={`${variantClass} ${className}`.trim()}
      style={{
        ...(variant === 'subtle' && !alertTone ? { background: 'rgba(13, 19, 31, 0.65)', boxShadow: 'none' } : {}),
        ...(padding ? { padding } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};
