import React from 'react';
import { 
  ChevronRight, 
  MessageCircle, 
  Compass, 
  Check, 
  Box, 
  FileCode, 
  Share2, 
  FileText, 
  ShoppingCart, 
  ExternalLink, 
  Copy, 
  Trash2, 
  CreditCard,
  Sparkles
} from 'lucide-react';
import { 
  OrdenTrabajo, 
  EstadoOT, 
  ConfiguracionTaller, 
  Cotizacion 
} from '../../../types';
import { detect3DPlatform, formatExternalUrl } from '../../../services/platformUtils';
import { getSiguienteEstado, getHandoffConfig, resolveLinksDeOT, normalizarEstadoOT } from '../utils/workshopUtils';

interface OTCardItemProps {
  ot: OrdenTrabajo;
  config: ConfiguracionTaller;
  cotizaciones?: Cotizacion[];
  copiedOtId: string | null;
  copiedLinkId: string | null;
  onUpdateEstado: (otId: string, nuevoEstado: EstadoOT) => void;
  onGenerarCuentaCobro?: (ot: OrdenTrabajo) => void;
  onOpenCotizacionModal: (ot: OrdenTrabajo) => void;
  onOpenLinksModal: (ot: OrdenTrabajo) => void;
  onOpenModalSTL: (ot: OrdenTrabajo) => void;
  onHandoffPorRol: (ot: OrdenTrabajo) => void;
  onNotificarCliente: (ot: OrdenTrabajo) => void;
  onCopyTrackingLink: (ot: OrdenTrabajo) => void;
  onCopyLink: (url: string, id: string) => void;
  onSetOtParaPago: (ot: OrdenTrabajo) => void;
  onSetOtParaEliminar: (ot: OrdenTrabajo) => void;
}

