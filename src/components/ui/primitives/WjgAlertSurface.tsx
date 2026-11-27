import React from 'react';
import { getAlertSurfaceClassName, type WjgAlertTone } from '../alertSystem';

export interface WjgAlertSurfaceProps extends React.HTMLAttributes<HTMLElement> {
  tone: WjgAlertTone;
  padding?: string;
  compact?: boolean;
  as?: 'div' | 'article' | 'section';
}

export const WjgAlertSurface: React.FC<WjgAlertSurfaceProps> = ({
  tone,
  padding,
  compact = false,
  as: Component = 'div',
  className = '',
  style,
  children,
  ...rest
}) => {
  const surfaceClass = getAlertSurfaceClassName(
    tone,
    `glass-card${compact ? ' wjg-alert-compact' : ''} ${className}`.trim()
  );

  return (
    <Component
      className={surfaceClass}
      style={{
        ...(padding ? { padding } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
};
