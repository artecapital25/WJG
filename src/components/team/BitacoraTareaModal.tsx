import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  User, 
  Flame, 
  MessageSquare,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { TareaEquipo, TareaAvance } from '../../types/tasks';
import { useTareaAvances } from '../../hooks/useTareaAvances';

interface BitacoraTareaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tarea: TareaEquipo | null;
  activeOperator?: string;
  currentUser?: { id?: string; nombre: string; rol?: string };
  onAvanceGuardado?: (tareaActualizada: TareaEquipo) => void;
}

// Formateador de fechas legible para el taller
function formatFechaLegible(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const esHoy = d.toDateString() === now.toDateString();
    
    const hora = d.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });

    if (esHoy) return `Hoy a las ${hora}`;

    const ayer = new Date(now);
    ayer.setDate(now.getDate() - 1);
    if (d.toDateString() === ayer.toDateString()) return `Ayer a las ${hora}`;

    return `${d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} a las ${hora}`;
  } catch {
    return dateStr;
  }
}

// Retorna el color y badge para el rol del colaborador
function getColaboradorBadge(nombre: string) {
  const clean = (nombre || '').toLowerCase();
  if (clean.includes('juan')) {
    return {
      rol: 'Impresión 3D',
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
      initial: 'J'
    };
  }
  if (clean.includes('wendy')) {
    return {
      rol: 'Pintura & Acabados',
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.15)',
      initial: 'W'
    };
  }
  if (clean.includes('german') || clean.includes('germán')) {
    return {
      rol: 'Admin & Ventas',
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.15)',
      initial: 'G'
    };
  }
  return {
    rol: 'Colaborador',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    initial: (nombre || 'C').charAt(0).toUpperCase()
  };
}

