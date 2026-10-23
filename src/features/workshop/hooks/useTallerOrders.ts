import { useState, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  OrdenTrabajo, 
  EstadoOT, 
  EstadoSTL, 
  Cotizacion, 
  EstadoCotizacion, 
  DatosPagoRegistro 
} from '../../../types';
import { toast } from '../../../components/ui/ToastProvider';
import { formatWhatsAppPhone, openWhatsApp } from '../../../services/whatsappService';
import { processAndOptimizeImage } from '../../../services/imageService';
import { StorageService } from '../../../services/storageService';
import { detect3DPlatform, formatExternalUrl } from '../../../services/platformUtils';
import { CloudSyncService } from '../../../services/cloudSyncService';
import { EmailNotificationService } from '../../../services/emailNotificationService';
import { WorkOrdersPipelineProps, ModalLinkItem } from '../types/workshop.types';
import { 
  ETAPAS, 
  getSiguienteEstado,
  getHandoffConfig, 
  buildClienteNotificationMessage, 
  resolveLinksDeOT 
} from '../utils/workshopUtils';

export function useTallerOrders({
  ordenes,
  config,
  cotizaciones = [],
  tarifasTamanos = [],
  clientes = [],
  onUpdateEstado,
  onGenerarCuentaCobro,
  onCrearOrdenRapida,
  onActualizarOT,
  onEliminarOT,
  onNavigateToCotizaciones
}: WorkOrdersPipelineProps) {
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [vistaModo, setVistaModo] = useState<'lista' | 'kanban'>('lista');
  const [copiedOtId, setCopiedOtId] = useState<string | null>(null);
  const [notifEliminacion, setNotifEliminacion] = useState<string | null>(null);

  // Modal Transición de Estado y Pase de Turno
  const [otParaTransicion, setOtParaTransicion] = useState<OrdenTrabajo | null>(null);
  const [configHandoffTransicion, setConfigHandoffTransicion] = useState<any>(null);
  const [siguienteEstadoTransicion, setSiguienteEstadoTransicion] = useState<EstadoOT | null>(null);

  // Modal Proyecto Rápido (Tarifario Express)
  const [showModalRapido, setShowModalRapido] = useState(false);
  const [fotoUrlRapida, setFotoUrlRapida] = useState('');
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [nombreItemRapido, setNombreItemRapido] = useState('');
  const [clienteNombreRapido, setClienteNombreRapido] = useState('');
  const [clienteTelefonoRapido, setClienteTelefonoRapido] = useState('');
  const [alturaSeleccionada, setAlturaSeleccionada] = useState<number>(8);
  const [crearCobroPOS, setCrearCobroPOS] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal Edición / Trazabilidad STL
  const [otParaSTL, setOtParaSTL] = useState<OrdenTrabajo | null>(null);
  const [inputStlUrl, setInputStlUrl] = useState('');
  const [inputStlVersion, setInputStlVersion] = useState('v1.0');
  const [inputStlEstado, setInputStlEstado] = useState<EstadoSTL>('Diseñado por Germán');

  // Modal Detalle de Cotización Vinculada
  const [selectedCotizacionForModal, setSelectedCotizacionForModal] = useState<Cotizacion | null>(null);

  // Modal Enlaces Web / Compra del Modelo 3D
  const [otParaEditarLinks, setOtParaEditarLinks] = useState<OrdenTrabajo | null>(null);
  const [modalLinksList, setModalLinksList] = useState<ModalLinkItem[]>([]);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Modal Pago
  const [otParaPago, setOtParaPago] = useState<OrdenTrabajo | null>(null);

  // Modal Eliminación
  const [otParaEliminar, setOtParaEliminar] = useState<OrdenTrabajo | null>(null);

  // Acciones y Handlers
  const handleConfirmarEliminarOT = (
    otId: string, 
    motivo: string, 
    revertirCotizacion?: boolean, 
    nuevoEstadoCot?: EstadoCotizacion
  ) => {
    if (onEliminarOT) {
      const otBorrada = ordenes.find(o => o.id === otId);
      onEliminarOT(otId, motivo, revertirCotizacion, nuevoEstadoCot);
      setNotifEliminacion(`✅ Orden ${otBorrada?.numero_ot || ''} eliminada correctamente.`);
      setTimeout(() => setNotifEliminacion(null), 4500);
    }
    setOtParaEliminar(null);
  };

  const handleConfirmarPagoOT = (datos: DatosPagoRegistro) => {
    if (!otParaPago || !onActualizarOT) return;
    const isTotalmentePagado = datos.saldo_pendiente <= 0;
    const nuevoEstado = (isTotalmentePagado && (otParaPago.estado === 'Control de Calidad' || otParaPago.estado === 'Pintura y Armado' || otParaPago.estado === 'Listo para Entrega'))
      ? 'Listo para Entrega'
      : otParaPago.estado;

    const updatedOT: OrdenTrabajo = {
      ...otParaPago,
      estado_pago: datos.estado_pago,
      abono: datos.abono,
      saldo_pendiente: datos.saldo_pendiente,
      metodo_pago: datos.metodo_pago,
      comprobante_pago: datos.comprobante_pago,
      estado: nuevoEstado
    };
    onActualizarOT(updatedOT);

    // Asentar en Ledger Inmutable Core V3 (abonos_pagos) de manera asíncrona sin bloquear el render
    const delta = Math.max(0, datos.abono - (otParaPago.abono || 0));
    if (delta > 0) {
      CloudSyncService.savePayment({
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        monto: delta,
        metodo_pago: datos.metodo_pago || 'Bre-B',
        comprobante_url: datos.comprobante_pago,
        cotizacion_id: otParaPago.cotizacion_id,
        orden_trabajo_id: otParaPago.id,
        pos_venta_id: otParaPago.pos_venta_id,
        origen_modulo: 'taller',
        nota: `Abono de $${delta.toLocaleString('es-CO')} registrado en taller para OT ${otParaPago.numero_ot}`
      });

      // Disparo de correo de recibo si el cliente tiene correo registrado
      const clienteMatch = clientes.find(c => c.nombre.toLowerCase().trim() === otParaPago.cliente_nombre.toLowerCase().trim());
      if (clienteMatch?.correo) {
        EmailNotificationService.enviarCorreoAbono(
          clienteMatch,
          otParaPago.numero_ot,
          delta,
          datos.saldo_pendiente,
          Number(otParaPago.precio_cobrado || (otParaPago.abono || 0) + (otParaPago.saldo_pendiente || 0)),
          datos.metodo_pago
        );
      }
    }

    // Si la orden quedó 100% liquidada y en Listo para Entrega, notificar por correo
    if (isTotalmentePagado && nuevoEstado === 'Listo para Entrega') {
      const clienteMatch = clientes.find(c => c.nombre.toLowerCase().trim() === otParaPago.cliente_nombre.toLowerCase().trim());
      if (clienteMatch?.correo) {
        EmailNotificationService.enviarCorreoPiezaTerminada(updatedOT, clienteMatch.correo);
      }
    }

    setOtParaPago(null);
  };

  const handleCopyTrackingLink = (ot: OrdenTrabajo) => {
    const trackingUrl = `${window.location.origin}/?portal=cliente&ot=${encodeURIComponent(ot.numero_ot)}`;
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setCopiedOtId(ot.id);
      setTimeout(() => setCopiedOtId(null), 2500);
    });
  };

  const handleNotificarCliente = (ot: OrdenTrabajo) => {
    const phone = formatWhatsAppPhone(ot.cliente_telefono);
    const trackingUrl = `${window.location.origin}/?portal=cliente&ot=${encodeURIComponent(ot.numero_ot)}`;
    const mensaje = buildClienteNotificationMessage(ot, trackingUrl);

    // 1. Encolar en backend para despacho oficial desde la línea central (+57 320 2796115)
    CloudSyncService.enqueueNotification({
      orden_trabajo_id: ot.id,
      destinatario_nombre: ot.cliente_nombre,
      destinatario_telefono: phone,
      rol_destinatario: 'CLIENTE',
      mensaje_plano: mensaje
    });

    // 2. Disparo dual de contingencia por correo si tiene email
    const clienteMatch = clientes.find(c => c.nombre.toLowerCase().trim() === ot.cliente_nombre.toLowerCase().trim());
    if (clienteMatch?.correo) {
      if (ot.estado === 'Listo para Entrega' || (ot.estado as string) === 'Entregado') {
        EmailNotificationService.enviarCorreoPiezaTerminada(ot, clienteMatch.correo, trackingUrl);
      }
    }

    // 3. Abrir ventana de WhatsApp opcional
    openWhatsApp(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`);
  };

  const handleHandoffPorRol = (ot: OrdenTrabajo) => {
    const configHandoff = getHandoffConfig(ot, config);
    if (!configHandoff.telefono) {
      toast.warning('No hay un teléfono registrado para este destinatario.');
      return;
    }

    // Encolar en backend para despacho desde la línea central (+57 320 2796115) hacia el colaborador
    const rolEnum = configHandoff.nombre.includes('Juan') 
      ? 'JUAN_TALLER' 
      : configHandoff.nombre.includes('Wendy') 
      ? 'WENDY_PINTURA' 
      : 'TRIPARTITO';

    CloudSyncService.enqueueNotification({
      orden_trabajo_id: ot.id,
      destinatario_nombre: configHandoff.nombre,
      destinatario_telefono: configHandoff.telefono,
      rol_destinatario: rolEnum,
      mensaje_plano: configHandoff.mensaje
    });

    openWhatsApp(`https://wa.me/${configHandoff.telefono}?text=${encodeURIComponent(configHandoff.mensaje)}`);
    toast.success(`Aviso oficial preparado para ${configHandoff.nombre}`);
  };

  const handleAbrirTransicionModal = (ot: OrdenTrabajo) => {
    const sig = getSiguienteEstado(ot.estado);
    const cfg = getHandoffConfig(ot, config);
    setOtParaTransicion(ot);
    setSiguienteEstadoTransicion(sig);
    setConfigHandoffTransicion(cfg);
  };

  const handleCerrarTransicionModal = () => {
    setOtParaTransicion(null);
    setSiguienteEstadoTransicion(null);
    setConfigHandoffTransicion(null);
  };

  const handleConfirmarTransicionModal = (enviarWhatsApp: boolean) => {
    if (!otParaTransicion || !siguienteEstadoTransicion) return;

    onUpdateEstado(otParaTransicion.id, siguienteEstadoTransicion);
    toast.success(`OT #${otParaTransicion.numero_ot} avanzada a "${siguienteEstadoTransicion}".`);

    if (enviarWhatsApp && configHandoffTransicion?.telefono) {
      openWhatsApp(`https://wa.me/${configHandoffTransicion.telefono}?text=${encodeURIComponent(configHandoffTransicion.mensaje)}`);
    }

    handleCerrarTransicionModal();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImg(true);
      const opt = await processAndOptimizeImage(file, 800, 800, 0.82);
      setFotoUrlRapida(opt);
    } catch (err) {
      console.error('Error optimizando foto proyecto rápido:', err);
      toast.error('Error al procesar la foto.');
    } finally {
      setIsProcessingImg(false);
    }
  };

  const handleGuardarProyectoRapido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreItemRapido.trim()) {
      toast.warning('Ingresa el nombre de la figura o proyecto.');
      return;
    }
    if (!clienteNombreRapido.trim()) {
      toast.warning('Ingresa el nombre del cliente.');
      return;
    }

    const tarifaEncontrada = tarifasTamanos.find(t => t.altura_cm === alturaSeleccionada);
    const precioCalculado = tarifaEncontrada 
      ? tarifaEncontrada.precio_sugerido 
      : (alturaSeleccionada * 10000);

    const siguienteNum = StorageService.getNextOTNumber(ordenes);

    const nuevaOT: OrdenTrabajo = {
      id: `ot-${Date.now()}`,
      numero_ot: siguienteNum,
      cotizacion_id: `COT-RAPIDA-${Date.now()}`,
      cotizacion_numero: `RAPIDA-${alturaSeleccionada}CM`,
      cliente_nombre: clienteNombreRapido.trim(),
      cliente_telefono: clienteTelefonoRapido.trim() || '3202796115',
      item_nombre: nombreItemRapido.trim(),
      cantidad: 1,
      estado: 'En Cola',
      operador_asignado: 'Juan (Taller)',
      fecha_creacion: new Date().toISOString(),
      tiempo_impresion_min: Math.round(alturaSeleccionada * 18),
      tiempo_armado_min: 15,
      tiempo_pintura_min: 30,
      resina_nombre: 'Anycubic Standard Grey',
      maquina_nombre: 'Anycubic MONO 4',
      va_pintado: true,
      tiene_empaque: true,
      detalles_tecnicos: `Proyecto Rápido desde Tarifario (${alturaSeleccionada} cm). Precio base fijado: $${precioCalculado.toLocaleString('es-CO')} COP.`,
      imagen_url: fotoUrlRapida || undefined,
      altura_cm_tarifario: alturaSeleccionada,
      precio_cobrado: precioCalculado,
      es_proyecto_rapido: true,
      stl_estado: 'Modelado Pendiente',
      stl_modelador: 'Germán',
      stl_operador: 'Juan'
    };

    if (onCrearOrdenRapida) {
      onCrearOrdenRapida(nuevaOT, crearCobroPOS);
    }

    confetti({ particleCount: 70, spread: 60 });
    setShowModalRapido(false);

    // Reset Form
    setFotoUrlRapida('');
    setNombreItemRapido('');
    setClienteNombreRapido('');
    setClienteTelefonoRapido('');
    setAlturaSeleccionada(8);
  };

  const handleOpenModalSTL = (ot: OrdenTrabajo) => {
    setOtParaSTL(ot);
    setInputStlUrl(ot.stl_url || '');
    setInputStlVersion(ot.stl_version || 'v1.0');
    setInputStlEstado(ot.stl_estado || 'Diseñado por Germán');
  };

  const handleGuardarSTL = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otParaSTL || !onActualizarOT) return;

    const updated: OrdenTrabajo = {
      ...otParaSTL,
      stl_url: inputStlUrl.trim() || undefined,
      stl_version: inputStlVersion.trim(),
      stl_estado: inputStlEstado
    };

    onActualizarOT(updated);
    setOtParaSTL(null);
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(formatExternalUrl(url)).then(() => {
      setCopiedLinkId(id);
      setTimeout(() => setCopiedLinkId(null), 2500);
    });
  };

  const handleOpenCotizacionModal = (ot: OrdenTrabajo) => {
    const parentCot = cotizaciones.find(c => 
      (ot.cotizacion_id && c.id === ot.cotizacion_id) || 
      (ot.cotizacion_numero && c.numero_cot === ot.cotizacion_numero)
    );
    if (parentCot) {
      setSelectedCotizacionForModal(parentCot);
    } else {
      setSelectedCotizacionForModal({
        id: ot.cotizacion_id || 'cot-ot',
        numero_cot: ot.cotizacion_numero || 'Sin número',
        cliente: {
          id: 'cli',
          codigo: 0,
          nombre: ot.cliente_nombre,
          telefono: ot.cliente_telefono,
          nit_cc: '',
          correo: ''
        },
        vendedor: 'Taller',
        fecha: ot.fecha_creacion?.slice(0, 10) || '',
        estado: 'Aceptada',
        items: [{
          id: 'it-1',
          nombre_item: ot.item_nombre,
          cantidad: ot.cantidad,
          alto_mm: 0,
          ancho_mm: 0,
          profundidad_mm: 0,
          volumen_cm3: 0,
          peso_estimado_g: ot.peso_estimado_g || 0,
          resina_id: ot.resina_id || '',
          resina_nombre: ot.resina_nombre,
          maquina_id: 'maq-1',
          maquina_nombre: ot.maquina_nombre,
          tiempo_impresion_min: ot.tiempo_impresion_min || 0,
          tiempo_desarrollo_min: 0,
          tiempo_armado_min: ot.tiempo_armado_min || 0,
          tiempo_pintura_min: ot.tiempo_pintura_min || 0,
          costo_energia: 0,
          costo_resina: 0,
          costo_curado: 0,
          costo_insumos: 0,
          costo_mano_obra: 0,
          costo_modelo_comprado: 0,
          costo_base_produccion: 0,
          margen_ganancia: 0.4,
          precio_unitario: ot.precio_cobrado || 0,
          precio_total: (ot.precio_cobrado || 0) * (ot.cantidad || 1),
          tiempo_entrega: '',
          descripcion_tecnica: ot.detalles_tecnicos || '',
          enlaces_compra: ot.enlaces_compra,
          imagen_url: ot.imagen_url,
          va_pintado: ot.va_pintado,
          tiene_empaque: ot.tiene_empaque
        }],
        subtotal: (ot.precio_cobrado || 0) * (ot.cantidad || 1),
        iva_porcentaje: 0,
        descuento_porcentaje: 0,
        total: (ot.precio_cobrado || 0) * (ot.cantidad || 1),
        tiempo_entrega_estimado: 'N/A',
        notas: ot.observaciones || ot.detalles_tecnicos || ''
      });
    }
  };

  const handleOpenLinksModal = (ot: OrdenTrabajo) => {
    setOtParaEditarLinks(ot);
    const existing = resolveLinksDeOT(ot, cotizaciones);
    setModalLinksList(existing.length > 0 ? existing.map(e => ({ ...e })) : [
      { id: `link-${Date.now()}`, titulo: '', url: '', costo_estimado: 0 }
    ]);
  };

  const handleAddModalLink = () => {
    setModalLinksList(prev => [
      ...prev,
      { id: `link-${Date.now()}`, titulo: '', url: '', costo_estimado: 0 }
    ]);
  };

  const handleUpdateModalLink = (index: number, field: string, value: any) => {
    setModalLinksList(prev => prev.map((l, i) => {
      if (i !== index) return l;
      const updated = { ...l, [field]: value };
      if (field === 'url' && value && (!updated.titulo || updated.titulo.trim() === '')) {
        const plat = detect3DPlatform(value);
        if (plat.name !== 'Web 3D') {
          updated.titulo = `${plat.name} - ${otParaEditarLinks?.item_nombre || 'Modelo'}`;
        }
      }
      return updated;
    }));
  };

  const handleRemoveModalLink = (index: number) => {
    setModalLinksList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveLinksModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otParaEditarLinks || !onActualizarOT) return;

    const cleanLinks = modalLinksList
      .filter(l => l.url.trim() || l.titulo.trim())
      .map(l => ({
        id: l.id || `enl-${Date.now()}`,
        titulo: l.titulo.trim() || detect3DPlatform(l.url).name,
        url: formatExternalUrl(l.url),
        costo_estimado: Number(l.costo_estimado) || undefined
      }));

    const updatedOT: OrdenTrabajo = {
      ...otParaEditarLinks,
      enlaces_compra: cleanLinks
    };

    onActualizarOT(updatedOT);
    setOtParaEditarLinks(null);
  };

  // Computaciones reactivas memorizadas
  const conSaldoCount = useMemo(() => {
    return ordenes.filter(o => 
      o.estado_pago !== 'Pagado Total' && 
      ((o.saldo_pendiente ?? Math.max(0, (o.precio_cobrado || 0) - (o.abono || 0))) > 0)
    ).length;
  }, [ordenes]);

  const ordenesFiltradas = useMemo(() => {
    if (filtroEstado === 'todos') return ordenes;
    if (filtroEstado === 'con_saldo') {
      return ordenes.filter(o => 
        o.estado_pago !== 'Pagado Total' && 
        ((o.saldo_pendiente ?? Math.max(0, (o.precio_cobrado || 0) - (o.abono || 0))) > 0)
      );
    }
    return ordenes.filter(o => o.estado === filtroEstado);
  }, [ordenes, filtroEstado]);

  const proyectosRapidosCount = useMemo(() => {
    return ordenes.filter(o => o.es_proyecto_rapido).length;
  }, [ordenes]);

  return {
    filtroEstado,
    setFiltroEstado,
    vistaModo,
    setVistaModo,
    copiedOtId,
    notifEliminacion,
    otParaTransicion,
    configHandoffTransicion,
    siguienteEstadoTransicion,
    handleAbrirTransicionModal,
    handleConfirmarTransicionModal,
    handleCerrarTransicionModal,
    showModalRapido,
    setShowModalRapido,
    fotoUrlRapida,
    setFotoUrlRapida,
    isProcessingImg,
    nombreItemRapido,
    setNombreItemRapido,
    clienteNombreRapido,
    setClienteNombreRapido,
    clienteTelefonoRapido,
    setClienteTelefonoRapido,
    alturaSeleccionada,
    setAlturaSeleccionada,
    crearCobroPOS,
    setCrearCobroPOS,
    fileInputRef,
    otParaSTL,
    setOtParaSTL,
    inputStlUrl,
    setInputStlUrl,
    inputStlVersion,
    setInputStlVersion,
    inputStlEstado,
    setInputStlEstado,
    selectedCotizacionForModal,
    setSelectedCotizacionForModal,
    otParaEditarLinks,
    setOtParaEditarLinks,
    modalLinksList,
    copiedLinkId,
    otParaPago,
    setOtParaPago,
    otParaEliminar,
    setOtParaEliminar,
    conSaldoCount,
    ordenesFiltradas,
    proyectosRapidosCount,
    handleConfirmarEliminarOT,
    handleConfirmarPagoOT,
    handleCopyTrackingLink,
    handleNotificarCliente,
    handleHandoffPorRol,
    handleImageUpload,
    handleGuardarProyectoRapido,
    handleOpenModalSTL,
    handleGuardarSTL,
    handleCopyLink,
    handleOpenCotizacionModal,
    handleOpenLinksModal,
    handleAddModalLink,
    handleUpdateModalLink,
    handleRemoveModalLink,
    handleSaveLinksModal
  };
}
