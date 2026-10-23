import React, { useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  Share2, 
  MessageCircle, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { OrdenTrabajo, EstadoOT } from '../../types';

interface OTCardProps {
  ot: OrdenTrabajo;
  onUpdateEstado: (otId: string, nuevoEstado: EstadoOT) => void;
  onRegistrarAbono: (otId: string, monto: number, metodo: string, referencia?: string) => Promise<void>;
}

export const OTCard: React.FC<OTCardProps> = ({
  ot,
  onUpdateEstado,
  onRegistrarAbono,
}) => {
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [montoAbono, setMontoAbono] = useState<number>(0);
  const [metodoAbono, setMetodoAbono] = useState<'Nequi' | 'Bre-B' | 'Efectivo'>('Bre-B');
  const [referenciaAbono, setReferenciaAbono] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = Number(ot.precio_cobrado || 0);
  const abonado = Number(ot.abono || 0);
  const saldo = Number(ot.saldo_pendiente ?? Math.max(0, total - abonado));
  const porcentajeAbonado = total > 0 ? Math.min(100, Math.round((abonado / total) * 100)) : 100;
  const cumple50 = total === 0 || abonado >= total * 0.5;
  const faltante50 = Math.max(0, total * 0.5 - abonado);

  const handleAdvanceState = (siguienteEstado: EstadoOT) => {
    if (!cumple50 && ['Imprimiendo', 'Curado', 'Pintura y Armado'].includes(siguienteEstado)) {
      alert(`⚠️ BLOQUEO TALLER: Se requiere al menos el 50% de anticipo ($${faltante50.toLocaleString('es-CO')} COP faltantes) para pasar a ${siguienteEstado}.`);
      return;
    }
    if (siguienteEstado === 'Listo para Entrega' && saldo > 0) {
      if (!confirm(`⚠️ AVISO DE DESPACHO: Esta orden aún tiene un saldo de $${saldo.toLocaleString('es-CO')} COP. ¿Deseas marcar como lista para entrega? (Para entrega final debe liquidarse el 100%).`)) {
        return;
      }
    }
    onUpdateEstado(ot.id, siguienteEstado);
  };

  const submitAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoAbono <= 0) return;
    setIsSubmitting(true);
    try {
      await onRegistrarAbono(ot.id, montoAbono, metodoAbono, referenciaAbono);
      setShowAbonoModal(false);
      setMontoAbono(0);
      setReferenciaAbono('');
    } catch (err: any) {
      alert(`Error al registrar abono: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Traspaso dinámico según rol operativo
  const getHandoffConfig = () => {
    switch (ot.estado) {
      case 'En Cola':
        return {
          label: 'A Juan (Impresión)',
          nombre: 'Juan',
          telefono: '573217273025',
          mensaje: `👋 ¡Hola Juan! Te paso la orden *${ot.numero_ot}* (${ot.item_nombre}) para impresión en WJGEEKS 3D. ¡Abono registrado: $${abonado.toLocaleString('es-CO')} COP!`
        };
      case 'Imprimiendo':
        return {
          label: 'Curado (Juan)',
          nombre: 'Juan',
          telefono: '573217273025',
          mensaje: `👋 ¡Hola Juan! La pieza *${ot.numero_ot}* (${ot.item_nombre}) completó impresión. Proceder con lavado y curado UV.`
        };
      case 'Curado':
        return {
          label: 'A Wendy (Pintura)',
          nombre: 'Wendy',
          telefono: '573204814702',
          mensaje: `👋 ¡Hola Wendy! La pieza *${ot.numero_ot}* (${ot.item_nombre}) está curada y lista para acabados y pintura en WJGEEKS 3D.`
        };
      case 'Pintura y Armado':
        return {
          label: 'A Calidad',
          nombre: 'Equipo',
          telefono: '573503443140',
          mensaje: `🚨 [CONTROL DE CALIDAD] La orden *${ot.numero_ot}* (${ot.item_nombre}) completó pintura y armado. Lista para inspección tripartita.`
        };
      case 'Control de Calidad':
        return {
          label: 'A Germán',
          nombre: 'Germán',
          telefono: '573503443140',
          mensaje: `👋 ¡Hola Germán! La orden *${ot.numero_ot}* superó calidad. Saldo pendiente: $${saldo.toLocaleString('es-CO')} COP. Lista para cobro y despacho.`
        };
      default:
        return {
          label: 'Avisar Cliente',
          nombre: ot.cliente_nombre || 'Cliente',
          telefono: ot.cliente_telefono?.replace(/\D/g, '') || '',
          mensaje: `👋 ¡Hola ${ot.cliente_nombre}! Tu pedido *${ot.numero_ot}* está listo para entrega en WJGEEKS 3D. Saldo pendiente: $${saldo.toLocaleString('es-CO')} COP.`
        };
    }
  };

  const handleHandoff = () => {
    const handoff = getHandoffConfig();
    if (!handoff.telefono) {
      alert('No hay teléfono registrado para este aviso.');
      return;
    }
    window.open(`https://wa.me/${handoff.telefono}?text=${encodeURIComponent(handoff.mensaje)}`, '_blank');
  };

  return (
    <div
      style={{
        backgroundColor: '#111827',
        borderRadius: '12px',
        border: `1px solid ${cumple50 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(245, 158, 11, 0.4)'}`,
        padding: '16px',
        marginBottom: '12px',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header de la tarjeta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
            {ot.numero_ot}
          </span>
          <h4 style={{ margin: '2px 0 0', fontSize: '1rem', color: '#fff', fontWeight: 700 }}>
            {ot.item_nombre}
          </h4>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            Cliente: {ot.cliente_nombre} {ot.cliente_telefono ? `• ${ot.cliente_telefono}` : ''}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
          }}
        >
          {ot.estado}
        </span>
      </div>

      {/* Barra de progreso financiero (Regla del 50%) */}
      <div style={{ margin: '12px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
          <span style={{ color: '#9ca3af' }}>
            Abonado: <strong style={{ color: '#fff' }}>${abonado.toLocaleString('es-CO')}</strong> / ${total.toLocaleString('es-CO')}
          </span>
          <span style={{ fontWeight: 800, color: cumple50 ? '#34d399' : '#fbbf24' }}>
            {porcentajeAbonado}%
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: '#1f2937', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${porcentajeAbonado}%`,
              height: '100%',
              backgroundColor: porcentajeAbonado >= 100 ? '#10b981' : cumple50 ? '#38bdf8' : '#f59e0b',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Alerta de bloqueo 50% */}
        {!cumple50 && (
          <div
            style={{
              marginTop: '8px',
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldAlert size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span>
              Requiere 50% mín. (${faltante50.toLocaleString('es-CO')} COP restantes) para iniciar producción.
            </span>
          </div>
        )}
      </div>

      {/* Controles de avance y botones de acción */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '14px' }}>
        <button
          type="button"
          onClick={() => setShowAbonoModal(true)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#34d399',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <DollarSign size={14} />
          <span>Abonar</span>
        </button>

        {(() => {
          const handoff = getHandoffConfig();
          return (
            <button
              type="button"
              onClick={handleHandoff}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                color: '#4ade80',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
              title={`Avisar a ${handoff.nombre} por WhatsApp`}
            >
              <Share2 size={13} />
              <span>{handoff.label}</span>
            </button>
          );
        })()}

        {ot.estado === 'En Cola' && (
          <button
            type="button"
            disabled={!cumple50}
            onClick={() => handleAdvanceState('Imprimiendo')}
            style={{
              flex: 1.5,
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: cumple50 ? '#0284c7' : '#374151',
              color: cumple50 ? '#fff' : '#9ca3af',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: cumple50 ? 'pointer' : 'not-allowed',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <span>A Impresión</span>
            <ChevronRight size={14} />
          </button>
        )}

        {ot.estado === 'Imprimiendo' && (
          <button
            type="button"
            onClick={() => handleAdvanceState('Curado')}
            style={{
              flex: 1.5,
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: '#0284c7',
              color: '#fff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <span>A Curado UV</span>
            <ChevronRight size={14} />
          </button>
        )}

        {ot.estado === 'Curado' && (
          <button
            type="button"
            onClick={() => handleAdvanceState('Pintura y Armado')}
            style={{
              flex: 1.5,
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: '#a855f7',
              color: '#fff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <span>A Pintura (Wendy)</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Modal de Registro de Abono con datos bancarios oficiales */}
      {showAbonoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 999,
          }}
          onClick={() => setShowAbonoModal(false)}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '16px',
              padding: '20px',
              maxWidth: '380px',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: '#fff' }}>
              Registrar Abono - {ot.numero_ot}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#94a3b8' }}>
              Saldo pendiente: <strong style={{ color: '#38bdf8' }}>${saldo.toLocaleString('es-CO')} COP</strong>
            </p>

            {/* Medios de Pago Oficiales WJGEEKS */}
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: '#cbd5e1',
                marginBottom: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div>• <strong>Bre-B (Llave Única):</strong> <code>0090778625</code></div>
              <div>• <strong>Nequi Taller:</strong> <code>3217273025</code> (Juan)</div>
            </div>

            <form onSubmit={submitAbono}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Monto del Abono (COP):
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  max={saldo > 0 ? saldo : undefined}
                  value={montoAbono || ''}
                  onChange={(e) => setMontoAbono(Number(e.target.value))}
                  placeholder={`Mínimo sugerido: $${faltante50.toLocaleString('es-CO')}`}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Método de Pago:
                </label>
                <select
                  value={metodoAbono}
                  onChange={(e: any) => setMetodoAbono(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Bre-B">Bre-B (Llave 0090778625)</option>
                  <option value="Nequi">Nequi (3217273025)</option>
                  <option value="Efectivo">Efectivo en Taller</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Referencia / Comprobante:
                </label>
                <input
                  type="text"
                  value={referenciaAbono}
                  onChange={(e) => setReferenciaAbono(e.target.value)}
                  placeholder="Ej: M1284920"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAbonoModal(false)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid #475569',
                    color: '#cbd5e1',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || montoAbono <= 0}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
