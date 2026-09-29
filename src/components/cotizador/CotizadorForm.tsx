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
  Info
} from 'lucide-react';
import { 
  Resina, 
  Maquina, 
  Insumo, 
  Personal, 
  ConfiguracionTaller, 
  PiezaCotizada 
} from '../../types';
import { calcularPieza3D, ParametrosPiezaInput } from '../../services/calculationEngine';

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
  onAgregarPieza: (pieza: PiezaCotizada) => void;
  onOpenSTLViewer?: () => void;
  initialPieceData?: {
    altoMm?: number;
    anchoMm?: number;
    profundidadMm?: number;
    pesoResinaG?: number;
    nombrePieza?: string;
  } | null;
}

export const CotizadorForm: React.FC<CotizadorFormProps> = ({
  resinas,
  maquinas,
  insumos,
  personal,
  config,
  onAgregarPieza,
  onOpenSTLViewer,
  initialPieceData
}) => {
  // Estado básico
  const [nombreItem, setNombreItem] = useState('Figura Coleccionable');
  const [cantidad, setCantidad] = useState(1);
  const [altoMm, setAltoMm] = useState(60);
  const [anchoMm, setAnchoMm] = useState(60);
  const [profundidadMm, setProfundidadMm] = useState(60);

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
      if (initialPieceData.nombrePieza) setNombreItem(initialPieceData.nombrePieza);
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

  // Selecciones activas
  const resinaActual = resinas.find(r => r.id === resinaId) || resinas[0];
  const maquinaActual = maquinas.find(m => m.id === maquinaId) || maquinas[0];
  const estacionCurado = maquinas.find(m => m.tipo.toLowerCase().includes('curad')) || maquinas[1];
  const insumoCurado = insumos.find(i => i.nombre.toLowerCase().includes('etanol') || i.nombre.toLowerCase().includes('alcohol'));

  // Manejo de imagen
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
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
      pesoResinaManualG: Number(pesoResinaManualG) || 0,
      datosPendientes: esParcial,
      notasPendientes
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
    insumos
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calculoEnVivo) return;
    onAgregarPieza(calculoEnVivo);
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <span style={{ color: 'var(--brand-cyan)', fontWeight: 700 }}>🧭 Guía de Ejes:</span>
            <span><strong>Z</strong> = Altura Vertical ↕️ (define el tiempo de resina)</span>
            <span>•</span>
            <span><strong>X</strong> = Ancho Horizontal ↔️ (de lado a lado)</span>
            <span>•</span>
            <span><strong>Y</strong> = Profundidad / Fondo ↗️ (adelante a atrás)</span>
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
                  value={altoMm} 
                  onChange={e => setAltoMm(Math.max(0, parseFloat(e.target.value) || 0))} 
                  title="Alto vertical en Z (de base a corona)"
                  placeholder="Alto"
                />
                <span className="input-unit-badge">mm (Z)</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'block', marginTop: '3px' }}>
                ↕️ Base a corona (Vertical)
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
                  value={anchoMm} 
                  onChange={e => setAnchoMm(Math.max(0, parseFloat(e.target.value) || 0))} 
                  title="Ancho horizontal en X (de lado a lado)"
                  placeholder="Ancho"
                />
                <span className="input-unit-badge">mm (X)</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'block', marginTop: '3px' }}>
                ↔️ Lado a lado (Frente)
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
                  value={profundidadMm} 
                  onChange={e => setProfundidadMm(Math.max(0, parseFloat(e.target.value) || 0))} 
                  title="Profundidad en Y (de adelante hacia atrás)"
                  placeholder="Prof"
                />
                <span className="input-unit-badge">mm (Y)</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'block', marginTop: '3px' }}>
                ↗️ Adelante a atrás (Fondo)
              </span>
            </div>
          </div>
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
          {modoCalculoResina === 'manual' && (
            <p style={{ fontSize: '0.75rem', color: 'var(--brand-cyan)', marginTop: '6px' }}>
              💡 Ingresa los gramos de resina que indica Lychee / Chitubox para la pieza hueca con soportes.
            </p>
          )}
          {modoCalculoResina === 'volumen' && (
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              💡 <strong>Cálculo por Volumen:</strong> Asume un 30% de llenado de la caja envolvente (estándar para figuras y piezas de resina ahuecadas). Para mayor precisión, carga el archivo en el <strong>Visor STL 3D</strong> o ingresa <strong>Gramos Exactos</strong> del Slicer.
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

        {/* Subir Foto / Render de la Pieza */}
        <div className="form-group">
          <label className="form-label">
            <ImageIcon size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Foto o Render de Referencia
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              Subir Foto desde Celular
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={handleImageUpload} 
                style={{ display: 'none' }} 
              />
            </label>
            {imagenUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img 
                  src={imagenUrl} 
                  alt="Previsualización" 
                  style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} 
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-success)' }}>Foto cargada ✓</span>
              </div>
            )}
          </div>
        </div>

        {/* BARRA DE CÁLCULO EN VIVO */}
        {calculoEnVivo && (
          <div className="live-summary-card">
            <div className="live-metrics-grid">
              <div className="metric-item">
                <div className="metric-label">Peso Resina</div>
                <div className="metric-value">{calculoEnVivo.peso_estimado_g} g</div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                  {modoCalculoResina === 'manual' ? 'Modo exacto' : 'Volumen sólido'}
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
                <div className="price-hero-label">Precio Unitario Sugerido</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Total ({cantidad} unid.): ${(calculoEnVivo.precio_total).toLocaleString('es-CO')} COP
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
    </div>
  );
};
