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
import { calcularFechaEstimada, calcularDiasHabilesEntre, formatearTiempoEntrega } from '../../../utils/businessDays';
import { calcularPieza3D, ParametrosPiezaInput } from '../../../services/calculationEngine';
import { generarPDFCotizacion, compartirPDFWhatsApp, obtenerBlobURLCotizacion } from '../../../services/pdfService';
import { generateCotizacionWhatsAppUrl, generateCotizacionWhatsAppText, openWhatsApp } from '../../../services/whatsappService';
import { processAndOptimizeImage } from '../../../services/imageService';
import { detect3DPlatform, formatExternalUrl } from '../../../services/platformUtils';
import { toast } from '../../../components/ui/ToastProvider';
import { EmailNotificationService } from '../../../services/emailNotificationService';
import { StorageService } from '../../../services/storageService';

export function useCotizadorBuilder({
  items,
  clientes,
  config,
  cotizaciones = [],
  cotizacionEnEdicion,
  resinas = [],
  maquinas = [],
  insumos = [],
  personal = [],
  onCancelarEdicion,
  onRemoveItem,
  onUpdatePiece,
  onUpdatePieceQuantity,
  onUpdatePieceImage,
  onSaveCotizacion,
  onAddCliente,
  onLoadPieceToCalculator
}: CotizacionBuilderProps) {
  const draftMeta = useMemo(() => (!cotizacionEnEdicion ? StorageService.getDraftBuilderMeta() : null), [cotizacionEnEdicion]);

  const [clienteId, setClienteId] = useState<string>(() => {
    return cotizacionEnEdicion?.cliente?.id || draftMeta?.clienteId || clientes[0]?.id || '';
  });
  const [vendedorNombre, setVendedorNombre] = useState<string>(() => {
    return draftMeta?.vendedor || 'Wendy';
  });
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(() => {
    return cotizacionEnEdicion?.descuento_porcentaje || draftMeta?.descuentoPorcentaje || 0;
  });
  const [ivaPorcentaje, setIvaPorcentaje] = useState<number>(() => {
    return cotizacionEnEdicion?.iva_porcentaje !== undefined 
      ? cotizacionEnEdicion.iva_porcentaje 
      : draftMeta?.ivaPorcentaje !== undefined 
      ? draftMeta.ivaPorcentaje 
      : 0;
  });
  const [notas, setNotas] = useState<string>(() => {
    return cotizacionEnEdicion?.notas || draftMeta?.notas || 'No incluye transporte fuera del perímetro urbano.';
  });

  // Tiempo Estimado de Fabricación y Entrega (Slider 3-30 días hábiles + Calendario)
  const [diasEntrega, setDiasEntrega] = useState<number>(() => {
    if (cotizacionEnEdicion?.tiempo_entrega_estimado) {
      const match = cotizacionEnEdicion.tiempo_entrega_estimado.match(/\((\d+)\)/);
      if (match) return parseInt(match[1], 10) || 3;
    }
    return draftMeta?.diasEntrega || 3;
  });

  const [fechaEntrega, setFechaEntrega] = useState<string>(() => {
    if (draftMeta?.fechaEntrega) return draftMeta.fechaEntrega;
    return calcularFechaEstimada(cotizacionEnEdicion ? diasEntrega : (draftMeta?.diasEntrega || 3));
  });

  const handleCambiarDiasEntrega = (dias: number) => {
    const d = Math.max(3, Math.min(30, Math.round(dias)));
    setDiasEntrega(d);
    setFechaEntrega(calcularFechaEstimada(d));
  };

  const handleCambiarFechaEntrega = (fechaStr: string) => {
    setFechaEntrega(fechaStr);
    const diasCalculados = calcularDiasHabilesEntre(fechaStr);
    setDiasEntrega(diasCalculados);
  };

  const tiempoEntregaTexto = useMemo(() => {
    return formatearTiempoEntrega(diasEntrega, fechaEntrega);
  }, [diasEntrega, fechaEntrega]);

  // Auto-guardado de metadatos de cotización en borrador persistente
  useEffect(() => {
    if (!cotizacionEnEdicion && items.length > 0) {
      StorageService.saveDraftBuilderMeta({
        clienteId,
        vendedor: vendedorNombre,
        descuentoPorcentaje,
        ivaPorcentaje,
        notas,
        diasEntrega,
        fechaEntrega,
        tiempoEntrega: tiempoEntregaTexto
      });
    }
  }, [clienteId, vendedorNombre, descuentoPorcentaje, ivaPorcentaje, notas, diasEntrega, fechaEntrega, tiempoEntregaTexto, items.length, cotizacionEnEdicion]);
  const [showNewClientModal, setShowNewClientModal] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [cotizacionParaConfirmarWhatsApp, setCotizacionParaConfirmarWhatsApp] = useState<Cotizacion | null>(null);
  const [cotizacionParaVisualizar, setCotizacionParaVisualizar] = useState<{
    cotizacion: Cotizacion;
    blobUrl: string | null;
    textoDescriptivo: string;
  } | null>(null);

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
  const [editAplicaDescuentoVolumen, setEditAplicaDescuentoVolumen] = useState<boolean>(true);

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
      setIvaPorcentaje(cotizacionEnEdicion.iva_porcentaje || 0);
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
  const { 
    subtotal, 
    descuentoMonto, 
    subtotalConDescuento, 
    ivaMonto, 
    total, 
    ahorroVolumenTotal 
  } = useMemo(() => {
    return calcularTotalesCotizacion(items, descuentoPorcentaje, ivaPorcentaje);
  }, [items, descuentoPorcentaje, ivaPorcentaje]);

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
    setEditAplicaDescuentoVolumen(item.aplica_descuento_volumen !== false);
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
      aplica_descuento_volumen: editAplicaDescuentoVolumen,
      descuento_volumen_porcentaje: editAplicaDescuentoVolumen ? piezaEditando.descuento_volumen_porcentaje : undefined,
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
      iva_porcentaje: ivaPorcentaje,
      iva_monto: ivaMonto,
      descuento_porcentaje: descuentoPorcentaje,
      descuento_monto: descuentoMonto,
      ahorro_volumen_total: ahorroVolumenTotal,
      total,
      tiempo_entrega_estimado: tiempoEntregaTexto || items[0]?.tiempo_entrega || '(3) Días hábiles',
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

    if (enviarWhatsApp) {
      setCotizacionParaConfirmarWhatsApp(cotizacionFinal);
      return;
    }

    ejecutarGuardadoFinalCotizacion(cotizacionFinal);
  };

  const ejecutarGuardadoFinalCotizacion = (cotizacionFinal: Cotizacion) => {
    onSaveCotizacion(cotizacionFinal);
    StorageService.clearDraftPieces();
    StorageService.clearDraftBuilderMeta();

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Disparo dual por correo si el cliente tiene correo registrado
    if (cotizacionFinal.cliente?.correo) {
      EmailNotificationService.enviarCorreoCotizacion(cotizacionFinal);
    }

    setCotizacionParaConfirmarWhatsApp(null);
  };

  const handleDescargarPDF = () => {
    const cotTemp = construirCotizacionFinal(cotizacionEnEdicion ? cotizacionEnEdicion.estado : 'Borrador');
    if (!cotTemp) {
      toast.warning('Agrega al menos una pieza antes de generar el PDF.');
      return;
    }
    generarPDFCotizacion(cotTemp, config);
  };

  const handleVisualizarDocumentoCotizacion = async () => {
    const cotTemp = construirCotizacionFinal(cotizacionEnEdicion ? cotizacionEnEdicion.estado : 'Borrador');
    if (!cotTemp) {
      toast.warning('Agrega al menos una pieza y asigna un cliente antes de ver el documento.');
      return;
    }
    try {
      const blobUrl = await obtenerBlobURLCotizacion(cotTemp, config);
      const texto = generateCotizacionWhatsAppText(cotTemp, config);
      setCotizacionParaVisualizar({
        cotizacion: cotTemp,
        blobUrl,
        textoDescriptivo: texto
      });
    } catch (e) {
      console.error('Error generando vista previa de cotización:', e);
      toast.error('No se pudo generar la vista previa del documento.');
    }
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

  // Recalcular piezas con tarifas vigentes de catálogo cuando el operador lo solicita
  const handleRecalcularTarifasVigentes = () => {
    if (items.length === 0 || !onUpdatePiece) {
      toast.warning('No hay piezas para recalcular.');
      return;
    }
    let cambios = 0;
    const subtotalPrevio = subtotal;

    items.forEach(it => {
      const resina = (resinas || []).find(r => r.id === it.resina_id || r.tipo.toLowerCase() === it.resina_nombre?.toLowerCase()) || (resinas || [])[0];
      const impresora = (maquinas || []).find(m => m.id === it.maquina_id || m.nombre.toLowerCase() === it.maquina_nombre?.toLowerCase()) || (maquinas || [])[0];

      if (!resina || !impresora) return;

      const pinturas = (it.lista_pinturas || []).map(p => {
        const ins = (insumos || []).find(i => i.nombre.toLowerCase() === p.nombre.toLowerCase()) || {
          id: 'ins-p', nombre: p.nombre, costo_unitario: p.cantidad_ml > 0 ? p.costo / p.cantidad_ml : 0, categoria: 'Pintura'
        };
        return { insumo: ins as any, cantidad_ml: p.cantidad_ml };
      });

      const accesorios = (it.lista_accesorios || []).map(a => {
        const ins = (insumos || []).find(i => i.nombre.toLowerCase() === a.nombre.toLowerCase()) || {
          id: 'ins-a', nombre: a.nombre, costo_unitario: a.cantidad > 0 ? a.costo / a.cantidad : 0, categoria: 'Accesorio'
        };
        return { insumo: ins as any, cantidad: a.cantidad };
      });

      const empaques = (it.lista_empaques || []).map(e => {
        const ins = (insumos || []).find(i => i.nombre.toLowerCase() === e.nombre.toLowerCase()) || {
          id: 'ins-e', nombre: e.nombre, costo_unitario: e.cantidad > 0 ? e.costo / e.cantidad : 0, categoria: 'Empaque'
        };
        return { insumo: ins as any, cantidad: e.cantidad };
      });

      const inputRecalc: ParametrosPiezaInput = {
        nombre_item: it.nombre_item,
        cantidad: it.cantidad,
        alto_mm: it.alto_mm,
        ancho_mm: it.ancho_mm,
        profundidad_mm: it.profundidad_mm,
        resina,
        impresora,
        tiempoImpresionManualMin: it.tiempo_impresion_min,
        modoCalculoResina: it.modo_calculo_resina,
        pesoResinaManualG: it.gramos_resina_manual,
        tipoEstructura: it.tipo_estructura,
        porcentajeRelleno: it.porcentaje_relleno,
        requiereCurado: (it.costo_curado || 0) > 0,
        tiempoCuradoMin: 10,
        tiempoDesarrolloMin: it.tiempo_desarrollo_min || 0,
        tiempoArmadoMin: it.tiempo_armado_min || 0,
        tiempoPinturaMin: it.tiempo_pintura_min || 0,
        costoModeloComprado: it.costo_modelo_comprado || 0,
        margenGanancia: it.margen_ganancia || 0.40,
        precioUnitarioManual: it.precio_fijado_tarifa ? it.precio_unitario : undefined,
        precioFijadoTarifa: it.precio_fijado_tarifa,
        tarifaTamanoAplicada: it.tarifa_tamano_aplicada,
        accesorios,
        pinturas,
        empaques,
        imagen_url: it.imagen_url,
        datosPendientes: it.datos_pendientes,
        maquinasAdicionales: (it.maquinas_involucradas || [])
          .filter(m => m.proceso !== 'Impresión 3D' && m.proceso !== 'Lavado y Curado UV')
          .map(m => {
            const maqActual = (maquinas || []).find(maq => maq.id === m.maquina_id || maq.nombre.toLowerCase() === m.maquina_nombre.toLowerCase()) || {
              id: m.maquina_id, nombre: m.maquina_nombre, tipo: m.tipo, consumo_kwh: 0.1, costo_minuto: m.costo_minuto
            };
            return {
              maquina: maqActual as any,
              proceso: m.proceso,
              tiempo_min: m.tiempo_min,
              mostrar_en_cliente: m.mostrar_en_cliente
            };
          })
      };

      const piezaNueva = calcularPieza3D(inputRecalc, personal || [], config);
      onUpdatePiece({
        ...piezaNueva,
        id: it.id
      });
      cambios++;
    });

    const nuevoSubtotal = items.reduce((sum, it) => sum + it.precio_total, 0);
    const dif = nuevoSubtotal - subtotalPrevio;
    const difTexto = dif === 0 
      ? 'Las tarifas vigentes coinciden con la cotización.' 
      : dif > 0 
        ? `Ajuste al alza: +$${dif.toLocaleString('es-CO')} COP.` 
        : `Ajuste a la baja: -$${Math.abs(dif).toLocaleString('es-CO')} COP.`;

    toast.success(`¡${cambios} pieza(s) recalculada(s) con las tarifas vigentes del taller! ${difTexto}`);
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
    diasEntrega,
    setDiasEntrega,
    fechaEntrega,
    setFechaEntrega,
    handleCambiarDiasEntrega,
    handleCambiarFechaEntrega,
    tiempoEntregaTexto,
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
    subtotalConDescuento,
    ivaPorcentaje,
    setIvaPorcentaje,
    ivaMonto,
    ahorroVolumenTotal,
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
    editAplicaDescuentoVolumen,
    setEditAplicaDescuentoVolumen,
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
    handleVisualizarDocumentoCotizacion,
    cotizacionParaVisualizar,
    setCotizacionParaVisualizar,
    handleCompartirPDF,
    handleCrearNuevoCliente,
    handleRecalcularTarifasVigentes,
    cotizacionParaConfirmarWhatsApp,
    setCotizacionParaConfirmarWhatsApp,
    ejecutarGuardadoFinalCotizacion
  };
}
