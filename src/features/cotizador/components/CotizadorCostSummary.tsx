import React from 'react';
import { DollarSign, PlusCircle } from 'lucide-react';
import { PiezaCotizada } from '../../../types';

interface CotizadorCostSummaryProps {
  margenGanancia: number;
  setMargenGanancia: (val: number) => void;
  costoModeloComprado: number;
  setCostoModeloComprado: (val: number) => void;
  calculoEnVivo: PiezaCotizada | null;
  modoCalculoResina: 'volumen' | 'manual';
  tipoEstructura: 'solido' | 'ahuecado';
  porcentajeRelleno: number;
  cantidad: number;
  piezaEnEdicion?: PiezaCotizada | null;
}

export const CotizadorCostSummary: React.FC<CotizadorCostSummaryProps> = ({
  margenGanancia,
  setMargenGanancia,
  costoModeloComprado,
  setCostoModeloComprado,
  calculoEnVivo,
  modoCalculoResina,
  tipoEstructura,
  porcentajeRelleno,
  cantidad,
  piezaEnEdicion
}) => {
  return (
    <>
      {/* Margen de Ganancia y Costo Modelo STL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="form-group" style={{ margin: 0 }}>
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

        <div className="form-group" style={{ margin: 0 }}>
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

      {/* Barra de Cálculo en Vivo */}
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

      {/* Botón de Agregar / Actualizar */}
      <div style={{ marginTop: '20px' }}>
        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ 
            width: '100%',
            ...(piezaEnEdicion ? { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderColor: '#f59e0b', color: '#000', fontWeight: 800 } : {})
          }}
        >
          <PlusCircle size={18} />
          <span>{piezaEnEdicion ? 'Guardar Cambios en este Ítem' : 'Agregar Pieza a la Cotización'}</span>
        </button>
      </div>
    </>
  );
};
