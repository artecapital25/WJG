import React, { useState } from 'react';
import { 
  Receipt, 
  Send, 
  FileDown, 
  DollarSign, 
  CheckCircle, 
  CreditCard,
  Plus
} from 'lucide-react';
import { CuentaCobro, ConfiguracionTaller, EstadoPago } from '../../types';
import { generarPDFCuentaCobro } from '../../services/pdfService';
import { generateCuentaCobroWhatsAppUrl, openWhatsApp } from '../../services/whatsappService';

interface CuentasCobroListProps {
  cuentas: CuentaCobro[];
  config: ConfiguracionTaller;
  onUpdatePago: (cuentaId: string, nuevoAbono: number) => void;
}

export const CuentasCobroList: React.FC<CuentasCobroListProps> = ({
  cuentas,
  config,
  onUpdatePago
}) => {
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaCobro | null>(null);
  const [abonoInput, setAbonoInput] = useState<number>(0);

  const handleOpenAbonoModal = (cuenta: CuentaCobro) => {
    setSelectedCuenta(cuenta);
    setAbonoInput(cuenta.saldo_pendiente);
  };

  const handleGuardarAbono = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCuenta) return;

    const montoNuevo = Number(abonoInput) || 0;
    const totalAbono = selectedCuenta.abono + montoNuevo;
    onUpdatePago(selectedCuenta.id, totalAbono);
    setSelectedCuenta(null);
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Receipt size={22} color="var(--brand-cyan)" />
            Cuentas de Cobro & Pagos
          </h2>
          <p className="section-subtitle">Gestión de abonos, saldos pendientes y medios de pago (Nequi/Daviplata)</p>
        </div>
      </div>

      {cuentas.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Receipt size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>No hay cuentas de cobro generadas todavía.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            Puedes generarlas directamente desde las órdenes de trabajo terminadas o desde las cotizaciones.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {cuentas.map(cuenta => {
            const porcentajePagado = Math.min(100, Math.round((cuenta.abono / cuenta.total) * 100));

            return (
              <div key={cuenta.id} className="glass-card" style={{ margin: 0, padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand-cyan)' }}>
                        {cuenta.numero_cc}
                      </span>
                      <span className={`status-pill ${cuenta.saldo_pendiente === 0 ? 'status-terminado' : 'status-curado'}`}>
                        {cuenta.estado_pago}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '4px' }}>
                      👤 {cuenta.cliente.nombre}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      📅 {cuenta.fecha_emision} | Ref. Cot: {cuenta.cotizacion_numero} | 📱 {cuenta.cliente.telefono}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: cuenta.saldo_pendiente > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                      {cuenta.saldo_pendiente > 0 
                        ? `Pendiente: $${cuenta.saldo_pendiente.toLocaleString('es-CO')}` 
                        : 'PAGADO COMPLETO ✓'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Total: ${cuenta.total.toLocaleString('es-CO')} | Abono: ${cuenta.abono.toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>

                {/* Barra de Progreso de Pago */}
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '8px', overflow: 'hidden', margin: '10px 0' }}>
                  <div 
                    style={{ 
                      background: cuenta.saldo_pendiente === 0 ? 'var(--accent-success)' : 'linear-gradient(90deg, var(--brand-blue), var(--brand-cyan))', 
                      height: '100%', 
                      width: `${porcentajePagado}%`,
                      transition: 'width 0.4s ease'
                    }} 
                  />
                </div>

                {/* Concepto del Servicio */}
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  🛠️ Concepto: {cuenta.items_resumen}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-whatsapp btn-sm"
                    onClick={() => openWhatsApp(generateCuentaCobroWhatsAppUrl(cuenta, config))}
                  >
                    <Send size={14} />
                    <span>Cobrar por WhatsApp</span>
                  </button>

                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => generarPDFCuentaCobro(cuenta, config)}
                  >
                    <FileDown size={14} />
                    <span>Descargar PDF</span>
                  </button>

                  {cuenta.saldo_pendiente > 0 && (
                    <button 
                      className="btn btn-primary btn-sm"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => handleOpenAbonoModal(cuenta)}
                    >
                      <DollarSign size={14} />
                      <span>Registrar Abono</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar Abono */}
      {selectedCuenta && (
        <div className="modal-overlay" onClick={() => setSelectedCuenta(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
              Registrar Abono / Pago - {selectedCuenta.numero_cc}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Cliente: {selectedCuenta.cliente.nombre} | Saldo Pendiente: ${selectedCuenta.saldo_pendiente.toLocaleString('es-CO')} COP
            </p>

            <form onSubmit={handleGuardarAbono}>
              <div className="form-group">
                <label className="form-label">Monto a Abonar (COP)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={abonoInput}
                  onChange={e => setAbonoInput(parseFloat(e.target.value) || 0)}
                  max={selectedCuenta.saldo_pendiente}
                  min="1"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirmar Abono
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedCuenta(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
