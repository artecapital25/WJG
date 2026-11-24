import React, { useMemo, useState } from 'react';
import {
  Box,
  Check,
  Copy,
  Layers,
  Maximize2,
  Package,
  Scale,
  Truck
} from 'lucide-react';
import { ConfiguracionTaller, Filamento, Maquina, Resina } from '../../types';
import { WjgSelect } from '../ui/WjgSelect';
import {
  calcularCamaMultiPieza,
  calcularEnvioVolumetricoColombia,
  calcularEscala3D,
  convertirVolumenPesoCosto,
  estimarTiempoPorAlturaCapa
} from '../../services/suite3dCalculators';

interface Suite3DProViewProps {
  resinas?: Resina[];
  filamentos?: Filamento[];
  maquinas?: Maquina[];
  config?: ConfiguracionTaller;
}

type ToolId = 'conversor' | 'escala' | 'cama' | 'capa' | 'envio';

const TOOL_TABS: { id: ToolId; label: string; icon: any; color: string }[] = [
  { id: 'conversor', label: 'Volumen / Peso / COP', icon: Scale, color: '#38bdf8' },
  { id: 'escala', label: 'Escala 3D (k³)', icon: Maximize2, color: '#a855f7' },
  { id: 'cama', label: 'Cama Multi-Pieza', icon: Box, color: '#34d399' },
  { id: 'capa', label: 'Altura de Capa', icon: Layers, color: '#fbbf24' },
  { id: 'envio', label: 'Envío Volumétrico CO', icon: Truck, color: '#f472b6' }
];

const fmtCop = (v: number) => `$${Math.round(v || 0).toLocaleString('es-CO')}`;

