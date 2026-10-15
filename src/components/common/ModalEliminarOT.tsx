import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  User, 
  Box, 
  DollarSign, 
  FileText, 
  ShieldAlert, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { OrdenTrabajo, Cotizacion, EstadoCotizacion } from '../../types';

interface ModalEliminarOTProps {
  isOpen: boolean;
  ot: OrdenTrabajo | null;
  cotizaciones?: Cotizacion[];
  onClose: () => void;
  onConfirmarEliminar: (
    otId: string, 
    motivo: string, 
    revertirCotizacion?: boolean, 
    nuevoEstadoCot?: EstadoCotizacion
  ) => void;
}

const MOTIVOS_RAPIDOS = [
  { id: 'arrepentimiento', label: '🙅 Comprador se arrepintió / canceló compra' },
  { id: 'error_orden', label: '⚠️ Error al crear o duplicado de orden' },
  { id: 'cambio_cotizacion', label: '🔄 Cotización modificada o reemplazada' },
  { id: 'problema_tecnico', label: '⚙️ Falla técnica o falta de insumos' }
];

export const ModalEliminarOT: React.FC<ModalEliminarOTProps> = ({
  isOpen,
  ot,
  cotizaciones = [],
  onClose,
  onConfirmarEliminar
}) => {
  if (!isOpen || !ot) return null;

  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>(MOTIVOS_RAPIDOS[0].label);
  const [notaAdicional, setNotaAdicional] = useState<string>('');
  
  // Buscar cotización vinculada
  const cotizacionVinculada = cotizaciones.find(c => 
    (ot.cotizacion_id && c.id === ot.cotizacion_id) ||
    (ot.cotizacion_numero && c.numero_cot === ot.cotizacion_numero)
  );

  const tieneCotizacion = Boolean(cotizacionVinculada || ot.cotizacion_numero);
  const [actualizarCotizacion, setActualizarCotizacion] = useState<boolean>(true);
  const [nuevoEstadoCotizacion, setNuevoEstadoCotizacion] = useState<EstadoCotizacion>('Rechazada');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Validar si tiene anticipos o abonos
  const tieneAbonoOPago = (ot.abono && ot.abono > 0) || ot.estado_pago === 'Pagado Total' || ot.estado_pago === 'Abono Parcial';
  const montoPagado = ot.abono || (ot.estado_pago === 'Pagado Total' ? ot.precio_cobrado || 0 : 0);

  const handleConfirmar = () => {
    setIsDeleting(true);
    const motivoFinal = notaAdicional.trim() 
      ? `${motivoSeleccionado} - Detalle: ${notaAdicional.trim()}`
      : motivoSeleccionado;

    onConfirmarEliminar(
      ot.id,
      motivoFinal,
      tieneCotizacion ? actualizarCotizacion : false,
      nuevoEstadoCotizacion
    );
    setIsDeleting(false);
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card"
        style={{
          maxWidth: '540px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 12px 40px rgba(239, 68, 68, 0.25)',
          padding: '24px',
          position: 'relative',
          background: 'linear-gradient(180deg, #160c11 0%, #0c080d 100%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Trash2 size={24} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>
              Eliminar Orden de Trabajo
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Cancela la manufactura de esta pieza y retírala del taller.
            </p>
          </div>
        </div>

        {/* Ficha Resumen de la Orden */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              fontWeight: 800,
              fontSize: '0.82rem',
              padding: '2px 8px',
              borderRadius: '5px',
              border: '1px solid rgba(239, 68, 68, 0.4)'
            }}>
              {ot.numero_ot}
            </span>
            <span className={`status-pill status-${ot.estado.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '0.72rem' }}>
              Estado: {ot.estado}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {ot.imagen_url ? (
              <img 
                src={ot.imagen_url} 
                alt={ot.item_nombre} 
                style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
              />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box size={22} color="var(--text-muted)" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#fff' }}>
                {ot.item_nombre} <span style={{ color: 'var(--brand-cyan)' }}>(x{ot.cantidad})</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <User size={12} />
                <span>{ot.cliente_nombre} {ot.cliente_telefono ? `(${ot.cliente_telefono})` : ''}</span>
              </div>
              {ot.precio_cobrado && (
                <div style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 700, marginTop: '2px' }}>
                  Valor acordado: ${ot.precio_cobrado.toLocaleString('es-CO')} COP
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ALERTA DE PAGO / ABONO REGISTRADO (CRÍTICO) */}
        {tieneAbonoOPago && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start'
          }}>
            <ShieldAlert size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fbbf24' }}>
                ¡Atención con el Dinero del Cliente!
              </div>
              <div style={{ fontSize: '0.76rem', color: '#fef08a', marginTop: '2px', lineHeight: 1.4 }}>
                Esta orden tiene registrado un estado de pago <strong>"{ot.estado_pago}"</strong> con 
                un abono/pago de <strong>${montoPagado.toLocaleString('es-CO')} COP</strong>
                {ot.metodo_pago ? ` (${ot.metodo_pago})` : ''}.
                <br />
                Si el comprador se arrepintió, recuerda coordinar con el cliente la devolución del dinero o abonarlo a futuros pedidos.
              </div>
            </div>
          </div>
        )}

        {/* Selector de Motivo de Cancelación */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
            Motivo de la cancelación / eliminación:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {MOTIVOS_RAPIDOS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMotivoSeleccionado(m.label)}
                style={{
                  background: motivoSeleccionado === m.label ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: motivoSeleccionado === m.label ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  color: motivoSeleccionado === m.label ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{m.label}</span>
                {motivoSeleccionado === m.label && <CheckCircle2 size={16} color="#ef4444" />}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '8px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Nota o detalle adicional (opcional)..."
              value={notaAdicional}
              onChange={(e) => setNotaAdicional(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '8px 10px' }}
            />
          </div>
        </div>

        {/* Sincronización con Cotización Vinculada */}
        {tieneCotizacion && (
          <div style={{
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>
              <input
                type="checkbox"
                checked={actualizarCotizacion}
                onChange={(e) => setActualizarCotizacion(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--brand-cyan)' }}
              />
              <span>Actualizar cotización vinculada #{ot.cotizacion_numero || cotizacionVinculada?.numero_cot}</span>
            </label>

            {actualizarCotizacion && (
              <div style={{ marginTop: '8px', paddingLeft: '24px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Cambiar el estado de la cotización a:
                </span>
                <select
                  className="input-field"
                  value={nuevoEstadoCotizacion}
                  onChange={(e) => setNuevoEstadoCotizacion(e.target.value as EstadoCotizacion)}
                  style={{ fontSize: '0.82rem', padding: '6px 10px', width: 'auto' }}
                >
                  <option value="Rechazada">❌ Rechazada / Cancelada por cliente (Recomendado)</option>
                  <option value="Borrador">✏️ Borrador (Para editar en el cotizador)</option>
                  <option value="Enviada">📩 Enviada (Pendiente de respuesta)</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Botones de Acción */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Conservar Orden
          </button>

          <button
            type="button"
            className="btn"
            onClick={handleConfirmar}
            disabled={isDeleting}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              color: '#fff',
              border: 'none',
              padding: '8px 18px',
              fontSize: '0.88rem',
              fontWeight: 800,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={16} />
            <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar Orden'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
