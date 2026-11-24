import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  DollarSign,
  Lock,
  PlusCircle,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { ModoMargen, PiezaCotizada, TipoObjetivoPrecio } from '../../../types';

interface CotizadorCostSummaryProps {
  margenGanancia: number;
  setMargenGanancia: (val: number) => void;
  modoMargen: ModoMargen;
  setModoMargen: (val: ModoMargen) => void;
  tipoObjetivoPrecio: TipoObjetivoPrecio;
  setTipoObjetivoPrecio: (val: TipoObjetivoPrecio) => void;
  gananciaDeseadaCop: number;
  setGananciaDeseadaCop: (val: number) => void;
  calculoEnVivo: PiezaCotizada | null;
  modoCalculoResina: 'volumen' | 'manual';
  tipoEstructura: 'solido' | 'ahuecado';
  porcentajeRelleno: number;
  cantidad: number;
  piezaEnEdicion?: PiezaCotizada | null;
  aplicaDescuentoVolumen?: boolean;
  setAplicaDescuentoVolumen?: (val: boolean) => void;
  descuentoVolumenManual?: number;
  setDescuentoVolumenManual?: (val: number | undefined) => void;
  precioMinimoTrabajo?: number;
  mermaPct?: number;
}

const TIERS_MARGEN = [
  { label: 'Mayorista 25%', value: 0.25 },
  { label: 'Estándar 40%', value: 0.40 },
  { label: 'Pro 60%', value: 0.60 },
  { label: 'Premium 80%', value: 0.80 }
];

const formatCop = (val: number | undefined) =>
  `$${Math.round(val || 0).toLocaleString('es-CO')}`;

