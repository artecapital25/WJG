import React, { useState, useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  Plus,
  Send,
  ShoppingCart,
  ExternalLink,
  RotateCw,
  MessageSquare,
  Check,
  Flame,
  Truck,
  PackageCheck,
  Trash2,
  Settings2,
  Search,
  Globe,
  Store
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WjgButton, WjgConfirmModal, WjgModal, WjgProgressBar, WjgSearchInput, WjgSelect, WjgSwitch, WjgTextArea, WjgTextInput, getAlertSurfaceClassName, resolveSupplyRequestAlert, toast } from '../ui';
import {
  TareaEquipo,
  IntegranteEquipo,
  SolicitudInsumo,
  UrgenciaInsumo,
  EstadoSolicitudInsumo,
  TipoCompraInsumo,
  CatalogoTipoVinculo,
  Insumo,
  Resina,
  Filamento,
  ConfiguracionTaller
} from '../../types';
import { UsuarioTaller } from '../../types/usuarios.types';
import {
  MessagingHubService,
  buildSOSInsumoMessage,
  resolveTaskRecipients
} from '../../services/messaging';
import { WjgMessageDispatcherModal } from '../messaging/WjgMessageDispatcherModal';
import { ModalEnviarTareaWhatsApp } from './ModalEnviarTareaWhatsApp';
import { TareaCard } from './TareaCard';
import { BitacoraTareaModal } from './BitacoraTareaModal';
import { useTareaAvances } from '../../hooks/useTareaAvances';

interface TeamTasksViewProps {
  tareas: TareaEquipo[];
  solicitudesInsumos: SolicitudInsumo[];
  insumosCatalogo: Insumo[];
  resinasCatalogo?: Resina[];
  filamentosCatalogo?: Filamento[];
  config: ConfiguracionTaller;
  usuarios?: UsuarioTaller[];
  onGuardarTarea: (nueva: TareaEquipo) => void;
  onActualizarTarea: (tarea: TareaEquipo) => void;
  onEliminarTarea: (id: string) => void;
  onCrearSolicitudInsumo: (solicitud: SolicitudInsumo) => void;
  onActualizarSolicitudInsumo: (solicitud: SolicitudInsumo, opciones?: { sumarAlInventario?: boolean }) => void;
  onEliminarSolicitudInsumo?: (id: string) => void;
  activeOperator?: string;
  currentUser?: { id?: string; nombre: string; rol?: string };
}

const INTEGRANTES: IntegranteEquipo[] = ['Germán', 'Wendy', 'Juan', 'Todos'];

const ESTADOS_ORDEN_CONFIG: Record<
  EstadoSolicitudInsumo,
  { label: string; color: string; bg: string; border: string }
> = {
  pendiente: {
    label: 'Pendiente',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.16)',
    border: 'rgba(245, 158, 11, 0.35)'
  },
  en_gestion: {
    label: 'En Gestión / Cotizando',
    color: '#c084fc',
    bg: 'rgba(168, 85, 247, 0.16)',
    border: 'rgba(168, 85, 247, 0.35)'
  },
  orden_enviada: {
    label: 'Pedido Realizado',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.16)',
    border: 'rgba(56, 189, 248, 0.35)'
  },
  comprado: {
    label: 'Comprado / Pagado',
    color: '#60a5fa',
    bg: 'rgba(59, 130, 246, 0.16)',
    border: 'rgba(59, 130, 246, 0.35)'
  },
  en_camino: {
    label: 'En Camino / Tránsito',
    color: '#22d3ee',
    bg: 'rgba(6, 182, 212, 0.18)',
    border: 'rgba(6, 182, 212, 0.4)'
  },
  recibido: {
    label: 'Recibido en Bodega',
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.16)',
    border: 'rgba(16, 185, 129, 0.4)'
  },
  cancelado: {
    label: 'Cancelado',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.14)',
    border: 'rgba(148, 163, 184, 0.3)'
  }
};

