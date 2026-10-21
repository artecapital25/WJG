import React from 'react';
import { 
  DollarSign, 
  Clock, 
  ExternalLink, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { CalendarEvent, TipoEventoCalendario } from '../../types';

interface MobileEventCardProps {
  event: CalendarEvent;
  onDeepLink: (event: CalendarEvent) => void;
  onReschedule?: (event: CalendarEvent) => void;
}

const COLORES_TIPO: Record<TipoEventoCalendario, { bg: string; border: string; text: string; icon: string; label: string }> = {
  vencimiento_cobro: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.4)', text: '#f87171', icon: '💰', label: 'Cobro Pendiente' },
  entrega_pedido: { bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.4)', text: '#38bdf8', icon: '📦', label: 'Entrega de Pedido' },
  tarea_individual: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24', icon: '👤', label: 'Tarea Individual' },
  tarea_grupal: { bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.4)', text: '#c084fc', icon: '👥', label: 'Tarea Grupal' },
  rutina_diaria: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399', icon: '🔄', label: 'Rutina Diaria' },
  llegada_insumo: { bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.4)', text: '#f472b6', icon: '🛒', label: 'Insumo Taller' },
  vencimiento_cotizacion: { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.4)', text: '#94a3b8', icon: '📄', label: 'Cotización' }
};

const AVATARES_RESPONSABLE: Record<string, { color: string; badge: string }> = {
  'Germán': { color: '#0ea5e9', badge: 'G' },
  'Wendy': { color: '#ec4899', badge: 'W' },
  'Juan': { color: '#f59e0b', badge: 'J' },
  'Todos': { color: '#10b981', badge: '★' }
};

export const MobileEventCard: React.FC<MobileEventCardProps> = ({
  event,
  onDeepLink,
  onReschedule
}) => {
  const cfg = COLORES_TIPO[event.tipo_evento] || COLORES_TIPO.tarea_individual;
  const resp = AVATARES_RESPONSABLE[event.responsable] || { color: '#94a3b8', badge: event.responsable?.charAt(0) || '?' };

  const esCobro = event.tipo_evento === 'vencimiento_cobro';

  return (
    <div
      onClick={() => onDeepLink(event)}
      className="mobile-event-card"
      style={{
        background: 'linear-gradient(145deg, rgba(16, 23, 37, 0.88) 0%, rgba(11, 17, 28, 0.95) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderLeft: `5px solid ${cfg.text}`,
        borderRadius: '14px',
        padding: '14px 16px',
        minHeight: '52px',
        touchAction: 'manipulation',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
        userSelect: 'none'
      }}
    >
      {/* 1. Fila Superior: Tipo de Evento, Hora y Responsable */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1rem' }}>{cfg.icon}</span>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: cfg.text,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            padding: '2px 8px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.02em'
          }}>
            {cfg.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Hora o Plazo */}
          <span style={{
            fontSize: '0.72rem',
            color: '#94a3b8',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            fontWeight: 600
          }}>
            <Clock size={11} />
            {event.hora || (event.todo_el_dia ? 'Todo el día' : 'Programado')}
          </span>

          {/* Badge del Responsable */}
          <span 
            title={`Responsable: ${event.responsable}`}
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: resp.color,
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 6px ${resp.color}66`
            }}
          >
            {resp.badge}
          </span>
        </div>
      </div>

      {/* 2. Fila Central: Título y Entidad */}
      <div>
        <h4 style={{
          margin: 0,
          fontSize: '0.98rem',
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: 1.3,
          letterSpacing: '-0.01em'
        }}>
          {event.titulo}
        </h4>
        {event.descripcion && (
          <p style={{
            margin: '3px 0 0',
            fontSize: '0.8rem',
            color: '#94a3b8',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {event.descripcion}
          </p>
        )}
      </div>

      {/* 3. Fila Inferior: Monto Destacado (si aplica), Estado y CTA */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '6px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        marginTop: '2px',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        {/* Monto destacado para cobranzas o OTs con saldo */}
        {event.monto !== undefined && event.monto > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              fontSize: '0.92rem',
              fontWeight: 900,
              color: esCobro ? '#f87171' : '#34d399',
              fontFamily: 'var(--font-display, inherit)'
            }}>
              ${event.monto.toLocaleString('es-CO')} COP
            </span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>(Saldo)</span>
          </div>
        ) : (
          <div style={{
            fontSize: '0.72rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Calendar size={11} />
            <span>{event.fecha_inicio}</span>
          </div>
        )}

        {/* Botón o indicador táctil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onReschedule && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReschedule(event);
              }}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                minHeight: '26px'
              }}
            >
              Mover
            </button>
          )}

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#38bdf8'
          }}>
            <span>Ver</span>
            <ArrowUpRight size={13} />
          </div>
        </div>
      </div>
    </div>
  );
};
