import React from 'react';
import { CreditCard, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import { EstadoPago } from '../../../types';
import { CotizadorPaymentWarningProps } from '../types/cotizador.types';

export const CotizadorPaymentWarning: React.FC<CotizadorPaymentWarningProps> = React.memo(({
  total,
  estadoPagoInicial,
  setEstadoPagoInicial,
  abonoInicial,
  setAbonoInicial,
  metodoPagoInicial,
  setMetodoPagoInicial,
  abonoEfectivo,
  saldoPendiente
}) => {
  const minimo50 = Math.ceil(total * 0.5);
  const cumple50 = abonoEfectivo >= minimo50;
  const porcentaje = total > 0 ? Math.round((abonoEfectivo / total) * 100) : 0;

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.35)',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      borderRadius: '12px',
      padding: '16px',
      margin: '16px 0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={16} color="var(--brand-cyan)" />
          <span>Estado de Pago / Anticipo (Política WJGEEKS)</span>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Mínimo sugerido: 50% anticipo
        </span>
      </div>

      {/* Selector de Estado de Pago Inicial */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
        <button
          type="button"
          className={`btn btn-sm ${estadoPagoInicial === 'Pendiente' ? 'btn-danger' : 'btn-secondary'}`}
          style={estadoPagoInicial === 'Pendiente' ? { background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', color: '#fca5a5' } : {}}
          onClick={() => {
            setEstadoPagoInicial('Pendiente');
            setAbonoInicial(0);
          }}
        >
          🔴 Sin Pago (Pendiente)
        </button>

        <button
          type="button"
          className={`btn btn-sm ${estadoPagoInicial === 'Abono Parcial' ? 'btn-primary' : 'btn-secondary'}`}
          style={estadoPagoInicial === 'Abono Parcial' ? { background: 'rgba(245, 158, 11, 0.2)', borderColor: '#f59e0b', color: '#fbbf24' } : {}}
          onClick={() => {
            setEstadoPagoInicial('Abono Parcial');
            if (abonoInicial === 0) setAbonoInicial(minimo50);
          }}
        >
          🟡 Abono (Anticipo)
        </button>

        <button
          type="button"
          className={`btn btn-sm ${estadoPagoInicial === 'Pagado Total' ? 'btn-cyan' : 'btn-secondary'}`}
          style={estadoPagoInicial === 'Pagado Total' ? { background: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981', color: '#34d399' } : {}}
          onClick={() => {
            setEstadoPagoInicial('Pagado Total');
            setAbonoInicial(total);
          }}
        >
          🟢 Pago Total (100%)
        </button>
      </div>

      {/* Regla del 50%: Panel de Abono con Presets */}
      {estadoPagoInicial === 'Abono Parcial' && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${cumple50 ? 'rgba(34, 197, 94, 0.35)' : 'rgba(245, 158, 11, 0.4)'}`,
          borderRadius: '10px',
          padding: '12px',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fbbf24' }}>
              Monto Abonado por el Cliente:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.72rem', borderColor: '#eab308', color: '#fef08a' }}
                onClick={() => setAbonoInicial(minimo50)}
              >
                ⭐ 50% (${minimo50.toLocaleString('es-CO')})
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                onClick={() => setAbonoInicial(Math.round(total * 0.3))}
              >
                30% (${Math.round(total * 0.3).toLocaleString('es-CO')})
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                onClick={() => setAbonoInicial(Math.round(total * 0.7))}
              >
                70% (${Math.round(total * 0.7).toLocaleString('es-CO')})
              </button>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#fbbf24', fontWeight: 700 }}>$</span>
            <input
              type="number"
              min="0"
              max={total}
              step="1000"
              className="form-input"
              style={{ paddingLeft: '24px', fontWeight: 700, color: '#fbbf24' }}
              value={abonoInicial}
              onChange={(e) => setAbonoInicial(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Banner de Advertencia de la Regla del 50% */}
          {!cumple50 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              color: '#f87171',
              fontSize: '0.74rem',
              fontWeight: 600
            }}>
              <AlertTriangle size={14} />
              <span>
                Atención: El anticipo actual es del {porcentaje}% (faltan ${(minimo50 - abonoEfectivo).toLocaleString('es-CO')} COP para alcanzar la política del 50%).
              </span>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              color: '#4ade80',
              fontSize: '0.74rem',
              fontWeight: 600
            }}>
              <CheckCircle2 size={14} />
              <span>
                Anticipo conforme a la política WJGEEKS ({porcentaje}% cubierto). Se autoriza inicio en Taller.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Medio de Pago */}
      {estadoPagoInicial !== 'Pendiente' && (
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Medio de Pago:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
            {['Bre-B', 'Nequi', 'Efectivo', 'Transferencia', 'Tarjeta'].map((mp) => (
              <button
                key={mp}
                type="button"
                onClick={() => setMetodoPagoInicial(mp)}
                style={{
                  background: metodoPagoInicial === mp ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${metodoPagoInicial === mp ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '0.78rem',
                  fontWeight: metodoPagoInicial === mp ? 700 : 500,
                  color: metodoPagoInicial === mp ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {mp}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
CotizadorPaymentWarning.displayName = 'CotizadorPaymentWarning';
