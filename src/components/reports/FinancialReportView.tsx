import React, { useState, useMemo } from 'react';
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
  Filter,
  Sun,
  ShoppingCart,
  Tag,
  Layers,
  RefreshCw,
  Store,
  FileText
} from 'lucide-react';
import { Cotizacion, OrdenTrabajo, CuentaCobro, Resina } from '../../types';
import { VentaExpress } from '../../types/pos';
import { CloudSyncService, BalanceTaller } from '../../services/cloudSyncService';

interface FinancialReportViewProps {
  cotizaciones: Cotizacion[];
  ordenes: OrdenTrabajo[];
  cuentas: CuentaCobro[];
  resinas: Resina[];
  ventasExpress?: VentaExpress[];
  onOpenDailyBriefing?: () => void;
  whatsappStatus?: 'operativo' | 'alerta_critica' | 'desconocido';
}

export interface ItemPedidoUnificado {
  id: string;
  origen: 'COTIZACION' | 'POS';
  numeroDoc: string;
  otAsociada?: string;
  fecha: string;
  clienteNombre: string;
  clienteTelefono: string;
  descripcion: string;
  total: number;
  abono: number;
  saldo: number;
  estadoPago: string;
  estadoComercial: string;
  metodoPago?: string;
  costoEstimado: number;
  margenEstimado: number;
  gramosResina: number;
}

