import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  DollarSign, 
  Smartphone, 
  FileText, 
  Sparkles,
  ArrowRight,
  Copy
} from 'lucide-react';
import { EstadoPago, DatosPagoRegistro } from '../../types';

interface ModalRegistrarPagoProps {
  isOpen: boolean;
  onClose: () => void;
  titulo?: string;
  subtitulo?: string;
  referenciaDoc: string; // ej: "Cot: 26-074" o "OT-0012"
  clienteNombre: string;
  clienteTelefono?: string;
  montoTotal: number;
  pagoActual?: {
    estado_pago?: EstadoPago;
    abono?: number;
    saldo_pendiente?: number;
    metodo_pago?: string;
    comprobante_pago?: string;
  };
  esAprobacionCotizacion?: boolean;
  onConfirmarPago: (
    datos: DatosPagoRegistro,
    accion: 'aprobar_y_taller' | 'solo_guardar'
  ) => void;
}

export const ModalRegistrarPago: React.FC<ModalRegistrarPagoProps> = ({
  isOpen,
  onClose,
  titulo = 'Registrar Estado de Pago',
  subtitulo,
  referenciaDoc,
  clienteNombre,
  clienteTelefono,
  montoTotal,
  pagoActual,
  esAprobacionCotizacion = false,
  onConfirmarPago
}) => {
  // Inicialización inteligente: si ya tiene abono/pago se respeta, si es nueva aprobación sugerimos 50% anticipo
  const [tipoPago, setTipoPago] = useState<EstadoPago>(() => {
    if (pagoActual?.estado_pago) return pagoActual.estado_pago;
    if (pagoActual?.abono && pagoActual.abono >= montoTotal) return 'Pagado Total';
    if (pagoActual?.abono && pagoActual.abono > 0) return 'Abono Parcial';
    return esAprobacionCotizacion ? 'Abono Parcial' : 'Pendiente';
  });

  const [montoAbono, setMontoAbono] = useState<number>(() => {
    if (pagoActual?.abono !== undefined) return pagoActual.abono;
    if (esAprobacionCotizacion) return Math.round(montoTotal * 0.5);
    return 0;
  });

  const [metodoPago, setMetodoPago] = useState<string>(() => {
    if (pagoActual?.metodo_pago && pagoActual.metodo_pago !== 'Daviplata' && pagoActual.metodo_pago !== 'Bancolombia') {
      return pagoActual.metodo_pago;
    }
    return 'Bre-B';
  });

  const [comprobante, setComprobante] = useState<string>(() => {
    return pagoActual?.comprobante_pago || '';
  });

  const [copiadoLlave, setCopiadoLlave] = useState<boolean>(false);

  const handleCopiarLlaveBreB = () => {
    navigator.clipboard.writeText('0090778625');
    setCopiadoLlave(true);
    setTimeout(() => setCopiadoLlave(false), 2500);
  };

  // Reaccionar cuando cambian las props de entrada
  useEffect(() => {
    if (isOpen) {
      if (pagoActual?.estado_pago) {
        setTipoPago(pagoActual.estado_pago);
        setMontoAbono(pagoActual.abono ?? (pagoActual.estado_pago === 'Pagado Total' ? montoTotal : 0));
      } else if (pagoActual?.abono !== undefined) {
        if (pagoActual.abono >= montoTotal && montoTotal > 0) {
          setTipoPago('Pagado Total');
          setMontoAbono(montoTotal);
        } else if (pagoActual.abono > 0) {
          setTipoPago('Abono Parcial');
          setMontoAbono(pagoActual.abono);
        } else {
          setTipoPago(esAprobacionCotizacion ? 'Abono Parcial' : 'Pendiente');
          setMontoAbono(esAprobacionCotizacion ? Math.round(montoTotal * 0.5) : 0);
        }
      } else {
        setTipoPago(esAprobacionCotizacion ? 'Abono Parcial' : 'Pendiente');
        setMontoAbono(esAprobacionCotizacion ? Math.round(montoTotal * 0.5) : 0);
      }
      const initialMetodo = (pagoActual?.metodo_pago && pagoActual.metodo_pago !== 'Daviplata' && pagoActual.metodo_pago !== 'Bancolombia')
        ? pagoActual.metodo_pago
        : 'Bre-B';
      setMetodoPago(initialMetodo);
      setComprobante(pagoActual?.comprobante_pago || '');
      setCopiadoLlave(false);
    }
  }, [isOpen, pagoActual, montoTotal, esAprobacionCotizacion]);

  if (!isOpen) return null;

  // Cálculos dinámicos
  let abonoEfectivo = 0;
  if (tipoPago === 'Pagado Total') {
    abonoEfectivo = montoTotal;
  } else if (tipoPago === 'Pendiente') {
    abonoEfectivo = 0;
  } else {
    abonoEfectivo = Math.min(montoTotal, Math.max(0, montoAbono));
  }
  const saldoPendiente = Math.max(0, montoTotal - abonoEfectivo);

  // Manejador de botones rápidos de porcentaje
  const handleSetPorcentaje = (pct: number) => {
    const calc = Math.round((montoTotal * pct) / 100);
    setMontoAbono(calc);
    setTipoPago('Abono Parcial');
  };

  const handleSelectTipo = (tipo: EstadoPago) => {
    setTipoPago(tipo);
    if (tipo === 'Pagado Total') {
      setMontoAbono(montoTotal);
    } else if (tipo === 'Pendiente') {
      setMontoAbono(0);
    } else if (montoAbono === 0 || montoAbono >= montoTotal) {
      setMontoAbono(Math.round(montoTotal * 0.5));
    }
  };

  const handleConfirmar = (accion: 'aprobar_y_taller' | 'solo_guardar') => {
    const payload: DatosPagoRegistro = {
      estado_pago: tipoPago,
      abono: abonoEfectivo,
      saldo_pendiente: saldoPendiente,
      metodo_pago: tipoPago === 'Pendiente' ? undefined : metodoPago,
      comprobante_pago: comprobante.trim() || undefined
    };
    onConfirmarPago(payload, accion);
    onClose();
  };

  const metodosDisponibles = [
    { id: 'Bre-B', label: 'Bre-B (Llave Única)', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.18)' },
    { id: 'Nequi', label: 'Nequi', color: '#c026d3', bg: 'rgba(192, 38, 211, 0.15)' },
    { id: 'Efectivo', label: 'Efectivo', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    { id: 'Transferencia', label: 'Transferencia', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
    { id: 'Tarjeta / Datáfono', label: 'Tarjeta / Datáfono', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' }
  ];

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(7px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-card, #0f172a)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(56, 189, 248, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(16, 185, 129, 0.2))',
                border: '1px solid var(--brand-cyan)',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CreditCard size={18} color="var(--brand-cyan)" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                {titulo}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {subtitulo || `${referenciaDoc} • Cliente: ${clienteNombre}`}
            </p>
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

        {/* Resumen del Monto Total */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Valor Total del Trabajo
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-cyan)' }}>
              ${montoTotal.toLocaleString('es-CO')} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>COP</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Referencia
            </span>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
              {referenciaDoc}
            </div>
          </div>
        </div>

        {/* Selector de los 3 Estados de Pago */}
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
            ¿En qué estado de pago se encuentra este pedido?
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {/* 1. Pendiente / Sin Pago */}
            <button
              type="button"
              onClick={() => handleSelectTipo('Pendiente')}
              style={{
                background: tipoPago === 'Pendiente' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                border: `1.5px solid ${tipoPago === 'Pendiente' ? '#ef4444' : 'var(--border-subtle)'}`,
                borderRadius: '10px',
                padding: '12px 8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div style={{
                background: tipoPago === 'Pendiente' ? '#ef4444' : 'rgba(239, 68, 68, 0.2)',
                color: '#fff',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={14} />
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: tipoPago === 'Pendiente' ? '#fca5a5' : 'var(--text-muted)' }}>
                Sin Pago
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Pendiente 100%
              </span>
            </button>

            {/* 2. Abono / Anticipo Parcial */}
            <button
              type="button"
              onClick={() => handleSelectTipo('Abono Parcial')}
              style={{
                background: tipoPago === 'Abono Parcial' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                border: `1.5px solid ${tipoPago === 'Abono Parcial' ? '#f59e0b' : 'var(--border-subtle)'}`,
                borderRadius: '10px',
                padding: '12px 8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div style={{
                background: tipoPago === 'Abono Parcial' ? '#f59e0b' : 'rgba(245, 158, 11, 0.2)',
                color: '#fff',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DollarSign size={14} />
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: tipoPago === 'Abono Parcial' ? '#fcd34d' : 'var(--text-muted)' }}>
                Abono Parcial
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Anticipo para iniciar
              </span>
            </button>

            {/* 3. Pagado Total */}
            <button
              type="button"
              onClick={() => handleSelectTipo('Pagado Total')}
              style={{
                background: tipoPago === 'Pagado Total' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                border: `1.5px solid ${tipoPago === 'Pagado Total' ? '#10b981' : 'var(--border-subtle)'}`,
                borderRadius: '10px',
                padding: '12px 8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div style={{
                background: tipoPago === 'Pagado Total' ? '#10b981' : 'rgba(16, 185, 129, 0.2)',
                color: '#fff',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={14} />
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: tipoPago === 'Pagado Total' ? '#6ee7b7' : 'var(--text-muted)' }}>
                Pago Total
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                100% Pagado ($0)
              </span>
            </button>
          </div>
        </div>

        {/* Detalle si es Abono Parcial */}
        {tipoPago === 'Abono Parcial' && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24' }}>
                Monto del Abono / Anticipo
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Selección rápida:
              </span>
            </div>

            {/* Chips de porcentaje rápido */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSetPorcentaje(50)}
                style={{
                  background: montoAbono === Math.round(montoTotal * 0.5) ? 'rgba(245, 158, 11, 0.25)' : undefined,
                  borderColor: montoAbono === Math.round(montoTotal * 0.5) ? '#f59e0b' : undefined,
                  color: montoAbono === Math.round(montoTotal * 0.5) ? '#fbbf24' : undefined,
                  fontWeight: 700,
                  fontSize: '0.76rem'
                }}
              >
                ⭐ 50% ($ {Math.round(montoTotal * 0.5).toLocaleString('es-CO')})
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSetPorcentaje(30)}
                style={{
                  background: montoAbono === Math.round(montoTotal * 0.3) ? 'rgba(245, 158, 11, 0.25)' : undefined,
                  borderColor: montoAbono === Math.round(montoTotal * 0.3) ? '#f59e0b' : undefined,
                  color: montoAbono === Math.round(montoTotal * 0.3) ? '#fbbf24' : undefined,
                  fontSize: '0.76rem'
                }}
              >
                30% ($ {Math.round(montoTotal * 0.3).toLocaleString('es-CO')})
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSetPorcentaje(70)}
                style={{
                  background: montoAbono === Math.round(montoTotal * 0.7) ? 'rgba(245, 158, 11, 0.25)' : undefined,
                  borderColor: montoAbono === Math.round(montoTotal * 0.7) ? '#f59e0b' : undefined,
                  color: montoAbono === Math.round(montoTotal * 0.7) ? '#fbbf24' : undefined,
                  fontSize: '0.76rem'
                }}
              >
                70% ($ {Math.round(montoTotal * 0.7).toLocaleString('es-CO')})
              </button>
            </div>

            {/* Input manual del valor */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#fbbf24', fontWeight: 800 }}>
                $
              </span>
              <input
                type="number"
                min="0"
                max={montoTotal}
                step="1000"
                value={montoAbono}
                onChange={(e) => setMontoAbono(parseFloat(e.target.value) || 0)}
                className="form-input"
                style={{
                  paddingLeft: '28px',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#fbbf24',
                  borderColor: 'rgba(245, 158, 11, 0.5)'
                }}
                placeholder="Ingresa el valor recibido"
              />
            </div>

            {/* Resumen de Saldo */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '8px',
              borderTop: '1px dashed rgba(245, 158, 11, 0.3)',
              fontSize: '0.85rem'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>Saldo restante por cobrar:</span>
              <span style={{ fontWeight: 800, color: '#f87171', fontSize: '0.98rem' }}>
                ${saldoPendiente.toLocaleString('es-CO')} COP
              </span>
            </div>
          </div>
        )}

        {/* Medio de Pago (visible si abonó o pagó total) */}
        {tipoPago !== 'Pendiente' && (
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
              Medio de Pago Utilizado
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {metodosDisponibles.map(m => {
                const isSelected = metodoPago === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodoPago(m.id)}
                    style={{
                      background: isSelected ? m.bg : 'rgba(255, 255, 255, 0.03)',
                      border: `1.5px solid ${isSelected ? m.color : 'var(--border-subtle)'}`,
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Smartphone size={13} color={m.color} />
                    <span>{m.id}</span>
                  </button>
                );
              })}
            </div>

            {/* Tarjeta Informativa Bre-B con botón de Copiar Llave */}
            <div style={{
              marginTop: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(14, 165, 233, 0.05) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: '#06b6d4',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: '0.72rem',
                  padding: '3px 7px',
                  borderRadius: '6px',
                  letterSpacing: '0.5px'
                }}>
                  BRE-B
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Llave de transferencia / Identificador único:
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.8px' }}>
                    0090778625
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopiarLlaveBreB}
                className="btn btn-sm"
                style={{
                  background: copiadoLlave ? 'rgba(16, 185, 129, 0.25)' : 'rgba(6, 182, 212, 0.2)',
                  border: `1px solid ${copiadoLlave ? '#10b981' : '#06b6d4'}`,
                  color: copiadoLlave ? '#34d399' : '#38bdf8',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {copiadoLlave ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                {copiadoLlave ? '¡Copiada!' : 'Copiar llave'}
              </button>
            </div>

            {/* Comprobante / Referencia opcional */}
            <div style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                N° de Comprobante / Referencia o Nota (Opcional)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Transf. Nequi #849302 o pago en efectivo entregado a Germán"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>
        )}

        {/* Resumen Final de la Transacción */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.45)',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.84rem'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>ESTADO QUE SE GUARDARÁ:</div>
            <div style={{ fontWeight: 800, color: tipoPago === 'Pagado Total' ? '#34d399' : tipoPago === 'Abono Parcial' ? '#fbbf24' : '#f87171' }}>
              {tipoPago === 'Pagado Total' && '🟢 PAGADO TOTAL (100%)'}
              {tipoPago === 'Abono Parcial' && `🟡 ABONO PARCIAL: $${abonoEfectivo.toLocaleString('es-CO')}`}
              {tipoPago === 'Pendiente' && '🔴 SIN PAGO / PENDIENTE'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>DEUDA PENDIENTE:</div>
            <div style={{ fontWeight: 800, color: saldoPendiente > 0 ? '#f87171' : '#34d399', fontSize: '0.92rem' }}>
              ${saldoPendiente.toLocaleString('es-CO')}
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
          {esAprobacionCotizacion ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
                  borderColor: 'var(--brand-cyan)',
                  color: '#fff',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px'
                }}
                onClick={() => handleConfirmar('aprobar_y_taller')}
              >
                <Sparkles size={16} />
                <span>Aprobar y Enviar a Taller</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleConfirmar('solo_guardar')}
                style={{ fontSize: '0.82rem' }}
                title="Guarda el pago y marca como Aceptada sin redirigir al taller"
              >
                Solo Guardar Pago
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  flex: 1,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px'
                }}
                onClick={() => handleConfirmar('solo_guardar')}
              >
                <CheckCircle2 size={16} />
                <span>Guardar Estado de Pago</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
