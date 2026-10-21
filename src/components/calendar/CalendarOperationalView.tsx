import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Package, 
  Users, 
  Wrench, 
  Send, 
  Sparkles,
  Search,
  Tag,
  ArrowRight,
  ExternalLink,
  X,
  Layers,
  ChevronDown,
  CalendarDays,
  ListTodo,
  SlidersHorizontal,
  Sun
} from 'lucide-react';
import { 
  CalendarEvent, 
  TipoEventoCalendario, 
  EstadoEventoCalendario,
  FiltrosCalendario,
  OrdenTrabajo, 
  CuentaCobro, 
  Cotizacion, 
  TareaEquipo, 
  SolicitudInsumo, 
  ConfiguracionTaller,
  TabType
} from '../../types';
import { WhatsAppNotificationService } from '../../services/whatsappNotificationService';
import { toast } from '../ui/ToastProvider';
import { useDateNavigation } from './useDateNavigation';
import { MobileWeekStrip } from './MobileWeekStrip';
import { MobileEventCard } from './MobileEventCard';
import { MobileBottomSheet } from './MobileBottomSheet';

interface CalendarOperationalViewProps {
  ordenes: OrdenTrabajo[];
  cuentas: CuentaCobro[];
  cotizaciones: Cotizacion[];
  tareas: TareaEquipo[];
  solicitudesInsumos: SolicitudInsumo[];
  config: ConfiguracionTaller;
  onActualizarOT?: (ot: OrdenTrabajo) => void;
  onActualizarCuenta?: (cuenta: CuentaCobro) => void;
  onActualizarTarea?: (tarea: TareaEquipo) => void;
  onNavigateTab?: (tab: TabType) => void;
}

const COLORES_TIPO: Record<TipoEventoCalendario, { bg: string; border: string; text: string; icon: string; label: string }> = {
  vencimiento_cobro: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#f87171', icon: '💰', label: 'Cobro Pendiente' },
  entrega_pedido: { bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)', text: '#38bdf8', icon: '📦', label: 'Entrega Pedido' },
  tarea_individual: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24', icon: '👤', label: 'Tarea Personal' },
  tarea_grupal: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)', text: '#c084fc', icon: '👥', label: 'Tarea Grupal' },
  rutina_diaria: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399', icon: '🔄', label: 'Rutina Periódica' },
  llegada_insumo: { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.4)', text: '#f472b6', icon: '🛒', label: 'Insumo Taller' },
  vencimiento_cotizacion: { bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.4)', text: '#94a3b8', icon: '📄', label: 'Cotización' }
};

const AVATARES_RESPONSABLE: Record<string, { color: string; badge: string }> = {
  'Germán': { color: '#0ea5e9', badge: 'G' },
  'Wendy': { color: '#ec4899', badge: 'W' },
  'Juan': { color: '#f59e0b', badge: 'J' },
  'Todos': { color: '#10b981', badge: '★' }
};

