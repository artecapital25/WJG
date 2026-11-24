import React from 'react';
import { Search, X } from 'lucide-react';

export interface WjgSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  ariaLabel?: string;
}

export const WjgSearchInput: React.FC<WjgSearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  label,
  compact = false,
  className = '',
  style,
  inputStyle,
  ariaLabel,
}) => {
  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {label && (
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Search size={12} color="var(--brand-cyan)" />
          <span>{label}</span>
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel || label || placeholder}
          style={{
            paddingLeft: '36px',
            paddingRight: value ? '34px' : '12px',
            minHeight: compact ? '40px' : '44px',
            fontSize: '0.9rem',
            ...inputStyle,
          }}
        />
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-subtle)',
            pointerEvents: 'none',
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Limpiar búsqueda"
            aria-label="Limpiar búsqueda"
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