export const OTCardItem: React.FC<OTCardItemProps> = React.memo(({
  ot,
  config,
  cotizaciones = [],
  copiedOtId,
  copiedLinkId,
  onUpdateEstado,
  onGenerarCuentaCobro,
  onOpenCotizacionModal,
  onOpenLinksModal,
  onOpenModalSTL,
  onHandoffPorRol,
  onNotificarCliente,
  onCopyTrackingLink,
  onCopyLink,
  onSetOtParaPago,
  onSetOtParaEliminar
}) => {
  const estadoValido = normalizarEstadoOT(ot.estado || (ot as any).estado_actual);
  const sigEstado = getSiguienteEstado(estadoValido);
  const handoff = getHandoffConfig({ ...ot, estado: estadoValido }, config);
  const links = resolveLinksDeOT(ot, cotizaciones);

  const stlState = ot.stl_estado || 'Modelado Pendiente';
  const isStlReady = stlState === 'Diseñado por Germán' || 
                     stlState === 'Laminado por Juan' || 
                     stlState === 'En Impresora' || 
                     stlState === 'Impreso';

  return (
    <div className="ot-card">
      {/* Header de la tarjeta */}
      <div className="ot-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="ot-badge">{ot.numero_ot}</span>
          {ot.pos_venta_id || ot.cotizacion_numero?.startsWith('POS-') ? (
            <span style={{ 
              fontSize: '0.7rem', 
              background: 'rgba(56, 189, 248, 0.18)', 
              color: 'var(--brand-cyan)', 
              border: '1px solid rgba(56, 189, 248, 0.45)', 
              padding: '1px 7px', 
              borderRadius: '4px', 
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              <span>🛍️ POS: {ot.cotizacion_numero}</span>
            </span>
          ) : ot.es_proyecto_rapido ? (
            <span style={{ fontSize: '0.7rem', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
              ⚡ RAPIDO {ot.altura_cm_tarifario ? `${ot.altura_cm_tarifario}cm` : ''}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onOpenCotizacionModal(ot)}
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '6px',
                padding: '2px 8px',
                color: 'var(--brand-cyan)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
              title="Ver detalle completo de la cotización original (piezas, valores, notas, links)"
            >
              <FileText size={11} />
              <span>Cot: {ot.cotizacion_numero || 'Ver'}</span>
              <ExternalLink size={10} />
            </button>
          )}

          {/* Badge de Estado de Pago en la OT */}
          {ot.estado_pago === 'Pagado Total' ? (
            <span 
              style={{ 
                fontSize: '0.68rem', 
                background: 'rgba(16, 185, 129, 0.15)', 
                color: '#34d399', 
                border: '1px solid rgba(16, 185, 129, 0.4)', 
                padding: '1px 7px', 
                borderRadius: '4px', 
                fontWeight: 700, 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="100% Pagado"
            >
              <span>🟢 Pagado</span>
            </span>
          ) : ot.estado_pago === 'Abono Parcial' ? (
            <span 
              style={{ 
                fontSize: '0.68rem', 
                background: 'rgba(245, 158, 11, 0.15)', 
                color: '#fbbf24', 
                border: '1px solid rgba(245, 158, 11, 0.4)', 
                padding: '1px 7px', 
                borderRadius: '4px', 
                fontWeight: 700, 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title={`Abonó: $${(ot.abono || 0).toLocaleString('es-CO')} | Resta: $${(ot.saldo_pendiente || 0).toLocaleString('es-CO')}`}
            >
              <span>🟡 Abono: ${(ot.abono || 0).toLocaleString('es-CO')}</span>
              {ot.saldo_pendiente ? <span style={{ color: '#f87171' }}>• Resta: ${ot.saldo_pendiente.toLocaleString('es-CO')}</span> : null}
            </span>
          ) : (
            <span 
              style={{ 
                fontSize: '0.68rem', 
                background: 'rgba(239, 68, 68, 0.12)', 
                color: '#f87171', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                padding: '1px 7px', 
                borderRadius: '4px', 
                fontWeight: 700, 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Pendiente de pago"
            >
              <span>🔴 Sin Pago</span>
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className={`status-pill status-${estadoValido.toLowerCase().replace(/\s+/g, '-')}`}>
            {estadoValido}
          </span>
          <button
            type="button"
            onClick={() => onSetOtParaEliminar(ot)}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '6px',
              padding: '3px 6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title="Eliminar o cancelar esta Orden de Trabajo"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Pieza & Cliente */}
      <div style={{ display: 'flex', gap: '12px', margin: '10px 0' }}>
        {ot.imagen_url ? (
          <img 
            src={ot.imagen_url} 
            alt={ot.item_nombre} 
            style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-subtle)' }} 
          />
        ) : (
          <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Box size={24} color="var(--text-muted)" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: '0 0 3px 0' }}>
            {ot.item_nombre} (x{ot.cantidad})
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            👤 Cliente: <strong style={{ color: 'var(--text-main)' }}>{ot.cliente_nombre}</strong>
          </p>
          {ot.precio_cobrado && (
            <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, marginTop: '2px' }}>
              💵 Valor acordado: ${ot.precio_cobrado.toLocaleString('es-CO')} COP
            </div>
          )}
        </div>
      </div>

      {/* BLOQUE DE MODELO 3D EN INTERNET / COMPRA WEB */}
      <div style={{
        background: links.length > 0 ? 'rgba(236, 72, 153, 0.06)' : 'rgba(255, 255, 255, 0.02)',
        border: links.length > 0 ? '1px solid rgba(236, 72, 153, 0.35)' : '1px dashed rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        padding: '8px 10px',
        margin: '10px 0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: links.length > 0 ? '6px' : '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingCart size={13} color={links.length > 0 ? '#f472b6' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: links.length > 0 ? '#f472b6' : 'var(--text-muted)' }}>
              MODELO 3D WEB / ENLACE DE COMPRA
            </span>
          </div>

          <button
            type="button"
            onClick={() => onOpenLinksModal(ot)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--brand-cyan)',
              fontSize: '0.7rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: 700
            }}
          >
            {links.length > 0 ? 'Editar Links' : '+ Vincular Web'}
          </button>
        </div>

        {links.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {links.map((enl, idx) => {
              const plat = detect3DPlatform(enl.url);
              const linkId = `${ot.id}-link-${idx}`;
              const isCopied = copiedLinkId === linkId;

              return (
                <div 
                  key={idx}
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: `1px solid ${plat.borderColor}`,
                    borderRadius: '6px',
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: plat.color,
                      background: plat.bg,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      flexShrink: 0
                    }}>
                      {plat.icon} {plat.name}
                    </span>

                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {enl.titulo || plat.name}
                    </span>

                    {enl.costo_estimado && enl.costo_estimado > 0 && (
                      <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 700, flexShrink: 0 }}>
                        ${enl.costo_estimado.toLocaleString('es-CO')}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <a
                      href={formatExternalUrl(enl.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm"
                      style={{
                        background: 'linear-gradient(135deg, #ec4899, #db2777)',
                        color: '#fff',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        textDecoration: 'none',
                        borderRadius: '5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(236, 72, 153, 0.3)'
                      }}
                      title={`Abrir página web de compra/descarga de ${plat.name}`}
                    >
                      <span>🛒 Abrir en {plat.name}</span>
                      <ExternalLink size={10} />
                    </a>

                    <button
                      type="button"
                      onClick={() => onCopyLink(enl.url, linkId)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.68rem', padding: '3px 6px' }}
                      title="Copiar enlace al portapapeles"
                    >
                      {isCopied ? <Check size={11} color="#4ade80" /> : <Copy size={11} />}
                      <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>⚠️ Sin enlace web de modelo guardado</span>
            <button
              type="button"
              onClick={() => onOpenLinksModal(ot)}
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: 'var(--brand-cyan)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.7rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              + Pegar Link
            </button>
          </div>
        )}
      </div>

      {/* BLOQUE DE TRAZABILIDAD STL (Germán ➔ Juan) */}
      <div style={{ 
        background: 'rgba(56, 189, 248, 0.05)', 
        border: '1px solid rgba(56, 189, 248, 0.2)', 
        borderRadius: '8px', 
        padding: '8px 10px', 
        margin: '10px 0' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileCode size={14} color="var(--brand-cyan)" />
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--brand-cyan)' }}>
              TRAZABILIDAD MODELO 3D (STL)
            </span>
          </div>

          <button
            type="button"
            onClick={() => onOpenModalSTL(ot)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--brand-cyan)',
              fontSize: '0.7rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: 700
            }}
          >
            Editar STL
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
          <span style={{ 
            fontSize: '0.72rem', 
            fontWeight: 800, 
            padding: '2px 8px', 
            borderRadius: '4px',
            background: isStlReady ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: isStlReady ? '#34d399' : '#fbbf24'
          }}>
            {stlState} ({ot.stl_version || 'v1.0'})
          </span>

          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Germán ➔ {ot.operador_asignado?.split(' ')[0] || 'Juan'}
          </span>
        </div>

        {(ot.pos_venta_id || ot.cotizacion_numero?.startsWith('POS-')) && (
          <div style={{
            marginTop: '5px',
            fontSize: '0.68rem',
            fontWeight: 700,
            color: isStlReady ? '#34d399' : '#fbbf24',
            background: 'rgba(0,0,0,0.2)',
            padding: '3px 6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>{isStlReady ? '🟢' : '🎨'}</span>
            <span>
              {isStlReady 
                ? 'Venta POS: Diseño listo para producción' 
                : 'Venta POS: Requiere diseño nuevo por Germán'}
            </span>
          </div>
        )}

        {/* Acciones de STL */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          {ot.stl_url && (
            <a 
              href={ot.stl_url} 
              target="_blank" 
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.68rem', padding: '2px 8px', textDecoration: 'none' }}
              title="Descargar o inspeccionar el archivo STL"
            >
              <ExternalLink size={11} />
              <span>Descargar STL</span>
            </a>
          )}

          <button
            type="button"
            className="btn btn-whatsapp btn-sm"
            onClick={() => onHandoffPorRol(ot)}
            style={{ fontSize: '0.68rem', padding: '2px 8px' }}
            title={handoff.title}
          >
            <Share2 size={11} />
            <span>{handoff.label}</span>
          </button>
        </div>
      </div>

      {/* Especificaciones técnicas de taller */}
      <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px', fontSize: '0.78rem', margin: '10px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>🖨️ {ot.maquina_nombre}</span>
          <span>🧪 {ot.resina_nombre}</span>
        </div>
        <div style={{ color: 'var(--text-subtle)', marginBottom: '4px' }}>
          ⏱️ Impresión: ~{ot.tiempo_impresion_min} min | Pintura: ~{ot.tiempo_pintura_min} min
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
          <span style={{ color: ot.va_pintado ? '#c084fc' : 'var(--text-muted)' }}>
            {ot.va_pintado ? '🎨 Con Pintura' : '⚪ Sin Pintura'}
          </span>
          <span style={{ color: ot.tiene_empaque ? '#4ade80' : 'var(--text-muted)' }}>
            {ot.tiene_empaque ? '📦 Con Empaque' : '📦 Sin Empaque'}
          </span>
        </div>
      </div>

      {/* Acciones de la OT */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
        {sigEstado && (
          <button 
            className="btn btn-primary btn-sm" 
            style={{ flex: 1 }}
            onClick={() => onUpdateEstado(ot.id, sigEstado)}
          >
            <span>Avanzar a {sigEstado}</span>
            <ChevronRight size={14} />
          </button>
        )}

        <button 
          type="button"
          className="btn btn-whatsapp btn-sm"
          onClick={() => onHandoffPorRol(ot)}
          title={handoff.title}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
        >
          <Share2 size={13} />
          <span>{handoff.label}</span>
        </button>

        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => onNotificarCliente(ot)}
          title="Enviar actualización y enlace de seguimiento por WhatsApp al cliente"
        >
          <MessageCircle size={14} />
          <span>Avisar Cliente</span>
        </button>

        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => onCopyTrackingLink(ot)}
          title="Copiar enlace de seguimiento en vivo para el cliente"
        >
          {copiedOtId === ot.id ? <Check size={14} color="#4ade80" /> : <Compass size={14} color="var(--brand-cyan)" />}
          <span>{copiedOtId === ot.id ? '¡Copiado!' : 'Rastreo'}</span>
        </button>

        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => onSetOtParaPago(ot)}
          style={{ 
            borderColor: ot.estado_pago === 'Pagado Total' ? 'rgba(16, 185, 129, 0.4)' : ot.estado_pago === 'Abono Parcial' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(239, 68, 68, 0.35)', 
            color: ot.estado_pago === 'Pagado Total' ? '#34d399' : ot.estado_pago === 'Abono Parcial' ? '#fbbf24' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Registrar o actualizar pago / abono recibido de esta orden"
        >
          <CreditCard size={13} />
          <span>Pago</span>
        </button>

        <button 
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onSetOtParaEliminar(ot)}
          style={{ 
            borderColor: 'rgba(239, 68, 68, 0.35)', 
            color: '#f87171',
            background: 'rgba(239, 68, 68, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Cancelar y eliminar orden si el comprador se arrepintió u otro motivo"
        >
          <Trash2 size={13} />
          <span>Eliminar OT</span>
        </button>

        {(estadoValido === 'Listo para Entrega' || (ot as any).estado_actual === 'ENTREGADO') && onGenerarCuentaCobro && (
          <button 
            className="btn btn-cyan btn-sm"
            onClick={() => onGenerarCuentaCobro({ ...ot, estado: estadoValido })}
            style={{ width: '100%' }}
          >
            <Sparkles size={14} />
            <span>Generar Cuenta de Cobro</span>
          </button>
        )}
      </div>
    </div>
  );
});

OTCardItem.displayName = 'OTCardItem';
