import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpdate = vi.fn();
const mockDelete = vi.fn();

let abonosTableData: Array<{
  id: string;
  monto: number;
  orden_trabajo_id?: string | null;
  pos_venta_id?: string | null;
  cotizacion_id?: string | null;
}> = [];
let otTotalMap: Record<string, number> = {};
let posTotalMap: Record<string, number> = {};
let cotTotalMap: Record<string, number> = {};

vi.mock('../supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => {
      if (table === 'abonos_pagos') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              maybeSingle: async () => ({
                data: abonosTableData.find(r => (r as any)[col] === val) || null,
                error: null,
              }),
              then: (resolve: any) =>
                resolve({
                  data: abonosTableData.filter(r => (r as any)[col] === val),
                  error: null,
                }),
            }),
          }),
          update: (payload: any) => ({
            eq: async (_col: string, id: string) => {
              mockUpdate({ table: 'abonos_pagos', id, payload });
              abonosTableData = abonosTableData.map(r =>
                r.id === id ? { ...r, ...payload } : r
              );
              return { error: null };
            },
          }),
          delete: () => ({
            eq: async (_col: string, id: string) => {
              mockDelete({ table: 'abonos_pagos', id });
              abonosTableData = abonosTableData.filter(r => r.id !== id);
              return { error: null };
            },
          }),
        };
      }

      if (table === 'ordenes_trabajo' || table === 'ventas_express' || table === 'cotizaciones') {
        return {
          select: () => ({
            eq: (_col: string, id: string) => ({
              maybeSingle: async () => {
                if (table === 'ordenes_trabajo') return { data: { total_ot: otTotalMap[id] ?? 0 }, error: null };
                if (table === 'ventas_express') return { data: { total: posTotalMap[id] ?? 0 }, error: null };
                return { data: { total: cotTotalMap[id] ?? 0 }, error: null };
              },
            }),
          }),
          update: (payload: any) => ({
            eq: async (_col: string, id: string) => {
              mockUpdate({ table, id, payload });
              return { error: null };
            },
          }),
        };
      }

      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      };
    },
  },
}));

import { CloudSyncService } from '../cloudSyncService';
import { getConfiguredGroupChannels } from '../messaging';
import {
  GoogleSheetsSyncService,
  OFFICIAL_APPS_SCRIPT_URL,
} from '../googleSheetsSyncService';
import {
  calcularAjusteStockEdicionPOS,
  calcularFlujoCajaResumen,
  calcularGramosADescontarConsumoReal,
  detectarDuplicadosAbonos,
} from '../inventoryDeductionHelper';
import type { EgresoTaller, PaymentRecord } from '../../types';

