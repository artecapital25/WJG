import React from 'react';
import { Inbox } from 'lucide-react';

export interface WjgEmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const WjgEmptyState: React.FC<WjgEmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  style,
}) => {
  return (
    <div
      className="glass-card"
      style={{
        textAlign: 'center',
        padding: '44px 24px',
        color: 'var(--text-muted)',
        ...style,
      }}
    >
      <div style={{ margin: '0 auto 12px', opacity: 0.7, display: 'inline-flex', color: 'var(--brand-cyan)' }}>
        {icon || <Inbox size={36} />}
      </div>
      <h3 style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '1.06rem', fontWeight: 800 }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '0.84rem', margin: '0 auto 16px', maxWidth: '440px', color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action && <div style={{ display: 'flex', justifyContent: 'center' }}>{action}</div>}
    </div>
  );
};