export const FinancialReportView: React.FC<FinancialReportViewProps> = ({
  cotizaciones,
  ordenes,
  cuentas,
  resinas,
  ventasExpress = [],
  onOpenDailyBriefing,
  whatsappStatus = 'operativo'
}) => {
  // Balance financiero canónico directamente desde vista_balance_taller (PostgreSQL)
  const [balanceTaller, setBalanceTaller] = useState<BalanceTaller | null>(null);
  const [cargandoBalance, setCargandoBalance] = useState<boolean>(true);

  const fetchBalance = () => {
    setCargandoBalance(true);
    CloudSyncService.fetchBalanceTaller().then(bal => {
      setBalanceTaller(bal);
      setCargandoBalance(false);
    });
  };

  React.useEffect(() => {
    fetchBalance();
  }, []);

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [filterCanal, setFilterCanal] = useState<'todos' | 'cotizaciones' | 'pos'>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todas');

  // 1. Unificar todos los pedidos (Cotizaciones + Ventas Express / POS)
  const todosLosPedidos = useMemo<ItemPedidoUnificado[]>(() => {
    const items: ItemPedidoUnificado[] = [];

    // Mapear Cotizaciones
    cotizaciones.forEach(c => {
      const cuentaAsoc = cuentas.find(cc => cc.cotizacion_id === c.id || cc.cotizacion_numero === c.numero_cot);
      const otAsoc = ordenes.find(o => o.cotizacion_id === c.id || o.cotizacion_numero === c.numero_cot);
      
      const total = Number(c.total) || 0;
      const abono = cuentaAsoc ? Number(cuentaAsoc.abono) : (c.estado === 'Facturada' ? total : (otAsoc ? Number(otAsoc.abono || 0) : 0));
      const saldo = cuentaAsoc ? Number(cuentaAsoc.saldo_pendiente) : Math.max(0, total - abono);
      
      const costoItems = (c.items || []).reduce((s, it) => s + (Number(it.costo_base_produccion) || 0), 0);
      const gResina = (c.items || []).reduce((s, it) => s + ((Number(it.peso_estimado_g) || 0) * (Number(it.cantidad) || 1)), 0);

      items.push({
        id: `cot-${c.id}`,
        origen: 'COTIZACION',
        numeroDoc: c.numero_cot || 'COT-S/N',
        otAsociada: otAsoc?.numero_ot,
        fecha: c.fecha ? c.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
        clienteNombre: c.cliente?.nombre || 'Cliente General',
        clienteTelefono: c.cliente?.telefono || '',
        descripcion: (c.items || []).map(it => `${it.nombre_item} (x${it.cantidad})`).join(', ') || 'Servicio de Impresión 3D',
        total,
        abono,
        saldo,
        estadoPago: saldo <= 0 ? 'Pagado Total' : (abono > 0 ? 'Abono Parcial' : 'Pendiente'),
        estadoComercial: c.estado || 'Borrador',
        metodoPago: otAsoc?.metodo_pago || 'Bre-B',
        costoEstimado: costoItems,
        margenEstimado: Math.max(0, total - costoItems),
        gramosResina: gResina
      });
    });

    // Mapear Ventas Express / POS
    ventasExpress.forEach(v => {
      const total = Number(v.total) || 0;
      const abono = Number(v.abono) || 0;
      const saldo = v.saldo_pendiente !== undefined ? Number(v.saldo_pendiente) : Math.max(0, total - abono);

      // Costo estimado de stock o producción rápida (~45% del PVP si es figura o material)
      const costoEstimado = Math.round(total * 0.45);

      items.push({
        id: `pos-${v.id}`,
        origen: 'POS',
        numeroDoc: v.numero_venta || 'POS-S/N',
        otAsociada: v.ot_numero,
        fecha: v.fecha_venta ? v.fecha_venta.slice(0, 10) : new Date().toISOString().slice(0, 10),
        clienteNombre: v.cliente_nombre || 'Cliente Mostrador',
        clienteTelefono: v.cliente_telefono || '',
        descripcion: `${v.nombre_producto}${v.cantidad_vendida && v.cantidad_vendida > 1 ? ` (x${v.cantidad_vendida})` : ''}`,
        total,
        abono,
        saldo,
        estadoPago: v.estado_pago || (saldo <= 0 ? 'Pagado Total' : (abono > 0 ? 'Abono Parcial' : 'Pendiente')),
        estadoComercial: saldo <= 0 ? 'Completada / Entregada' : (abono > 0 ? 'Abono Registrado' : 'Pendiente'),
        metodoPago: v.metodo_pago || 'Bre-B',
        costoEstimado,
        margenEstimado: Math.max(0, total - costoEstimado),
        gramosResina: v.requiere_ot ? 35 : 0
      });
    });

    // Ordenar por fecha descendente
    return items.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [cotizaciones, ventasExpress, cuentas, ordenes]);

  // Lista de meses disponibles considerando ambas fuentes
  const mesesDisponibles = useMemo(() => {
    const setMeses = new Set<string>();
    todosLosPedidos.forEach(p => {
      if (p.fecha && p.fecha.length >= 7) {
        setMeses.add(p.fecha.slice(0, 7));
      }
    });
    return Array.from(setMeses).sort().reverse();
  }, [todosLosPedidos]);

  // Filtrar pedidos según selección
  const pedidosFiltrados = useMemo(() => {
    return todosLosPedidos.filter(p => {
      const matchMes = selectedMonth === 'todos' || p.fecha.startsWith(selectedMonth);
      const matchCanal = filterCanal === 'todos' || 
        (filterCanal === 'cotizaciones' && p.origen === 'COTIZACION') ||
        (filterCanal === 'pos' && p.origen === 'POS');

      let matchEstado = true;
      if (filterEstado === 'pagadas') {
        matchEstado = p.saldo <= 0;
      } else if (filterEstado === 'pendientes') {
        matchEstado = p.saldo > 0;
      } else if (filterEstado === 'confirmadas') {
        matchEstado = p.estadoComercial === 'Facturada' || p.estadoComercial === 'Aceptada' || p.origen === 'POS';
      }

      return matchMes && matchCanal && matchEstado;
    });
  }, [todosLosPedidos, selectedMonth, filterCanal, filterEstado]);

  // Métricas financieras calculadas consolidadas
  const totalFacturado = useMemo(() => {
    return pedidosFiltrados
      .filter(p => p.origen === 'POS' || p.estadoComercial === 'Facturada' || p.estadoComercial === 'Aceptada')
      .reduce((sum, p) => sum + p.total, 0);
  }, [pedidosFiltrados]);

  const totalPotencial = useMemo(() => {
    return pedidosFiltrados.reduce((sum, p) => sum + p.total, 0);
  }, [pedidosFiltrados]);

  const costoTotalProduccion = useMemo(() => {
    return pedidosFiltrados
      .filter(p => p.origen === 'POS' || p.estadoComercial === 'Facturada' || p.estadoComercial === 'Aceptada')
      .reduce((sum, p) => sum + p.costoEstimado, 0);
  }, [pedidosFiltrados]);

  const margenNetoEstimado = Math.max(0, totalFacturado - costoTotalProduccion);
  const porcentajeMargenPromedio = totalFacturado > 0 
    ? Math.round((margenNetoEstimado / totalFacturado) * 100) 
    : 45;

  const gramosResinaConsumidos = useMemo(() => {
    return pedidosFiltrados
      .filter(p => p.origen === 'POS' || p.estadoComercial === 'Facturada' || p.estadoComercial === 'Aceptada')
      .reduce((sum, p) => sum + p.gramosResina, 0);
  }, [pedidosFiltrados]);

  // Recaudo Consolidado Canónico (Conectado a vista_balance_taller con fallback)
  const totalAbonado = balanceTaller && selectedMonth === 'todos' && filterCanal === 'todos'
    ? balanceTaller.total_ingresos_recaudados 
    : pedidosFiltrados.reduce((sum, p) => sum + p.abono, 0);

  const totalSaldoPendiente = balanceTaller && selectedMonth === 'todos' && filterCanal === 'todos'
    ? balanceTaller.total_por_cobrar 
    : pedidosFiltrados.reduce((sum, p) => sum + p.saldo, 0);

  // Desglose por Canal
  const facturadoCotizaciones = useMemo(() => {
    return pedidosFiltrados
      .filter(p => p.origen === 'COTIZACION' && (p.estadoComercial === 'Facturada' || p.estadoComercial === 'Aceptada'))
      .reduce((sum, p) => sum + p.total, 0);
  }, [pedidosFiltrados]);

  const facturadoPOS = useMemo(() => {
    return pedidosFiltrados
      .filter(p => p.origen === 'POS')
      .reduce((sum, p) => sum + p.total, 0);
  }, [pedidosFiltrados]);

  // Exportar a Excel (.xls estructurado con HTML/XML)
  const handleExportExcel = () => {
    const filename = `Balance_Contable_Unificado_WJGEEKS_${selectedMonth}_${Date.now()}.xls`;

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Balance Unificado</x:Name>
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
          th { background-color: #0b1120; color: #38bdf8; font-weight: bold; border: 1px solid #cccccc; padding: 6px; }
          td { border: 1px solid #e2e8f0; padding: 5px; font-size: 11px; }
          .header-title { font-size: 16px; font-weight: bold; color: #0284c7; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .highlight { background-color: #f0fdf4; font-weight: bold; }
          .badge-pos { background-color: #fef3c7; color: #92400e; font-weight: bold; }
          .badge-cot { background-color: #e0f2fe; color: #0369a1; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-title">WJGEEKS 3D - BALANCE CONTABLE Y FINANCIERO CONSOLIDADO</div>
        <p>Periodo: <b>${selectedMonth === 'todos' ? 'Histórico Consolidado' : selectedMonth}</b> | Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}</p>
        
        <h3>1. RESUMEN DE INDICADORES FINANCIEROS (COTIZACIONES + VENTAS POS)</h3>
        <table style="width: 650px; margin-bottom: 20px;">
          <tr><th>Métrica</th><th>Valor (COP / Cantidad)</th></tr>
          <tr><td>Total Facturado / Confirmado:</td><td class="text-right"><b>$${totalFacturado.toLocaleString('es-CO')}</b></td></tr>
          <tr><td>  • Ingresos por Cotizaciones / Taller:</td><td class="text-right">$${facturadoCotizaciones.toLocaleString('es-CO')}</td></tr>
          <tr><td>  • Ingresos por Mostrador / POS Express:</td><td class="text-right">$${facturadoPOS.toLocaleString('es-CO')}</td></tr>
          <tr><td>Costo Base de Producción / Insumos:</td><td class="text-right">$${costoTotalProduccion.toLocaleString('es-CO')}</td></tr>
          <tr class="highlight"><td>Margen Neto Estimado de Taller:</td><td class="text-right">$${margenNetoEstimado.toLocaleString('es-CO')} (~${porcentajeMargenPromedio}%)</td></tr>
          <tr><td>Resina Estimada Consumida:</td><td class="text-right">${Math.round(gramosResinaConsumidos)} g (${(gramosResinaConsumidos / 1000).toFixed(2)} L)</td></tr>
          <tr><td>Recaudo Real Inmutable (Abonos & Liquidación):</td><td class="text-right"><b>$${totalAbonado.toLocaleString('es-CO')}</b></td></tr>
          <tr><td>Saldo Pendiente de Cobro en Taller & POS:</td><td class="text-right" style="color: #ef4444;"><b>$${totalSaldoPendiente.toLocaleString('es-CO')}</b></td></tr>
        </table>

        <h3>2. DETALLE UNIFICADO DE TODAS LAS OPERACIONES (${pedidosFiltrados.length} Registros)</h3>
        <table>
          <thead>
            <tr>
              <th>Canal</th>
              <th># Documento</th>
              <th>OT Asociada</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Descripción del Pedido / Producto</th>
              <th>Total Venta (COP)</th>
              <th>Abono (COP)</th>
              <th>Saldo Pendiente (COP)</th>
              <th>Estado de Pago</th>
              <th>Método de Pago</th>
            </tr>
          </thead>
          <tbody>
    `;

    pedidosFiltrados.forEach(p => {
      html += `
        <tr>
          <td class="text-center ${p.origen === 'POS' ? 'badge-pos' : 'badge-cot'}">${p.origen === 'POS' ? 'VENTA POS' : 'COTIZACIÓN'}</td>
          <td class="text-center"><b>${p.numeroDoc}</b></td>
          <td class="text-center">${p.otAsociada || 'N/A'}</td>
          <td class="text-center">${p.fecha}</td>
          <td>${p.clienteNombre}</td>
          <td class="text-center">${p.clienteTelefono || 'N/A'}</td>
          <td>${p.descripcion}</td>
          <td class="text-right"><b>$${p.total.toLocaleString('es-CO')}</b></td>
          <td class="text-right">$${p.abono.toLocaleString('es-CO')}</td>
          <td class="text-right" style="color: ${p.saldo > 0 ? '#ef4444' : '#10b981'};">$${p.saldo.toLocaleString('es-CO')}</td>
          <td class="text-center">${p.estadoPago}</td>
          <td class="text-center">${p.metodoPago || 'Bre-B'}</td>
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
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="section-title">
            <TrendingUp size={22} color="var(--brand-cyan)" />
            Balance Contable & Financiero Unificado
          </h2>
          <p className="section-subtitle">
            Consolidación integral de pedidos de Cotizaciones, Órdenes de Trabajo y Ventas POS Express
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchBalance}
            title="Refrescar balance desde PostgreSQL en Supabase"
          >
            <RefreshCw size={14} className={cargandoBalance ? 'spin' : ''} />
            <span>Refrescar</span>
          </button>

          <button 
            className="btn btn-primary btn-sm"
            onClick={handleExportExcel}
            title="Descargar balance unificado en formato Excel (.xls)"
            style={{ fontWeight: 700 }}
          >
            <FileSpreadsheet size={15} />
            <span>Exportar a Excel (.xls)</span>
          </button>
        </div>
      </div>

      {/* Widget Ejecutivo: Monitor de WhatsApp y Daily Briefing 7:00 AM */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(8, 13, 22, 0.95) 100%)',
        borderRadius: '16px',
        border: whatsappStatus === 'alerta_critica' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(0, 240, 255, 0.25)',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(0, 240, 255, 0.2))',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b'
          }}>
            <Sun size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                Monitor de Salud WhatsApp & Daily Briefing (7:00 AM)
              </h3>
              <span style={{
                fontSize: '0.70rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: whatsappStatus === 'alerta_critica' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                color: whatsappStatus === 'alerta_critica' ? '#f87171' : '#34d399',
                border: `1px solid ${whatsappStatus === 'alerta_critica' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
              }}>
                {whatsappStatus === 'alerta_critica' ? '🚨 ALERTA DE ENVÍOS' : '✅ WHATSAPP OPERATIVO'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Línea Oficial: <strong style={{ color: '#38bdf8' }}>+57 320 2796115</strong> | Notificaciones automáticas de pedidos y cobros.
            </p>
          </div>
        </div>

        {onOpenDailyBriefing && (
          <button
            className="btn btn-primary btn-sm"
            onClick={onOpenDailyBriefing}
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              color: '#fff',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sun size={15} />
            <span>Ver Daily Briefing</span>
          </button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border-subtle)', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Selector de Mes */}
          <div>
            <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <Calendar size={12} color="var(--brand-cyan)" />
              PERIODO / MES
            </label>
            <select 
              className="form-select" 
              style={{ fontSize: '0.82rem', padding: '5px 10px', minHeight: '34px' }}
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="todos">Todo el Histórico ({todosLosPedidos.length} pedidos)</option>
              {mesesDisponibles.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Selector de Canal / Origen */}
          <div>
            <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <Layers size={12} color="#a855f7" />
              CANAL DE ORIGEN
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={`btn btn-xs ${filterCanal === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterCanal('todos')}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                Todos ({todosLosPedidos.length})
              </button>
              <button
                type="button"
                className={`btn btn-xs ${filterCanal === 'cotizaciones' ? 'btn-cyan' : 'btn-secondary'}`}
                onClick={() => setFilterCanal('cotizaciones')}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                Cotizaciones ({cotizaciones.length})
              </button>
              <button
                type="button"
                className={`btn btn-xs ${filterCanal === 'pos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterCanal('pos')}
                style={{ fontSize: '0.75rem', padding: '4px 10px', background: filterCanal === 'pos' ? '#f59e0b' : undefined, borderColor: filterCanal === 'pos' ? '#f59e0b' : undefined, color: filterCanal === 'pos' ? '#000' : undefined }}
              >
                Ventas POS ({ventasExpress.length})
              </button>
            </div>
          </div>

          {/* Selector de Estado */}
          <div>
            <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <Filter size={12} color="var(--brand-blue)" />
              ESTADO DE PAGO
            </label>
            <select 
              className="form-select" 
              style={{ fontSize: '0.82rem', padding: '5px 10px', minHeight: '34px' }}
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
            >
              <option value="todas">Todos los cobros</option>
              <option value="pagadas">Completamente Pagadas ($0 saldo)</option>
              <option value="pendientes">Con Saldo Pendiente</option>
              <option value="confirmadas">Ventas Confirmadas</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
          Mostrando <strong>{pedidosFiltrados.length}</strong> operaciones consolidada(s)
        </div>
      </div>

      {/* Tarjetas de Métricas KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {/* Total Facturado */}
        <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(56, 189, 248, 0.25)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-cyan)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Facturado / Confirmado Total
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>
            ${totalFacturado.toLocaleString('es-CO')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span>Cotizaciones: <strong style={{ color: '#38bdf8' }}>${facturadoCotizaciones.toLocaleString('es-CO')}</strong></span>
            <span>Ventas POS: <strong style={{ color: '#fbbf24' }}>${facturadoPOS.toLocaleString('es-CO')}</strong></span>
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
            Rentabilidad promedio estimada: <strong>~{porcentajeMargenPromedio}%</strong>
          </div>
        </div>

        {/* Consumo Resina */}
        <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', marginBottom: '6px' }}>
            Material & Resina Estimada
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>
            {Math.round(gramosResinaConsumidos)} g
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Equivalente a <strong>{(gramosResinaConsumidos / 1000).toFixed(2)} botes</strong> de 1L
          </div>
        </div>

        {/* Cuentas de Cobro y Recaudo Canónico */}
        <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
              Recaudo Inmutable (Ledger)
            </span>
            {balanceTaller && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#34d399', background: 'rgba(52, 211, 153, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                PostgreSQL Core
              </span>
            )}
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>
            ${totalAbonado.toLocaleString('es-CO')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '4px' }}>
            Saldo por cobrar en taller & POS: <strong>${totalSaldoPendiente.toLocaleString('es-CO')}</strong>
          </div>
          {balanceTaller && (
            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.70rem', color: '#94a3b8', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span>Bre-B: <strong style={{ color: '#06b6d4' }}>${balanceTaller.recaudado_bre_b.toLocaleString('es-CO')}</strong></span>
              <span>Nequi: <strong style={{ color: '#c026d3' }}>${balanceTaller.recaudado_nequi.toLocaleString('es-CO')}</strong></span>
              <span>Efectivo: <strong style={{ color: '#10b981' }}>${balanceTaller.recaudado_efectivo.toLocaleString('es-CO')}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Tabla Detallada Unificada */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="var(--brand-cyan)" />
              <span>Detalle Consolidado de Pedidos, Cotizaciones y Ventas POS</span>
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Trazabilidad transparente de todas las órdenes del periodo
            </p>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {pedidosFiltrados.length} operaciones listadas
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 14px' }}>Canal</th>
                <th style={{ padding: '10px 14px' }}># Doc</th>
                <th style={{ padding: '10px 14px' }}>OT</th>
                <th style={{ padding: '10px 14px' }}>Fecha</th>
                <th style={{ padding: '10px 14px' }}>Cliente</th>
                <th style={{ padding: '10px 14px' }}>Descripción del Pedido</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Venta</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Abono</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Saldo</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Estado Pago</th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay operaciones que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((p, idx) => (
                  <tr 
                    key={p.id || idx}
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                    }}
                  >
                    {/* Canal Badge */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: p.origen === 'POS' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: p.origen === 'POS' ? '#fbbf24' : '#38bdf8',
                        border: `1px solid ${p.origen === 'POS' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                      }}>
                        {p.origen === 'POS' ? <Store size={10} /> : <FileText size={10} />}
                        {p.origen === 'POS' ? 'VENTA POS' : 'COTIZACIÓN'}
                      </span>
                    </td>

                    {/* # Documento */}
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                      {p.numeroDoc}
                    </td>

                    {/* OT Asociada */}
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {p.otAsociada ? (
                        <span style={{ color: '#38bdf8', fontWeight: 600 }}>{p.otAsociada}</span>
                      ) : (
                        <span style={{ opacity: 0.4 }}>—</span>
                      )}
                    </td>

                    {/* Fecha */}
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {p.fecha}
                    </td>

                    {/* Cliente */}
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      <div>{p.clienteNombre}</div>
                      {p.clienteTelefono && (
                        <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                          {p.clienteTelefono}
                        </span>
                      )}
                    </td>

                    {/* Descripción */}
                    <td style={{ padding: '10px 14px', color: '#cbd5e1', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.descripcion}
                    </td>

                    {/* Total */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                      ${p.total.toLocaleString('es-CO')}
                    </td>

                    {/* Abono */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#34d399', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      ${p.abono.toLocaleString('es-CO')}
                    </td>

                    {/* Saldo Pendiente */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: p.saldo > 0 ? '#f87171' : '#64748b' }}>
                      ${p.saldo.toLocaleString('es-CO')}
                    </td>

                    {/* Estado Pago */}
                    <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        fontSize: '0.70rem', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        fontWeight: 700,
                        background: p.saldo <= 0 
                          ? 'rgba(34, 197, 94, 0.15)' 
                          : (p.abono > 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                        color: p.saldo <= 0 
                          ? '#4ade80' 
                          : (p.abono > 0 ? '#38bdf8' : '#f87171')
                      }}>
                        {p.estadoPago}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
