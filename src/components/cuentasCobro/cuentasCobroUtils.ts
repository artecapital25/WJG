import { OrdenTrabajo, CuentaCobro, VentaExpress } from '../../types';

export interface ItemDeudaConsolidado {
  id: string; // ej: "cc-123" o "ot-456" o "pos-789"
  tipo: 'cuenta' | 'ot' | 'pos';
  codigo: string; // ej: "CC-001 • OT-0004" o "POS-001"
  descripcion: string;
  total: number;
  abono: number;
  saldo: number;
  estado_taller?: string;
  fecha_limite?: string;
  alerta_texto?: string;
  alerta_color?: string;
  alerta_bg?: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  rawCuenta?: CuentaCobro;
  rawOT?: OrdenTrabajo;
  rawVenta?: VentaExpress;
}

export interface DeudorConsolidado {
  cliente_nombre: string;
  cliente_telefono: string;
  total_deuda: number;
  total_abonos: number;
  saldo_pendiente: number;
  items: ItemDeudaConsolidado[];
  peor_alerta_texto?: string;
  peor_alerta_color?: string;
  peor_alerta_bg?: string;
}

// Helper para vincular de forma estricta una OT a una Cuenta de Cobro y no duplicarla
export const otMatchesCuenta = (o: OrdenTrabajo, c: CuentaCobro): boolean => {
  if (o.cotizacion_id && c.cotizacion_id && o.cotizacion_id === c.cotizacion_id) return true;
  if (o.cotizacion_numero && c.cotizacion_numero && o.cotizacion_numero === c.cotizacion_numero) return true;
  if (c.id === o.id || c.numero_cc === o.numero_ot) return true;
  if (c.items_resumen && o.numero_ot && c.items_resumen.includes(o.numero_ot)) return true;
  if (
    o.cliente_nombre && c.cliente?.nombre &&
    o.cliente_nombre.trim().toLowerCase() === c.cliente.nombre.trim().toLowerCase() &&
    o.item_nombre && c.items_resumen &&
    c.items_resumen.toLowerCase().includes(o.item_nombre.trim().toLowerCase())
  ) {
    return true;
  }
  return false;
};

// Helper para vincular una OT a una Venta Express (POS)
export const otMatchesVenta = (o: OrdenTrabajo, v: VentaExpress): boolean => {
  if (o.pos_venta_id && (o.pos_venta_id === v.id || o.pos_venta_id === v.numero_venta)) return true;
  if (v.ot_id && (v.ot_id === o.id || v.ot_id === o.numero_ot)) return true;
  if (v.ot_numero && (v.ot_numero === o.numero_ot || v.ot_numero === o.id)) return true;
  if (o.cotizacion_numero && (o.cotizacion_numero === v.numero_venta || o.cotizacion_id === v.id)) return true;
  if (v.notas && o.numero_ot && v.notas.includes(o.numero_ot)) return true;
  if (
    o.cliente_nombre && v.cliente_nombre &&
    o.cliente_nombre.trim().toLowerCase() === v.cliente_nombre.trim().toLowerCase() &&
    o.item_nombre && v.nombre_producto &&
    o.item_nombre.trim().toLowerCase() === v.nombre_producto.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
};

// Helper para vincular una Venta Express (POS) a una Cuenta de Cobro
export const ventaMatchesCuenta = (v: VentaExpress, c: CuentaCobro): boolean => {
  if (c.cotizacion_id && (c.cotizacion_id === v.id || c.cotizacion_id === v.numero_venta)) return true;
  if (c.cotizacion_numero && c.cotizacion_numero === v.numero_venta) return true;
  if (c.items_resumen && v.numero_venta && c.items_resumen.includes(v.numero_venta)) return true;
  return false;
};
