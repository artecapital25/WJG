import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldAlert, Sliders, Truck, CreditCard, FileCode } from 'lucide-react';
import { NivelComplejidad, PiezaCotizada } from '../../../types';
import { WjgSelect } from '../../../components/ui/WjgSelect';

interface CotizadorAdvancedCostsCardProps {
  modoVista: 'rapido' | 'avanzado';
  cantidad: number;
  costoModeloComprado: number;
  setCostoModeloComprado: (val: number) => void;
  prorratearArchivo3D: boolean;
  setProrratearArchivo3D: (val: boolean) => void;
  nivelComplejidad: NivelComplejidad;
  setNivelComplejidad: (val: NivelComplejidad) => void;
  tasaFalloPct: number;
  setTasaFalloPct: (val: number) => void;
  incluirOverhead: boolean;
  setIncluirOverhead: (val: boolean) => void;
  gastosFijosMensuales: number;
  horasFacturablesMes: number;
  comisionPasarelaPct: number;
  setComisionPasarelaPct: (val: number) => void;
  costoEnvio: number;
  setCostoEnvio: (val: number) => void;
  calculoEnVivo: PiezaCotizada | null;
}

export const CotizadorAdvancedCostsCard: React.FC<CotizadorAdvancedCostsCardProps> = ({
  modoVista,
  cantidad,
  costoModeloComprado,
  setCostoModeloComprado,
  prorratearArchivo3D,
  setProrratearArchivo3D,
  nivelComplejidad,
  setNivelComplejidad,
  tasaFalloPct,
  setTasaFalloPct,
  incluirOverhead,
  setIncluirOverhead,
  gastosFijosMensuales,
  horasFacturablesMes,
  comisionPasarelaPct,
  setComisionPasarelaPct,
  costoEnvio,
  setCostoEnvio,
  calculoEnVivo
}) => {
  const [abierto, setAbierto] = useState(modoVista === 'avanzado');

  React.useEffect(() => {
    if (modoVista === 'avanzado') setAbierto(true);
  }, [modoVista]);

  const costoApartado =
    (calculoEnVivo?.costo_modelo_comprado || 0) +
    (calculoEnVivo?.costo_envio || 0) +
    (calculoEnVivo?.costo_riesgo_fallo || 0) +
    (calculoEnVivo?.costo_gastos_fijos || 0);

  const cobroApartado = (calculoEnVivo?.desglose_apartados || [])
    .filter(d => d.clave === 'archivo_envio' || d.clave === 'riesgo_overhead')
    .reduce((s, d) => s + d.cobroUnitario, 0);

  return (
    <div className="cotizador-section-card">
      <div
        className="cotizador-section-header"
        style={{ cursor: 'pointer' }}
        onClick={() => setAbierto(prev => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={16} color="var(--brand-cyan)" />
          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>
            Archivo 3D, Riesgo de Fallo, Overhead & Pasarela
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="section-subtotal-pill">
            <span className="costo-txt">Costo: ${costoApartado.toLocaleString('es-CO')}</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span className="cobro-txt">Cobro: ${cobroApartado.toLocaleString('es-CO')}</span>
          </span>
          {abierto ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
        </div>
      </div>

      {abierto && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Fila 1: Archivo 3D Comprado + Prorrateo + Envío */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.22)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileCode size={13} color="#ec4899" />
                <span>Archivo 3D Comprado (Total Lote)</span>
              </label>
              <div className="input-with-unit">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="form-input"
                  value={costoModeloComprado === 0 ? '' : costoModeloComprado}
                  onChange={e => setCostoModeloComprado(e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                />
                <span className="input-unit-badge">COP</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={prorratearArchivo3D}
                  onChange={e => setProrratearArchivo3D(e.target.checked)}
                  style={{ accentColor: 'var(--brand-cyan)', width: '15px', height: '15px' }}
                />
                <span>
                  Prorratear entre las {cantidad} unidad(es){cantidad > 1 && costoModeloComprado > 0 ? ` ($${Math.round(costoModeloComprado / cantidad).toLocaleString('es-CO')}/u)` : ''}
                </span>
              </label>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.22)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Truck size={13} color="#38bdf8" />
                <span>Envío / Domicilio (por figura)</span>
              </label>
              <div className="input-with-unit">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="form-input"
                  value={costoEnvio === 0 ? '' : costoEnvio}
                  onChange={e => setCostoEnvio(e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                />
                <span className="input-unit-badge">COP</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', display: 'block', marginTop: '6px' }}>
                Se cobra unitario (sin prorratear lote).
              </span>
            </div>
          </div>

          {/* Fila 2: Complejidad, Tasa de Fallo, Comisión Pasarela y Overhead */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div>
              <label className="form-label">Complejidad Pieza</label>
              <WjgSelect
                value={nivelComplejidad}
                onChange={val => setNivelComplejidad(val as NivelComplejidad)}
                options={[
                  { value: 'simple', label: 'Simple (1.0x)', subtitle: 'Estándar sin sobrecarga' },
                  { value: 'estandar', label: 'Estándar (1.25x)', subtitle: '+25% riesgo & mano obra' },
                  { value: 'complejo', label: 'Complejo (1.6x)', subtitle: 'Soportes densos / multiparte' },
                  { value: 'extremo', label: 'Extremo (2.2x)', subtitle: 'Miniaturas ultra detalle' }
                ]}
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldAlert size={13} color="#ef4444" />
                <span>Tasa de Fallo / Riesgo</span>
              </label>
              <div className="input-with-unit">
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="any"
                  className="form-input"
                  value={tasaFalloPct === 0 ? '' : tasaFalloPct}
                  onChange={e => setTasaFalloPct(e.target.value === '' ? 0 : Math.min(60, Math.max(0, parseFloat(e.target.value) || 0)))}
                  placeholder="0"
                />
                <span className="input-unit-badge">%</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#fca5a5', display: 'block', marginTop: '4px' }}>
                Respaldo: +${(calculoEnVivo?.costo_riesgo_fallo || 0).toLocaleString('es-CO')} COP
              </span>
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CreditCard size={13} color="#ec4899" />
                <span>Comisión Pasarela / Canal</span>
              </label>
              <div className="input-with-unit">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="any"
                  className="form-input"
                  value={comisionPasarelaPct === 0 ? '' : comisionPasarelaPct}
                  onChange={e => setComisionPasarelaPct(e.target.value === '' ? 0 : Math.min(50, Math.max(0, parseFloat(e.target.value) || 0)))}
                  placeholder="0"
                />
                <span className="input-unit-badge">%</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Directo 0%', v: 0 },
                  { label: 'Bold/Card 3.5%', v: 3.5 },
                  { label: 'ML/Etsy 15%', v: 15 }
                ].map(p => (
                  <button
                    key={p.label}
                    type="button"
                    className={`btn btn-sm ${comisionPasarelaPct === p.v ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ minHeight: '28px', padding: '2px 7px', fontSize: '0.68rem' }}
                    onClick={() => setComisionPasarelaPct(p.v)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gastos Fijos Taller (Overhead) */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            padding: '10px 12px'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              🏢 <strong style={{ color: '#fff' }}>Gastos Fijos del Taller (Overhead):</strong>{' '}
              {gastosFijosMensuales > 0
                ? `$${gastosFijosMensuales.toLocaleString('es-CO')}/mes ÷ ${horasFacturablesMes}h = $${Math.round(gastosFijosMensuales / Math.max(1, horasFacturablesMes)).toLocaleString('es-CO')}/h`
                : 'Configura arriendo/internet mensual en Ajustes Taller si deseas prorratearlos.'}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: incluirOverhead ? '#38bdf8' : '#94a3b8' }}>
              <input
                type="checkbox"
                checked={incluirOverhead}
                onChange={e => setIncluirOverhead(e.target.checked)}
                style={{ accentColor: 'var(--brand-cyan)', width: '16px', height: '16px' }}
              />
              <span>Incluir Overhead (${(calculoEnVivo?.costo_gastos_fijos || 0).toLocaleString('es-CO')})</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
