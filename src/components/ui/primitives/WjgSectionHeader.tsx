import React from 'react';

export interface WjgSectionHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export const WjgSectionHeader: React.FC<WjgSectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  style,
}) => {
  return (
    <div className="section-header" style={style}>
      <div style={{ minWidth: 0 }}>
        <h2 className="section-title">
          {icon}
          <span>{title}</span>
        </h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  );
};
