import React, { useEffect, useState } from 'react';
import {
  Trash2,
  User,
  Box,
  ShieldAlert,
  CheckCircle2,
  Ban,
  Undo2,
  FlaskConical
} from 'lucide-react';
import {
  OrdenTrabajo,
  Cotizacion,
  EstadoCotizacion,
  TratamientoAbonoOT
} from '../../types';
import {
  WjgBadge,
  WjgButton,
  WjgModal,
  WjgSelect,
  WjgSwitch,
  WjgTextArea
} from '../ui';

interface ModalEliminarOTProps {
  isOpen: boolean;
  ot: OrdenTrabajo | null;
  cotizaciones?: Cotizacion[];
  onClose: () => void;
  onConfirmarEliminar: (
    otId: string,
    motivo: string,
    revertirCotizacion?: boolean,
    nuevoEstadoCot?: EstadoCotizacion,
    tratamientoAbono?: TratamientoAbonoOT
  ) => void;
}

const MOTIVOS_RAPIDOS = [
  { id: 'arrepentimiento', label: '🙅 Comprador se arrepintió / canceló compra' },
  { id: 'error_orden', label: '⚠️ Error al crear o duplicado de orden' },
  { id: 'cambio_cotizacion', label: '🔄 Cotización modificada o reemplazada' },
  { id: 'problema_tecnico', label: '⚙️ Falla técnica o falta de insumos' },
  { id: 'prueba_sistema', label: '🧪 Registro de prueba o duplicado de sistema' },
];

const TRATAMIENTO_OPTIONS: Array<{
  id: TratamientoAbonoOT;
  title: string;
  desc: string;
  border: string;
  bg: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'retener_abono',
    title: 'Retener abono por gastos / producción iniciada',
    desc: 'Conserva el dinero en caja y marca el abono como Retenido por Cancelación en el libro contable.',
    border: 'rgba(245, 158, 11, 0.45)',
    bg: 'rgba(245, 158, 11, 0.1)',
    icon: <Ban size={16} color="#fbbf24" />,
  },
  {
    id: 'devolver_abono',
    title: 'Devolver dinero al cliente (registrar egreso)',
    desc: 'Genera automáticamente un egreso en Flujo de Caja (DEVOLUCION_CLIENTE) para descontar el reembolso.',
    border: 'rgba(56, 189, 248, 0.45)',
    bg: 'rgba(56, 189, 248, 0.1)',
    icon: <Undo2 size={16} color="#38bdf8" />,
  },
  {
    id: 'purgar_prueba',
    title: 'Purgar registro de prueba o duplicado',
    desc: 'Elimina la OT, revierte a $0 los abonos asociados en abonos_pagos y limpia cuentas locales vinculadas.',
    border: 'rgba(239, 68, 68, 0.5)',
    bg: 'rgba(239, 68, 68, 0.12)',
    icon: <FlaskConical size={16} color="#f87171" />,
  },
];