describe('Ola 4 — Consistencia E2E Contable, Stock POS y Migración Apps Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    abonosTableData = [];
    otTotalMap = {};
    posTotalMap = {};
    cotTotalMap = {};
  });

  it('1. Flujo E2E completo: Cotización 50% -> OT Curado (100g) -> Consumo Real (130g => +30g) -> Liquidación 100% -> Balance Neto', () => {
    const totalPedido = 200000;
    const abonoInicial = 100000;
    const liquidacionFinal = 100000;

    // Paso 1: Consumo real después de que la OT ya descontó 100g estimados en etapa Curado
    const deltaGramos = calcularGramosADescontarConsumoReal({
      materialRealG: 130,
      materialEstimadoG: 100,
      yaDescontadoEnOT: true,
    });
    expect(deltaGramos).toBe(30); // Solo descuenta los 30g adicionales reales

    // Paso 2: Dos pagos en fechas/montos reales no deben marcarse como duplicados
    const pagos: PaymentRecord[] = [
      {
        id: 'ab-1',
        monto: abonoInicial,
        metodo_pago: 'Bre-B',
        orden_trabajo_id: 'ot-e2e-1',
        origen_modulo: 'cotizacion',
        referencia_pago: 'OT-0100 Anticipo',
      },
      {
        id: 'ab-2',
        monto: liquidacionFinal,
        metodo_pago: 'Nequi',
        orden_trabajo_id: 'ot-e2e-1',
        origen_modulo: 'taller',
        referencia_pago: 'OT-0100 Saldo',
      },
    ];
    expect(detectarDuplicadosAbonos(pagos).groups).toHaveLength(1); // mismo monto + ot_id => alerta preventiva si son idénticos
    const pagosDistintos: PaymentRecord[] = [
      pagos[0],
      { ...pagos[1], monto: 100001, referencia_pago: 'OT-0100 Saldo Final' },
    ];
    expect(detectarDuplicadosAbonos(pagosDistintos).groups).toHaveLength(0);

    // Paso 3: Egreso operativo de resina y cálculo de Balance Neto real por caja
    const egresos: EgresoTaller[] = [
      {
        id: 'eg-1',
        fecha: '2026-11-24',
        categoria: 'INSUMOS_RESINA',
        concepto: 'Reposición Resina',
        monto: 45000,
        metodo_pago: 'Bre-B',
      },
    ];
    const resumen = calcularFlujoCajaResumen({
      recaudadoBreB: totalPedido / 2,
      recaudadoNequi: totalPedido / 2,
      recaudadoEfectivo: 0,
      recaudadoTotal: totalPedido,
      egresos,
    });
    expect(resumen.flujoCajaNeto).toBe(155000);
    expect(resumen.porMetodo.find(m => m.metodo === 'BRE_B')?.neto).toBe(55000);
    expect(resumen.porMetodo.find(m => m.metodo === 'NEQUI')?.neto).toBe(100000);
  });

  it('2. Conciliación estricta de productos_stock al editar Venta POS Express', () => {
    // Subir cantidad de 2 -> 5 descuenta 3 unidades adicionales (-3)
    expect(
      calcularAjusteStockEdicionPOS(
        { descontar_stock: true, producto_stock_id: 'prod-1', cantidad_vendida: 2 },
        { descontar_stock: true, producto_stock_id: 'prod-1', cantidad_vendida: 5 }
      )
    ).toEqual([{ productoId: 'prod-1', deltaStock: -3 }]);

    // Bajar cantidad de 5 -> 2 repone 3 unidades (+3)
    expect(
      calcularAjusteStockEdicionPOS(
        { descontar_stock: true, producto_stock_id: 'prod-1', cantidad_vendida: 5 },
        { descontar_stock: true, producto_stock_id: 'prod-1', cantidad_vendida: 2 }
      )
    ).toEqual([{ productoId: 'prod-1', deltaStock: 3 }]);

    // Cambiar de producto A (x2) a producto B (x3) repone A (+2) y descuenta B (-3)
    expect(
      calcularAjusteStockEdicionPOS(
        { descontar_stock: true, producto_stock_id: 'prod-A', cantidad_vendida: 2 },
        { descontar_stock: true, producto_stock_id: 'prod-B', cantidad_vendida: 3 }
      )
    ).toEqual([
      { productoId: 'prod-A', deltaStock: 2 },
      { productoId: 'prod-B', deltaStock: -3 },
    ]);

    // Desactivar descontar_stock repone la cantidad previa
    expect(
      calcularAjusteStockEdicionPOS(
        { descontar_stock: true, producto_stock_id: 'prod-1', cantidad_vendida: 4 },
        { descontar_stock: false, producto_stock_id: 'prod-1', cantidad_vendida: 4 }
      )
    ).toEqual([{ productoId: 'prod-1', deltaStock: 4 }]);
  });

  it('3. updateAbono y deleteAbono resincronizan abono/saldo/estado_pago en la entidad origen y emiten wjg:ledger-updated', async () => {
    abonosTableData = [
      { id: 'ab-edit-1', monto: 50000, orden_trabajo_id: 'ot-sync-1', pos_venta_id: 'pos-sync-1', cotizacion_id: null },
      { id: 'ab-edit-2', monto: 30000, orden_trabajo_id: 'ot-sync-1', pos_venta_id: 'pos-sync-1', cotizacion_id: null },
    ];
    otTotalMap['ot-sync-1'] = 100000;
    posTotalMap['pos-sync-1'] = 100000;

    let resyncEventDetail: any = null;
    const listener = (e: Event) => {
      resyncEventDetail = (e as CustomEvent).detail;
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('wjg:ledger-updated', listener);
    }

    const okUpdate = await CloudSyncService.updateAbono('ab-edit-1', { monto: 70000 });
    expect(okUpdate).toBe(true);

    const otUpdateCall = mockUpdate.mock.calls.find(c => c[0].table === 'ordenes_trabajo')?.[0];
    expect(otUpdateCall.payload.abono).toBe(100000);
    expect(otUpdateCall.payload.total_abonado).toBe(100000);
    expect(otUpdateCall.payload.estado_pago).toBe('Pagado Total');
    expect(otUpdateCall.payload.saldo_pendiente).toBeUndefined(); // Nunca escribe columna generada

    const posUpdateCall = mockUpdate.mock.calls.find(c => c[0].table === 'ventas_express')?.[0];
    expect(posUpdateCall.payload.abono).toBe(100000);
    expect(posUpdateCall.payload.saldo_pendiente).toBe(0);
    expect(posUpdateCall.payload.estado_pago).toBe('Pagado Total');
    if (typeof window !== 'undefined') {
      expect(resyncEventDetail?.resyncEntities).toBe(true);
    }

    mockUpdate.mockClear();
    const okDelete = await CloudSyncService.deleteAbono('ab-edit-2');
    expect(okDelete).toBe(true);

    const otPostDel = mockUpdate.mock.calls.find(c => c[0].table === 'ordenes_trabajo')?.[0];
    expect(otPostDel.payload.abono).toBe(70000);
    expect(otPostDel.payload.estado_pago).toBe('Abono Parcial');

    const posPostDel = mockUpdate.mock.calls.find(c => c[0].table === 'ventas_express')?.[0];
    expect(posPostDel.payload.abono).toBe(70000);
    expect(posPostDel.payload.saldo_pendiente).toBe(30000);
    expect(posPostDel.payload.estado_pago).toBe('Abono Parcial');

    if (typeof window !== 'undefined') {
      window.removeEventListener('wjg:ledger-updated', listener);
    }
  });

  it('4. GoogleSheetsSyncService auto-migra URLs antiguas hacia OFFICIAL_APPS_SCRIPT_URL', () => {
    expect(OFFICIAL_APPS_SCRIPT_URL).toContain(
      'AKfycby3wMIXe7A3kAyst3cSxbIE9M5HUnmBgJGrGJ6Xi6nMfjN4ckFzZO6p53R1ET2bMuTbRg'
    );

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        'wjg_google_sheets_config',
        JSON.stringify({
          webAppUrl:
            'https://script.google.com/macros/s/AKfycbzEUGjnaQoMVZ5OtdY-QJldULcF_NYqxsda9y5nR72kf7kaQNIsp6AQbb5Z_Fop2syAJQ/exec',
        })
      );
      const cfg = GoogleSheetsSyncService.getConfig();
      expect(cfg.webAppUrl).toBe(OFFICIAL_APPS_SCRIPT_URL);
      localStorage.removeItem('wjg_google_sheets_config');
    }
  });

  it('5. getConfiguredGroupChannels expone canales con audiencia "clientes" para difusión en Marketing', () => {
    const channels = getConfiguredGroupChannels({
      tarifa_kwh: 900,
      margen_merma_resina: 10,
      telefono_contacto: '3202796115',
      telefono_contacto2: '',
      instagram: '@wjgeeks3d',
      nequi: '',
      titular_cuenta: 'WJGEEKS',
      whatsapp_grupos_config: {
        vip_clientes: {
          jid: '120363999999999999@g.us',
          nombre: 'Clientes VIP Lanzamientos',
          audiencia: 'clientes',
          esPersonalizado: true,
        },
        taller: {
          jid: '120363421319587624@g.us',
          nombre: 'WJGeeks 3D',
          audiencia: 'equipo',
          esPersonalizado: false,
        },
      },
    });

    const clientChannels = channels.filter(c => c.audiencia === 'clientes');
    expect(clientChannels).toHaveLength(1);
    expect(clientChannels[0].id).toBe('vip_clientes');
    expect(clientChannels[0].nombre).toBe('Clientes VIP Lanzamientos');
    expect(clientChannels[0].jid).toBe('120363999999999999@g.us');
  });
});
