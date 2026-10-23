import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  DollarSign, 
  Calendar, 
  Hash, 
  User, 
  CheckCircle2,
  Receipt
} from 'lucide-react';

export interface InfoCobroAEliminar {
  id: string;
  monto: number;
  referencia: string;
  fecha: string;
  concepto: string;
  clienteNombre: string;
  otId?: string;
  cuentaId?: string;
}

interface ModalConfirmarEliminarCobroProps {
  isOpen: boolean;
  cobro: InfoCobroAEliminar | null;
  onClose: () => void;
  onConfirmar: (cobroId: string, otId?: string, monto?: number) => Promise<void>;
}

export const ModalConfirmarEliminarCobro: React.FC<ModalConfirmarEliminarCobroProps> = ({
  isOpen,
  cobro,
  onClose,
  onConfirmar
}) => {
  if (!isOpen || !cobro) return null;

  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirmar(cobro.id, cobro.otId, cobro.monto);
      onClose();
    } catch (e) {
      console.error('Error al confirmar eliminación de cobro:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 7, 15, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div 
        role="dialog"
        aria-modal="true"
        style={{
          background: 'linear-gradient(180deg, rgba(24, 24, 37, 0.98) 0%, rgba(15, 15, 23, 0.98) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.45)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(239, 68, 68, 0.2)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Cabecera con Alerta Roja */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171'
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                Eliminar Cobro Duplicado
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Confirmación de reversión en ledger de finanzas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Diálogo */}
        <div style={{ padding: '20px' }}>
          <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 16px 0' }}>
            ¿Estás seguro de que deseas eliminar este cobro o abono duplicado? El dinero será deducido y el saldo pendiente de la orden se recalculará automáticamente en tiempo real.
          </p>

          {/* Tarjeta de Detalles del Cobro */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Monto a Revertir:</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f87171', fontFamily: 'var(--font-display)' }}>
                -${cobro.monto.toLocaleString('es-CO')} COP
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={13} /> Cliente:
                </span>
                <strong style={{ color: '#fff' }}>{cobro.clienteNombre}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Receipt size={13} /> Orden / Concepto:
                </span>
                <strong style={{ color: 'var(--brand-cyan)' }}>{cobro.concepto}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Hash size={13} /> Referencia:
                </span>
                <span style={{ color: '#fbbf24', fontWeight: 700, fontFamily: 'monospace' }}>
                  {cobro.referencia || 'Sin referencia'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} /> Fecha del Abono:
                </span>
                <span style={{ color: '#cbd5e1' }}>{cobro.fecha}</span>
              </div>
            </div>
          </div>

          <div style={{
            padding: '10px 14px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '8px',
            fontSize: '0.76rem',
            color: '#fbbf24',
            lineHeight: 1.4,
            marginBottom: '20px'
          }}>
            ⚡ <strong>Aviso del Ledger:</strong> La eliminación atómica removerá el registro de <code>abonos_pagos</code> y ejecutará el trigger <code>trg_sincronizar_abono_ot</code> para restaurar el saldo en el taller.
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isDeleting}
              style={{ padding: '8px 16px', fontSize: '0.88rem' }}
            >
              Cancelar
            </button>

            <button
              id="btn-confirmar-eliminar-cobro"
              type="button"
              className="btn btn-danger"
              onClick={handleConfirm}
              disabled={isDeleting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 800,
                padding: '8px 18px',
                fontSize: '0.88rem',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
              }}
            >
              <Trash2 size={16} />
              <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar Duplicado'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
