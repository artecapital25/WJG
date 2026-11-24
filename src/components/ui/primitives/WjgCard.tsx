import React from 'react';

export interface WjgCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'highlight' | 'subtle';
  padding?: string;
}

export const WjgCard: React.FC<WjgCardProps> = ({
  variant = 'default',
  padding,
  children,
  className = '',
  style,
  ...rest
}) => {
  const variantClass =
    variant === 'highlight'
      ? 'glass-card highlight'
      : variant === 'subtle'
      ? 'glass-card'
      : 'glass-card';

  return (
    <div
      className={`${variantClass} ${className}`.trim()}
      style={{
        ...(variant === 'subtle' ? { background: 'rgba(13, 19, 31, 0.65)', boxShadow: 'none' } : {}),
        ...(padding ? { padding } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};
