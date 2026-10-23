import React from 'react';
import { Send, Check, X, ArrowRight, UserCheck } from 'lucide-react';
import { OrdenTrabajo, EstadoOT } from '../../../types';
import { HandoffConfig } from '../types/workshop.types';

interface OTStatusTransitionModalProps {
  isOpen: boolean;
  ot: OrdenTrabajo | null;
  handoffConfig: HandoffConfig | null;
  siguienteEstado: EstadoOT | null;
  onClose: () => void;
  onConfirmHandoff: (enviarWhatsApp: boolean) => void;
}

export const OTStatusTransitionModal: React.FC<OTStatusTransitionModalProps> = React.memo(({
  isOpen,
  ot,
  handoffConfig,
  siguienteEstado,
  onClose,
  onConfirmHandoff
}) => {
  if (!isOpen || !ot || !handoffConfig) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '480px', padding: '20px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>{handoffConfig.icono}</span>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700, color: '#fff' }}>
                {handoffConfig.title}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                OT #{ot.numero_ot} • {ot.item_nombre}
              </span>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '4px 8px' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Transition Summary Box */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Fase Actual:</span>
              <strong style={{ color: '#fbbf24' }}>{ot.estado}</strong>
            </div>
            <ArrowRight size={16} color="var(--brand-cyan)" />
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Próxima Fase:</span>
              <strong style={{ color: 'var(--brand-cyan)' }}>{siguienteEstado || 'Siguiente'}</strong>
            </div>
          </div>

          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            Destinatario del pase de turno: <strong style={{ color: '#fff' }}>{handoffConfig.nombre} ({handoffConfig.label})</strong> • Tel: {handoffConfig.telefono}
          </div>
        </div>

        {/* Preview of WhatsApp Message */}
        <div style={{
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '16px',
          fontSize: '0.76rem',
          color: '#86efac'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>💬 Mensaje preconfigurado para WhatsApp:</div>
          <p style={{ margin: 0, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
            "{handoffConfig.mensaje}"
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
          <button 
            type="button" 
            className="btn btn-whatsapp" 
            onClick={() => onConfirmHandoff(true)}
            style={{ fontWeight: 700, justifyContent: 'center' }}
          >
            <Send size={15} />
            <span>Notificar por WhatsApp y Avanzar Fase</span>
          </button>

          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => onConfirmHandoff(false)}
            style={{ justifyContent: 'center' }}
          >
            <Check size={15} />
            <span>Avanzar Fase sin Enviar WhatsApp</span>
          </button>

          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ justifyContent: 'center' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
});
OTStatusTransitionModal.displayName = 'OTStatusTransitionModal';