export const Suite3DProView: React.FC<Suite3DProViewProps> = ({
  resinas = [],
  filamentos = [],
  maquinas = [],
  config
}) => {
  const [activeTool, setActiveTool] = useState<ToolId>('conversor');
  const [copiadoKey, setCopiadoKey] = useState<string | null>(null);

  // 1. Convertidor Volumen / Peso / Metros / COP
  const [convTech, setConvTech] = useState<'SLA_RESINA' | 'FDM_FILAMENTO'>('SLA_RESINA');
  const [convModo, setConvModo] = useState<'volumen_cm3' | 'gramos' | 'metros_filamento'>('volumen_cm3');
  const [convMaterialId, setConvMaterialId] = useState<string>(resinas[0]?.id || filamentos[0]?.id || '');
  const [convValor, setConvValor] = useState<number>(45);
  const [convDensidad, setConvDensidad] = useState<number>(resinas[0]?.densidad_g_cm3 || 1.12);
  const [convCostoG, setConvCostoG] = useState<number>(resinas[0]?.costo_gramo || 90);
  const [convMermaPct, setConvMermaPct] = useState<number>(20);
  const [convDiametro, setConvDiametro] = useState<1.75 | 2.85>(1.75);

  const convResultado = useMemo(
    () =>
      convertirVolumenPesoCosto({
        tecnologia: convTech,
        modoEntrada: convModo,
        valor: convValor,
        densidadGCm3: convDensidad,
        costoGramoCop: convCostoG,
        diametroFilamentoMm: convDiametro,
        mermaPct: convMermaPct
      }),
    [convTech, convModo, convValor, convDensidad, convCostoG, convDiametro, convMermaPct]
  );

  // 2. Calculadora de Escala 3D
  const [escActualMm, setEscActualMm] = useState<number>(100);
  const [escObjetivoMm, setEscObjetivoMm] = useState<number>(160);
  const [escPesoG, setEscPesoG] = useState<number>(65);
  const [escTiempoMin, setEscTiempoMin] = useState<number>(180);
  const [escCostoG, setEscCostoG] = useState<number>(resinas[0]?.costo_gramo || 95);

  const escResultado = useMemo(
    () =>
      calcularEscala3D({
        alturaActualMm: escActualMm,
        alturaObjetivoMm: escObjetivoMm,
        pesoActualG: escPesoG,
        tiempoActualMin: escTiempoMin,
        costoGramoCop: escCostoG
      }),
    [escActualMm, escObjetivoMm, escPesoG, escTiempoMin, escCostoG]
  );

  // 3. Calculadora de Cama Multi-Pieza
  const [camaAnchoMm, setCamaAnchoMm] = useState<number>(256);
  const [camaProfMm, setCamaProfMm] = useState<number>(256);
  const [piezaAnchoMm, setPiezaAnchoMm] = useState<number>(55);
  const [piezaProfMm, setPiezaProfMm] = useState<number>(40);
  const [margenMm, setMargenMm] = useState<number>(4);
  const [cantidadPedido, setCantidadPedido] = useState<number>(50);
  const [tiempoCamaMin, setTiempoCamaMin] = useState<number>(190);

  const camaResultado = useMemo(
    () =>
      calcularCamaMultiPieza({
        camaAnchoMm,
        camaProfMm,
        piezaAnchoMm,
        piezaProfMm,
        margenEntrePiezasMm: margenMm,
        cantidadPedido,
        tiempoPorCamaMin: tiempoCamaMin
      }),
    [camaAnchoMm, camaProfMm, piezaAnchoMm, piezaProfMm, margenMm, cantidadPedido, tiempoCamaMin]
  );

  // 4. Estimador por Altura de Capa
  const [capaTech, setCapaTech] = useState<'SLA_RESINA' | 'FDM_FILAMENTO'>('SLA_RESINA');
  const [capaAlturaMm, setCapaAlturaMm] = useState<number>(140);
  const [capaBaseMm, setCapaBaseMm] = useState<number>(0.05);
  const [capaTiempoBaseMin, setCapaTiempoBaseMin] = useState<number>(240);
  const [capaNuevaMm, setCapaNuevaMm] = useState<number>(0.03);
  const [capaMaqId, setCapaMaqId] = useState<string>(maquinas[0]?.id || '');

  const maqSeleccionada = useMemo(
    () => maquinas.find(m => m.id === capaMaqId) || maquinas[0],
    [maquinas, capaMaqId]
  );

  const capaResultado = useMemo(
    () =>
      estimarTiempoPorAlturaCapa({
        tecnologia: capaTech,
        alturaPiezaMm: capaAlturaMm,
        capaBaseMm,
        tiempoBaseMin: capaTiempoBaseMin,
        capaNuevaMm,
        consumoKwh: maqSeleccionada?.consumo_kwh || 0.08,
        tarifaKwhCop: config?.tarifa_kwh || 834
      }),
    [capaTech, capaAlturaMm, capaBaseMm, capaTiempoBaseMin, capaNuevaMm, maqSeleccionada, config?.tarifa_kwh]
  );

  // 5. Calculadora de Envío Volumétrico Colombia
  const [envLargoCm, setEnvLargoCm] = useState<number>(28);
  const [envAnchoCm, setEnvAnchoCm] = useState<number>(22);
  const [envAltoCm, setEnvAltoCm] = useState<number>(18);
  const [envPesoKg, setEnvPesoKg] = useState<number>(0.8);
  const [envDivisor, setEnvDivisor] = useState<number>(5000);
  const [envDestino, setEnvDestino] = useState<'local_ciudad' | 'nacional_principal' | 'trayecto_especial'>('nacional_principal');

  const envResultado = useMemo(
    () =>
      calcularEnvioVolumetricoColombia({
        largoCm: envLargoCm,
        anchoCm: envAnchoCm,
        altoCm: envAltoCm,
        pesoRealKg: envPesoKg,
        divisorVolumetrico: envDivisor,
        destinoTipo: envDestino
      }),
    [envLargoCm, envAnchoCm, envAltoCm, envPesoKg, envDivisor, envDestino]
  );

  const copiarResumen = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiadoKey(key);
      setTimeout(() => setCopiadoKey(null), 2000);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Selector de Calculadora (5 herramientas) */}
      <div className="subtabs-grid-mobile" style={{ gap: '8px' }}>
        {TOOL_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTool === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTool(tab.id)}
              style={{
                justifyContent: 'flex-start',
                gap: '8px',
                fontWeight: 700,
                borderColor: isActive ? tab.color : undefined
              }}
            >
              <Icon size={15} color={isActive ? '#fff' : tab.color} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. CONVERTIDOR VOLUMEN / PESO / METROS / COSTO */}
      {activeTool === 'conversor' && (
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#38bdf8', fontWeight: 800 }}>
                1. Convertidor Volumen / Metros ⇄ Gramos ⇄ Costo COP
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Conectado al catálogo real de Resinas y Filamentos del taller.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() =>
                copiarResumen(
                  'conv',
                  `Conversión ${convTech === 'SLA_RESINA' ? 'Resina SLA' : 'Filamento FDM'}: ${convResultado.volumenCm3} cm³ = ${convResultado.pesoNetoG} g netos (${convResultado.pesoConMermaG} g con merma) • ${convResultado.metrosFilamento} m • Costo: ${fmtCop(convResultado.costoMaterialCop)} COP`
                )
              }
            >
              {copiadoKey === 'conv' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copiadoKey === 'conv' ? 'Copiado' : 'Copiar Resultado'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Tecnología</label>
              <WjgSelect
                value={convTech}
                onChange={val => {
                  const next = val === 'FDM_FILAMENTO' ? 'FDM_FILAMENTO' : 'SLA_RESINA';
                  setConvTech(next);
                  if (next === 'SLA_RESINA') {
                    const r = resinas[0];
                    setConvMaterialId(r?.id || '');
                    setConvDensidad(r?.densidad_g_cm3 || 1.12);
                    setConvCostoG(r?.costo_gramo || 90);
                    setConvMermaPct(25);
                    if (convModo === 'metros_filamento') setConvModo('volumen_cm3');
                  } else {
                    const f = filamentos[0];
                    setConvMaterialId(f?.id || '');
                    setConvDensidad(f?.densidad_g_cm3 || 1.24);
                    setConvCostoG(f?.costo_gramo || 85);
                    setConvMermaPct(15);
                  }
                }}
                options={[
                  { value: 'SLA_RESINA', label: 'Resina SLA / MSLA' },
                  { value: 'FDM_FILAMENTO', label: 'Filamento FDM / FFF' }
                ]}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Material del Catálogo</label>
              <WjgSelect
                value={convMaterialId}
                onChange={id => {
                  setConvMaterialId(id);
                  if (convTech === 'SLA_RESINA') {
                    const r = resinas.find(x => x.id === id);
                    if (r) {
                      setConvDensidad(r.densidad_g_cm3 || 1.12);
                      setConvCostoG(r.costo_gramo || 0);
                    }
                  } else {
                    const f = filamentos.find(x => x.id === id);
                    if (f) {
                      setConvDensidad(f.densidad_g_cm3 || 1.24);
                      setConvCostoG(f.costo_gramo || 0);
                    }
                  }
                }}
                options={
                  convTech === 'SLA_RESINA'
                    ? resinas.map(r => ({ value: r.id, label: `${r.marca} ${r.tipo} ${r.color}`, subtitle: `$${Math.round(r.costo_gramo)}/g` }))
                    : filamentos.map(f => ({ value: f.id, label: `${f.marca} ${f.tipo} ${f.color}`, subtitle: `$${Math.round(f.costo_gramo)}/g` }))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Dato de Entrada</label>
              <WjgSelect
                value={convModo}
                onChange={v => setConvModo(v as any)}
                options={[
                  { value: 'volumen_cm3', label: 'Volumen / ml (cm³)' },
                  { value: 'gramos', label: 'Peso neto en Gramos (g)' },
                  { value: 'metros_filamento', label: 'Metros de filamento (m)' }
                ]}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Valor ({convModo === 'volumen_cm3' ? 'cm³ / ml' : convModo === 'gramos' ? 'gramos' : 'metros'})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                className="form-input tabular-nums"
                value={convValor === 0 ? '' : convValor}
                onChange={e => setConvValor(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Densidad (g/cm³)</label>
              <input
                type="number"
                min="0.1"
                step="any"
                className="form-input tabular-nums"
                value={convDensidad === 0 ? '' : convDensidad}
                onChange={e => setConvDensidad(e.target.value === '' ? 1.1 : parseFloat(e.target.value) || 1.1)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Costo por Gramo (COP)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="form-input tabular-nums"
                value={convCostoG === 0 ? '' : convCostoG}
                onChange={e => setConvCostoG(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Merma / Soportes (%)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="form-input tabular-nums"
                value={convMermaPct === 0 ? '' : convMermaPct}
                onChange={e => setConvMermaPct(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
              />
            </div>

            {convTech === 'FDM_FILAMENTO' && (
              <div className="form-group">
                <label className="form-label">Diámetro Filamento</label>
                <WjgSelect
                  value={String(convDiametro)}
                  onChange={v => setConvDiametro(v === '2.85' ? 2.85 : 1.75)}
                  options={[
                    { value: '1.75', label: '1.75 mm (Estándar)' },
                    { value: '2.85', label: '2.85 mm (Industrial)' }
                  ]}
                />
              </div>
            )}
          </div>

          <div className="live-metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <div className="metric-item">
              <div className="metric-label">Volumen Neto</div>
              <div className="metric-value tabular-nums">{convResultado.volumenCm3} cm³</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Peso Neto</div>
              <div className="metric-value tabular-nums">{convResultado.pesoNetoG} g</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Peso + Merma ({convMermaPct}%)</div>
              <div className="metric-value tabular-nums" style={{ color: '#fbbf24' }}>{convResultado.pesoConMermaG} g</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Equiv. Filamento</div>
              <div className="metric-value tabular-nums">{convResultado.metrosFilamento} m</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Costo Material Real</div>
              <div className="metric-value tabular-nums" style={{ color: '#34d399' }}>{fmtCop(convResultado.costoMaterialCop)}</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CALCULADORA DE ESCALA 3D */}
      {activeTool === 'escala' && (
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#c084fc', fontWeight: 800 }}>
                2. Calculadora de Escala 3D (Ley Cúbica $k^3$)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Si doblas la altura de una figura, el volumen y consumo de resina/filamento se multiplican por 8×, no por 2×.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() =>
                copiarResumen(
                  'escala',
                  `Escala ${escActualMm}mm -> ${escObjetivoMm}mm (${escResultado.porcentajeSlicer}% en slicer): peso estimado ${escResultado.pesoProyectadoG}g (×${escResultado.factorVolumen}), costo material ${fmtCop(escResultado.costoMaterialProyectadoCop)} COP`
                )
              }
            >
              {copiadoKey === 'escala' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copiadoKey === 'escala' ? 'Copiado' : 'Copiar Resumen'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Altura Original STL (mm)</label>
              <input type="number" min="1" step="any" className="form-input tabular-nums" value={escActualMm === 0 ? '' : escActualMm} onChange={e => setEscActualMm(e.target.value === '' ? 1 : parseFloat(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Altura Deseada Cliente (mm)</label>
              <input type="number" min="1" step="any" className="form-input tabular-nums" value={escObjetivoMm === 0 ? '' : escObjetivoMm} onChange={e => setEscObjetivoMm(e.target.value === '' ? 1 : parseFloat(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Peso Original Slicer (g)</label>
              <input type="number" min="0" step="any" className="form-input tabular-nums" value={escPesoG === 0 ? '' : escPesoG} onChange={e => setEscPesoG(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tiempo Original (min)</label>
              <input type="number" min="0" step="any" className="form-input tabular-nums" value={escTiempoMin === 0 ? '' : escTiempoMin} onChange={e => setEscTiempoMin(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Costo Material ($/g)</label>
              <input type="number" min="0" step="any" className="form-input tabular-nums" value={escCostoG === 0 ? '' : escCostoG} onChange={e => setEscCostoG(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="live-metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <div className="metric-item">
              <div className="metric-label">Escala en Slicer</div>
              <div className="metric-value tabular-nums" style={{ color: '#c084fc' }}>{escResultado.porcentajeSlicer}%</div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>Factor lineal k = {escResultado.factorLineal}</span>
            </div>
            <div className="metric-item">
              <div className="metric-label">Factor Volumen ($k^3$)</div>
              <div className="metric-value tabular-nums">×{escResultado.factorVolumen}</div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>Área pintable: ×{escResultado.factorAreaSuperficial}</span>
            </div>
            <div className="metric-item">
              <div className="metric-label">Peso Proyectado</div>
              <div className="metric-value tabular-nums" style={{ color: '#38bdf8' }}>{escResultado.pesoProyectadoG} g</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Tiempo Est. ($k^2$)</div>
              <div className="metric-value tabular-nums">
                {Math.floor(escResultado.tiempoProyectadoMin / 60)}h {escResultado.tiempoProyectadoMin % 60}m
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Costo Material Proyectado</div>
              <div className="metric-value tabular-nums" style={{ color: '#34d399' }}>{fmtCop(escResultado.costoMaterialProyectadoCop)}</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CALCULADORA DE CAMA / LOTE MULTI-PIEZA */}
      {activeTool === 'cama' && (
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#34d399', fontWeight: 800 }}>
                3. Calculadora de Cama / Lote Multi-Pieza
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Calcula cuántas unidades caben por placa (probando rotación 90°) y cuántas tandas requiere un pedido.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { label: 'Bambu P1S/P2S (256×256)', x: 256, y: 256 },
                { label: 'Mono 4 SLA (153×87)', x: 153, y: 87 },
                { label: 'Ender 3 (220×220)', x: 220, y: 220 }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.7rem' }}
                  onClick={() => {
                    setCamaAnchoMm(preset.x);
                    setCamaProfMm(preset.y);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Ancho Cama (mm)</label>
              <input type="number" min="10" step="any" className="form-input tabular-nums" value={camaAnchoMm === 0 ? '' : camaAnchoMm} onChange={e => setCamaAnchoMm(e.target.value === '' ? 10 : parseFloat(e.target.value) || 10)} />
            </div>
            <div className="form-group">
              <label className="form-label">Prof. Cama (mm)</label>
              <input type="number" min="10" step="any" className="form-input tabular-nums" value={camaProfMm === 0 ? '' : camaProfMm} onChange={e => setCamaProfMm(e.target.value === '' ? 10 : parseFloat(e.target.value) || 10)} />
            </div>
            <div className="form-group">
              <label className="form-label">Ancho Pieza (mm)</label>
              <input type="number" min="1" step="any" className="form-input tabular-nums" value={piezaAnchoMm === 0 ? '' : piezaAnchoMm} onChange={e => setPiezaAnchoMm(e.target.value === '' ? 1 : parseFloat(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Prof. Pieza (mm)</label>
              <input type="number" min="1" step="any" className="form-input tabular-nums" value={piezaProfMm === 0 ? '' : piezaProfMm} onChange={e => setPiezaProfMm(e.target.value === '' ? 1 : parseFloat(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Separación / Brim (mm)</label>
              <input type="number" min="0" step="any" className="form-input tabular-nums" value={margenMm === 0 ? '' : margenMm} onChange={e => setMargenMm(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Cantidad Pedido (und)</label>
              <input type="number" min="1" step="1" className="form-input tabular-nums" value={cantidadPedido === 0 ? '' : cantidadPedido} onChange={e => setCantidadPedido(e.target.value === '' ? 1 : parseInt(e.target.value, 10) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tiempo por Cama (min)</label>
              <input type="number" min="0" step="any" className="form-input tabular-nums" value={tiempoCamaMin === 0 ? '' : tiempoCamaMin} onChange={e => setTiempoCamaMin(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="live-metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <div className="metric-item">
              <div className="metric-label">Piezas / Cama</div>
              <div className="metric-value tabular-nums" style={{ color: '#34d399' }}>{camaResultado.piezasPorCama} und.</div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                Grilla {camaResultado.columnas}×{camaResultado.filas} ({camaResultado.orientacionOptima === 'rotada_90' ? 'rotada 90°' : 'normal'})
              </span>
            </div>
            <div className="metric-item">
              <div className="metric-label">Total Tandas / Camas</div>
              <div className="metric-value tabular-nums">{camaResultado.cantidadCamas} cama(s)</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Tiempo Total Lote</div>
              <div className="metric-value tabular-nums" style={{ color: '#38bdf8' }}>
                {Math.floor(camaResultado.tiempoTotalMin / 60)}h {camaResultado.tiempoTotalMin % 60}m
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Uso Superficie Cama</div>
              <div className="metric-value tabular-nums">{camaResultado.eficienciaAreaPct}%</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. ESTIMADOR DE TIEMPO POR ALTURA DE CAPA */}
      {activeTool === 'capa' && (
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fbbf24', fontWeight: 800 }}>
              4. Estimador de Tiempo & Energía por Altura de Capa
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Evalúa cuánto cambia el tiempo y costo eléctrico al pasar de calidad estándar (ej. 0.05 mm SLA / 0.20 mm FDM) a ultra-detalle.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Tecnología</label>
              <WjgSelect
                value={capaTech}
                onChange={v => {
                  const next = v === 'FDM_FILAMENTO' ? 'FDM_FILAMENTO' : 'SLA_RESINA';
                  setCapaTech(next);
                  setCapaBaseMm(next === 'SLA_RESINA' ? 0.05 : 0.20);
                  setCapaNuevaMm(next === 'SLA_RESINA' ? 0.03 : 0.12);
                }}
                options={[
                  { value: 'SLA_RESINA', label: 'Resina SLA / MSLA' },
                  { value: 'FDM_FILAMENTO', label: 'Filamento FDM' }
                ]}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Máquina del Taller</label>
              <WjgSelect
                value={capaMaqId}
                onChange={setCapaMaqId}
                options={maquinas.map(m => ({
                  value: m.id,
                  label: m.nombre,
                  subtitle: `${Math.round((m.consumo_kwh || 0.05) * 1000)}W`
                }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Altura Z Pieza (mm)</label>
              <input type="number" min="1" step="any" className="form-input tabular-nums" value={capaAlturaMm === 0 ? '' : capaAlturaMm} onChange={e => setCapaAlturaMm(e.target.value === '' ? 1 : parseFloat(e.target.value) || 1)} />
            </div>

            <div className="form-group">
              <label className="form-label">Capa Base (mm)</label>
              <input type="number" min="0.01" step="any" className="form-input tabular-nums" value={capaBaseMm === 0 ? '' : capaBaseMm} onChange={e => setCapaBaseMm(e.target.value === '' ? 0.05 : parseFloat(e.target.value) || 0.05)} />
            </div>

            <div className="form-group">
              <label className="form-label">Tiempo Base Slicer (min)</label>
              <input type="number" min="1" step="any" className="form-input tabular-nums" value={capaTiempoBaseMin === 0 ? '' : capaTiempoBaseMin} onChange={e => setCapaTiempoBaseMin(e.target.value === '' ? 1 : parseFloat(e.target.value) || 1)} />
            </div>

            <div className="form-group">
              <label className="form-label">Nueva Capa Objetivo (mm)</label>
              <input type="number" min="0.01" step="any" className="form-input tabular-nums" value={capaNuevaMm === 0 ? '' : capaNuevaMm} onChange={e => setCapaNuevaMm(e.target.value === '' ? 0.03 : parseFloat(e.target.value) || 0.03)} />
            </div>
          </div>

          <div className="live-metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <div className="metric-item">
              <div className="metric-label">Capas Base ➔ Nuevas</div>
              <div className="metric-value tabular-nums">{capaResultado.capasBase} ➔ {capaResultado.capasNuevas}</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Tiempo Nuevo Est.</div>
              <div className="metric-value tabular-nums" style={{ color: '#fbbf24' }}>
                {Math.floor(capaResultado.tiempoNuevoMin / 60)}h {capaResultado.tiempoNuevoMin % 60}m
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                {capaResultado.diferenciaMin >= 0 ? '+' : ''}{capaResultado.diferenciaMin} min (×{capaResultado.factorCambio})
              </span>
            </div>
            <div className="metric-item">
              <div className="metric-label">Energía Base ➔ Nueva</div>
              <div className="metric-value tabular-nums" style={{ color: '#38bdf8' }}>
                {fmtCop(capaResultado.costoEnergiaBaseCop)} ➔ {fmtCop(capaResultado.costoEnergiaNuevoCop)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CALCULADORA DE ENVÍO VOLUMÉTRICO COLOMBIA */}
      {activeTool === 'envio' && (
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f472b6', fontWeight: 800 }}>
                5. Calculadora de Envío Volumétrico (Colombia)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Las figuras 3D ocupan más volumen que peso. Evita perder dinero en envíos comparando peso real vs volumétrico.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() =>
                copiarResumen(
                  'envio',
                  `Envío caja ${envLargoCm}×${envAnchoCm}×${envAltoCm} cm: Peso real ${envPesoKg} kg vs Volumétrico ${envResultado.pesoVolumetricoKg} kg (Facturable: ${envResultado.pesoFacturableKg} kg) • Flete estimado: ${fmtCop(envResultado.fleteEstimadoCop)} COP`
                )
              }
            >
              {copiadoKey === 'envio' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copiadoKey === 'envio' ? 'Copiado' : 'Copiar Cálculo'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Largo Caja (cm)</label>
              <input type="number" min="1" step="any" className="form-input tabular-nums" value={envLargoCm === 0 ? '' : envLargoCm} onChange={e => setEnvLargoCm(e.target.value === '' ? 1 : parseFloat(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Ancho Caja (cm)</label>
              <input type="number" min="1" step="any" className="form-input tabular-nums" value={envAnchoCm === 0 ? '' : envAnchoCm} onChange={e => setEnvAnchoCm(e.target.value === '' ? 1 : parseFloat(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Alto Caja (cm)</label>
              <input type="number" min="1" step="any" className="form-input tabular-nums" value={envAltoCm === 0 ? '' : envAltoCm} onChange={e => setEnvAltoCm(e.target.value === '' ? 1 : parseFloat(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Peso Báscula Real (kg)</label>
              <input type="number" min="0.05" step="any" className="form-input tabular-nums" value={envPesoKg === 0 ? '' : envPesoKg} onChange={e => setEnvPesoKg(e.target.value === '' ? 0.1 : parseFloat(e.target.value) || 0.1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Divisor Volumétrico</label>
              <WjgSelect
                value={String(envDivisor)}
                onChange={v => setEnvDivisor(parseInt(v, 10) || 5000)}
                options={[
                  { value: '5000', label: '÷ 5000 (Estándar / Aéreo)' },
                  { value: '4000', label: '÷ 4000 (Terrestre Courier)' },
                  { value: '2500', label: '÷ 2500 (Carga Masiva)' }
                ]}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cobertura Destino</label>
              <WjgSelect
                value={envDestino}
                onChange={v => setEnvDestino(v as any)}
                options={[
                  { value: 'local_ciudad', label: 'Misma Ciudad / Área Metro' },
                  { value: 'nacional_principal', label: 'Ciudad Principal Nacional' },
                  { value: 'trayecto_especial', label: 'Trayecto Especial / Reexpedición' }
                ]}
              />
            </div>
          </div>

          <div className="live-metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <div className="metric-item">
              <div className="metric-label">Peso Volumétrico</div>
              <div className="metric-value tabular-nums" style={{ color: envResultado.aplicaVolumetrico ? '#f472b6' : '#94a3b8' }}>
                {envResultado.pesoVolumetricoKg} kg
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                {envResultado.aplicaVolumetrico ? '⚠️ La transportadora cobra por volumen' : '✓ Cobra por peso real'}
              </span>
            </div>
            <div className="metric-item">
              <div className="metric-label">Peso Facturable</div>
              <div className="metric-value tabular-nums">{envResultado.pesoFacturableKg} kg</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Flete Estimado Ref.</div>
              <div className="metric-value tabular-nums" style={{ color: '#34d399' }}>{fmtCop(envResultado.fleteEstimadoCop)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
