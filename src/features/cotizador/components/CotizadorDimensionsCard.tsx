import React, { useState } from 'react';
import { 
  Sparkles, 
  Box, 
  Info, 
  Camera, 
  Eye, 
  Check, 
  Trash2,
  Search,
  ExternalLink,
  Globe
} from 'lucide-react';
import { getQuickSearchUrls } from '../../../services/platformUtils';

interface CotizadorDimensionsCardProps {
  altoMm: number;
  setAltoMm: (val: number | ((prev: number) => number)) => void;
  anchoMm: number;
  setAnchoMm: (val: number | ((prev: number) => number)) => void;
  profundidadMm: number;
  setProfundidadMm: (val: number | ((prev: number) => number)) => void;
  esParcial: boolean;
  tarifaAplicada: { altura_cm: number; precio_sugerido: number } | null;
  precioFijadoTarifa: boolean;
  precioUnitarioManual: number;
  onOpenTarifario: () => void;
  onQuitarTarifa: () => void;
  onOpenSTLViewer?: () => void;
  imagenUrl: string;
  tipoOrigenImagen: 'archivo' | 'stl' | null;
  isOptimizingImage: boolean;
  showImagePreviewModal: boolean;
  setShowImagePreviewModal: (val: boolean) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageFile: (file: File) => void;
  handleRemoverImagen: () => void;
  nombreItem: string;
}

