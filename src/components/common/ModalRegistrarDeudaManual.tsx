import React, { useState } from 'react';
import { 
  X, 
  DollarSign, 
  User, 
  Phone, 
  FileText, 
  Receipt, 
  CreditCard, 
  Calendar, 
  Sparkles,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { CuentaCobro, Cliente, EstadoPago } from '../../types';

interface ModalRegistrarDeudaManualProps {
  isOpen: boolean;
  clientes?: Cliente[];
  consecutivoSugerido: number;
  onClose: () => void;
  onGuardarDeuda: (nuevaCuenta: CuentaCobro) => void;
}

const CONCEPTOS_COMUNES = [
  '🎨 Servicio de Diseño y Modelado 3D',
  '🖨️ Servicio de Manufactura e Impresión 3D',
  '📦 Saldo pendiente de entrega de figura',
  '🧪 Insumo, resina o material suministrado',
  '🏷️ Venta personalizada de figura',
  '🛠️ Postprocesado y pintura artística'
];

const METODOS_PAGO = [
  'Bre-B',
  'Nequi',
  'Efectivo',
  'Transferencia',
  'Tarjeta'
];

export const ModalRegistrarDeudaManual: React.FC<ModalRegistrarDeudaManualProps> = ({
  isOpen,
  clientes = [],
  consecutivoSugerido,
  onClose,
  onGuardarDeuda
}) => {
  if (!isOpen) return null;

  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [nitCliente, setNitCliente] = useState('');
  const [concepto, setConcepto] = useState(CONCEPTOS_COMUNES[0]);
  const [conceptoPersonalizado, setConceptoPersonalizado] = useState('');
  
  const [montoTotal, setMontoTotal] = useState<number>(50000);
  const [abonoInicial, setAbonoInicial] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<string>('Bre-B');
  const [comprobante, setComprobante] = useState<string>('');
  
  const [fechaEmision, setFechaEmision] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState<string>('');

  // Sugerencia al escribir nombre de cliente
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(nombreCliente.toLowerCase().trim())
  ).slice(0, 5);

  const handleSelectClienteExistente = (cli: Cliente) => {
    setNombreCliente(cli.nombre);
    if (cli.telefono) setTelefonoCliente(cli.telefono);
    if (cli.nit_cc) setNitCliente(cli.nit_cc);
    setMostrarSugerencias(false);
  };

  const saldoPendiente = Math.max(0, (Number(montoTotal) || 0) - (Number(abonoInicial) || 0));
  const estadoPago: EstadoPago = saldoPendiente <= 0 ? 'Pagado Total' : (abonoInicial > 0 ? 'Abono Parcial' : 'Pendiente');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCliente.trim()) return;

    const conceptoFinal = conceptoPersonalizado.trim() 
      ? conceptoPersonalizado.trim() 
      : concepto;

    const nuevaCuenta: CuentaCobro = {
      id: `cc-manual-${Date.now()}`,
      numero_cc: `CC-${consecutivoSugerido.toString().padStart(3, '0')}`,
      cotizacion_id: '',
      cotizacion_numero: 'MANUAL',
      cliente: {
        id: `cli-${Date.now()}`,
        codigo: consecutivoSugerido,
        nombre: nombreCliente.trim(),
        telefono: telefonoCliente.trim(),
        nit_cc: nitCliente.trim(),
        correo: ''
      },
      fecha_emision: fechaEmision,
      items_resumen: conceptoFinal,
      total: Number(montoTotal) || 0,
      abono: Number(abonoInicial) || 0,
      saldo_pendiente: saldoPendiente,
      estado_pago: estadoPago,
      metodo_pago: abonoInicial > 0 ? metodoPago : undefined,
      comprobante_url: comprobante.trim() || undefined
    };

    onGuardarDeuda(nuevaCuenta);
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
          maxWidth: '560px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 12px 40px rgba(245, 158, 11, 0.2)',
          padding: '24px',
          position: 'relative',
          background: 'linear-gradient(180deg, #13110d 0%, #0d0c0a 100%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Receipt size={24} color="#fbbf24" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>
              Registrar Deuda Manual / Deudor
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Agrega una cuenta por cobrar directa sin necesidad de cotización o venta POS previa.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* DATOS DEL DEUDOR / CLIENTE */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--brand-cyan)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} />
              <span>Datos de la Persona que Debe</span>
            </div>

            <div style={{ marginBottom: '10px', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                NOMBRE COMPLETO DEL CLIENTE / DEUDOR *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: Carlos Gómez / Natalia Restrepo"
                value={nombreCliente}
                onChange={e => {
                  setNombreCliente(e.target.value);
                  setMostrarSugerencias(true);
                }}
                onFocus={() => setMostrarSugerencias(true)}
                required
              />

              {/* Sugerencias de clientes existentes */}
              {mostrarSugerencias && nombreCliente.trim().length > 1 && clientesFiltrados.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#131b26',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  zIndex: 10,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                  maxHeight: '150px',
                  overflowY: 'auto'
                }}>
                  {clientesFiltrados.map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectClienteExistente(c)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      className="hover:bg-cyan-950"
                    >
                      <span style={{ fontWeight: 700, color: '#fff' }}>{c.nombre}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.telefono || 'Sin tel'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  TELÉFONO / WHATSAPP *
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="300 123 4567"
                    value={telefonoCliente}
                    onChange={e => setTelefonoCliente(e.target.value)}
                    style={{ paddingLeft: '32px' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  DOCUMENTO / C.C / NIT (OPCIONAL)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="1018..."
                  value={nitCliente}
                  onChange={e => setNitCliente(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* MOTIVO O CONCEPTO DE LA DEUDA */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--brand-cyan)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} />
              <span>Concepto o Motivo del Cobro</span>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {CONCEPTOS_COMUNES.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setConcepto(item);
                    setConceptoPersonalizado('');
                  }}
                  style={{
                    background: concepto === item && !conceptoPersonalizado ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.04)',
                    border: concepto === item && !conceptoPersonalizado ? '1px solid #fbbf24' : '1px solid var(--border-subtle)',
                    color: concepto === item && !conceptoPersonalizado ? '#fbbf24' : 'var(--text-muted)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            <div>
              <input
                id="input-concepto-manual"
                type="text"
                className="input-field"
                placeholder={concepto || "Escribe el concepto detallado si es diferente a los anteriores..."}
                value={conceptoPersonalizado}
                onChange={e => setConceptoPersonalizado(e.target.value)}
              />
            </div>
          </div>

          {/* MONTOS FINANCIEROS Y ABONO */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={14} />
              <span>Valores Financieros y Abono Inicial</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  VALOR TOTAL DE LA DEUDA ($ COP) *
                </label>
                <input
                  id="input-monto-total"
                  type="number"
                  className="input-field"
                  placeholder="Ej: 85000"
                  value={montoTotal === 0 ? '' : montoTotal}
                  onChange={e => setMontoTotal(e.target.value === '' ? 0 : Number(e.target.value))}
                  min="1"
                  step="1000"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  ABONO O ANTICIPO INICIAL ($ COP)
                </label>
                <input
                  id="input-abono-inicial"
                  type="number"
                  className="input-field"
                  placeholder="0"
                  value={abonoInicial === 0 ? '' : abonoInicial}
                  onChange={e => setAbonoInicial(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            {/* Cuadro Resumen del Saldo */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saldo que Queda Debiendo:</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24' }}>
                  ${saldoPendiente.toLocaleString('es-CO')} COP
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '5px',
                  background: estadoPago === 'Pagado Total' ? 'rgba(16, 185, 129, 0.2)' : estadoPago === 'Abono Parcial' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: estadoPago === 'Pagado Total' ? '#34d399' : estadoPago === 'Abono Parcial' ? '#fbbf24' : '#f87171'
                }}>
                  {estadoPago === 'Pagado Total' ? '🟢 Pagado Total' : estadoPago === 'Abono Parcial' ? '🟡 Abono Parcial' : '🔴 100% Pendiente'}
                </span>
              </div>
            </div>

            {/* Método de Pago para el Abono */}
            {abonoInicial > 0 && (
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
                  MEDIO POR EL QUE ABONÓ LOS ${abonoInicial.toLocaleString('es-CO')}:
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {METODOS_PAGO.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetodoPago(m)}
                      style={{
                        background: metodoPago === m ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
                        border: metodoPago === m ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                        color: metodoPago === m ? '#34d399' : 'var(--text-muted)',
                        borderRadius: '5px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fecha y Notas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                FECHA DE REGISTRO
              </label>
              <input
                type="date"
                className="input-field"
                value={fechaEmision}
                onChange={e => setFechaEmision(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                COMPROBANTE / NOTA (OPCIONAL)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="N° aprobación o nota de compromiso..."
                value={comprobante}
                onChange={e => setComprobante(e.target.value)}
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              id="btn-cancelar-deuda-manual"
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '8px 16px' }}
            >
              Cancelar
            </button>
            <button
              id="btn-guardar-deuda-manual"
              type="submit"
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                padding: '9px 20px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} />
              <span>Registrar Deuda en Cartera</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
