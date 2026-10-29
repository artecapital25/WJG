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
  Camera,
  Edit3,
  Trash2,
  Wrench
} from 'lucide-react';
import { 
  CuentaCobro, 
  ConfiguracionTaller, 
  EstadoPago, 
  VentaExpress, 
  OrdenTrabajo, 
  Cliente, 
  DatosPagoRegistro 
} from '../../types';
import { generarPDFCuentaCobro } from '../../services/pdfService';
import { generateCuentaCobroWhatsAppUrl, openWhatsApp, formatWhatsAppPhone } from '../../services/whatsappService';
import { calcularAlertaCobro, generarWhatsAppRecordatorioCobro } from '../../services/posService';
import { ModalRegistrarDeudaManual } from '../common/ModalRegistrarDeudaManual';
import { ModalRegistrarPago } from '../common/ModalRegistrarPago';
import { ModalEditarVentaExpress } from '../pos/ModalEditarVentaExpress';
import { ModalConfirmarEliminarCobro, InfoCobroAEliminar } from '../common/ModalConfirmarEliminarCobro';
import { CloudSyncService } from '../../services/cloudSyncService';
import { toast } from '../ui/ToastProvider';

export * from './cuentasCobroUtils';
import { 
  ItemDeudaConsolidado, 
  DeudorConsolidado, 
  otMatchesCuenta, 
  otMatchesVenta, 
  ventaMatchesCuenta 
} from './cuentasCobroUtils';

// Helper para generar mensaje de cobro por WhatsApp de una Orden de Trabajo
const generarWhatsAppCobroOT = (ot: OrdenTrabajo, config: ConfiguracionTaller): string => {
  const phone = formatWhatsAppPhone(ot.cliente_telefono || '');
  const saldoOT = ot.saldo_pendiente ?? Math.max(0, (ot.precio_cobrado || 0) - (ot.abono || 0));
  const totalOT = ot.precio_cobrado || ((ot.abono || 0) + saldoOT);
  
  const mensaje = 
`👋 Hola *${ot.cliente_nombre || 'Cliente'}*, un saludo desde *WJGEEKS 3D* 🚀

Te escribimos referente a tu orden de trabajo:
🛠️ *Orden:* *${ot.numero_ot}*
🧩 *Pieza / Proyecto:* *${ot.item_nombre}* ${ot.cantidad > 1 ? `(x${ot.cantidad})` : ''}
📍 *Estado en Taller:* ${ot.estado}

━━━━━━━━━━━━━━━━━━━━
💰 *Precio Total:* $${totalOT.toLocaleString('es-CO')} COP
💵 *Abono registrado:* $${(ot.abono || 0).toLocaleString('es-CO')} COP
🔴 *SALDO PENDIENTE:* *$${saldoOT.toLocaleString('es-CO')} COP*
━━━━━━━━━━━━━━━━━━━━

📲 *Medios de Pago Disponibles:*
• *Bre-B (Llave única):* ${config.bre_b || '0090778625'}
• *Nequi:* ${config.nequi} (${config.titular_cuenta})

Por favor envíanos el soporte una vez realices tu abono para actualizar tu orden en taller. ¡Muchas gracias por tu confianza! ✨🎨`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
};

interface CuentasCobroListProps {
  cuentas: CuentaCobro[];
  ventasExpress?: VentaExpress[];
  ordenes?: OrdenTrabajo[];
  clientes?: Cliente[];
  config: ConfiguracionTaller;
  onUpdatePago: (cuentaId: string, nuevoAbono: number) => void;
  onUpdateVentaExpress?: (venta: VentaExpress) => void;
  onEliminarVentaExpress?: (ventaId: string) => void;
  onEliminarCuentaCobro?: (cuentaId: string) => void;
  onActualizarOT?: (ot: OrdenTrabajo) => void;
  onCrearCuentaCobro?: (nuevaCC: CuentaCobro) => void;
  onRegistrarPagoConsolidado?: (item: ItemDeudaConsolidado, datos: DatosPagoRegistro) => void;
  onNavigateTab?: (tab: any) => void;
}

