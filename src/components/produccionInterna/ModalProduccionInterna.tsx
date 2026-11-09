import React, { useState, useMemo } from 'react';
import { 
  X, 
  FlaskConical, 
  Sparkles, 
  Trash2, 
  Calendar, 
  Scale, 
  Clock, 
  DollarSign, 
  CheckCircle,
  AlertTriangle,
  Layers,
  Info
} from 'lucide-react';
import { 
  RegistroProduccionInterna, 
  MotivoProduccionInterna, 
  TecnologiaFabricacion, 
  Filamento, 
  Resina, 
  Maquina, 
  ConfiguracionTaller 
} from '../../types';

interface ModalProduccionInternaProps {
  isOpen: boolean;
  onClose: () => void;
  filamentos: Filamento[];
  resinas: Resina[];
  maquinas: Maquina[];
  config: ConfiguracionTaller;
  producciones: RegistroProduccionInterna[];
  onGuardarProduccion: (registro: RegistroProduccionInterna, descontarStock: boolean) => void;
  onEliminarProduccion: (id: string) => void;
}

const MOTIVOS_CONFIG: Record<MotivoProduccionInterna, { label: string; icon: string; color: string; desc: string }> = {
  EXHIBICION: {
    label: 'Exhibición / Vitrina',
    icon: '✨',
    color: '#38bdf8',
    desc: 'Piezas terminadas para mostrario comercial, ferias o vitrina física.'
  },
  PRUEBA_CALIBRACION: {
    label: 'Prueba / Calibración',
    icon: '🎯',
    color: '#a855f7',
    desc: 'Cubos de calibración, pruebas de tolerancia, temperatura o retracción.'
  },
  MUESTRA_COMERCIAL: {
    label: 'Muestra Cliente',
    icon: '🤝',
    color: '#10b981',
    desc: 'Muestras de color, material o prototipos entregados sin costo al cliente.'
  },
  DESARROLLO_INTERNO: {
    label: 'Desarrollo / I+D',
    icon: '💡',
    color: '#eab308',
    desc: 'Mejoras de taller, adaptadores, soportes de herramientas o prototipos.'
  },
  DESPERDICIO_FALLA: {
    label: 'Falla / Desperdicio',
    icon: '⚠️',
    color: '#ef4444',
    desc: 'Impresiones fallidas, cortes de luz o piezas desechadas por calidad.'
  }
};

