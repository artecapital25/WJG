import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  FileSpreadsheet,
  Filter,
  Sun,
  Layers,
  RefreshCw,
  Store,
  FileText,
  Database,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  Receipt
} from 'lucide-react';
import {
  Cotizacion,
  OrdenTrabajo,
  CuentaCobro,
  Resina,
  PaymentRecord,
  EgresoTaller,
  SolicitudInsumo
} from '../../types';
import { VentaExpress } from '../../types/pos';
import { CloudSyncService, BalanceTaller } from '../../services/cloudSyncService';
import {
  calcularFlujoCajaResumen,
  detectarDuplicadosAbonos
} from '../../services/inventoryDeductionHelper';
import {
  WjgBadge,
  WjgButton,
  WjgCard,
  WjgProgressBar,
  WjgSelect,
  WjgTabs,
  getAlertSurfaceClassName,
  resolvePaymentAlert,
  type WjgTabOption
} from '../ui';
import { AbonosLedgerTab } from './AbonosLedgerTab';
import { EgresosCashflowTab } from './EgresosCashflowTab';

interface FinancialReportViewProps {
  cotizaciones: Cotizacion[];
  ordenes: OrdenTrabajo[];
  cuentas: CuentaCobro[];
  resinas: Resina[];
  ventasExpress?: VentaExpress[];
  solicitudesInsumos?: SolicitudInsumo[];
  activeOperator?: string;
  onOpenDailyBriefing?: () => void;
  onOpenBackup?: () => void;
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

type FinanceSubTab = 'resumen' | 'abonos' | 'egresos';

export const FinancialReportView: React.FC<FinancialReportViewProps> = ({
  cotizaciones,
  ordenes,
  cuentas,
  ventasExpress = [],
  solicitudesInsumos = [],
  activeOperator = 'Taller',
  onOpenDailyBriefing,
  onOpenBackup,
  whatsappStatus = 'operativo'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<FinanceSubTab>('resumen');
  const [balanceTaller, setBalanceTaller] = useState<BalanceTaller | null>(null);
  const [abonosDetallado, setAbonosDetallado] = useState<PaymentRecord[]>([]);
  const [egresos, setEgresos] = useState<EgresoTaller[]>([]);
  const [cargandoBalance, setCargandoBalance] = useState<boolean>(true);

  const refreshAccountingData = useCallback(async () => {
    setCargandoBalance(true);
    try {
      const [bal, abonosList, egresosList] = await Promise.all([
        CloudSyncService.fetchBalanceTaller(),
        CloudSyncService.fetchAbonosDetallado(300),
        CloudSyncService.fetchEgresos(),
      ]);
      if (bal) setBalanceTaller(bal);
      setAbonosDetallado(abonosList);
      setEgresos(egresosList);
    } catch {
      // Fallback silencioso a cálculos locales cuando Supabase no responde
    } finally {
      setCargandoBalance(false);
    }
  }, []);

  useEffect(() => {
    refreshAccountingData();
  }, [cotizaciones, ordenes, cuentas, ventasExpress, refreshAccountingData]);

  useEffect(() => {
    const handleLedgerUpdate = () => {
      refreshAccountingData();
    };
    window.addEventListener('wjg:ledger-updated', handleLedgerUpdate);
    return () => window.removeEventListener('wjg:ledger-updated', handleLedgerUpdate);
  }, [refreshAccountingData]);

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [filterCanal, setFilterCanal] = useState<'todos' | 'cotizaciones' | 'pos'>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todas');

  // 1. Unificar todos los pedidos (Cotizaciones + Ventas Express / POS + OTs sueltas)
  const todosLosPedidos = useMemo<ItemPedidoUnificado[]>(() => {
    const items: ItemPedidoUnificado[] = [];

    cotizaciones.forEach(c => {
      const cuentaAsoc = cuentas.find(
        cc =>
          cc.cotizacion_id === c.id ||
          (cc.cotizacion_numero && cc.cotizacion_numero === c.numero_cot)
      );
      const otAsoc = ordenes.find(
        o =>
          o.cotizacion_id === c.id ||
          (o.cotizacion_numero && o.cotizacion_numero === c.numero_cot)
      );

      const total = Number(c.total) || 0;
      const abono =
        c.abono !== undefined
          ? Number(c.abono)
          : cuentaAsoc
          ? Number(cuentaAsoc.abono)
          : c.estado === 'Facturada'
          ? total
          : otAsoc
          ? Number(otAsoc.abono ?? 0)
          : 0;
      const saldo =
        c.saldo_pendiente !== undefined
          ? Number(c.saldo_pendiente)
          : cuentaAsoc
          ? Number(cuentaAsoc.saldo_pendiente)
          : Math.max(0, total - abono);

      const costoItems = (c.items || []).reduce(
        (s, it) => s + (Number(it.costo_base_produccion) || 0),
        0
      );
      const gResina = (c.items || []).reduce(
        (s, it) => s + (Number(it.peso_estimado_g) || 0) * (Number(it.cantidad) || 1),
        0
      );

      items.push({
        id: `cot-${c.id}`,
        origen: 'COTIZACION',
        numeroDoc: c.numero_cot || 'COT-S/N',
        otAsociada: otAsoc?.numero_ot,
        fecha: c.fecha ? c.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
        clienteNombre: c.cliente?.nombre || 'Cliente General',
        clienteTelefono: c.cliente?.telefono || '',
        descripcion:
          (c.items || []).map(it => `${it.nombre_item} (x${it.cantidad})`).join(', ') ||
          'Servicio de Impresión 3D',
        total,
        abono,
        saldo,
        estadoPago:
          saldo <= 0 && total > 0
            ? 'Pagado Total'
            : abono > 0
            ? 'Abono Parcial'
            : 'Pendiente',
        estadoComercial: c.estado || 'Borrador',
        metodoPago: c.metodo_pago || otAsoc?.metodo_pago || 'Bre-B',
        costoEstimado: costoItems,
        margenEstimado: Math.max(0, total - costoItems),
        gramosResina: gResina,
      });
    });

    ventasExpress.forEach(v => {
      const otAsoc = ordenes.find(
        o =>
          (v.ot_id && (o.id === v.ot_id || o.numero_ot === v.ot_id)) ||
          (v.ot_numero && (o.numero_ot === v.ot_numero || o.id === v.ot_numero)) ||
          (o.pos_venta_id && o.pos_venta_id === v.id)
      );

      const total = Number(v.total) || 0;
      const abono = Math.max(0, Number(v.abono) || 0);
      const saldo =
        v.saldo_pendiente !== undefined
          ? Math.max(0, Number(v.saldo_pendiente))
          : Math.max(0, total - abono);
      const costoEstimado = Math.round(total * 0.45);

      items.push({
        id: `pos-${v.id}`,
        origen: 'POS',
        numeroDoc: v.numero_venta || 'POS-S/N',
        otAsociada: v.ot_numero || otAsoc?.numero_ot,
        fecha: v.fecha_venta ? v.fecha_venta.slice(0, 10) : new Date().toISOString().slice(0, 10),
        clienteNombre: v.cliente_nombre || 'Cliente Mostrador',
        clienteTelefono: v.cliente_telefono || '',
        descripcion: `${v.nombre_producto}${v.cantidad_vendida && v.cantidad_vendida > 1 ? ` (x${v.cantidad_vendida})` : ''}`,
        total,
        abono,
        saldo,
        estadoPago:
          saldo <= 0
            ? 'Pagado Total'
            : v.estado_pago || (abono > 0 ? 'Abono Parcial' : 'Pendiente'),
        estadoComercial:
          saldo <= 0
            ? 'Completada / Entregada'
            : abono > 0
            ? 'Abono Registrado'
            : 'Pendiente',
        metodoPago: v.metodo_pago || 'Bre-B',
        costoEstimado,
        margenEstimado: Math.max(0, total - costoEstimado),
        gramosResina: v.requiere_ot ? 35 : 0,
      });
    });

    const cotDocNumeros = new Set(cotizaciones.map(c => c.numero_cot));
    const cotDocIds = new Set(cotizaciones.map(c => c.id));
    const posDocIds = new Set(ventasExpress.map(v => v.id));
    const posOtNumeros = new Set(ventasExpress.map(v => v.ot_numero).filter(Boolean));
    const posOtIds = new Set(ventasExpress.map(v => v.ot_id).filter(Boolean));

    ordenes.forEach(o => {
      const vieneDeCot =
        (o.cotizacion_id && cotDocIds.has(o.cotizacion_id)) ||
        (o.cotizacion_numero && cotDocNumeros.has(o.cotizacion_numero));
      const vieneDePos =
        (o.pos_venta_id && posDocIds.has(o.pos_venta_id)) ||
        (o.numero_ot && posOtNumeros.has(o.numero_ot)) ||
        (o.id && posOtIds.has(o.id));
      if (vieneDeCot || vieneDePos) return;

      const total = Number(o.precio_cobrado || (o.abono || 0) + (o.saldo_pendiente || 0)) || 0;
      const abono = Number(o.abono || 0);
      const saldo =
        o.saldo_pendiente !== undefined ? Number(o.saldo_pendiente) : Math.max(0, total - abono);
      const costoEstimado = Math.round(total * 0.4);

      items.push({
        id: `ot-${o.id}`,
        origen: 'COTIZACION',
        numeroDoc: o.numero_ot || 'OT-S/N',
        otAsociada: o.numero_ot,
        fecha: o.fecha_creacion
          ? o.fecha_creacion.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        clienteNombre: o.cliente_nombre || 'Cliente Taller',
        clienteTelefono: o.cliente_telefono || '',
        descripcion: o.item_nombre || 'Orden Directa de Taller',
        total,
        abono,
        saldo,
        estadoPago:
          saldo <= 0 ? 'Pagado Total' : abono > 0 ? 'Abono Parcial' : 'Pendiente',
        estadoComercial: o.estado || 'En Producción',
        metodoPago: o.metodo_pago || 'Bre-B',
        costoEstimado,
        margenEstimado: Math.max(0, total - costoEstimado),
        gramosResina: 35,
      });
    });

    return items.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [cotizaciones, ventasExpress, cuentas, ordenes]);

  const mesesDisponibles = useMemo(() => {
    const setMeses = new Set<string>();
    todosLosPedidos.forEach(p => {
      if (p.fecha && p.fecha.length >= 7) setMeses.add(p.fecha.slice(0, 7));
    });
    return Array.from(setMeses).sort().reverse();
  }, [todosLosPedidos]);

  const pedidosFiltrados = useMemo(() => {
    return todosLosPedidos.filter(p => {
      const matchMes = selectedMonth === 'todos' || p.fecha.startsWith(selectedMonth);
      const matchCanal =
        filterCanal === 'todos' ||
        (filterCanal === 'cotizaciones' && p.origen === 'COTIZACION') ||
        (filterCanal === 'pos' && p.origen === 'POS');

      let matchEstado = true;
      if (filterEstado === 'pagadas') matchEstado = p.saldo <= 0;
      else if (filterEstado === 'pendientes') matchEstado = p.saldo > 0;
      else if (filterEstado === 'confirmadas') {
        matchEstado =
          p.estadoComercial === 'Facturada' ||
          p.estadoComercial === 'Aceptada' ||
          p.origen === 'POS';
      }

      return matchMes && matchCanal && matchEstado;
    });
  }, [todosLosPedidos, selectedMonth, filterCanal, filterEstado]);

  const totalFacturado = useMemo(() => {
    return pedidosFiltrados
      .filter(
        p =>
          p.origen === 'POS' ||
          p.estadoComercial === 'Facturada' ||
          p.estadoComercial === 'Aceptada'
      )
      .reduce((sum, p) => sum + p.total, 0);
  }, [pedidosFiltrados]);

  const costoTotalProduccion = useMemo(() => {
    return pedidosFiltrados
      .filter(
        p =>
          p.origen === 'POS' ||
          p.estadoComercial === 'Facturada' ||
          p.estadoComercial === 'Aceptada'
      )
      .reduce((sum, p) => sum + p.costoEstimado, 0);
  }, [pedidosFiltrados]);

  const margenNetoEstimado = Math.max(0, totalFacturado - costoTotalProduccion);
  const porcentajeMargenPromedio =
    totalFacturado > 0 ? Math.round((margenNetoEstimado / totalFacturado) * 100) : 45;

  const gramosResinaConsumidos = useMemo(() => {
    return pedidosFiltrados
      .filter(
        p =>
          p.origen === 'POS' ||
          p.estadoComercial === 'Facturada' ||
          p.estadoComercial === 'Aceptada'
      )
      .reduce((sum, p) => sum + p.gramosResina, 0);
  }, [pedidosFiltrados]);

  const usarVistaCanon = selectedMonth === 'todos' && filterCanal === 'todos';

  const totalAbonado =
    balanceTaller && usarVistaCanon
      ? balanceTaller.total_ingresos_recaudados
      : pedidosFiltrados.reduce((sum, p) => sum + p.abono, 0);

  const totalSaldoPendiente =
    balanceTaller && usarVistaCanon
      ? balanceTaller.total_por_cobrar
      : pedidosFiltrados.reduce((sum, p) => sum + p.saldo, 0);

  const egresosFiltradosMes = useMemo(() => {
    if (selectedMonth === 'todos') return egresos;
    return egresos.filter(e => (e.fecha || '').startsWith(selectedMonth));
  }, [egresos, selectedMonth]);

  const resumenCaja = useMemo(() => {
    const recBreB =
      balanceTaller && usarVistaCanon
        ? balanceTaller.recaudado_bre_b
        : pedidosFiltrados
            .filter(p => (p.metodoPago || '').toLowerCase().includes('bre'))
            .reduce((s, p) => s + p.abono, 0);
    const recNequi =
      balanceTaller && usarVistaCanon
        ? balanceTaller.recaudado_nequi
        : pedidosFiltrados
            .filter(p => (p.metodoPago || '').toLowerCase().includes('nequi'))
            .reduce((s, p) => s + p.abono, 0);
    const recEfectivo =
      balanceTaller && usarVistaCanon
        ? balanceTaller.recaudado_efectivo
        : pedidosFiltrados
            .filter(p => (p.metodoPago || '').toLowerCase().includes('efect'))
            .reduce((s, p) => s + p.abono, 0);

    return calcularFlujoCajaResumen({
      recaudadoBreB: recBreB,
      recaudadoNequi: recNequi,
      recaudadoEfectivo: recEfectivo,
      recaudadoTotal: totalAbonado,
      egresos: egresosFiltradosMes,
    });
  }, [balanceTaller, usarVistaCanon, pedidosFiltrados, totalAbonado, egresosFiltradosMes]);

  const facturadoCotizaciones = useMemo(
    () =>
      pedidosFiltrados
        .filter(
          p =>
            p.origen === 'COTIZACION' &&
            (p.estadoComercial === 'Facturada' || p.estadoComercial === 'Aceptada')
        )
        .reduce((sum, p) => sum + p.total, 0),
    [pedidosFiltrados]
  );

  const facturadoPOS = useMemo(
    () => pedidosFiltrados.filter(p => p.origen === 'POS').reduce((sum, p) => sum + p.total, 0),
    [pedidosFiltrados]
  );

  const recaudoCotizaciones = useMemo(
    () =>
      pedidosFiltrados.filter(p => p.origen === 'COTIZACION').reduce((sum, p) => sum + p.abono, 0),
    [pedidosFiltrados]
  );

  const recaudoPOS = useMemo(
    () => pedidosFiltrados.filter(p => p.origen === 'POS').reduce((sum, p) => sum + p.abono, 0),
    [pedidosFiltrados]
  );

  const tasaRecaudoPct =
    totalAbonado + totalSaldoPendiente > 0
      ? Math.round((totalAbonado / (totalAbonado + totalSaldoPendiente)) * 100)
      : 100;

  const ticketPromedio =
    pedidosFiltrados.length > 0 ? Math.round(totalFacturado / pedidosFiltrados.length) : 0;

  const { groups: duplicateGroups } = useMemo(
    () => detectarDuplicadosAbonos(abonosDetallado),
    [abonosDetallado]
  );

  const financeTabs: WjgTabOption<FinanceSubTab>[] = [
    { id: 'resumen', label: 'Balance Ejecutivo & Caja', icon: <Wallet size={15} /> },
    {
      id: 'abonos',
      label: 'Libro de Recaudos',
      icon: <BookOpen size={15} />,
      badge: duplicateGroups.length > 0 ? `${duplicateGroups.length}⚠` : abonosDetallado.length,
    },
    {
      id: 'egresos',
      label: 'Egresos & Flujo de Caja',
      icon: <Receipt size={15} />,
      badge: egresos.length || undefined,
    },
  ];

  // Exportar a Excel (.xls estructurado con HTML/XML incluyendo Egresos y Caja Real)
  const handleExportExcel = () => {
    const filename = `Balance_Contable_Unificado_WJGEEKS_${selectedMonth}_${Date.now()}.xls`;

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th { background-color: #0b1120; color: #38bdf8; font-weight: bold; border: 1px solid #cccccc; padding: 6px; }
          td { border: 1px solid #e2e8f0; padding: 5px; font-size: 11px; }
          .header-title { font-size: 16px; font-weight: bold; color: #0284c7; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .highlight { background-color: #f0fdf4; font-weight: bold; }
          .danger { background-color: #fef2f2; color: #b91c1c; font-weight: bold; }
          .badge-pos { background-color: #fef3c7; color: #92400e; font-weight: bold; }
          .badge-cot { background-color: #e0f2fe; color: #0369a1; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-title">WJGEEKS 3D PRO - BALANCE CONTABLE, EGRESOS Y FLUJO DE CAJA</div>
        <p>Periodo: <b>${selectedMonth === 'todos' ? 'Histórico Consolidado' : selectedMonth}</b> | Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}</p>

        <h3>1. RESUMEN DE FLUJO DE CAJA E INDICADORES</h3>
        <table style="width: 680px; margin-bottom: 20px;">
          <tr><th>Métrica</th><th>Valor (COP / %)</th></tr>
          <tr><td>Total Facturado / Confirmado:</td><td class="text-right"><b>$${totalFacturado.toLocaleString('es-CO')}</b></td></tr>
          <tr><td>Ingresos Recaudados en Libro (abonos_pagos):</td><td class="text-right"><b>$${resumenCaja.totalIngresos.toLocaleString('es-CO')}</b> (Tasa cobro: ${tasaRecaudoPct}%)</td></tr>
          <tr class="danger"><td>Total Egresos y Devoluciones (egresos_taller):</td><td class="text-right">-$${resumenCaja.totalEgresos.toLocaleString('es-CO')}</td></tr>
          <tr class="highlight"><td>FLUJO DE CAJA NETO DISPONIBLE:</td><td class="text-right"><b>$${resumenCaja.flujoCajaNeto.toLocaleString('es-CO')}</b></td></tr>
          <tr><td>Saldo Pendiente de Cobro (Cartera):</td><td class="text-right" style="color: #ef4444;"><b>$${totalSaldoPendiente.toLocaleString('es-CO')}</b></td></tr>
          <tr><td>Margen Neto Estimado de Taller:</td><td class="text-right">$${margenNetoEstimado.toLocaleString('es-CO')} (~${porcentajeMargenPromedio}%)</td></tr>
        </table>

        <h3>2. CAJA DISCRIMINADA POR MEDIO DE PAGO</h3>
        <table style="width: 680px; margin-bottom: 20px;">
          <thead><tr><th>Medio / Caja</th><th>Ingresos (+)</th><th>Egresos (-)</th><th>Saldo Neto en Caja</th></tr></thead>
          <tbody>
            ${resumenCaja.porMetodo
              .map(
                m => `<tr><td>${m.etiqueta}</td><td class="text-right">$${m.ingresos.toLocaleString('es-CO')}</td><td class="text-right">$${m.egresos.toLocaleString('es-CO')}</td><td class="text-right"><b>$${m.neto.toLocaleString('es-CO')}</b></td></tr>`
              )
              .join('')}
          </tbody>
        </table>

        <h3>3. DETALLE UNIFICADO DE OPERACIONES (${pedidosFiltrados.length} Registros)</h3>
        <table>
          <thead>
            <tr>
              <th>Canal</th><th># Documento</th><th>OT Asociada</th><th>Fecha</th><th>Cliente</th>
              <th>Teléfono</th><th>Descripción</th><th>Total Venta</th><th>Abono</th><th>Saldo</th><th>Estado Pago</th><th>Método</th>
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
        <h3>4. EGRESOS DEL TALLER (${egresosFiltradosMes.length} Registros)</h3>
        <table>
          <thead><tr><th>Fecha</th><th>Categoría</th><th>Concepto</th><th>Proveedor/Beneficiario</th><th>Medio</th><th>Monto</th></tr></thead>
          <tbody>
            ${egresosFiltradosMes
              .map(
                e => `<tr><td>${e.fecha}</td><td>${e.categoria}</td><td>${e.concepto}</td><td>${e.proveedor_o_beneficiario || '—'}</td><td>${e.metodo_pago}</td><td class="text-right">-$${Number(e.monto || 0).toLocaleString('es-CO')}</td></tr>`
              )
              .join('')}
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
            Contabilidad Ejecutiva, Recaudos & Flujo de Caja
          </h2>
          <p className="section-subtitle">
            Balance bidireccional con Supabase: ingresos reales, libro editable de abonos, egresos y saldo por caja
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <WjgButton
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} className={cargandoBalance ? 'spin' : ''} />}
            onClick={refreshAccountingData}
            title="Refrescar balance, recaudos y egresos desde Supabase"
          >
            Refrescar
          </WjgButton>

          <WjgButton
            variant="save"
            size="sm"
            leftIcon={<FileSpreadsheet size={15} />}
            onClick={handleExportExcel}
            title="Descargar balance contable completo en Excel (.xls)"
          >
            Exportar a Excel (.xls)
          </WjgButton>
        </div>
      </div>

      {/* Sub-pestañas contables */}
      <WjgTabs tabs={financeTabs} activeId={activeSubTab} onChange={setActiveSubTab} />

      {activeSubTab === 'abonos' && (
        <AbonosLedgerTab
          abonos={abonosDetallado}
          loading={cargandoBalance}
          onRefresh={refreshAccountingData}
        />
      )}

      {activeSubTab === 'egresos' && (
        <EgresosCashflowTab
          egresos={egresos}
          solicitudesInsumos={solicitudesInsumos}
          activeOperator={activeOperator}
          loading={cargandoBalance}
          onRefresh={refreshAccountingData}
        />
      )}

      {activeSubTab === 'resumen' && (
        <>
          {/* Widget Ejecutivo: Monitor de WhatsApp y Daily Briefing 7:00 AM */}
          <div
            className={getAlertSurfaceClassName(whatsappStatus === 'alerta_critica' ? 'danger' : 'success')}
            style={{
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(0, 240, 255, 0.2))',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                }}
              >
                <Sun size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                    Monitor de Salud WhatsApp & Daily Briefing (7:00 AM)
                  </h3>
                  <WjgBadge variant={whatsappStatus === 'alerta_critica' ? 'danger' : 'success'}>
                    {whatsappStatus === 'alerta_critica' ? '🚨 ALERTA DE ENVÍOS' : '✅ WHATSAPP OPERATIVO'}
                  </WjgBadge>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Línea Oficial: <strong style={{ color: '#38bdf8' }}>+57 320 2796115</strong> | Notificaciones automáticas de pedidos y cobros.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {onOpenBackup && (
                <WjgButton
                  variant="secondary"
                  size="sm"
                  leftIcon={<Database size={15} color="#38bdf8" />}
                  onClick={onOpenBackup}
                  style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}
                  title="Copia de Seguridad y Google Drive (3:00 AM)"
                >
                  Respaldos & Drive
                </WjgButton>
              )}

              {onOpenDailyBriefing && (
                <WjgButton
                  variant="cyan"
                  size="sm"
                  leftIcon={<Sun size={15} />}
                  onClick={onOpenDailyBriefing}
                >
                  Ver Daily Briefing
                </WjgButton>
              )}
            </div>
          </div>

          {/* Barra de Filtros */}
          <div
            style={{
              background: 'var(--bg-card)',
              padding: '14px 18px',
              borderRadius: '14px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
              display: 'flex',
              gap: '14px',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ minWidth: '185px', flex: '1 1 185px' }}>
                <label
                  style={{
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '3px',
                  }}
                >
                  <Calendar size={12} color="var(--brand-cyan)" />
                  PERIODO / MES
                </label>
                <WjgSelect
                  compact
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  options={[
                    { value: 'todos', label: `Todo el Histórico (${todosLosPedidos.length} pedidos)` },
                    ...mesesDisponibles.map(m => ({ value: m, label: m })),
                  ]}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '3px',
                  }}
                >
                  <Layers size={12} color="#a855f7" />
                  CANAL DE ORIGEN
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <WjgButton
                    size="sm"
                    variant={filterCanal === 'todos' ? 'primary' : 'secondary'}
                    onClick={() => setFilterCanal('todos')}
                  >
                    Todos ({todosLosPedidos.length})
                  </WjgButton>
                  <WjgButton
                    size="sm"
                    variant={filterCanal === 'cotizaciones' ? 'cyan' : 'secondary'}
                    onClick={() => setFilterCanal('cotizaciones')}
                  >
                    Cotizaciones ({cotizaciones.length})
                  </WjgButton>
                  <WjgButton
                    size="sm"
                    variant={filterCanal === 'pos' ? 'warning' : 'secondary'}
                    onClick={() => setFilterCanal('pos')}
                  >
                    Ventas POS ({ventasExpress.length})
                  </WjgButton>
                </div>
              </div>

              <div style={{ minWidth: '185px', flex: '1 1 185px' }}>
                <label
                  style={{
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '3px',
                  }}
                >
                  <Filter size={12} color="var(--brand-blue)" />
                  ESTADO DE PAGO
                </label>
                <WjgSelect
                  compact
                  value={filterEstado}
                  onChange={setFilterEstado}
                  options={[
                    { value: 'todas', label: 'Todos los cobros' },
                    { value: 'pagadas', label: 'Completamente Pagadas ($0 saldo)' },
                    { value: 'pendientes', label: 'Con Saldo Pendiente' },
                    { value: 'confirmadas', label: 'Ventas Confirmadas' },
                  ]}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
              Mostrando <strong>{pedidosFiltrados.length}</strong> operaciones · Ticket prom:{' '}
              <strong style={{ color: '#38bdf8' }}>${ticketPromedio.toLocaleString('es-CO')}</strong>
            </div>
          </div>

          {/* Tarjetas KPI Ejecutivas de Flujo de Caja */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            {/* Flujo de Caja Neto */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14), rgba(15, 23, 42, 0.9))',
                padding: '18px',
                borderRadius: '14px',
                border:
                  resumenCaja.flujoCajaNeto >= 0
                    ? '1px solid rgba(16, 185, 129, 0.45)'
                    : '1px solid rgba(239, 68, 68, 0.45)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase' }}>
                  Flujo de Caja Neto Real
                </span>
                <Wallet size={16} color="#34d399" />
              </div>
              <div
                className="tabular-nums"
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 900,
                  color: resumenCaja.flujoCajaNeto >= 0 ? '#4ade80' : '#f87171',
                  fontFamily: 'var(--font-display)',
                }}
              >
                ${resumenCaja.flujoCajaNeto.toLocaleString('es-CO')}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#cbd5e1', marginTop: '6px' }}>
                Ingresos reales menos egresos operativos y devoluciones
              </div>
            </div>

            {/* Ingresos Recaudados + Tasa Recaudo */}
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '18px',
                borderRadius: '14px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                  Ingresos Recaudados (Ledger)
                </span>
                <ArrowUpCircle size={16} color="#38bdf8" />
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}
              >
                ${resumenCaja.totalIngresos.toLocaleString('es-CO')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <WjgProgressBar percent={tasaRecaudoPct} label="Tasa de cobro efectiva" size="sm" />
                <span>
                  Cotiz: <strong style={{ color: '#38bdf8' }}>${recaudoCotizaciones.toLocaleString('es-CO')}</strong> · POS:{' '}
                  <strong style={{ color: '#fbbf24' }}>${recaudoPOS.toLocaleString('es-CO')}</strong>
                </span>
              </div>
            </div>

            {/* Total Egresos */}
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '18px',
                borderRadius: '14px',
                border: '1px solid rgba(244, 63, 94, 0.3)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#fb7185', textTransform: 'uppercase' }}>
                  Total Egresos / Salidas
                </span>
                <ArrowDownCircle size={16} color="#fb7185" />
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fda4af', fontFamily: 'var(--font-display)' }}
              >
                -${resumenCaja.totalEgresos.toLocaleString('es-CO')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{egresosFiltradosMes.length} registro(s) de gasto</span>
                <WjgButton size="sm" variant="ghost" onClick={() => setActiveSubTab('egresos')}>
                  Ver / Registrar
                </WjgButton>
              </div>
            </div>

            {/* Cartera por Cobrar + Facturado */}
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '18px',
                borderRadius: '14px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
                  Cartera Pendiente por Cobrar
                </span>
                {balanceTaller && <WjgBadge variant="success">PostgreSQL Core</WjgBadge>}
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-display)' }}
              >
                ${totalSaldoPendiente.toLocaleString('es-CO')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>Facturado total: <strong style={{ color: '#fff' }}>${totalFacturado.toLocaleString('es-CO')}</strong></span>
                <span>Cotiz: <strong style={{ color: '#38bdf8' }}>${facturadoCotizaciones.toLocaleString('es-CO')}</strong> · POS: <strong style={{ color: '#fbbf24' }}>${facturadoPOS.toLocaleString('es-CO')}</strong></span>
              </div>
            </div>

            {/* Margen & Resina */}
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '18px',
                borderRadius: '14px',
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}
            >
              <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', marginBottom: '6px' }}>
                Margen Taller & Material Est.
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80', fontFamily: 'var(--font-display)' }}
              >
                ${margenNetoEstimado.toLocaleString('es-CO')} ({porcentajeMargenPromedio}%)
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Resina/Filamento estimado: <strong style={{ color: '#e9d5ff' }}>{Math.round(gramosResinaConsumidos)} g</strong> ({(gramosResinaConsumidos / 1000).toFixed(2)} kg/L)
              </div>
            </div>
          </div>

          {/* Tabla de Caja Real por Medio de Pago */}
          <WjgCard style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                  Arqueo de Cajas por Medio de Pago (Bre-B · Nequi · Efectivo)
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Comparativo exacto entre el dinero que entró en abonos y las salidas pagadas desde cada cuenta
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <WjgButton size="sm" variant="secondary" onClick={() => setActiveSubTab('abonos')}>
                  Auditar Abonos ({abonosDetallado.length})
                </WjgButton>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cuenta / Medio de Pago</th>
                    <th style={{ textAlign: 'right' }}>Ingresos Recaudados (+)</th>
                    <th style={{ textAlign: 'right' }}>Egresos Pagados (-)</th>
                    <th style={{ textAlign: 'right' }}>Saldo Neto Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenCaja.porMetodo
                    .filter(m => m.ingresos > 0 || m.egresos > 0 || m.metodo !== 'OTROS')
                    .map(m => (
                      <tr key={m.metodo}>
                        <td style={{ fontWeight: 700 }}>{m.etiqueta}</td>
                        <td className="tabular-nums" style={{ textAlign: 'right', color: '#34d399', fontWeight: 700 }}>
                          +${m.ingresos.toLocaleString('es-CO')}
                        </td>
                        <td className="tabular-nums" style={{ textAlign: 'right', color: m.egresos > 0 ? '#fb7185' : 'var(--text-muted)', fontWeight: 700 }}>
                          -${m.egresos.toLocaleString('es-CO')}
                        </td>
                        <td
                          className="tabular-nums"
                          style={{
                            textAlign: 'right',
                            fontWeight: 900,
                            color: m.neto >= 0 ? '#38bdf8' : '#f87171',
                          }}
                        >
                          ${m.neto.toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </WjgCard>

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
                    pedidosFiltrados.map((p, idx) => {
                      const payAlert = resolvePaymentAlert({
                        total: p.total,
                        abono: p.abono,
                        saldoPendiente: p.saldo,
                        estadoPago: p.estadoPago,
                      });
                      return (
                      <tr
                        key={p.id || idx}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          borderLeft: `3px solid ${payAlert.tokens.accentColor}`,
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        }}
                      >
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: p.origen === 'POS' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                              color: p.origen === 'POS' ? '#fbbf24' : '#38bdf8',
                              border: `1px solid ${p.origen === 'POS' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                            }}
                          >
                            {p.origen === 'POS' ? <Store size={10} /> : <FileText size={10} />}
                            {p.origen === 'POS' ? 'VENTA POS' : 'COTIZACIÓN'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                          {p.numeroDoc}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {p.otAsociada ? (
                            <span style={{ color: '#38bdf8', fontWeight: 600 }}>{p.otAsociada}</span>
                          ) : (
                            <span style={{ opacity: 0.4 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {p.fecha}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                          <div>{p.clienteNombre}</div>
                          {p.clienteTelefono && (
                            <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                              {p.clienteTelefono}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#cbd5e1', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.descripcion}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                          ${p.total.toLocaleString('es-CO')}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#34d399', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          ${p.abono.toLocaleString('es-CO')}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: p.saldo > 0 ? '#f87171' : '#64748b' }}>
                          ${p.saldo.toLocaleString('es-CO')}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <WjgBadge variant={payAlert.badgeVariant}>
                            {p.estadoPago} ({payAlert.percent ?? 0}%)
                          </WjgBadge>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
