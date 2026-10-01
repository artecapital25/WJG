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
  Sparkles
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
  const [maquinaId, setMaquinaId] = useState(maquinas[0]?.id || '');
  
  const [tiempoDesarrolloMin, setTiempoDesarrolloMin] = useState(30);
  const [tiempoArmadoMin, setTiempoArmadoMin] = useState(15);
  const [tiempoPinturaMin, setTiempoPinturaMin] = useState(60);

  // Lista dinámica de Pinturas
  const [pinturasSeleccionadas, setPinturasSeleccionadas] = useState<ItemPinturaForm[]>([
    { tempId: 'p-1', insumoId: insumos.find(i => i.categoria.toLowerCase().includes('pintura'))?.id || '', cantidadMl: 30 }
  ]);

  // Lista dinámica de Herrajes / Insumos adicionales
  const [herrajesSeleccionados, setHerrajesSeleccionados] = useState<ItemAccesorioForm[]>([]);

  const [costoModeloComprado, setCostoModeloComprado] = useState(0);
  const [margenGanancia, setMargenGanancia] = useState(0.40); // 40%
  const [imagenUrl, setImagenUrl] = useState<string>('');
  const [tipoOrigenImagen, setTipoOrigenImagen] = useState<'archivo' | 'stl' | null>(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);

  // Selecciones activas
  const resinaActual = resinas.find(r => r.id === resinaId) || resinas[0];
  const maquinaActual = maquinas.find(m => m.id === maquinaId) || maquinas[0];
  const estacionCurado = maquinas.find(m => m.tipo.toLowerCase().includes('curad')) || maquinas[1];
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

  // Listas de insumos por categoría
  const insumosPintura = insumos.filter(i => i.categoria.toLowerCase().includes('pintura'));
  const insumosOtros = insumos.filter(i => !i.categoria.toLowerCase().includes('pintura') && !i.categoria.toLowerCase().includes('quimic'));

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

    const input: ParametrosPiezaInput = {
      nombre_item: nombreItem,
      cantidad,
      alto_mm: Number(altoMm) || 1,
      ancho_mm: Number(anchoMm) || 1,
      profundidad_mm: Number(profundidadMm) || 1,
      resina: resinaActual,
      impresora: maquinaActual,
      estacionCurado,
      insumoCurado,
      tiempoDesarrolloMin: Number(tiempoDesarrolloMin) || 0,
      tiempoArmadoMin: Number(tiempoArmadoMin) || 0,
      tiempoPinturaMin: Number(tiempoPinturaMin) || 0,
      pinturas: pinturasValidas,
      accesorios: accesoriosValidos,
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
    estacionCurado,
    insumoCurado,
    tiempoDesarrolloMin,
    tiempoArmadoMin,
    tiempoPinturaMin,
    pinturasSeleccionadas,
    herrajesSeleccionados,
    costoModeloComprado,
    margenGanancia,
    imagenUrl,
    personal,
    config,
    insumos,
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
  };

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

        {/* Impresora 3D y Tiempos de Fabricación */}
        <div className="form-group">
          <label className="form-label">
            <Wrench size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Impresora 3D Asignada
          </label>
          <select 
            className="form-select"
            value={maquinaId}
            onChange={e => setMaquinaId(e.target.value)}
          >
            {maquinas.map(m => (
              <option key={m.id} value={m.id}>
                {m.nombre} ({m.tipo}) - Costo: ${m.costo_minuto.toFixed(3)}/min
              </option>
            ))}
          </select>
        </div>

        {/* Tiempos de Mano de Obra */}
        <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '14px', borderRadius: '12px', marginBottom: '16px' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="var(--brand-cyan)" />
            Tiempos de Fabricación (Minutos)
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
                onChange={e => setTiempoPinturaMin(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
          </div>
        </div>

        {/* MÚLTIPLES PINTURAS Y PRIMERS DINÁMICOS */}
        <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '14px', borderRadius: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={14} color="var(--brand-cyan)" />
              Pinturas, Primers y Barnices ({pinturasSeleccionadas.length})
            </label>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handleAddPintura}
            >
              <Plus size={14} />
              <span>Agregar Pintura</span>
            </button>
          </div>

          {pinturasSeleccionadas.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sin pinturas asignadas a esta pieza.</p>
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
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MÚLTIPLES HERRAJES, BISUTERÍA Y EMPAQUES DINÁMICOS */}
        <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '14px', borderRadius: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} color="var(--brand-cyan)" />
              Herrajes, Bisutería & Empaques ({herrajesSeleccionados.length})
            </label>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handleAddHerraje}
            >
              <Plus size={14} />
              <span>Agregar Herraje / Insumo</span>
            </button>
          </div>

          {herrajesSeleccionados.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sin herrajes ni empaques adicionales.</p>
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
                    <option value="">Selecciona herraje / empaque...</option>
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
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
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
