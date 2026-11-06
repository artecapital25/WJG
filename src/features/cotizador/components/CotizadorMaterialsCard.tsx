import React from 'react';
import { Scale, Zap, Layers, Flame, Cpu } from 'lucide-react';
import { Resina, Maquina, PiezaCotizada, TecnologiaFabricacion } from '../../../types';

interface CotizadorMaterialsCardProps {
  resinas: Resina[];
  resinaId: string;
  setResinaId: (val: string) => void;
  resinaActual?: Resina;
  modoCalculoResina: 'volumen' | 'manual';
  setModoCalculoResina: (val: 'volumen' | 'manual') => void;
  pesoResinaManualG: number;
  setPesoResinaManualG: (val: number) => void;
  tipoEstructura: 'solido' | 'ahuecado';
  setTipoEstructura: (val: 'solido' | 'ahuecado') => void;
  porcentajeRelleno: number;
  setPorcentajeRelleno: (val: number) => void;
  maquinas: Maquina[];
  maquinaId: string;
  setMaquinaId: (val: string) => void;
  maquinaActual?: Maquina;
  tiempoImpresionModo: 'auto' | 'manual';
  setTiempoImpresionModo: (val: 'auto' | 'manual') => void;
  tiempoImpresionManualMin: number;
  setTiempoImpresionManualMin: (val: number) => void;
  altoMm: number;
  calculoEnVivo: PiezaCotizada | null;

  // Props Multi-Fabricación
  tecnologia?: TecnologiaFabricacion;
  setTecnologia?: (val: TecnologiaFabricacion) => void;
  materialFilamento?: string;
  setMaterialFilamento?: (val: string) => void;
  pesoFilamentoG?: number;
  setPesoFilamentoG?: (val: number) => void;
  costoRolloKg?: number;
  setCostoRolloKg?: (val: number) => void;
  tiempoFDMMin?: number;
  setTiempoFDMMin?: (val: number) => void;
  materialLamina?: string;
  setMaterialLamina?: (val: string) => void;
  espesorLaminaMm?: number;
  setEspesorLaminaMm?: (val: number) => void;
  longitudCorteMm?: number;
  setLongitudCorteMm?: (val: number) => void;
  costoMetroCuadradoLamina?: number;
  setCostoMetroCuadradoLamina?: (val: number) => void;
  tiempoLaserMin?: number;
  setTiempoLaserMin?: (val: number) => void;
  tipoProcesoLaser?: 'corte' | 'grabado' | 'ambos';
  setTipoProcesoLaser?: (val: 'corte' | 'grabado' | 'ambos') => void;
  materialBloque?: string;
  setMaterialBloque?: (val: string) => void;
  costoBloqueMaterial?: number;
  setCostoBloqueMaterial?: (val: number) => void;
  tiempoMecanizadoMin?: number;
  setTiempoMecanizadoMin?: (val: number) => void;
}

