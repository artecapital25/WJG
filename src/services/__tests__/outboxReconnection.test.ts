import { describe, it, expect, beforeEach, vi } from 'vitest';

// Configuración de mock para localStorage y window en entorno Node/Vitest
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createStorageMock() as any;
}

const listeners: Record<string, Function[]> = {};

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: globalThis.localStorage,
    addEventListener: (event: string, cb: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    },
    removeEventListener: (event: string, cb: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(fn => fn !== cb);
      }
    },
    dispatchEvent: (event: any) => {
      const type = event.type || event;
      if (listeners[type]) {
        listeners[type].forEach(fn => fn(event));
      }
      return true;
    }
  };
} else {
  const originalAdd = window.addEventListener;
  const originalRemove = window.removeEventListener;
  const originalDispatch = window.dispatchEvent;

  window.addEventListener = (event: string, cb: any) => {
    listeners[event] = listeners[event] || [];
    listeners[event].push(cb);
    if (originalAdd) originalAdd.call(window, event, cb);
  };
  window.removeEventListener = (event: string, cb: any) => {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter(fn => fn !== cb);
    }
    if (originalRemove) originalRemove.call(window, event, cb);
  };
  window.dispatchEvent = (event: any) => {
    const type = event.type || event;
    if (listeners[type]) {
      listeners[type].forEach(fn => fn(event));
    }
    if (originalDispatch) return originalDispatch.call(window, event);
    return true;
  };
}

import { CloudSyncService } from '../cloudSyncService';
import { Cotizacion, OrdenTrabajo, CuentaCobro, VentaExpress } from '../../types';

