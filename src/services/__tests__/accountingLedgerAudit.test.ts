import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpsert = vi.fn();
const mockMaybeSingle = vi.fn();

const mockChain: any = {
  select: (...args: any[]) => {
    mockSelect(...args);
    return mockChain;
  },
  or: () => mockChain,
  gte: () => mockChain,
  eq: () => mockChain,
  limit: () => Promise.resolve(mockSelect.mock.results[mockSelect.mock.results.length - 1]?.value || { data: [], error: null }),
  maybeSingle: () => mockMaybeSingle(),
  insert: (...args: any[]) => {
    mockInsert(...args);
    return Promise.resolve({ error: null });
  },
  upsert: (...args: any[]) => {
    mockUpsert(...args);
    return Promise.resolve({ error: null });
  }
};

let existingPaymentsForDedup: any[] = [];

vi.mock('../supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => {
      if (table === 'abonos_pagos') {
        return {
          select: () => ({
            or: () => ({
              gte: () => ({
                eq: () => ({
                  limit: () => Promise.resolve({ data: existingPaymentsForDedup, error: null })
                })
              })
            })
          }),
          insert: (...args: any[]) => {
            mockInsert(...args);
            return Promise.resolve({ error: null });
          }
        };
      }
      return mockChain;
    }
  }
}));

import { CloudSyncService } from '../cloudSyncService';
import {
  calcularFlujoCajaResumen,
  calcularGramosADescontarConsumoReal,
  detectarDuplicadosAbonos,
} from '../inventoryDeductionHelper';
import type { EgresoTaller, PaymentRecord } from '../../types';

describe('Auditoría Contable & Anti-Duplicados (Ola 3A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existingPaymentsForDedup = [];
  });

  it('savePayment bloquea inserción duplicada si ya existe un abono idéntico dentro de 120s en BD', async () => {
    existingPaymentsForDedup = [
      { id: 'dup-existing-1', monto: 80000, created_at: new Date().toISOString() }
    ];

    const payment: PaymentRecord = {
      id: 'pay-dup-test',
      monto: 80000,
      metodo_pago: 'Bre-B',
      pos_venta_id: 'pos-010-test',
      origen_modulo: 'pos',
      referencia_pago: 'Ref distinta para probar dedup BD'
    };

    const ok = await CloudSyncService.savePayment(payment);
    expect(ok).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('savePayment inserta abono con origen_modulo y cliente_nombre cuando no hay duplicado', async () => {
    existingPaymentsForDedup = [];

    const payment: PaymentRecord = {
      id: 'pay-unique-test',
      monto: 55000,
      metodo_pago: 'Nequi',
      pos_venta_id: 'pos-099-test',
      cliente_nombre: 'Ana Torres',
      origen_modulo: 'pos',
      nota: 'Abono inicial verificado'
    };

    const ok = await CloudSyncService.savePayment(payment);
    expect(ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.metodo_pago).toBe('NEQUI');
    expect(inserted.origen_modulo).toBe('pos');
    expect(inserted.cliente_nombre).toBe('Ana Torres');
    expect(inserted.tipo_movimiento).toBe('INGRESO');
  });

  it('saveEgreso normaliza payload de egreso y fetchBalanceTaller calcula flujo_caja_neto', async () => {
    const egreso: EgresoTaller = {
      id: 'egr-test-1',
      fecha: '2026-11-24',
      categoria: 'INSUMOS_RESINA',
      concepto: 'Resina Sunlu ABS-Like 2L',
      monto: 190000,
      metodo_pago: 'BRE_B',
      proveedor_o_beneficiario: 'MercadoLibre',
      registrado_por: 'Wendy'
    };

    const saved = await CloudSyncService.saveEgreso(egreso);
    expect(saved).toBe(true);
    expect(mockUpsert).toHaveBeenCalledTimes(1);

    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        total_ingresos_recaudados: 1065001,
        recaudado_nequi: 70000,
        recaudado_bre_b: 995001,
        recaudado_efectivo: 0,
        total_por_cobrar: 320000,
        total_egresos: 190000,
        egresos_nequi: 0,
        egresos_bre_b: 190000,
        egresos_efectivo: 0,
        flujo_caja_neto: 875001
      },
      error: null
    });

    const bal = await CloudSyncService.fetchBalanceTaller();
    expect(bal?.total_ingresos_recaudados).toBe(1065001);
    expect(bal?.total_egresos).toBe(190000);
    expect(bal?.flujo_caja_neto).toBe(875001);
  });
});

