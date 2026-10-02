import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Layers, 
  Clock, 
  Palette, 
  Wrench, 
  DollarSign, 
  PlusCircle, 
  Image as ImageIcon,
  Plus,
  Trash2,
  Sliders,
  Scale,
  Info,
  Camera,
  UploadCloud,
  Eye,
  Check,
  X,
  Sparkles,
  ExternalLink,
  ShoppingCart,
  Link2,
  Package
} from 'lucide-react';
import { 
  Resina, 
  Maquina, 
  Insumo, 
  Personal, 
  ConfiguracionTaller, 
  PiezaCotizada,
  TarifaTamano 
} from '../../types';
import { calcularPieza3D, ParametrosPiezaInput } from '../../services/calculationEngine';
import { processAndOptimizeImage } from '../../services/imageService';
import { TarifarioModal } from './TarifarioModal';

interface ItemPinturaForm {
  tempId: string;
  insumoId: string;
  cantidadMl: number;
}

interface ItemAccesorioForm {
  tempId: string;
  insumoId: string;
  cantidad: number;
}

interface ItemMaquinaExtraForm {
  tempId: string;
  maquinaId: string;
  proceso: string;
  tiempoMin: number;
}

interface ItemEmpaqueForm {
  tempId: string;
  insumoId: string;
  cantidad: number;
}

interface ItemEnlaceCompraForm {
  tempId: string;
  titulo: string;
  url: string;
}

interface CotizadorFormProps {
  resinas: Resina[];
  maquinas: Maquina[];
  insumos: Insumo[];
  personal: Personal[];
  config: ConfiguracionTaller;
  tarifasTamanos?: TarifaTamano[];
  onAgregarPieza: (pieza: PiezaCotizada) => void;
  onOpenSTLViewer?: () => void;
  onNavigateToCatalogos?: () => void;
  initialPieceData?: {
    altoMm?: number;
    anchoMm?: number;
    profundidadMm?: number;
    pesoResinaG?: number;
    nombrePieza?: string;
    imagenUrl?: string;
    tipoEstructura?: 'solido' | 'ahuecado';
    porcentajeRelleno?: number;
  } | null;
}

