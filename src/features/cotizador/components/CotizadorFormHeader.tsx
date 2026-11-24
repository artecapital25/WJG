import React, { useRef, useState } from 'react';
import { AlertTriangle, Box, RotateCcw, Sparkles, Sliders, Upload, Zap } from 'lucide-react';
import { PiezaCotizada, TecnologiaFabricacion } from '../../../types';
import { SlicerParsedResult } from '../../../services/slicerParserService';
import { WjgBadge, WjgButton } from '../../../components/ui';

interface CotizadorFormHeaderProps {
  piezaEnEdicion?: PiezaCotizada | null;
  onCancelarEdicionPieza?: () => void;
  nombreItem: string;
  setNombreItem: (val: string) => void;
  cantidad: number;
  setCantidad: (val: number) => void;
  esParcial: boolean;
  setEsParcial: (val: boolean) => void;
  notasPendientes: string;
  setNotasPendientes: (val: string) => void;
  onOpenTarifario: () => void;
  tecnologia?: TecnologiaFabricacion;
  modoVista?: 'rapido' | 'avanzado';
  setModoVista?: (val: 'rapido' | 'avanzado') => void;
  onImportSlicerFile?: (file: File) => void;
  lastSlicerResult?: SlicerParsedResult | null;
  canUndoSlicer?: boolean;
  onUndoSlicerImport?: () => void;
}

