import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { WjgModal } from './WjgModal';
import { WjgButton } from './WjgButton';

export interface WjgConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
}

export const WjgConfirmModal: React.FC<WjgConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}) => {
  const borderColor =
    variant === 'danger'
      ? 'rgba(239, 68, 68, 0.45)'
      : variant === 'warning'
      ? 'rgba(245, 158, 11, 0.45)'
      : 'rgba(56, 189, 248, 0.45)';

  return (
    <WjgModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="440px"
      borderColor={borderColor}
      zIndex={100020}
      title={title}
      icon={
        variant === 'danger' ? (
          <Trash2 size={18} color="#f87171" />
        ) : (
          <AlertTriangle size={18} color={variant === 'warning' ? '#fbbf24' : '#38bdf8'} />
        )
      }
      footer={
        <>
          <WjgButton variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            {cancelText}
          </WjgButton>
          <WjgButton
            variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary'}
            size="sm"
            loading={loading}
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </WjgButton>
        </>
      }
    >
      <div style={{ fontSize: '0.88rem', lineHeight: 1.55, color: '#cbd5e1', whiteSpace: 'pre-line' }}>
        {message}
      </div>
    </WjgModal>
  );
};