export const ModalEliminarOT: React.FC<ModalEliminarOTProps> = ({
  isOpen,
  ot,
  cotizaciones = [],
  onClose,
  onConfirmarEliminar
}) => {
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>(MOTIVOS_RAPIDOS[0].label);
  const [notaAdicional, setNotaAdicional] = useState<string>('');
  const [actualizarCotizacion, setActualizarCotizacion] = useState<boolean>(true);
  const [nuevoEstadoCotizacion, setNuevoEstadoCotizacion] = useState<EstadoCotizacion>('Rechazada');
  const [tratamientoAbono, setTratamientoAbono] = useState<TratamientoAbonoOT>('retener_abono');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const tieneAbonoOPago = Boolean(
    ot &&
      ((ot.abono && ot.abono > 0) ||
        ot.estado_pago === 'Pagado Total' ||
        ot.estado_pago === 'Abono Parcial')
  );
  const montoPagado = ot
    ? ot.abono || (ot.estado_pago === 'Pagado Total' ? ot.precio_cobrado || 0 : 0)
    : 0;

  useEffect(() => {
    if (!isOpen || !ot) return;
    setMotivoSeleccionado(MOTIVOS_RAPIDOS[0].label);
    setNotaAdicional('');
    setActualizarCotizacion(true);
    setNuevoEstadoCotizacion('Rechazada');
    setTratamientoAbono(tieneAbonoOPago ? 'retener_abono' : 'purgar_prueba');
    setIsDeleting(false);
  }, [isOpen, ot?.id, tieneAbonoOPago]);

  if (!isOpen || !ot) return null;

  const cotizacionVinculada = cotizaciones.find(
    c =>
      (ot.cotizacion_id && c.id === ot.cotizacion_id) ||
      (ot.cotizacion_numero && c.numero_cot === ot.cotizacion_numero)
  );
  const tieneCotizacion = Boolean(cotizacionVinculada || ot.cotizacion_numero);
  const esMotivoPrueba = motivoSeleccionado.includes('Registro de prueba');

  const handleSelectMotivo = (label: string) => {
    setMotivoSeleccionado(label);
    if (label.includes('Registro de prueba')) {
      setTratamientoAbono('purgar_prueba');
      setActualizarCotizacion(false);
    }
  };

  const handleConfirmar = () => {
    setIsDeleting(true);
    const motivoFinal = notaAdicional.trim()
      ? `${motivoSeleccionado} - Detalle: ${notaAdicional.trim()}`
      : motivoSeleccionado;

    onConfirmarEliminar(
      ot.id,
      motivoFinal,
      tieneCotizacion ? actualizarCotizacion : false,
      nuevoEstadoCotizacion,
      tratamientoAbono
    );
    setIsDeleting(false);
    onClose();
  };

  return (
    <WjgModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="580px"
      borderColor="rgba(239, 68, 68, 0.45)"
      zIndex={99999}
      title="Eliminar / Cancelar Orden de Trabajo"
      subtitle="Define el motivo y el tratamiento contable del abono en Supabase"
      icon={<Trash2 size={20} color="#f87171" />}
      footer={
        <>
          <WjgButton variant="secondary" size="sm" onClick={onClose} disabled={isDeleting}>
            Conservar Orden
          </WjgButton>
          <WjgButton
            variant="danger"
            size="sm"
            loading={isDeleting}
            leftIcon={<Trash2 size={15} />}
            onClick={handleConfirmar}
          >
            {tratamientoAbono === 'purgar_prueba' ? 'Purgar Orden y Registros' : 'Confirmar Cancelación'}
          </WjgButton>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Ficha Resumen de la Orden */}
        <div
          style={{
            background: 'rgba(2, 6, 23, 0.55)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
            <WjgBadge variant="danger">{ot.numero_ot}</WjgBadge>
            <WjgBadge variant="neutral">Estado: {ot.estado}</WjgBadge>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {ot.imagen_url ? (
              <img
                src={ot.imagen_url}
                alt={ot.item_nombre}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box size={22} color="var(--text-muted)" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#fff' }}>
                {ot.item_nombre} <span style={{ color: 'var(--brand-cyan)' }}>(x{ot.cantidad})</span>
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '2px',
                }}
              >
                <User size={12} />
                <span>
                  {ot.cliente_nombre} {ot.cliente_telefono ? `(${ot.cliente_telefono})` : ''}
                </span>
              </div>
              {ot.precio_cobrado ? (
                <div style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 700, marginTop: '2px' }}>
                  Valor acordado: ${ot.precio_cobrado.toLocaleString('es-CO')} COP
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ALERTA DE PAGO Y POLÍTICA CONTABLE EN 3 VÍAS */}
        {(tieneAbonoOPago || esMotivoPrueba) && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <ShieldAlert size={19} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fbbf24' }}>
                  {tieneAbonoOPago
                    ? `Dinero registrado: $${montoPagado.toLocaleString('es-CO')} COP (${ot.metodo_pago || 'Medio por definir'})`
                    : 'Política de Limpieza Contable de Registros'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#fde68a', marginTop: '2px', lineHeight: 1.4 }}>
                  Elige exactamente qué hacer en Contabilidad (abonos_pagos / egresos_taller) al retirar esta orden:
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {TRATAMIENTO_OPTIONS.map(opt => {
                const selected = tratamientoAbono === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTratamientoAbono(opt.id)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: selected ? `1.5px solid ${opt.border}` : '1px solid rgba(255,255,255,0.08)',
                      background: selected ? opt.bg : 'rgba(15, 23, 42, 0.55)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <span style={{ marginTop: '2px', flexShrink: 0 }}>{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: selected ? '#fff' : '#cbd5e1' }}>
                        {opt.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.35 }}>
                        {opt.desc}
                      </div>
                    </div>
                    {selected && <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selector de Motivo */}
        <div>
          <label className="form-label">Motivo de la cancelación / eliminación</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {MOTIVOS_RAPIDOS.map(m => {
              const selected = motivoSeleccionado === m.label;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMotivo(m.label)}
                  style={{
                    background: selected ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    border: selected ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    textAlign: 'left',
                    fontSize: '0.82rem',
                    color: selected ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{m.label}</span>
                  {selected && <CheckCircle2 size={16} color="#ef4444" />}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: '10px' }}>
            <WjgTextArea
              label="Nota o explicación detallada (queda en auditoría contable)"
              value={notaAdicional}
              onChange={setNotaAdicional}
              rows={2}
              placeholder="Ej: Cliente canceló tras 4h de impresión en resina; se retiene el anticipo para cubrir material y tiempo de máquina..."
            />
          </div>
        </div>

        {/* Sincronización con Cotización Vinculada */}
        {tieneCotizacion && (
          <div
            style={{
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <WjgSwitch
              checked={actualizarCotizacion}
              onChange={setActualizarCotizacion}
              label={`Actualizar cotización vinculada #${ot.cotizacion_numero || cotizacionVinculada?.numero_cot}`}
              description="Sincroniza el estado de la cotización comercial con esta cancelación"
            />

            {actualizarCotizacion && (
              <div>
                <label className="form-label">Nuevo estado de la cotización</label>
                <WjgSelect
                  compact
                  value={nuevoEstadoCotizacion}
                  onChange={val => setNuevoEstadoCotizacion(val as EstadoCotizacion)}
                  options={[
                    { value: 'Rechazada', label: '❌ Rechazada / Cancelada por cliente', subtitle: 'Recomendado' },
                    { value: 'Borrador', label: '✏️ Borrador', subtitle: 'Para editar en el cotizador' },
                    { value: 'Enviada', label: '📩 Enviada', subtitle: 'Pendiente de respuesta' },
                  ]}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </WjgModal>
  );
};