export const CotizadorDimensionsCard: React.FC<CotizadorDimensionsCardProps> = ({
  altoMm,
  setAltoMm,
  anchoMm,
  setAnchoMm,
  profundidadMm,
  setProfundidadMm,
  esParcial,
  tarifaAplicada,
  precioFijadoTarifa,
  precioUnitarioManual,
  onOpenTarifario,
  onQuitarTarifa,
  onOpenSTLViewer,
  imagenUrl,
  tipoOrigenImagen,
  isOptimizingImage,
  showImagePreviewModal,
  setShowImagePreviewModal,
  handleImageUpload,
  handleImageFile,
  handleRemoverImagen,
  nombreItem
}) => {
  const [unidadMedida, setUnidadMedida] = useState<'mm' | 'cm'>('mm');
  const [showBuscadorPlataformas, setShowBuscadorPlataformas] = useState(false);
  const quickSearchUrls = getQuickSearchUrls(nombreItem);

  return (
    <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
      {/* Encabezado de Dimensiones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
          Dimensiones de la Pieza (Milímetros) {esParcial && <span style={{ color: '#fde047', fontWeight: 500 }}>(Opcional / Por definir)</span>}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onOpenTarifario}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '4px 10px', height: 'auto', borderColor: 'rgba(56, 189, 248, 0.4)' }}
            title="Elegir una altura estándar del tarifario"
          >
            <Sparkles size={13} color="var(--brand-cyan)" />
            <span>{tarifaAplicada ? `Tarifa ${tarifaAplicada.altura_cm}cm` : 'Tarifas por Tamaño'}</span>
          </button>

          {onOpenSTLViewer && (
            <button
              type="button"
              onClick={onOpenSTLViewer}
              className="btn btn-cyan btn-sm"
              style={{ fontSize: '0.75rem', padding: '4px 10px', height: 'auto' }}
              title="Abrir visor 3D para subir y medir archivo STL"
            >
              <Box size={13} />
              <span>📐 Medir con Visor STL 3D</span>
            </button>
          )}
          <span style={{ fontSize: '0.72rem', color: 'var(--brand-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={13} />
            Estándar Slicer 3D
          </span>
        </div>
      </div>

      {/* Guía Explicativa de Orientación de Ejes */}
      <div style={{
        background: 'rgba(56, 189, 248, 0.06)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--brand-cyan)', fontWeight: 700 }}>🧭 Ejes:</span>
          <span><strong>Z</strong> = Altura ↕️</span>
          <span>•</span>
          <span><strong>X</strong> = Ancho ↔️</span>
          <span>•</span>
          <span><strong>Y</strong> = Fondo ↗️</span>
        </div>

        {/* Switcher de unidad de medida */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '2px' }}>Unidad:</span>
          <button
            type="button"
            className={`btn btn-sm ${unidadMedida === 'mm' ? 'btn-cyan' : 'btn-secondary'}`}
            style={{ padding: '2px 7px', fontSize: '0.7rem', minHeight: 'auto' }}
            onClick={() => setUnidadMedida('mm')}
          >
            mm
          </button>
          <button
            type="button"
            className={`btn btn-sm ${unidadMedida === 'cm' ? 'btn-cyan' : 'btn-secondary'}`}
            style={{ padding: '2px 7px', fontSize: '0.7rem', minHeight: 'auto' }}
            onClick={() => setUnidadMedida('cm')}
          >
            cm
          </button>
        </div>
      </div>

      <div className="dimensions-grid">
        {/* Eje Z - Altura / Vertical */}
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--brand-cyan)', fontWeight: 800 }}>Z</span> — Altura (Vertical)
          </label>
          <div className="input-with-unit">
            <input 
              type="number" 
              className="form-input" 
              value={unidadMedida === 'cm' ? Number((altoMm / 10).toFixed(2)) : altoMm} 
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                setAltoMm(Math.max(0, unidadMedida === 'cm' ? Number((val * 10).toFixed(1)) : val));
              }} 
              title="Alto vertical en Z"
              placeholder="Alto"
            />
            <span className="input-unit-badge">{unidadMedida} (Z)</span>
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'block', marginTop: '3px' }}>
            ↕️ {unidadMedida === 'cm' ? `${altoMm} mm` : `${(altoMm / 10).toFixed(1)} cm`}
          </span>
        </div>

        {/* Eje X - Ancho / Horizontal */}
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--brand-blue)', fontWeight: 800 }}>X</span> — Ancho (Horizontal)
          </label>
          <div className="input-with-unit">
            <input 
              type="number" 
              className="form-input" 
              value={unidadMedida === 'cm' ? Number((anchoMm / 10).toFixed(2)) : anchoMm} 
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                setAnchoMm(Math.max(0, unidadMedida === 'cm' ? Number((val * 10).toFixed(1)) : val));
              }} 
              title="Ancho horizontal en X"
              placeholder="Ancho"
            />
            <span className="input-unit-badge">{unidadMedida} (X)</span>
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'block', marginTop: '3px' }}>
            ↔️ {unidadMedida === 'cm' ? `${anchoMm} mm` : `${(anchoMm / 10).toFixed(1)} cm`}
          </span>
        </div>

        {/* Eje Y - Profundidad / Fondo */}
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--brand-purple)', fontWeight: 800 }}>Y</span> — Fondo (Profundidad)
          </label>
          <div className="input-with-unit">
            <input 
              type="number" 
              className="form-input" 
              value={unidadMedida === 'cm' ? Number((profundidadMm / 10).toFixed(2)) : profundidadMm} 
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                setProfundidadMm(Math.max(0, unidadMedida === 'cm' ? Number((val * 10).toFixed(1)) : val));
              }} 
              title="Profundidad en Y"
              placeholder="Prof"
            />
            <span className="input-unit-badge">{unidadMedida} (Y)</span>
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'block', marginTop: '3px' }}>
            ↗️ {unidadMedida === 'cm' ? `${profundidadMm} mm` : `${(profundidadMm / 10).toFixed(1)} cm`}
          </span>
        </div>
      </div>

      {/* Advertencia si las medidas en mm son muy pequeñas */}
      {unidadMedida === 'mm' && (altoMm <= 10 && altoMm > 0) && (
        <div style={{
          background: 'rgba(234, 179, 8, 0.12)',
          border: '1px solid rgba(234, 179, 8, 0.35)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '0.74rem',
          color: '#fde047',
          marginTop: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <span>
            💡 <strong>¿Medidas en centímetros?</strong> Ingresaste {altoMm} mm ({Number((altoMm / 10).toFixed(1))} cm). Si la pieza mide {altoMm} cm ({altoMm * 10} mm):
          </span>
          <button
            type="button"
            className="btn btn-sm btn-cyan"
            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
            onClick={() => {
              setAltoMm(prev => prev * 10);
              setAnchoMm(prev => prev * 10);
              setProfundidadMm(prev => prev * 10);
            }}
          >
            Convertir cm → mm (×10)
          </button>
        </div>
      )}

      {/* Banner de Precio Fijado por Tarifario */}
      {precioFijadoTarifa && tarifaAplicada && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(14, 165, 233, 0.06) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(56, 189, 248, 0.2)',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={18} color="var(--brand-cyan)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                🏷️ Precio Fijado por Tarifario: <span style={{ color: 'var(--brand-cyan)' }}>${precioUnitarioManual.toLocaleString('es-CO')} COP</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Aplicado para figura de {tarifaAplicada.altura_cm} cm. El margen se ajusta en base a los costos reales del taller.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onQuitarTarifa}
            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
            title="Volver al cálculo dinámico por costo de resina + horas + margen %"
          >
            Volver a Margen Calculado
          </button>
        </div>
      )}

      {/* Sección de Imagen de Referencia / Foto */}
      <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label className="form-label" style={{ margin: 0 }}>
            📸 Imagen de Referencia de la Pieza (Opcional)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowBuscadorPlataformas(prev => !prev)}
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            >
              <Search size={12} />
              <span>{showBuscadorPlataformas ? 'Ocultar Buscadores' : 'Buscar STL Online'}</span>
            </button>
          </div>
        </div>

        {/* Buscadores de modelos 3D */}
        {showBuscadorPlataformas && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '10px',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Buscar "{nombreItem}" en:</span>
            {quickSearchUrls.map(item => (
              <a
                key={item.name}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.72rem', textDecoration: 'none' }}
              >
                <span>{item.name}</span>
                <ExternalLink size={10} />
              </a>
            ))}
          </div>
        )}

        {!imagenUrl ? (
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleImageFile(e.dataTransfer.files[0]);
              }
            }}
            style={{
              border: '2px dashed var(--border-subtle)',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'center',
              background: 'rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', padding: '8px 14px' }}>
                <Camera size={15} />
                <span>Subir Foto (Celular / Archivo)</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }} 
                />
              </label>

              {onOpenSTLViewer && (
                <button
                  type="button"
                  className="btn btn-cyan btn-sm"
                  style={{ padding: '8px 14px' }}
                  onClick={onOpenSTLViewer}
                  title="Abrir Visor 3D para cargar STL y tomar captura"
                >
                  <Box size={15} />
                  <span>Tomar Captura de STL 3D</span>
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Arrastra una foto aquí o abre el visor STL para rotar y capturar el modelo 3D
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '12px 14px',
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '10px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => setShowImagePreviewModal(true)}
                title="Clic para ver en tamaño completo"
              >
                <img 
                  src={imagenUrl} 
                  alt="Previsualización pieza" 
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '2px solid rgba(56, 189, 248, 0.4)',
                    background: '#090d15'
                  }} 
                />
                <div style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '4px',
                  padding: '2px',
                  display: 'flex'
                }}>
                  <Eye size={12} color="#fff" />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: tipoOrigenImagen === 'stl' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(37, 99, 235, 0.2)',
                    color: tipoOrigenImagen === 'stl' ? 'var(--brand-cyan)' : '#93c5fd',
                    border: `1px solid ${tipoOrigenImagen === 'stl' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(37, 99, 235, 0.4)'}`
                  }}>
                    {tipoOrigenImagen === 'stl' ? '📸 Captura STL 3D' : '📷 Foto de Referencia'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Check size={12} />
                    Lista para PDF
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  {nombreItem || 'Pieza'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Aparecerá en el PDF y en la orden de taller
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowImagePreviewModal(true)}
                title="Ver imagen en grande"
              >
                <Eye size={14} />
                <span>Ver</span>
              </button>

              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                <span>Cambiar</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }} 
                />
              </label>

              {onOpenSTLViewer && (
                <button
                  type="button"
                  className="btn btn-cyan btn-sm"
                  onClick={onOpenSTLViewer}
                  title="Abrir Visor STL para recapturar el 3D"
                >
                  <Box size={14} />
                  <span>Visor STL</span>
                </button>
              )}

              <button 
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleRemoverImagen}
                title="Quitar foto"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Previsualización de Imagen */}
      {showImagePreviewModal && imagenUrl && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowImagePreviewModal(false)}
        >
          <div 
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                📸 Imagen de Referencia • {nombreItem}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowImagePreviewModal(false)}
                style={{ padding: '2px 8px' }}
              >
                ✕ Cerrar
              </button>
            </div>
            <img 
              src={imagenUrl} 
              alt={nombreItem} 
              style={{
                maxWidth: '80vw',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