export const CotizadorMaterialsCard: React.FC<CotizadorMaterialsCardProps> = ({
  resinas,
  resinaId,
  setResinaId,
  resinaActual,
  modoCalculoResina,
  setModoCalculoResina,
  pesoResinaManualG,
  setPesoResinaManualG,
  tipoEstructura,
  setTipoEstructura,
  porcentajeRelleno,
  setPorcentajeRelleno,
  maquinas,
  maquinaId,
  setMaquinaId,
  maquinaActual,
  tiempoImpresionModo,
  setTiempoImpresionModo,
  tiempoImpresionManualMin,
  setTiempoImpresionManualMin,
  altoMm,
  calculoEnVivo,
  tecnologia = 'SLA_RESINA',
  setTecnologia,
  materialFilamento = 'PLA',
  setMaterialFilamento,
  pesoFilamentoG = 45,
  setPesoFilamentoG,
  costoRolloKg = 85000,
  setCostoRolloKg,
  tiempoFDMMin = 180,
  setTiempoFDMMin,
  materialLamina = 'Acrílico Cristal 3mm',
  setMaterialLamina,
  espesorLaminaMm = 3,
  setEspesorLaminaMm,
  tiempoLaserMin = 15,
  setTiempoLaserMin,
  tipoProcesoLaser = 'corte',
  setTipoProcesoLaser,
  materialBloque = 'Madera Cedro / MDF',
  setMaterialBloque,
  costoBloqueMaterial = 35000,
  setCostoBloqueMaterial,
  tiempoMecanizadoMin = 45,
  setTiempoMecanizadoMin
}) => {
  return (
    <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
      
      {/* Selector de Tecnología de Fabricación */}
      <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--brand-cyan)' }}>
            <Zap size={15} color="var(--brand-cyan)" />
            Tecnología de Fabricación
          </label>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Permite combinar múltiples tecnologías en una sola cotización
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${tecnologia === 'SLA_RESINA' ? 'btn-cyan' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', fontWeight: 700 }}
            onClick={() => setTecnologia && setTecnologia('SLA_RESINA')}
          >
            <span>🖨️</span>
            <span>SLA Resina</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${tecnologia === 'FDM_FILAMENTO' ? 'btn-cyan' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', fontWeight: 700 }}
            onClick={() => setTecnologia && setTecnologia('FDM_FILAMENTO')}
          >
            <span>🧵</span>
            <span>FDM Filamento</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${tecnologia === 'CORTE_LASER' || tecnologia === 'GRABADO_LASER' ? 'btn-cyan' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', fontWeight: 700 }}
            onClick={() => setTecnologia && setTecnologia('CORTE_LASER')}
          >
            <span>⚡</span>
            <span>Corte Láser</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${tecnologia === 'CNC_ROUTER' ? 'btn-cyan' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', fontWeight: 700 }}
            onClick={() => setTecnologia && setTecnologia('CNC_ROUTER')}
          >
            <span>🪵</span>
            <span>Router CNC</span>
          </button>
        </div>
      </div>

      {/* 1. MODO SLA RESINA */}
      {tecnologia === 'SLA_RESINA' && (
        <>
          {/* Selector de Modo de Resina */}
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
              <label className="form-label">Tipo de Resina</label>
              <select 
                className="form-select"
                value={resinaId}
                onChange={e => setResinaId(e.target.value)}
              >
                {resinas.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.tipo} ({r.color}) — ${r.precio_compra.toLocaleString('es-CO')}
                  </option>
                ))}
              </select>
            </div>

            {modoCalculoResina === 'manual' && (
              <div>
                <label className="form-label">Peso Slicer (Gramos)</label>
                <div className="input-with-unit">
                  <input 
                    type="number" 
                    className="form-input" 
                    value={pesoResinaManualG}
                    onChange={e => setPesoResinaManualG(Math.max(1, parseFloat(e.target.value) || 0))}
                    placeholder="Gramos"
                    step="0.5"
                  />
                  <span className="input-unit-badge">g</span>
                </div>
              </div>
            )}
          </div>

          {/* Selector de Estructura y Vaciado */}
          {modoCalculoResina === 'volumen' && (
            <div style={{ marginTop: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Estructura Interna del Modelo
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${tipoEstructura === 'solido' ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    onClick={() => setTipoEstructura('solido')}
                  >
                    Sólido (100%)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${tipoEstructura === 'ahuecado' ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    onClick={() => setTipoEstructura('ahuecado')}
                  >
                    Ahuecado / Vaciado
                  </button>
                </div>
              </div>

              {tipoEstructura === 'ahuecado' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Porcentaje estimado de masa efectiva:</span>
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

          {/* Proceso 1: Impresora 3D Principal */}
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>
                🖨️ Proceso 1: Impresión 3D SLA
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
                  : `Tiempo manual: ${Math.floor(tiempoImpresionManualMin / 60)}h ${tiempoImpresionManualMin % 60}m`}
              </span>
              <span style={{ color: 'var(--brand-cyan)', fontWeight: 600 }}>
                Energía: ${Math.round((calculoEnVivo?.tiempo_impresion_min || 0) * (maquinaActual?.costo_minuto || 6.255)).toLocaleString('es-CO')} COP
              </span>
            </div>
          </div>
        </>
      )}

      {/* 2. MODO FDM FILAMENTO */}
      {tecnologia === 'FDM_FILAMENTO' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label className="form-label">Material de Filamento</label>
              <select
                className="form-select"
                value={materialFilamento}
                onChange={e => setMaterialFilamento && setMaterialFilamento(e.target.value)}
              >
                <option value="PLA">PLA Estándar (Fácil impresión / Figuras)</option>
                <option value="PLA+">PLA+ / PLA Pro (Mayor resistencia)</option>
                <option value="PETG">PETG (Resistente UV y químico)</option>
                <option value="ABS">ABS / ASA (Alta temperatura / Exterior)</option>
                <option value="TPU">TPU Flexible (Elastómero / Piezas de goma)</option>
                <option value="NYLON">Nylon / Poliamida (Mecánico / Engranajes)</option>
                <option value="FIBRA_CARBONO">PLA/PETG Fibra de Carbono (Rígido)</option>
              </select>
            </div>

            <div>
              <label className="form-label">Peso del Modelo (Slicer Cura/Prusa/Bambu)</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  className="form-input"
                  value={pesoFilamentoG}
                  onChange={e => setPesoFilamentoG && setPesoFilamentoG(Math.max(1, parseFloat(e.target.value) || 1))}
                  placeholder="Gramos"
                  step="1"
                />
                <span className="input-unit-badge">g</span>
              </div>
            </div>

            <div>
              <label className="form-label">Costo Rollo Filamento ($/kg)</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  className="form-input"
                  value={costoRolloKg}
                  onChange={e => setCostoRolloKg && setCostoRolloKg(Math.max(1000, parseFloat(e.target.value) || 85000))}
                  placeholder="COP por kg"
                  step="1000"
                />
                <span className="input-unit-badge">$/kg</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
            <div>
              <label className="form-label">Impresora FDM</label>
              <select
                className="form-select"
                value={maquinaId}
                onChange={e => setMaquinaId(e.target.value)}
              >
                {maquinas.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} ({m.tipo}) — {m.consumo_kwh} kW/h
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Tiempo Estimado Slicer</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  className="form-input"
                  value={tiempoFDMMin}
                  onChange={e => setTiempoFDMMin && setTiempoFDMMin(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="Minutos"
                />
                <span className="input-unit-badge">min</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.08)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            💡 <strong>FDM:</strong> {Math.floor(tiempoFDMMin / 60)}h {tiempoFDMMin % 60}m • Material: {pesoFilamentoG}g a ${(pesoFilamentoG * (costoRolloKg / 1000)).toLocaleString('es-CO')} COP • Incluye amortización de boquilla y consumo de cama caliente.
          </div>
        </div>
      )}

      {/* 3. MODO CORTE / GRABADO LÁSER */}
      {(tecnologia === 'CORTE_LASER' || tecnologia === 'GRABADO_LASER') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label className="form-label">Tipo de Proceso Láser</label>
              <select
                className="form-select"
                value={tipoProcesoLaser}
                onChange={e => setTipoProcesoLaser && setTipoProcesoLaser(e.target.value as any)}
              >
                <option value="corte">Corte Vectorial Continuo</option>
                <option value="grabado">Grabado Rasterizado / Superficie</option>
                <option value="ambos">Corte + Grabado Combinado</option>
              </select>
            </div>

            <div>
              <label className="form-label">Material de Lámina</label>
              <select
                className="form-select"
                value={materialLamina}
                onChange={e => setMaterialLamina && setMaterialLamina(e.target.value)}
              >
                <option value="Acrílico Cristal 3mm">Acrílico Cristal 3mm</option>
                <option value="Acrílico Cristal 4mm">Acrílico Cristal 4mm</option>
                <option value="Acrílico Color 3mm">Acrílico Color 3mm (Negro / Blanco / Humo)</option>
                <option value="MDF 3mm">MDF 3mm</option>
                <option value="MDF 5.5mm">MDF 5.5mm</option>
                <option value="Triplex Pino 4mm">Triplex Pino 4mm</option>
                <option value="Cuero Sintético">Cuero Sintético / Foamy</option>
              </select>
            </div>

            <div>
              <label className="form-label">Espesor Lámina</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  className="form-input"
                  value={espesorLaminaMm}
                  onChange={e => setEspesorLaminaMm && setEspesorLaminaMm(Math.max(1, parseFloat(e.target.value) || 1))}
                  placeholder="Espesor mm"
                  step="0.5"
                />
                <span className="input-unit-badge">mm</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
            <div>
              <label className="form-label">Máquina Láser CO₂</label>
              <select
                className="form-select"
                value={maquinaId}
                onChange={e => setMaquinaId(e.target.value)}
              >
                {maquinas.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} ({m.tipo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Tiempo Máquina Láser</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  className="form-input"
                  value={tiempoLaserMin}
                  onChange={e => setTiempoLaserMin && setTiempoLaserMin(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="Minutos"
                />
                <span className="input-unit-badge">min</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.08)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
            ⚡ <strong>Láser:</strong> Proceso {tipoProcesoLaser.toUpperCase()} en {materialLamina} • Tiempo: {tiempoLaserMin} minutos • Amortización de tubo láser + chiller y extracción de humos incluidos.
          </div>
        </div>
      )}

      {/* 4. MODO ROUTER CNC */}
      {tecnologia === 'CNC_ROUTER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label className="form-label">Material de Bloque / Tablero</label>
              <select
                className="form-select"
                value={materialBloque}
                onChange={e => setMaterialBloque && setMaterialBloque(e.target.value)}
              >
                <option value="Madera Cedro / Pino">Madera Cedro / Pino Macizo</option>
                <option value="MDF 15mm / 18mm">MDF 15mm / 18mm Industrial</option>
                <option value="Nylamid / Poliacetal">Nylamid / Poliacetal / Delrin</option>
                <option value="Aluminio 6061">Aluminio 6061 / Dural</option>
                <option value="Acrílico Grueso 10mm">Acrílico 10mm / 15mm</option>
              </select>
            </div>

            <div>
              <label className="form-label">Costo Material Bloque ($ COP)</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  className="form-input"
                  value={costoBloqueMaterial}
                  onChange={e => setCostoBloqueMaterial && setCostoBloqueMaterial(Math.max(1000, parseFloat(e.target.value) || 35000))}
                  placeholder="Costo material"
                  step="5000"
                />
                <span className="input-unit-badge">COP</span>
              </div>
            </div>

            <div>
              <label className="form-label">Tiempo de Mecanizado</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  className="form-input"
                  value={tiempoMecanizadoMin}
                  onChange={e => setTiempoMecanizadoMin && setTiempoMecanizadoMin(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="Minutos"
                />
                <span className="input-unit-badge">min</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            🪵 <strong>Router CNC:</strong> Bloque {materialBloque} • Mecanizado: {tiempoMecanizadoMin} min • Incluye desgaste de fresa y potencia de spindle industrial.
          </div>
        </div>
      )}

    </div>
  );
};
