import React from 'react';
import { Loader2 } from 'lucide-react';

export type WjgButtonVariant =
  | 'quote'
  | 'save'
  | 'primary'
  | 'secondary'
  | 'cyan'
  | 'whatsapp'
  | 'danger'
  | 'warning'
  | 'ghost';

export type WjgButtonSize = 'sm' | 'md' | 'lg';

export interface WjgButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: WjgButtonVariant;
  size?: WjgButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<WjgButtonVariant, string> = {
  quote: 'wjg-btn-quote',
  save: 'wjg-btn-save',
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  cyan: 'btn-cyan',
  whatsapp: 'btn-whatsapp',
  danger: 'btn-danger',
  warning: 'wjg-btn-warning',
  ghost: 'wjg-btn-ghost',
};

const SIZE_CLASSES: Record<WjgButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export const WjgButton: React.FC<WjgButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  style,
  disabled,
  type = 'button',
  ...rest
}) => {
  const classes = ['btn', VARIANT_CLASSES[variant], SIZE_CLASSES[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={classes}
      style={{
        ...(fullWidth ? { width: '100%' } : {}),
        ...style,
      }}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="animate-spin" style={{ flexShrink: 0 }} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
};
