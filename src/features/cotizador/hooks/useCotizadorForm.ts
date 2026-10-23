import { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
import { 
  Resina, 
  Maquina, 
  Insumo, 
  Personal, 
  ConfiguracionTaller, 
  PiezaCotizada, 
  TarifaTamano 
} from '../../../types';
import { 
  ItemPinturaForm, 
  ItemAccesorioForm, 
  ItemMaquinaExtraForm, 
  ItemEmpaqueForm, 
  ItemEnlaceCompraForm,
  CotizadorFormProps 
} from '../types/cotizador.types';
import { 
  calcularCotizacionIntegral, 
  ParametrosPiezaInput 
} from '../utils/pricingCalculator';
import { processAndOptimizeImage } from '../../../services/imageService';
import { detect3DPlatform, formatExternalUrl } from '../../../services/platformUtils';
import { toast } from '../../../components/ui/ToastProvider';

export function useCotizadorForm(props: CotizadorFormProps) {
  const {
    resinas,
    maquinas,
    insumos,
    personal,
    config,
    onAgregarPieza,
    initialPieceData,
    piezaEnEdicion
  } = props;

  // Estado del Formulario
  const [nombreItem, setNombreItem] = useState('Figura Coleccionable 3D');
  const [cantidad, setCantidad] = useState(1);
  const [altoMm, setAltoMm] = useState<number>(100);
  const [anchoMm, setAnchoMm] = useState<number>(60);
  const [profundidadMm, setProfundidadMm] = useState<number>(60);

  // Parámetros avanzados
  const [showParametrosAvanzados, setShowParametrosAvanzados] = useState(false);
  const [showTarifarioModal, setShowTarifarioModal] = useState(false);

  // Tarifas fijadas
  const [precioFijadoTarifa, setPrecioFijadoTarifa] = useState(false);
  const [tarifaAplicada, setTarifaAplicada] = useState<{ altura_cm: number; precio_sugerido: number } | null>(null);
  const [precioUnitarioManual, setPrecioUnitarioManual] = useState<number>(0);

  // Estructura y relleno
  const [tipoEstructura, setTipoEstructura] = useState<'solido' | 'ahuecado'>('solido');
  const [porcentajeRelleno, setPorcentajeRelleno] = useState<number>(35);

  // Sincronizar datos iniciales desde el visor STL
  useEffect(() => {
    if (initialPieceData) {
      if (initialPieceData.altoMm) setAltoMm(initialPieceData.altoMm);
      if (initialPieceData.anchoMm) setAnchoMm(initialPieceData.anchoMm);
      if (initialPieceData.profundidadMm) setProfundidadMm(initialPieceData.profundidadMm);
      if (initialPieceData.nombrePieza) setNombreItem(initialPieceData.nombrePieza);
      if (initialPieceData.imagenUrl) {
        setImagenUrl(initialPieceData.imagenUrl);
        setTipoOrigenImagen('stl');
      }
      if (initialPieceData.tipoEstructura) setTipoEstructura(initialPieceData.tipoEstructura);
      if (initialPieceData.porcentajeRelleno !== undefined) setPorcentajeRelleno(initialPieceData.porcentajeRelleno);
      if (initialPieceData.pesoResinaG && initialPieceData.pesoResinaG > 0) {
        setModoCalculoResina('manual');
        setPesoResinaManualG(initialPieceData.pesoResinaG);
      }
    }
  }, [initialPieceData]);

  // Cargar datos si se está editando una pieza
  useEffect(() => {
    if (piezaEnEdicion) {
      setNombreItem(piezaEnEdicion.nombre_item);
      setCantidad(piezaEnEdicion.cantidad);
      setAltoMm(piezaEnEdicion.alto_mm || 100);
      setAnchoMm(piezaEnEdicion.ancho_mm || 60);
      setProfundidadMm(piezaEnEdicion.profundidad_mm || 60);
      if (piezaEnEdicion.resina_id) setResinaId(piezaEnEdicion.resina_id);
      if (piezaEnEdicion.maquina_id) setMaquinaId(piezaEnEdicion.maquina_id);
      if (piezaEnEdicion.modo_calculo_resina) setModoCalculoResina(piezaEnEdicion.modo_calculo_resina);
      if (piezaEnEdicion.gramos_resina_manual) setPesoResinaManualG(piezaEnEdicion.gramos_resina_manual);
      if (piezaEnEdicion.tipo_estructura) setTipoEstructura(piezaEnEdicion.tipo_estructura);
      if (piezaEnEdicion.porcentaje_relleno !== undefined) setPorcentajeRelleno(piezaEnEdicion.porcentaje_relleno);
      if (piezaEnEdicion.imagen_url) {
        setImagenUrl(piezaEnEdicion.imagen_url);
        setTipoOrigenImagen('archivo');
      }
      setEsParcial(Boolean(piezaEnEdicion.datos_pendientes));
      if (piezaEnEdicion.notas_pendientes) setNotasPendientes(piezaEnEdicion.notas_pendientes);
      setVaPintado(Boolean(piezaEnEdicion.va_pintado));
      setTiempoPinturaMin(piezaEnEdicion.tiempo_pintura_min || 0);
      setTiempoArmadoMin(piezaEnEdicion.tiempo_armado_min || 0);
      if (piezaEnEdicion.costo_modelo_comprado !== undefined) {
        setCostoModeloComprado(piezaEnEdicion.costo_modelo_comprado);
      }
      if (piezaEnEdicion.margen_ganancia !== undefined) {
        setMargenGanancia(piezaEnEdicion.margen_ganancia);
      }

      if (piezaEnEdicion.enlaces_compra && piezaEnEdicion.enlaces_compra.length > 0) {
        setEnlacesCompra(piezaEnEdicion.enlaces_compra.map((enl, idx) => ({
          tempId: enl.id || `enl-${Date.now()}-${idx}`,
          titulo: enl.titulo || 'Modelo 3D',
          url: enl.url || '',
          costoEstimado: enl.costo_estimado || 0
        })));
      } else {
        setEnlacesCompra([]);
      }

      if (piezaEnEdicion.maquinas_involucradas) {
        const extras: ItemMaquinaExtraForm[] = piezaEnEdicion.maquinas_involucradas
          .filter(m => m.proceso !== 'Impresión 3D' && m.proceso !== 'Lavado y Curado UV')
          .map((m, idx) => ({
            tempId: `extra-${Date.now()}-${idx}`,
            maquinaId: m.maquina_id,
            proceso: m.proceso,
            tiempoMin: m.tiempo_min,
            mostrarEnCliente: Boolean(m.mostrar_en_cliente)
          }));
        setMaquinasAdicionales(extras);
      }
    }
  }, [piezaEnEdicion]);

  // Modo de Cotización Parcial / Pendiente de Slicer
  const [esParcial, setEsParcial] = useState(false);
  const [notasPendientes, setNotasPendientes] = useState('Pendiente abrir software 3D (Chitubox/Lychee) para medidas y resina exactas');

  // Modo de cálculo de resina: 'volumen' o 'manual'
  const [modoCalculoResina, setModoCalculoResina] = useState<'volumen' | 'manual'>('volumen');
  const [pesoResinaManualG, setPesoResinaManualG] = useState<number>(85);

  const [resinaId, setResinaId] = useState(resinas[0]?.id || '');

  // 1. Impresora 3D Principal
  const [maquinaId, setMaquinaId] = useState(maquinas[0]?.id || '');
  const [tiempoImpresionModo, setTiempoImpresionModo] = useState<'auto' | 'manual'>('auto');
  const [tiempoImpresionManualMin, setTiempoImpresionManualMin] = useState<number>(120);

  // 2. Lavado y Curado UV (Wash & Cure)
  const defaultCuradoMaq = maquinas.find(m => m.tipo.toLowerCase().includes('curad')) || maquinas[1] || maquinas[0];
  const [requiereCurado, setRequiereCurado] = useState(true);
  const [curadoId, setCuradoId] = useState(defaultCuradoMaq?.id || '');
  const [tiempoCuradoMin, setTiempoCuradoMin] = useState<number>(10);
  const [tiempoCuradoPersonalizado, setTiempoCuradoPersonalizado] = useState(false);

  // 3. Pintura & Aerógrafo (Compresor)
  const defaultCompresor = maquinas.find(m => m.tipo.toLowerCase().includes('aer') || m.nombre.toLowerCase().includes('compresor')) || maquinas[2] || maquinas[0];
  const [requiereCompresorPintura, setRequiereCompresorPintura] = useState(false);
  const [compresorId, setCompresorId] = useState(defaultCompresor?.id || '');
  const [tiempoCompresorMin, setTiempoCompresorMin] = useState<number>(60);
  const [tiempoCompresorSincronizado, setTiempoCompresorSincronizado] = useState(true);

  // 4. Máquinas y Procesos Adicionales Dinámicos
  const [maquinasAdicionales, setMaquinasAdicionales] = useState<ItemMaquinaExtraForm[]>([]);

  // 5. Enlaces de Referencia de Compra (Uso Interno del Taller)
  const [enlacesCompra, setEnlacesCompra] = useState<ItemEnlaceCompraForm[]>([]);

  const [tiempoDesarrolloMin, setTiempoDesarrolloMin] = useState(30);
  const [tiempoArmadoMin, setTiempoArmadoMin] = useState(15);
  const [tiempoPinturaMin, setTiempoPinturaMin] = useState(60);

  // Lista dinámica de Pinturas
  const [pinturasSeleccionadas, setPinturasSeleccionadas] = useState<ItemPinturaForm[]>([
    { tempId: 'p-1', insumoId: insumos.find(i => i.categoria.toLowerCase().includes('pintura'))?.id || '', cantidadMl: 30 }
  ]);

  // Lista dinámica de Herrajes / Insumos adicionales
  const [herrajesSeleccionados, setHerrajesSeleccionados] = useState<ItemAccesorioForm[]>([]);

  // Estado de Acabado de Pintura (Pintado Sí / No)
  const [vaPintado, setVaPintado] = useState(true);

  // Lista dinámica de Empaques de la Pieza
  const [empaquesSeleccionados, setEmpaquesSeleccionados] = useState<ItemEmpaqueForm[]>([]);

  const [costoModeloComprado, setCostoModeloComprado] = useState(0);
  const [margenGanancia, setMargenGanancia] = useState(0.40); // 40%
  const [imagenUrl, setImagenUrl] = useState<string>('');
  const [tipoOrigenImagen, setTipoOrigenImagen] = useState<'archivo' | 'stl' | null>(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);

  // Selecciones activas
  const resinaActual = resinas.find(r => r.id === resinaId) || resinas[0];
  const maquinaActual = maquinas.find(m => m.id === maquinaId) || maquinas[0];
  const estacionCurado = maquinas.find(m => m.id === curadoId) || defaultCuradoMaq;
  const maquinaCompresor = maquinas.find(m => m.id === compresorId) || defaultCompresor;
  const insumoCurado = insumos.find(i => i.nombre.toLowerCase().includes('etanol') || i.nombre.toLowerCase().includes('alcohol'));

  // Manejo de imagen optimizada
  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.warning('Por favor selecciona un archivo de imagen válido (PNG, JPG o WebP).');
      return;
    }
    setIsOptimizingImage(true);
    try {
      const optimized = await processAndOptimizeImage(file, 800, 800, 0.85);
      setImagenUrl(optimized);
      setTipoOrigenImagen('archivo');
    } catch (err) {
      console.error('Error optimizando imagen:', err);
    } finally {
      setIsOptimizingImage(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleRemoverImagen = () => {
    setImagenUrl('');
    setTipoOrigenImagen(null);
  };

  // Pegar imágenes con Ctrl+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFile(file);
            toast.success('Imagen pegada desde el portapapeles.');
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Handlers para Pinturas
  const handleAddPintura = () => {
    const defaultPintura = insumos.find(i => i.categoria.toLowerCase().includes('pintura'));
    setPinturasSeleccionadas(prev => [
      ...prev,
      { tempId: `p-${Date.now()}`, insumoId: defaultPintura?.id || '', cantidadMl: 20 }
    ]);
    setRequiereCompresorPintura(true);
  };

  const handleRemovePintura = (tempId: string) => {
    setPinturasSeleccionadas(prev => prev.filter(p => p.tempId !== tempId));
  };

  const handleUpdatePintura = (tempId: string, field: 'insumoId' | 'cantidadMl', val: any) => {
    setPinturasSeleccionadas(prev => prev.map(p => p.tempId === tempId ? { ...p, [field]: val } : p));
  };

  // Handlers para Herrajes
  const handleAddHerraje = () => {
    const defaultHerraje = insumos.find(i => !i.categoria.toLowerCase().includes('pintura') && !i.categoria.toLowerCase().includes('quimic'));
    setHerrajesSeleccionados(prev => [
      ...prev,
      { tempId: `h-${Date.now()}`, insumoId: defaultHerraje?.id || '', cantidad: 1 }
    ]);
  };

  const handleRemoveHerraje = (tempId: string) => {
    setHerrajesSeleccionados(prev => prev.filter(h => h.tempId !== tempId));
  };

  const handleUpdateHerraje = (tempId: string, field: 'insumoId' | 'cantidad', val: any) => {
    setHerrajesSeleccionados(prev => prev.map(h => h.tempId === tempId ? { ...h, [field]: val } : h));
  };

  // Handlers para Máquinas y Procesos Adicionales
  const handleAddMaquinaAdicional = () => {
    const defaultExtra = maquinas.find(m => m.id !== maquinaId && m.id !== curadoId) || maquinas[0];
    setMaquinasAdicionales(prev => [
      ...prev,
      {
        tempId: `maq-extra-${Date.now()}`,
        maquinaId: defaultExtra?.id || '',
        proceso: '',
        tiempoMin: 15,
        mostrarEnCliente: false
      }
    ]);
  };

  const handleRemoveMaquinaAdicional = (tempId: string) => {
    setMaquinasAdicionales(prev => prev.filter(m => m.tempId !== tempId));
  };

  const handleUpdateMaquinaAdicional = (tempId: string, field: keyof ItemMaquinaExtraForm, val: any) => {
    setMaquinasAdicionales(prev => prev.map(m => m.tempId === tempId ? { ...m, [field]: val } : m));
  };

  // Handlers para Empaques
  const handleAddEmpaque = () => {
    const defaultEmpaque = insumos.find(i => i.categoria.toLowerCase().includes('empaque'));
    setEmpaquesSeleccionados(prev => [
      ...prev,
      { tempId: `emp-${Date.now()}`, insumoId: defaultEmpaque?.id || '', cantidad: 1 }
    ]);
  };

  const handleRemoveEmpaque = (tempId: string) => {
    setEmpaquesSeleccionados(prev => prev.filter(e => e.tempId !== tempId));
  };

  const handleUpdateEmpaque = (tempId: string, field: 'insumoId' | 'cantidad', val: any) => {
    setEmpaquesSeleccionados(prev => prev.map(e => e.tempId === tempId ? { ...e, [field]: val } : e));
  };

  // Handlers para Enlaces de Compra
  const handleAddEnlaceCompra = () => {
    setEnlacesCompra(prev => [
      ...prev,
      {
        tempId: `enl-${Date.now()}`,
        titulo: '',
        url: '',
        costoEstimado: 0
      }
    ]);
  };

  const handleRemoveEnlaceCompra = (tempId: string) => {
    setEnlacesCompra(prev => prev.filter(e => e.tempId !== tempId));
  };

  const handleUpdateEnlaceCompra = (tempId: string, field: keyof ItemEnlaceCompraForm, val: any) => {
    setEnlacesCompra(prev => prev.map(e => {
      if (e.tempId !== tempId) return e;
      const updated = { ...e, [field]: val };
      if (field === 'url' && val && !e.titulo) {
        const detected = detect3DPlatform(val);
        if (detected.name !== 'Enlace Web') {
          updated.titulo = detected.name;
        }
      }
      return updated;
    }));
  };

  // Aplicar tarifa estándar
  const handleAplicarTarifa = (tarifa: TarifaTamano) => {
    setAltoMm(tarifa.altura_cm * 10);
    setAnchoMm(Math.round(tarifa.altura_cm * 10 * 0.6));
    setProfundidadMm(Math.round(tarifa.altura_cm * 10 * 0.6));
    setPrecioFijadoTarifa(true);
    setTarifaAplicada({
      altura_cm: tarifa.altura_cm,
      precio_sugerido: tarifa.precio_sugerido
    });
    setPrecioUnitarioManual(tarifa.precio_sugerido);
    setShowTarifarioModal(false);
  };

  const handleQuitarTarifa = () => {
    setPrecioFijadoTarifa(false);
    setTarifaAplicada(null);
    setPrecioUnitarioManual(0);
  };

  // Insumos filtrados
  const insumosPinturas = useMemo(() => {
    return insumos.filter(i => i.categoria.toLowerCase().includes('pintura'));
  }, [insumos]);

  const insumosHerrajes = useMemo(() => {
    return insumos.filter(i => 
      !i.categoria.toLowerCase().includes('pintura') && 
      !i.categoria.toLowerCase().includes('quimic') &&
      !i.categoria.toLowerCase().includes('empaque')
    );
  }, [insumos]);

  const insumosEmpaques = useMemo(() => {
    return insumos.filter(i => i.categoria.toLowerCase().includes('empaque'));
  }, [insumos]);

  // Cálculo en Vivo de la Pieza
  const calculoEnVivo = useMemo(() => {
    if (!resinaActual || !maquinaActual) return null;

    const pinturasValidas = pinturasSeleccionadas
      .map(p => {
        const ins = insumos.find(i => i.id === p.insumoId);
        return ins ? { insumo: ins, cantidad_ml: Number(p.cantidadMl) || 0 } : null;
      })
      .filter((p): p is { insumo: Insumo; cantidad_ml: number } => p !== null && p.cantidad_ml > 0);

    const accesoriosValidos = herrajesSeleccionados
      .map(h => {
        const ins = insumos.find(i => i.id === h.insumoId);
        return ins ? { insumo: ins, cantidad: Number(h.cantidad) || 0 } : null;
      })
      .filter((h): h is { insumo: Insumo; cantidad: number } => h !== null && h.cantidad > 0);

    const empaquesValidos = empaquesSeleccionados
      .map(e => {
        const ins = insumos.find(i => i.id === e.insumoId);
        return ins ? { insumo: ins, cantidad: Number(e.cantidad) || 0 } : null;
      })
      .filter((e): e is { insumo: Insumo; cantidad: number } => e !== null && e.cantidad > 0);

    const maquinasExtrasValidas = maquinasAdicionales
      .map(item => {
        const maq = maquinas.find(m => m.id === item.maquinaId);
        const procesoLimpio = item.proceso.trim();
        const esVisibleCliente = Boolean(item.mostrarEnCliente) && 
          procesoLimpio !== '' && 
          !procesoLimpio.toLowerCase().includes('proceso adicional') &&
          !procesoLimpio.toLowerCase().includes('proceso extra');

        return maq ? { 
          maquina: maq, 
          proceso: procesoLimpio || maq.nombre, 
          tiempo_min: Number(item.tiempoMin) || 0,
          mostrar_en_cliente: esVisibleCliente
        } : null;
      })
      .filter((item): item is { maquina: Maquina; proceso: string; tiempo_min: number; mostrar_en_cliente: boolean } => item !== null && item.tiempo_min > 0);

    const enlacesValidos = enlacesCompra
      .filter(l => l.url.trim() || l.titulo.trim())
      .map(l => ({
        id: l.tempId,
        titulo: l.titulo.trim() || detect3DPlatform(l.url).name,
        url: formatExternalUrl(l.url),
        costo_estimado: Number(l.costoEstimado) || undefined
      }));

    const input: ParametrosPiezaInput = {
      nombre_item: nombreItem,
      cantidad,
      alto_mm: Number(altoMm) || 1,
      ancho_mm: Number(anchoMm) || 1,
      profundidad_mm: Number(profundidadMm) || 1,
      resina: resinaActual,
      impresora: maquinaActual,
      tiempoImpresionManualMin: tiempoImpresionModo === 'manual' ? Number(tiempoImpresionManualMin) : undefined,
      requiereCurado,
      estacionCurado,
      tiempoCuradoMin: tiempoCuradoPersonalizado ? Number(tiempoCuradoMin) : undefined,
      insumoCurado,
      requiereCompresorPintura: vaPintado ? requiereCompresorPintura : false,
      maquinaPintura: maquinaCompresor,
      tiempoCompresorMin: tiempoCompresorSincronizado ? Number(tiempoPinturaMin) : Number(tiempoCompresorMin) || 0,
      maquinasAdicionales: maquinasExtrasValidas,
      enlacesCompra: enlacesValidos,
      tiempoDesarrolloMin: Number(tiempoDesarrolloMin) || 0,
      tiempoArmadoMin: Number(tiempoArmadoMin) || 0,
      tiempoPinturaMin: vaPintado ? Number(tiempoPinturaMin) || 0 : 0,
      pinturas: vaPintado ? pinturasValidas : [],
      accesorios: accesoriosValidos,
      empaques: empaquesValidos,
      vaPintadoManual: vaPintado,
      costoModeloComprado: Number(costoModeloComprado) || 0,
      margenGanancia: Number(margenGanancia) || 0.40,
      imagen_url: imagenUrl,
      modoCalculoResina,
      tipoEstructura,
      porcentajeRelleno,
      pesoResinaManualG: Number(pesoResinaManualG) || 0,
      datosPendientes: esParcial,
      notasPendientes,
      precioUnitarioManual: precioFijadoTarifa ? precioUnitarioManual : undefined,
      tarifaTamanoAplicada: precioFijadoTarifa && tarifaAplicada ? tarifaAplicada : undefined,
      precioFijadoTarifa
    };

    return calcularCotizacionIntegral(input, personal, config);
  }, [
    nombreItem,
    cantidad,
    altoMm,
    anchoMm,
    profundidadMm,
    esParcial,
    notasPendientes,
    modoCalculoResina,
    tipoEstructura,
    porcentajeRelleno,
    pesoResinaManualG,
    resinaActual,
    maquinaActual,
    tiempoImpresionModo,
    tiempoImpresionManualMin,
    requiereCurado,
    curadoId,
    estacionCurado,
    tiempoCuradoMin,
    tiempoCuradoPersonalizado,
    insumoCurado,
    requiereCompresorPintura,
    compresorId,
    maquinaCompresor,
    tiempoCompresorMin,
    tiempoCompresorSincronizado,
    maquinasAdicionales,
    enlacesCompra,
    tiempoDesarrolloMin,
    tiempoArmadoMin,
    tiempoPinturaMin,
    vaPintado,
    pinturasSeleccionadas,
    herrajesSeleccionados,
    empaquesSeleccionados,
    costoModeloComprado,
    margenGanancia,
    imagenUrl,
    personal,
    config,
    insumos,
    maquinas,
    precioFijadoTarifa,
    precioUnitarioManual,
    tarifaAplicada
  ]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!calculoEnVivo) return;
    const piezaFinal: PiezaCotizada = piezaEnEdicion
      ? { ...calculoEnVivo, id: piezaEnEdicion.id }
      : calculoEnVivo;
    onAgregarPieza(piezaFinal);
    setImagenUrl('');
    setTipoOrigenImagen(null);
    setPrecioFijadoTarifa(false);
    setTarifaAplicada(null);
    setPrecioUnitarioManual(0);
    setEnlacesCompra([]);
    setEmpaquesSeleccionados([]);
  };

  return {
    // Datos básicos
    nombreItem,
    setNombreItem,
    cantidad,
    setCantidad,
    altoMm,
    setAltoMm,
    anchoMm,
    setAnchoMm,
    profundidadMm,
    setProfundidadMm,
    esParcial,
    setEsParcial,
    notasPendientes,
    setNotasPendientes,

    // Resina y estructura
    modoCalculoResina,
    setModoCalculoResina,
    pesoResinaManualG,
    setPesoResinaManualG,
    tipoEstructura,
    setTipoEstructura,
    porcentajeRelleno,
    setPorcentajeRelleno,
    resinaId,
    setResinaId,
    resinaActual,

    // Maquinaria principal
    maquinaId,
    setMaquinaId,
    maquinaActual,
    tiempoImpresionModo,
    setTiempoImpresionModo,
    tiempoImpresionManualMin,
    setTiempoImpresionManualMin,

    // Post-procesamiento
    requiereCurado,
    setRequiereCurado,
    curadoId,
    setCuradoId,
    estacionCurado,
    tiempoCuradoMin,
    setTiempoCuradoMin,
    tiempoCuradoPersonalizado,
    setTiempoCuradoPersonalizado,
    insumoCurado,

    // Pintura y compresor
    vaPintado,
    setVaPintado,
    tiempoPinturaMin,
    setTiempoPinturaMin,
    requiereCompresorPintura,
    setRequiereCompresorPintura,
    compresorId,
    setCompresorId,
    maquinaCompresor,
    tiempoCompresorMin,
    setTiempoCompresorMin,
    tiempoCompresorSincronizado,
    setTiempoCompresorSincronizado,

    // Mano de obra
    tiempoDesarrolloMin,
    setTiempoDesarrolloMin,
    tiempoArmadoMin,
    setTiempoArmadoMin,

    // Costos y márgenes
    costoModeloComprado,
    setCostoModeloComprado,
    margenGanancia,
    setMargenGanancia,

    // Multimedia e imagen
    imagenUrl,
    setImagenUrl,
    tipoOrigenImagen,
    isOptimizingImage,
    showImagePreviewModal,
    setShowImagePreviewModal,
    handleImageUpload,
    handleImageFile,
    handleRemoverImagen,

    // Tarifas y precios
    precioFijadoTarifa,
    tarifaAplicada,
    precioUnitarioManual,
    setPrecioUnitarioManual,
    showTarifarioModal,
    setShowTarifarioModal,
    showParametrosAvanzados,
    setShowParametrosAvanzados,
    handleAplicarTarifa,
    handleQuitarTarifa,

    // Listas dinámicas
    pinturasSeleccionadas,
    handleAddPintura,
    handleRemovePintura,
    handleUpdatePintura,
    insumosPinturas,

    herrajesSeleccionados,
    handleAddHerraje,
    handleRemoveHerraje,
    handleUpdateHerraje,
    insumosHerrajes,

    empaquesSeleccionados,
    handleAddEmpaque,
    handleRemoveEmpaque,
    handleUpdateEmpaque,
    insumosEmpaques,

    maquinasAdicionales,
    handleAddMaquinaAdicional,
    handleRemoveMaquinaAdicional,
    handleUpdateMaquinaAdicional,

    enlacesCompra,
    handleAddEnlaceCompra,
    handleRemoveEnlaceCompra,
    handleUpdateEnlaceCompra,

    // Cálculo y envío
    calculoEnVivo,
    handleSubmit
  };
}
