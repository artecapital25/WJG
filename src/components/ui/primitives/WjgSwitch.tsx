import React from 'react';

export interface WjgSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
  accentColor?: string;
  style?: React.CSSProperties;
}

export const WjgSwitch: React.FC<WjgSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  accentColor = '#38bdf8',
  style,
}) => {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '10px',
        background: checked ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.55)',
        border: `1px solid ${checked ? 'rgba(56, 189, 248, 0.35)' : 'var(--border-subtle)'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>{label}</div>
        {description && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {description}
          </div>
        )}
      </div>
      <span
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onChange(!checked);
        }}
        style={{
          width: '42px',
          height: '24px',
          borderRadius: '9999px',
          background: checked ? accentColor : 'rgba(255, 255, 255, 0.14)',
          position: 'relative',
          transition: 'background 0.18s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '21px' : '3px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: '#ffffff',
            transition: 'left 0.18s ease',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }}
        />
      </span>
    </label>
  );
};
