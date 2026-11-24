import type { EgresoTaller, PaymentRecord, VentaExpress } from '../types';

export interface MetodoCajaResumen {
  metodo: 'BRE_B' | 'NEQUI' | 'EFECTIVO' | 'OTROS';
  etiqueta: string;
  ingresos: number;
  egresos: number;
  neto: number;
}

export interface DuplicadoAbonoGrupo {
  key: string;
  referencia: string;
  monto: number;
  count: number;
  ids: string[];
}

/**
 * Calcula los gramos netos a ajustar en bodega al guardar un consumo real de taller.
 * Si la OT ya había descontado el peso estimado al pasar por Curado, calcula solo el delta
 * (positivo = descontar faltante; negativo = devolver sobrante; 0 = sin cambios).
 */
export function calcularGramosADescontarConsumoReal(params: {
  materialRealG: number;
  materialEstimadoG?: number;
  yaDescontadoEnOT?: boolean;
}): number {
  const real = Number(params.materialRealG) || 0;
  if (real <= 0) return 0;

  if (!params.yaDescontadoEnOT) {
    return Math.round(real * 10) / 10;
  }

  const estimado = Math.max(0, Number(params.materialEstimadoG) || 0);
  const delta = Math.round((real - estimado) * 10) / 10;
  return delta;
}

/**
 * Normaliza cualquier texto de medio de pago a las cajas oficiales de WJGEEKS 3D PRO.
 */
export function normalizarMetodoPagoCaja(metodo?: string): 'BRE_B' | 'NEQUI' | 'EFECTIVO' | 'OTROS' {
  const clean = (metodo || '').toLowerCase().trim();
  if (clean.includes('bre')) return 'BRE_B';
  if (clean.includes('nequi')) return 'NEQUI';
  if (clean.includes('efectivo') || clean.includes('cash') || clean === '') return 'EFECTIVO';
  return 'OTROS';
}

/**
 * Detecta posibles registros duplicados en `abonos_pagos` comparando documento vinculado/referencia y monto.
 */
export function detectarDuplicadosAbonos(abonos: PaymentRecord[]): {
  duplicateIds: Set<string>;
  groups: DuplicadoAbonoGrupo[];
} {
  const buckets = new Map<string, { referencia: string; monto: number; ids: string[] }>();

  for (const ab of abonos) {
    const monto = Math.round(Number(ab.monto) || 0);
    if (monto <= 0) continue;

    const docAnchor =
      ab.pos_venta_id ||
      ab.orden_trabajo_id ||
      ab.cotizacion_id ||
      ab.cuenta_cobro_id ||
      (ab.referencia_pago ? ab.referencia_pago.trim().toUpperCase() : '') ||
      `${(ab.cliente_nombre || 'mostrador').trim().toUpperCase()}_${(ab.fecha_pago || ab.created_at || '').slice(0, 10)}`;

    const key = `${docAnchor}__${monto}`;
    const refLabel = ab.referencia_pago || ab.cliente_nombre || docAnchor;
    const existing = buckets.get(key);
    if (existing) {
      existing.ids.push(ab.id);
    } else {
      buckets.set(key, { referencia: refLabel, monto, ids: [ab.id] });
    }
  }

  const duplicateIds = new Set<string>();
  const groups: DuplicadoAbonoGrupo[] = [];

  for (const [key, g] of buckets.entries()) {
    if (g.ids.length >= 2) {
      g.ids.forEach(id => duplicateIds.add(id));
      groups.push({
        key,
        referencia: g.referencia,
        monto: g.monto,
        count: g.ids.length,
        ids: g.ids,
      });
    }
  }

  return { duplicateIds, groups };
}

/**
 * Consolida flujo de caja neto y saldo discriminado por cada caja física/digital.
 */
