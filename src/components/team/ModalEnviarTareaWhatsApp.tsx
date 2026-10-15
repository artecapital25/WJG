import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Check, 
  Copy, 
  Users, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { TareaEquipo } from '../../types';
import { 
  LISTA_MIEMBROS_WJG, 
  generateTareaWhatsAppUrl, 
  openWhatsApp,
  MiembroEquipoWJG 
} from '../../services/whatsappService';

interface ModalEnviarTareaWhatsAppProps {
  isOpen: boolean;
  tarea: TareaEquipo | null;
  onClose: () => void;
}

export const ModalEnviarTareaWhatsApp: React.FC<ModalEnviarTareaWhatsAppProps> = ({
  isOpen,
  tarea,
  onClose
}) => {
  if (!isOpen || !tarea) return null;

  const [copiado, setCopiado] = useState(false);
  const [enviadosMap, setEnviadosMap] = useState<Record<string, boolean>>({});
  const [enviandoATodos, setEnviandoATodos] = useState(false);
  const [mensajeTodosEnviado, setMensajeTodosEnviado] = useState(false);

  const handleEnviarIndividual = (miembro: MiembroEquipoWJG) => {
    const url = generateTareaWhatsAppUrl(tarea, miembro.telefonoLimpio, miembro.nombre);
    openWhatsApp(url);
    setEnviadosMap(prev => ({ ...prev, [miembro.id]: true }));
  };

  const handleEnviarALosTres = () => {
    setEnviandoATodos(true);
    setMensajeTodosEnviado(false);

    LISTA_MIEMBROS_WJG.forEach((miembro, index) => {
      setTimeout(() => {
        const url = generateTareaWhatsAppUrl(tarea, miembro.telefonoLimpio, miembro.nombre);
        openWhatsApp(url);
        setEnviadosMap(prev => ({ ...prev, [miembro.id]: true }));

        if (index === LISTA_MIEMBROS_WJG.length - 1) {
          setEnviandoATodos(false);
          setMensajeTodosEnviado(true);
        }
      }, index * 400);
    });
  };

  const mensajeEjemplo = generateTareaWhatsAppUrl(tarea, '573503443140', 'Equipo');
  const textoMensaje = decodeURIComponent(mensajeEjemplo.split('text=')[1] || '');

  const handleCopiarTexto = () => {
    navigator.clipboard.writeText(textoMensaje).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  const prioridadColor = tarea.prioridad === 'urgente' ? '#ef4444' : tarea.prioridad === 'alta' ? '#f59e0b' : 'var(--brand-cyan)';

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card"
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          boxShadow: '0 12px 40px rgba(34, 197, 94, 0.2)',
          padding: '24px',
          position: 'relative',
          background: 'linear-gradient(180deg, #0b1712 0%, #090e0c 100%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Send size={24} color="#4ade80" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#4ade80' }}>
              Enviar Tarea por WhatsApp
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Notifica al equipo de WJGEEKS 3D (Germán, Juan y Wendy) automáticamente.
            </p>
          </div>
        </div>

        {/* Ficha de la Tarea */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.45)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.96rem', color: '#fff' }}>
              {tarea.titulo}
            </span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: '4px',
              background: `${prioridadColor}22`,
              color: prioridadColor,
              border: `1px solid ${prioridadColor}44`,
              whiteSpace: 'nowrap'
            }}>
              {tarea.prioridad.toUpperCase()}
            </span>
          </div>

          {tarea.descripcion && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
              {tarea.descripcion}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', fontSize: '0.74rem', color: 'var(--text-subtle)', flexWrap: 'wrap' }}>
            <span>👤 Asignado: <strong style={{ color: 'var(--text-main)' }}>{tarea.asignado_a}</strong></span>
            <span>🏷️ Tipo: <strong>{tarea.tipo === 'periodica' ? `Rutina (${tarea.frecuencia})` : 'Puntual'}</strong></span>
          </div>
        </div>

        {/* BOTÓN PRINCIPAL: ENVIAR A LOS 3 AUTOMÁTICAMENTE */}
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={handleEnviarALosTres}
            disabled={enviandoATodos}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '14px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontWeight: 900,
              fontSize: '1rem',
              boxShadow: '0 4px 18px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <Send size={18} />
            <span>
              {enviandoATodos 
                ? 'Abriendo WhatsApp para los 3...' 
                : '🚀 Enviar a los 3 (Germán, Juan y Wendy)'}
            </span>
          </button>

          {mensajeTodosEnviado && (
            <div style={{
              marginTop: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} />
              <span>
                ¡Listo! Se abrieron los chats de WhatsApp con el mensaje preparado para los 3 integrantes.
              </span>
            </div>
          )}
        </div>

        {/* Directorio de Integrantes con Envío Individual */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            O enviar individualmente a cada persona:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {LISTA_MIEMBROS_WJG.map((miembro) => {
              const yaEnviado = enviadosMap[miembro.id];

              return (
                <div 
                  key={miembro.id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: yaEnviado ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
                        {miembro.nombre === 'Germán' ? '👤 Germán' : miembro.nombre === 'Juan' ? '🎨 Juan' : '💼 Wendy'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 700 }}>
                        📱 {miembro.telefono}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {miembro.rol}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEnviarIndividual(miembro)}
                    className="btn btn-sm"
                    style={{
                      background: yaEnviado ? 'rgba(16, 185, 129, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                      color: yaEnviado ? '#34d399' : '#4ade80',
                      border: '1px solid rgba(34, 197, 94, 0.35)',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {yaEnviado ? <Check size={13} /> : <Send size={13} />}
                    <span>{yaEnviado ? 'Re-enviar' : `Enviar a ${miembro.nombre}`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vista previa del mensaje */}
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Vista previa del mensaje de WhatsApp:
            </span>
            <button
              type="button"
              onClick={handleCopiarTexto}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--brand-cyan)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 700
              }}
            >
              {copiado ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
              <span>{copiado ? '¡Copiado!' : 'Copiar texto'}</span>
            </button>
          </div>

          <pre style={{
            fontSize: '0.76rem',
            color: 'var(--text-main)',
            whiteSpace: 'pre-wrap',
            margin: 0,
            fontFamily: 'monospace',
            lineHeight: 1.45,
            maxHeight: '130px',
            overflowY: 'auto'
          }}>
            {textoMensaje}
          </pre>
        </div>

        {/* Botón Cerrar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '8px 16px' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