export const CalendarOperationalView: React.FC<CalendarOperationalViewProps> = ({
  ordenes,
  cuentas,
  cotizaciones,
  tareas,
  solicitudesInsumos,
  config,
  onActualizarOT,
  onActualizarCuenta,
  onActualizarTarea,
  onNavigateTab
}) => {
  // Hook de navegación de fechas y adaptabilidad táctil
  const {
    currentDate,
    selectedDateStr,
    isMobile,
    weekDays,
    monthDays,
    monthYearLabel,
    selectedDayLabel,
    hoyStr,
    selectDate,
    nextWeek,
    prevWeek,
    nextMonth,
    prevMonth,
    goToToday,
    touchHandlers
  } = useDateNavigation();

  // En móvil, la vista predeterminada es 'agenda' (Strip semanal compacto + lista vertical)
  // En escritorio, la vista predeterminada es 'mes'
  const [vista, setVista] = useState<'mes' | 'semana' | 'dia' | 'agenda'>(() => {
    return isMobile ? 'agenda' : 'mes';
  });

  // Ajustar vista automáticamente si cambia el tamaño de pantalla inicialmente
  useEffect(() => {
    if (isMobile && vista === 'mes') {
      setVista('agenda');
    }
  }, [isMobile]);

  const [filtros, setFiltros] = useState<FiltrosCalendario>({
    responsable: 'todos',
    tipoEvento: 'todos',
    estado: 'todos',
    busqueda: ''
  });

  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState<boolean>(false);

  // Modal para reprogramar fecha
  const [eventoSeleccionado, setEventoSeleccionado] = useState<CalendarEvent | null>(null);
  const [nuevaFechaInput, setNuevaFechaInput] = useState<string>('');

  // Bottom Sheet nativo móvil para drill-down rápido del día
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);

  // Panel lateral tradicional para escritorio
  const [diaDrawerDesktop, setDiaDrawerDesktop] = useState<string | null>(null);
  const [filtroEstadoDrawer, setFiltroEstadoDrawer] = useState<string>('todos');

  // 1. Agregación Unificada de Entidades con enriquecimiento de datos
  const eventosTotales = useMemo<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = [];

    // A. Órdenes de Trabajo (Entregas programadas en taller)
    ordenes.forEach(ot => {
      const fecha = ot.fecha_finalizacion 
        ? ot.fecha_finalizacion.slice(0, 10) 
        : ot.fecha_inicio
          ? ot.fecha_inicio.slice(0, 10)
          : ot.fecha_creacion 
            ? ot.fecha_creacion.slice(0, 10) 
            : new Date().toISOString().slice(0, 10);

      list.push({
        id: `event-ot-${ot.id}`,
        titulo: `${ot.numero_ot} • ${ot.item_nombre}`,
        descripcion: `Cliente: ${ot.cliente_nombre} • Cant: ${ot.cantidad} • Estado: ${ot.estado}`,
        fecha_inicio: fecha,
        hora: 'Entrega programada',
        monto: ot.saldo_pendiente || 0,
        cliente_nombre: ot.cliente_nombre,
        tipo_evento: 'entrega_pedido',
        color: COLORES_TIPO.entrega_pedido.text,
        responsable: ot.operador_asignado?.includes('Juan') ? 'Juan' : ot.operador_asignado?.includes('Wendy') ? 'Wendy' : 'Germán',
        estado: ot.estado === 'Listo para Entrega' ? 'completado' : 'en_progreso',
        entidad_origen_tipo: 'orden_trabajo',
        entidad_origen_id: ot.id
      });
    });

    // B. Cuentas de Cobro (Vencimientos de cobro con montos destacados)
    cuentas.forEach(cc => {
      if (cc.saldo_pendiente > 0) {
        let fechaVenc = cc.fecha_emision;
        try {
          const d = new Date(cc.fecha_emision);
          d.setDate(d.getDate() + 15);
          fechaVenc = d.toISOString().slice(0, 10);
        } catch (e) {
          fechaVenc = cc.fecha_emision;
        }

        list.push({
          id: `event-cc-${cc.id}`,
          titulo: `Cobro ${cc.numero_cc} • $${cc.saldo_pendiente.toLocaleString('es-CO')}`,
          descripcion: `Cliente: ${cc.cliente?.nombre || 'Cliente'} • Total: $${cc.total.toLocaleString('es-CO')}`,
          fecha_inicio: fechaVenc,
          hora: 'Vencimiento saldo',
          monto: cc.saldo_pendiente,
          cliente_nombre: cc.cliente?.nombre,
          tipo_evento: 'vencimiento_cobro',
          color: COLORES_TIPO.vencimiento_cobro.text,
          responsable: 'Wendy',
          estado: 'pendiente',
          entidad_origen_tipo: 'cuenta_cobro',
          entidad_origen_id: cc.id
        });
      }
    });

    // C. Tareas de Equipo
    tareas.forEach(t => {
      const fecha = t.fecha_limite 
        ? t.fecha_limite.slice(0, 10) 
        : t.fecha_creacion.slice(0, 10);

      const tipo: TipoEventoCalendario = t.tipo === 'periodica' 
        ? 'rutina_diaria' 
        : t.asignado_a === 'Todos' 
          ? 'tarea_grupal' 
          : 'tarea_individual';

      list.push({
        id: `event-task-${t.id}`,
        titulo: `${t.asignado_a}: ${t.titulo}`,
        descripcion: t.descripcion || `Prioridad: ${t.prioridad}`,
        fecha_inicio: fecha,
        hora: t.fecha_limite ? 'Límite programado' : 'Todo el día',
        tipo_evento: tipo,
        color: COLORES_TIPO[tipo].text,
        responsable: t.asignado_a,
        es_recurrente: t.tipo === 'periodica',
        regla_recurrencia: t.frecuencia,
        estado: t.completada ? 'completado' : 'pendiente',
        entidad_origen_tipo: 'tarea_equipo',
        entidad_origen_id: t.id
      });
    });

    // D. Solicitudes de Insumos
    solicitudesInsumos.forEach(s => {
      if (s.estado !== 'recibido') {
        const fecha = s.fecha_solicitud ? s.fecha_solicitud.slice(0, 10) : new Date().toISOString().slice(0, 10);
        list.push({
          id: `event-insumo-${s.id}`,
          titulo: `Insumo: ${s.insumo_nombre} (${s.cantidad} ${s.unidad})`,
          descripcion: `Urgencia: ${s.urgencia} • Solicitado por: ${s.solicitado_por}`,
          fecha_inicio: fecha,
          hora: `Urgencia: ${s.urgencia}`,
          tipo_evento: 'llegada_insumo',
          color: COLORES_TIPO.llegada_insumo.text,
          responsable: s.encargado_compra || s.solicitado_por || 'Wendy',
          estado: s.estado === 'en_camino' ? 'en_progreso' : 'pendiente',
          entidad_origen_tipo: 'solicitud_insumo',
          entidad_origen_id: s.id
        });
      }
    });

    return list;
  }, [ordenes, cuentas, tareas, solicitudesInsumos]);

  // 2. Filtros aplicados
  const eventosFiltrados = useMemo(() => {
    return eventosTotales.filter(ev => {
      if (filtros.responsable !== 'todos' && ev.responsable !== filtros.responsable && ev.responsable !== 'Todos') {
        return false;
      }
      if (filtros.tipoEvento !== 'todos' && ev.tipo_evento !== filtros.tipoEvento) {
        return false;
      }
      if (filtros.estado !== 'todos' && ev.estado !== filtros.estado) {
        return false;
      }
      if (filtros.busqueda.trim()) {
        const q = filtros.busqueda.toLowerCase();
        return ev.titulo.toLowerCase().includes(q) || (ev.descripcion && ev.descripcion.toLowerCase().includes(q));
      }
      return true;
    });
  }, [eventosTotales, filtros]);

  // Eventos específicos del día seleccionado (para la vista Mobile)
  const eventosDelDiaSeleccionado = useMemo(() => {
    return eventosFiltrados.filter(ev => ev.fecha_inicio.startsWith(selectedDateStr));
  }, [eventosFiltrados, selectedDateStr]);

  // Eventos para el Drawer Desktop
  const eventosDelDiaDrawerDesktop = useMemo(() => {
    if (!diaDrawerDesktop) return [];
    return eventosTotales.filter(ev => {
      const matchFecha = ev.fecha_inicio.startsWith(diaDrawerDesktop);
      if (!matchFecha) return false;
      if (filtroEstadoDrawer !== 'todos' && ev.estado !== filtroEstadoDrawer) return false;
      return true;
    });
  }, [diaDrawerDesktop, eventosTotales, filtroEstadoDrawer]);

  // Deep-Linking al Origen de la Entidad
  const handleDeepLink = (ev: CalendarEvent) => {
    if (!onNavigateTab) return;

    switch (ev.entidad_origen_tipo) {
      case 'orden_trabajo':
        onNavigateTab('workflow');
        toast.info(`Redirigiendo a Orden de Trabajo en Taller`);
        break;
      case 'cuenta_cobro':
        onNavigateTab('cuentas');
        toast.info(`Redirigiendo a Cuenta de Cobro`);
        break;
      case 'cotizacion':
        onNavigateTab('cotizaciones');
        toast.info(`Redirigiendo a Historial de Cotizaciones`);
        break;
      case 'solicitud_insumo':
      case 'tarea_equipo':
        onNavigateTab('tareas');
        toast.info(`Redirigiendo a Gestión de Tareas e Insumos`);
        break;
      default:
        break;
    }
    setDiaDrawerDesktop(null);
    setIsBottomSheetOpen(false);
  };

  const handleSelectDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      selectDate(e.target.value);
    }
  };

  return (
    <div 
      className="calendar-operational-module" 
      style={{ 
        paddingBottom: '40px',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}
    >
      {/* 1. Header Adaptativo */}
      <div 
        className="section-header" 
        style={{ 
          marginBottom: '14px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '10px' 
        }}
      >
        <div>
          <h2 className="section-title" style={{ fontSize: isMobile ? '1.15rem' : '1.45rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={isMobile ? 20 : 24} color="var(--brand-cyan)" />
            Calendario Operativo
          </h2>
          <p className="section-subtitle" style={{ fontSize: isMobile ? '0.78rem' : '0.85rem' }}>
            {eventosFiltrados.length} compromisos activos • Deep-linking táctil a OTs, Cobros y Tareas
          </p>
        </div>

        {/* Selector de Vistas */}
        <div style={{ 
          display: 'flex', 
          gap: '3px', 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '3px', 
          borderRadius: '10px', 
          border: '1px solid var(--border-subtle)' 
        }}>
          {(isMobile ? ['agenda', 'mes'] as const : ['mes', 'semana', 'dia', 'agenda'] as const).map(v => (
            <button
              key={v}
              className={`btn btn-sm ${vista === v ? 'btn-primary' : 'btn-secondary'}`}
              style={{ 
                padding: '4px 10px', 
                fontSize: '0.74rem', 
                textTransform: 'capitalize', 
                fontWeight: 800,
                minHeight: '28px'
              }}
              onClick={() => setVista(v)}
            >
              {v === 'agenda' && isMobile ? 'Día / Agenda' : v}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Barra de Filtros y Búsqueda (Colapsable en Móvil) */}
      <div 
        className="glass-card" 
        style={{ 
          padding: isMobile ? '10px 12px' : '12px 16px', 
          marginBottom: '14px',
          borderRadius: '14px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          
          {/* Navegación y Fecha Rápida */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={isMobile && vista === 'agenda' ? prevWeek : prevMonth} 
              title="Periodo anterior"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={goToToday} 
              style={{ fontWeight: 800, padding: '4px 10px', minHeight: '32px' }}
            >
              Hoy
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={isMobile && vista === 'agenda' ? nextWeek : nextMonth} 
              title="Periodo siguiente"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronRight size={16} />
            </button>

            <span style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 800, color: '#fff', marginLeft: '4px' }}>
              {monthYearLabel}
            </span>

            {/* Input DatePicker nativo */}
            <input 
              type="date"
              className="form-input"
              value={selectedDateStr}
              onChange={handleSelectDateInput}
              style={{ minHeight: '32px', fontSize: '0.78rem', padding: '2px 8px', width: 'auto' }}
              title="Seleccionar fecha exacta"
            />
          </div>

          {/* Botón Filtros en Móvil / Filtros en Escritorio */}
          {isMobile ? (
            <button
              onClick={() => setMostrarFiltrosMobile(!mostrarFiltrosMobile)}
              className={`btn btn-sm ${mostrarFiltrosMobile ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: 700, gap: '5px' }}
            >
              <SlidersHorizontal size={13} />
              <span>Filtros {filtros.responsable !== 'todos' || filtros.tipoEvento !== 'todos' ? '(1)' : ''}</span>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="form-input"
                style={{ minHeight: '34px', fontSize: '0.8rem', padding: '3px 8px' }}
                value={filtros.responsable}
                onChange={e => setFiltros({ ...filtros, responsable: e.target.value })}
              >
                <option value="todos">👤 Todos los Responsables</option>
                <option value="Germán">Germán</option>
                <option value="Wendy">Wendy</option>
                <option value="Juan">Juan</option>
              </select>

              <select
                className="form-input"
                style={{ minHeight: '34px', fontSize: '0.8rem', padding: '3px 8px' }}
                value={filtros.tipoEvento}
                onChange={e => setFiltros({ ...filtros, tipoEvento: e.target.value })}
              >
                <option value="todos">🏷️ Todos los Eventos</option>
                <option value="vencimiento_cobro">💰 Cobros Pendientes</option>
                <option value="entrega_pedido">📦 Entregas de Pedidos</option>
                <option value="tarea_individual">👤 Tareas Personales</option>
                <option value="tarea_grupal">👥 Tareas Grupales</option>
                <option value="rutina_diaria">🔄 Rutinas Diarias</option>
                <option value="llegada_insumo">🛒 Insumos de Taller</option>
              </select>

              <input
                type="text"
                className="form-input"
                placeholder="Buscar compromiso..."
                style={{ minHeight: '34px', fontSize: '0.8rem', width: '150px' }}
                value={filtros.busqueda}
                onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })}
              >
              </input>
            </div>
          )}
        </div>

        {/* Panel Desplegable de Filtros en Móvil */}
        {isMobile && mostrarFiltrosMobile && (
          <div style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '8px'
          }}>
            <select
              className="form-input"
              style={{ minHeight: '40px', fontSize: '0.85rem' }}
              value={filtros.responsable}
              onChange={e => setFiltros({ ...filtros, responsable: e.target.value })}
            >
              <option value="todos">👤 Todos los Responsables</option>
              <option value="Germán">Germán</option>
              <option value="Wendy">Wendy</option>
              <option value="Juan">Juan</option>
            </select>

            <select
              className="form-input"
              style={{ minHeight: '40px', fontSize: '0.85rem' }}
              value={filtros.tipoEvento}
              onChange={e => setFiltros({ ...filtros, tipoEvento: e.target.value })}
            >
              <option value="todos">🏷️ Todos los Eventos</option>
              <option value="vencimiento_cobro">💰 Cobros Pendientes</option>
              <option value="entrega_pedido">📦 Entregas de Pedidos</option>
              <option value="tarea_individual">👤 Tareas Personales</option>
              <option value="tarea_grupal">👥 Tareas Grupales</option>
              <option value="rutina_diaria">🔄 Rutinas Diarias</option>
              <option value="llegada_insumo">🛒 Insumos de Taller</option>
            </select>

            <input
              type="text"
              className="form-input"
              placeholder="Buscar por texto..."
              style={{ minHeight: '40px', fontSize: '0.85rem' }}
              value={filtros.busqueda}
              onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* =========================================================================
          3. VISTA PRINCIPAL MÓVIL (MOBILE-FIRST): STRIP SEMANAL + LISTA DE DÍA
          ========================================================================= */}
      {isMobile && vista === 'agenda' && (
        <div className="mobile-calendar-view" style={{ width: '100%', overflowX: 'hidden' }}>
          
          {/* Selector Semanal Compacto (7 días con Puntos de Color y Swipe) */}
          <MobileWeekStrip
            weekDays={weekDays}
            eventos={eventosFiltrados}
            selectedDateStr={selectedDateStr}
            monthYearLabel={monthYearLabel}
            onSelectDate={selectDate}
            onPrevWeek={prevWeek}
            onNextWeek={nextWeek}
            onGoToToday={goToToday}
            touchHandlers={touchHandlers}
            onOpenBottomSheet={() => setIsBottomSheetOpen(true)}
          />

          {/* Encabezado del Día Seleccionado */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
            padding: '0 4px'
          }}>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.01em'
              }}>
                {selectedDayLabel}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {eventosDelDiaSeleccionado.length} compromiso(s) en esta fecha
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsBottomSheetOpen(true)}
              className="btn btn-sm btn-secondary"
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '4px 10px',
                minHeight: '30px',
                borderColor: 'rgba(56, 189, 248, 0.3)',
                color: '#38bdf8'
              }}
            >
              Filtro Rápido
            </button>
          </div>

          {/* Feed Vertical de Tarjetas de Eventos del Día */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '100%'
          }}>
            {eventosDelDiaSeleccionado.length === 0 ? (
              <div 
                className="glass-card" 
                style={{ 
                  textAlign: 'center', 
                  padding: '36px 16px', 
                  color: '#94a3b8',
                  borderRadius: '14px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)'
                }}
              >
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px', opacity: 0.8 }} />
                <h4 style={{ margin: '0 0 4px', color: '#fff', fontSize: '0.98rem' }}>
                  Sin compromisos para esta fecha
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem' }}>
                  Toca otro día en la barra superior o desliza para ver otras semanas.
                </p>
              </div>
            ) : (
              eventosDelDiaSeleccionado.map(ev => (
                <MobileEventCard
                  key={ev.id}
                  event={ev}
                  onDeepLink={handleDeepLink}
                  onReschedule={(e) => {
                    setEventoSeleccionado(e);
                    setNuevaFechaInput(e.fecha_inicio);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          4. VISTAS TABLET / ESCRITORIO O VISTA MENSUAL EXPANDIDA
          ========================================================================= */}

      {/* VISTA A: MENSUAL */}
      {vista === 'mes' && (
        <div className="glass-card" style={{ padding: isMobile ? '10px' : '16px', overflowX: 'auto', borderRadius: '16px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? 'repeat(7, 1fr)' : 'repeat(7, minmax(130px, 1fr))', 
            gap: '4px', 
            textAlign: 'center', 
            fontWeight: 800, 
            fontSize: isMobile ? '0.7rem' : '0.78rem', 
            color: 'var(--text-muted)', 
            marginBottom: '8px' 
          }}>
            <div>{isMobile ? 'L' : 'LUNES'}</div>
            <div>{isMobile ? 'M' : 'MARTES'}</div>
            <div>{isMobile ? 'M' : 'MIÉRCOLES'}</div>
            <div>{isMobile ? 'J' : 'JUEVES'}</div>
            <div>{isMobile ? 'V' : 'VIERNES'}</div>
            <div>{isMobile ? 'S' : 'SÁBADO'}</div>
            <div>{isMobile ? 'D' : 'DOMINGO'}</div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? 'repeat(7, 1fr)' : 'repeat(7, minmax(130px, 1fr))', 
            gap: isMobile ? '3px' : '6px' 
          }}>
            {monthDays.map(dia => {
              const esHoy = dia.dateStr === hoyStr;
              const esSeleccionado = dia.dateStr === selectedDateStr;
              const eventosDelDia = eventosFiltrados.filter(ev => ev.fecha_inicio.startsWith(dia.dateStr));

              return (
                <div
                  key={dia.dateStr}
                  onClick={() => {
                    selectDate(dia.dateStr);
                    if (isMobile) {
                      setIsBottomSheetOpen(true);
                    } else {
                      setDiaDrawerDesktop(dia.dateStr);
                    }
                  }}
                  style={{
                    minHeight: isMobile ? '56px' : '115px',
                    background: dia.isCurrentMonth ? (esHoy ? 'rgba(56, 189, 248, 0.09)' : 'rgba(255, 255, 255, 0.02)') : 'rgba(0, 0, 0, 0.25)',
                    border: esHoy 
                      ? '1.5px solid var(--brand-cyan)' 
                      : esSeleccionado 
                        ? '1px solid rgba(56, 189, 248, 0.4)' 
                        : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '4px 2px' : '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    opacity: dia.isCurrentMonth ? 1 : 0.45,
                    touchAction: 'manipulation'
                  }}
                  title="Haz clic para ver la agenda detallada de este día"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', padding: '0 2px' }}>
                    <span style={{ 
                      fontSize: isMobile ? '0.75rem' : '0.8rem', 
                      fontWeight: esHoy ? 900 : 700, 
                      color: esHoy ? 'var(--brand-cyan)' : dia.isCurrentMonth ? '#fff' : 'var(--text-muted)' 
                    }}>
                      {dia.dayNumber}
                    </span>
                    {eventosDelDia.length > 0 && (
                      <span style={{ 
                        fontSize: '0.62rem', 
                        background: 'rgba(56, 189, 248, 0.2)', 
                        color: 'var(--brand-cyan)', 
                        padding: '1px 4px', 
                        borderRadius: '4px', 
                        fontWeight: 800 
                      }}>
                        {eventosDelDia.length}
                      </span>
                    )}
                  </div>

                  {/* Indicadores en Mobile o Eventos en Desktop */}
                  {isMobile ? (
                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: 'auto', minHeight: '6px' }}>
                      {eventosDelDia.slice(0, 3).map((ev, i) => (
                        <span 
                          key={i} 
                          style={{ 
                            width: '4px', 
                            height: '4px', 
                            borderRadius: '50%', 
                            backgroundColor: COLORES_TIPO[ev.tipo_evento]?.text || '#38bdf8' 
                          }} 
                        />
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'hidden' }}>
                      {eventosDelDia.slice(0, 3).map(ev => {
                        const cfg = COLORES_TIPO[ev.tipo_evento] || COLORES_TIPO.tarea_individual;
                        return (
                          <div
                            key={ev.id}
                            style={{
                              background: cfg.bg,
                              border: `1px solid ${cfg.border}`,
                              color: cfg.text,
                              borderRadius: '4px',
                              padding: '2px 5px',
                              fontSize: '0.69rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <span>{cfg.icon}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.titulo}</span>
                          </div>
                        );
                      })}
                      {eventosDelDia.length > 3 && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--brand-cyan)', fontWeight: 800, textAlign: 'center', marginTop: 'auto' }}>
                          +{eventosDelDia.length - 3} más
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA B: SEMANAL (DESKTOP) */}
      {!isMobile && vista === 'semana' && (
        <div className="glass-card" style={{ padding: '16px', overflowX: 'auto', borderRadius: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(140px, 1fr))', gap: '8px' }}>
            {weekDays.map(d => {
              const esHoy = d.dateStr === hoyStr;
              const evs = eventosFiltrados.filter(ev => ev.fecha_inicio.startsWith(d.dateStr));

              return (
                <div 
                  key={d.dateStr}
                  style={{
                    background: esHoy ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: esHoy ? '1px solid var(--brand-cyan)' : '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '10px',
                    minHeight: '380px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800 }}>{d.dayOfWeekFull}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: esHoy ? 'var(--brand-cyan)' : '#fff' }}>{d.dayNumber}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
                    {evs.map(ev => {
                      const cfg = COLORES_TIPO[ev.tipo_evento] || COLORES_TIPO.tarea_individual;
                      return (
                        <div 
                          key={ev.id}
                          onClick={() => handleDeepLink(ev)}
                          style={{
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                            borderRadius: '6px',
                            padding: '6px 8px',
                            cursor: 'pointer'
                          }}
                          title="Clic para ir al registro original"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 800, color: cfg.text }}>
                            <span>{cfg.icon}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titulo}</span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {ev.responsable} • {ev.estado}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA C: DIARIA (DESKTOP) */}
      {!isMobile && vista === 'dia' && (
        <div className="glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={20} color="var(--brand-cyan)" />
              Compromisos de {selectedDayLabel}
            </h3>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>
              {eventosDelDiaSeleccionado.length} compromisos programados
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {eventosDelDiaSeleccionado.map(ev => {
              const cfg = COLORES_TIPO[ev.tipo_evento] || COLORES_TIPO.tarea_individual;
              const resp = AVATARES_RESPONSABLE[ev.responsable] || { color: '#94a3b8', badge: '?' };

              return (
                <div 
                  key={ev.id}
                  style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderLeft: `5px solid ${cfg.text}`,
                    borderRadius: '10px',
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.4rem' }}>{cfg.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{ev.titulo}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: resp.color, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                          {ev.responsable}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{ev.descripcion}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {ev.monto !== undefined && ev.monto > 0 && (
                      <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#10b981', marginRight: '8px' }}>
                        ${ev.monto.toLocaleString('es-CO')} COP
                      </span>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={() => handleDeepLink(ev)}>
                      <span>Abrir Registro</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA D: AGENDA COMPLETA (DESKTOP) */}
      {!isMobile && vista === 'agenda' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {eventosFiltrados.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <CalendarIcon size={36} color="var(--brand-cyan)" style={{ marginBottom: '8px', opacity: 0.7 }} />
              <h4>No hay compromisos con los filtros seleccionados</h4>
            </div>
          ) : (
            eventosFiltrados.map(ev => {
              const cfg = COLORES_TIPO[ev.tipo_evento] || COLORES_TIPO.tarea_individual;
              const resp = AVATARES_RESPONSABLE[ev.responsable] || { color: '#94a3b8', badge: '?' };

              return (
                <div 
                  key={ev.id}
                  className="glass-card" 
                  style={{ 
                    margin: 0, 
                    padding: '14px 18px', 
                    borderLeft: `4px solid ${cfg.text}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderRadius: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '38px', 
                      height: '38px', 
                      borderRadius: '8px', 
                      background: cfg.bg, 
                      border: `1px solid ${cfg.border}`,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}>
                      {cfg.icon}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.96rem' }}>
                          {ev.titulo}
                        </span>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 800, 
                          color: resp.color, 
                          background: 'rgba(255,255,255,0.06)', 
                          padding: '2px 7px', 
                          borderRadius: '4px' 
                        }}>
                          {ev.responsable}
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {ev.descripcion}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {ev.monto !== undefined && ev.monto > 0 && (
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#10b981' }}>
                        ${ev.monto.toLocaleString('es-CO')} COP
                      </span>
                    )}

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>
                        📅 {ev.fecha_inicio}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: cfg.text, textTransform: 'uppercase', fontWeight: 800 }}>
                        {cfg.label}
                      </span>
                    </div>

                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleDeepLink(ev)}
                      title="Ir directamente a la entidad de origen"
                    >
                      <span>Abrir</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =========================================================================
          5. BOTTOM SHEET NATIVO MÓVIL
          ========================================================================= */}
      <MobileBottomSheet
        isOpen={isBottomSheetOpen}
        dateStr={selectedDateStr}
        dayLabel={selectedDayLabel}
        eventos={eventosDelDiaSeleccionado}
        onClose={() => setIsBottomSheetOpen(false)}
        onDeepLink={handleDeepLink}
        onReschedule={(e) => {
          setEventoSeleccionado(e);
          setNuevaFechaInput(e.fecha_inicio);
        }}
      />

      {/* =========================================================================
          6. DRAWER LATERAL PARA DESKTOP
          ========================================================================= */}
      {diaDrawerDesktop && !isMobile && (
        <div 
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)',
            zIndex: 99999, display: 'flex', justifyContent: 'flex-end'
          }}
          onClick={() => setDiaDrawerDesktop(null)}
        >
          <div 
            style={{
              width: '100%', maxWidth: '480px', height: '100%',
              background: 'var(--bg-card, #0f172a)',
              borderLeft: '1px solid var(--border-subtle)',
              padding: '24px', overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: '16px',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon size={20} color="var(--brand-cyan)" />
                  Agenda del Día
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--brand-cyan)', fontWeight: 700 }}>
                  📅 {diaDrawerDesktop}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setDiaDrawerDesktop(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {(['todos', 'pendiente', 'en_progreso', 'completado'] as const).map(st => (
                <button
                  key={st}
                  className={`btn btn-sm ${filtroEstadoDrawer === st ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '3px 8px', textTransform: 'capitalize' }}
                  onClick={() => setFiltroEstadoDrawer(st)}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              {eventosDelDiaDrawerDesktop.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={36} color="#34d399" style={{ marginBottom: '8px', opacity: 0.8 }} />
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>Sin compromisos para esta fecha con el filtro seleccionado</p>
                </div>
              ) : (
                eventosDelDiaDrawerDesktop.map(ev => {
                  const cfg = COLORES_TIPO[ev.tipo_evento] || COLORES_TIPO.tarea_individual;
                  return (
                    <div 
                      key={ev.id}
                      style={{
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        borderLeft: `4px solid ${cfg.text}`,
                        borderRadius: '8px',
                        padding: '12px 14px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>{ev.titulo}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: cfg.text, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {ev.descripcion}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                          👤 {ev.responsable} • Estado: <strong>{ev.estado}</strong>
                        </span>

                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => handleDeepLink(ev)}
                        >
                          <span>Abrir</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MODAL DE REPROGRAMACIÓN DE FECHA
          ========================================================================= */}
      {eventoSeleccionado && (
        <div 
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0, 0, 0, 0.82)', backdropFilter: 'blur(8px)',
            zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}
          onClick={() => setEventoSeleccionado(null)}
        >
          <div 
            className="glass-card" 
            style={{ maxWidth: '420px', width: '100%', margin: 0, padding: '24px', border: '1px solid var(--brand-cyan)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
              Reprogramar Compromiso
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              <strong>{eventoSeleccionado.titulo}</strong><br />
              {eventoSeleccionado.descripcion}
            </p>

            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              NUEVA FECHA PROGRAMADA:
            </label>
            <input 
              type="date"
              className="form-input"
              value={nuevaFechaInput}
              onChange={e => setNuevaFechaInput(e.target.value)}
              style={{ width: '100%', marginBottom: '18px', padding: '10px' }}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setEventoSeleccionado(null)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (eventoSeleccionado.entidad_origen_tipo === 'orden_trabajo' && onActualizarOT) {
                    const match = ordenes.find(o => o.id === eventoSeleccionado.entidad_origen_id);
                    if (match) {
                      onActualizarOT({ ...match, fecha_finalizacion: nuevaFechaInput });
                      toast.success(`Fecha de entrega actualizada para ${match.numero_ot}`);
                    }
                  } else if (eventoSeleccionado.entidad_origen_tipo === 'tarea_equipo' && onActualizarTarea) {
                    const match = tareas.find(t => t.id === eventoSeleccionado.entidad_origen_id);
                    if (match) {
                      onActualizarTarea({ ...match, fecha_limite: nuevaFechaInput });
                      toast.success(`Plazo de tarea actualizado`);
                    }
                  }
                  setEventoSeleccionado(null);
                }} 
                style={{ fontWeight: 800 }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
