import React, { useState } from 'react';
import { 
  Zap, 
  Send, 
  CheckCircle2, 
  X, 
  Copy, 
  Check, 
  Loader2, 
  Phone, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink 
} from 'lucide-react';
import { WhatsAppGatewayService } from '../../services/whatsappGatewayService';
import { formatWhatsAppPhone } from '../../services/whatsappService';
import { toast } from '../ui/ToastProvider';

export interface ResumenFinancieroItem {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}

export interface ModalConfirmacionWhatsAppProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo?: string;
  clienteNombre: string;
  clienteTelefono: string;
  mensajeWhatsApp: string;
  resumenDetalle: ResumenFinancieroItem[];
  onConfirmadoExitoso: () => void;
  onConfirmarSinEnvio: () => void;
}

export const ModalConfirmacionWhatsApp: React.FC<ModalConfirmacionWhatsAppProps> = ({
  isOpen,
  onClose,
  titulo,
  subtitulo,
  clienteNombre,
  clienteTelefono,
  mensajeWhatsApp,
  resumenDetalle,
  onConfirmadoExitoso,
  onConfirmarSinEnvio
}) => {
  const [telefonoEditable, setTelefonoEditable] = useState<string>(() => clienteTelefono || '');
  const [isSending, setIsSending] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  // Actualizar si cambia el prop
  React.useEffect(() => {
    setTelefonoEditable(clienteTelefono || '');
    setErrorEnvio(null);
  }, [clienteTelefono, isOpen]);

  if (!isOpen) return null;

  const handleCopiarMensaje = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(mensajeWhatsApp);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      }
    } catch (_) {}
  };

  const handleDespachoCorporativo = async () => {
    const cleanPhone = formatWhatsAppPhone(telefonoEditable);
    if (!cleanPhone || cleanPhone.length < 7 || cleanPhone === '3000000000' || cleanPhone === '573000000000') {
      toast.warning('Ingresa un número de celular o WhatsApp válido para el cliente antes de despachar.');
      return;
    }

    setIsSending(true);
    setErrorEnvio(null);

    try {
      const res = await WhatsAppGatewayService.sendTextMessage(cleanPhone, mensajeWhatsApp);

      if (res.success) {
        toast.success(`WhatsApp despachado automáticamente desde la línea corporativa (+57 320 2796115)`);
        onConfirmadoExitoso();
      } else {
        const errorMsg = res.error || 'La línea corporativa no respondió en este momento.';
        setErrorEnvio(errorMsg);
        toast.error(`No se pudo despachar por la línea corporativa: ${errorMsg}`);
      }
    } catch (err: any) {
      const msg = err?.message || 'Error de conexión con el servidor corporativo.';
      setErrorEnvio(msg);
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleFallbackManual = () => {
    const cleanPhone = formatWhatsAppPhone(telefonoEditable);
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensajeWhatsApp)}`;
    if (typeof window !== 'undefined' && window.open) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    toast.info('Abriendo enlace de WhatsApp asistido...');
    onConfirmadoExitoso();
  };

  return (
    <div 
      className="modal-overlay" 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSending) onClose();
      }}
    >
      <div 
        className="glass-card" 
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#0d1527',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(56, 189, 248, 0.15)',
          padding: '24px',
          color: '#e2e8f0',
          position: 'relative'
        }}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', 
                color: '#fff', 
                padding: '6px', 
                borderRadius: '8px', 
                display: 'flex' 
              }}>
                <Zap size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                {titulo}
              </h3>
            </div>
            {subtitulo && (
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                {subtitulo}
              </p>
            )}
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSending}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#94a3b8', 
              cursor: isSending ? 'not-allowed' : 'pointer',
              padding: '4px' 
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Insignia de Canal Corporativo */}
        <div style={{
          background: 'rgba(37, 211, 102, 0.08)',
          border: '1px solid rgba(37, 211, 102, 0.3)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <ShieldCheck size={18} color="#25D366" />
          <div style={{ fontSize: '0.82rem' }}>
            <span style={{ color: '#86efac', fontWeight: 700 }}>Despacho en Segundo Plano: </span>
            <span style={{ color: '#f1f5f9' }}>Línea Oficial WhatsApp Corporativo <strong>+57 320 2796115</strong></span>
          </div>
        </div>

        {/* Datos del Cliente y Teléfono */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Destinatario de la Notificación
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>
              👤 {clienteNombre || 'Cliente General'}
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
              Teléfono WhatsApp (Editar si es necesario):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                background: 'rgba(0, 0, 0, 0.3)', 
                padding: '8px 12px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#38bdf8',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}>
                <Phone size={14} />
                <span>+57</span>
              </div>
              <input 
                type="tel"
                value={telefonoEditable}
                onChange={(e) => setTelefonoEditable(e.target.value)}
                placeholder="Ej: 3202796115"
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              />
            </div>
          </div>
        </div>

        {/* Resumen Detalle de la Operación */}
        {resumenDetalle && resumenDetalle.length > 0 && (
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
              Resumen de la Transacción
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {resumenDetalle.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: item.destacado ? '#f8fafc' : '#94a3b8', fontWeight: item.destacado ? 700 : 400 }}>
                    {item.etiqueta}:
                  </span>
                  <span style={{ 
                    color: item.destacado ? 'var(--brand-cyan)' : '#f1f5f9', 
                    fontWeight: item.destacado ? 800 : 600,
                    fontSize: item.destacado ? '0.95rem' : '0.85rem'
                  }}>
                    {item.valor}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vista Previa del Mensaje de WhatsApp */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Vista Previa del Mensaje
            </span>
            <button 
              type="button" 
              onClick={handleCopiarMensaje}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '3px 8px',
                color: copiado ? '#86efac' : '#cbd5e1',
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {copiado ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiado ? 'Copiado' : 'Copiar Texto'}</span>
            </button>
          </div>
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '12px',
            fontSize: '0.78rem',
            lineHeight: 1.5,
            color: '#cbd5e1',
            whiteSpace: 'pre-wrap',
            maxHeight: '140px',
            overflowY: 'auto',
            fontFamily: 'monospace'
          }}>
            {mensajeWhatsApp}
          </div>
        </div>

        {/* Alerta de Error y Fallback de Contingencia */}
        {errorEnvio && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
              <AlertTriangle size={16} />
              <span>Línea Corporativa No Disponible</span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#fca5a5' }}>
              {errorEnvio}. Puedes reintentar o usar el enlace asistido sin perder tu venta ni cotización.
            </p>
            <button
              type="button"
              onClick={handleFallbackManual}
              style={{
                width: '100%',
                background: 'rgba(37, 211, 102, 0.2)',
                border: '1px solid rgba(37, 211, 102, 0.4)',
                color: '#86efac',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <ExternalLink size={14} />
              <span>Abrir en WhatsApp Manual (wa.me) como Contingencia</span>
            </button>
          </div>
        )}

        {/* Botones de Acción */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            type="button" 
            onClick={handleDespachoCorporativo}
            disabled={isSending}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 18px',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: isSending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(37, 211, 102, 0.35)',
              opacity: isSending ? 0.75 : 1
            }}
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
            <span>{isSending ? 'Despachando desde WhatsApp Corporativo...' : '⚡ Despachar desde WhatsApp Corporativo (+57 320 2796115)'}</span>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
            <button 
              type="button" 
              onClick={onConfirmarSinEnvio}
              disabled={isSending}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#e2e8f0',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: isSending ? 'not-allowed' : 'pointer'
              }}
            >
              Guardar sin enviar mensaje
            </button>

            <button 
              type="button" 
              onClick={onClose}
              disabled={isSending}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#f87171',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: isSending ? 'not-allowed' : 'pointer'
              }}
            >
              Volver a editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

