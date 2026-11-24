import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Cotizacion } from '../../types';

const upsertMock = vi.fn();
const selectSingleMock = vi.fn();
const deleteEqMock = vi.fn();
const insertMock = vi.fn();
const clienteSelectMock = vi.fn();

vi.mock('../supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => {
      if (table === 'clientes') {
        return {
          select: () => ({
            ilike: () => ({ limit: () => ({ data: [{ id: 'cli-uuid-1' }], error: null }) }),
            eq: () => ({ limit: () => ({ data: [{ id: 'cli-uuid-1' }], error: null }) })
          }),
          upsert: () => ({ select: () => ({ single: () => ({ data: { id: 'cli-uuid-1' }, error: null }) }) }),
          insert: () => ({ select: () => ({ single: () => ({ data: { id: 'cli-uuid-1' }, error: null }) }) })
        };
      }
      if (table === 'cotizaciones') {
        return {
          upsert: (payload: any, opts: any) => {
            upsertMock(payload, opts);
            return {
              select: () => ({
                single: () => selectSingleMock()
              })
            };
          }
        };
      }
      if (table === 'cotizacion_items') {
        return {
          delete: () => ({
            eq: () => deleteEqMock()
          }),
          insert: (items: any) => insertMock(items)
        };
      }
      return {
        select: () => clienteSelectMock(),
        upsert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) })
      };
    },
    getChannels: () => [],
    channel: () => ({ send: vi.fn(), subscribe: vi.fn(), on: vi.fn().mockReturnThis() })
  }
}));

import { CloudSyncService } from '../cloudSyncService';

describe('CloudSyncService.saveCotizacion - NOT NULL payload contract', () => {
  beforeEach(() => {
    upsertMock.mockClear();
    selectSingleMock.mockReset().mockResolvedValue({ data: { id: 'cot-uuid-999' }, error: null });
    deleteEqMock.mockReset().mockResolvedValue({ error: null });
    insertMock.mockReset().mockResolvedValue({ error: null });
  });

  it('siempre incluye cliente_nombre y cliente_telefono no nulos para cumplir restricciones de Supabase', async () => {
    const cotSinDatosCliente: Cotizacion = {
      id: 'cot-local-1',
      numero_cot: '26-099',
      cliente: {
        id: 'cli-1',
        codigo: 99,
        nombre: '   ',
        nit_cc: '',
        telefono: '',
        correo: ''
      },
      vendedor: 'Germán',
      fecha: '2026-11-24',
      estado: 'Borrador',
      items: [],
      subtotal: 85000,
      iva_porcentaje: 0,
      descuento_porcentaje: 0,
      total: 85000,
      tiempo_entrega_estimado: '(3) Días hábiles',
      notas: ''
    };

    const ok = await CloudSyncService.saveCotizacion(cotSinDatosCliente);
    expect(ok).toBe(true);
    expect(upsertMock).toHaveBeenCalledTimes(1);

    const [payload] = upsertMock.mock.calls[0];
    expect(payload.numero_cot).toBe('26-099');
    expect(payload.cliente_nombre).toBe('Cliente General');
    expect(payload.cliente_telefono).toBe('0000000000');
    expect(payload.total).toBe(85000);
  });

  it('envía cliente_nombre y cliente_telefono reales del cliente cuando están presentes', async () => {
    const cotConCliente: Cotizacion = {
      id: 'cot-local-2',
      numero_cot: '26-100',
      cliente: {
        id: 'cli-2',
        codigo: 100,
        nombre: 'Carlos Prueba Móvil',
        nit_cc: '10203040',
        telefono: '3105551234',
        correo: 'carlos@test.com'
      },
      vendedor: 'Juan',
      fecha: '2026-11-24',
      estado: 'Enviada',
      items: [],
      subtotal: 120000,
      iva_porcentaje: 0,
      descuento_porcentaje: 0,
      total: 120000,
      tiempo_entrega_estimado: '(3) Días hábiles',
      notas: 'Prueba celular'
    };

    const ok = await CloudSyncService.saveCotizacion(cotConCliente);
    expect(ok).toBe(true);
    const [payload] = upsertMock.mock.calls[0];
    expect(payload.cliente_nombre).toBe('Carlos Prueba Móvil');
    expect(payload.cliente_telefono).toBe('3105551234');
  });
});