export const CotizadorFormHeader: React.FC<CotizadorFormHeaderProps> = ({
  piezaEnEdicion,
  onCancelarEdicionPieza,
  nombreItem,
  setNombreItem,
  cantidad,
  setCantidad,
  esParcial,
  setEsParcial,
  notasPendientes,
  setNotasPendientes,
  onOpenTarifario,
  tecnologia = 'SLA_RESINA',
  modoVista = 'rapido',
  setModoVista,
  onImportSlicerFile,
  lastSlicerResult,
  canUndoSlicer = false,
  onUndoSlicerImport
}) => {
  const slicerInputRef = useRef<HTMLInputElement>(null);
  const [draggingSlicer, setDraggingSlicer] = useState(false);

  const tituloTecnologia = tecnologia === 'FDM_FILAMENTO'
    ? 'Cotizador 3D FDM & Filamento'
    : (tecnologia === 'CORTE_LASER' || tecnologia === 'GRABADO_LASER')
      ? 'Cotizador Corte & Grabado Láser'
      : tecnologia === 'CNC_ROUTER'
        ? 'Cotizador Router CNC Industrial'
        : 'Cotizador 3D SLA & Resina';

  return (
    <>
      {/* Banner de Edición de Ítem */}
      {piezaEnEdicion && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.12))',
          border: '1px solid rgba(245, 158, 11, 0.65)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem' }}>✏️</span>
            <div>
              <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.94rem' }}>
                Modo Edición en Calculadora: {piezaEnEdicion.nombre_item}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Modifica medidas, material o procesos. Al guardar se actualizará el costo real y precio en la cotización.
              </div>
            </div>
          </div>
          {onCancelarEdicionPieza && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onCancelarEdicionPieza}
              style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#f87171' }}
            >
              Cancelar Edición
            </button>
          )}
        </div>
      )}

      <div className="section-header" style={{ marginBottom: '14px' }}>
        <div>
          <h2 className="section-title">
            <Box size={22} color="var(--brand-cyan)" />
            {tituloTecnologia}
          </h2>
          <p className="section-subtitle">
            Control por apartado (Costo vs Cobro) • Margen Bruto o Markup • Desglose en vivo
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {setModoVista && (
            <div style={{
              display: 'inline-flex',
              background: 'rgba(7, 10, 16, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '3px',
              gap: '3px'
            }}>
              <button
                type="button"
                className={`btn btn-sm ${modoVista === 'rapido' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minHeight: '36px', padding: '4px 10px', fontSize: '0.76rem', border: 'none' }}
                onClick={() => setModoVista('rapido')}
              >
                <Zap size={13} />
                <span>Rápido</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${modoVista === 'avanzado' ? 'btn-cyan' : 'btn-secondary'}`}
                style={{ minHeight: '36px', padding: '4px 10px', fontSize: '0.76rem', border: 'none' }}
                onClick={() => setModoVista('avanzado')}
              >
                <Sliders size={13} />
                <span>Avanzado</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="btn btn-cyan btn-sm"
            onClick={onOpenTarifario}
            style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Ver escala de precios por tamaño y copiar textos rápidos para WhatsApp"
          >
            <Sparkles size={15} />
            <span>Tarifario Rápido</span>
          </button>
        </div>
      </div>

      {/* Nombre y Cantidad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
        <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
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

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Cantidad (Lote)</label>
          <div className="input-with-unit">
            <input
              type="number"
              className="form-input"
              min="1"
              step="any"
              value={cantidad === 0 ? '' : cantidad}
              onChange={e => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
              required
            />
            <span className="input-unit-badge">und</span>
          </div>
        </div>
      </div>

      {/* Lector Universal de Archivos Slicer (FDM .3mf/.gcode y Resina .ctb/.goo/.pwmb) */}
      {onImportSlicerFile && (
        <div
          onDragOver={e => {
            e.preventDefault();
            setDraggingSlicer(true);
          }}
          onDragLeave={() => setDraggingSlicer(false)}
          onDrop={e => {
            e.preventDefault();
            setDraggingSlicer(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onImportSlicerFile(f);
          }}
          onClick={() => slicerInputRef.current?.click()}
          style={{
            background: draggingSlicer ? 'rgba(56, 189, 248, 0.14)' : 'rgba(56, 189, 248, 0.05)',
            border: `1px dashed ${draggingSlicer ? '#38bdf8' : 'rgba(56, 189, 248, 0.35)'}`,
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <Upload size={16} color="var(--brand-cyan)" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e0f2fe' }}>
                  Importar archivo Slicer (.3mf, .gcode, .ctb, .goo, .pwmb)
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {lastSlicerResult
                    ? `Leído (${lastSlicerResult.slicerDetectado}): ${lastSlicerResult.pesoGramos > 0 ? `${lastSlicerResult.pesoGramos}g` : 'sin peso'} • ${lastSlicerResult.tiempoMinutos > 0 ? `${Math.floor(lastSlicerResult.tiempoMinutos / 60)}h ${lastSlicerResult.tiempoMinutos % 60}m` : 'sin tiempo'}${lastSlicerResult.capas ? ` • ${lastSlicerResult.capas} capas` : ''}`
                    : 'Arrastra o haz clic para autocompletar peso/ml, tiempo, capas y miniatura'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
              {canUndoSlicer && onUndoSlicerImport && (
                <WjgButton
                  variant="ghost"
                  size="sm"
                  leftIcon={<RotateCcw size={13} />}
                  onClick={onUndoSlicerImport}
                  title="Restaurar valores previos a la importación"
                >
                  Deshacer
                </WjgButton>
              )}
              <WjgButton
                variant="cyan"
                size="sm"
                leftIcon={<Upload size={13} />}
                onClick={() => slicerInputRef.current?.click()}
              >
                Cargar Slicer
              </WjgButton>
            </div>
          </div>

          {lastSlicerResult && (lastSlicerResult.camposExtraidos.length > 0 || lastSlicerResult.advertencia) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {lastSlicerResult.camposExtraidos.length > 0 && (
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {lastSlicerResult.camposExtraidos.map(campo => (
                    <WjgBadge key={campo} variant="success">
                      ✓ {campo}
                    </WjgBadge>
                  ))}
                </div>
              )}
              {lastSlicerResult.advertencia && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#fbbf24' }}>
                  <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                  <span>{lastSlicerResult.advertencia}</span>
                </div>
              )}
            </div>
          )}

          <input
            ref={slicerInputRef}
            type="file"
            accept=".3mf,.gcode,.gco,.g,.bgcode,.ctb,.goo,.pwmb,.pm5s,.pwmo,.photon"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onImportSlicerFile(f);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* Selector de Modo Parcial / Pendiente de Slicer */}
      <div style={{
        background: esParcial ? 'rgba(234, 179, 8, 0.12)' : 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${esParcial ? 'rgba(234, 179, 8, 0.45)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: '10px',
        padding: '10px 14px',
        marginBottom: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: esParcial ? '#fde047' : 'var(--text-main)' }}>
            {esParcial ? '🟡 Cotización Parcial (Medidas / Material Pendientes)' : '📐 Cotización Estándar (Medidas Definidas)'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {esParcial
              ? 'Las dimensiones y peso se definirán más adelante al abrir el slicer.'
              : 'Calcula con las dimensiones exactas o gramos del Slicer.'}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: esParcial ? '#fde047' : 'var(--brand-cyan)' }}>
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
    </>
  );
};