export const CuentasCobroList: React.FC<CuentasCobroListProps> = ({
  cuentas,
  ventasExpress = [],
  ordenes = [],
  clientes = [],
  config,
  onUpdatePago,
  onUpdateVentaExpress,
  onEliminarVentaExpress,
  onEliminarCuentaCobro,
  onActualizarOT,
  onCrearCuentaCobro,
  onRegistrarPagoConsolidado,
  onNavigateTab
}) => {
  const [subTab, setSubTab] = useState<'deudores' | 'ordenes' | 'pos' | 'cuentas'>('deudores');
  const [searchDeudor, setSearchDeudor] = useState<string>('');
  const [showModalNuevaDeuda, setShowModalNuevaDeuda] = useState(false);
  const [notifCartera, setNotifCartera] = useState<string | null>(null);

  // Modal Centralizado Unificado de Pagos (Bre-B & Nequi)
  const [itemParaAbono, setItemParaAbono] = useState<ItemDeudaConsolidado | null>(null);
  const [cuentaParaEliminar, setCuentaParaEliminar] = useState<CuentaCobro | null>(null);
  const [ventaParaEditar, setVentaParaEditar] = useState<VentaExpress | null>(null);
  const [ventaParaEliminar, setVentaParaEliminar] = useState<VentaExpress | null>(null);
  const [cobroParaEliminar, setCobroParaEliminar] = useState<InfoCobroAEliminar | null>(null);

  const handleAbrirModalEliminarCobro = (item: ItemDeudaConsolidado) => {
    let cobroId = item.id.replace(/^(ot-|cc-|pos-)/, '');
    let fecha = new Date().toISOString().slice(0, 10);
    let referencia = 'Registro Sistema / Bre-B';
    const otId = item.rawOT?.id || (item.tipo === 'ot' ? item.id.replace(/^ot-/, '') : undefined);

    // Apertura inmediata del modal sin bloqueo de red
    setCobroParaEliminar({
      id: cobroId,
      monto: item.abono,
      referencia,
      fecha,
      concepto: `${item.codigo} • ${item.descripcion}`,
      clienteNombre: item.cliente_nombre,
      otId,
      cuentaId: item.rawCuenta?.id
    });

    if (otId) {
      CloudSyncService.fetchAbonos({ orden_trabajo_id: otId }).then(abonos => {
        if (abonos && abonos.length > 0) {
          const ultimo = abonos[0];
          setCobroParaEliminar(prev => prev ? ({
            ...prev,
            id: ultimo.id || prev.id,
            fecha: (ultimo.fecha_pago || ultimo.created_at || prev.fecha).slice(0, 10),
            referencia: ultimo.referencia_transaccion || prev.referencia
          }) : null);
        }
      }).catch(() => {});
    }
  };

  const handleAbrirModalEliminarCobroOT = (ot: OrdenTrabajo) => {
    let cobroId = ot.id;
    let fecha = ot.fecha_creacion ? ot.fecha_creacion.slice(0, 10) : new Date().toISOString().slice(0, 10);
    let referencia = ot.metodo_pago || 'Bre-B';

    setCobroParaEliminar({
      id: cobroId,
      monto: ot.abono || 0,
      referencia,
      fecha,
      concepto: `${ot.numero_ot} • ${ot.item_nombre}`,
      clienteNombre: ot.cliente_nombre,
      otId: ot.id
    });

    CloudSyncService.fetchAbonos({ orden_trabajo_id: ot.id }).then(abonos => {
      if (abonos && abonos.length > 0) {
        const ultimo = abonos[0];
        setCobroParaEliminar(prev => prev ? ({
          ...prev,
          id: ultimo.id || prev.id,
          fecha: (ultimo.fecha_pago || ultimo.created_at || prev.fecha).slice(0, 10),
          referencia: ultimo.referencia_transaccion || prev.referencia
        }) : null);
      }
    }).catch(() => {});
  };

  const handleAbrirModalEliminarCobroCuenta = (cuenta: CuentaCobro) => {
    const matchingOT = ordenes.find(o => otMatchesCuenta(o, cuenta));
    let cobroId = cuenta.id;
    let fecha = cuenta.fecha_emision || new Date().toISOString().slice(0, 10);
    let referencia = 'Bre-B 0090778625';

    setCobroParaEliminar({
      id: cobroId,
      monto: cuenta.abono,
      referencia,
      fecha,
      concepto: `${cuenta.numero_cc} • ${cuenta.items_resumen}`,
      clienteNombre: cuenta.cliente.nombre,
      otId: matchingOT?.id,
      cuentaId: cuenta.id
    });

    if (matchingOT) {
      CloudSyncService.fetchAbonos({ orden_trabajo_id: matchingOT.id }).then(abonos => {
        if (abonos && abonos.length > 0) {
          const ultimo = abonos[0];
          setCobroParaEliminar(prev => prev ? ({
            ...prev,
            id: ultimo.id || prev.id,
            fecha: (ultimo.fecha_pago || ultimo.created_at || prev.fecha).slice(0, 10),
            referencia: ultimo.referencia_transaccion || prev.referencia
          }) : null);
        }
      }).catch(() => {});
    }
  };

  const handleConfirmarEliminarCobro = async (cobroId: string, otId?: string, monto?: number) => {
    const res = await CloudSyncService.eliminarCobroDuplicado(cobroId, otId, monto);
    if (!res.success) {
      toast.error(res.message || 'Error al eliminar cobro duplicado');
      return;
    }

    // Actualizar estado reactivo en ordenes de trabajo
    if (otId && onActualizarOT && monto) {
      const otActual = ordenes.find(o => o.id === otId || o.numero_ot === otId);
      if (otActual) {
        const nuevoAbono = Math.max(0, (otActual.abono || 0) - monto);
        const totalOT = otActual.precio_cobrado || 0;
        const nuevoSaldo = Math.max(0, totalOT - nuevoAbono);
        onActualizarOT({
          ...otActual,
          abono: nuevoAbono,
          saldo_pendiente: nuevoSaldo,
          estado_pago: nuevoSaldo <= 0 ? 'Pagado Total' : (nuevoAbono > 0 ? 'Abono Parcial' : 'Pendiente')
        });
      }
    }

    // Actualizar cuenta si aplica
    if (cobroParaEliminar?.cuentaId && monto) {
      const cActual = cuentas.find(c => c.id === cobroParaEliminar.cuentaId);
      if (cActual) {
        const nuevoAbono = Math.max(0, cActual.abono - monto);
        onUpdatePago(cActual.id, nuevoAbono);
      }
    }

    toast.success('Cobro duplicado eliminado y saldos de la orden recalculados exitosamente.');
    setCobroParaEliminar(null);
  };

  const handleGuardarDeudaManual = (nuevaCC: CuentaCobro) => {
    if (onCrearCuentaCobro) {
      onCrearCuentaCobro(nuevaCC);
    }
    setNotifCartera(`✅ Deuda de ${nuevaCC.cliente.nombre} ($${nuevaCC.saldo_pendiente.toLocaleString('es-CO')}) registrada en cartera.`);
    setTimeout(() => setNotifCartera(null), 5000);
  };

  // Confirmar Abono o Liquidación 100% desde Cobranzas (Punto Central Unificado)
  const handleConfirmarPagoItem = (item: ItemDeudaConsolidado, datos: DatosPagoRegistro) => {
    const deltaAbono = Math.max(0, datos.abono - (item.abono || 0));

    if (onRegistrarPagoConsolidado) {
      onRegistrarPagoConsolidado(item, datos);
    } else {
      // Fallback seguro: registrar en la entidad primaria para evitar inserciones duplicadas
      if (item.rawOT && onActualizarOT) {
        const isTotalmentePagado = datos.saldo_pendiente <= 0;
        const nuevoEstado = (isTotalmentePagado && (item.rawOT.estado === 'Control de Calidad' || item.rawOT.estado === 'Pintura y Armado' || item.rawOT.estado === 'Listo para Entrega'))
          ? 'Listo para Entrega'
          : item.rawOT.estado;

        onActualizarOT({
          ...item.rawOT,
          estado_pago: datos.estado_pago,
          abono: datos.abono,
          saldo_pendiente: datos.saldo_pendiente,
          metodo_pago: datos.metodo_pago,
          comprobante_pago: datos.comprobante_pago,
          estado: nuevoEstado
        });
      } else if (item.rawCuenta) {
        onUpdatePago(item.rawCuenta.id, datos.abono);
      } else if (item.rawVenta && onUpdateVentaExpress) {
        onUpdateVentaExpress({
          ...item.rawVenta,
          abono: datos.abono,
          saldo_pendiente: datos.saldo_pendiente,
          estado_pago: datos.estado_pago as any,
          metodo_pago: datos.metodo_pago
        });
      }
    }

    setItemParaAbono(null);
    setNotifCartera(`✅ Pago de $${deltaAbono > 0 ? deltaAbono.toLocaleString('es-CO') : datos.abono.toLocaleString('es-CO')} COP registrado para ${item.codigo}.`);
    setTimeout(() => setNotifCartera(null), 5000);
  };

  const handleAbrirAbonoCuenta = (cuenta: CuentaCobro) => {
    const matchingOT = ordenes.find(o => otMatchesCuenta(o, cuenta));
    const matchingVenta = ventasExpress.find(v => ventaMatchesCuenta(v, cuenta));
    setItemParaAbono({
      id: `cc-${cuenta.id}`,
      tipo: 'cuenta',
      codigo: matchingOT ? `${cuenta.numero_cc} • ${matchingOT.numero_ot}` : cuenta.numero_cc,
      descripcion: cuenta.items_resumen || (matchingOT ? matchingOT.item_nombre : 'Cuenta de Cobro'),
      total: cuenta.total,
      abono: cuenta.abono,
      saldo: cuenta.saldo_pendiente,
      estado_taller: matchingOT?.estado,
      cliente_nombre: cuenta.cliente?.nombre || 'Cliente',
      cliente_telefono: cuenta.cliente?.telefono,
      rawCuenta: cuenta,
      rawOT: matchingOT,
      rawVenta: matchingVenta
    });
  };

  const handleAbrirAbonoOT = (ot: OrdenTrabajo) => {
    const saldoOT = ot.saldo_pendiente ?? Math.max(0, (ot.precio_cobrado || 0) - (ot.abono || 0));
    const totalOT = ot.precio_cobrado || ((ot.abono || 0) + saldoOT);
    const matchingCC = cuentas.find(c => otMatchesCuenta(ot, c));
    const matchingVenta = ventasExpress.find(v => otMatchesVenta(ot, v));

    setItemParaAbono({
      id: `ot-${ot.id}`,
      tipo: 'ot',
      codigo: ot.numero_ot,
      descripcion: ot.item_nombre,
      total: totalOT,
      abono: ot.abono || 0,
      saldo: saldoOT,
      estado_taller: ot.estado,
      cliente_nombre: ot.cliente_nombre,
      cliente_telefono: ot.cliente_telefono,
      rawOT: ot,
      rawCuenta: matchingCC,
      rawVenta: matchingVenta
    });
  };

  const handleAbrirAbonoVenta = (venta: VentaExpress) => {
    const matchingOT = ordenes.find(o => otMatchesVenta(o, venta));
    const matchingCC = cuentas.find(c => ventaMatchesCuenta(venta, c));
    setItemParaAbono({
      id: `pos-${venta.id}`,
      tipo: 'pos',
      codigo: matchingOT ? `${venta.numero_venta} • ${matchingOT.numero_ot}` : venta.numero_venta,
      descripcion: venta.nombre_producto,
      total: venta.total,
      abono: venta.abono,
      saldo: venta.saldo_pendiente,
      cliente_nombre: venta.cliente_nombre,
      cliente_telefono: venta.cliente_telefono,
      rawVenta: venta,
      rawOT: matchingOT,
      rawCuenta: matchingCC
    });
  };

  // Base de Deudores Consolidada y DEDUPLICADA (Cuentas Formales + Ventas Express + Órdenes de Trabajo)
  const deudoresConsolidados = useMemo((): DeudorConsolidado[] => {
    const map: Record<string, DeudorConsolidado> = {};

    const getOrCreateDeudor = (nombre: string, telefono?: string): DeudorConsolidado => {
      const key = (nombre || 'Cliente').trim().toLowerCase();
      if (!map[key]) {
        map[key] = {
          cliente_nombre: nombre || 'Cliente',
          cliente_telefono: telefono || '',
          total_deuda: 0,
          total_abonos: 0,
          saldo_pendiente: 0,
          items: []
        };
      }
      if (telefono && !map[key].cliente_telefono) {
        map[key].cliente_telefono = telefono;
      }
      return map[key];
    };

    // Rastrear qué IDs ya han sido agrupados en un ítem consolidado para evitar cualquier duplicación
    const matchedCuentaIds = new Set<string>();
    const matchedOTIds = new Set<string>();
    const matchedVentaIds = new Set<string>();

    // 1. Procesar Cuentas de Cobro Formales con saldo pendiente
    cuentas.forEach(c => {
      if (c.saldo_pendiente <= 0) return;
      matchedCuentaIds.add(c.id);

      const d = getOrCreateDeudor(c.cliente?.nombre || 'Cliente', c.cliente?.telefono);
      // Encontrar TODAS las OTs coincidentes para agruparlas y que una segunda OT no sume deuda
      const matchingOTs = ordenes.filter(o => !matchedOTIds.has(o.id) && otMatchesCuenta(o, c));
      matchingOTs.forEach(o => matchedOTIds.add(o.id));
      const primaryOT = matchingOTs[0];

      const matchingVentas = ventasExpress.filter(v => !matchedVentaIds.has(v.id) && ventaMatchesCuenta(v, c));
      matchingVentas.forEach(v => matchedVentaIds.add(v.id));
      const primaryVenta = matchingVentas[0];

      const otCodigos = matchingOTs.map(o => o.numero_ot).join(' / ');
      const codigoConsolidado = otCodigos ? `${c.numero_cc} • ${otCodigos}` : c.numero_cc;

      d.items.push({
        id: `cc-${c.id}`,
        tipo: 'cuenta',
        codigo: codigoConsolidado,
        descripcion: c.items_resumen || (primaryOT ? primaryOT.item_nombre : 'Figura / Pedido 3D'),
        total: c.total,
        abono: c.abono,
        saldo: c.saldo_pendiente,
        estado_taller: primaryOT?.estado,
        rawCuenta: c,
        rawOT: primaryOT,
        rawVenta: primaryVenta,
        cliente_nombre: d.cliente_nombre,
        cliente_telefono: d.cliente_telefono
      });
    });

    // 2. Procesar Ventas Express con saldo pendiente (que no estén ya incluidas en una Cuenta)
    ventasExpress.forEach(v => {
      if (v.saldo_pendiente <= 0) return;
      if (matchedVentaIds.has(v.id)) return; // Ya representada en Cuenta de Cobro

      matchedVentaIds.add(v.id);
      const d = getOrCreateDeudor(v.cliente_nombre, v.cliente_telefono);
      const alerta = calcularAlertaCobro(v.fecha_prometida_pago, v.saldo_pendiente);

      // Encontrar TODAS las OTs coincidentes para agruparlas (si se generó una segunda OT, no suma doble)
      const matchingOTs = ordenes.filter(o => !matchedOTIds.has(o.id) && otMatchesVenta(o, v));
      matchingOTs.forEach(o => matchedOTIds.add(o.id));
      const primaryOT = matchingOTs[0];

      const otCodigos = matchingOTs.map(o => o.numero_ot).join(' / ');
      const codigoConsolidado = otCodigos ? `${v.numero_venta} • ${otCodigos}` : v.numero_venta;

      d.items.push({
        id: `pos-${v.id}`,
        tipo: 'pos',
        codigo: codigoConsolidado,
        descripcion: v.nombre_producto,
        total: v.total,
        abono: v.abono,
        saldo: v.saldo_pendiente,
        fecha_limite: v.fecha_prometida_pago,
        alerta_texto: alerta.texto,
        alerta_color: alerta.color,
        alerta_bg: alerta.badgeBg,
        estado_taller: primaryOT?.estado,
        rawVenta: v,
        rawOT: primaryOT,
        cliente_nombre: d.cliente_nombre,
        cliente_telefono: d.cliente_telefono
      });

      if (!d.peor_alerta_texto || alerta.nivel === 'vencido' || alerta.nivel === 'hoy') {
        d.peor_alerta_texto = alerta.texto;
        d.peor_alerta_color = alerta.color;
        d.peor_alerta_bg = alerta.badgeBg;
      }
    });

    // 3. Procesar Órdenes de Trabajo pendientes (SOLO si no fueron ya representadas en Cuenta o Venta)
    ordenes.forEach(o => {
      if (o.estado_pago === 'Pagado Total') return;
      if (matchedOTIds.has(o.id)) return; // Ya representada en Cuenta o Venta POS

      const saldoOT = o.saldo_pendiente !== undefined 
        ? o.saldo_pendiente 
        : Math.max(0, (o.precio_cobrado || 0) - (o.abono || 0));

      if (saldoOT <= 0) return;

      matchedOTIds.add(o.id);
      const d = getOrCreateDeudor(o.cliente_nombre, o.cliente_telefono);
      const totalOT = o.precio_cobrado || ((o.abono || 0) + saldoOT);

      d.items.push({
        id: `ot-${o.id}`,
        tipo: 'ot',
        codigo: o.numero_ot,
        descripcion: o.item_nombre,
        total: totalOT,
        abono: o.abono || 0,
        saldo: saldoOT,
        estado_taller: o.estado,
        rawOT: o,
        cliente_nombre: d.cliente_nombre,
        cliente_telefono: d.cliente_telefono
      });
    });

    // 4. Calcular totales acumulados reales y exactos por deudor a partir de la lista consolidada de ítems
    Object.values(map).forEach(d => {
      d.total_deuda = d.items.reduce((sum, it) => sum + it.total, 0);
      d.total_abonos = d.items.reduce((sum, it) => sum + it.abono, 0);
      d.saldo_pendiente = d.items.reduce((sum, it) => sum + it.saldo, 0);
    });

    return Object.values(map)
      .filter(d => d.saldo_pendiente > 0)
      .filter(d => {
        if (!searchDeudor.trim()) return true;
        const q = searchDeudor.toLowerCase();
        return (
          d.cliente_nombre.toLowerCase().includes(q) ||
          d.cliente_telefono.includes(q) ||
          d.items.some(it => 
            it.codigo.toLowerCase().includes(q) || 
            it.descripcion.toLowerCase().includes(q)
          )
        );
      })
      .sort((a, b) => b.saldo_pendiente - a.saldo_pendiente);
  }, [cuentas, ventasExpress, ordenes, searchDeudor]);

  // Lista de Órdenes de Trabajo con saldo pendiente
  const ordenesPendientes = useMemo(() => {
    return ordenes.filter(o => {
      if (o.estado_pago === 'Pagado Total') return false;
      const saldo = o.saldo_pendiente !== undefined 
        ? o.saldo_pendiente 
        : Math.max(0, (o.precio_cobrado || 0) - (o.abono || 0));
      return saldo > 0;
    }).sort((a, b) => {
      const saldoA = a.saldo_pendiente ?? Math.max(0, (a.precio_cobrado || 0) - (a.abono || 0));
      const saldoB = b.saldo_pendiente ?? Math.max(0, (b.precio_cobrado || 0) - (b.abono || 0));
      return saldoB - saldoA;
    });
  }, [ordenes]);

  // Métricas Totales
  const totalCarteraGlobal = deudoresConsolidados.reduce((sum, d) => sum + d.saldo_pendiente, 0);
  const totalDeudoresCount = deudoresConsolidados.length;
  const ventasExpressPendientes = ventasExpress.filter(v => v.saldo_pendiente > 0);
  const cuentasFormalesPendientes = cuentas.filter(c => c.saldo_pendiente > 0);

  // Enviar estado de cuenta consolidado por WhatsApp a un deudor
  const handleEnviarEstadoCuenta = (deudor: DeudorConsolidado) => {
    const phone = formatWhatsAppPhone(deudor.cliente_telefono);
    const conceptos: string[] = [];

    deudor.items.forEach(it => {
      conceptos.push(`• ${it.codigo}: ${it.descripcion} — Saldo: $${it.saldo.toLocaleString('es-CO')} COP ${it.estado_taller ? `[${it.estado_taller}]` : ''}`);
    });

    const mensaje = 
`👋 Hola *${deudor.cliente_nombre}*, un saludo desde *WJGEEKS 3D* 🚀

Te compartimos el resumen oficial de tu saldo pendiente con nuestro taller:

📋 *Detalle de Pedidos / Figuras:*
${conceptos.join('\n')}

━━━━━━━━━━━━━━━━━━━━
💵 *TOTAL PENDIENTE:* *$${deudor.saldo_pendiente.toLocaleString('es-CO')} COP*
━━━━━━━━━━━━━━━━━━━━

📲 *Medios Oficiales de Pago:*
• *Bre-B (Llave única):* ${config.bre_b || '0090778625'}
• *Nequi Taller:* ${config.nequi || '3217273025'} (${config.titular_cuenta || 'Juan / Germán'})

Agradecemos nos compartas el soporte una vez realizado el abono para actualizar tu saldo de inmediato. ¡Muchas gracias por tu apoyo a nuestro arte! ✨🎨`;

    openWhatsApp(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '70px' }}>
      {/* Encabezado */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="section-title">
            <Users size={22} color="var(--brand-cyan)" />
            Central de Cartera & Base de Deudores
          </h2>
          <p className="section-subtitle">
            Monitoreo en vivo de quién nos debe dinero, historial de abonos y recordatorios de cobro por WhatsApp.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Botón para Registrar Deuda Manual */}
          <button
            id="btn-abrir-deuda-manual"
            type="button"
            className="btn btn-primary"
            onClick={() => setShowModalNuevaDeuda(true)}
            style={{
              fontWeight: 800,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)',
              padding: '8px 16px'
            }}
          >
            <Plus size={18} />
            <span>Registrar Deuda Manual</span>
          </button>

          {/* Métricas destacadas */}
          <div className="metrics-header-grid" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
      </div>

      {/* Notificación flotante de cartera */}
      {notifCartera && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 700,
          fontSize: '0.9rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <CheckCircle size={18} />
          <span>{notifCartera}</span>
        </div>
      )}

      {/* Selector de Pestañas Internas en Cuadrícula Ordenada */}
      <div className="subtabs-grid-mobile" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
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
          className={`btn ${subTab === 'ordenes' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSubTab('ordenes')}
          style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Wrench size={16} />
          <span>🛠️ Órdenes de Trabajo ({ordenesPendientes.length} pendientes)</span>
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
            <div className="cards-grid-mobile">
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

                  {/* Lista de Conceptos Pendientes Consolidados (Sin Duplicados) */}
                  <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>PEDIDOS / FIGURAS PENDIENTES ({deudor.items.length}):</span>
                      <span>TOTAL: ${deudor.saldo_pendiente.toLocaleString('es-CO')} COP</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {deudor.items.map(item => (
                        <div 
                          key={item.id} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '6px 0', 
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            gap: '10px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '180px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.85rem' }}>
                                {item.tipo === 'pos' ? '⚡' : item.tipo === 'cuenta' ? '📄' : '🛠️'}
                              </span>
                              <span style={{ color: '#fff', fontWeight: 700 }}>
                                {item.codigo}: {item.descripcion}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', flexWrap: 'wrap' }}>
                              {item.estado_taller && (
                                <span style={{ color: 'var(--brand-cyan)' }}>
                                  Taller: <strong>{item.estado_taller}</strong>
                                </span>
                              )}
                              <span>Total: ${item.total.toLocaleString('es-CO')}</span>
                              <span style={{ color: '#34d399' }}>Abonado: ${item.abono.toLocaleString('es-CO')}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.92rem' }}>
                              ${item.saldo.toLocaleString('es-CO')}
                            </span>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setItemParaAbono(item)}
                              style={{ 
                                padding: '3px 10px', 
                                fontSize: '0.72rem', 
                                background: 'rgba(56, 189, 248, 0.15)', 
                                border: '1px solid rgba(56, 189, 248, 0.4)', 
                                color: 'var(--brand-cyan)',
                                fontWeight: 800
                              }}
                              title={`Registrar pago o abono para ${item.codigo}`}
                            >
                              + Abono
                            </button>
                            {item.abono > 0 && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleAbrirModalEliminarCobro(item)}
                                style={{ 
                                  padding: '3px 8px', 
                                  fontSize: '0.70rem', 
                                  background: 'rgba(239, 68, 68, 0.12)', 
                                  border: '1px solid rgba(239, 68, 68, 0.35)', 
                                  color: '#f87171',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Eliminar cobro o abono duplicado"
                              >
                                <Trash2 size={11} />
                                <span>Eliminar duplicado</span>
                              </button>
                            )}
                            {item.rawVenta && onEliminarVentaExpress && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setVentaParaEliminar(item.rawVenta!)}
                                style={{ padding: '3px 6px', fontSize: '0.68rem', color: '#f87171' }}
                                title="Eliminar venta POS"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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

      {/* PESTAÑA: ÓRDENES DE TRABAJO (OT) PENDIENTES DE PAGO */}
      {subTab === 'ordenes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Métricas y resumen de OTs pendientes */}
          <div className="glass-card" style={{ margin: 0, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={18} color="var(--brand-cyan)" />
                <span>Órdenes de Trabajo con Saldo Pendiente</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Órdenes de fabricación generadas desde cotizaciones aprobadas, pedidos de taller o ventas express pendientes de pago.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.12)', 
                border: '1px solid rgba(239, 68, 68, 0.35)', 
                color: '#f87171', 
                padding: '6px 14px', 
                borderRadius: '8px', 
                fontSize: '0.88rem', 
                fontWeight: 800 
              }}>
                Total en OTs: ${ordenesPendientes.reduce((sum, o) => sum + (o.saldo_pendiente ?? Math.max(0, (o.precio_cobrado || 0) - (o.abono || 0))), 0).toLocaleString('es-CO')} COP
              </div>
            </div>
          </div>

          {ordenesPendientes.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <CheckCircle size={36} color="#34d399" style={{ marginBottom: '10px', opacity: 0.8 }} />
              <h4 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 6px 0' }}>
                ¡Excelente! No hay órdenes de trabajo pendientes de pago
              </h4>
              <p style={{ fontSize: '0.82rem' }}>
                Todas las órdenes de trabajo tienen su pago cancelado al 100%.
              </p>
            </div>
          ) : (
            ordenesPendientes.map(ot => {
              const saldoOT = ot.saldo_pendiente ?? Math.max(0, (ot.precio_cobrado || 0) - (ot.abono || 0));
              const totalOT = ot.precio_cobrado || ((ot.abono || 0) + saldoOT);

              return (
                <div key={ot.id} className="glass-card" style={{ margin: 0, padding: '18px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem', color: 'var(--brand-cyan)' }}>
                          {ot.numero_ot}
                        </span>
                        <span className={`status-pill status-${(ot.estado || 'encola').toLowerCase().replace(/\s+/g, '')}`}>
                          {ot.estado}
                        </span>
                        <span style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 800, 
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          background: ot.estado_pago === 'Abono Parcial' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(239, 68, 68, 0.18)', 
                          color: ot.estado_pago === 'Abono Parcial' ? '#fbbf24' : '#f87171',
                          border: `1px solid ${ot.estado_pago === 'Abono Parcial' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
                        }}>
                          {ot.estado_pago || 'Pendiente'}
                        </span>
                        {ot.cotizacion_numero && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            • Cot: {ot.cotizacion_numero}
                          </span>
                        )}
                        {ot.pos_venta_id && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.12)', color: 'var(--brand-cyan)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                            ⚡ POS
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
                        🧩 {ot.item_nombre} {ot.cantidad > 1 ? `(x${ot.cantidad})` : ''}
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>👤 {ot.cliente_nombre}</span>
                        {ot.cliente_telefono && (
                          <>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} />
                              {ot.cliente_telefono}
                            </span>
                          </>
                        )}
                        {ot.operador_asignado && (
                          <>
                            <span>•</span>
                            <span>Op: {ot.operador_asignado}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: '#f87171' }}>
                        Pendiente: ${saldoOT.toLocaleString('es-CO')}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Total: ${totalOT.toLocaleString('es-CO')} | Abono: ${(ot.abono || 0).toLocaleString('es-CO')}
                      </div>
                    </div>
                  </div>

                  {/* Acciones Rápidas */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <button 
                      type="button"
                      className="btn btn-whatsapp btn-sm"
                      onClick={() => openWhatsApp(generarWhatsAppCobroOT(ot, config))}
                      style={{ fontWeight: 700 }}
                    >
                      <Send size={14} />
                      <span>Cobrar por WhatsApp</span>
                    </button>

                    {onActualizarOT && (
                      <button 
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ marginLeft: 'auto', fontWeight: 800 }}
                        onClick={() => handleAbrirAbonoOT(ot)}
                      >
                        <DollarSign size={14} />
                        <span>Registrar Abono</span>
                      </button>
                    )}

                    {(ot.abono && ot.abono > 0) && (
                      <button 
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ 
                          color: '#f87171', 
                          border: '1px solid rgba(239, 68, 68, 0.35)', 
                          fontWeight: 700, 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '5px' 
                        }}
                        onClick={() => handleAbrirModalEliminarCobroOT(ot)}
                        title="Eliminar cobro o abono duplicado"
                      >
                        <Trash2 size={13} />
                        <span>Eliminar duplicado</span>
                      </button>
                    )}

                    {onNavigateTab && (
                      <button 
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onNavigateTab('workflow')}
                        title="Ver esta orden en el taller de producción"
                      >
                        <Wrench size={14} />
                        <span>Ver en Taller</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: 'var(--brand-cyan)' }}>{v.numero_venta}</span>
                        {v.ot_numero && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--brand-cyan)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                            🛠️ {v.ot_numero}
                          </span>
                        )}
                        {v.estado_diseno && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: v.estado_diseno === 'requiere_nuevo' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: v.estado_diseno === 'requiere_nuevo' ? '#fbbf24' : '#34d399' }}>
                            {v.estado_diseno === 'requiere_nuevo' ? '🎨 Req. Diseño' : '🟢 Diseño Listo'}
                          </span>
                        )}
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
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setVentaParaEditar(v)}
                        title="Editar venta POS"
                        style={{ padding: '4px 8px' }}
                      >
                        <Edit3 size={14} color="var(--brand-cyan)" />
                      </button>

                      {!esPagado && onUpdateVentaExpress && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAbrirAbonoVenta(v)}
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

                      {onEliminarVentaExpress && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setVentaParaEliminar(v)}
                          title="Eliminar venta POS"
                          style={{ padding: '4px 8px', color: '#f87171' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
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
                      onClick={() => handleAbrirAbonoCuenta(cuenta)}
                    >
                      <DollarSign size={14} />
                      <span>Registrar Abono</span>
                    </button>
                  )}

                  {cuenta.abono > 0 && (
                    <button 
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ 
                        color: '#f87171', 
                        border: '1px solid rgba(239, 68, 68, 0.35)', 
                        fontWeight: 700, 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '5px',
                        marginLeft: cuenta.saldo_pendiente <= 0 ? 'auto' : undefined
                      }}
                      onClick={() => handleAbrirModalEliminarCobroCuenta(cuenta)}
                      title="Eliminar cobro o abono duplicado"
                    >
                      <Trash2 size={13} />
                      <span>Eliminar duplicado</span>
                    </button>
                  )}

                  {onEliminarCuentaCobro && (
                    <button 
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCuentaParaEliminar(cuenta)}
                      style={{ color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                      title="Eliminar esta cuenta de cobro"
                    >
                      <Trash2 size={14} />
                      <span>Eliminar</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL REGISTRAR DEUDA MANUAL */}
      {showModalNuevaDeuda && (
        <ModalRegistrarDeudaManual
          isOpen={showModalNuevaDeuda}
          clientes={clientes}
          consecutivoSugerido={cuentas.length + 1}
          onClose={() => setShowModalNuevaDeuda(false)}
          onGuardarDeuda={handleGuardarDeudaManual}
        />
      )}

      {/* MODAL UNIFICADO DE REGISTRO DE PAGO / ABONO (Bre-B & Nequi) */}
      {itemParaAbono && (
        <ModalRegistrarPago
          isOpen={!!itemParaAbono}
          onClose={() => setItemParaAbono(null)}
          titulo={`Registrar Abono • ${itemParaAbono.codigo}`}
          subtitulo={`${itemParaAbono.cliente_nombre} — ${itemParaAbono.descripcion}`}
          referenciaDoc={itemParaAbono.codigo}
          clienteNombre={itemParaAbono.cliente_nombre}
          clienteTelefono={itemParaAbono.cliente_telefono}
          montoTotal={itemParaAbono.total}
          pagoActual={{
            abono: itemParaAbono.abono,
            saldo_pendiente: itemParaAbono.saldo,
            metodo_pago: itemParaAbono.rawOT?.metodo_pago || itemParaAbono.rawCuenta?.metodo_pago || itemParaAbono.rawVenta?.metodo_pago || 'Bre-B',
            comprobante_pago: itemParaAbono.rawOT?.comprobante_pago || itemParaAbono.rawCuenta?.comprobante_url
          }}
          esAprobacionCotizacion={false}
          onConfirmarPago={(datos) => handleConfirmarPagoItem(itemParaAbono, datos)}
        />
      )}

      {/* MODAL EDITAR VENTA EXPRESS */}
      {ventaParaEditar && (
        <ModalEditarVentaExpress
          isOpen={!!ventaParaEditar}
          venta={ventaParaEditar}
          clientes={clientes}
          onClose={() => setVentaParaEditar(null)}
          onGuardarCambios={(v) => {
            if (onUpdateVentaExpress) onUpdateVentaExpress(v);
            setVentaParaEditar(null);
            setNotifCartera(`✅ Venta ${v.numero_venta} (${v.nombre_producto}) actualizada.`);
            setTimeout(() => setNotifCartera(null), 5000);
          }}
          onEliminarVenta={(id) => {
            if (onEliminarVentaExpress) {
              onEliminarVentaExpress(id);
              setVentaParaEditar(null);
              setNotifCartera(`🗑️ Venta eliminada correctamente.`);
              setTimeout(() => setNotifCartera(null), 5000);
            }
          }}
        />
      )}

      {/* DIÁLOGO CONFIRMAR ELIMINACIÓN DE VENTA EXPRESS */}
      {ventaParaEliminar && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
          onClick={() => setVentaParaEliminar(null)}
        >
          <div 
            className="glass-card" 
            style={{ 
              maxWidth: '420px', 
              width: '100%', 
              margin: 0, 
              padding: '24px', 
              textAlign: 'center', 
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 12px 35px rgba(239, 68, 68, 0.25)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '50%',
              width: '54px',
              height: '54px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto'
            }}>
              <Trash2 size={26} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#fff', fontWeight: 800 }}>
              ¿Eliminar Venta {ventaParaEliminar.numero_venta}?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Se removerá la figura <strong style={{ color: '#fff' }}>{ventaParaEliminar.nombre_producto}</strong> de <strong style={{ color: '#fff' }}>{ventaParaEliminar.cliente_nombre}</strong> (${ventaParaEliminar.total.toLocaleString('es-CO')} COP).<br/>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setVentaParaEliminar(null)}
                style={{ padding: '8px 18px' }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                style={{ fontWeight: 800, padding: '8px 20px' }}
                onClick={() => {
                  if (onEliminarVentaExpress) {
                    onEliminarVentaExpress(ventaParaEliminar.id);
                    setNotifCartera(`🗑️ Venta ${ventaParaEliminar.numero_venta} eliminada de cartera.`);
                    setTimeout(() => setNotifCartera(null), 5000);
                  }
                  setVentaParaEliminar(null);
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGO CONFIRMAR ELIMINACIÓN DE CUENTA DE COBRO */}
      {cuentaParaEliminar && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
          onClick={() => setCuentaParaEliminar(null)}
        >
          <div 
            className="glass-card" 
            style={{ 
              maxWidth: '420px', 
              width: '100%', 
              margin: 0, 
              padding: '24px', 
              textAlign: 'center', 
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 12px 35px rgba(239, 68, 68, 0.25)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '50%',
              width: '54px',
              height: '54px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto'
            }}>
              <Trash2 size={26} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#fff', fontWeight: 800 }}>
              ¿Eliminar Cuenta {cuentaParaEliminar.numero_cc}?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Se removerá la cuenta de cobro de <strong style={{ color: '#fff' }}>{cuentaParaEliminar.cliente.nombre}</strong> (${cuentaParaEliminar.total.toLocaleString('es-CO')} COP).<br/>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setCuentaParaEliminar(null)}
                style={{ padding: '8px 18px' }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                style={{ fontWeight: 800, padding: '8px 20px' }}
                onClick={() => {
                  if (onEliminarCuentaCobro) {
                    onEliminarCuentaCobro(cuentaParaEliminar.id);
                    setNotifCartera(`🗑️ Cuenta ${cuentaParaEliminar.numero_cc} eliminada.`);
                    setTimeout(() => setNotifCartera(null), 5000);
                  }
                  setCuentaParaEliminar(null);
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR COBRO DUPLICADO */}
      <ModalConfirmarEliminarCobro
        isOpen={Boolean(cobroParaEliminar)}
        cobro={cobroParaEliminar}
        onClose={() => setCobroParaEliminar(null)}
        onConfirmar={handleConfirmarEliminarCobro}
      />
    </div>
  );
};