describe('Flujo de Caja Neto, Auditoría de Duplicados y Delta de Inventario (Olas 3B & 3C)', () => {
  it('calcularGramosADescontarConsumoReal evita doble descuento cuando la OT ya descontó en Curado', () => {
    expect(
      calcularGramosADescontarConsumoReal({
        materialRealG: 145,
        materialEstimadoG: 120,
        yaDescontadoEnOT: false,
      })
    ).toBe(145);

    expect(
      calcularGramosADescontarConsumoReal({
        materialRealG: 145,
        materialEstimadoG: 120,
        yaDescontadoEnOT: true,
      })
    ).toBe(25);

    expect(
      calcularGramosADescontarConsumoReal({
        materialRealG: 95,
        materialEstimadoG: 120,
        yaDescontadoEnOT: true,
      })
    ).toBe(-25);

    expect(
      calcularGramosADescontarConsumoReal({
        materialRealG: 120,
        materialEstimadoG: 120,
        yaDescontadoEnOT: true,
      })
    ).toBe(0);
  });

  it('detectarDuplicadosAbonos identifica abonos duplicados sin marcar cuotas de distinto valor', () => {
    const abonos: PaymentRecord[] = [
      { id: '1', monto: 80000, metodo_pago: 'Bre-B', pos_venta_id: 'POS-010', origen_modulo: 'pos', referencia_pago: 'POS-010' },
      { id: '2', monto: 80000, metodo_pago: 'Bre-B', pos_venta_id: 'POS-010', origen_modulo: 'pos', referencia_pago: 'POS-010' },
      { id: '3', monto: 50000, metodo_pago: 'Nequi', orden_trabajo_id: 'OT-005', origen_modulo: 'taller', referencia_pago: 'OT-005' },
      { id: '4', monto: 70000, metodo_pago: 'Nequi', orden_trabajo_id: 'OT-005', origen_modulo: 'taller', referencia_pago: 'OT-005' },
    ];

    const res = detectarDuplicadosAbonos(abonos);
    expect(res.groups).toHaveLength(1);
    expect(res.groups[0].referencia).toBe('POS-010');
    expect(res.groups[0].count).toBe(2);
    expect(res.duplicateIds.has('1')).toBe(true);
    expect(res.duplicateIds.has('2')).toBe(true);
    expect(res.duplicateIds.has('3')).toBe(false);
    expect(res.duplicateIds.has('4')).toBe(false);
  });

  it('calcularFlujoCajaResumen calcula flujo neto global y saldo por caja (Bre-B, Nequi, Efectivo)', () => {
    const egresos: EgresoTaller[] = [
      {
        id: 'e1',
        fecha: '2026-11-24',
        categoria: 'INSUMOS_RESINA',
        concepto: 'Resina Grey 1L',
        monto: 120000,
        metodo_pago: 'Bre-B',
      },
      {
        id: 'e2',
        fecha: '2026-11-24',
        categoria: 'DEVOLUCION_CLIENTE',
        concepto: 'Reembolso OT cancelada',
        monto: 30000,
        metodo_pago: 'Nequi',
      },
    ];

    const resumen = calcularFlujoCajaResumen({
      recaudadoBreB: 500000,
      recaudadoNequi: 100000,
      recaudadoEfectivo: 50000,
      recaudadoTotal: 650000,
      egresos,
    });

    expect(resumen.totalIngresos).toBe(650000);
    expect(resumen.totalEgresos).toBe(150000);
    expect(resumen.flujoCajaNeto).toBe(500000);

    const breB = resumen.porMetodo.find(m => m.metodo === 'BRE_B');
    const nequi = resumen.porMetodo.find(m => m.metodo === 'NEQUI');
    const efectivo = resumen.porMetodo.find(m => m.metodo === 'EFECTIVO');

    expect(breB?.neto).toBe(380000);
    expect(nequi?.neto).toBe(70000);
    expect(efectivo?.neto).toBe(50000);
  });
});
