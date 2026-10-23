import { useState, useMemo, useEffect, FormEvent } from 'react';
import confetti from 'canvas-confetti';
import { 
  Cliente, 
  PiezaCotizada, 
  Cotizacion, 
  MaquinaInvolucrada, 
  EnlaceReferenciaCompra, 
  EstadoPago 
} from '../../../types';
import { CotizacionBuilderProps } from '../types/cotizador.types';
import { 
  calcularTotalesCotizacion, 
  validarRegla50Anticipo, 
  generarNumeroCotSugerido, 
  limpiarNotasObservaciones 
} from '../utils/pricingCalculator';
import { generarPDFCotizacion, compartirPDFWhatsApp } from '../../../services/pdfService';
import { generateCotizacionWhatsAppUrl, openWhatsApp } from '../../../services/whatsappService';
import { processAndOptimizeImage } from '../../../services/imageService';
import { detect3DPlatform, formatExternalUrl } from '../../../services/platformUtils';
import { toast } from '../../../components/ui/ToastProvider';
import { EmailNotificationService } from '../../../services/emailNotificationService';

export function useCotizadorBuilder({
  items,
  clientes,
  config,
  cotizaciones = [],
  cotizacionEnEdicion,
  resinas = [],
  maquinas = [],
  onCancelarEdicion,
  onRemoveItem,
  onUpdatePiece,
  onUpdatePieceQuantity,
  onUpdatePieceImage,
  onSaveCotizacion,
  onAddCliente,
  onLoadPieceToCalculator
}: CotizacionBuilderProps) {
  const [clienteId, setClienteId] = useState<string>(() => {
    return cotizacionEnEdicion?.cliente?.id || clientes[0]?.id || '';
  });
  const [vendedorNombre, setVendedorNombre] = useState<string>('Wendy');
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(0);
  const [notas, setNotas] = useState<string>('No incluye transporte fuera del perímetro urbano.');
  const [showNewClientModal, setShowNewClientModal] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Modal para editar pieza/ítem individual con todos sus parámetros
  const [piezaEditando, setPiezaEditando] = useState<PiezaCotizada | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCantidad, setEditCantidad] = useState(1);
  const [editPrecioUnitario, setEditPrecioUnitario] = useState(0);
  const [editAltoMm, setEditAltoMm] = useState(60);
  const [editAnchoMm, setEditAnchoMm] = useState(60);
  const [editProfundidadMm, setEditProfundidadMm] = useState(60);
  const [editResinaId, setEditResinaId] = useState('');
  const [editVaPintado, setEditVaPintado] = useState(false);
  const [editTieneEmpaque, setEditTieneEmpaque] = useState(false);
  const [editDatosPendientes, setEditDatosPendientes] = useState(false);
  const [editDescripcionTecnica, setEditDescripcionTecnica] = useState('');
  const [editMaquinasAdicionales, setEditMaquinasAdicionales] = useState<MaquinaInvolucrada[]>([]);
  const [editEnlacesCompra, setEditEnlacesCompra] = useState<EnlaceReferenciaCompra[]>([]);

  // Tipo de cotización
  const tieneItemsPendientes = useMemo(() => items.some(it => it.datos_pendientes), [items]);
  const [tipoEstado, setTipoEstado] = useState<'Enviada' | 'Parcial' | 'Borrador'>('Enviada');

  // Estado de Pago y Anticipos Iniciales
  const [estadoPagoInicial, setEstadoPagoInicial] = useState<EstadoPago>(() => {
    return cotizacionEnEdicion?.estado_pago || 'Pendiente';
  });
  const [abonoInicial, setAbonoInicial] = useState<number>(() => {
    return cotizacionEnEdicion?.abono || 0;
  });
  const [metodoPagoInicial, setMetodoPagoInicial] = useState<string>(() => {
    const mp = cotizacionEnEdicion?.metodo_pago;
    return (mp && mp !== 'Daviplata' && mp !== 'Bancolombia') ? mp : 'Bre-B';
  });
  const [comprobantePagoInicial, setComprobantePagoInicial] = useState<string>(() => {
    return cotizacionEnEdicion?.comprobante_pago || '';
  });

  // Precargar datos si viene una cotización en edición
  useEffect(() => {
    if (cotizacionEnEdicion) {
      if (cotizacionEnEdicion.cliente?.id) {
        setClienteId(cotizacionEnEdicion.cliente.id);
      }
      if (cotizacionEnEdicion.vendedor) {
        setVendedorNombre(cotizacionEnEdicion.vendedor);
      }
      setDescuentoPorcentaje(cotizacionEnEdicion.descuento_porcentaje || 0);
      setNotas(limpiarNotasObservaciones(cotizacionEnEdicion.notas || ''));
      if (cotizacionEnEdicion.estado) {
        setTipoEstado(cotizacionEnEdicion.estado as any);
      }
      setEstadoPagoInicial(cotizacionEnEdicion.estado_pago || 'Pendiente');
      setAbonoInicial(cotizacionEnEdicion.abono || 0);
      const mp = cotizacionEnEdicion.metodo_pago;
      setMetodoPagoInicial((mp && mp !== 'Daviplata' && mp !== 'Bancolombia') ? mp : 'Bre-B');
      setComprobantePagoInicial(cotizacionEnEdicion.comprobante_pago || '');
    }
  }, [cotizacionEnEdicion]);

  // Si hay piezas parciales, marcar automáticamente Parcial
  useEffect(() => {
    if (tieneItemsPendientes) {
      setTipoEstado('Parcial');
    }
  }, [tieneItemsPendientes]);

  // Cálculos puros y reactivos de totales
  const { subtotal, descuentoMonto, total } = useMemo(() => {
    return calcularTotalesCotizacion(items, descuentoPorcentaje);
  }, [items, descuentoPorcentaje]);

  // Regla del 50% de anticipo
  const { abonoEfectivo, saldoPendiente, cumpleMinimo50, porcentajeAbonado } = useMemo(() => {
    return validarRegla50Anticipo(total, abonoInicial, estadoPagoInicial);
  }, [total, abonoInicial, estadoPagoInicial]);

  // Cliente seleccionado
  const clienteSeleccionado = useMemo(() => {
    return clientes.find(c => c.id === clienteId) || clientes[0];
  }, [clientes, clienteId]);

  // Número consecutivo sugerido o fijado
  const numeroCotSugerido = useMemo(() => {
    return generarNumeroCotSugerido(cotizaciones);
  }, [cotizaciones]);

  const esEdicion = Boolean(cotizacionEnEdicion);
  const numeroCotFinal = cotizacionEnEdicion ? cotizacionEnEdicion.numero_cot : numeroCotSugerido;
  const cotizacionIdFinal = cotizacionEnEdicion ? cotizacionEnEdicion.id : `cot-${Date.now()}`;
  const cotizacionFechaFinal = cotizacionEnEdicion ? cotizacionEnEdicion.fecha : new Date().toISOString().slice(0, 10);

  // Handlers para edición de piezas
  const handleOpenEditPiece = (item: PiezaCotizada) => {
    setPiezaEditando(item);
    setEditNombre(item.nombre_item);
    setEditCantidad(item.cantidad);
    setEditPrecioUnitario(item.precio_unitario);
    setEditAltoMm(item.alto_mm || 0);
    setEditAnchoMm(item.ancho_mm || 0);
    setEditProfundidadMm(item.profundidad_mm || 0);
    setEditResinaId(item.resina_id || resinas[0]?.id || '');
    setEditVaPintado(Boolean(item.va_pintado));
    setEditTieneEmpaque(Boolean(item.tiene_empaque));
    setEditDatosPendientes(Boolean(item.datos_pendientes));
    setEditDescripcionTecnica(item.descripcion_tecnica || '');
    setEditEnlacesCompra(item.enlaces_compra ? item.enlaces_compra.map(e => ({ ...e })) : []);

    const extras = (item.maquinas_involucradas || [])
      .filter(m => m.proceso !== 'Impresión 3D' && m.proceso !== 'Lavado y Curado UV')
      .map(m => ({ ...m }));
    setEditMaquinasAdicionales(extras);
  };

  const handleCloseEditPiece = () => {
    setPiezaEditando(null);
  };

  const handleAddModalExtraProcess = () => {
    const defaultExtraMaq = maquinas.find(m => m.tipo !== 'Impresora 3D Resina') || maquinas[0];
    setEditMaquinasAdicionales(prev => [
      ...prev,
      {
        maquina_id: defaultExtraMaq?.id || 'maq-extra',
        maquina_nombre: defaultExtraMaq?.nombre || 'Máquina de Taller',
        tipo: defaultExtraMaq?.tipo || 'Extra',
        proceso: '',
        tiempo_min: 15,
        mostrar_en_cliente: false
      }
    ]);
  };

  const handleUpdateModalExtraProcess = (index: number, field: keyof MaquinaInvolucrada, value: any) => {
    setEditMaquinasAdicionales(prev => prev.map((m, i) => {
      if (i === index) {
        if (field === 'maquina_id') {
          const maq = maquinas.find(item => item.id === value);
          return {
            ...m,
            maquina_id: value,
            maquina_nombre: maq?.nombre || m.maquina_nombre,
            tipo: maq?.tipo || m.tipo
          };
        }
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  const handleRemoveModalExtraProcess = (index: number) => {
    setEditMaquinasAdicionales(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddModalEnlaceCompra = () => {
    setEditEnlacesCompra(prev => [
      ...prev,
      { id: `enl-${Date.now()}`, titulo: '', url: '', costo_estimado: 0 }
    ]);
  };

  const handleUpdateModalEnlaceCompra = (index: number, field: string, value: any) => {
    setEditEnlacesCompra(prev => prev.map((enl, i) => {
      if (i !== index) return enl;
      const updated = { ...enl, [field]: value };
      if (field === 'url' && value && (!updated.titulo || updated.titulo.trim() === '')) {
        const plat = detect3DPlatform(value);
        if (plat.name !== 'Web 3D') {
          updated.titulo = `${plat.name} - ${editNombre || 'Modelo 3D'}`;
        }
      }
      return updated;
    }));
  };

  const handleRemoveModalEnlaceCompra = (index: number) => {
    setEditEnlacesCompra(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveEditPieceSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!piezaEditando || !onUpdatePiece) return;

    const resinaElegida = resinas.find(r => r.id === editResinaId);
    const nuevaCant = Math.max(1, editCantidad);
    const nuevoUnit = Math.max(0, editPrecioUnitario);
    const nuevoTot = Math.ceil((nuevoUnit * nuevaCant) / 100) * 100;

    const baseProcesos = (piezaEditando.maquinas_involucradas || [])
      .filter(m => m.proceso === 'Impresión 3D' || m.proceso === 'Lavado y Curado UV');

    const nuevosProcesos: MaquinaInvolucrada[] = [
      ...baseProcesos,
      ...editMaquinasAdicionales.map(m => {
        const procLimpio = m.proceso.trim();
        const esVisible = Boolean(m.mostrar_en_cliente) && 
          procLimpio !== '' && 
          !procLimpio.toLowerCase().includes('proceso adicional') &&
          !procLimpio.toLowerCase().includes('proceso extra');

        return {
          ...m,
          proceso: procLimpio || m.maquina_nombre,
          tiempo_min: Number(m.tiempo_min) || 0,
          mostrar_en_cliente: esVisible
        };
      })
    ];

    const updatedPiece: PiezaCotizada = {
      ...piezaEditando,
      nombre_item: editNombre.trim() || piezaEditando.nombre_item,
      cantidad: nuevaCant,
      precio_unitario: nuevoUnit,
      precio_total: nuevoTot,
      alto_mm: Number(editAltoMm) || 0,
      ancho_mm: Number(editAnchoMm) || 0,
      profundidad_mm: Number(editProfundidadMm) || 0,
      datos_pendientes: editDatosPendientes,
      resina_id: editResinaId || piezaEditando.resina_id,
      resina_nombre: resinaElegida ? (resinaElegida.resumen || `${resinaElegida.marca} ${resinaElegida.tipo}`) : piezaEditando.resina_nombre,
      va_pintado: editVaPintado,
      tiene_empaque: editTieneEmpaque,
      descripcion_tecnica: editDescripcionTecnica,
      maquinas_involucradas: nuevosProcesos,
      enlaces_compra: editEnlacesCompra
        .filter(e => e.url.trim() || e.titulo.trim())
        .map(e => ({
          ...e,
          titulo: e.titulo.trim() || detect3DPlatform(e.url).name,
          url: formatExternalUrl(e.url)
        }))
    };

    onUpdatePiece(updatedPiece);
    setPiezaEditando(null);
    toast.success(`Ítem "${updatedPiece.nombre_item}" actualizado.`);
  };

  const handleItemImageUpload = async (itemId: string, file: File) => {
    if (!onUpdatePieceImage) return;
    if (!file.type.startsWith('image/')) {
      toast.warning('Por favor selecciona un archivo de imagen (PNG, JPG o WebP).');
      return;
    }
    try {
      const optimized = await processAndOptimizeImage(file, 800, 800, 0.85);
      onUpdatePieceImage(itemId, optimized);
      toast.success('Foto adjuntada al ítem exitosamente.');
    } catch (e) {
      console.error('Error optimizando foto del ítem:', e);
      toast.error('No se pudo procesar la imagen.');
    }
  };

  // Construcción del objeto final de Cotización
  const construirCotizacionFinal = (estadoOverride?: any): Cotizacion | null => {
    if (!clienteSeleccionado || items.length === 0) return null;

    return {
      id: cotizacionIdFinal,
      numero_cot: numeroCotFinal,
      cliente: clienteSeleccionado,
      vendedor: vendedorNombre,
      fecha: cotizacionFechaFinal,
      estado: estadoOverride || tipoEstado,
      items: [...items],
      subtotal,
      iva_porcentaje: 0,
      descuento_porcentaje: descuentoPorcentaje,
      total,
      tiempo_entrega_estimado: items[0]?.tiempo_entrega || '(3) Días hábiles',
      notas: limpiarNotasObservaciones(notas, tipoEstado === 'Parcial'),
      estado_pago: estadoPagoInicial,
      abono: abonoEfectivo,
      saldo_pendiente: saldoPendiente,
      metodo_pago: estadoPagoInicial === 'Pendiente' ? undefined : metodoPagoInicial,
      comprobante_pago: comprobantePagoInicial.trim() || undefined
    };
  };

  const handleFinalizar = (enviarWhatsApp: boolean = false) => {
    const cotizacionFinal = construirCotizacionFinal();
    if (!cotizacionFinal) {
      toast.warning('Agrega al menos una pieza y asigna un cliente antes de guardar.');
      return;
    }

    onSaveCotizacion(cotizacionFinal);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    if (enviarWhatsApp) {
      const url = generateCotizacionWhatsAppUrl(cotizacionFinal, config);
      openWhatsApp(url);
    }

    // Disparo dual por correo si el cliente tiene correo registrado
    if (cotizacionFinal.cliente?.correo) {
      EmailNotificationService.enviarCorreoCotizacion(cotizacionFinal);
    }
  };

  const handleDescargarPDF = () => {
    const cotTemp = construirCotizacionFinal(cotizacionEnEdicion ? cotizacionEnEdicion.estado : 'Borrador');
    if (!cotTemp) {
      toast.warning('Agrega al menos una pieza antes de generar el PDF.');
      return;
    }
    generarPDFCotizacion(cotTemp, config);
  };

  const handleCompartirPDF = () => {
    const cotizacionFinal = construirCotizacionFinal(cotizacionEnEdicion ? cotizacionEnEdicion.estado : 'Enviada');
    if (!cotizacionFinal) {
      toast.warning('Agrega al menos una pieza antes de compartir el PDF.');
      return;
    }

    onSaveCotizacion(cotizacionFinal);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    compartirPDFWhatsApp(cotizacionFinal, config);
  };

  const handleCrearNuevoCliente = (nuevo: Cliente) => {
    onAddCliente(nuevo);
    setClienteId(nuevo.id);
    setShowNewClientModal(false);
  };

  return {
    // Estado General
    clienteId,
    setClienteId,
    vendedorNombre,
    setVendedorNombre,
    descuentoPorcentaje,
    setDescuentoPorcentaje,
    notas,
    setNotas,
    tipoEstado,
    setTipoEstado,
    tieneItemsPendientes,
    clienteSeleccionado,
    esEdicion,
    numeroCotFinal,
    numeroCotSugerido,
    previewImage,
    setPreviewImage,
    showNewClientModal,
    setShowNewClientModal,

    // Totales y Regla del 50%
    subtotal,
    descuentoMonto,
    total,
    estadoPagoInicial,
    setEstadoPagoInicial,
    abonoInicial,
    setAbonoInicial,
    metodoPagoInicial,
    setMetodoPagoInicial,
    comprobantePagoInicial,
    setComprobantePagoInicial,
    abonoEfectivo,
    saldoPendiente,
    cumpleMinimo50,
    porcentajeAbonado,

    // Edición de Ítem Modal
    piezaEditando,
    handleOpenEditPiece,
    handleCloseEditPiece,
    editNombre,
    setEditNombre,
    editCantidad,
    setEditCantidad,
    editPrecioUnitario,
    setEditPrecioUnitario,
    editAltoMm,
    setEditAltoMm,
    editAnchoMm,
    setEditAnchoMm,
    editProfundidadMm,
    setEditProfundidadMm,
    editResinaId,
    setEditResinaId,
    editVaPintado,
    setEditVaPintado,
    editTieneEmpaque,
    setEditTieneEmpaque,
    editDatosPendientes,
    setEditDatosPendientes,
    editDescripcionTecnica,
    setEditDescripcionTecnica,
    editMaquinasAdicionales,
    handleAddModalExtraProcess,
    handleUpdateModalExtraProcess,
    handleRemoveModalExtraProcess,
    editEnlacesCompra,
    handleAddModalEnlaceCompra,
    handleUpdateModalEnlaceCompra,
    handleRemoveModalEnlaceCompra,
    handleSaveEditPieceSubmit,

    // Acciones sobre Items y Cotización
    handleItemImageUpload,
    handleFinalizar,
    handleDescargarPDF,
    handleCompartirPDF,
    handleCrearNuevoCliente
  };
}