export const CotizadorForm: React.FC<CotizadorFormProps> = ({
  resinas,
  maquinas,
  insumos,
  personal,
  config,
  tarifasTamanos = [],
  onAgregarPieza,
  onOpenSTLViewer,
  onNavigateToCatalogos,
  initialPieceData
}) => {
  // Estado básico
  const [nombreItem, setNombreItem] = useState('Figura Coleccionable');
  const [cantidad, setCantidad] = useState(1);
  const [altoMm, setAltoMm] = useState(60);
  const [anchoMm, setAnchoMm] = useState(60);
  const [profundidadMm, setProfundidadMm] = useState(60);
  // Unidad de visualización de medidas ('mm' o 'cm')
  const [unidadMedida, setUnidadMedida] = useState<'mm' | 'cm'>('mm');

  // Tarifario de Valores Básicos por Tamaño
  const [showTarifarioModal, setShowTarifarioModal] = useState(false);
  const [precioFijadoTarifa, setPrecioFijadoTarifa] = useState(false);
  const [tarifaAplicada, setTarifaAplicada] = useState<{ altura_cm: number; precio_sugerido: number } | null>(null);
  const [precioUnitarioManual, setPrecioUnitarioManual] = useState<number>(0);

  const handleSelectTarifa = (tarifa: TarifaTamano) => {
    const alturaMm = Math.round(tarifa.altura_cm * 10);
    setAltoMm(alturaMm);
    setPrecioUnitarioManual(tarifa.precio_sugerido);
    setTarifaAplicada({
      altura_cm: tarifa.altura_cm,
      precio_sugerido: tarifa.precio_sugerido
    });
    setPrecioFijadoTarifa(true);
    setEsParcial(false);
    if (!nombreItem || nombreItem === 'Figura Coleccionable') {
      setNombreItem(tarifa.descripcion || `Figura ${tarifa.altura_cm}cm`);
    }
  };

  // Tipo de estructura: 'solido' (100% como en WJGEEKS.xlsx) o 'ahuecado'
  const [tipoEstructura, setTipoEstructura] = useState<'solido' | 'ahuecado'>('solido');
  const [porcentajeRelleno, setPorcentajeRelleno] = useState<number>(35);

  // Escuchar datos aplicados desde el Visor STL 3D
  React.useEffect(() => {
    if (initialPieceData) {
      if (initialPieceData.altoMm !== undefined) setAltoMm(initialPieceData.altoMm);
      if (initialPieceData.anchoMm !== undefined) setAnchoMm(initialPieceData.anchoMm);
      if (initialPieceData.profundidadMm !== undefined) setProfundidadMm(initialPieceData.profundidadMm);
      if (initialPieceData.pesoResinaG !== undefined) {
        setPesoResinaManualG(initialPieceData.pesoResinaG);
        setModoCalculoResina('manual');
      }
      if (initialPieceData.tipoEstructura) {
        setTipoEstructura(initialPieceData.tipoEstructura);
      }
      if (initialPieceData.porcentajeRelleno !== undefined) {
        setPorcentajeRelleno(initialPieceData.porcentajeRelleno);
      }
      if (initialPieceData.nombrePieza) setNombreItem(initialPieceData.nombrePieza);
      if (initialPieceData.imagenUrl) {
        setImagenUrl(initialPieceData.imagenUrl);
        setTipoOrigenImagen('stl');
      }
      setEsParcial(false);
    }
  }, [initialPieceData]);
  
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
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG o WebP).');
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

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
        proceso: 'Proceso Adicional',
        tiempoMin: 15
      }
    ]);
  };

  const handleRemoveMaquinaAdicional = (tempId: string) => {
    setMaquinasAdicionales(prev => prev.filter(m => m.tempId !== tempId));
  };

  const handleUpdateMaquinaAdicional = (tempId: string, field: 'maquinaId' | 'proceso' | 'tiempoMin', val: any) => {
    setMaquinasAdicionales(prev => prev.map(m => m.tempId === tempId ? { ...m, [field]: val } : m));
  };

  // Handlers para Enlaces de Referencia de Compra (Uso Interno)
  const handleAddEnlaceCompra = () => {
    setEnlacesCompra(prev => [
      ...prev,
      {
        tempId: `link-${Date.now()}`,
        titulo: '',
        url: ''
      }
    ]);
  };

  const handleRemoveEnlaceCompra = (tempId: string) => {
    setEnlacesCompra(prev => prev.filter(l => l.tempId !== tempId));
  };

  const handleUpdateEnlaceCompra = (tempId: string, field: 'titulo' | 'url', val: string) => {
    setEnlacesCompra(prev => prev.map(l => l.tempId === tempId ? { ...l, [field]: val } : l));
  };

  // Handlers para Empaques de la Pieza
  const handleAddEmpaque = () => {
    const defaultEmp = insumos.find(i => i.categoria.toLowerCase().includes('empaque')) || insumos[0];
    setEmpaquesSeleccionados(prev => [
      ...prev,
      { tempId: `emp-${Date.now()}`, insumoId: defaultEmp?.id || '', cantidad: 1 }
    ]);
  };

  const handleRemoveEmpaque = (tempId: string) => {
    setEmpaquesSeleccionados(prev => prev.filter(e => e.tempId !== tempId));
  };

  const handleUpdateEmpaque = (tempId: string, field: 'insumoId' | 'cantidad', val: any) => {
    setEmpaquesSeleccionados(prev => prev.map(e => e.tempId === tempId ? { ...e, [field]: val } : e));
  };

  // Listas de insumos por categoría
  const insumosPintura = insumos.filter(i => i.categoria.toLowerCase().includes('pintura'));
  const insumosEmpaque = insumos.filter(i => 
    i.categoria.toLowerCase().includes('empaque') || 
    i.nombre.toLowerCase().includes('caja') || 
    i.nombre.toLowerCase().includes('bolsa') || 
    i.nombre.toLowerCase().includes('tubo')
  );
  const insumosOtros = insumos.filter(i => 
    !i.categoria.toLowerCase().includes('pintura') && 
    !i.categoria.toLowerCase().includes('quimic') &&
    !i.categoria.toLowerCase().includes('empaque')
  );

  // Cálculo en Vivo
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
        return maq ? { maquina: maq, proceso: item.proceso, tiempo_min: Number(item.tiempoMin) || 0 } : null;
      })
      .filter((item): item is { maquina: Maquina; proceso: string; tiempo_min: number } => item !== null && item.tiempo_min > 0);

    const enlacesValidos = enlacesCompra
      .filter(l => l.url.trim() || l.titulo.trim())
      .map(l => ({
        titulo: l.titulo.trim() || 'Producto / Insumo',
        url: l.url.trim()
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

    return calcularPieza3D(input, personal, config);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calculoEnVivo) return;
    onAgregarPieza(calculoEnVivo);
    setImagenUrl('');
    setTipoOrigenImagen(null);
    setPrecioFijadoTarifa(false);
    setTarifaAplicada(null);
    setPrecioUnitarioManual(0);
    setEnlacesCompra([]);
    setEmpaquesSeleccionados([]);
  };

  if (resinas.length === 0 || maquinas.length === 0) {
    return (
      <div className="glass-card highlight" style={{ padding: '30px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Cargando catálogo del taller...</p>
      </div>
    );
  }

  return (
    <div className="glass-card highlight">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Box size={22} color="var(--brand-cyan)" />
            Calculador 3D & Resina Avanzado
          </h2>
          <p className="section-subtitle">Ajuste de resina exacta (slicer), pinturas múltiples y herrajes dinámicos</p>
        </div>

        <button
          type="button"
          className="btn btn-cyan btn-sm"
          onClick={() => setShowTarifarioModal(true)}
          style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)' }}
          title="Ver escala de precios por tamaño y copiar textos rápidos para WhatsApp"
        >
          <Sparkles size={15} />
          <span>Tarifario Rápido (Valores Básicos)</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Nombre y Cantidad */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Nombre de la Pieza</label>
            <input 
              type="text" 
              className="form-input" 
              value={nombreItem}
              onChange={e => setNombreItem(e.target.value)}
              placeholder="Ej: Miniatura Dragon 7cm"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Cantidad</label>
            <input 
              type="number" 
              className="form-input" 
              min="1" 
              value={cantidad}
              onChange={e => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
              required
            />
          </div>
        </div>

        {/* SELECTOR DE MODO PARCIAL / PENDIENTE DE SLICER */}
        <div style={{
          background: esParcial ? 'rgba(234, 179, 8, 0.12)' : 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${esParcial ? 'rgba(234, 179, 8, 0.45)' : 'rgba(255, 255, 255, 0.08)'}`,
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: esParcial ? '#fde047' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{esParcial ? '🟡 Cotización Parcial (Medidas / Resina Pendientes)' : '📐 Cotización Estándar (Medidas Definidas)'}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {esParcial 
                ? 'Las dimensiones y resina se definirán más adelante al abrir Chitubox, Lychee o Photon Workshop.'
                : 'Calcula con las dimensiones exactas o gramos de resina del Slicer.'}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: esParcial ? '#fde047' : 'var(--brand-cyan)' }}>
            <input 
              type="checkbox"
              checked={esParcial}
              onChange={e => setEsParcial(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#eab308', cursor: 'pointer' }}
            />
            <span>Dejar pendiente de Slicer</span>
          </label>
        </div>

        {esParcial && (
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ color: '#fde047' }}>Detalle de lo que queda pendiente</label>
            <input 
              type="text"
              className="form-input"
              value={notasPendientes}
              onChange={e => setNotasPendientes(e.target.value)}
              placeholder="Ej: Confirmar volumen y soportes al abrir STL en Chitubox"
            />
          </div>
        )}

        {/* Dimensiones X, Y, Z con Explicación Visual de Ejes */}
        <div className="form-group" style={{ opacity: esParcial ? 0.75 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <label className="form-label" style={{ margin: 0 }}>
              Dimensiones de la Pieza (Milímetros) {esParcial && <span style={{ color: '#fde047', fontWeight: 500 }}>(Opcional / Por definir)</span>}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowTarifarioModal(true)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 10px', height: 'auto', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                title="Elegir una altura estándar del tarifario"
              >
                <Sparkles size={13} color="var(--brand-cyan)" />
                <span>{tarifaAplicada ? `Tarifa ${tarifaAplicada.altura_cm}cm` : 'Tarifas por Tamaño'}</span>
              </button>

              {onOpenSTLViewer && (
                <button
                  type="button"
                  onClick={onOpenSTLViewer}
                  className="btn btn-cyan btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 10px', height: 'auto' }}
                  title="Abrir visor 3D para subir y medir archivo STL"
                >
                  <Box size={13} />
                  <span>📐 Medir con Visor STL 3D</span>
                </button>
              )}
              <span style={{ fontSize: '0.72rem', color: 'var(--brand-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Info size={13} />
                Estándar Slicer 3D
              </span>
            </div>
          </div>

          {/* Guía Explicativa de Orientación de Ejes */}
          <div style={{
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--brand-cyan)', fontWeight: 700 }}>🧭 Ejes:</span>
              <span><strong>Z</strong> = Altura ↕️</span>
              <span>•</span>
              <span><strong>X</strong> = Ancho ↔️</span>
              <span>•</span>
              <span><strong>Y</strong> = Fondo ↗️</span>
            </div>

            {/* Switcher de unidad de medida */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '2px' }}>Unidad:</span>
              <button
                type="button"
                className={`btn btn-sm ${unidadMedida === 'mm' ? 'btn-cyan' : 'btn-secondary'}`}
                style={{ padding: '2px 7px', fontSize: '0.7rem', minHeight: 'auto' }}
                onClick={() => setUnidadMedida('mm')}
              >
                mm
              </button>
              <button
                type="button"
                className={`btn btn-sm ${unidadMedida === 'cm' ? 'btn-cyan' : 'btn-secondary'}`}
                style={{ padding: '2px 7px', fontSize: '0.7rem', minHeight: 'auto' }}
                onClick={() => setUnidadMedida('cm')}
              >
                cm
              </button>
            </div>
          </div>

          <div className="dimensions-grid">
            {/* Eje Z - Altura / Vertical */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'var(--brand-cyan)', fontWeight: 800 }}>Z</span> — Altura (Vertical)
              </label>
              <div className="input-with-unit">
                <input 
                  type="number" 
                  className="form-input" 
                  value={unidadMedida === 'cm' ? Number((altoMm / 10).toFixed(2)) : altoMm} 
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setAltoMm(Math.max(0, unidadMedida === 'cm' ? Number((val * 10).toFixed(1)) : val));
                  }} 
                  title="Alto vertical en Z"
                  placeholder="Alto"
                />
                <span className="input-unit-badge">{unidadMedida} (Z)</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'block', marginTop: '3px' }}>
                ↕️ {unidadMedida === 'cm' ? `${altoMm} mm` : `${(altoMm / 10).toFixed(1)} cm`}
              </span>
            </div>

            {/* Eje X - Ancho / Horizontal */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'var(--brand-blue)', fontWeight: 800 }}>X</span> — Ancho (Horizontal)
              </label>
              <div className="input-with-unit">
                <input 
                  type="number" 
                  className="form-input" 
                  value={unidadMedida === 'cm' ? Number((anchoMm / 10).toFixed(2)) : anchoMm} 
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setAnchoMm(Math.max(0, unidadMedida === 'cm' ? Number((val * 10).toFixed(1)) : val));
                  }} 
                  title="Ancho horizontal en X"
                  placeholder="Ancho"
                />
                <span className="input-unit-badge">{unidadMedida} (X)</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'block', marginTop: '3px' }}>
                ↔️ {unidadMedida === 'cm' ? `${anchoMm} mm` : `${(anchoMm / 10).toFixed(1)} cm`}
              </span>
            </div>

            {/* Eje Y - Profundidad / Fondo */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'var(--brand-purple)', fontWeight: 800 }}>Y</span> — Fondo (Profundidad)
              </label>
              <div className="input-with-unit">
                <input 
                  type="number" 
                  className="form-input" 
                  value={unidadMedida === 'cm' ? Number((profundidadMm / 10).toFixed(2)) : profundidadMm} 
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setProfundidadMm(Math.max(0, unidadMedida === 'cm' ? Number((val * 10).toFixed(1)) : val));
                  }} 
                  title="Profundidad en Y"
                  placeholder="Prof"
                />
                <span className="input-unit-badge">{unidadMedida} (Y)</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'block', marginTop: '3px' }}>
                ↗️ {unidadMedida === 'cm' ? `${profundidadMm} mm` : `${(profundidadMm / 10).toFixed(1)} cm`}
              </span>
            </div>
          </div>

          {/* Advertencia preventiva si las medidas en mm son muy pequeñas (posible confusión de cm con mm) */}
          {unidadMedida === 'mm' && (altoMm <= 10 && altoMm > 0) && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.74rem',
              color: '#fde047',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <span>
                💡 <strong>¿Medidas en centímetros?</strong> Ingresaste {altoMm} mm ({Number((altoMm / 10).toFixed(1))} cm). Si la pieza mide {altoMm} cm ({altoMm * 10} mm):
              </span>
              <button
                type="button"
                className="btn btn-sm btn-cyan"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                onClick={() => {
                  setAltoMm(prev => prev * 10);
                  setAnchoMm(prev => prev * 10);
                  setProfundidadMm(prev => prev * 10);
                }}
              >
                Convertir cm → mm (×10)
              </button>
            </div>
          )}

          {/* Banner de Precio Fijado por Tarifario */}
          {precioFijadoTarifa && tarifaAplicada && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(14, 165, 233, 0.06) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'rgba(56, 189, 248, 0.2)',
                  borderRadius: '8px',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={18} color="var(--brand-cyan)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                    🏷️ Precio Fijado por Tarifario: <span style={{ color: 'var(--brand-cyan)' }}>${precioUnitarioManual.toLocaleString('es-CO')} COP</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Aplicado para figura de {tarifaAplicada.altura_cm} cm. El margen se ajusta en base a los costos reales del taller.
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setPrecioFijadoTarifa(false);
                  setTarifaAplicada(null);
                }}
                style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                title="Volver al cálculo dinámico por costo de resina + horas + margen %"
              >
                Volver a Margen Calculado
              </button>
            </div>
          )}
        </div>

        {/* CONFIGURACIÓN DE RESINA: VOLUMEN VS GRAMOS EXACTOS (SLICER) */}
        <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Scale size={14} color="var(--brand-cyan)" />
              Cálculo de Consumo de Resina
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                type="button"
                className={`btn btn-sm ${modoCalculoResina === 'volumen' ? 'btn-cyan' : 'btn-secondary'}`}
                onClick={() => setModoCalculoResina('volumen')}
              >
                Por Volumen (X×Y×Z)
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${modoCalculoResina === 'manual' ? 'btn-cyan' : 'btn-secondary'}`}
                onClick={() => setModoCalculoResina('manual')}
              >
                Gramos Exactos (Slicer)
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: modoCalculoResina === 'manual' ? '1.5fr 1fr' : '1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.72rem' }}>Resina Seleccionada</label>
              <select 
                className="form-select"
                value={resinaId}
                onChange={e => setResinaId(e.target.value)}
              >
                {resinas.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.tipo} - {r.color} (${r.costo_gramo.toFixed(1)}/g)
                  </option>
                ))}
              </select>
            </div>

            {modoCalculoResina === 'manual' && (
              <div className="input-with-unit">
                <input 
                  type="number" 
                  className="form-input" 
                  value={pesoResinaManualG}
                  onChange={e => setPesoResinaManualG(parseFloat(e.target.value) || 0)}
                  placeholder="Gramos del Slicer"
                  style={{ borderColor: 'var(--brand-cyan)' }}
                />
                <span className="input-unit-badge">gramos (g)</span>
              </div>
            )}
          </div>

          {/* Opciones en modo volumen geométrico */}
          {modoCalculoResina === 'volumen' && (
            <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Estructura Interna de la Pieza:
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${tipoEstructura === 'solido' ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                    onClick={() => setTipoEstructura('solido')}
                  >
                    🧱 Macizo / Sólido (100%)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${tipoEstructura === 'ahuecado' ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                    onClick={() => setTipoEstructura('ahuecado')}
                  >
                    🏺 Ahuecado ({porcentajeRelleno}%)
                  </button>
                </div>
              </div>

              {tipoEstructura === 'solido' ? (
                <p style={{ fontSize: '0.74rem', color: 'var(--brand-cyan)', margin: 0 }}>
                  🧱 <strong>Modo Sólido (WJGEEKS.xlsx):</strong> Volumen = <strong>{calculoEnVivo?.volumen_cm3 || 0} cm³</strong> | Peso macizo = <strong>{calculoEnVivo?.peso_estimado_g || 0} g</strong>. Aplica el 40% de merma de taller y soportes oficiales.
                </p>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>% de Resina respecto al volumen:</span>
                    <input
                      type="range"
                      min="15"
                      max="70"
                      step="5"
                      value={porcentajeRelleno}
                      onChange={e => setPorcentajeRelleno(parseInt(e.target.value) || 35)}
                      style={{ accentColor: 'var(--brand-cyan)', width: '120px' }}
                    />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>{porcentajeRelleno}%</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#fde047', margin: 0 }}>
                    🏺 <strong>Modo Ahuecado:</strong> Asume pieza vaciada en Chitubox/Lychee con pared de 2mm (~{porcentajeRelleno}% de material).
                  </p>
                </div>
              )}
            </div>
          )}

          {modoCalculoResina === 'manual' && (
            <p style={{ fontSize: '0.75rem', color: 'var(--brand-cyan)', marginTop: '8px', marginBottom: 0 }}>
              💡 Ingresa los gramos de resina que indica Lychee / Chitubox para la pieza hueca con soportes. Se aplica un 10% de merma técnica de taller.
            </p>
          )}
        </div>

        {/* ============================================================== */}
        {/* PARQUE DE MAQUINARIA & PROCESOS DE TALLER */}
        {/* ============================================================== */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(17, 24, 39, 0.85) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wrench size={16} color="var(--brand-cyan)" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  Procesos y Parque de Maquinaria
                </h3>
              </div>
              <p style={{ margin: '3px 0 0 36px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Configura los equipos que intervienen en cada etapa del trabajo (impresión, curado, pintura y procesos extras)
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddMaquinaAdicional}
              style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px', borderColor: 'rgba(56, 189, 248, 0.4)' }}
              title="Agregar otra máquina o proceso adicional (ej: base FDM, láser, dremel, horno)"
            >
              <Plus size={13} color="var(--brand-cyan)" />
              <span>+ Proceso / Máquina Extra</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* ETAPA 1: IMPRESIÓN 3D PRINCIPAL */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '12px 14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🖨️ Proceso 1: Impresión 3D Principal</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${tiempoImpresionModo === 'auto' ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', minHeight: 'auto' }}
                    onClick={() => setTiempoImpresionModo('auto')}
                  >
                    ⚡ Auto ({Math.round(calculoEnVivo?.tiempo_impresion_min || 0)} min)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${tiempoImpresionModo === 'manual' ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', minHeight: 'auto' }}
                    onClick={() => setTiempoImpresionModo('manual')}
                  >
                    ✏️ Manual
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: tiempoImpresionModo === 'manual' ? '2fr 1fr' : '1fr', gap: '10px', alignItems: 'center' }}>
                <div>
                  <select 
                    className="form-select"
                    value={maquinaId}
                    onChange={e => setMaquinaId(e.target.value)}
                  >
                    {maquinas.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} ({m.tipo}) — Consumo: {m.consumo_kwh} kW/h (${m.costo_minuto.toFixed(2)}/min)
                      </option>
                    ))}
                  </select>
                </div>

                {tiempoImpresionModo === 'manual' && (
                  <div>
                    <div className="input-with-unit">
                      <input 
                        type="number" 
                        className="form-input" 
                        value={tiempoImpresionManualMin}
                        onChange={e => setTiempoImpresionManualMin(Math.max(1, parseInt(e.target.value) || 0))}
                        placeholder="Minutos"
                      />
                      <span className="input-unit-badge">min</span>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                <span>
                  {tiempoImpresionModo === 'auto' 
                    ? `Calculado según altura Z (${altoMm} mm) y velocidad (${resinaActual?.velocidad_impresion_mm_h || 20} mm/h)` 
                    : `Tiempo ingresado manualmente: ${Math.floor(tiempoImpresionManualMin / 60)}h ${tiempoImpresionManualMin % 60}m`}
                </span>
                <span style={{ color: 'var(--brand-cyan)', fontWeight: 600 }}>
                  Energía Impresora: ${Math.round((calculoEnVivo?.tiempo_impresion_min || 0) * (maquinaActual?.costo_minuto || 6.255)).toLocaleString('es-CO')} COP
                </span>
              </div>
            </div>

            {/* ETAPA 2: LAVADO Y CURADO UV */}
            <div style={{
              background: requiereCurado ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.1)',
              border: `1px solid ${requiereCurado ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)'}`,
              borderRadius: '10px',
              padding: '12px 14px',
              opacity: requiereCurado ? 1 : 0.65,
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <input 
                    type="checkbox"
                    checked={requiereCurado}
                    onChange={e => setRequiereCurado(e.target.checked)}
                    style={{ accentColor: 'var(--brand-cyan)', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: requiereCurado ? '#38bdf8' : 'var(--text-muted)' }}>
                    ☀️ Proceso 2: Lavado Químico & Curado UV (Wash & Cure)
                  </span>
                </label>

                {requiereCurado && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.68rem', padding: '2px 7px', minHeight: 'auto' }}
                    onClick={() => setTiempoCuradoPersonalizado(!tiempoCuradoPersonalizado)}
                  >
                    {tiempoCuradoPersonalizado ? '✓ Tiempo Manual' : '⚡ Auto (según peso)'}
                  </button>
                )}
              </div>

              {requiereCurado && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: tiempoCuradoPersonalizado ? '2fr 1fr' : '1fr', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <select 
                        className="form-select"
                        value={curadoId}
                        onChange={e => setCuradoId(e.target.value)}
                      >
                        {maquinas.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.nombre} ({m.tipo}) — Consumo: {m.consumo_kwh} kW/h (${m.costo_minuto.toFixed(2)}/min)
                          </option>
                        ))}
                      </select>
                    </div>

                    {tiempoCuradoPersonalizado && (
                      <div className="input-with-unit">
                        <input 
                          type="number" 
                          className="form-input" 
                          value={tiempoCuradoMin}
                          onChange={e => setTiempoCuradoMin(Math.max(1, parseInt(e.target.value) || 0))}
                          placeholder="Minutos"
                        />
                        <span className="input-unit-badge">min</span>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                    <span>
                      {tiempoCuradoPersonalizado 
                        ? `${tiempoCuradoMin} minutos de exposición UV`
                        : `Tiempo auto: ${calculoEnVivo && calculoEnVivo.peso_estimado_g >= 250 ? 15 : calculoEnVivo && calculoEnVivo.peso_estimado_g <= 50 ? 5 : 10} min (según ${calculoEnVivo?.peso_estimado_g || 0}g resina)`}
                    </span>
                    <span style={{ color: 'var(--brand-cyan)', fontWeight: 600 }}>
                      Incluye curado eléctrico + lavado con solvente
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* ETAPA 3: PINTURA Y ACABADO / AERÓGRAFO */}
            <div style={{
              background: requiereCompresorPintura ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.1)',
              border: `1px solid ${requiereCompresorPintura ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)'}`,
              borderRadius: '10px',
              padding: '12px 14px',
              opacity: requiereCompresorPintura ? 1 : 0.7,
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <input 
                    type="checkbox"
                    checked={requiereCompresorPintura}
                    onChange={e => setRequiereCompresorPintura(e.target.checked)}
                    style={{ accentColor: 'var(--brand-cyan)', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: requiereCompresorPintura ? '#38bdf8' : 'var(--text-muted)' }}>
                    🎨 Proceso 3: Equipo de Pintura / Compresor de Aerografía
                  </span>
                </label>

                {requiereCompresorPintura && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.68rem', padding: '2px 7px', minHeight: 'auto' }}
                    onClick={() => setTiempoCompresorSincronizado(!tiempoCompresorSincronizado)}
                  >
                    {tiempoCompresorSincronizado ? '🔗 Sincronizado con Pintura' : '✏️ Minutos Manuales'}
                  </button>
                )}
              </div>

              {requiereCompresorPintura && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: !tiempoCompresorSincronizado ? '2fr 1fr' : '1fr', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <select 
                        className="form-select"
                        value={compresorId}
                        onChange={e => setCompresorId(e.target.value)}
                      >
                        {maquinas.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.nombre} ({m.tipo}) — Consumo: {m.consumo_kwh} kW/h (${m.costo_minuto.toFixed(2)}/min)
                          </option>
                        ))}
                      </select>
                    </div>

                    {!tiempoCompresorSincronizado && (
                      <div className="input-with-unit">
                        <input 
                          type="number" 
                          className="form-input" 
                          value={tiempoCompresorMin}
                          onChange={e => setTiempoCompresorMin(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="Minutos"
                        />
                        <span className="input-unit-badge">min</span>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                    <span>
                      {tiempoCompresorSincronizado 
                        ? `Tiempo sincronizado con mano de obra de pintura: ${tiempoPinturaMin} min` 
                        : `Tiempo compresor independiente: ${tiempoCompresorMin} min`}
                    </span>
                    <span style={{ color: 'var(--brand-cyan)', fontWeight: 600 }}>
                      Energía Compresor: ${Math.round((tiempoCompresorSincronizado ? tiempoPinturaMin : tiempoCompresorMin) * (maquinaCompresor?.costo_minuto || 5.004)).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* ETAPA 4: MÁQUINAS Y PROCESOS ADICIONALES DINÁMICOS */}
            {maquinasAdicionales.length > 0 && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '10px',
                padding: '12px 14px'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c084fc', marginBottom: '8px' }}>
                  ⚙️ Procesos & Maquinaria Extra ({maquinasAdicionales.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {maquinasAdicionales.map((extra, idx) => {
                    const extraMaq = maquinas.find(m => m.id === extra.maquinaId) || maquinas[0];
                    const costoEnergiaExtra = Math.round((extra.tiempoMin || 0) * (extraMaq?.costo_minuto || 0));

                    return (
                      <div 
                        key={extra.tempId}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '10px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr)) auto',
                          gap: '8px',
                          alignItems: 'center'
                        }}
                      >
                        {/* Selector de máquina */}
                        <div>
                          <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Máquina #{idx + 1}</label>
                          <select
                            className="form-select"
                            style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                            value={extra.maquinaId}
                            onChange={e => handleUpdateMaquinaAdicional(extra.tempId, 'maquinaId', e.target.value)}
                          >
                            {maquinas.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.nombre} ({m.tipo})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Nombre del Proceso */}
                        <div>
                          <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Proceso o Función</label>
                          <input 
                            type="text"
                            list="sugerencias-procesos"
                            className="form-input"
                            style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                            value={extra.proceso}
                            onChange={e => handleUpdateMaquinaAdicional(extra.tempId, 'proceso', e.target.value)}
                            placeholder="Ej: Base FDM / Pulido / Láser"
                          />
                          <datalist id="sugerencias-procesos">
                            <option value="Impresión Base Filamento (FDM)" />
                            <option value="Pulido Eléctrico / Dremel" />
                            <option value="Corte / Grabado Láser" />
                            <option value="Secado / Curado Térmico" />
                            <option value="Desgasificado al Vacío" />
                          </datalist>
                        </div>

                        {/* Minutos de Uso */}
                        <div>
                          <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Minutos</label>
                          <div className="input-with-unit">
                            <input 
                              type="number"
                              className="form-input"
                              style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                              value={extra.tiempoMin}
                              onChange={e => handleUpdateMaquinaAdicional(extra.tempId, 'tiempoMin', Math.max(0, parseInt(e.target.value) || 0))}
                              placeholder="Min"
                            />
                            <span className="input-unit-badge" style={{ fontSize: '0.65rem' }}>m</span>
                          </div>
                        </div>

                        {/* Costo en vivo */}
                        <div style={{ textAlign: 'right', minWidth: '70px' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Energía</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c084fc' }}>
                            ${costoEnergiaExtra.toLocaleString('es-CO')}
                          </span>
                        </div>

                        {/* Botón eliminar */}
                        <div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 8px', color: '#f87171' }}
                            onClick={() => handleRemoveMaquinaAdicional(extra.tempId)}
                            title="Eliminar máquina adicional"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BANNER INFORMATIVO RESUMEN ENERGÍA */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.75rem',
              color: 'var(--brand-cyan)',
              flexWrap: 'wrap',
              gap: '6px'
            }}>
              <span>
                ⚡ <strong>Energía Eléctrica Consolidada:</strong> ${(calculoEnVivo?.costo_energia || 0).toLocaleString('es-CO')} COP
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                {calculoEnVivo?.maquinas_involucradas?.length || 1} equipo(s) activo(s): {calculoEnVivo?.maquinas_involucradas?.map(m => m.proceso).join(' • ')}
              </span>
            </div>

          </div>
        </div>

        {/* Tiempos de Mano de Obra */}
        <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '14px', borderRadius: '12px', marginBottom: '16px' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="var(--brand-cyan)" />
            Tiempos de Fabricación y Mano de Obra (Minutos)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Desarrollo 3D</span>
              <input 
                type="number" 
                className="form-input" 
                value={tiempoDesarrolloMin}
                onChange={e => setTiempoDesarrolloMin(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Armado</span>
              <input 
                type="number" 
                className="form-input" 
                value={tiempoArmadoMin}
                onChange={e => setTiempoArmadoMin(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pintura</span>
              <input 
                type="number" 
                className="form-input" 
                value={tiempoPinturaMin}
                onChange={e => {
                  const val = Math.max(0, parseInt(e.target.value) || 0);
                  setTiempoPinturaMin(val);
                  if (tiempoCompresorSincronizado) {
                    setTiempoCompresorMin(val);
                  }
                  if (val > 0) {
                    setRequiereCompresorPintura(true);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* ACABADO DE PINTURA (PINTADO SÍ / NO) & PINTURAS DINÁMICAS */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '14px',
          borderRadius: '12px',
          marginBottom: '16px',
          border: vaPintado ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Palette size={16} color={vaPintado ? '#c084fc' : 'var(--text-muted)'} />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                Acabado de Pintura de la Pieza
              </span>
            </div>

            {/* Toggle Pintado vs Sin Pintar */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn btn-sm ${vaPintado ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.74rem', padding: '3px 10px', background: vaPintado ? '#9333ea' : undefined }}
                onClick={() => {
                  setVaPintado(true);
                  if (tiempoPinturaMin === 0) setTiempoPinturaMin(60);
                  if (pinturasSeleccionadas.length === 0) {
                    const defaultPintura = insumos.find(i => i.categoria.toLowerCase().includes('pintura'));
                    setPinturasSeleccionadas([{ tempId: `p-${Date.now()}`, insumoId: defaultPintura?.id || '', cantidadMl: 20 }]);
                  }
                  setRequiereCompresorPintura(true);
                }}
              >
                🎨 Sí, Pieza Pintada
              </button>
              <button
                type="button"
                className={`btn btn-sm ${!vaPintado ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.74rem', padding: '3px 10px', background: !vaPintado ? '#334155' : undefined }}
                onClick={() => {
                  setVaPintado(false);
                  setTiempoPinturaMin(0);
                  setPinturasSeleccionadas([]);
                  setRequiereCompresorPintura(false);
                }}
              >
                ⚪ Sin Pintar (Color Base)
              </button>
            </div>
          </div>

          {!vaPintado ? (
            <div style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              fontSize: '0.76rem',
              color: 'var(--text-muted)'
            }}>
              ⚪ <strong>Pieza sin pintura:</strong> Se entregará en el color natural de la resina. En la cotización oficial y en el PDF aparecerá como <em>"Acabado: Sin pintar"</em>.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Pinturas, Primers y Barnices Asignados ({pinturasSeleccionadas.length}):
                </span>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddPintura}
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                >
                  <Plus size={12} />
                  <span>+ Agregar Pintura</span>
                </button>
              </div>

              {pinturasSeleccionadas.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Sin pinturas seleccionadas. Clic en "+ Agregar Pintura" para asignar colores de taller.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pinturasSeleccionadas.map(p => (
                    <div key={p.tempId} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select 
                        className="form-select"
                        value={p.insumoId}
                        onChange={e => handleUpdatePintura(p.tempId, 'insumoId', e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="">Selecciona pintura / primer...</option>
                        {insumosPintura.map(ins => (
                          <option key={ins.id} value={ins.id}>
                            {ins.nombre} (${ins.costo_unitario}/ml)
                          </option>
                        ))}
                      </select>

                      <div className="input-with-unit" style={{ width: '100px' }}>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={p.cantidadMl}
                          onChange={e => handleUpdatePintura(p.tempId, 'cantidadMl', parseFloat(e.target.value) || 0)}
                          placeholder="ml"
                        />
                        <span className="input-unit-badge">ml</span>
                      </div>

                      <button 
                        type="button" 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemovePintura(p.tempId)}
                        title="Eliminar pintura"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* MÚLTIPLES HERRAJES, BISUTERÍA Y ACCESORIOS DE ENSAMBLE */}
        <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} color="var(--brand-cyan)" />
              Herrajes, Bisutería & Ensamble ({herrajesSeleccionados.length})
            </label>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handleAddHerraje}
              style={{ fontSize: '0.74rem', padding: '3px 8px' }}
            >
              <Plus size={12} />
              <span>+ Agregar Herraje</span>
            </button>
          </div>

          {herrajesSeleccionados.length === 0 ? (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Sin herrajes ni accesorios de ensamble adicionales.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {herrajesSeleccionados.map(h => (
                <div key={h.tempId} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select 
                    className="form-select"
                    value={h.insumoId}
                    onChange={e => handleUpdateHerraje(h.tempId, 'insumoId', e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Selecciona herraje / insumo...</option>
                    {insumosOtros.map(ins => (
                      <option key={ins.id} value={ins.id}>
                        {ins.nombre} (${ins.costo_unitario}/und)
                      </option>
                    ))}
                  </select>

                  <div className="input-with-unit" style={{ width: '90px' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={h.cantidad}
                      onChange={e => handleUpdateHerraje(h.tempId, 'cantidad', parseInt(e.target.value) || 1)}
                      placeholder="und"
                      min="1"
                    />
                    <span className="input-unit-badge">und</span>
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveHerraje(h.tempId)}
                    title="Eliminar herraje"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECCIÓN DEDICADA DE EMPAQUE (DIFERENTES TIPOS DE EMPAQUES) */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '14px',
          borderRadius: '12px',
          marginBottom: '16px',
          border: empaquesSeleccionados.length > 0 ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                padding: '4px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                <Package size={14} />
                <span>Empaque y Presentación ({empaquesSeleccionados.length})</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: empaquesSeleccionados.length > 0 ? '#4ade80' : 'var(--text-muted)', fontWeight: 600 }}>
                {empaquesSeleccionados.length > 0 ? '✓ Con empaque especial' : 'Sin empaque especial'}
              </span>
            </div>

            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handleAddEmpaque}
              style={{ fontSize: '0.74rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={12} />
              <span>+ Agregar Empaque</span>
            </button>
          </div>

          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
            Selecciona la caja, bolsa protectora o empaque para esta pieza (caja microcorrugado, regalo con ventana, tubo miniatura, etc.). En la cotización se indicará si incluye empaque.
          </p>

          {empaquesSeleccionados.length === 0 ? (
            <div 
              style={{ 
                border: '1px dashed rgba(255, 255, 255, 0.12)', 
                borderRadius: '8px', 
                padding: '12px', 
                textAlign: 'center', 
                color: 'var(--text-subtle)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                background: 'rgba(0, 0, 0, 0.15)'
              }}
              onClick={handleAddEmpaque}
            >
              <Package size={18} style={{ margin: '0 auto 4px auto', opacity: 0.6 }} />
              <div>Sin empaque especial asignado (Empaque estándar). Haz clic aquí o en <strong>"+ Agregar Empaque"</strong> para asignar una caja o empaque de presentación.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {empaquesSeleccionados.map(emp => {
                const insumoEmp = insumos.find(i => i.id === emp.insumoId);
                const subtotalEmp = (insumoEmp?.costo_unitario || 0) * (emp.cantidad || 1);

                return (
                  <div key={emp.tempId} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select 
                      className="form-select"
                      value={emp.insumoId}
                      onChange={e => handleUpdateEmpaque(emp.tempId, 'insumoId', e.target.value)}
                      style={{ flex: 1, minWidth: '170px' }}
                    >
                      <option value="">Selecciona tipo de empaque...</option>
                      {insumosEmpaque.map(ins => (
                        <option key={ins.id} value={ins.id}>
                          {ins.nombre} (${ins.costo_unitario.toLocaleString('es-CO')}/und)
                        </option>
                      ))}
                      {/* Opciones adicionales de insumos generales si se requiere */}
                      {insumosOtros.map(ins => (
                        <option key={ins.id} value={ins.id}>
                          {ins.nombre} (${ins.costo_unitario.toLocaleString('es-CO')}/und)
                        </option>
                      ))}
                    </select>

                    <div className="input-with-unit" style={{ width: '90px' }}>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={emp.cantidad}
                        onChange={e => handleUpdateEmpaque(emp.tempId, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="Cant"
                        min="1"
                      />
                      <span className="input-unit-badge">und</span>
                    </div>

                    <div style={{ minWidth: '70px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, color: '#4ade80' }}>
                      ${Math.round(subtotalEmp).toLocaleString('es-CO')}
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveEmpaque(emp.tempId)}
                      title="Eliminar empaque"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Margen de Ganancia y Costo Modelo STL */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">
              <DollarSign size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Margen de Ganancia: {Math.round(margenGanancia * 100)}%
            </label>
            <input 
              type="range" 
              min="0.10" 
              max="1.50" 
              step="0.05"
              value={margenGanancia}
              onChange={e => setMargenGanancia(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand-cyan)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Costo Archivo 3D Comprado ($)</label>
            <input 
              type="number" 
              className="form-input" 
              value={costoModeloComprado}
              onChange={e => setCostoModeloComprado(parseFloat(e.target.value) || 0)}
              placeholder="0 COP"
            />
          </div>
        </div>

        {/* Enlaces de Referencia para Compra de Insumos/Archivos (Estrictamente Interno - NO se muestra al cliente ni en la cotización) */}
        <div 
          className="form-group" 
          style={{ 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid rgba(245, 158, 11, 0.28)', 
            borderRadius: '12px', 
            padding: '14px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                padding: '4px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                <ShoppingCart size={13} />
                <span>Links de Referencia / Compra</span>
              </div>
              <span style={{
                fontSize: '0.68rem',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                padding: '2px 7px',
                borderRadius: '4px',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontWeight: 600
              }}>
                🔒 Uso Interno de Taller (No visible en la cotización)
              </span>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddEnlaceCompra}
              style={{ fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px' }}
            >
              <Plus size={13} />
              <span>+ Agregar Link</span>
            </button>
          </div>

          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
            Registra los enlaces de los productos, archivos STL (Cults3D, CGTrader, Thingiverse, Patreon) o herrajes que debas comprar para esta pieza. Solo el equipo de taller podrá verlos.
          </p>

          {enlacesCompra.length === 0 ? (
            <div 
              style={{ 
                border: '1px dashed rgba(255, 255, 255, 0.12)', 
                borderRadius: '8px', 
                padding: '12px', 
                textAlign: 'center', 
                color: 'var(--text-subtle)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                background: 'rgba(0, 0, 0, 0.15)'
              }}
              onClick={handleAddEnlaceCompra}
            >
              <Link2 size={18} style={{ margin: '0 auto 4px auto', opacity: 0.6 }} />
              <div>Sin links de compra registrados. Haz clic aquí o en <strong>"+ Agregar Link"</strong> si necesitas guardar el enlace para comprar el modelo o insumos.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {enlacesCompra.map((enlace, idx) => (
                <div 
                  key={enlace.tempId}
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(130px, 1.2fr) minmax(170px, 2fr) auto auto',
                    gap: '8px',
                    alignItems: 'center'
                  }}
                >
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.78rem', padding: '6px 8px' }}
                    placeholder={`Ej: STL Cults3D #${idx + 1} / Tornillo M3`}
                    value={enlace.titulo}
                    onChange={e => handleUpdateEnlaceCompra(enlace.tempId, 'titulo', e.target.value)}
                  />
                  <input
                    type="url"
                    className="form-input"
                    style={{ fontSize: '0.78rem', padding: '6px 8px' }}
                    placeholder="https://cults3d.com/... o url del producto"
                    value={enlace.url}
                    onChange={e => handleUpdateEnlaceCompra(enlace.tempId, 'url', e.target.value)}
                  />
                  {enlace.url ? (
                    <a
                      href={enlace.url.startsWith('http') ? enlace.url : `https://${enlace.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 8px', color: 'var(--brand-cyan)' }}
                      title="Abrir enlace en pestaña nueva"
                    >
                      <ExternalLink size={13} />
                    </a>
                  ) : (
                    <div style={{ width: '28px' }} />
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '6px 8px', color: '#f87171' }}
                    onClick={() => handleRemoveEnlaceCompra(enlace.tempId)}
                    title="Eliminar link"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Foto o Render de Referencia de la Pieza */}
        <div className="form-group" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ImageIcon size={15} color="var(--brand-cyan)" />
              <span>Foto o Render 3D de la Pieza</span>
            </label>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Se incluye en la cotización y en el PDF oficial
            </span>
          </div>

          {!imagenUrl ? (
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleImageFile(e.dataTransfer.files[0]);
                }
              }}
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'center',
                background: 'rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', padding: '8px 14px' }}>
                  <Camera size={15} />
                  <span>Subir Foto (Celular / Archivo)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleImageUpload} 
                    style={{ display: 'none' }} 
                  />
                </label>

                {onOpenSTLViewer && (
                  <button
                    type="button"
                    className="btn btn-cyan btn-sm"
                    style={{ padding: '8px 14px' }}
                    onClick={onOpenSTLViewer}
                    title="Abrir Visor 3D para cargar STL y tomar captura"
                  >
                    <Box size={15} />
                    <span>Tomar Captura de STL 3D</span>
                  </button>
                )}
              </div>

              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Arrastra una foto aquí o abre el visor STL para rotar y capturar el modelo 3D
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              padding: '12px 14px',
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '10px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={() => setShowImagePreviewModal(true)}
                  title="Clic para ver en tamaño completo"
                >
                  <img 
                    src={imagenUrl} 
                    alt="Previsualización pieza" 
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '2px solid rgba(56, 189, 248, 0.4)',
                      background: '#090d15'
                    }} 
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    background: 'rgba(0,0,0,0.7)',
                    borderRadius: '4px',
                    padding: '2px',
                    display: 'flex'
                  }}>
                    <Eye size={12} color="#fff" />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: tipoOrigenImagen === 'stl' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(37, 99, 235, 0.2)',
                      color: tipoOrigenImagen === 'stl' ? 'var(--brand-cyan)' : '#93c5fd',
                      border: `1px solid ${tipoOrigenImagen === 'stl' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(37, 99, 235, 0.4)'}`
                    }}>
                      {tipoOrigenImagen === 'stl' ? '📸 Captura STL 3D' : '📷 Foto de Referencia'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Check size={12} />
                      Lista para PDF
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 500 }}>
                    {nombreItem || 'Pieza'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Aparecerá en el PDF y en la orden de taller
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowImagePreviewModal(true)}
                  title="Ver imagen en grande"
                >
                  <Eye size={14} />
                  <span>Ver</span>
                </button>

                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  <span>Cambiar</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleImageUpload} 
                    style={{ display: 'none' }} 
                  />
                </label>

                {onOpenSTLViewer && (
                  <button
                    type="button"
                    className="btn btn-cyan btn-sm"
                    onClick={onOpenSTLViewer}
                    title="Abrir Visor STL para recapturar el 3D"
                  >
                    <Box size={14} />
                    <span>Visor STL</span>
                  </button>
                )}

                <button 
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    setImagenUrl('');
                    setTipoOrigenImagen(null);
                  }}
                  title="Quitar foto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}

          {isOptimizingImage && (
            <div style={{ fontSize: '0.75rem', color: 'var(--brand-cyan)', marginTop: '6px' }}>
              Optimizando imagen para cotización...
            </div>
          )}
        </div>

        {/* BARRA DE CÁLCULO EN VIVO */}
        {calculoEnVivo && (
          <div className="live-summary-card">
            <div className="live-metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
              <div className="metric-item">
                <div className="metric-label">Peso Resina</div>
                <div className="metric-value">{calculoEnVivo.peso_estimado_g} g</div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                  {modoCalculoResina === 'manual' 
                    ? 'Gramos Slicer' 
                    : (tipoEstructura === 'solido' ? 'Sólido 100%' : `Ahuecado ${porcentajeRelleno}%`)}
                </span>
              </div>
              <div className="metric-item">
                <div className="metric-label">Costo Resina</div>
                <div className="metric-value" style={{ color: 'var(--brand-cyan)' }}>
                  ${calculoEnVivo.costo_resina.toLocaleString('es-CO')}
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                  {modoCalculoResina === 'manual' ? '+10% merma' : '+40% merma/sop.'}
                </span>
              </div>
              <div className="metric-item">
                <div className="metric-label">Tiempo Impresión</div>
                <div className="metric-value">
                  {Math.floor(calculoEnVivo.tiempo_impresion_min / 60)}h {calculoEnVivo.tiempo_impresion_min % 60}m
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Energía Equipos</div>
                <div className="metric-value" style={{ color: '#38bdf8' }}>
                  ${calculoEnVivo.costo_energia.toLocaleString('es-CO')}
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                  {calculoEnVivo.maquinas_involucradas?.length || 1} equipo(s)
                </span>
              </div>
              <div className="metric-item">
                <div className="metric-label">Costo Taller</div>
                <div className="metric-value">${calculoEnVivo.costo_base_produccion.toLocaleString('es-CO')}</div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Entrega</div>
                <div className="metric-value" style={{ fontSize: '0.85rem' }}>{calculoEnVivo.tiempo_entrega}</div>
              </div>
            </div>

            <div className="price-hero-box">
              <div>
                <div className="price-hero-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{calculoEnVivo.precio_fijado_tarifa ? 'Precio Fijado (Tarifario Estándar)' : 'Precio Unitario Sugerido'}</span>
                  {calculoEnVivo.tarifa_tamano_aplicada && (
                    <span style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.25)', color: 'var(--brand-cyan)', padding: '1px 6px', borderRadius: '4px' }}>
                      {calculoEnVivo.tarifa_tamano_aplicada.altura_cm} cm
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Total ({cantidad} unid.): ${(calculoEnVivo.precio_total).toLocaleString('es-CO')} COP • Margen real: {Math.round(calculoEnVivo.margen_ganancia * 100)}%
                </div>
              </div>
              <div className="price-hero-amount">
                ${calculoEnVivo.precio_unitario.toLocaleString('es-CO')} COP
              </div>
            </div>
          </div>
        )}

        {/* Botón de Agregar */}
        <div style={{ marginTop: '20px' }}>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            <PlusCircle size={18} />
            <span>Agregar Pieza a la Cotización</span>
          </button>
        </div>
      </form>

      {/* Modal Lightbox para previsualizar foto en tamaño completo */}
      {showImagePreviewModal && imagenUrl && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowImagePreviewModal(false)}
        >
          <div 
            style={{
              background: 'var(--bg-card, #0f172a)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '14px',
              padding: '16px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={16} color="var(--brand-cyan)" />
                <span>{nombreItem} — Vista Previa</span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowImagePreviewModal(false)}
                style={{ padding: '4px 8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: '10px', background: '#090d15', minHeight: '200px' }}>
              <img 
                src={imagenUrl} 
                alt={nombreItem} 
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowImagePreviewModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tarifario de Valores Básicos */}
      <TarifarioModal
        isOpen={showTarifarioModal}
        onClose={() => setShowTarifarioModal(false)}
        tarifas={tarifasTamanos}
        onSelectTarifa={handleSelectTarifa}
        onNavigateToCatalogos={onNavigateToCatalogos}
      />
    </div>
  );
};