export const TeamTasksView: React.FC<TeamTasksViewProps> = ({
  tareas,
  solicitudesInsumos,
  insumosCatalogo,
  resinasCatalogo = [],
  filamentosCatalogo = [],
  config,
  usuarios,
  onGuardarTarea,
  onActualizarTarea,
  onEliminarTarea,
  onCrearSolicitudInsumo,
  onActualizarSolicitudInsumo,
  onEliminarSolicitudInsumo,
  activeOperator = 'Juan',
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<IntegranteEquipo | 'periodicas' | 'sos'>(() => {
    if (activeOperator === 'Juan' || activeOperator === 'Wendy' || activeOperator === 'Germán') {
      return activeOperator;
    }
    return 'Germán';
  });

  // Hook de bitácora y conteo de avances
  const { conteos, refreshConteos } = useTareaAvances();
  const [tareaParaBitacora, setTareaParaBitacora] = useState<TareaEquipo | null>(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState<boolean>(false);

  // Formulario Nueva Tarea / Idea Rápida de WhatsApp
  const [tituloTarea, setTituloTarea] = useState('');
  const [descripcionTarea, setDescripcionTarea] = useState('');
  const [asignadoA, setAsignadoA] = useState<IntegranteEquipo>(() => {
    if (activeOperator === 'Juan' || activeOperator === 'Wendy') return activeOperator;
    return 'Germán';
  });
  const [tipoTarea, setTipoTarea] = useState<'puntual' | 'periodica'>('puntual');
  const [frecuencia, setFrecuencia] = useState<'diaria' | 'semanal' | 'quincenal' | 'mensual'>('semanal');
  const [prioridad, setPrioridad] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');
  const [origenWhatsApp, setOrigenWhatsApp] = useState(false);

  // Filtros de Órdenes de Insumos
  const [filtroEstadoOrden, setFiltroEstadoOrden] = useState<'todas' | EstadoSolicitudInsumo>('todas');
  const [busquedaOrden, setBusquedaOrden] = useState('');

  // Modal Unificado S.O.S Insumos (Crear o Gestionar / Rastrear)
  const [showModalSOS, setShowModalSOS] = useState(false);
  const [editingSolicitud, setEditingSolicitud] = useState<SolicitudInsumo | null>(null);
  const [vinculoCatalogoKey, setVinculoCatalogoKey] = useState<string>('custom');
  const [insumoNombre, setInsumoNombre] = useState('');
  const [categoriaOrden, setCategoriaOrden] = useState('');
  const [cantidadInsumo, setCantidadInsumo] = useState<number>(1);
  const [unidadInsumo, setUnidadInsumo] = useState('unidades');
  const [urgenciaInsumo, setUrgenciaInsumo] = useState<UrgenciaInsumo>('normal');
  const [estadoOrden, setEstadoOrden] = useState<EstadoSolicitudInsumo>('pendiente');
  const [solicitadoPor, setSolicitadoPor] = useState(activeOperator || 'Juan');
  const [encargadoCompra, setEncargadoCompra] = useState<IntegranteEquipo>('Wendy');
  const [tipoCompra, setTipoCompra] = useState<TipoCompraInsumo>('internet');
  const [plataformaTienda, setPlataformaTienda] = useState('');
  const [numeroPedido, setNumeroPedido] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [numeroGuia, setNumeroGuia] = useState('');
  const [enlaceCompra, setEnlaceCompra] = useState('');
  const [enlaceRastreo, setEnlaceRastreo] = useState('');
  const [fechaEstimadaLlegada, setFechaEstimadaLlegada] = useState('');
  const [costoEstimado, setCostoEstimado] = useState<number>(0);
  const [costoReal, setCostoReal] = useState<number>(0);
  const [notasInsumo, setNotasInsumo] = useState('');
  const [enviarSOSATodos, setEnviarSOSATodos] = useState(true);
  const [sumarAlInventarioOnSave, setSumarAlInventarioOnSave] = useState(true);

  // Estados para Mensajería Centralizada, Edición y Confirmaciones
  const [tareaParaWhatsApp, setTareaParaWhatsApp] = useState<TareaEquipo | null>(null);
  const [notificarInstantaneo, setNotificarInstantaneo] = useState(true);
  const [fechaLimiteTarea, setFechaLimiteTarea] = useState('');
  const [notifBanner, setNotifBanner] = useState<{ text: string; fallbackUrl?: string; tarea?: TareaEquipo } | null>(null);
  const [deleteSolTarget, setDeleteSolTarget] = useState<SolicitudInsumo | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<TareaEquipo | null>(null);
  const [editingTask, setEditingTask] = useState<TareaEquipo | null>(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAsignado, setEditAsignado] = useState<IntegranteEquipo>('Germán');
  const [editPrioridad, setEditPrioridad] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');
  const [editTipo, setEditTipo] = useState<'puntual' | 'periodica'>('puntual');
  const [editFrecuencia, setEditFrecuencia] = useState<'diaria' | 'semanal' | 'quincenal' | 'mensual'>('semanal');
  const [editFechaLimite, setEditFechaLimite] = useState('');
  const [taskToAskRenotify, setTaskToAskRenotify] = useState<TareaEquipo | null>(null);
  const [sosParaNotificar, setSosParaNotificar] = useState<SolicitudInsumo | null>(null);

  // Opciones combinadas del catálogo de bodega para vincular pedidos con auto-reabastecimiento
  const catalogoOpciones = useMemo(() => {
    const opts: { value: string; label: string; subtitle: string; tipo: CatalogoTipoVinculo; itemId: string; nombre: string; unidad: string; enlace?: string; categoria: string }[] = [];
    resinasCatalogo.forEach(r => {
      const nom = r.resumen || `${r.marca} ${r.tipo} ${r.color}`.trim();
      opts.push({
        value: `resina::${r.id}`,
        label: `🧪 Resina: ${nom}`,
        subtitle: `Disponible: ${r.peso_g}g`,
        tipo: 'resina',
        itemId: r.id,
        nombre: nom,
        unidad: 'botellas',
        categoria: 'Resina'
      });
    });
    filamentosCatalogo.forEach(f => {
      const nom = `${f.marca} ${f.tipo} ${f.color}`.trim();
      opts.push({
        value: `filamento::${f.id}`,
        label: `🧵 Filamento: ${nom}`,
        subtitle: `Disponible: ${f.stock_actual_g}g`,
        tipo: 'filamento',
        itemId: f.id,
        nombre: nom,
        unidad: 'bobinas',
        enlace: f.enlace_compra,
        categoria: 'Filamento'
      });
    });
    insumosCatalogo.forEach(i => {
      const stockAct = i.stock_actual !== undefined ? i.stock_actual : i.presentacion;
      opts.push({
        value: `insumo::${i.id}`,
        label: `📦 Insumo: ${i.nombre}`,
        subtitle: `${i.categoria} • Stock: ${stockAct} ${i.unidad_medida || 'und'}`,
        tipo: 'insumo',
        itemId: i.id,
        nombre: i.nombre,
        unidad: i.unidad_medida || 'unidades',
        enlace: i.enlace_compra,
        categoria: i.categoria
      });
    });
    return opts;
  }, [resinasCatalogo, filamentosCatalogo, insumosCatalogo]);

  const notificarTareaEnSegundoPlano = async (
    tareaObj: TareaEquipo,
    evento: 'asignada' | 'actualizada' | 'completada'
  ) => {
    try {
      const res = await MessagingHubService.notifyTask(tareaObj, evento, {
        usuarios,
        config
      });

      if (res.whatsappFailCount === 0 && res.emailFailCount === 0 && res.results.length > 0) {
        toast.success(`Notificado al instante: ${res.summaryText}`);
        setNotifBanner({ text: `🚀 "${tareaObj.titulo}" enviada (${res.summaryText}).` });
        setTimeout(() => setNotifBanner(null), 6000);
      } else if (res.success) {
        toast.warning(`Envío parcial: ${res.summaryText}`);
        setNotifBanner({
          text: `⚠️ ${res.summaryText}`,
          fallbackUrl: res.fallbackUrls[0]?.url,
          tarea: tareaObj
        });
      } else {
        toast.error(`Error notificando tarea: ${res.summaryText || 'Revisa la conexión de WhatsApp/Correo'}`);
        setNotifBanner({
          text: `❌ No se pudo despachar automáticamente (${res.summaryText}).`,
          fallbackUrl: res.fallbackUrls[0]?.url,
          tarea: tareaObj
        });
      }
    } catch {
      toast.error('No se pudo ejecutar la notificación automática.');
    }
  };

  // Guardar Tarea / Idea
  const handleCrearTarea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloTarea.trim()) return;

    const nueva: TareaEquipo = {
      id: `task-${Date.now()}`,
      titulo: tituloTarea.trim(),
      descripcion: descripcionTarea.trim() || undefined,
      asignado_a: asignadoA,
      tipo: tipoTarea,
      frecuencia: tipoTarea === 'periodica' ? frecuencia : undefined,
      prioridad: prioridad,
      fecha_limite: fechaLimiteTarea || undefined,
      completada: false,
      origen: origenWhatsApp ? 'whatsapp' : 'manual',
      fecha_creacion: new Date().toISOString().slice(0, 10)
    };

    onGuardarTarea(nueva);
    setTituloTarea('');
    setDescripcionTarea('');
    setFechaLimiteTarea('');
    setOrigenWhatsApp(false);

    if (notificarInstantaneo) {
      notificarTareaEnSegundoPlano(nueva, 'asignada');
    } else {
      toast.success(`Tarea "${nueva.titulo}" agregada.`);
    }
  };

  const handleOpenEditarTarea = (t: TareaEquipo) => {
    setEditingTask(t);
    setEditTitulo(t.titulo);
    setEditDesc(t.descripcion || '');
    setEditAsignado(t.asignado_a);
    setEditPrioridad(t.prioridad);
    setEditTipo(t.tipo);
    setEditFrecuencia(t.frecuencia || 'semanal');
    setEditFechaLimite(t.fecha_limite || '');
  };

  const handleSaveEditarTarea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitulo.trim()) return;

    const actualizada: TareaEquipo = {
      ...editingTask,
      titulo: editTitulo.trim(),
      descripcion: editDesc.trim() || undefined,
      asignado_a: editAsignado,
      prioridad: editPrioridad,
      tipo: editTipo,
      frecuencia: editTipo === 'periodica' ? editFrecuencia : undefined,
      fecha_limite: editFechaLimite || undefined
    };

    onActualizarTarea(actualizada);
    setEditingTask(null);
    toast.success(`Tarea "${actualizada.titulo}" actualizada.`);
    setTaskToAskRenotify(actualizada);
  };

  // Alternar estado de tarea (completada / pendiente)
  const handleToggleCompletada = (t: TareaEquipo) => {
    const updated: TareaEquipo = {
      ...t,
      completada: !t.completada,
      fecha_completada: !t.completada ? new Date().toISOString().slice(0, 10) : undefined
    };
    onActualizarTarea(updated);

    if (updated.completada) {
      confetti({ particleCount: 40, spread: 50 });
      notificarTareaEnSegundoPlano(updated, 'completada');
    }
  };

  const resetFormSOS = () => {
    setEditingSolicitud(null);
    setVinculoCatalogoKey('custom');
    setInsumoNombre('');
    setCategoriaOrden('');
    setCantidadInsumo(1);
    setUnidadInsumo('unidades');
    setUrgenciaInsumo('normal');
    setEstadoOrden('pendiente');
    setSolicitadoPor(activeOperator || 'Juan');
    setEncargadoCompra('Wendy');
    setTipoCompra('internet');
    setPlataformaTienda('');
    setNumeroPedido('');
    setTransportadora('');
    setNumeroGuia('');
    setEnlaceCompra('');
    setEnlaceRastreo('');
    setFechaEstimadaLlegada('');
    setCostoEstimado(0);
    setCostoReal(0);
    setNotasInsumo('');
    setEnviarSOSATodos(true);
    setSumarAlInventarioOnSave(true);
  };

  const handleOpenCrearSOS = () => {
    resetFormSOS();
    setShowModalSOS(true);
  };

  const handleOpenEditarSOS = (sol: SolicitudInsumo) => {
    setEditingSolicitud(sol);
    if (sol.catalogo_tipo && sol.catalogo_item_id) {
      setVinculoCatalogoKey(`${sol.catalogo_tipo}::${sol.catalogo_item_id}`);
    } else {
      setVinculoCatalogoKey('custom');
    }
    setInsumoNombre(sol.insumo_nombre);
    setCategoriaOrden(sol.categoria || '');
    setCantidadInsumo(sol.cantidad);
    setUnidadInsumo(sol.unidad || 'unidades');
    setUrgenciaInsumo(sol.urgencia);
    setEstadoOrden(sol.estado);
    setSolicitadoPor(sol.solicitado_por);
    setEncargadoCompra(sol.encargado_compra || 'Wendy');
    setTipoCompra(sol.tipo_compra || 'internet');
    setPlataformaTienda(sol.plataforma_tienda || '');
    setNumeroPedido(sol.numero_pedido || '');
    setTransportadora(sol.transportadora || '');
    setNumeroGuia(sol.numero_guia || '');
    setEnlaceCompra(sol.enlace_compra || '');
    setEnlaceRastreo(sol.enlace_rastreo || '');
    setFechaEstimadaLlegada(sol.fecha_estimada_llegada || '');
    setCostoEstimado(Number(sol.costo_estimado) || 0);
    setCostoReal(Number(sol.costo_real) || 0);
    setNotasInsumo(sol.notas || '');
    setEnviarSOSATodos(false);
    setSumarAlInventarioOnSave(!sol.stock_reabastecido);
    setShowModalSOS(true);
  };

  const handleSelectVinculoCatalogo = (val: string) => {
    setVinculoCatalogoKey(val);
    if (val === 'custom') return;
    const opt = catalogoOpciones.find(o => o.value === val);
    if (opt) {
      setInsumoNombre(opt.nombre);
      setUnidadInsumo(opt.unidad);
      setCategoriaOrden(opt.categoria);
      if (opt.enlace) setEnlaceCompra(opt.enlace);
    }
  };

  const handleSelectInsumoCatalogo = (nombre: string) => {
    setInsumoNombre(nombre);
    const encontrado = insumosCatalogo.find(i => i.nombre.toLowerCase().includes(nombre.toLowerCase()));
    if (encontrado) {
      setVinculoCatalogoKey(`insumo::${encontrado.id}`);
      setUnidadInsumo(encontrado.unidad_medida || 'unidades');
      setCategoriaOrden(encontrado.categoria);
      if (encontrado.enlace_compra) setEnlaceCompra(encontrado.enlace_compra);
    }
  };

  // Guardar / Actualizar Orden de Insumo (y reabastecer stock si pasa a 'recibido')
  const handleGuardarSolicitudInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumoNombre.trim()) return;

    const vinculoOpt = vinculoCatalogoKey !== 'custom'
      ? catalogoOpciones.find(o => o.value === vinculoCatalogoKey)
      : undefined;

    const solicitudFinal: SolicitudInsumo = {
      id: editingSolicitud ? editingSolicitud.id : `sos-${Date.now()}`,
      insumo_nombre: insumoNombre.trim(),
      categoria: categoriaOrden.trim() || editingSolicitud?.categoria || undefined,
      cantidad: Math.max(0.01, Number(cantidadInsumo) || 1),
      unidad: unidadInsumo.trim() || 'unidades',
      urgencia: urgenciaInsumo,
      solicitado_por: solicitadoPor.trim() || activeOperator || 'Juan',
      encargado_compra: encargadoCompra,
      estado: estadoOrden,
      enlace_compra: enlaceCompra.trim() || undefined,
      notas: notasInsumo.trim() || undefined,
      fecha_solicitud: editingSolicitud?.fecha_solicitud || new Date().toISOString().slice(0, 10),
      fecha_atendida: estadoOrden === 'recibido'
        ? (editingSolicitud?.fecha_atendida || new Date().toISOString().slice(0, 10))
        : editingSolicitud?.fecha_atendida,
      tipo_compra: tipoCompra,
      plataforma_tienda: plataformaTienda.trim() || undefined,
      numero_pedido: numeroPedido.trim() || undefined,
      transportadora: transportadora.trim() || undefined,
      numero_guia: numeroGuia.trim() || undefined,
      enlace_rastreo: enlaceRastreo.trim() || undefined,
      fecha_estimada_llegada: fechaEstimadaLlegada.trim() || undefined,
      costo_estimado: costoEstimado > 0 ? costoEstimado : undefined,
      costo_real: costoReal > 0 ? costoReal : undefined,
      origen_tipo: editingSolicitud?.origen_tipo || 'manual',
      catalogo_tipo: vinculoOpt?.tipo || editingSolicitud?.catalogo_tipo,
      catalogo_item_id: vinculoOpt?.itemId || editingSolicitud?.catalogo_item_id,
      stock_reabastecido: editingSolicitud?.stock_reabastecido || false
    };

    if (editingSolicitud) {
      onActualizarSolicitudInsumo(solicitudFinal, {
        sumarAlInventario: estadoOrden === 'recibido' && sumarAlInventarioOnSave && !editingSolicitud.stock_reabastecido
      });
    } else {
      onCrearSolicitudInsumo(solicitudFinal);
      if (estadoOrden === 'recibido' && sumarAlInventarioOnSave) {
        onActualizarSolicitudInsumo(solicitudFinal, { sumarAlInventario: true });
      }
      if (enviarSOSATodos || encargadoCompra === 'Todos') {
        MessagingHubService.notifySOSInsumo(solicitudFinal, {
          enviarAlGrupo: true,
          evento: 'creada',
          usuarios,
          config
        }).then(res => {
          if (res.success) {
            setNotifBanner({ text: `🚨 Alerta S.O.S despachada (${res.summaryText}).` });
            toast.success(`S.O.S enviado: ${res.summaryText}`);
          } else {
            setNotifBanner({
              text: `⚠️ S.O.S guardado, pero falló notificación (${res.summaryText}).`,
              fallbackUrl: res.fallbackUrls[0]?.url
            });
            toast.warning(`S.O.S guardado. Revisa el envío (${res.summaryText}).`);
          }
          setTimeout(() => setNotifBanner(null), 6500);
        });
      } else {
        MessagingHubService.notifySOSInsumo(solicitudFinal, {
          enviarAlGrupo: false,
          evento: 'creada',
          usuarios,
          config
        }).then(res => {
          if (res.success) toast.success(`S.O.S notificado: ${res.summaryText}`);
          else toast.warning(`S.O.S guardado; no se pudo notificar automáticamente (${res.summaryText}).`);
        });
      }
    }

    setShowModalSOS(false);
    resetFormSOS();
  };

  // Filtrado de tareas según pestaña activa
  const tareasFiltradas = tareas.filter(t => {
    if (activeTab === 'periodicas') return t.tipo === 'periodica';
    if (activeTab === 'sos') return false;
    return t.asignado_a === activeTab || t.asignado_a === 'Todos';
  });

  const solicitudesAbiertas = solicitudesInsumos.filter(
    s => s.estado !== 'recibido' && s.estado !== 'cancelado'
  );

  const solicitudesFiltradas = useMemo(() => {
    const q = busquedaOrden.trim().toLowerCase();
    return solicitudesInsumos.filter(s => {
      if (filtroEstadoOrden !== 'todas' && s.estado !== filtroEstadoOrden) return false;
      if (!q) return true;
      return (
        s.insumo_nombre.toLowerCase().includes(q) ||
        (s.plataforma_tienda || '').toLowerCase().includes(q) ||
        (s.numero_pedido || '').toLowerCase().includes(q) ||
        (s.numero_guia || '').toLowerCase().includes(q) ||
        (s.transportadora || '').toLowerCase().includes(q) ||
        (s.solicitado_por || '').toLowerCase().includes(q)
      );
    });
  }, [solicitudesInsumos, filtroEstadoOrden, busquedaOrden]);

  const handleConfirmEliminarOrden = (sol: SolicitudInsumo) => {
    if (!onEliminarSolicitudInsumo) return;
    setDeleteSolTarget(sol);
  };

  const executeEliminarOrden = () => {
    if (!deleteSolTarget || !onEliminarSolicitudInsumo) return;
    onEliminarSolicitudInsumo(deleteSolTarget.id);
    setDeleteSolTarget(null);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '70px' }}>
      {/* Encabezado */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Users size={24} color="var(--brand-cyan)" />
            Equipo, Tareas & S.O.S Insumos
          </h2>
          <p className="section-subtitle">
            Responsabilidades por integrante (Germán, Wendy, Juan), rutinas periódicas y rastreo completo de órdenes de compra e insumos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleOpenCrearSOS}
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(245, 158, 11, 0.2))',
              border: '1px solid #ef4444',
              color: '#f87171',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px'
            }}
          >
            <Flame size={16} color="#ef4444" />
            <span>🚨 S.O.S Insumos (Pedir Material)</span>
          </button>
        </div>
      </div>

      {/* Alerta de Envío Automático por WhatsApp + Correo */}
      {notifBanner && (
        <div
          style={{
            background: notifBanner.fallbackUrl ? 'rgba(245, 158, 11, 0.14)' : 'rgba(34, 197, 94, 0.15)',
            border: `1px solid ${notifBanner.fallbackUrl ? 'rgba(245, 158, 11, 0.45)' : 'rgba(34, 197, 94, 0.4)'}`,
            color: notifBanner.fallbackUrl ? '#fde68a' : '#4ade80',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={16} />
            <span>{notifBanner.text}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {notifBanner.tarea && (
              <WjgButton
                variant="secondary"
                size="sm"
                onClick={() => setTareaParaWhatsApp(notifBanner.tarea!)}
                style={{ minHeight: '32px', padding: '4px 10px', fontSize: '0.75rem' }}
              >
                Reintentar
              </WjgButton>
            )}
            {notifBanner.fallbackUrl && (
              <WjgButton
                variant="whatsapp"
                size="sm"
                onClick={() => window.open(notifBanner.fallbackUrl!, '_blank', 'noopener,noreferrer')}
                style={{ minHeight: '32px', padding: '4px 10px', fontSize: '0.75rem' }}
              >
                Abrir WhatsApp Web
              </WjgButton>
            )}
          </div>
        </div>
      )}

      {/* Selector de Pestañas por Integrante en Cuadrícula Ordenada */}
      <div className="subtabs-grid-mobile" style={{ marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        {INTEGRANTES.filter(i => i !== 'Todos').map(integ => {
          const count = tareas.filter(t => t.asignado_a === integ && !t.completada).length;
          return (
            <button
              key={integ}
              type="button"
              className={`btn btn-sm ${activeTab === integ ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab(integ)}
              style={{ fontWeight: 800, whiteSpace: 'nowrap' }}
            >
              <span>👤 {integ}</span>
              {count > 0 && <span className="nav-badge-pill" style={{ position: 'static' }}>{count}</span>}
            </button>
          );
        })}

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'periodicas' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('periodicas')}
          style={{ fontWeight: 800, whiteSpace: 'nowrap' }}
        >
          <RotateCw size={14} />
          <span>Rutinas Periódicas</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'sos' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('sos')}
          style={{ fontWeight: 800, color: solicitudesAbiertas.length > 0 ? '#f87171' : 'inherit', whiteSpace: 'nowrap' }}
        >
          <ShoppingCart size={14} />
          <span>Órdenes de Insumos ({solicitudesAbiertas.length})</span>
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      {activeTab === 'sos' ? (
        /* PESTAÑA S.O.S INSUMOS / ÓRDENES DE COMPRA & RASTREO LOGÍSTICO */
        <div>
          <div className="glass-card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                📦 Gestión & Rastreo de Órdenes de Insumos ({solicitudesFiltradas.length})
              </h3>

              <WjgSearchInput
                compact
                value={busquedaOrden}
                onChange={setBusquedaOrden}
                placeholder="Buscar insumo, tienda, guía o pedido..."
                style={{ minWidth: '220px', flex: '1 1 240px', maxWidth: '340px' }}
              />
            </div>

            {/* Filtros por Estado Logístico */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${filtroEstadoOrden === 'todas' ? 'btn-cyan' : 'btn-secondary'}`}
                onClick={() => setFiltroEstadoOrden('todas')}
                style={{ fontSize: '0.73rem', padding: '5px 10px', minHeight: 'auto' }}
              >
                Todas ({solicitudesInsumos.length})
              </button>
              {(['pendiente', 'en_gestion', 'orden_enviada', 'comprado', 'en_camino', 'recibido', 'cancelado'] as EstadoSolicitudInsumo[]).map(st => {
                const conf = ESTADOS_ORDEN_CONFIG[st];
                const cnt = solicitudesInsumos.filter(s => s.estado === st).length;
                const active = filtroEstadoOrden === st;
                return (
                  <button
                    key={st}
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setFiltroEstadoOrden(st)}
                    style={{
                      fontSize: '0.72rem',
                      padding: '5px 10px',
                      minHeight: 'auto',
                      backgroundColor: active ? conf.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? conf.border : 'rgba(255,255,255,0.08)'}`,
                      color: active ? conf.color : '#cbd5e1',
                      fontWeight: active ? 800 : 600
                    }}
                  >
                    {conf.label} ({cnt})
                  </button>
                );
              })}
            </div>
          </div>

          {solicitudesFiltradas.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} color="#34d399" style={{ marginBottom: '10px', opacity: 0.8 }} />
              <p>No hay órdenes de insumos en este filtro.</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleOpenCrearSOS}
                style={{ marginTop: '12px' }}
              >
                + Crear nueva orden de insumo
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {solicitudesFiltradas.map(sol => {
                const esDetenido = sol.urgencia === 'taller_detenido';
                const esUrgente = sol.urgencia === 'urgente';
                const estadoInfo = ESTADOS_ORDEN_CONFIG[sol.estado] || ESTADOS_ORDEN_CONFIG.pendiente;
                const solAlert = resolveSupplyRequestAlert({ estado: sol.estado, urgencia: sol.urgencia });
                const tieneRastreoInfo = Boolean(
                  sol.plataforma_tienda || sol.numero_pedido || sol.transportadora || sol.numero_guia || sol.fecha_estimada_llegada || sol.costo_real || sol.costo_estimado
                );

                return (
                  <div
                    key={sol.id}
                    className={getAlertSurfaceClassName(solAlert.tone, 'glass-card')}
                    style={{
                      margin: 0,
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                        {/* Fila de Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: estadoInfo.bg,
                              border: `1px solid ${estadoInfo.border}`,
                              color: estadoInfo.color
                            }}
                          >
                            {estadoInfo.label}
                          </span>

                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: esDetenido ? 'rgba(239, 68, 68, 0.2)' : esUrgente ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                              color: esDetenido ? '#f87171' : esUrgente ? '#fbbf24' : '#38bdf8'
                            }}
                          >
                            {sol.urgencia.toUpperCase().replace('_', ' ')}
                          </span>

                          <span
                            style={{
                              fontSize: '0.69rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              background: 'rgba(255,255,255,0.06)',
                              color: '#cbd5e1',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {sol.tipo_compra === 'local' ? <Store size={11} /> : <Globe size={11} />}
                            {sol.tipo_compra === 'local' ? 'Tienda Local' : 'Compra Internet'}
                          </span>

                          {sol.origen_tipo === 'auto_stock_bajo' && (
                            <span
                              style={{
                                fontSize: '0.69rem',
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                background: 'rgba(168, 85, 247, 0.18)',
                                color: '#d8b4fe',
                                border: '1px solid rgba(168, 85, 247, 0.35)'
                              }}
                            >
                              🤖 Auto Stock Bajo
                            </span>
                          )}

                          {sol.stock_reabastecido && (
                            <span
                              style={{
                                fontSize: '0.69rem',
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                background: 'rgba(16, 185, 129, 0.18)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.35)'
                              }}
                            >
                              📦 Reabastecido en Bodega
                            </span>
                          )}

                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            📅 {sol.fecha_solicitud}
                          </span>
                        </div>

                        <h4 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                          {sol.insumo_nombre} (x{sol.cantidad} {sol.unidad})
                        </h4>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Solicita: <strong style={{ color: '#fff' }}>{sol.solicitado_por}</strong> ➔ Encargado/a: <strong style={{ color: 'var(--brand-cyan)' }}>{sol.encargado_compra}</strong>
                        </div>

                        {/* Detalles de Gestión y Rastreo Online */}
                        {tieneRastreoInfo && (
                          <div
                            style={{
                              marginTop: '8px',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              background: 'rgba(15, 23, 42, 0.55)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '10px',
                              fontSize: '0.75rem',
                              color: '#cbd5e1'
                            }}
                          >
                            {sol.plataforma_tienda && <span>🏪 <strong>{sol.plataforma_tienda}</strong></span>}
                            {sol.numero_pedido && <span>🧾 Pedido: <strong>#{sol.numero_pedido}</strong></span>}
                            {sol.transportadora && <span>🚚 {sol.transportadora}</span>}
                            {sol.numero_guia && <span>🔎 Guía: <strong style={{ color: '#38bdf8' }}>{sol.numero_guia}</strong></span>}
                            {sol.fecha_estimada_llegada && <span>📆 Llega est.: <strong>{sol.fecha_estimada_llegada}</strong></span>}
                            {(sol.costo_real || sol.costo_estimado) ? (
                              <span style={{ color: '#34d399', fontWeight: 700 }}>
                                💵 ${(sol.costo_real || sol.costo_estimado || 0).toLocaleString('es-CO')} COP {sol.costo_real ? '(Real)' : '(Est.)'}
                              </span>
                            ) : null}
                          </div>
                        )}

                        {sol.notas && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '6px' }}>
                            📝 {sol.notas}
                          </div>
                        )}

                        {sol.estado !== 'cancelado' && (
                          <div style={{ marginTop: '10px', maxWidth: '340px' }}>
                            <WjgProgressBar
                              percent={solAlert.percent ?? 0}
                              label={`Estado: ${estadoInfo.label}`}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {sol.enlace_rastreo && (
                          <a
                            href={sol.enlace_rastreo.startsWith('http') ? sol.enlace_rastreo : `https://${sol.enlace_rastreo}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-cyan btn-sm"
                            style={{ fontSize: '0.74rem', textDecoration: 'none' }}
                            title="Abrir rastreo de transportadora"
                          >
                            <Truck size={13} />
                            <span>Rastrear</span>
                          </a>
                        )}

                        {sol.enlace_compra && (
                          <a
                            href={sol.enlace_compra.startsWith('http') ? sol.enlace_compra : `https://${sol.enlace_compra}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.74rem', textDecoration: 'none' }}
                          >
                            <ExternalLink size={13} />
                            <span>Comprar</span>
                          </a>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditarSOS(sol)}
                          style={{ fontSize: '0.74rem', borderColor: 'rgba(56, 189, 248, 0.35)', color: '#38bdf8' }}
                          title="Editar estado, guía de rastreo y costos"
                        >
                          <Settings2 size={13} />
                          <span>Gestionar</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-whatsapp btn-sm"
                          onClick={() => setSosParaNotificar(sol)}
                          style={{ fontSize: '0.74rem' }}
                          title="Notificar por WhatsApp y Correo"
                        >
                          <Send size={13} />
                        </button>

                        {sol.estado !== 'recibido' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              const puedeAutoSumar = Boolean((sol.catalogo_item_id || sol.catalogo_tipo) && !sol.stock_reabastecido);
                              onActualizarSolicitudInsumo(
                                {
                                  ...sol,
                                  estado: 'recibido',
                                  fecha_atendida: new Date().toISOString().slice(0, 10)
                                },
                                { sumarAlInventario: puedeAutoSumar }
                              );
                            }}
                            style={{ fontSize: '0.74rem' }}
                            title="Marcar recibido en bodega"
                          >
                            <PackageCheck size={13} />
                            <span>Recibido</span>
                          </button>
                        )}

                        {onEliminarSolicitudInsumo && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleConfirmEliminarOrden(sol)}
                            style={{ padding: '6px 9px' }}
                            title="Eliminar orden de insumo"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* PESTAÑAS DE INTEGRANTES O RUTINAS */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) 1fr', gap: '24px', alignItems: 'start' }} className="pos-layout-grid">
          {/* PANEL IZQUIERDO: BUZÓN RÁPIDO DE TAREAS & WHATSAPP */}
          <div className="glass-card" style={{ margin: 0, padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="var(--brand-cyan)" />
              {activeTab === 'periodicas' ? 'Nueva Rutina Periódica' : `Nueva Tarea para ${activeTab}`}
            </h3>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Pega encargos o ideas que te lleguen por WhatsApp para no perderlos en el chat.
            </p>

            <form onSubmit={handleCrearTarea}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  TÍTULO DE LA TAREA O ENCARGO:
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Afinar soportes de figura Tanjiro / Cambiar FEP"
                  value={tituloTarea}
                  onChange={e => setTituloTarea(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  DETALLES O NOTAS ADICIONALES:
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Detalles técnicos, parámetros de curado, cliente relacionado..."
                  value={descripcionTarea}
                  onChange={e => setDescripcionTarea(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    RESPONSABLE:
                  </label>
                  <WjgSelect
                    value={asignadoA}
                    onChange={(val) => setAsignadoA(val as IntegranteEquipo)}
                    options={INTEGRANTES.map(i => ({ value: i, label: i }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    PRIORIDAD:
                  </label>
                  <WjgSelect
                    value={prioridad}
                    onChange={(val) => setPrioridad(val as any)}
                    options={[
                      { value: 'baja', label: 'Baja' },
                      { value: 'media', label: 'Media' },
                      { value: 'alta', label: 'Alta' },
                      { value: 'urgente', label: '🔥 Urgente' },
                    ]}
                  />
                </div>
              </div>

              {/* Tipo de tarea (Puntual vs Periódica) */}
              <div style={{ marginBottom: '14px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tipoTarea"
                      checked={tipoTarea === 'puntual'}
                      onChange={() => setTipoTarea('puntual')}
                    />
                    Puntual (1 sola vez)
                  </label>

                  <label style={{ fontSize: '0.78rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tipoTarea"
                      checked={tipoTarea === 'periodica'}
                      onChange={() => setTipoTarea('periodica')}
                    />
                    Rutina Periódica 🔄
                  </label>
                </div>

                {tipoTarea === 'periodica' && (
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      FRECUENCIA DE REPETICIÓN:
                    </label>
                    <WjgSelect
                      compact
                      value={frecuencia}
                      onChange={(val) => setFrecuencia(val as any)}
                      options={[
                        { value: 'diaria', label: 'Diaria', subtitle: 'Todos los días' },
                        { value: 'semanal', label: 'Semanal', subtitle: 'Una vez por semana' },
                        { value: 'quincenal', label: 'Quincenal', subtitle: 'Cada 15 días' },
                        { value: 'mensual', label: 'Mensual', subtitle: 'Cada mes' },
                      ]}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  FECHA LÍMITE (OPCIONAL):
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={fechaLimiteTarea}
                  onChange={e => setFechaLimiteTarea(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="checkbox"
                  id="chkWhatsapp"
                  checked={origenWhatsApp}
                  onChange={e => setOrigenWhatsApp(e.target.checked)}
                />
                <label htmlFor="chkWhatsapp" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  💬 Encargo recibido por WhatsApp
                </label>
              </div>

              <div style={{ marginBottom: '16px' }}>
                {(() => {
                  const preview = resolveTaskRecipients(asignadoA, usuarios, config, 'tareas', false);
                  const desc =
                    asignadoA === 'Todos'
                      ? preview.groupConfigured
                        ? `Grupo WhatsApp "${preview.groupConfigured.nombre}" + correo a ${preview.emailTargets.length} integrantes`
                        : `WhatsApp a los 3 + correo a ${preview.emailTargets.length} integrantes`
                      : `WhatsApp directo a ${asignadoA} + correo a ${preview.emailTargets[0]?.correo || 'su correo'}`;
                  return (
                    <WjgSwitch
                      checked={notificarInstantaneo}
                      onChange={setNotificarInstantaneo}
                      accentColor="#25D366"
                      label="🚀 Notificar instantáneamente (WhatsApp + Correo)"
                      description={desc}
                    />
                  );
                })()}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', fontWeight: 800, padding: '10px' }}
              >
                <Plus size={16} />
                <span>Agregar a la Lista</span>
              </button>
            </form>
          </div>

          {/* PANEL DERECHO: LISTA DE TAREAS Y RUTINAS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                {activeTab === 'periodicas' ? '🔄 Rutinas de Taller & Mantenimiento' : `Tareas Asignadas a ${activeTab}`} ({tareasFiltradas.length})
              </h3>
            </div>

            {tareasFiltradas.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} color="#34d399" style={{ marginBottom: '10px', opacity: 0.8 }} />
                <p>No hay tareas pendientes en este apartado.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tareasFiltradas.map(t => (
                  <TareaCard
                    key={t.id}
                    tarea={t}
                    conteoAvances={conteos[t.id] || 0}
                    onToggleCompletada={handleToggleCompletada}
                    onEditarTarea={handleOpenEditarTarea}
                    onEliminarTarea={(id) => {
                      const found = tareas.find(x => x.id === id);
                      if (found) setDeleteTaskTarget(found);
                    }}
                    onOpenWhatsApp={setTareaParaWhatsApp}
                    onOpenBitacora={(selectedTarea) => {
                      setTareaParaBitacora(selectedTarea);
                      setShowBitacoraModal(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL UNIFICADO S.O.S INSUMOS / GESTIÓN Y RASTREO DE COMPRA */}
      {showModalSOS && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
          }}
          onClick={() => setShowModalSOS(false)}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '580px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              margin: 0,
              padding: '22px',
              border: '1px solid rgba(56, 189, 248, 0.45)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: editingSolicitud ? '#38bdf8' : '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingSolicitud ? <Truck size={20} color="#38bdf8" /> : <Flame size={20} color="#ef4444" />}
                {editingSolicitud ? `Gestionar / Rastrear: ${editingSolicitud.insumo_nombre}` : 'S.O.S Taller • Nueva Orden de Insumo'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModalSOS(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarSolicitudInsumo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Vincular a catálogo para reabastecimiento automático */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  VINCULAR A BODEGA (OPCIONAL — PERMITE AUTO-REABASTECER AL RECIBIR):
                </label>
                <WjgSelect
                  value={vinculoCatalogoKey}
                  onChange={handleSelectVinculoCatalogo}
                  searchPlaceholder="Buscar resina, filamento o insumo..."
                  options={[
                    { value: 'custom', label: 'Entrada manual libre (sin vincular)' },
                    ...catalogoOpciones.map(o => ({ value: o.value, label: o.label, subtitle: o.subtitle }))
                  ]}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  NOMBRE DEL INSUMO O MATERIAL:
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Resina Anycubic Gris / Guantes nitrilo / Alcohol 96%"
                  value={insumoNombre}
                  onChange={e => setInsumoNombre(e.target.value)}
                  required
                />
                {!editingSolicitud && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {['Resina Gris', 'Guantes Nitrilo', 'Alcohol 96%', 'Primer Negro', 'Pincel 00'].map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleSelectInsumoCatalogo(sug)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    CANTIDAD:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-input"
                    value={cantidadInsumo === 0 ? '' : cantidadInsumo}
                    onChange={e => setCantidadInsumo(e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0))}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    UNIDAD:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={unidadInsumo}
                    onChange={e => setUnidadInsumo(e.target.value)}
                    placeholder="botellas / bobinas / und"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    URGENCIA:
                  </label>
                  <WjgSelect
                    value={urgenciaInsumo}
                    onChange={(val) => setUrgenciaInsumo(val as UrgenciaInsumo)}
                    options={[
                      { value: 'normal', label: 'Normal' },
                      { value: 'urgente', label: '⚠️ Urgente' },
                      { value: 'taller_detenido', label: '🚨 Taller Detenido' },
                    ]}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    ESTADO DE GESTIÓN:
                  </label>
                  <WjgSelect
                    value={estadoOrden}
                    onChange={(val) => setEstadoOrden(val as EstadoSolicitudInsumo)}
                    options={[
                      { value: 'pendiente', label: 'Pendiente' },
                      { value: 'en_gestion', label: 'En Gestión / Cotizando' },
                      { value: 'orden_enviada', label: 'Pedido Realizado' },
                      { value: 'comprado', label: 'Comprado / Pagado' },
                      { value: 'en_camino', label: 'En Camino / Tránsito' },
                      { value: 'recibido', label: 'Recibido en Bodega' },
                      { value: 'cancelado', label: 'Cancelado' },
                    ]}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    SOLICITA:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={solicitadoPor}
                    onChange={e => setSolicitadoPor(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    ENCARGADO COMPRA:
                  </label>
                  <WjgSelect
                    value={encargadoCompra}
                    onChange={(val) => setEncargadoCompra(val as IntegranteEquipo)}
                    options={[
                      { value: 'Wendy', label: 'Wendy' },
                      { value: 'Germán', label: 'Germán' },
                      { value: 'Juan', label: 'Juan' },
                      { value: 'Todos', label: 'Los 3' },
                    ]}
                  />
                </div>
              </div>

              {/* Sección Logística y Rastreo */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(56, 189, 248, 0.22)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={15} />
                  <span>Gestión de Compra & Rastreo de Envío</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                      TIPO COMPRA:
                    </label>
                    <WjgSelect
                      compact
                      value={tipoCompra}
                      onChange={val => setTipoCompra(val as TipoCompraInsumo)}
                      options={[
                        { value: 'internet', label: '🌐 Por Internet' },
                        { value: 'local', label: '🏪 Tienda Local' },
                      ]}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                      TIENDA / PLATAFORMA:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="MercadoLibre, Amazon, Proveedor..."
                      value={plataformaTienda}
                      onChange={e => setPlataformaTienda(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                      N° PEDIDO / ORDEN:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: ML-20491"
                      value={numeroPedido}
                      onChange={e => setNumeroPedido(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                      TRANSPORTADORA:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Coordinadora, Servientrega..."
                      value={transportadora}
                      onChange={e => setTransportadora(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                      N° GUÍA DE RASTREO:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: 7001928312"
                      value={numeroGuia}
                      onChange={e => setNumeroGuia(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                      LLEGADA ESTIMADA:
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={fechaEstimadaLlegada}
                      onChange={e => setFechaEstimadaLlegada(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                      ENLACE DE COMPRA / TIENDA:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="https://mercadolibre.com/..."
                      value={enlaceCompra}
                      onChange={e => setEnlaceCompra(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                      ENLACE DIRECTO DE RASTREO:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="https://rastreo..."
                      value={enlaceRastreo}
                      onChange={e => setEnlaceRastreo(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                      COSTO ESTIMADO ($ COP):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-input"
                      placeholder="0"
                      value={costoEstimado === 0 ? '' : costoEstimado}
                      onChange={e => setCostoEstimado(e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                      COSTO REAL PAGADO ($ COP):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-input"
                      placeholder="0"
                      value={costoReal === 0 ? '' : costoReal}
                      onChange={e => setCostoReal(e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  NOTAS / DETALLES ADICIONALES:
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Marca preferida, color, especificaciones de bodega..."
                  value={notasInsumo}
                  onChange={e => setNotasInsumo(e.target.value)}
                />
              </div>

              {/* Opción de Reabastecimiento Automático al marcar Recibido */}
              {estadoOrden === 'recibido' && (
                editingSolicitud?.stock_reabastecido ? (
                  <div style={{ padding: '9px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.78rem', fontWeight: 700 }}>
                    ✓ Esta orden ya sumó inventario a bodega anteriormente (protegida contra duplicación).
                  </div>
                ) : (
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#34d399', fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={sumarAlInventarioOnSave}
                        onChange={e => setSumarAlInventarioOnSave(e.target.checked)}
                        style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                      />
                      <span>📦 Sumar automáticamente esta cantidad al stock de bodega al guardar</span>
                    </label>
                  </div>
                )
              )}

              {!editingSolicitud && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '8px',
                    padding: '8px 10px'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', color: '#f87171', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={enviarSOSATodos}
                      onChange={e => setEnviarSOSATodos(e.target.checked)}
                      style={{ accentColor: '#ef4444', width: '16px', height: '16px' }}
                    />
                    <span>🚀 Enviar alerta S.O.S a los 3 números (Germán, Juan y Wendy)</span>
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModalSOS(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                  {editingSolicitud ? <Check size={14} /> : <Send size={14} />}
                  <span>{editingSolicitud ? 'Guardar Gestión' : 'Crear Orden y Notificar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOTIFICAR TAREA (WHATSAPP + CORREO + GRUPO) */}
      <ModalEnviarTareaWhatsApp
        isOpen={Boolean(tareaParaWhatsApp)}
        tarea={tareaParaWhatsApp}
        usuarios={usuarios}
        config={config}
        onClose={() => setTareaParaWhatsApp(null)}
      />

      {/* MODAL NOTIFICAR SEGUIMIENTO S.O.S INSUMO */}
      {sosParaNotificar && (() => {
        const builtSos = buildSOSInsumoMessage(sosParaNotificar, 'seguimiento');
        return (
          <WjgMessageDispatcherModal
            isOpen={true}
            onClose={() => setSosParaNotificar(null)}
            title={`Notificar Orden S.O.S: ${sosParaNotificar.insumo_nombre}`}
            subtitle={`Encargado: ${sosParaNotificar.encargado_compra} • Cant: ${sosParaNotificar.cantidad} ${sosParaNotificar.unidad}`}
            context="sos_insumo"
            defaultGroupChannel="insumos"
            defaultTargetMode={sosParaNotificar.encargado_compra === 'Todos' ? 'grupo' : 'individual'}
            defaultAssigneeName={sosParaNotificar.encargado_compra}
            initialWhatsAppText={builtSos.whatsappText}
            initialEmailSubject={builtSos.emailSubject}
            emailType={builtSos.emailType}
            emailData={builtSos.emailData}
            trackingUrl={builtSos.trackingUrl}
            entidadTipo="solicitud_insumo"
            entidadId={sosParaNotificar.id}
            usuarios={usuarios}
            config={config}
          />
        );
      })()}

      {/* MODAL EDITAR TAREA */}
      <WjgModal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        title="Editar Tarea del Equipo"
        subtitle={editingTask ? `ID: ${editingTask.id}` : undefined}
        maxWidth="520px"
      >
        <form onSubmit={handleSaveEditarTarea} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <WjgTextInput
            label="Título de la tarea"
            value={editTitulo}
            onChange={setEditTitulo}
            required
          />
          <WjgTextArea
            label="Detalles o notas"
            value={editDesc}
            onChange={setEditDesc}
            rows={3}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Responsable</label>
              <WjgSelect
                value={editAsignado}
                onChange={val => setEditAsignado(val as IntegranteEquipo)}
                options={INTEGRANTES.map(i => ({ value: i, label: i }))}
              />
            </div>
            <div>
              <label className="form-label">Prioridad</label>
              <WjgSelect
                value={editPrioridad}
                onChange={val => setEditPrioridad(val as any)}
                options={[
                  { value: 'baja', label: 'Baja' },
                  { value: 'media', label: 'Media' },
                  { value: 'alta', label: 'Alta' },
                  { value: 'urgente', label: '🔥 Urgente' }
                ]}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Tipo</label>
              <WjgSelect
                value={editTipo}
                onChange={val => setEditTipo(val as any)}
                options={[
                  { value: 'puntual', label: 'Puntual' },
                  { value: 'periodica', label: 'Rutina Periódica' }
                ]}
              />
            </div>
            <div>
              <label className="form-label">Fecha límite</label>
              <input
                type="date"
                className="form-input"
                value={editFechaLimite}
                onChange={e => setEditFechaLimite(e.target.value)}
              />
            </div>
          </div>
          {editTipo === 'periodica' && (
            <div>
              <label className="form-label">Frecuencia</label>
              <WjgSelect
                value={editFrecuencia}
                onChange={val => setEditFrecuencia(val as any)}
                options={[
                  { value: 'diaria', label: 'Diaria' },
                  { value: 'semanal', label: 'Semanal' },
                  { value: 'quincenal', label: 'Quincenal' },
                  { value: 'mensual', label: 'Mensual' }
                ]}
              />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <WjgButton variant="secondary" size="sm" onClick={() => setEditingTask(null)}>
              Cancelar
            </WjgButton>
            <WjgButton type="submit" variant="save" size="sm">
              Guardar Cambios
            </WjgButton>
          </div>
        </form>
      </WjgModal>

      {/* CONFIRMACIÓN DE RE-NOTIFICACIÓN AL EDITAR TAREA */}
      <WjgConfirmModal
        isOpen={Boolean(taskToAskRenotify)}
        onClose={() => setTaskToAskRenotify(null)}
        onConfirm={async () => {
          if (taskToAskRenotify) {
            await notificarTareaEnSegundoPlano(taskToAskRenotify, 'actualizada');
          }
        }}
        title="¿Re-notificar cambios de la tarea?"
        message={
          taskToAskRenotify
            ? `Los cambios en "${taskToAskRenotify.titulo}" ya se guardaron.\n\n¿Deseas notificar la actualización inmediatamente por WhatsApp y Correo a ${taskToAskRenotify.asignado_a === 'Todos' ? 'el Grupo de WhatsApp y todo el equipo' : taskToAskRenotify.asignado_a}?`
            : ''
        }
        confirmText="Sí, Re-notificar Ahora"
        cancelText="No, Solo Guardar"
        variant="primary"
      />

      {/* CONFIRMACIÓN SEGURA AL ELIMINAR TAREA */}
      <WjgConfirmModal
        isOpen={Boolean(deleteTaskTarget)}
        onClose={() => setDeleteTaskTarget(null)}
        onConfirm={() => {
          if (deleteTaskTarget) {
            onEliminarTarea(deleteTaskTarget.id);
            toast.info(`Tarea "${deleteTaskTarget.titulo}" eliminada.`);
          }
        }}
        title="Eliminar Tarea"
        message={deleteTaskTarget ? `¿Eliminar definitivamente la tarea "${deleteTaskTarget.titulo}"?` : ''}
        confirmText="Eliminar Tarea"
        variant="danger"
      />

      {/* MODAL DE BITÁCORA Y AVANCES DE TAREA */}
      <BitacoraTareaModal
        isOpen={showBitacoraModal}
        onClose={() => {
          setShowBitacoraModal(false);
          setTareaParaBitacora(null);
        }}
        tarea={tareaParaBitacora}
        activeOperator={activeOperator}
        currentUser={currentUser}
        usuarios={usuarios}
        config={config}
        onAvanceGuardado={(tareaActualizada) => {
          onActualizarTarea(tareaActualizada);
          setTareaParaBitacora(tareaActualizada);
          refreshConteos();
        }}
      />

      <WjgConfirmModal
        isOpen={Boolean(deleteSolTarget)}
        onClose={() => setDeleteSolTarget(null)}
        onConfirm={executeEliminarOrden}
        title="Eliminar Orden de Insumo"
        message={
          deleteSolTarget
            ? `¿Eliminar definitivamente la orden de "${deleteSolTarget.insumo_nombre}"?${
                deleteSolTarget.stock_reabastecido
                  ? '\n\n⚠️ Nota: Esta orden ya sumó inventario previamente en bodega. El stock físico actual NO se revertirá al borrar el historial.'
                  : ''
              }`
            : ''
        }
        confirmText="Eliminar Orden"
        variant="danger"
      />
    </div>
  );
};