export function calcularFlujoCajaResumen(params: {
  recaudadoBreB: number;
  recaudadoNequi: number;
  recaudadoEfectivo: number;
  recaudadoTotal: number;
  egresos: EgresoTaller[];
}): {
  totalIngresos: number;
  totalEgresos: number;
  flujoCajaNeto: number;
  porMetodo: MetodoCajaResumen[];
} {
  const ingBreB = Math.max(0, Number(params.recaudadoBreB) || 0);
  const ingNequi = Math.max(0, Number(params.recaudadoNequi) || 0);
  const ingEfectivo = Math.max(0, Number(params.recaudadoEfectivo) || 0);
  const totalIngresos = Math.max(
    0,
    Number(params.recaudadoTotal) || ingBreB + ingNequi + ingEfectivo
  );
  const ingOtros = Math.max(0, totalIngresos - (ingBreB + ingNequi + ingEfectivo));

  const egrBuckets: Record<'BRE_B' | 'NEQUI' | 'EFECTIVO' | 'OTROS', number> = {
    BRE_B: 0,
    NEQUI: 0,
    EFECTIVO: 0,
    OTROS: 0,
  };

  for (const eg of params.egresos) {
    const monto = Math.max(0, Number(eg.monto) || 0);
    const clave = normalizarMetodoPagoCaja(eg.metodo_pago);
    egrBuckets[clave] += monto;
  }

  const totalEgresos =
    egrBuckets.BRE_B + egrBuckets.NEQUI + egrBuckets.EFECTIVO + egrBuckets.OTROS;

  const porMetodo: MetodoCajaResumen[] = [
    {
      metodo: 'BRE_B',
      etiqueta: 'Bre-B / Llave Única',
      ingresos: Math.round(ingBreB),
      egresos: Math.round(egrBuckets.BRE_B),
      neto: Math.round(ingBreB - egrBuckets.BRE_B),
    },
    {
      metodo: 'NEQUI',
      etiqueta: 'Nequi',
      ingresos: Math.round(ingNequi),
      egresos: Math.round(egrBuckets.NEQUI),
      neto: Math.round(ingNequi - egrBuckets.NEQUI),
    },
    {
      metodo: 'EFECTIVO',
      etiqueta: 'Efectivo Caja Física',
      ingresos: Math.round(ingEfectivo),
      egresos: Math.round(egrBuckets.EFECTIVO),
      neto: Math.round(ingEfectivo - egrBuckets.EFECTIVO),
    },
    {
      metodo: 'OTROS',
      etiqueta: 'Otros / Bancos',
      ingresos: Math.round(ingOtros),
      egresos: Math.round(egrBuckets.OTROS),
      neto: Math.round(ingOtros - egrBuckets.OTROS),
    },
  ];

  return {
    totalIngresos: Math.round(totalIngresos),
    totalEgresos: Math.round(totalEgresos),
    flujoCajaNeto: Math.round(totalIngresos - totalEgresos),
    porMetodo,
  };
}

/**
 * Calcula los ajustes de stock físico (`deltaStock`: positivo suma/repone, negativo descuenta)
 * al editar una venta POS Express vinculada o desvinculada de `productos_stock`.
 */
export function calcularAjusteStockEdicionPOS(
  prevVenta: Partial<VentaExpress> | undefined,
  nuevaVenta: Partial<VentaExpress>
): Array<{ productoId: string; deltaStock: number }> {
  const prevActive = Boolean(prevVenta?.descontar_stock && prevVenta?.producto_stock_id);
  const newActive = Boolean(nuevaVenta?.descontar_stock && nuevaVenta?.producto_stock_id);
  const prevQty = Math.max(1, Number(prevVenta?.cantidad_vendida) || 1);
  const newQty = Math.max(1, Number(nuevaVenta?.cantidad_vendida) || 1);
  const prevId = prevVenta?.producto_stock_id || '';
  const newId = nuevaVenta?.producto_stock_id || '';

  if (prevActive && !newActive && prevId) {
    return [{ productoId: prevId, deltaStock: prevQty }];
  }
  if (!prevActive && newActive && newId) {
    return [{ productoId: newId, deltaStock: -newQty }];
  }
  if (prevActive && newActive && prevId && newId) {
    if (prevId === newId) {
      const delta = prevQty - newQty;
      return delta !== 0 ? [{ productoId: newId, deltaStock: delta }] : [];
    }
    return [
      { productoId: prevId, deltaStock: prevQty },
      { productoId: newId, deltaStock: -newQty },
    ];
  }
  return [];
}