export const CotizadorCostSummary: React.FC<CotizadorCostSummaryProps> = ({
  margenGanancia,
  setMargenGanancia,
  modoMargen,
  setModoMargen,
  tipoObjetivoPrecio,
  setTipoObjetivoPrecio,
  gananciaDeseadaCop,
  setGananciaDeseadaCop,
  calculoEnVivo,
  modoCalculoResina,
  tipoEstructura,
  porcentajeRelleno,
  cantidad,
  piezaEnEdicion,
  aplicaDescuentoVolumen = true,
  setAplicaDescuentoVolumen,
  precioMinimoTrabajo = 15000,
  mermaPct = 0.20
}) => {
  const [copiadoWa, setCopiadoWa] = useState(false);

  const tech = calculoEnVivo?.tecnologia || 'SLA_RESINA';
  const maxSlider = modoMargen === 'margen_bruto' ? 0.90 : 1.50;
  const clampedSliderVal = Math.min(margenGanancia, maxSlider);

  const labelMaterial =
    tech === 'FDM_FILAMENTO'
      ? 'Filamento'
      : tech === 'CORTE_LASER' || tech === 'GRABADO_LASER'
      ? 'Lámina / Mat.'
      : tech === 'CNC_ROUTER'
      ? 'Bloque / Mat.'
      : 'Resina SLA';

  const unidadPesoLabel =
    tech === 'CORTE_LASER' || tech === 'GRABADO_LASER'
      ? `${calculoEnVivo?.area_lamina_cm2 || 0} cm²`
      : tech === 'CNC_ROUTER'
      ? `${calculoEnVivo?.material_bloque || 'Bloque'}`
      : `${calculoEnVivo?.peso_estimado_g || 0} g`;

  const detalleMaterial =
    tech === 'FDM_FILAMENTO'
      ? `+${Math.round(mermaPct * 100)}% merma${calculoEnVivo?.ams_activo ? ` + ${calculoEnVivo.ams_purga_gramos || 0}g AMS` : ''}`
      : tech === 'SLA_RESINA'
      ? modoCalculoResina === 'manual'
        ? `+${Math.round(mermaPct * 100)}% merma slicer`
        : tipoEstructura === 'solido'
        ? `Sólido 100% (+${Math.round(mermaPct * 100)}%)`
        : `Ahuecado ${porcentajeRelleno}% (+${Math.round(mermaPct * 100)}%)`
      : calculoEnVivo?.tipo_proceso_laser || 'Proceso Taller';

  const belowMinimum = Boolean(
    calculoEnVivo &&
      precioMinimoTrabajo > 0 &&
      !calculoEnVivo.precio_fijado_tarifa &&
      calculoEnVivo.precio_unitario < precioMinimoTrabajo
  );

  const apartados = calculoEnVivo?.desglose_apartados || [];
  const totalSegmentos =
    (calculoEnVivo?.costo_base_produccion || 0) +
    Math.max(0, calculoEnVivo?.utilidad_neta_unitaria || 0) +
    (calculoEnVivo?.costo_comision_pasarela || 0);

  const handleCopyClienteQuick = () => {
    if (!calculoEnVivo) return;
    const text = [
      `Hola! Te comparto la cotización estimada de *WJGEEKS 3D PRO*:`,
      `• Pieza: ${calculoEnVivo.nombre_item}`,
      `• Cantidad: ${cantidad} und.`,
      `• Valor unitario: ${formatCop(calculoEnVivo.precio_unitario)} COP`,
      `• Total (${cantidad} und.): *${formatCop(calculoEnVivo.precio_total)} COP*`,
      `• Tiempo estimado de entrega: ${calculoEnVivo.tiempo_entrega}`
    ].join('\n');
    navigator.clipboard?.writeText(text).then(() => {
      setCopiadoWa(true);
      setTimeout(() => setCopiadoWa(false), 2000);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* TARJETA STICKY PRINCIPAL (USO INTERNO TALLER) */}
      <div
        className="cotizador-section-card"
        style={{
          border: '1px solid rgba(56, 189, 248, 0.3)',
          background: 'linear-gradient(180deg, rgba(13, 19, 31, 0.96), rgba(7, 10, 16, 0.98))'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={16} color="#38bdf8" />
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-display)' }}>
              Resumen Financiero & Precio
            </span>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.66rem',
              fontWeight: 700,
              color: '#fbbf24',
              background: 'rgba(245, 158, 11, 0.14)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '2px 8px',
              borderRadius: '999px'
            }}
          >
            <Lock size={10} /> USO INTERNO TALLER
          </span>
        </div>

        {/* Switch Dual: Margen Bruto vs Markup */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>
            Fórmula de Rentabilidad (Comparativa en Vivo):
          </div>
          <div className="modo-margen-switch" role="group" aria-label="Modo de cálculo de margen">
            <button
              type="button"
              className={modoMargen === 'margen_bruto' ? 'active' : ''}
              onClick={() => {
                setModoMargen('margen_bruto');
                if (margenGanancia > 0.90) setMargenGanancia(0.90);
              }}
            >
              <div>Margen Bruto</div>
              <div style={{ fontSize: '0.67rem', opacity: 0.85, fontWeight: 600 }} className="tabular-nums">
                {calculoEnVivo ? `${formatCop(calculoEnVivo.precio_con_margen_bruto)} c/u` : 'C / (1 - m)'}
              </div>
            </button>
            <button
              type="button"
              className={modoMargen === 'markup' ? 'active' : ''}
              onClick={() => setModoMargen('markup')}
            >
              <div>Markup</div>
              <div style={{ fontSize: '0.67rem', opacity: 0.85, fontWeight: 600 }} className="tabular-nums">
                {calculoEnVivo ? `${formatCop(calculoEnVivo.precio_con_markup)} c/u` : 'C × (1 + m)'}
              </div>
            </button>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
            {modoMargen === 'margen_bruto'
              ? 'Margen sobre Venta: el % seleccionado queda de utilidad sobre el precio final (máx. 90%).'
              : 'Markup sobre Costo: suma exactamente ese % encima del costo total de taller.'}
          </div>
        </div>

        {/* Toggle % Objetivo vs Ganancia Fija $ COP */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}
        >
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#cbd5e1' }}>
            Objetivo de Precio:
          </span>
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(15, 23, 42, 0.9)',
              borderRadius: '8px',
              padding: '2px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <button
              type="button"
              onClick={() => setTipoObjetivoPrecio('porcentaje')}
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: tipoObjetivoPrecio === 'porcentaje' ? 'rgba(56, 189, 248, 0.22)' : 'transparent',
                color: tipoObjetivoPrecio === 'porcentaje' ? '#38bdf8' : '#94a3b8'
              }}
            >
              % Rentabilidad
            </button>
            <button
              type="button"
              onClick={() => setTipoObjetivoPrecio('ganancia_fija')}
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: tipoObjetivoPrecio === 'ganancia_fija' ? 'rgba(16, 185, 129, 0.22)' : 'transparent',
                color: tipoObjetivoPrecio === 'ganancia_fija' ? '#34d399' : '#94a3b8'
              }}
            >
              $ Ganancia Fija
            </button>
          </div>
        </div>

        {tipoObjetivoPrecio === 'porcentaje' ? (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.76rem', color: '#e2e8f0', fontWeight: 600 }}>
                {modoMargen === 'margen_bruto' ? 'Margen Bruto Objetivo:' : 'Markup Objetivo:'}
              </span>
              <span className="tabular-nums" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8' }}>
                {Math.round(clampedSliderVal * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max={maxSlider}
              step="0.05"
              value={clampedSliderVal}
              onChange={e => setMargenGanancia(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer', marginBottom: '8px' }}
            />
            <div className="tier-price-grid">
              {TIERS_MARGEN.map(tier => {
                const isSelected = Math.abs(margenGanancia - tier.value) < 0.015;
                return (
                  <button
                    key={tier.value}
                    type="button"
                    className={`tier-price-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setMargenGanancia(tier.value)}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ fontSize: '0.74rem' }}>
              <DollarSign size={12} style={{ display: 'inline', marginRight: '2px' }} />
              Ganancia Neta Deseada por Pieza (COP)
            </label>
            <div className="input-with-unit">
              <input
                type="number"
                min="0"
                step="any"
                className="form-input tabular-nums"
                value={gananciaDeseadaCop === 0 ? '' : gananciaDeseadaCop}
                onChange={e =>
                  setGananciaDeseadaCop(e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0))
                }
                placeholder="Ej: 25000"
              />
              <span className="input-unit-badge">COP c/u</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
              Ganancia Inversa: el sistema calcula el precio para que te queden exactamente esos COP libres tras costos y pasarela.
            </div>
          </div>
        )}

        {/* Alerta de Precio Mínimo de Trabajo */}
        {belowMinimum && calculoEnVivo && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              borderRadius: '10px',
              padding: '8px 10px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '0.74rem',
              color: '#fcd34d'
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong>Por debajo del mínimo operativo ({formatCop(precioMinimoTrabajo)} COP):</strong> considera aplicar tarifa mínima o aumentar el margen para cubrir arranque y alistamiento.
            </div>
          </div>
        )}

        {/* HERO BOX: TU PRECIO + GANANCIA NETA + COSTO TALLER */}
        {calculoEnVivo && (
          <>
            <div
              className="price-hero-box"
              style={{
                marginTop: 0,
                marginBottom: '12px',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <div className="price-hero-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>{calculoEnVivo.precio_fijado_tarifa ? 'TARIFA ESTÁNDAR' : 'TU PRECIO UNITARIO'}</span>
                    {calculoEnVivo.tarifa_tamano_aplicada && (
                      <span style={{ fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8', padding: '1px 6px', borderRadius: '4px' }}>
                        {calculoEnVivo.tarifa_tamano_aplicada.altura_cm} cm
                      </span>
                    )}
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
                    Total lote ({cantidad} und.): <strong style={{ color: '#e2e8f0' }}>{formatCop(calculoEnVivo.precio_total)} COP</strong>
                  </div>
                </div>
                <div className="price-hero-amount tabular-nums" style={{ textAlign: 'right' }}>
                  {Boolean(
                    calculoEnVivo.aplica_descuento_volumen &&
                      calculoEnVivo.precio_unitario_original &&
                      calculoEnVivo.precio_unitario_original > calculoEnVivo.precio_unitario
                  ) && (
                    <div style={{ fontSize: '0.78rem', textDecoration: 'line-through', color: '#94a3b8', fontWeight: 500 }}>
                      {formatCop(calculoEnVivo.precio_unitario_original)}
                    </div>
                  )}
                  <div style={{ fontSize: '1.65rem', lineHeight: 1.05 }}>{formatCop(calculoEnVivo.precio_unitario)}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8' }}>COP c/u</div>
                </div>
              </div>

              {/* KPIs Ganancia Neta vs Costo Taller */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', padding: '6px 8px' }}>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase' }}>Ganancia Neta / Lote</div>
                  <div className="tabular-nums" style={{ fontSize: '0.88rem', fontWeight: 800, color: '#34d399' }}>
                    +{formatCop(calculoEnVivo.utilidad_neta_unitaria)} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>({Math.round((calculoEnVivo.margen_real_venta_pct || 0) * 10) / 10}%)</span>
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '0.68rem', color: '#6ee7b7' }}>
                    Lote: +{formatCop(calculoEnVivo.utilidad_neta_total)} COP
                  </div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.65)', borderRadius: '8px', padding: '6px 8px' }}>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase' }}>Costo Real Taller</div>
                  <div className="tabular-nums" style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                    {formatCop(calculoEnVivo.costo_base_produccion)} c/u
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    Lote: {formatCop(calculoEnVivo.costo_base_produccion * cantidad)} COP
                  </div>
                </div>
              </div>

              {/* Barra Apilada de Composición del Precio */}
              {totalSegmentos > 0 && apartados.length > 0 && (
                <div>
                  <div className="stacked-cost-bar" title="Composición visual: costos por apartado + utilidad neta">
                    {apartados.map(ap => {
                      const pct = Math.max(0, (ap.costoUnitario / totalSegmentos) * 100);
                      if (pct < 0.5) return null;
                      return (
                        <div
                          key={ap.clave}
                          style={{ width: `${pct}%`, background: ap.color }}
                          title={`${ap.etiqueta}: Costo ${formatCop(ap.costoUnitario)} (${pct.toFixed(1)}%)`}
                        />
                      );
                    })}
                    {(calculoEnVivo.utilidad_neta_unitaria || 0) > 0 && (
                      <div
                        style={{
                          width: `${((calculoEnVivo.utilidad_neta_unitaria || 0) / totalSegmentos) * 100}%`,
                          background: '#10b981'
                        }}
                        title={`Utilidad Neta: ${formatCop(calculoEnVivo.utilidad_neta_unitaria)}`}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#94a3b8', marginTop: '4px' }}>
                    <span>Composición de costos vs utilidad</span>
                    <span>Entrega: {calculoEnVivo.tiempo_entrega}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Descuento por Volumen */}
            {cantidad >= 2 && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.28)',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ fontSize: '0.73rem' }}>
                  <div style={{ color: '#34d399', fontWeight: 700 }}>
                    Descuento Volumen ({cantidad} und.)
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                    {calculoEnVivo.aplica_descuento_volumen && (calculoEnVivo.descuento_volumen_porcentaje || 0) > 0
                      ? `${calculoEnVivo.descuento_volumen_porcentaje}% OFF • -${formatCop(calculoEnVivo.descuento_volumen_monto)}/u`
                      : 'Escala: 6+ (10%), 12+ (15%), 24+ (20%)'}
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={aplicaDescuentoVolumen}
                    onChange={e => setAplicaDescuentoVolumen?.(e.target.checked)}
                    style={{ width: '15px', height: '15px', accentColor: '#10b981' }}
                  />
                  Aplicar
                </label>
              </div>
            )}

            {/* Métricas Técnicas Rápidas */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                marginBottom: '12px'
              }}
            >
              <div style={{ background: 'rgba(15, 23, 42, 0.65)', borderRadius: '8px', padding: '6px 8px' }}>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>{labelMaterial}</div>
                <div className="tabular-nums" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>{unidadPesoLabel}</div>
                <div style={{ fontSize: '0.62rem', color: '#64748b' }}>{detalleMaterial}</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.65)', borderRadius: '8px', padding: '6px 8px' }}>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>Tiempo Máq.</div>
                <div className="tabular-nums" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                  {Math.floor(calculoEnVivo.tiempo_impresion_min / 60)}h {calculoEnVivo.tiempo_impresion_min % 60}m
                </div>
                <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                  {calculoEnVivo.maquinas_involucradas?.length || 1} equipo(s)
                </div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.65)', borderRadius: '8px', padding: '6px 8px' }}>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>Riesgo + Desg.</div>
                <div className="tabular-nums" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24' }}>
                  {formatCop((calculoEnVivo.costo_repuestos_maquina || 0) + (calculoEnVivo.costo_riesgo_fallo || 0) + (calculoEnVivo.costo_depreciacion_maquina || 0))}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                  Fallo {calculoEnVivo.tasa_fallo_pct || 0}%
                </div>
              </div>
            </div>

            {/* Tabla Control Exhaustivo: Desglose Apartado | Costo | Cobro */}
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>
                  Control por Apartado (Unitario)
                </span>
                <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                  Costo vs Cobro al Cliente
                </span>
              </div>

              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.35fr 0.8fr 0.85fr',
                    padding: '6px 10px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(0,0,0,0.25)'
                  }}
                >
                  <span>Apartado</span>
                  <span style={{ textAlign: 'right' }}>Costo</span>
                  <span style={{ textAlign: 'right' }}>Cobro</span>
                </div>
                <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  {apartados.map(ap => (
                    <div
                      key={ap.clave}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.35fr 0.8fr 0.85fr',
                        padding: '6px 10px',
                        fontSize: '0.74rem',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                      }}
                    >
                      <div style={{ minWidth: 0, paddingRight: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0', fontWeight: 600 }}>
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: ap.color,
                              flexShrink: 0
                            }}
                          />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ap.etiqueta}
                          </span>
                        </div>
                        {ap.esProrrateado && (
                          <span
                            style={{
                              fontSize: '0.6rem',
                              color: '#38bdf8',
                              background: 'rgba(56, 189, 248, 0.12)',
                              padding: '0 4px',
                              borderRadius: '3px',
                              marginLeft: '13px'
                            }}
                          >
                            ÷{cantidad} prorrateado
                          </span>
                        )}
                      </div>
                      <span className="tabular-nums" style={{ textAlign: 'right', color: '#94a3b8' }}>
                        {formatCop(ap.costoUnitario)}
                      </span>
                      <span className="tabular-nums" style={{ textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>
                        {formatCop(ap.cobroUnitario)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Acciones: Agregar Pieza + Copiar Precio Rápido */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              minHeight: '46px',
              ...(piezaEnEdicion
                ? {
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderColor: '#f59e0b',
                    color: '#000',
                    fontWeight: 800
                  }
                : {})
            }}
          >
            {piezaEnEdicion ? <Sparkles size={17} /> : <PlusCircle size={18} />}
            <span>{piezaEnEdicion ? 'Guardar Cambios en este Ítem' : 'Agregar Pieza a la Cotización'}</span>
          </button>

          {calculoEnVivo && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyClienteQuick}
              style={{ width: '100%', justifyContent: 'center', minHeight: '38px' }}
              title="Copia únicamente nombre, cantidad, precio y entrega (sin costos ni márgenes)"
            >
              {copiadoWa ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copiadoWa ? '¡Texto cliente copiado!' : 'Copiar Precio Rápido (Cliente)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
