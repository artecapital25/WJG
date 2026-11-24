import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Box,
  CheckCircle2,
  Clock,
  FileCode2,
  Layers,
  Palette,
  Scale,
  Sparkles,
  Upload,
  X
} from 'lucide-react';
import { ConfiguracionTaller, Filamento, Resina, TecnologiaFabricacion } from '../../types';
import { parseSlicerFile, SlicerParsedResult } from '../../services/slicerParserService';
import { WjgBadge, WjgButton, WjgCard, WjgEmptyState, WjgStatCard, toast } from '../ui';

export interface SlicerAppliedPieceData {
  altoMm: number;
  anchoMm: number;
  profundidadMm: number;
  pesoResinaG: number;
  pesoFilamentoG?: number;
  tiempoImpresionMin?: number;
  tecnologia?: TecnologiaFabricacion;
  resinaId?: string;
  filamentoId?: string;
  nombrePieza: string;
  imagenUrl?: string;
  amsActivo?: boolean;
  amsColores?: number;
  amsPurgaGramos?: number;
}

interface SlicerInspectorViewProps {
  resinas?: Resina[];
  filamentos?: Filamento[];
  config?: ConfiguracionTaller;
  onApplyToCotizador?: (data: SlicerAppliedPieceData) => void;
}

const fmtTiempo = (min: number) => {
  if (!min || min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m (${min} min)` : `${m} min`;
};

const fmtCop = (val: number) => `$${Math.round(val || 0).toLocaleString('es-CO')} COP`;

export const SlicerInspectorView: React.FC<SlicerInspectorViewProps> = ({
  resinas = [],
  filamentos = [],
  config,
  onApplyToCotizador
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeMb, setFileSizeMb] = useState<string>('');
  const [parsed, setParsed] = useState<SlicerParsedResult | null>(null);
  const [useThumbnail, setUseThumbnail] = useState<boolean>(true);

  const handleProcessFile = async (file: File) => {
    setIsParsing(true);
    setFileName(file.name);
    setFileSizeMb((file.size / (1024 * 1024)).toFixed(2));
    try {
      const result = await parseSlicerFile(file);
      setParsed(result);
      setUseThumbnail(Boolean(result.thumbnailDataUrl));
      if (result.advertencia && result.camposExtraidos.length === 0) {
        toast.warning(result.advertencia);
      } else if (result.advertencia) {
        toast.info(`Archivo leído parcialmente (${result.camposExtraidos.length} datos extraídos).`);
      } else {
        toast.success(`Archivo ${result.formato.toUpperCase()} inspeccionado con éxito.`);
      }
    } finally {
      setIsParsing(false);
    }
  };

  // Estimación de costo rápido contra catálogo
  const estimacionMaterial = React.useMemo(() => {
    if (!parsed || parsed.pesoGramos <= 0) return null;
    if (parsed.tecnologia === 'FDM_FILAMENTO') {
      const matchFil =
        (parsed.tipoMaterial &&
          filamentos.find(f => f.tipo.toLowerCase().includes(parsed.tipoMaterial!.toLowerCase()))) ||
        filamentos[0];
      const costoG = matchFil?.costo_gramo || 95;
      const merma = config?.margen_merma_fdm ?? 0.15;
      const gramosTotales = parsed.pesoGramos + (parsed.pesoPurgaGramos || 0);
      const costo = gramosTotales * (1 + merma) * costoG;
      return {
        label: matchFil ? `${matchFil.marca} ${matchFil.tipo}` : 'Filamento Estándar',
        costoCop: Math.round(costo),
        filamentoId: matchFil?.id
      };
    }

    const res = resinas[0];
    const costoG = res?.costo_gramo || 130;
    const merma = config?.margen_merma_resina ?? 0.2;
    const costo = parsed.pesoGramos * (1 + merma) * costoG;
    return {
      label: res ? `${res.marca} ${res.tipo}` : 'Resina Estándar',
      costoCop: Math.round(costo),
      resinaId: res?.id
    };
  }, [parsed, resinas, filamentos, config]);

  const handleEnviarCotizador = () => {
    if (!parsed || !onApplyToCotizador) return;
    onApplyToCotizador({
      altoMm: parsed.altoMm || 100,
      anchoMm: parsed.anchoMm || 60,
      profundidadMm: parsed.profundidadMm || 60,
      pesoResinaG: parsed.tecnologia === 'SLA_RESINA' ? parsed.pesoGramos : 0,
      pesoFilamentoG: parsed.tecnologia === 'FDM_FILAMENTO' ? parsed.pesoGramos : undefined,
      tiempoImpresionMin: parsed.tiempoMinutos > 0 ? parsed.tiempoMinutos : undefined,
      tecnologia: parsed.tecnologia,
      resinaId: parsed.tecnologia === 'SLA_RESINA' ? estimacionMaterial?.resinaId : undefined,
      filamentoId: parsed.tecnologia === 'FDM_FILAMENTO' ? estimacionMaterial?.filamentoId : undefined,
      nombrePieza: parsed.nombreSugerido,
      imagenUrl: useThumbnail ? parsed.thumbnailDataUrl : undefined,
      amsActivo: parsed.esMulticolorAMS,
      amsColores: parsed.esMulticolorAMS ? Math.max(2, parsed.cantidadColores) : undefined,
      amsPurgaGramos: parsed.pesoPurgaGramos > 0 ? parsed.pesoPurgaGramos : undefined
    });
    toast.success(`"${parsed.nombreSugerido}" cargado en el Cotizador.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Zona Drag & Drop Universal */}
      <WjgCard
        variant="highlight"
        style={{
          borderStyle: 'dashed',
          borderWidth: '2px',
          borderColor: isDragging ? 'var(--brand-cyan)' : 'rgba(56, 189, 248, 0.4)',
          background: isDragging ? 'rgba(56, 189, 248, 0.08)' : undefined,
          cursor: 'pointer',
          textAlign: 'center',
          padding: '24px 18px'
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleProcessFile(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".3mf,.gcode,.gco,.g,.bgcode,.ctb,.goo,.pwmb,.pm5s,.pwmo,.photon"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleProcessFile(f);
            e.target.value = '';
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-cyan)'
            }}
          >
            <Upload size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
              {isParsing ? 'Analizando archivo en tu navegador...' : 'Inspector Universal de Slicer (FDM y Resina SLA)'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Arrastra o haz clic para leer <strong>.3mf</strong> (Bambu/Orca/Prusa), <strong>.gcode</strong>,{' '}
              <strong>.ctb</strong> (Chitubox), <strong>.goo</strong> (Elegoo/Lychee) o <strong>.pwmb / .pm5s</strong> (Anycubic). 100% local sin subir a la nube.
            </div>
          </div>
          <WjgButton variant="cyan" size="sm" leftIcon={<FileCode2 size={14} />}>
            Seleccionar Archivo de Slicer
          </WjgButton>
        </div>
      </WjgCard>

      {!parsed ? (
        <WjgEmptyState
          icon={<FileCode2 size={36} />}
          title="Sin archivo inspeccionado aún"
          description="Sube un archivo laminado para ver al instante su miniatura 3D, capas, tiempo exacto, consumo de resina/filamento, purga AMS y enviarlo directo al Cotizador."
        />
      ) : (
        <WjgCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <WjgBadge variant={parsed.tecnologia === 'SLA_RESINA' ? 'purple' : 'cyan'}>
                  {parsed.tecnologia === 'SLA_RESINA' ? 'RESINA SLA' : 'FDM FILAMENTO'}
                </WjgBadge>
                <WjgBadge variant="info">{parsed.formato.toUpperCase()}</WjgBadge>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                  {fileName} ({fileSizeMb} MB)
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                {parsed.nombreSugerido}
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Slicer detectado: <strong style={{ color: '#e2e8f0' }}>{parsed.slicerDetectado}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {onApplyToCotizador && (
                <WjgButton
                  variant="quote"
                  size="sm"
                  leftIcon={<Sparkles size={15} />}
                  rightIcon={<ArrowRight size={14} />}
                  onClick={handleEnviarCotizador}
                >
                  Enviar Datos + Miniatura al Cotizador
                </WjgButton>
              )}
              <WjgButton
                variant="secondary"
                size="sm"
                leftIcon={<X size={14} />}
                onClick={() => setParsed(null)}
              >
                Limpiar
              </WjgButton>
            </div>
          </div>

          {parsed.advertencia && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#fde68a',
                fontSize: '0.8rem',
                marginBottom: '14px'
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{parsed.advertencia}</span>
            </div>
          )}

          {/* Layout: Miniatura + Estadísticas */}
          <div style={{ display: 'grid', gridTemplateColumns: parsed.thumbnailDataUrl ? 'minmax(180px, 240px) 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>
            {parsed.thumbnailDataUrl && (
              <div
                style={{
                  background: 'rgba(7, 10, 16, 0.85)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'center'
                }}
              >
                <img
                  src={parsed.thumbnailDataUrl}
                  alt={parsed.nombreSugerido}
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={useThumbnail}
                    onChange={e => setUseThumbnail(e.target.checked)}
                    style={{ accentColor: 'var(--brand-cyan)' }}
                  />
                  Usar como foto de la pieza
                </label>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '10px' }}>
                <WjgStatCard
                  label="Tiempo de Impresión"
                  value={fmtTiempo(parsed.tiempoMinutos)}
                  icon={<Clock size={15} />}
                  accentColor="#38bdf8"
                />
                <WjgStatCard
                  label={parsed.tecnologia === 'SLA_RESINA' ? 'Consumo Resina' : 'Peso Filamento'}
                  value={
                    parsed.pesoGramos > 0
                      ? parsed.volumenMl
                        ? `${parsed.pesoGramos} g (${parsed.volumenMl} ml)`
                        : `${parsed.pesoGramos} g`
                      : 'No detectado'
                  }
                  icon={<Scale size={15} />}
                  accentColor="#34d399"
                />
                <WjgStatCard
                  label="Capas / Altura Capa"
                  value={parsed.capas ? `${parsed.capas} capas` : parsed.alturaCapaMm ? `${parsed.alturaCapaMm} mm` : '—'}
                  subtitle={parsed.alturaCapaMm ? `Capa ${parsed.alturaCapaMm} mm` : undefined}
                  icon={<Layers size={15} />}
                  accentColor="#a855f7"
                />
                <WjgStatCard
                  label="Medidas / Colores"
                  value={
                    parsed.altoMm
                      ? `${parsed.anchoMm || '?'}×${parsed.profundidadMm || '?'}×${parsed.altoMm} mm`
                      : parsed.esMulticolorAMS
                        ? `AMS ${parsed.cantidadColores} colores`
                        : '1 color'
                  }
                  subtitle={parsed.pesoPurgaGramos > 0 ? `+${parsed.pesoPurgaGramos} g purga` : parsed.tipoMaterial}
                  icon={parsed.esMulticolorAMS ? <Palette size={15} /> : <Box size={15} />}
                  accentColor="#fbbf24"
                />
              </div>

              {estimacionMaterial && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.28)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    fontSize: '0.82rem'
                  }}
                >
                  <span style={{ color: '#a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} />
                    Estimación material con catálogo ({estimacionMaterial.label} + merma):
                  </span>
                  <strong style={{ color: '#34d399' }} className="tabular-nums">
                    {fmtCop(estimacionMaterial.costoCop)}
                  </strong>
                </div>
              )}

              {parsed.camposExtraidos.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>Extraído:</span>
                  {parsed.camposExtraidos.map(c => (
                    <WjgBadge key={c} variant="success">
                      ✓ {c}
                    </WjgBadge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </WjgCard>
      )}
    </div>
  );
};
