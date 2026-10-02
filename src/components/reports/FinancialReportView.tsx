import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  PieChart, 
  Package, 
  CheckCircle, 
  Clock,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { Cotizacion, OrdenTrabajo, CuentaCobro, Resina, Insumo } from '../../types';

interface FinancialReportViewProps {
  cotizaciones: Cotizacion[];
  ordenes: OrdenTrabajo[];
  cuentas: CuentaCobro[];
  resinas: Resina[];
}

export const FinancialReportView: React.FC<FinancialReportViewProps> = ({
  cotizaciones,
  ordenes,
  cuentas,
  resinas
}) => {
  // Filtro de Mes/Año
  const currentYearMonth = new Date().toISOString().slice(0, 7); // '2025-02' o '2026-10'
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todas');

  // Obtener lista de meses disponibles a partir de cotizaciones
  const mesesDisponibles = Array.from(
    new Set(cotizaciones.map(c => c.fecha ? c.fecha.slice(0, 7) : '2025-02'))
  ).sort().reverse();

  // Filtrar cotizaciones
  const cotizacionesFiltradas = cotizaciones.filter(c => {
    const matchMes = selectedMonth === 'todos' || (c.fecha && c.fecha.startsWith(selectedMonth));
    const matchEstado = filterEstado === 'todas' || c.estado === filterEstado;
    return matchMes && matchEstado;
  });

  // Métricas financieras calculadas
  const totalFacturado = cotizacionesFiltradas
    .filter(c => c.estado === 'Facturada' || c.estado === 'Aceptada')
    .reduce((sum, c) => sum + c.total, 0);

  const totalPotencial = cotizacionesFiltradas.reduce((sum, c) => sum + c.total, 0);

  // Costo total de producción estimado
  const costoTotalProduccion = cotizacionesFiltradas
    .filter(c => c.estado === 'Facturada' || c.estado === 'Aceptada')
    .reduce((sum, c) => {
      const costoItems = c.items.reduce((s, it) => s + (it.costo_base_produccion || 0), 0);
      return sum + costoItems;
    }, 0);

  const margenNetoEstimado = Math.max(0, totalFacturado - costoTotalProduccion);
  const porcentajeMargenPromedio = totalFacturado > 0 
    ? Math.round((margenNetoEstimado / totalFacturado) * 100) 
    : 40;

  // Gramos de resina consumidos en órdenes aceptadas/facturadas
  const gramosResinaConsumidos = cotizacionesFiltradas
    .filter(c => c.estado === 'Facturada' || c.estado === 'Aceptada')
    .reduce((sum, c) => {
      const gItems = c.items.reduce((s, it) => s + ((it.peso_estimado_g || 0) * (it.cantidad || 1)), 0);
      return sum + gItems;
    }, 0);

  // Recaudo en Cuentas de Cobro
  const totalAbonado = cuentas.reduce((sum, cc) => sum + cc.abono, 0);
  const totalSaldoPendiente = cuentas.reduce((sum, cc) => sum + cc.saldo_pendiente, 0);

  // Exportar a Excel (.xls estructurado con HTML/XML)
  const handleExportExcel = () => {
    const filename = `Balance_Contable_WJGEEKS_${selectedMonth}_${Date.now()}.xls`;

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Balance Contable</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th { background-color: #1b62b1; color: #ffffff; font-weight: bold; border: 1px solid #cccccc; padding: 6px; }
          td { border: 1px solid #e2e8f0; padding: 5px; font-size: 11px; }
          .header-title { font-size: 16px; font-weight: bold; color: #1b62b1; }
          .kpi-table th { background-color: #0b1120; color: #38bdf8; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .highlight { background-color: #f0fdf4; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-title">WJGEEKS 3D - INFORME Y BALANCE CONTABLE DE TALLER</div>
        <p>Periodo: <b>${selectedMonth === 'todos' ? 'Histórico Consolidado' : selectedMonth}</b> | Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}</p>
        
        <h3>1. RESUMEN DE INDICADORES FINANCIEROS</h3>
        <table class="kpi-table" style="width: 600px; margin-bottom: 20px;">
          <tr><th>Métrica</th><th>Valor (COP / Cantidad)</th></tr>
          <tr><td>Total Facturado / Aprobado:</td><td class="text-right"><b>$${totalFacturado.toLocaleString('es-CO')}</b></td></tr>
          <tr><td>Costo Base de Producción (Materiales + Energía + M.O.):</td><td class="text-right">$${costoTotalProduccion.toLocaleString('es-CO')}</td></tr>
          <tr class="highlight"><td>Margen Neto Estimado:</td><td class="text-right">$${margenNetoEstimado.toLocaleString('es-CO')} (${porcentajeMargenPromedio}%)</td></tr>
          <tr><td>Resina Estimada Consumida:</td><td class="text-right">${Math.round(gramosResinaConsumidos)} g (${(gramosResinaConsumidos / 1000).toFixed(2)} Litros)</td></tr>
          <tr><td>Recaudo por Cuentas de Cobro (Abonos):</td><td class="text-right">$${totalAbonado.toLocaleString('es-CO')}</td></tr>
          <tr><td>Saldo Pendiente de Cobro:</td><td class="text-right" style="color: #ef4444;">$${totalSaldoPendiente.toLocaleString('es-CO')}</td></tr>
        </table>

        <h3>2. DETALLE DE COTIZACIONES Y FACTURAS</h3>
        <table>
          <thead>
            <tr>
              <th># Cotización</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Piezas</th>
              <th>Subtotal (COP)</th>
              <th>Descuento (%)</th>
              <th>Total (COP)</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
    `;

    cotizacionesFiltradas.forEach(c => {
      const itemsList = c.items.map(it => `${it.nombre_item} (x${it.cantidad})`).join(', ');
      html += `
        <tr>
          <td class="text-center"><b>${c.numero_cot}</b></td>
          <td class="text-center">${c.fecha}</td>
          <td>${c.cliente.nombre}</td>
          <td class="text-center">${c.cliente.telefono || 'N/A'}</td>
          <td>${itemsList}</td>
          <td class="text-right">$${c.subtotal.toLocaleString('es-CO')}</td>
          <td class="text-center">${c.descuento_porcentaje}%</td>
          <td class="text-right"><b>$${c.total.toLocaleString('es-CO')}</b></td>
          <td class="text-center">${c.estado}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '50px' }}>
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <TrendingUp size={22} color="var(--brand-cyan)" />
            Balance Contable & Reporte Financiero
          </h2>
          <p className="section-subtitle">
            Análisis de ingresos, costos de manufactura, consumo de resina y exportación mensual a Excel
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={handleExportExcel}
          title="Descargar este balance en formato Excel (.xls)"
          style={{ fontWeight: 700 }}
        >
          <FileSpreadsheet size={16} />
          <span>Exportar a Excel (.xls)</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <Calendar size={12} color="var(--brand-cyan)" />
              PERIODO / MES
            </label>
            <select 
              className="form-select" 
              style={{ fontSize: '0.84rem', padding: '6px 10px', minHeight: '36px' }}
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="todos">Todo el Histórico (72+ cotizaciones)</option>
              {mesesDisponibles.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <Filter size={12} color="var(--brand-blue)" />
              ESTADO DE VENTA
            </label>
            <select 
              className="form-select" 
              style={{ fontSize: '0.84rem', padding: '6px 10px', minHeight: '36px' }}
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
            >
              <option value="todas">Todos los estados</option>
              <option value="Facturada">Facturadas</option>
              <option value="Aceptada">Aceptadas en Taller</option>
              <option value="Enviada">Enviadas al Cliente</option>
              <option value="Borrador">Borradores</option>
              <option value="Parcial">Parciales / Preliminares</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Mostrando <strong>{cotizacionesFiltradas.length}</strong> operaciones
        </div>
      </div>

      {/* Tarjetas de Métricas KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {/* Total Facturado */}
        <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(56, 189, 248, 0.25)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-cyan)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Facturado / Confirmado
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>
            ${totalFacturado.toLocaleString('es-CO')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            De un total cotizado de ${totalPotencial.toLocaleString('es-CO')}
          </div>
        </div>

        {/* Margen Neto */}
        <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '6px' }}>
            Margen Neto de Taller
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4ade80', fontFamily: 'var(--font-display)' }}>
            ${margenNetoEstimado.toLocaleString('es-CO')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Promedio de rentabilidad: <strong>~{porcentajeMargenPromedio}%</strong>
          </div>
        </div>

        {/* Consumo Resina */}
        <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', marginBottom: '6px' }}>
            Material Consumido
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>
            {Math.round(gramosResinaConsumidos)} g
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Equivalente a <strong>{(gramosResinaConsumidos / 1000).toFixed(2)} botes</strong> de 1L
          </div>
        </div>

        {/* Cuentas de Cobro */}
        <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '6px' }}>
            Recaudo vs. Por Cobrar
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>
            ${totalAbonado.toLocaleString('es-CO')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '4px' }}>
            Pendiente de cobro: ${totalSaldoPendiente.toLocaleString('es-CO')}
          </div>
        </div>
      </div>

      {/* Tabla Detallada */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
            Detalle de Órdenes y Cotizaciones del Periodo
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {cotizacionesFiltradas.length} registros listados
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 14px' }}># Cot</th>
                <th style={{ padding: '10px 14px' }}>Fecha</th>
                <th style={{ padding: '10px 14px' }}>Cliente</th>
                <th style={{ padding: '10px 14px' }}>Piezas Cotizadas</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Venta</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cotizacionesFiltradas.slice(0, 50).map((c, idx) => (
                <tr 
                  key={c.id || idx}
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                  }}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--brand-cyan)' }}>
                    {c.numero_cot}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {c.fecha}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                    {c.cliente.nombre}
                    {c.cliente.telefono && <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.cliente.telefono}</span>}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                    {c.items.map(it => it.nombre_item).join(', ')} ({c.items.length} pieza/s)
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                    ${c.total.toLocaleString('es-CO')}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      padding: '2px 8px', 
                      borderRadius: '4px',
                      fontWeight: 700,
                      background: c.estado === 'Facturada' ? 'rgba(34, 197, 94, 0.15)' : c.estado === 'Aceptada' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: c.estado === 'Facturada' ? '#4ade80' : c.estado === 'Aceptada' ? '#38bdf8' : '#fbbf24'
                    }}>
                      {c.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
