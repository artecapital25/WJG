import React from 'react';
import { ShoppingCart, Trash2, Plus } from 'lucide-react';
import { OrdenTrabajo } from '../../../types';
import { ModalLinkItem } from '../types/workshop.types';
import { detect3DPlatform } from '../../../services/platformUtils';

interface ModalEditarEnlacesOTProps {
  ot: OrdenTrabajo | null;
  onClose: () => void;
  modalLinksList: ModalLinkItem[];
  onAddModalLink: () => void;
  onUpdateModalLink: (index: number, field: string, value: any) => void;
  onRemoveModalLink: (index: number) => void;
  onSaveLinksModal: (e: React.FormEvent) => void;
}

export const ModalEditarEnlacesOT: React.FC<ModalEditarEnlacesOTProps> = ({
  ot,
  onClose,
  modalLinksList,
  onAddModalLink,
  onUpdateModalLink,
  onRemoveModalLink,
  onSaveLinksModal
}) => {
  if (!ot) return null;

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card" 
        style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', margin: 0, padding: '24px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={18} color="#f472b6" />
            Enlaces Web del Modelo • {ot.numero_ot}
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Figura: <strong style={{ color: '#fff' }}>{ot.item_nombre}</strong><br />
          Guarda el enlace de Cults3D, CGTrader o Thingiverse para que cualquier operador del taller pueda acceder a comprar o descargar los archivos directamente.
        </div>

        <form onSubmit={onSaveLinksModal}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {modalLinksList.map((link, idx) => {
              const plat = detect3DPlatform(link.url);
              return (
                <div 
                  key={idx}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: `1px solid ${link.url ? plat.borderColor : 'var(--border-subtle)'}`,
                    borderRadius: '8px',
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: plat.color, background: plat.bg, padding: '2px 6px', borderRadius: '4px' }}>
                      {plat.icon} {plat.name} #{idx + 1}
                    </span>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 6px', color: '#f87171', fontSize: '0.7rem' }}
                      onClick={() => onRemoveModalLink(idx)}
                      title="Eliminar link"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Nombre o descripción (ej: Cults3D - Armadura Thanos)"
                      value={link.titulo}
                      onChange={e => onUpdateModalLink(idx, 'titulo', e.target.value)}
                      style={{ fontSize: '0.78rem', padding: '6px 8px' }}
                    />

                    <input 
                      type="url" 
                      className="form-input" 
                      placeholder="https://cults3d.com/... o enlace de descarga"
                      value={link.url}
                      onChange={e => onUpdateModalLink(idx, 'url', e.target.value)}
                      style={{ fontSize: '0.78rem', padding: '6px 8px' }}
                      required
                    />

                    <div className="input-with-unit" style={{ width: '100%' }}>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder="Costo Estimado de Compra ($ COP)"
                        value={link.costo_estimado || ''}
                        onChange={e => onUpdateModalLink(idx, 'costo_estimado', parseFloat(e.target.value) || 0)}
                        style={{ fontSize: '0.78rem', padding: '6px 8px' }}
                      />
                      <span className="input-unit-badge">COP</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onAddModalLink}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Plus size={13} />
              <span>+ Agregar Otro Enlace</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                Guardar Enlaces
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
