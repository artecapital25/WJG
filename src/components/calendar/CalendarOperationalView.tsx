import React, { useState, useMemo } from 'react';
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
  ListTodo
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
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [vista, setVista] = useState<'mes' | 'semana' | 'dia' | 'agenda'>('mes');
  const [filtros, setFiltros] = useState<FiltrosCalendario>({
    responsable: 'todos',
    tipoEvento: 'todos',
    estado: 'todos',
    busqueda: ''
  });

  // Modal para editar / reprogramar fecha
  const [eventoSeleccionado, setEventoSeleccionado] = useState<CalendarEvent | null>(null);
  const [nuevaFechaInput, setNuevaFechaInput] = useState<string>('');

  // Panel Lateral (Drawer) de Drill-Down por Día específico
  const [diaDrawer, setDiaDrawer] = useState<string | null>(null);
  const [filtroEstadoDrawer, setFiltroEstadoDrawer] = useState<string>('todos');

  // 1. Agregación Unificada de Entidades
  const eventosTotales = useMemo<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = [];

    // A. Órdenes de Trabajo (Entregas programadas)
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
        tipo_evento: 'entrega_pedido',
        color: COLORES_TIPO.entrega_pedido.text,
        responsable: ot.operador_asignado?.includes('Juan') ? 'Juan' : ot.operador_asignado?.includes('Wendy') ? 'Wendy' : 'Germán',
        estado: ot.estado === 'Listo para Entrega' ? 'completado' : 'en_progreso',
        entidad_origen_tipo: 'orden_trabajo',
        entidad_origen_id: ot.id
      });
    });

    // B. Cuentas de Cobro (Vencimientos de pago pendientes)
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
          descripcion: `Cliente: ${cc.cliente?.nombre || 'Cliente'} • Tel: ${cc.cliente?.telefono || 'N/A'} • Total: $${cc.total.toLocaleString('es-CO')}`,
          fecha_inicio: fechaVenc,
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

    // D. Solicitudes de Insumos (Llegada o urgencia)
    solicitudesInsumos.forEach(s => {
      if (s.estado !== 'recibido') {
        list.push({
          id: `event-insumo-${s.id}`,
          titulo: `Insumo: ${s.insumo_nombre} (${s.cantidad} ${s.unidad})`,
          descripcion: `Urgencia: ${s.urgencia} • Encargada: ${s.encargado_compra}`,
          fecha_inicio: s.fecha_solicitud.slice(0, 10),
          tipo_evento: 'llegada_insumo',
          color: COLORES_TIPO.llegada_insumo.text,
          responsable: s.encargado_compra,
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

  // Controles de Navegación Temporal
  const prevPeriod = () => {
    const d = new Date(currentDate);
    if (vista === 'mes') d.setMonth(d.getMonth() - 1);
    else if (vista === 'semana') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const nextPeriod = () => {
    const d = new Date(currentDate);
    if (vista === 'mes') d.setMonth(d.getMonth() + 1);
    else if (vista === 'semana') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const setHoy = () => setCurrentDate(new Date());

  const handleSelectDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setCurrentDate(new Date(`${e.target.value}T12:00:00`));
    }
  };

  const hoyStr = new Date().toISOString().slice(0, 10);
  const currentDateStr = currentDate.toISOString().slice(0, 10);

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
    setDiaDrawer(null);
  };

  // Cuadrícula Mensual
  const diasMes = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDayIndex + 6) % 7;

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];
    const prevMonthDays = new Date(year, month, 0).getDate();

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNumber: d, isCurrentMonth: false });
    }

    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNumber: i, isCurrentMonth: true });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNumber: i, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Días de la Vista Semanal
  const diasSemana = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // lunes
    const startOfWeek = new Date(curr.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push({
        dateStr: d.toISOString().slice(0, 10),
        dayNumber: d.getDate(),
        nombreDia: d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()
      });
    }
    return days;
  }, [currentDate]);

  // Eventos para el Drawer de Drill-Down
  const eventosDelDiaDrawer = useMemo(() => {
    if (!diaDrawer) return [];
    return eventosTotales.filter(ev => {
      const matchFecha = ev.fecha_inicio.startsWith(diaDrawer);
      if (!matchFecha) return false;
      if (filtroEstadoDrawer !== 'todos' && ev.estado !== filtroEstadoDrawer) return false;
      return true;
    });
  }, [diaDrawer, eventosTotales, filtroEstadoDrawer]);

  const mesNombre = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const tituloCabecera = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* 1. Header con Navegación Fluida */}
      <div className="section-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="section-title">
            <CalendarIcon size={22} color="var(--brand-cyan)" />
            Calendario Operativo & Agenda Dinámica
          </h2>
          <p className="section-subtitle">
            {eventosFiltrados.length} compromisos activos • Sincronización en caliente y deep-linking a OTs, Cobros y Tareas
          </p>
        </div>

        {/* Selector de Vistas: Mes, Semana, Día, Agenda */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          {(['mes', 'semana', 'dia', 'agenda'] as const).map(v => (
            <button
              key={v}
              className={`btn btn-sm ${vista === v ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '0.78rem', textTransform: 'capitalize', fontWeight: 700 }}
              onClick={() => setVista(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Barra de Navegación de Fechas, Selector Rápido y Filtros */}
      <div className="glass-card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Navegación Mes / Día + DatePicker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={prevPeriod} title="Periodo anterior">
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={setHoy} style={{ fontWeight: 800 }}>
              Hoy
            </button>
            <button className="btn btn-secondary btn-sm" onClick={nextPeriod} title="Periodo siguiente">
              <ChevronRight size={16} />
            </button>

            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginLeft: '6px' }}>
              {vista === 'dia' ? currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : tituloCabecera}
            </span>

            {/* Selector rápido de fecha */}
            <input 
              type="date"
              className="form-input"
              value={currentDateStr}
              onChange={handleSelectDateInput}
              style={{ minHeight: '32px', fontSize: '0.8rem', padding: '2px 8px', marginLeft: '8px' }}
              title="Ir directamente a una fecha"
            />
          </div>

          {/* Filtros Granulares */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Responsable */}
            <select
              className="form-input"
              style={{ minHeight: '36px', fontSize: '0.82rem', padding: '4px 8px' }}
              value={filtros.responsable}
              onChange={e => setFiltros({ ...filtros, responsable: e.target.value })}
            >
              <option value="todos">👤 Todos los Responsables</option>
              <option value="Germán">Germán</option>
              <option value="Wendy">Wendy</option>
              <option value="Juan">Juan</option>
            </select>

            {/* Tipo de Evento */}
            <select
              className="form-input"
              style={{ minHeight: '36px', fontSize: '0.82rem', padding: '4px 8px' }}
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

            {/* Búsqueda */}
            <input
              type="text"
              className="form-input"
              placeholder="Buscar compromiso..."
              style={{ minHeight: '36px', fontSize: '0.82rem', width: '150px' }}
              value={filtros.busqueda}
              onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* 3. VISTAS CONMUTABLES */}

      {/* VISTA A: MENSUAL CON DRILL-DOWN */}
      {vista === 'mes' && (
        <div className="glass-card" style={{ padding: '16px', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', gap: '4px', textAlign: 'center', fontWeight: 800, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <div>LUNES</div>
            <div>MARTES</div>
            <div>MIÉRCOLES</div>
            <div>JUEVES</div>
            <div>VIERNES</div>
            <div>SÁBADO</div>
            <div>DOMINGO</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', gap: '6px' }}>
            {diasMes.map(dia => {
              const esHoy = dia.dateStr === hoyStr;
              const eventosDelDia = eventosFiltrados.filter(ev => ev.fecha_inicio.startsWith(dia.dateStr));

              return (
                <div
                  key={dia.dateStr}
                  onClick={() => setDiaDrawer(dia.dateStr)}
                  style={{
                    minHeight: '115px',
                    background: dia.isCurrentMonth ? (esHoy ? 'rgba(56, 189, 248, 0.09)' : 'rgba(255, 255, 255, 0.02)') : 'rgba(0, 0, 0, 0.25)',
                    border: esHoy ? '1px solid var(--brand-cyan)' : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    opacity: dia.isCurrentMonth ? 1 : 0.45
                  }}
                  title="Haz clic para ver la agenda detallada de este día"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: esHoy ? 900 : 700, 
                      color: esHoy ? 'var(--brand-cyan)' : dia.isCurrentMonth ? '#fff' : 'var(--text-muted)' 
                    }}>
                      {dia.dayNumber}
                    </span>
                    {eventosDelDia.length > 0 && (
                      <span style={{ fontSize: '0.66rem', background: 'rgba(56, 189, 248, 0.2)', color: 'var(--brand-cyan)', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        {eventosDelDia.length}
                      </span>
                    )}
                  </div>

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
                        +{eventosDelDia.length - 3} más (ver agenda)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA B: SEMANAL */}
      {vista === 'semana' && (
        <div className="glass-card" style={{ padding: '16px', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', gap: '8px' }}>
            {diasSemana.map(d => {
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
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800 }}>{d.nombreDia}</div>
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

      {/* VISTA C: DIARIA (BLOQUES DEL DÍA ACTUAL) */}
      {vista === 'dia' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={20} color="var(--brand-cyan)" />
              Compromisos de {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>
              {eventosFiltrados.filter(ev => ev.fecha_inicio.startsWith(currentDateStr)).length} compromisos programados
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {eventosFiltrados.filter(ev => ev.fecha_inicio.startsWith(currentDateStr)).map(ev => {
              const cfg = COLORES_TIPO[ev.tipo_evento] || COLORES_TIPO.tarea_individual;
              const resp = AVATARES_RESPONSABLE[ev.responsable] || { color: '#94a3b8', badge: '?' };

              return (
                <div 
                  key={ev.id}
                  style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderLeft: `5px solid ${cfg.text}`,
                    borderRadius: '8px',
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

      {/* VISTA D: AGENDA CRONOLÓGICA CON DEEP-LINKS */}
      {vista === 'agenda' && (
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
                    gap: '12px'
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                        📅 {ev.fecha_inicio}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: cfg.text, textTransform: 'uppercase', fontWeight: 800 }}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Botón Deep-Link directo al módulo de origen */}
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleDeepLink(ev)}
                      title="Ir directamente a la entidad de origen"
                    >
                      <span>Abrir</span>
                      <ExternalLink size={13} />
                    </button>

                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setEventoSeleccionado(ev);
                        setNuevaFechaInput(ev.fecha_inicio);
                      }}
                      title="Reprogramar fecha"
                    >
                      Reprogramar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. PANEL LATERAL / DRAWER DE DRILL-DOWN POR DÍA ESPECÍFICO */}
      {diaDrawer && (
        <div 
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)',
            zIndex: 99999, display: 'flex', justifyContent: 'flex-end'
          }}
          onClick={() => setDiaDrawer(null)}
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
            {/* Cabecera del Drawer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon size={20} color="var(--brand-cyan)" />
                  Agenda del Día
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--brand-cyan)', fontWeight: 700 }}>
                  📅 {diaDrawer}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setDiaDrawer(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Filtro por estado en Drawer */}
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

            {/* Listado de compromisos del día */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              {eventosDelDiaDrawer.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={36} color="#34d399" style={{ marginBottom: '8px', opacity: 0.8 }} />
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>Sin compromisos para esta fecha con el filtro seleccionado</p>
                </div>
              ) : (
                eventosDelDiaDrawer.map(ev => {
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

      {/* 5. MODAL REPROGRAMACIÓN DE FECHA */}
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
