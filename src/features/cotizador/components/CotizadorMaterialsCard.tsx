import React from 'react';
import { Scale } from 'lucide-react';
import { Resina, Maquina, PiezaCotizada } from '../../../types';

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
  calculoEnVivo
}) => {
  return (
    <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
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
              🧱 <strong>Modo Sólido:</strong> Volumen = <strong>{calculoEnVivo?.volumen_cm3 || 0} cm³</strong> | Peso macizo = <strong>{calculoEnVivo?.peso_estimado_g || 0} g</strong>. Aplica merma de taller y soportes oficiales.
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

      {/* Proceso 1: Impresora 3D Principal */}
      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>
            🖨️ Proceso 1: Impresión 3D Principal
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
    </div>
  );
};
