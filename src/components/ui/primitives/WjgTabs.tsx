import React from 'react';

export interface WjgTabOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

export interface WjgTabsProps<T extends string = string> {
  tabs: WjgTabOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  variant?: 'pills' | 'grid';
  style?: React.CSSProperties;
}

export function WjgTabs<T extends string = string>({
  tabs,
  activeId,
  onChange,
  variant = 'grid',
  style,
}: WjgTabsProps<T>) {
  return (
    <div
      className={variant === 'grid' ? 'subtabs-grid-mobile' : 'hub-subtabs-bar'}
      role="tablist"
      style={
        variant === 'grid'
          ? {
              marginBottom: '18px',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '12px',
              ...style,
            }
          : style
      }
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onChange(tab.id)}
            style={{ fontWeight: isActive ? 800 : 600, whiteSpace: 'nowrap' }}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && Number(tab.badge) !== 0 && (
              <span className="nav-badge-pill" style={{ position: 'static' }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
