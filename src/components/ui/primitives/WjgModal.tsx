import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface WjgModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  borderColor?: string;
  zIndex?: number;
}

export const WjgModal: React.FC<WjgModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = '560px',
  borderColor = 'rgba(56, 189, 248, 0.35)',
  zIndex = 10000,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.86)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'linear-gradient(180deg, rgba(19, 28, 46, 0.98) 0%, rgba(13, 19, 31, 0.99) 100%)',
          border: `1px solid ${borderColor}`,
          borderRadius: '20px',
          padding: '22px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.82)',
          color: 'var(--text-main)',
        }}
      >
        {(title || subtitle) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
              {icon && (
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.14)',
                    color: 'var(--brand-cyan)',
                    flexShrink: 0,
                    display: 'inline-flex',
                  }}
                >
                  {icon}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                {title && (
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1.12rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-display)',
                      color: '#ffffff',
                    }}
                  >
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: 'var(--text-muted)',
                width: '34px',
                height: '34px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div>{children}</div>

        {footer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '18px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
