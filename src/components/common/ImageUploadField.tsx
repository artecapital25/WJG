import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Eye, Link, RefreshCw, X, Image as ImageIcon } from 'lucide-react';
import { processAndOptimizeImage } from '../../services/imageService';
import { toast } from '../ui/ToastProvider';

interface ImageUploadFieldProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value = '',
  onChange,
  label = 'Fotografía del Producto / Ítem',
  helperText = 'Sube una foto desde tu galería, tómala con la cámara del celular o pega un enlace.',
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.85
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [zoomModal, setZoomModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.warning('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).');
      return;
    }

    try {
      setIsProcessing(true);
      const optimized = await processAndOptimizeImage(file, maxWidth, maxHeight, quality);
      onChange(optimized);
      toast.success('✓ Foto optimizada y adjuntada correctamente.');
    } catch (err: any) {
      console.error('Error al procesar la imagen:', err);
      toast.error('Error al optimizar la foto: ' + (err?.message || 'Formato no soportado'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      toast.warning('Ingresa una URL válida.');
      return;
    }
    onChange(trimmed);
    setUrlDraft('');
    setShowUrlInput(false);
    toast.success('✓ Enlace de foto guardado.');
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    toast.info('Foto removida.');
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Label Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label className="form-label" style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Camera size={15} color="var(--brand-cyan)" />
          <span>{label}</span>
        </label>
        {value && (
          <span style={{ fontSize: '0.72rem', color: 'var(--accent-success)', fontWeight: 600 }}>
            ✓ Foto cargada
          </span>
        )}
      </div>

      {/* Helper text */}
      {helperText && (
        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: '1.3' }}>
          {helperText}
        </p>
      )}

      {/* Inputs Ocultos de Archivo y Cámara */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
          }
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
          }
        }}
      />

      {/* ESTADO 1: FOTO YA CARGADA */}
      {value ? (
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '12px',
          padding: '10px 14px'
        }}>
          {/* Miniatura con botón de Zoom */}
          <div 
            onClick={() => setZoomModal(true)}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#0a0a0f',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              flexShrink: 0,
              position: 'relative'
            }}
            title="Clic para ver en grande"
          >
            <img
              src={value}
              alt="Foto previa"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              background: 'rgba(0,0,0,0.7)',
              padding: '2px 4px',
              borderTopLeftRadius: '4px'
            }}>
              <Eye size={12} color="#fff" />
            </div>
          </div>

          {/* Información y Acciones */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '4px' }}>
              Imagen adjunta
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setZoomModal(true)}
              >
                <Eye size={12} />
                <span>Ver Grande</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => cameraInputRef.current?.click()}
                disabled={isProcessing}
                title="Tomar nueva foto con la cámara"
              >
                <Camera size={12} color="var(--brand-cyan)" />
                <span>Re-tomar</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                title="Subir archivo desde galería"
              >
                <Upload size={12} />
                <span>Cambiar</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={handleRemove}
                title="Eliminar fotografía"
              >
                <Trash2 size={12} />
                <span>Quitar</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ESTADO 2: SIN FOTO (BOTONES Y CARGA) */
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px dashed rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'center'
        }}>
          {isProcessing ? (
            <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--brand-cyan)' }}>
              <RefreshCw size={18} className="animate-spin" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Optimizando y comprimiendo imagen...</span>
            </div>
          ) : showUrlInput ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="url"
                  className="form-input"
                  style={{ flex: 1, minHeight: '36px', fontSize: '0.82rem', padding: '6px 10px' }}
                  placeholder="https://ejemplo.com/foto-producto.jpg"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ minHeight: '36px', padding: '6px 12px' }}
                  onClick={handleUrlSubmit}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ minHeight: '36px', padding: '6px 10px' }}
                  onClick={() => setShowUrlInput(false)}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Botón Cámara Celular */}
                <button
                  type="button"
                  className="btn btn-cyan btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    padding: '8px 14px'
                  }}
                  onClick={() => cameraInputRef.current?.click()}
                  title="Abre la cámara trasera de tu móvil o tablet"
                >
                  <Camera size={16} />
                  <span>Tomar Foto (Cámara)</span>
                </button>

                {/* Botón Subir Archivo */}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Subir archivo PNG o JPG desde tu dispositivo"
                >
                  <Upload size={15} />
                  <span>Subir Archivo</span>
                </button>

                {/* Botón Pegar URL */}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 10px'
                  }}
                  onClick={() => setShowUrlInput(true)}
                  title="Pegar enlace o URL directa de la imagen"
                >
                  <Link size={14} />
                  <span>Pegar URL</span>
                </button>
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                Formatos: JPG, PNG, WebP • Auto-comprimido en alta fidelidad
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL ZOOM DE ALTA DEFINICIÓN */}
      {zoomModal && value && (
        <div 
          onClick={() => setZoomModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#0a0a0f',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <button
              type="button"
              onClick={() => setZoomModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-cyan)', marginBottom: '12px' }}>
              {label}
            </div>
            <img
              src={value}
              alt={label}
              style={{
                maxWidth: '85vw',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