export const ModalProduccionInterna: React.FC<ModalProduccionInternaProps> = ({
  isOpen,
  onClose,
  filamentos,
  resinas,
  maquinas,
  config,
  producciones,
  onGuardarProduccion,
  onEliminarProduccion
}) => {
  const [tab, setTab] = useState<'nuevo' | 'historial'>('nuevo');
  
  // Form State
  const [nombrePieza, setNombrePieza] = useState('');
  const [motivo, setMotivo] = useState<MotivoProduccionInterna>('EXHIBICION');
  const [tecnologia, setTecnologia] = useState<TecnologiaFabricacion>('FDM_FILAMENTO');
  const [maquinaId, setMaquinaId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [pesoConsumidoG, setPesoConsumidoG] = useState<number>(30);
  const [tiempoMinutos, setTiempoMinutos] = useState<number>(90);
  const [responsable, setResponsable] = useState('Germán');
  const [notas, setNotas] = useState('');
  const [descontarStock, setDescontarStock] = useState<boolean>(true);

  // Filtrado de máquinas y materiales según tecnología
  const maquinasDisponibles = useMemo(() => {
    return maquinas.filter(m => {
      if (tecnologia === 'FDM_FILAMENTO') {
        return m.tecnologia === 'FDM_FILAMENTO' || m.tipo.toLowerCase().includes('filamento') || m.nombre.toLowerCase().includes('bambu');
      }
      return m.tecnologia === 'SLA_RESINA' || m.tipo.toLowerCase().includes('resina') || m.nombre.toLowerCase().includes('mono');
    });
  }, [maquinas, tecnologia]);

  // Selección automática de máquina si cambia tecnología
  React.useEffect(() => {
    if (maquinasDisponibles.length > 0 && (!maquinaId || !maquinasDisponibles.some(m => m.id === maquinaId))) {
      setMaquinaId(maquinasDisponibles[0].id);
    }
  }, [maquinasDisponibles, maquinaId]);

  // Material seleccionado
  const materialSeleccionado = useMemo(() => {
    if (tecnologia === 'FDM_FILAMENTO') {
      return filamentos.find(f => f.id === materialId) || filamentos[0];
    }
    return resinas.find(r => r.id === materialId) || resinas[0];
  }, [tecnologia, materialId, filamentos, resinas]);

  React.useEffect(() => {
    if (materialSeleccionado && materialSeleccionado.id !== materialId) {
      setMaterialId(materialSeleccionado.id);
    }
  }, [materialSeleccionado, materialId]);

  // Cálculo de costos estimados
  const costoEstimado = useMemo(() => {
    let costoMaterial = 0;
    if (tecnologia === 'FDM_FILAMENTO') {
      const fil = materialSeleccionado as Filamento;
      const cG = fil?.costo_gramo || (fil?.precio_compra ? fil.precio_compra / (fil.peso_bobina_g || 1000) : 70);
      costoMaterial = (pesoConsumidoG || 0) * cG;
    } else {
      const res = materialSeleccionado as Resina;
      const cG = res?.costo_gramo || (res?.precio_compra ? res.precio_compra / (res.peso_g || 1000) : 120);
      costoMaterial = (pesoConsumidoG || 0) * cG;
    }

    const maq = maquinas.find(m => m.id === maquinaId);
    const kw = maq?.consumo_kwh || (tecnologia === 'FDM_FILAMENTO' ? 0.13 : 0.05);
    const horas = (tiempoMinutos || 0) / 60;
    const costoLuz = kw * horas * (config.tarifa_kwh || 834);
    
    return Math.round(costoMaterial + costoLuz);
  }, [tecnologia, materialSeleccionado, pesoConsumidoG, maquinaId, maquinas, tiempoMinutos, config.tarifa_kwh]);

  // Métricas históricas
  const metricas = useMemo(() => {
    const totalPiezas = producciones.length;
    const totalGramos = producciones.reduce((sum, p) => sum + (p.peso_consumido_g || 0), 0);
    const totalCosto = producciones.reduce((sum, p) => sum + (p.costo_total_estimado || 0), 0);
    return { totalPiezas, totalGramos, totalCosto };
  }, [producciones]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombrePieza.trim()) {
      alert('Por favor ingresa un nombre para la pieza.');
      return;
    }

    const maq = maquinas.find(m => m.id === maquinaId);
    const matNombre = tecnologia === 'FDM_FILAMENTO' 
      ? `${(materialSeleccionado as Filamento)?.marca || ''} ${(materialSeleccionado as Filamento)?.tipo || ''} ${(materialSeleccionado as Filamento)?.color || ''}`.trim()
      : `${(materialSeleccionado as Resina)?.marca || ''} ${(materialSeleccionado as Resina)?.tipo || ''} ${(materialSeleccionado as Resina)?.color || ''}`.trim();

    const nuevoRegistro: RegistroProduccionInterna = {
      id: `prod-int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nombre_pieza: nombrePieza.trim(),
      motivo,
      tecnologia,
      material_id: materialId,
      material_nombre: matNombre || 'Material Taller',
      peso_consumido_g: Number(pesoConsumidoG) || 0,
      tiempo_minutos: Number(tiempoMinutos) || 0,
      costo_total_estimado: costoEstimado,
      maquina_id: maquinaId,
      maquina_nombre: maq?.nombre || 'Impresora Taller',
      fecha: new Date().toISOString(),
      responsable,
      notas: notas.trim() || undefined
    };

    onGuardarProduccion(nuevoRegistro, descontarStock);
    setNombrePieza('');
    setNotas('');
    setTab('historial');
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div 
        className="modal-container"
        style={{
          maxWidth: '750px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(56, 189, 248, 0.15)',
              padding: '8px',
              borderRadius: '10px',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              <FlaskConical size={22} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                Producción Interna, Pruebas & Exhibición
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                Registro y costeo de piezas no comerciales con descuento automático de bodega.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Subtabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 20px',
          background: 'rgba(0,0,0,0.2)',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          <button
            type="button"
            className={`btn btn-sm ${tab === 'nuevo' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700, padding: '6px 14px' }}
            onClick={() => setTab('nuevo')}
          >
            ➕ Nuevo Registro
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === 'historial' ? 'btn-cyan' : 'btn-secondary'}`}
            style={{ fontWeight: 700, padding: '6px 14px' }}
            onClick={() => setTab('historial')}
          >
            📜 Historial & Gastos ({producciones.length})
          </button>
        </div>

        {/* Contenido Scrollable */}
        <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
          {tab === 'nuevo' ? (
            <form onSubmit={handleSubmit}>
              {/* Motivo Selector */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                  Motivo de la Producción
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {(Object.keys(MOTIVOS_CONFIG) as MotivoProduccionInterna[]).map(key => {
                    const cfg = MOTIVOS_CONFIG[key];
                    const isSelected = motivo === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setMotivo(key)}
                        style={{
                          background: isSelected ? `${cfg.color}22` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isSelected ? cfg.color : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '8px',
                          padding: '8px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{cfg.icon}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isSelected ? cfg.color : '#e2e8f0' }}>
                          {cfg.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '6px', fontStyle: 'italic' }}>
                  💡 {MOTIVOS_CONFIG[motivo].desc}
                </div>
              </div>

              {/* Nombre de la Pieza */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Nombre de la Pieza / Modelo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Busto Spider-Man Vitrina 12cm / Torre de Calibración PLA / Base Lámpara"
                  value={nombrePieza}
                  onChange={e => setNombrePieza(e.target.value)}
                  required
                />
              </div>

              {/* Grid Tecnología & Máquina */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Tecnología de Fabricación</label>
                  <select
                    className="form-select"
                    value={tecnologia}
                    onChange={e => {
                      const t = e.target.value as TecnologiaFabricacion;
                      setTecnologia(t);
                      if (t === 'FDM_FILAMENTO' && filamentos.length > 0) setMaterialId(filamentos[0].id);
                      if (t === 'SLA_RESINA' && resinas.length > 0) setMaterialId(resinas[0].id);
                    }}
                  >
                    <option value="FDM_FILAMENTO">🧵 Filamento (FDM / FFF)</option>
                    <option value="SLA_RESINA">🧪 Resina (SLA / MSLA)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Impresora Asignada</label>
                  <select
                    className="form-select"
                    value={maquinaId}
                    onChange={e => setMaquinaId(e.target.value)}
                    required
                  >
                    {maquinasDisponibles.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} ({m.tipo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selector de Material con Stock en Vivo */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {tecnologia === 'FDM_FILAMENTO' ? 'Carrete de Filamento' : 'Botella de Resina'}
                </label>
                <select
                  className="form-select"
                  value={materialId}
                  onChange={e => setMaterialId(e.target.value)}
                  style={{ border: '1px solid #38bdf8' }}
                  required
                >
                  {tecnologia === 'FDM_FILAMENTO' ? (
                    filamentos.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.marca} {f.tipo} - {f.color} | Bodega: {Math.round(f.stock_actual_g || 0)}g | ${Math.round(f.costo_gramo || (f.precio_compra / 1000))}/g
                      </option>
                    ))
                  ) : (
                    resinas.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.marca} {r.tipo} - {r.color} | Bodega: {Math.round(r.peso_g || 0)}g | ${Math.round(r.costo_gramo || (r.precio_compra / 1000))}/g
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Grid Peso, Tiempo y Responsable */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Peso Consumido (g)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    className="form-input"
                    value={pesoConsumidoG}
                    onChange={e => setPesoConsumidoG(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Tiempo Impresión (min)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={tiempoMinutos}
                    onChange={e => setTiempoMinutos(parseInt(e.target.value, 10) || 0)}
                    required
                  />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                    {(tiempoMinutos / 60).toFixed(1)} horas
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Responsable</label>
                  <select
                    className="form-select"
                    value={responsable}
                    onChange={e => setResponsable(e.target.value)}
                  >
                    <option value="Germán">Germán</option>
                    <option value="Juan">Juan</option>
                    <option value="Taller WJGEEKS">Taller WJGEEKS</option>
                  </select>
                </div>
              </div>

              {/* Checkbox Descuento Automático de Bodega */}
              <div style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <input
                  type="checkbox"
                  id="chk-descontar-bodega"
                  checked={descontarStock}
                  onChange={e => setDescontarStock(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#38bdf8', cursor: 'pointer' }}
                />
                <label htmlFor="chk-descontar-bodega" style={{ margin: 0, fontSize: '0.84rem', color: '#f1f5f9', cursor: 'pointer' }}>
                  <strong>Descontar {pesoConsumidoG}g automáticamente de bodega</strong>
                  <span style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8' }}>
                    Mantiene el inventario real y exacto sin descuadres en rollos ni botellas.
                  </span>
                </label>
              </div>

              {/* Costo Resumen Card */}
              <div style={{
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#eab308', fontWeight: 700 }}>
                    Costo Interno Absorbido por Taller
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                    Material (${costoEstimado.toLocaleString('es-CO')}) + Energía eléctrica
                  </div>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#facc15' }}>
                  ${costoEstimado.toLocaleString('es-CO')} COP
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontWeight: 800, padding: '10px 20px' }}
                >
                  <CheckCircle size={16} />
                  <span>Guardar y Descontar Insumos</span>
                </button>
              </div>
            </form>
          ) : (
            <div>
              {/* Tarjetas Métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Piezas Producidas</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>{metricas.totalPiezas}</div>
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Gramos Consumidos</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a855f7' }}>{Math.round(metricas.totalGramos)}g</div>
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Gasto Absorbido</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#eab308' }}>
                    ${metricas.totalCosto.toLocaleString('es-CO')}
                  </div>
                </div>
              </div>

              {/* Lista de Registros */}
              {producciones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  <FlaskConical size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p>Aún no hay registros de producción interna ni pruebas.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {producciones.map(p => {
                    const cfg = MOTIVOS_CONFIG[p.motivo] || MOTIVOS_CONFIG.EXHIBICION;
                    return (
                      <div
                        key={p.id}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              background: `${cfg.color}22`,
                              color: cfg.color,
                              border: `1px solid ${cfg.color}44`,
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {cfg.icon} {cfg.label}
                            </span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f1f5f9' }}>
                              {p.nombre_pieza}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.74rem', color: '#94a3b8' }}>
                            <span>🧵 {p.material_nombre}</span>
                            <span>⚖️ {p.peso_consumido_g}g</span>
                            <span>⏱️ {p.tiempo_minutos} min</span>
                            <span>👤 {p.responsable}</span>
                            <span>📅 {new Date(p.fecha).toLocaleDateString('es-CO')}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Costo Taller</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#eab308' }}>
                              ${p.costo_total_estimado.toLocaleString('es-CO')}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px', color: '#ef4444' }}
                            onClick={() => {
                              if (confirm(`¿Eliminar el registro de ${p.nombre_pieza}?`)) {
                                onEliminarProduccion(p.id);
                              }
                            }}
                            title="Eliminar registro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
