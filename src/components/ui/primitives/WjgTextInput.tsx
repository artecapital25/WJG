import React from 'react';

export interface WjgTextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  containerStyle?: React.CSSProperties;
}

export const WjgTextInput: React.FC<WjgTextInputProps> = ({
  label,
  value,
  onChange,
  error,
  hint,
  containerStyle,
  className = '',
  style,
  ...rest
}) => {
  return (
    <div style={containerStyle}>
      {label && <label className="form-label">{label}</label>}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`form-input ${className}`.trim()}
        style={{
          ...(error ? { borderColor: 'var(--accent-danger)' } : {}),
          ...style,
        }}
        {...rest}
      />
      {error && (
        <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: '4px', fontWeight: 600 }}>
          {error}
        </div>
      )}
      {hint && !error && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
          {hint}
        </div>
      )}
    </div>
  );
};

export interface WjgTextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  containerStyle?: React.CSSProperties;
}

export const WjgTextArea: React.FC<WjgTextAreaProps> = ({
  label,
  value,
  onChange,
  hint,
  containerStyle,
  className = '',
  style,
  rows = 3,
  ...rest
}) => {
  return (
    <div style={containerStyle}>
      {label && <label className="form-label">{label}</label>}
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`form-textarea ${className}`.trim()}
        style={style}
        {...rest}
      />
      {hint && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
          {hint}
        </div>
      )}
    </div>
  );
};
