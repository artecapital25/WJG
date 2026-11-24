import React from 'react';

export interface WjgNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: React.ReactNode;
  unit?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string | number;
  required?: boolean;
  disabled?: boolean;
  allowZeroDisplay?: boolean;
  hint?: string;
  className?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

/**
 * Campo numérico oficial WJGEEKS 3D PRO.
 * Cumple DESIGN.md: usa step="any" por defecto (prohibidos step="500"/"5000")
 * y borrado limpio cuando value === 0.
 */
export const WjgNumberInput: React.FC<WjgNumberInputProps> = ({
  value,
  onChange,
  label,
  unit,
  placeholder = '0',
  min = 0,
  max,
  step = 'any',
  required = false,
  disabled = false,
  allowZeroDisplay = false,
  hint,
  className = '',
  style,
  inputStyle,
}) => {
  const numVal = Number(value) || 0;
  const displayValue = !allowZeroDisplay && numVal === 0 ? '' : numVal;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(0);
      return;
    }
    let parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) parsed = 0;
    if (min !== undefined && parsed < min) parsed = min;
    if (max !== undefined && parsed > max) parsed = max;
    onChange(parsed);
  };

  const inputEl = (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      className={`form-input tabular-nums ${className}`.trim()}
      style={{
        ...(unit ? { paddingRight: '62px' } : {}),
        ...inputStyle,
      }}
    />
  );

  return (
    <div style={style}>
      {label && <label className="form-label">{label}</label>}
      {unit ? (
        <div className="input-with-unit">
          {inputEl}
          <span className="input-unit-badge">{unit}</span>
        </div>
      ) : (
        inputEl
      )}
      {hint && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
          {hint}
        </div>
      )}
    </div>
  );
};
