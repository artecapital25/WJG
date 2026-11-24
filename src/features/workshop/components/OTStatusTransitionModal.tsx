import React, { useState, useEffect } from 'react';
import { Send, Check, ArrowRight, Activity, Mail, MessageCircle, Users } from 'lucide-react';
import { OrdenTrabajo, EstadoOT } from '../../../types';
import { HandoffConfig } from '../types/workshop.types';
import { WjgBadge, WjgButton, WjgModal, WjgSwitch } from '../../../components/ui';

interface OTStatusTransitionModalProps {
  isOpen: boolean;
  ot: OrdenTrabajo | null;
  handoffConfig: HandoffConfig | null;
  siguienteEstado: EstadoOT | null;
  onClose: () => void;
  onConfirmHandoff: (enviarWhatsApp: boolean, enviarCorreo?: boolean) => void;
  onOpenConsumoReal?: (ot: OrdenTrabajo) => void;
}

export const OTStatusTransitionModal: React.FC<OTStatusTransitionModalProps> = React.memo(({
  isOpen,
  ot,
  handoffConfig,
  siguienteEstado,
  onClose,
  onConfirmHandoff,
  onOpenConsumoReal
}) => {
  const [enviarWhatsApp, setEnviarWhatsApp] = useState(true);
  const [enviarCorreo, setEnviarCorreo] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setEnviarWhatsApp(true);
    setEnviarCorreo(handoffConfig?.isCliente ? Boolean(handoffConfig?.correo) : true);
  }, [isOpen, handoffConfig]);

  if (!isOpen || !ot || !handoffConfig) return null;

  return (
    <WjgModal
      isOpen={isOpen}
      onClose={onClose}
      title={handoffConfig.title}
      subtitle={`OT #${ot.numero_ot} • ${ot.item_nombre}`}
      icon={<span style={{ fontSize: '1.15rem' }}>{handoffConfig.icono}</span>}
      maxWidth="520px"
      borderColor="rgba(56, 189, 248, 0.35)"
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          {onOpenConsumoReal && (
            <WjgButton
              variant="secondary"
              size="sm"
              fullWidth
              leftIcon={<Activity size={14} />}
              onClick={() => {
                onClose();
                onOpenConsumoReal(ot);
              }}
              style={{ borderColor: 'rgba(56, 189, 248, 0.45)', color: '#38bdf8' }}
            >
              Registrar Consumos Reales Antes de Avanzar
            </WjgButton>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <WjgButton variant="secondary" size="sm" onClick={onClose}>
              Cancelar
            </WjgButton>
            <WjgButton
              variant="primary"
              size="sm"
              leftIcon={<Check size={14} />}
              onClick={() => onConfirmHandoff(false, false)}
            >
              Solo Avanzar Fase
            </WjgButton>
            <WjgButton
              variant="whatsapp"
              size="sm"
              leftIcon={<Send size={14} />}
              onClick={() => onConfirmHandoff(enviarWhatsApp, enviarCorreo)}
            >
              Notificar y Avanzar
            </WjgButton>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 14px'
          }}
        >
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

          <div
            style={{
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.76rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            <span>
              Destinatario: <strong style={{ color: '#fff' }}>{handoffConfig.nombre}</strong>
            </span>
            {handoffConfig.isGrupoEquipo ? (
              <WjgBadge variant="purple">
                <Users size={11} /> Grupo WhatsApp Taller + 3 Correos
              </WjgBadge>
            ) : (
              <WjgBadge variant="cyan">Tel: {handoffConfig.telefono || 'Sin teléfono'}</WjgBadge>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '8px' }}>
          <WjgSwitch
            checked={enviarWhatsApp}
            onChange={setEnviarWhatsApp}
            accentColor="#25D366"
            label={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <MessageCircle size={14} color="#4ade80" />
                Notificar por WhatsApp
              </span>
            }
            description={handoffConfig.isGrupoEquipo ? 'Canal Grupo Taller' : handoffConfig.nombre}
          />
          <WjgSwitch
            checked={enviarCorreo}
            onChange={setEnviarCorreo}
            accentColor="#38bdf8"
            label={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} color="#38bdf8" />
                Notificar por Correo
              </span>
            }
            description={
              handoffConfig.isGrupoEquipo
                ? 'Correos de Germán, Juan y Wendy'
                : handoffConfig.correo || (handoffConfig.isCliente ? 'Solo si el cliente tiene email' : 'Correo del responsable')
            }
          />
        </div>

        <div
          style={{
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '0.76rem',
            color: '#86efac'
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>💬 Mensaje que se enviará:</div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
            {handoffConfig.mensaje}
          </p>
        </div>
      </div>
    </WjgModal>
  );
});
OTStatusTransitionModal.displayName = 'OTStatusTransitionModal';
