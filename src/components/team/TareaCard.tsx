import React from 'react';
import { 
  Check, 
  Trash2, 
  Send, 
  MessageSquare, 
  Plus, 
  Clock, 
  Flame, 
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { TareaEquipo } from '../../types/tasks';

interface TareaCardProps {
  tarea: TareaEquipo;
  conteoAvances?: number;
  onToggleCompletada: (tarea: TareaEquipo) => void;
  onEliminarTarea: (id: string) => void;
  onOpenWhatsApp: (tarea: TareaEquipo) => void;
  onOpenBitacora: (tarea: TareaEquipo) => void;
}

export const TareaCard: React.FC<TareaCardProps> = ({
  tarea,
  conteoAvances = 0,
  onToggleCompletada,
  onEliminarTarea,
  onOpenWhatsApp,
  onOpenBitacora
}) => {
  const esUrgente = tarea.prioridad === 'urgente';
  const esAlta = tarea.prioridad === 'alta';
  const porcentaje = typeof tarea.porcentaje_completado === 'number' ? tarea.porcentaje_completado : 0;

  // Color de borde de acento según estado y prioridad
  const borderColor = tarea.completada 
    ? '#10b981' 
    : esUrgente 
      ? '#ef4444' 
      : esAlta 
        ? '#f59e0b' 
        : 'var(--border-subtle)';

  return (
    <div 
      className="glass-card" 
      style={{ 
        margin: 0, 
        padding: '14px 16px', 
        opacity: tarea.completada ? 0.65 : 1,
        borderLeft: `4px solid ${borderColor}`,
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Checkbox circular de completado */}
        <button
          type="button"
          onClick={() => onToggleCompletada(tarea)}
          title={tarea.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: `2px solid ${tarea.completada ? '#10b981' : 'var(--text-muted)'}`,
            background: tarea.completada ? '#10b981' : 'transparent',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            marginTop: '2px',
            transition: 'all 0.15s ease'
          }}
        >
          {tarea.completada && <Check size={14} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Fila de Título y Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ 
              fontSize: '0.94rem', 
              fontWeight: 700, 
              color: tarea.completada ? 'var(--text-muted)' : '#fff',
              textDecoration: tarea.completada ? 'line-through' : 'none' 
            }}>
              {tarea.titulo}
            </span>

            {tarea.tipo === 'periodica' && (
              <span style={{ 
                fontSize: '0.68rem', 
                background: 'rgba(56, 189, 248, 0.15)', 
                color: 'var(--brand-cyan)', 
                padding: '1px 6px', 
                borderRadius: '4px', 
                fontWeight: 800 
              }}>
                🔄 {tarea.frecuencia}
              </span>
            )}

            {tarea.origen === 'whatsapp' && (
              <span style={{ 
                fontSize: '0.68rem', 
                background: 'rgba(34, 197, 94, 0.15)', 
                color: '#4ade80', 
                padding: '1px 6px', 
                borderRadius: '4px', 
                fontWeight: 700 
              }}>
                💬 WhatsApp
              </span>
            )}

            {esUrgente && (
              <span style={{ 
                fontSize: '0.68rem', 
                background: 'rgba(239, 68, 68, 0.2)', 
                color: '#f87171', 
                padding: '1px 6px', 
                borderRadius: '4px', 
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                <Flame size={10} /> Urgente
              </span>
            )}

            {esAlta && (
              <span style={{ 
                fontSize: '0.68rem', 
                background: 'rgba(245, 158, 11, 0.15)', 
                color: '#fbbf24', 
                padding: '1px 6px', 
                borderRadius: '4px', 
                fontWeight: 700 
              }}>
                Alta
              </span>
            )}
          </div>

          {/* Descripción si existe */}
          {tarea.descripcion && (
            <p style={{ 
              fontSize: '0.78rem', 
              color: 'var(--text-muted)', 
              margin: '0 0 6px 0', 
              lineHeight: 1.4,
              wordBreak: 'break-word' 
            }}>
              {tarea.descripcion}
            </p>
          )}

          {/* Metadata: Asignado, Creado, Fecha Límite */}
          <div style={{ 
            fontSize: '0.72rem', 
            color: 'var(--text-subtle)', 
            display: 'flex', 
            gap: '10px', 
            flexWrap: 'wrap',
            alignItems: 'center' 
          }}>
            <span>Asignado: <strong style={{ color: '#fff' }}>{tarea.asignado_a}</strong></span>
            <span>Creado: {tarea.fecha_creacion}</span>
            {tarea.fecha_completada && (
              <span style={{ color: '#34d399', fontWeight: 600 }}>
                Completado: {tarea.fecha_completada}
              </span>
            )}
          </div>
        </div>

        {/* Acciones de la derecha: WhatsApp + Eliminar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onOpenWhatsApp(tarea)}
            className="btn btn-whatsapp btn-sm"
            style={{
              fontSize: '0.72rem',
              padding: '4px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Enviar tarea por WhatsApp a Germán, Juan y Wendy"
          >
            <Send size={12} />
            <span className="hidden-mobile">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => onEliminarTarea(tarea.id)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'rgba(255,255,255,0.25)', 
              cursor: 'pointer', 
              padding: '6px',
              borderRadius: '6px'
            }}
            title="Eliminar tarea"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* FOOTER DE LA TARJETA: BARRA DE PROGRESO COMPACTA & ACCESO A BITÁCORA */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        paddingTop: '8px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {/* Barra de Progreso Compacta */}
        <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={11} color="#38bdf8" />
              Progreso
            </span>
            <span style={{ 
              fontSize: '0.72rem', 
              fontWeight: 800, 
              color: porcentaje >= 100 ? '#4ade80' : '#38bdf8' 
            }}>
              {porcentaje}%
            </span>
          </div>

          <div style={{
            height: '5px',
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '9999px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${porcentaje}%`,
              background: porcentaje >= 100 
                ? 'linear-gradient(90deg, #10b981, #4ade80)' 
                : 'linear-gradient(90deg, #0284c7, #38bdf8)',
              borderRadius: '9999px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Botones de Bitácora / Avances */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Badge de contador de notas */}
          <button
            type="button"
            onClick={() => onOpenBitacora(tarea)}
            style={{
              background: conteoAvances > 0 ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              border: conteoAvances > 0 ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              color: conteoAvances > 0 ? '#38bdf8' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 9px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
            title="Ver bitácora e historial de avances de esta tarea"
          >
            <MessageSquare size={12} />
            <span>{conteoAvances > 0 ? `${conteoAvances} avances` : 'Sin avances'}</span>
          </button>

          {/* Botón Acción Rápida: + Agregar Avance */}
          <button
            type="button"
            onClick={() => onOpenBitacora(tarea)}
            style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(2, 132, 199, 0.15))',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '6px',
              color: '#38bdf8',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '4px 10px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={12} />
            <span>Avance</span>
          </button>
        </div>
      </div>
    </div>
  );
};
