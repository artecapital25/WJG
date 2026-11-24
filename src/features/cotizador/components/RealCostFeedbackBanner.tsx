import React, { useMemo } from 'react';
import { Activity, Sparkles, AlertTriangle } from 'lucide-react';
import { ConsumoRealProduccion, PromedioConsumoReal, TecnologiaFabricacion } from '../../../types';

interface RealCostFeedbackBannerProps {
  consumosReales?: ConsumoRealProduccion[];
  tecnologia: TecnologiaFabricacion;
  altoMm: number;
  onAplicarPromedios: (promedio: PromedioConsumoReal) => void;
}

function getRangoAltura(altoMm: number): PromedioConsumoReal['rango_altura'] {
  if (altoMm <= 80) return 'PEQUENA_HASTA_8CM';
  if (altoMm <= 180) return 'MEDIANA_8_18CM';
  return 'GRANDE_MAS_18CM';
}

export const RealCostFeedbackBanner: React.FC<RealCostFeedbackBannerProps> = ({
  consumosReales = [],
  tecnologia,
  altoMm,
  onAplicarPromedios
}) => {
  const resumen = useMemo<PromedioConsumoReal | null>(() => {
    if (!consumosReales || consumosReales.length === 0) return null;
    const rangoActual = getRangoAltura(altoMm);

    let filtrados = consumosReales.filter(
      c => c.tecnologia === tecnologia && getRangoAltura(c.altura_referencia_mm || 0) === rangoActual
    );
    let rangoUsado: PromedioConsumoReal['rango_altura'] = rangoActual;

    if (filtrados.length === 0) {
      filtrados = consumosReales.filter(c => c.tecnologia === tecnologia);
      rangoUsado = 'GENERAL';
    }
    if (filtrados.length === 0) return null;

    let sumDesv = 0;
    let countDesv = 0;
    let sumMat = 0;
    let countMat = 0;
    let sumExtras = 0;
    let sumMo = 0;
    let fallos = 0;

    filtrados.forEach(reg => {
      const cant = Math.max(1, reg.cantidad_piezas || 1);
      if (reg.material_estimado_g && reg.material_estimado_g > 0 && reg.material_real_g !== undefined) {
        sumDesv += ((reg.material_real_g - reg.material_estimado_g) / reg.material_estimado_g) * 100;
        countDesv++;
      }
      if (reg.material_real_g && reg.material_real_g > 0) {
        sumMat += reg.material_real_g / cant;
        countMat++;
      }
      const extrasNoCotizados = (reg.insumos_consumidos || [])
        .filter(i => !i.estaba_cotizado)
        .reduce((s, i) => s + (Number(i.costo_total) || 0), 0);
      sumExtras += (extrasNoCotizados > 0 ? extrasNoCotizados : (reg.costo_insumos_reales || 0)) / cant;
      sumMo += (reg.tiempo_real_mano_obra_min || 0) / cant;
      if (reg.hubo_fallo) fallos++;
    });

    return {
      tecnologia,
      etapa: 'TALLER_IMPRESION',
      rango_altura: rangoUsado,
      total_registros: filtrados.length,
      desviacion_material_pct: countDesv > 0 ? Number((sumDesv / countDesv).toFixed(1)) : 0,
      promedio_material_real_g: countMat > 0 ? Number((sumMat / countMat).toFixed(1)) : 0,
      promedio_insumos_extras_por_pieza: Math.round(sumExtras / filtrados.length),
      promedio_mano_obra_min_por_pieza: Math.round(sumMo / filtrados.length),
      tasa_fallo_real_pct: Number(((fallos / filtrados.length) * 100).toFixed(1))
    };
  }, [consumosReales, tecnologia, altoMm]);

  if (!resumen) return null;

  const rangoLabel = resumen.rango_altura === 'PEQUENA_HASTA_8CM'
    ? 'hasta 8 cm'
    : resumen.rango_altura === 'MEDIANA_8_18CM'
      ? '8 a 18 cm'
      : resumen.rango_altura === 'GRANDE_MAS_18CM'
        ? '+18 cm'
        : 'histórico general';

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(56, 189, 248, 0.08) 100%)',
      border: '1px solid rgba(16, 185, 129, 0.35)',
      borderRadius: '12px',
      padding: '12px 14px',
      marginBottom: '14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap'
    }}>
      <div style={{ flex: 1, minWidth: '240px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#34d399' }}>
          <Activity size={15} />
          <span>Datos Reales del Taller ({resumen.total_registros} registro(s) • {rangoLabel})</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '4px' }} className="tabular-nums">
          <span>
            📊 Desviación material:{' '}
            <strong style={{ color: resumen.desviacion_material_pct > 5 ? '#fbbf24' : '#34d399' }}>
              {resumen.desviacion_material_pct >= 0 ? `+${resumen.desviacion_material_pct}%` : `${resumen.desviacion_material_pct}%`}
            </strong>
          </span>
          <span>
            🧤 Insumos reales/pieza:{' '}
            <strong style={{ color: '#38bdf8' }}>${resumen.promedio_insumos_extras_por_pieza.toLocaleString('es-CO')} COP</strong>
          </span>
          {resumen.tasa_fallo_real_pct > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#fca5a5' }}>
              <AlertTriangle size={12} /> Fallo real: <strong>{resumen.tasa_fallo_real_pct}%</strong>
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-sm"
        onClick={() => onAplicarPromedios(resumen)}
        style={{
          background: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 0.5)',
          color: '#6ee7b7',
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}
      >
        <Sparkles size={14} />
        <span>Aplicar promedios reales</span>
      </button>
    </div>
  );
};
