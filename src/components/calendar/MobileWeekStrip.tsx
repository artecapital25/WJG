import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { DayInfo, TouchSwipeHandlers } from './useDateNavigation';
import { CalendarEvent, TipoEventoCalendario } from '../../types';

interface MobileWeekStripProps {
  weekDays: DayInfo[];
  eventos: CalendarEvent[];
  selectedDateStr: string;
  monthYearLabel: string;
  onSelectDate: (dateStr: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onGoToToday: () => void;
  touchHandlers: TouchSwipeHandlers;
  onOpenBottomSheet?: () => void;
}

export const MobileWeekStrip: React.FC<MobileWeekStripProps> = ({
  weekDays,
  eventos,
  selectedDateStr,
  monthYearLabel,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onGoToToday,
  touchHandlers,
  onOpenBottomSheet
}) => {
  // Función para obtener tipos de eventos presentes en un día específico (para los indicator dots)
  const getEventTypesForDate = (dateStr: string): TipoEventoCalendario[] => {
    const evs = eventos.filter(ev => ev.fecha_inicio.startsWith(dateStr));
    const types = new Set<TipoEventoCalendario>();
    evs.forEach(ev => types.add(ev.tipo_evento));
    return Array.from(types);
  };

  const getDotColor = (type: TipoEventoCalendario): string => {
    switch (type) {
      case 'vencimiento_cobro':
        return '#ef4444'; // Rojo intenso para cobros
      case 'entrega_pedido':
        return '#38bdf8'; // Azul cian para OTs y entregas
      case 'llegada_insumo':
        return '#ec4899'; // Rosa para insumos
      case 'tarea_grupal':
        return '#c084fc'; // Púrpura para tareas grupales
      case 'rutina_diaria':
        return '#10b981'; // Esmeralda para rutinas
      default:
        return '#f59e0b'; // Ámbar para tareas personales
    }
  };

  // Contar eventos del día seleccionado
  const eventosDiaSeleccionado = eventos.filter(ev => ev.fecha_inicio.startsWith(selectedDateStr));

  return (
    <div 
      className="mobile-week-strip-container"
      style={{
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 26, 0.98) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '16px',
        padding: '12px 14px',
        marginBottom: '16px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        touchAction: 'pan-y'
      }}
      {...touchHandlers}
    >
      {/* 1. Barra de Navegación de la Semana y Botón Hoy */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.98rem',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.01em',
            textTransform: 'capitalize'
          }}>
            {monthYearLabel}
          </span>
          <button
            type="button"
            onClick={onGoToToday}
            className="btn btn-sm btn-secondary"
            style={{
              padding: '2px 8px',
              fontSize: '0.72rem',
              fontWeight: 800,
              minHeight: '26px',
              borderRadius: '9999px',
              borderColor: 'rgba(56, 189, 248, 0.3)',
              color: '#38bdf8'
            }}
          >
            Hoy
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={onPrevWeek}
            aria-label="Semana anterior"
            className="btn btn-sm btn-secondary"
            style={{
              width: '32px',
              height: '32px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px'
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            aria-label="Semana siguiente"
            className="btn btn-sm btn-secondary"
            style={{
              width: '32px',
              height: '32px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 2. Strip Horizontal de 7 Días (Lunes a Domingo) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px',
        userSelect: 'none'
      }}>
        {weekDays.map(day => {
          const eventTypes = getEventTypesForDate(day.dateStr);
          const hasEvents = eventTypes.length > 0;

          return (
            <div
              key={day.dateStr}
              onClick={() => onSelectDate(day.dateStr)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 2px 6px',
                borderRadius: '12px',
                minHeight: '58px',
                cursor: 'pointer',
                touchAction: 'manipulation',
                transition: 'all 0.15s ease',
                background: day.isSelected 
                  ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.3) 0%, rgba(2, 132, 199, 0.2) 100%)' 
                  : day.isToday 
                    ? 'rgba(56, 189, 248, 0.08)' 
                    : 'transparent',
                border: day.isSelected 
                  ? '1.5px solid #38bdf8' 
                  : day.isToday 
                    ? '1px dashed rgba(56, 189, 248, 0.4)' 
                    : '1px solid transparent',
                boxShadow: day.isSelected ? '0 0 12px rgba(56, 189, 248, 0.3)' : 'none'
              }}
            >
              {/* Inicial del Día */}
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: day.isSelected ? '#38bdf8' : day.isToday ? '#7dd3fc' : '#94a3b8',
                marginBottom: '2px'
              }}>
                {day.dayOfWeekShort}
              </span>

              {/* Número del Día */}
              <span style={{
                fontSize: '1.05rem',
                fontWeight: day.isSelected || day.isToday ? 900 : 700,
                color: day.isSelected ? '#ffffff' : day.isToday ? '#38bdf8' : '#e2e8f0',
                lineHeight: 1.1
              }}>
                {day.dayNumber}
              </span>

              {/* Indicador de Tareas / Puntos de Color */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2.5px',
                minHeight: '6px',
                marginTop: '4px'
              }}>
                {hasEvents ? (
                  eventTypes.slice(0, 3).map((tipo, idx) => (
                    <span
                      key={idx}
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: getDotColor(tipo),
                        boxShadow: `0 0 4px ${getDotColor(tipo)}`
                      }}
                    />
                  ))
                ) : (
                  <span style={{ width: '4px', height: '4px', opacity: 0 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Indicador de Resumen Rápido del Día Seleccionado con Botón BottomSheet */}
      {onOpenBottomSheet && (
        <div 
          onClick={onOpenBottomSheet}
          style={{
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <span>
            {eventosDiaSeleccionado.length === 0 ? (
              'Sin compromisos en esta fecha'
            ) : (
              <strong style={{ color: '#38bdf8' }}>
                {eventosDiaSeleccionado.length} actividad(es) programada(s)
              </strong>
            )}
          </span>
          <span style={{ color: '#38bdf8', fontWeight: 700 }}>
            Ver Bottom Sheet ➔
          </span>
        </div>
      )}
    </div>
  );
};