export const BitacoraTareaModal: React.FC<BitacoraTareaModalProps> = ({
  isOpen,
  onClose,
  tarea,
  activeOperator = 'Juan',
  currentUser,
  onAvanceGuardado
}) => {
  const [nota, setNota] = useState('');
  const [porcentaje, setPorcentaje] = useState<number>(0);

  const {
    avances,
    isLoading,
    isSaving,
    getAvances,
    agregarAvance
  } = useTareaAvances(isOpen ? tarea?.id : undefined);

  // Inicializar porcentaje con el valor actual de la tarea al abrir el modal
  useEffect(() => {
    if (isOpen && tarea) {
      setPorcentaje(typeof tarea.porcentaje_completado === 'number' ? tarea.porcentaje_completado : 0);
      setNota('');
      getAvances(tarea.id);
    }
  }, [isOpen, tarea, getAvances]);

  if (!isOpen || !tarea) return null;

  const currentPorcentaje = typeof tarea.porcentaje_completado === 'number' ? tarea.porcentaje_completado : 0;
  const badgeInfo = getColaboradorBadge(activeOperator);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim() || isSaving) return;

    const saved = await agregarAvance(
      tarea.id,
      nota.trim(),
      porcentaje,
      {
        id: currentUser?.id,
        nombre: activeOperator,
        rol: currentUser?.rol
      }
    );

    if (saved) {
      setNota('');
      // Notificar al componente padre para que la tarjeta actualice la barra de progreso reactivamente
      if (onAvanceGuardado) {
        onAvanceGuardado({
          ...tarea,
          porcentaje_completado: porcentaje,
          ultimo_avance_at: saved.created_at,
          total_avances: (tarea.total_avances || 0) + 1
        });
      }
    }
  };

  const aplicarPresetPorcentaje = (nuevoValor: number) => {
    setPorcentaje(Math.max(0, Math.min(100, nuevoValor)));
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        className="glass-card" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
      >
        {/* CABECERA DEL MODAL */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0) 100%)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                fontWeight: 800,
                letterSpacing: '0.05em',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                Bitácora de Taller
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Asignado a: <strong style={{ color: '#fff' }}>{tarea.asignado_a}</strong>
              </span>
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              {tarea.titulo}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* BARRA DE PROGRESO GENERAL DE LA TAREA */}
        <div style={{
          padding: '12px 20px',
          background: 'rgba(15, 23, 42, 0.8)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} color="#38bdf8" />
              Progreso actual de la tarea
            </span>
            <span style={{ 
              fontSize: '0.85rem', 
              fontWeight: 800, 
              color: currentPorcentaje >= 100 ? '#4ade80' : '#38bdf8' 
            }}>
              {currentPorcentaje}% {currentPorcentaje >= 100 ? '✓ Completada' : ''}
            </span>
          </div>

          <div style={{
            height: '8px',
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '9999px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${currentPorcentaje}%`,
              background: currentPorcentaje >= 100 
                ? 'linear-gradient(90deg, #10b981, #4ade80)' 
                : 'linear-gradient(90deg, #0284c7, #38bdf8)',
              borderRadius: '9999px',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL: FORMULARIO + TIMELINE CON SCROLL */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* FORMULARIO DE INSERCIÓN RÁPIDA DE AVANCE */}
          <form 
            onSubmit={handleGuardar}
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={15} color="#38bdf8" />
                Registrar nuevo avance o hallazgo
              </span>
              <span style={{
                fontSize: '0.74rem',
                color: badgeInfo.color,
                background: badgeInfo.bg,
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 700
              }}>
                ✍️ {activeOperator} ({badgeInfo.rol})
              </span>
            </div>

            <textarea
              className="form-input"
              rows={3}
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Describe qué se hizo, parámetros calibrados, hallazgos o bloqueos (ej. Se completó el curado a 405nm, se prepara para lijado)..."
              style={{
                width: '100%',
                resize: 'none',
                marginBottom: '12px',
                fontSize: '0.85rem',
                lineHeight: 1.5
              }}
              required
            />

            {/* CONTROL DE PORCENTAJE DE AVANCE */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  ACTUALIZAR PROGRESO GLOBAL:
                </label>
                <span style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 800, 
                  color: porcentaje >= 100 ? '#4ade80' : '#38bdf8' 
                }}>
                  {porcentaje}%
                </span>
              </div>

              {/* Slider Reactivo */}
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={porcentaje}
                onChange={e => setPorcentaje(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#38bdf8',
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              />

              {/* Presets Rápidos */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { label: '+10%', val: currentPorcentaje + 10 },
                  { label: '+25%', val: currentPorcentaje + 25 },
                  { label: '50%', val: 50 },
                  { label: '75%', val: 75 },
                  { label: '100% (Listo)', val: 100 }
                ].map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => aplicarPresetPorcentaje(p.val)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving || !nota.trim()}
              className="btn btn-primary"
              style={{
                width: '100%',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                opacity: isSaving || !nota.trim() ? 0.6 : 1
              }}
            >
              <Send size={15} />
              <span>{isSaving ? 'Guardando avance...' : 'Guardar Avance en Bitácora'}</span>
            </button>
          </form>

          {/* LÍNEA DE TIEMPO (TIMELINE) DE AVANCES */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Clock size={16} color="var(--brand-cyan)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Historial de Avances ({avances.length})
              </h3>
            </div>

            {isLoading && avances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                <Clock size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                <p style={{ fontSize: '0.82rem' }}>Cargando bitácora técnica...</p>
              </div>
            ) : avances.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '32px 16px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '12px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                color: 'var(--text-muted)'
              }}>
                <MessageSquare size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem', margin: '0 0 4px 0', color: '#fff', fontWeight: 600 }}>
                  Sin notas de progreso aún
                </p>
                <p style={{ fontSize: '0.78rem', margin: 0 }}>
                  Sé el primero en documentar avances parciales o bloqueos para esta labor.
                </p>
              </div>
            ) : (
              <div style={{
                position: 'relative',
                paddingLeft: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                {/* Línea vertical del timeline */}
                <div style={{
                  position: 'absolute',
                  left: '9px',
                  top: '12px',
                  bottom: '12px',
                  width: '2px',
                  backgroundColor: 'rgba(56, 189, 248, 0.2)'
                }} />

                {avances.map(av => {
                  const badge = getColaboradorBadge(av.usuario_nombre);

                  return (
                    <div 
                      key={av.id}
                      style={{
                        position: 'relative',
                        backgroundColor: 'rgba(30, 41, 59, 0.45)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        transition: 'border-color 0.15s ease'
                      }}
                    >
                      {/* Punto en la línea de tiempo */}
                      <div style={{
                        position: 'absolute',
                        left: '-20px',
                        top: '14px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: badge.color,
                        border: '2px solid #0f172a'
                      }} />

                      {/* Header del ítem de avance */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginBottom: '6px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Avatar Circular */}
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: badge.bg,
                            color: badge.color,
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${badge.color}`
                          }}>
                            {badge.initial}
                          </div>

                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                            {av.usuario_nombre}
                          </span>

                          <span style={{
                            fontSize: '0.68rem',
                            color: badge.color,
                            background: badge.bg,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            {badge.rol}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {typeof av.porcentaje_avance === 'number' && (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: '#38bdf8',
                              background: 'rgba(56, 189, 248, 0.12)',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              Progreso: {av.porcentaje_avance}%
                            </span>
                          )}

                          <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                            {formatFechaLegible(av.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Texto de la nota */}
                      <p style={{
                        fontSize: '0.84rem',
                        color: 'rgba(255, 255, 255, 0.9)',
                        margin: 0,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {av.nota_avance}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* PIE DEL MODAL */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            Cerrar Bitácora
          </button>
        </div>
      </div>
    </div>
  );
};
