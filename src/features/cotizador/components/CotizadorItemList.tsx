import React from 'react';
import { 
  Minus, 
  Plus, 
  Trash2, 
  Edit, 
  Camera, 
  Eye, 
  Box, 
  Layers, 
  Tag, 
  ExternalLink 
} from 'lucide-react';
import { CotizadorItemListProps } from '../types/cotizador.types';
import { detect3DPlatform, formatExternalUrl } from '../../../services/platformUtils';

export const CotizadorItemList: React.FC<CotizadorItemListProps> = React.memo(({
  items,
  onRemoveItem,
  onUpdatePieceQuantity,
  onUpdatePieceImage,
  onOpenEditPiece,
  onPreviewImage,
  onItemImageUpload
}) => {
  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
        <p>No has agregado piezas a esta cotización aún.</p>
        <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
          Configura las dimensiones arriba y haz clic en "Agregar Pieza".
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '16px 0' }}>
      {items.map((item, idx) => (
        <div 
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          {/* Foto o Trigger de Carga */}
          {item.imagen_url ? (
            <div 
              style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => onPreviewImage({ url: item.imagen_url!, title: item.nombre_item })}
              title="Clic para ver imagen en tamaño completo"
            >
              <img 
                src={item.imagen_url} 
                alt={item.nombre_item} 
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  background: '#090d15'
                }} 
              />
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                background: 'rgba(0,0,0,0.7)',
                borderRadius: '3px',
                padding: '1px 2px',
                display: 'flex'
              }}>
                <Eye size={10} color="#fff" />
              </div>
            </div>
          ) : onUpdatePieceImage ? (
            <label 
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                border: '1px dashed var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.02)',
                color: 'var(--text-muted)',
                fontSize: '0.62rem',
                flexShrink: 0,
                textAlign: 'center'
              }}
              title="Adjuntar foto o render a este ítem"
            >
              <Camera size={13} color="var(--brand-cyan)" />
              <span>+ Foto</span>
              <input 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onItemImageUpload(item.id, e.target.files[0]);
                  }
                }}
              />
            </label>
          ) : null}

          {/* Detalles del Ítem */}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>{idx + 1}. {item.nombre_item} (x{item.cantidad})</span>
              {item.datos_pendientes && (
                <span style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.4)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                  🟡 Pendiente Slicer
                </span>
              )}
              {item.precio_fijado_tarifa && item.tarifa_tamano_aplicada && (
                <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--brand-cyan)', border: '1px solid rgba(56, 189, 248, 0.35)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                  🏷️ Tarifa {item.tarifa_tamano_aplicada.altura_cm}cm
                </span>
              )}
              {item.va_pintado ? (
                <span style={{ background: 'rgba(168, 85, 247, 0.18)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.35)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                  🎨 Pintado
                </span>
              ) : (
                <span style={{ background: 'rgba(148, 163, 184, 0.12)', color: 'var(--text-muted)', border: '1px solid rgba(148, 163, 184, 0.25)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem' }}>
                  ⚪ Sin Pintar
                </span>
              )}
              {item.tiene_empaque ? (
                <span style={{ background: 'rgba(34, 197, 94, 0.18)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.35)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                  📦 Con Empaque
                </span>
              ) : null}

              {item.enlaces_compra && item.enlaces_compra.length > 0 && (
                <span style={{ 
                  background: 'rgba(236, 72, 153, 0.18)', 
                  color: '#f472b6', 
                  border: '1px solid rgba(236, 72, 153, 0.35)', 
                  padding: '1px 6px', 
                  borderRadius: '4px', 
                  fontSize: '0.68rem', 
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  🛒 {item.enlaces_compra.length} Modelo(s) Web
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {item.datos_pendientes 
                ? `[Medidas y peso pendientes de software] • Material: ${item.resina_nombre}`
                : `Medidas: ${item.alto_mm}x${item.ancho_mm}x${item.profundidad_mm}mm • Material: ${item.resina_nombre} (${item.peso_estimado_g}g)`
              }
              {item.lista_empaques && item.lista_empaques.length > 0 && (
                <span style={{ color: '#4ade80' }}> • Empaque: {item.lista_empaques.map(e => `${e.nombre} (x${e.cantidad})`).join(', ')}</span>
              )}
            </div>

            {/* Enlaces de Compra Directos */}
            {item.enlaces_compra && item.enlaces_compra.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '5px' }}>
                {item.enlaces_compra.map((enl, elIdx) => {
                  const plat = detect3DPlatform(enl.url);
                  return (
                    <a
                      key={elIdx}
                      href={formatExternalUrl(enl.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: '0.7rem',
                        color: plat.color,
                        background: plat.bg,
                        border: `1px solid ${plat.borderColor}`,
                        borderRadius: '4px',
                        padding: '2px 8px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600
                      }}
                      title={`Abrir ${enl.url}`}
                    >
                      <span>{plat.icon}</span>
                      <span>{enl.titulo || plat.name} ↗</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stepper rápido de Cantidad */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', border: '1px solid var(--border-subtle)', padding: '2px', flexShrink: 0 }}>
            <button
              type="button"
              style={{
                border: 'none',
                background: 'transparent',
                color: item.cantidad <= 1 ? 'var(--text-muted)' : 'var(--text-main)',
                cursor: item.cantidad <= 1 ? 'not-allowed' : 'pointer',
                padding: '3px 7px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              disabled={item.cantidad <= 1}
              onClick={() => onUpdatePieceQuantity && onUpdatePieceQuantity(item.id, item.cantidad - 1)}
              title="Disminuir cantidad"
            >
              <Minus size={12} />
            </button>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, minWidth: '22px', textAlign: 'center' }}>
              {item.cantidad}
            </span>
            <button
              type="button"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-main)',
                cursor: 'pointer',
                padding: '3px 7px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => onUpdatePieceQuantity && onUpdatePieceQuantity(item.id, item.cantidad + 1)}
              title="Aumentar cantidad"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Precio y Acciones */}
          <div style={{ textAlign: 'right', minWidth: '85px' }}>
            <div style={{ fontWeight: 700, color: 'var(--brand-cyan)', fontSize: '0.95rem' }}>
              ${item.precio_total.toLocaleString('es-CO')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              (${item.precio_unitario.toLocaleString('es-CO')} c/u)
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ padding: '5px 8px', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.35)', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => onOpenEditPiece(item)}
              title="Editar medidas, material, procesos y precio"
            >
              <Edit size={13} />
              <span style={{ fontSize: '0.72rem' }}>Editar</span>
            </button>

            <button 
              type="button" 
              className="btn btn-danger btn-sm"
              onClick={() => onRemoveItem(item.id)}
              title="Eliminar ítem"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
});
CotizadorItemList.displayName = 'CotizadorItemList';
