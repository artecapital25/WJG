import React from 'react';
import { FileText, MessageCircle, Box, ShoppingCart, ExternalLink } from 'lucide-react';
import { Cotizacion } from '../../../types';
import { formatWhatsAppPhone, openWhatsApp } from '../../../services/whatsappService';
import { detect3DPlatform, formatExternalUrl } from '../../../services/platformUtils';

interface ModalDetalleCotizacionOTProps {
  cotizacion: Cotizacion | null;
  onClose: () => void;
  onNavigateToCotizaciones?: (cotNumeroOId?: string) => void;
}

export const ModalDetalleCotizacionOT: React.FC<ModalDetalleCotizacionOTProps> = ({
  cotizacion,
  onClose,
  onNavigateToCotizaciones
}) => {
  if (!cotizacion) return null;

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
        style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', margin: 0, padding: '24px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="var(--brand-cyan)" />
                Cotización #{cotizacion.numero_cot}
              </h3>
              <span className={`status-pill status-${(cotizacion.estado || 'borrador').toLowerCase()}`}>
                {cotizacion.estado}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Fecha: {cotizacion.fecha} • Asesor: {cotizacion.vendedor}
            </p>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* Datos del Cliente */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '8px', 
          padding: '12px 14px', 
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Cliente
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
              {cotizacion.cliente?.nombre || 'Cliente General'}
            </div>
            {cotizacion.cliente?.telefono && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                📱 {cotizacion.cliente.telefono}
              </div>
            )}
          </div>

          {cotizacion.cliente?.telefono && (
            <button
              type="button"
              className="btn btn-whatsapp btn-sm"
              onClick={() => openWhatsApp(`https://wa.me/${formatWhatsAppPhone(cotizacion.cliente.telefono)}`)}
              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </button>
          )}
        </div>

        {/* Lista de Ítems / Piezas de la Cotización */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Box size={15} color="var(--brand-cyan)" />
            <span>Piezas Cotizadas ({cotizacion.items?.length || 0})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cotizacion.items?.map((item, idx) => (
              <div 
                key={item.id || idx}
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {item.imagen_url ? (
                      <img 
                        src={item.imagen_url} 
                        alt={item.nombre_item} 
                        style={{ width: '45px', height: '45px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
                      />
                    ) : (
                      <div style={{ width: '45px', height: '45px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box size={20} color="var(--text-muted)" />
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff' }}>
                        {item.nombre_item} <span style={{ color: 'var(--brand-cyan)' }}>(x{item.cantidad})</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {item.alto_mm > 0 ? `${item.alto_mm}x${item.ancho_mm}x${item.profundidad_mm}mm` : 'Medidas de software'} • {item.resina_nombre}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4ade80' }}>
                      ${item.precio_total?.toLocaleString('es-CO')} COP
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      (${item.precio_unitario?.toLocaleString('es-CO')} c/u)
                    </div>
                  </div>
                </div>

                {/* Especificaciones */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: item.va_pintado ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.05)', color: item.va_pintado ? '#c084fc' : 'var(--text-muted)' }}>
                    {item.va_pintado ? '🎨 Pintado' : '⚪ Sin Pintar'}
                  </span>
                  <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: item.tiene_empaque ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)', color: item.tiene_empaque ? '#4ade80' : 'var(--text-muted)' }}>
                    {item.tiene_empaque ? '📦 Con Empaque' : '📦 Sin Empaque'}
                  </span>
                </div>

                {/* Enlaces de Compra / Modelo 3D de esta pieza */}
                {item.enlaces_compra && item.enlaces_compra.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f472b6', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShoppingCart size={12} />
                      <span>Enlaces de Compra / Descarga Modelo 3D:</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {item.enlaces_compra.map((enl, elIdx) => {
                        const plat = detect3DPlatform(enl.url);
                        return (
                          <div key={elIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)', padding: '5px 8px', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: plat.color, background: plat.bg, padding: '1px 5px', borderRadius: '3px' }}>
                                {plat.icon} {plat.name}
                              </span>
                              <span style={{ fontSize: '0.73rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {enl.titulo || plat.name}
                              </span>
                            </div>
                            <a
                              href={formatExternalUrl(enl.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm"
                              style={{
                                background: 'linear-gradient(135deg, #ec4899, #db2777)',
                                color: '#fff',
                                fontSize: '0.68rem',
                                padding: '2px 8px',
                                textDecoration: 'none',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontWeight: 700
                              }}
                            >
                              <span>Abrir</span>
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notas y Condiciones */}
        {cotizacion.notas && (
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
              Notas / Observaciones de la Cotización:
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', whiteSpace: 'pre-line' }}>
              {cotizacion.notas}
            </div>
          </div>
        )}

        {/* Total Financiero y Pagos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Valor Total Cotizado:</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--brand-cyan)' }}>
              ${cotizacion.total?.toLocaleString('es-CO')} COP
            </div>
            <div style={{ marginTop: '4px' }}>
              {cotizacion.estado_pago === 'Pagado Total' ? (
                <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  🟢 100% Pagado
                </span>
              ) : cotizacion.estado_pago === 'Abono Parcial' ? (
                <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  🟡 Abono: ${(cotizacion.abono || 0).toLocaleString('es-CO')} • Saldo: ${(cotizacion.saldo_pendiente ?? Math.max(0, (cotizacion.total || 0) - (cotizacion.abono || 0))).toLocaleString('es-CO')}
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  🔴 Sin Pago / Pendiente
                </span>
              )}
            </div>
          </div>

          {cotizacion.tiempo_entrega_estimado && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Entrega prometida:</span>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                ⏱️ {cotizacion.tiempo_entrega_estimado}
              </div>
            </div>
          )}
        </div>

        {/* Botones de Pie de Modal */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {onNavigateToCotizaciones && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const cotId = cotizacion.id;
                onClose();
                onNavigateToCotizaciones(cotId);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ExternalLink size={13} />
              <span>Ver en Pestaña Cotizaciones</span>
            </button>
          )}
          <button 
            type="button" 
            className="btn btn-primary btn-sm" 
            onClick={onClose}
            style={{ fontWeight: 700 }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