describe('Auditoría de Resiliencia Offline y Vaciado de Cola Outbox (360°)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('1. Debe encolar y recuperar tareas en el Outbox en localStorage sin duplicados', () => {
    expect(CloudSyncService.getOutboxQueue()).toEqual([]);

    const mockCotizacion: Partial<Cotizacion> = {
      numero_cot: 'COT-2026-TEST1',
      total: 150000,
      cliente: { id: 'c1', codigo: 1, nombre: 'Cliente Test', nit_cc: '', telefono: '3200000000', correo: '' },
      items: []
    };

    CloudSyncService.enqueueOutboxTask({
      type: 'cotizacion',
      payload: mockCotizacion
    });

    let queue = CloudSyncService.getOutboxQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe('cotizacion');
    expect(queue[0].payload.numero_cot).toBe('COT-2026-TEST1');

    // Intentar encolar de nuevo la misma cotización con datos actualizados (deduplicación)
    CloudSyncService.enqueueOutboxTask({
      type: 'cotizacion',
      payload: { ...mockCotizacion, total: 180000 }
    });

    queue = CloudSyncService.getOutboxQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].payload.total).toBe(180000);
  });

  it('2. Debe desencolar una tarea específica por su ID tras confirmación', () => {
    CloudSyncService.enqueueOutboxTask({
      type: 'cotizacion',
      payload: { numero_cot: 'COT-OUT-A' }
    });
    CloudSyncService.enqueueOutboxTask({
      type: 'cotizacion',
      payload: { numero_cot: 'COT-OUT-B' }
    });

    let queue = CloudSyncService.getOutboxQueue();
    expect(queue.length).toBe(2);

    const taskA = queue.find(q => q.payload.numero_cot === 'COT-OUT-A');
    expect(taskA).toBeDefined();

    CloudSyncService.dequeueOutboxTask(taskA!.id);

    queue = CloudSyncService.getOutboxQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].payload.numero_cot).toBe('COT-OUT-B');
  });

  it('3. saveCotizacion en modo offline debe almacenar en la cola Outbox automáticamente', async () => {
    // Forzar que el servicio esté offline simulando falta de disponibilidad
    vi.spyOn(CloudSyncService, 'isAvailable').mockReturnValue(false);

    const cotizacionOffline: Cotizacion = {
      id: 'cot-off-1',
      numero_cot: 'COT-2026-OFFLINE-01',
      fecha: '2026-11-05',
      tiempo_entrega_estimado: '(3) Días hábiles',
      cliente: { id: 'c-off', codigo: 10, nombre: 'Empresa Taller', nit_cc: '900123456', telefono: '3201234567', correo: 'test@taller.com' },
      items: [],
      subtotal: 200000,
      descuento_porcentaje: 0,
      iva_porcentaje: 0,
      total: 200000,
      estado: 'Aceptada',
      estado_pago: 'Abono Parcial',
      abono: 100000,
      saldo_pendiente: 100000,
      metodo_pago: 'Bre-B',
      vendedor: 'Germán',
      notas: 'Notas taller'
    };

    const saved = await CloudSyncService.saveCotizacion(cotizacionOffline);
    expect(saved).toBe(false);

    const outbox = CloudSyncService.getOutboxQueue();
    expect(outbox.length).toBe(1);
    expect(outbox[0].type).toBe('cotizacion');
    expect(outbox[0].payload.numero_cot).toBe('COT-2026-OFFLINE-01');
  });

  it('4. saveOrdenTrabajo, saveCuentaCobro y saveVentaExpress en modo offline deben encolar en Outbox', async () => {
    vi.spyOn(CloudSyncService, 'isAvailable').mockReturnValue(false);

    const otOffline: Partial<OrdenTrabajo> = {
      id: 'ot-off-1',
      numero_ot: 'OT-2026-OFFLINE-01',
      cliente_nombre: 'Cliente Taller',
      estado: 'Imprimiendo'
    };

    const ccOffline: Partial<CuentaCobro> = {
      id: 'cc-off-1',
      numero_cc: 'CC-2026-001',
      cotizacion_numero: 'COT-2026-OFFLINE-01',
      total: 250000
    };

    const posOffline: Partial<VentaExpress> = {
      id: 'pos-off-1',
      numero_venta: 'POS-2026-001',
      total: 35000
    };

    await CloudSyncService.saveOrdenTrabajo(otOffline as OrdenTrabajo);
    await CloudSyncService.saveCuentaCobro(ccOffline as CuentaCobro);
    await CloudSyncService.saveVentaExpress(posOffline as VentaExpress);

    const outbox = CloudSyncService.getOutboxQueue();
    expect(outbox.length).toBe(3);
    expect(outbox.some(t => t.type === 'orden' && t.payload.numero_ot === 'OT-2026-OFFLINE-01')).toBe(true);
    expect(outbox.some(t => t.type === 'cuenta' && t.payload.id === 'cc-off-1')).toBe(true);
    expect(outbox.some(t => t.type === 'venta_express' && t.payload.id === 'pos-off-1')).toBe(true);
  });

  it('5. flushOutboxQueue debe procesar y vaciar los ítems pendientes cuando la nube está disponible', async () => {
    vi.spyOn(CloudSyncService, 'isAvailable').mockReturnValue(true);

    CloudSyncService.enqueueOutboxTask({
      type: 'cotizacion',
      payload: { numero_cot: 'COT-SYNC-1' }
    });
    CloudSyncService.enqueueOutboxTask({
      type: 'orden',
      payload: { numero_ot: 'OT-SYNC-1' }
    });

    expect(CloudSyncService.getOutboxQueue().length).toBe(2);

    // Mockear métodos de guardado para simular éxito al subir a Supabase
    vi.spyOn(CloudSyncService, 'saveCotizacion').mockResolvedValue(true);
    vi.spyOn(CloudSyncService, 'saveOrdenTrabajo').mockResolvedValue(true);

    const result = await CloudSyncService.flushOutboxQueue();
    expect(result.synced).toBe(2);
    expect(result.remaining).toBe(0);
    expect(CloudSyncService.getOutboxQueue().length).toBe(0);
  });

  it('6. initReconnectionListener debe escuchar el evento online, ejecutar el vaciado y notificar a la UI', async () => {
    let syncedCallbackTriggered = false;
    vi.spyOn(CloudSyncService, 'checkConnection').mockResolvedValue({ ok: true, message: 'Online' });
    vi.spyOn(CloudSyncService, 'flushOutboxQueue').mockResolvedValue({ synced: 3, remaining: 0 });

    const unsubscribe = CloudSyncService.initReconnectionListener(() => {
      syncedCallbackTriggered = true;
    });

    expect(typeof unsubscribe).toBe('function');

    // Simular el evento 'online' emitido por el navegador cuando regresa el internet
    if (typeof (window as any).dispatchEvent === 'function') {
      window.dispatchEvent({ type: 'online' } as any);
    }

    // Permitir ciclo microtask
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(CloudSyncService.checkConnection).toHaveBeenCalled();
    expect(CloudSyncService.flushOutboxQueue).toHaveBeenCalled();
    expect(syncedCallbackTriggered).toBe(true);

    unsubscribe();
  });
});
