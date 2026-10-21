import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Filter, CheckCircle2 } from 'lucide-react';
import { CalendarEvent } from '../../types';
import { MobileEventCard } from './MobileEventCard';

interface MobileBottomSheetProps {
  isOpen: boolean;
  dateStr: string;
  dayLabel: string;
  eventos: CalendarEvent[];
  onClose: () => void;
  onDeepLink: (event: CalendarEvent) => void;
  onReschedule?: (event: CalendarEvent) => void;
}

type TabFiltroSheet = 'todos' | 'cobros' | 'taller' | 'tareas' | 'insumos';

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  dateStr,
  dayLabel,
  eventos,
  onClose,
  onDeepLink,
  onReschedule
}) => {
  const [filtroActivo, setFiltroActivo] = useState<TabFiltroSheet>('todos');

  if (!isOpen) return null;

  // Filtrar eventos según la pestaña seleccionada
  const eventosFiltrados = eventos.filter(ev => {
    if (filtroActivo === 'todos') return true;
    if (filtroActivo === 'cobros') return ev.tipo_evento === 'vencimiento_cobro';
    if (filtroActivo === 'taller') return ev.tipo_evento === 'entrega_pedido';
    if (filtroActivo === 'tareas') return ['tarea_individual', 'tarea_grupal', 'rutina_diaria'].includes(ev.tipo_evento);
    if (filtroActivo === 'insumos') return ev.tipo_evento === 'llegada_insumo';
    return true;
  });

  return (
    <div 
      className="mobile-bottom-sheet-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 15, 0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        className="mobile-bottom-sheet-panel"
        style={{
          background: 'linear-gradient(180deg, #0d131f 0%, #080d16 100%)',
          borderTop: '1.5px solid rgba(56, 189, 248, 0.35)',
          borderTopLeftRadius: '22px',
          borderTopRightRadius: '22px',
          maxHeight: '86vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -15px 40px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior / Drag Handle */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px 0 6px',
          cursor: 'grab'
        }}>
          <div style={{
            width: '42px',
            height: '4.5px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.25)'
          }} />
        </div>

        {/* Encabezado del Bottom Sheet */}
        <div style={{
          padding: '8px 18px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CalendarIcon size={16} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#fff' }}>
                {dayLabel}
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
              {eventos.length} compromiso(s) registrado(s) en esta fecha
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas de Filtro Rápido (Bottom Sheet Tabs) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 18px',
          overflowX: 'auto',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'cobros', label: '💰 Cobros' },
            { id: 'taller', label: '📦 Taller/OTs' },
            { id: 'tareas', label: '👥 Tareas' },
            { id: 'insumos', label: '🛒 Insumos' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFiltroActivo(tab.id as TabFiltroSheet)}
              style={{
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '0.74rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                border: filtroActivo === tab.id ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                background: filtroActivo === tab.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: filtroActivo === tab.id ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Listado de Tarjetas en Scroll Vertical */}
        <div style={{
          padding: '14px 18px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          WebkitOverflowScrolling: 'touch'
        }}>
          {eventosFiltrados.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '36px 12px',
              color: '#94a3b8',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}>
              <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
                No hay compromisos con el filtro seleccionado
              </p>
            </div>
          ) : (
            eventosFiltrados.map(ev => (
              <MobileEventCard
                key={ev.id}
                event={ev}
                onDeepLink={(e) => {
                  onDeepLink(e);
                  onClose();
                }}
                onReschedule={onReschedule ? (e) => {
                  onReschedule(e);
                  onClose();
                } : undefined}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
