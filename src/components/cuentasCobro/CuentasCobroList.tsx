import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Send, 
  FileDown, 
  DollarSign, 
  CheckCircle, 
  CreditCard,
  Plus,
  Users,
  AlertTriangle,
  Clock,
  Search,
  Sparkles,
  Phone,
  ArrowRight,
  TrendingUp,
  Camera
} from 'lucide-react';
import { CuentaCobro, ConfiguracionTaller, EstadoPago, VentaExpress } from '../../types';
import { generarPDFCuentaCobro } from '../../services/pdfService';
import { generateCuentaCobroWhatsAppUrl, openWhatsApp, formatWhatsAppPhone } from '../../services/whatsappService';
import { calcularAlertaCobro, generarWhatsAppRecordatorioCobro } from '../../services/posService';

interface CuentasCobroListProps {
  cuentas: CuentaCobro[];
  ventasExpress?: VentaExpress[];
  config: ConfiguracionTaller;
  onUpdatePago: (cuentaId: string, nuevoAbono: number) => void;
  onUpdateVentaExpress?: (venta: VentaExpress) => void;
}

export const CuentasCobroList: React.FC<CuentasCobroListProps> = ({
  cuentas,
  ventasExpress = [],
  config,
  onUpdatePago,
  onUpdateVentaExpress
}) => {
  const [subTab, setSubTab] = useState<'deudores' | 'pos' | 'cuentas'>('deudores');
  const [searchDeudor, setSearchDeudor] = useState<string>('');

  // Modales
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaCobro | null>(null);
  const [abonoInput, setAbonoInput] = useState<number>(0);

  const [selectedVenta, setSelectedVenta] = useState<VentaExpress | null>(null);
  const [abonoVentaInput, setAbonoVentaInput] = useState<number>(0);

  // Manejo de Abono para Cuenta de Cobro Formal
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

  // Manejo de Abono para Venta Express
  const handleOpenAbonoVentaModal = (venta: VentaExpress) => {
    setSelectedVenta(venta);
    setAbonoVentaInput(venta.saldo_pendiente);
  };

  const handleGuardarAbonoVenta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenta || !onUpdateVentaExpress) return;

    const extra = Number(abonoVentaInput) || 0;
    const totalAbono = Math.min(selectedVenta.total, selectedVenta.abono + extra);
    const nuevoSaldo = Math.max(0, selectedVenta.total - totalAbono);

    onUpdateVentaExpress({
      ...selectedVenta,
      abono: totalAbono,
      saldo_pendiente: nuevoSaldo,
      estado_pago: nuevoSaldo <= 0 ? 'Pagado Total' : 'Abono Parcial'
    });
    setSelectedVenta(null);
  };

  // Base de Deudores Consolidada (Cuentas Formales + Ventas Express)
  const deudoresConsolidados = useMemo(() => {
    const map: Record<string, {
      cliente_nombre: string;
      cliente_telefono: string;
      total_deuda: number;
      total_abonos: number;
      saldo_pendiente: number;
      cuentas: CuentaCobro[];
      ventas: VentaExpress[];
      peor_alerta_texto?: string;
      peor_alerta_color?: string;
      peor_alerta_bg?: string;
    }> = {};

    // 1. Agregar Cuentas Formales
    cuentas.forEach(c => {
      if (c.saldo_pendiente <= 0) return;
      const key = c.cliente.nombre.trim().toLowerCase();
      if (!map[key]) {
        map[key] = {
          cliente_nombre: c.cliente.nombre,
          cliente_telefono: c.cliente.telefono,
          total_deuda: 0,
          total_abonos: 0,
          saldo_pendiente: 0,
          cuentas: [],
          ventas: []
        };
      }
      map[key].total_deuda += c.total;
      map[key].total_abonos += c.abono;
      map[key].saldo_pendiente += c.saldo_pendiente;
      map[key].cuentas.push(c);
    });

    // 2. Agregar Ventas Express
    ventasExpress.forEach(v => {
      if (v.saldo_pendiente <= 0) return;
      const key = v.cliente_nombre.trim().toLowerCase();
      const alerta = calcularAlertaCobro(v.fecha_prometida_pago, v.saldo_pendiente);

      if (!map[key]) {
        map[key] = {
          cliente_nombre: v.cliente_nombre,
          cliente_telefono: v.cliente_telefono,
          total_deuda: 0,
          total_abonos: 0,
          saldo_pendiente: 0,
          cuentas: [],
          ventas: [],
          peor_alerta_texto: alerta.texto,
          peor_alerta_color: alerta.color,
          peor_alerta_bg: alerta.badgeBg
        };
      }
      map[key].total_deuda += v.total;
      map[key].total_abonos += v.abono;
      map[key].saldo_pendiente += v.saldo_pendiente;
      map[key].ventas.push(v);

      if (!map[key].peor_alerta_texto || alerta.nivel === 'vencido' || alerta.nivel === 'hoy') {
        map[key].peor_alerta_texto = alerta.texto;
        map[key].peor_alerta_color = alerta.color;
        map[key].peor_alerta_bg = alerta.badgeBg;
      }
    });

    return Object.values(map)
      .filter(d => 
        d.cliente_nombre.toLowerCase().includes(searchDeudor.toLowerCase()) ||
        d.cliente_telefono.includes(searchDeudor)
      )
      .sort((a, b) => b.saldo_pendiente - a.saldo_pendiente);
  }, [cuentas, ventasExpress, searchDeudor]);

  // Métricas Totales
  const totalCarteraGlobal = deudoresConsolidados.reduce((sum, d) => sum + d.saldo_pendiente, 0);
  const totalDeudoresCount = deudoresConsolidados.length;
  const ventasExpressPendientes = ventasExpress.filter(v => v.saldo_pendiente > 0);
  const cuentasFormalesPendientes = cuentas.filter(c => c.saldo_pendiente > 0);

  // Enviar estado de cuenta consolidado por WhatsApp a un deudor
  const handleEnviarEstadoCuenta = (deudor: typeof deudoresConsolidados[0]) => {
    const phone = formatWhatsAppPhone(deudor.cliente_telefono);
    const conceptos: string[] = [];

    deudor.cuentas.forEach(c => {
      conceptos.push(`• Ref ${c.numero_cc} (${c.items_resumen}): Saldo $${c.saldo_pendiente.toLocaleString('es-CO')} COP`);
    });

    deudor.ventas.forEach(v => {
      const alerta = calcularAlertaCobro(v.fecha_prometida_pago, v.saldo_pendiente);
      conceptos.push(`• Venta ${v.numero_venta} (${v.nombre_producto}): Saldo $${v.saldo_pendiente.toLocaleString('es-CO')} COP ${v.fecha_prometida_pago ? `(Límite: ${v.fecha_prometida_pago})` : ''}`);
    });

    const mensaje = 
`👋 Hola *${deudor.cliente_nombre}*, un saludo desde *WJGEEKS 3D* 🚀

Te compartimos el resumen de tu saldo pendiente con nuestro taller:

📋 *Detalle de Pedidos / Figuras:*
${conceptos.join('\n')}

━━━━━━━━━━━━━━━━━━━━
💵 *TOTAL PENDIENTE:* *$${deudor.saldo_pendiente.toLocaleString('es-CO')} COP*
━━━━━━━━━━━━━━━━━━━━

📲 *Medios de Pago Disponibles:*
• *Nequi:* ${config.nequi}
• *Daviplata:* ${config.daviplata}
• *Bancolombia:* ${config.bancolombia} (${config.titular_cuenta})

Agradecemos nos compartas el soporte una vez realizado el abono. ¡Muchas gracias por tu apoyo a nuestro arte! ✨🎨`;

    openWhatsApp(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '70px' }}>
      {/* Encabezado */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Users size={22} color="var(--brand-cyan)" />
            Central de Cartera & Base de Deudores
          </h2>
          <p className="section-subtitle">
            Monitoreo en vivo de quién nos debe dinero, historial de abonos y recordatorios de cobro por WhatsApp.
          </p>
        </div>

        {/* Métricas destacadas */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.12)', 
            border: '1px solid rgba(245, 158, 11, 0.35)', 
            color: '#fbbf24', 
            padding: '6px 14px', 
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <TrendingUp size={16} />
            <span>Total en la Calle: ${totalCarteraGlobal.toLocaleString('es-CO')} COP</span>
          </div>

          <div style={{ 
            background: 'rgba(56, 189, 248, 0.12)', 
            border: '1px solid rgba(56, 189, 248, 0.35)', 
            color: 'var(--brand-cyan)', 
            padding: '6px 14px', 
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Users size={16} />
            <span>{totalDeudoresCount} Deudores Activos</span>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas Internas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button
          type="button"
          className={`btn ${subTab === 'deudores' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSubTab('deudores')}
          style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Users size={16} />
          <span>👥 Base de Deudores ({totalDeudoresCount})</span>
        </button>

        <button
          type="button"
          className={`btn ${subTab === 'pos' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSubTab('pos')}
          style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Camera size={16} />
          <span>⚡ Ventas POS Express ({ventasExpressPendientes.length} pendientes)</span>
        </button>

        <button
          type="button"
          className={`btn ${subTab === 'cuentas' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSubTab('cuentas')}
          style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Receipt size={16} />
          <span>📄 Cuentas Formales ({cuentasFormalesPendientes.length})</span>
        </button>
      </div>

      {/* PESTAÑA 1: BASE DE DEUDORES CONSOLIDADA */}
      {subTab === 'deudores' && (
        <div>
          {/* Buscador de Deudores */}
          <div className="glass-card" style={{ margin: '0 0 16px 0', padding: '14px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                className="form-input"
                placeholder="Buscar deudor por nombre o número de WhatsApp..."
                value={searchDeudor}
                onChange={e => setSearchDeudor(e.target.value)}
                style={{ paddingLeft: '38px', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          {deudoresConsolidados.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <CheckCircle size={48} color="#34d399" style={{ marginBottom: '12px', opacity: 0.8 }} />
              <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px 0' }}>
                ¡Excelente! No hay deudores pendientes
              </h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
                Todas las figuras y cuentas registradas se encuentran pagadas al 100% o no coinciden con la búsqueda.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {deudoresConsolidados.map((deudor, idx) => (
                <div key={idx} className="glass-card" style={{ margin: 0, padding: '20px', border: '1px solid rgba(245, 158, 11, 0.25)', position: 'relative' }}>
                  {/* Encabezado del Deudor */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                        {deudor.cliente_nombre}
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={13} />
                        <span>{deudor.cliente_telefono || 'Sin teléfono'}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>
                        ${deudor.saldo_pendiente.toLocaleString('es-CO')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Total Pedidos: ${deudor.total_deuda.toLocaleString('es-CO')}
                      </div>
                    </div>
                  </div>

                  {/* Badge de alerta de cobro */}
                  {deudor.peor_alerta_texto && (
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ 
                        fontSize: '0.74rem', 
                        fontWeight: 800, 
                        background: deudor.peor_alerta_bg || 'rgba(239, 68, 68, 0.15)', 
                        color: deudor.peor_alerta_color || '#f87171',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Clock size={12} />
                        <span>{deudor.peor_alerta_texto}</span>
                      </span>
                    </div>
                  )}

                  {/* Lista de Conceptos Pendientes */}
                  <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      PEDIDOS / FIGURAS PENDIENTES:
                    </div>

                    {deudor.ventas.map(v => (
                      <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ color: '#fff' }}>
                          ⚡ {v.nombre_producto} ({v.numero_venta})
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#fbbf24' }}>
                            ${v.saldo_pendiente.toLocaleString('es-CO')}
                          </span>
                          {onUpdateVentaExpress && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenAbonoVentaModal(v)}
                              style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                              title="Abonar a esta figura"
                            >
                              + Abono
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {deudor.cuentas.map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                        <span style={{ color: '#fff' }}>
                          📄 {c.items_resumen || c.numero_cc}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#fbbf24' }}>
                            ${c.saldo_pendiente.toLocaleString('es-CO')}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenAbonoModal(c)}
                            style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                            title="Abonar a esta cuenta"
                          >
                            + Abono
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Acciones Rápidas */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-whatsapp btn-sm"
                      onClick={() => handleEnviarEstadoCuenta(deudor)}
                      style={{ flex: 1, fontWeight: 700, justifyContent: 'center' }}
                    >
                      <Send size={14} />
                      <span>Cobrar por WhatsApp</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: VENTAS EXPRESS (POS) */}
      {subTab === 'pos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ventasExpress.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Camera size={36} style={{ marginBottom: '10px', opacity: 0.5 }} />
              <p>No hay ventas express registradas todavía.</p>
              <p style={{ fontSize: '0.8rem' }}>Usa la pestaña POS Express para registrar ventas con foto al instante.</p>
            </div>
          ) : (
            ventasExpress.map(v => {
              const alerta = calcularAlertaCobro(v.fecha_prometida_pago, v.saldo_pendiente);
              const esPagado = v.saldo_pendiente <= 0;

              return (
                <div key={v.id} className="glass-card" style={{ margin: 0, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {v.foto_url && (
                      <img src={v.foto_url} alt={v.nombre_producto} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--brand-cyan)' }}>{v.numero_venta}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: alerta.badgeBg, color: alerta.color }}>
                          {alerta.texto}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginTop: '2px' }}>
                        {v.nombre_producto} • 👤 {v.cliente_nombre}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Fecha: {v.fecha_venta} | WhatsApp: {v.cliente_telefono}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: esPagado ? '#34d399' : '#fbbf24' }}>
                        {esPagado ? 'PAGADO ✓' : `Debe: $${v.saldo_pendiente.toLocaleString('es-CO')}`}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Total: ${v.total.toLocaleString('es-CO')} | Abono: ${v.abono.toLocaleString('es-CO')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {!esPagado && onUpdateVentaExpress && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenAbonoVentaModal(v)}
                        >
                          <DollarSign size={14} color="#34d399" />
                          <span>Abonar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-whatsapp btn-sm"
                        onClick={() => openWhatsApp(generarWhatsAppRecordatorioCobro(v, config))}
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* PESTAÑA 3: CUENTAS DE COBRO FORMALES */}
      {subTab === 'cuentas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {cuentas.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Receipt size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No hay cuentas de cobro generadas todavía.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                Se generan automáticamente desde las órdenes de trabajo terminadas o las cotizaciones formales.
              </p>
            </div>
          ) : (
            cuentas.map(cuenta => (
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

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
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
            ))
          )}
        </div>
      )}

      {/* MODAL REGISTRAR ABONO CUENTA FORMAL */}
      {selectedCuenta && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
          }}
          onClick={() => setSelectedCuenta(null)}
        >
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%', margin: 0, padding: '24px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#fff', fontWeight: 800 }}>
              Registrar Abono • {selectedCuenta.numero_cc}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Cliente: <strong style={{ color: '#fff' }}>{selectedCuenta.cliente.nombre}</strong><br />
              Saldo Pendiente: <strong style={{ color: '#fbbf24' }}>${selectedCuenta.saldo_pendiente.toLocaleString('es-CO')} COP</strong>
            </p>

            <form onSubmit={handleGuardarAbono}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  MONTO DEL ABONO (COP):
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={abonoInput}
                  onChange={e => setAbonoInput(parseFloat(e.target.value) || 0)}
                  max={selectedCuenta.saldo_pendiente}
                  min="1"
                  step="5000"
                  autoFocus
                  required
                  style={{ fontSize: '1.2rem', fontWeight: 800, padding: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedCuenta(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR ABONO VENTA EXPRESS */}
      {selectedVenta && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
          }}
          onClick={() => setSelectedVenta(null)}
        >
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%', margin: 0, padding: '24px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#fff', fontWeight: 800 }}>
              Registrar Abono • {selectedVenta.numero_venta}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Cliente: <strong style={{ color: '#fff' }}>{selectedVenta.cliente_nombre}</strong><br />
              Figura: <strong>{selectedVenta.nombre_producto}</strong><br />
              Saldo Pendiente: <strong style={{ color: '#fbbf24' }}>${selectedVenta.saldo_pendiente.toLocaleString('es-CO')} COP</strong>
            </p>

            <form onSubmit={handleGuardarAbonoVenta}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  MONTO DEL ABONO (COP):
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={abonoVentaInput}
                  onChange={e => setAbonoVentaInput(parseFloat(e.target.value) || 0)}
                  max={selectedVenta.saldo_pendiente}
                  min="1"
                  step="5000"
                  autoFocus
                  required
                  style={{ fontSize: '1.2rem', fontWeight: 800, padding: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedVenta(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
