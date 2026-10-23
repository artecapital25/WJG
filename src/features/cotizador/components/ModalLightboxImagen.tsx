import React from 'react';
import { ImageIcon, X } from 'lucide-react';

interface ModalLightboxImagenProps {
  previewImage: { url: string; title: string } | null;
  onClose: () => void;
}

export const ModalLightboxImagen: React.FC<ModalLightboxImagenProps> = React.memo(({
  previewImage,
  onClose
}) => {
  if (!previewImage) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-card, #0f172a)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '16px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={16} color="var(--brand-cyan)" />
            <span>{previewImage.title} — Vista de Referencia</span>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '4px 8px' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: '10px', background: '#090d15', minHeight: '200px' }}>
          <img 
            src={previewImage.url} 
            alt={previewImage.title} 
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
});
ModalLightboxImagen.displayName = 'ModalLightboxImagen';
