import { describe, it, expect } from 'vitest';
import { mergeRemoteWithLocalEntities } from '../realtimeMerge';

interface MockCot {
  id: string;
  numero_cot: string;
  total: number;
}

describe('realtimeMerge - Fuente Única de Verdad y Anti-Resurrección', () => {
  it('elimina localmente las cotizaciones borradas en otro dispositivo cuando no están en Outbox ni en ventana de mutación', () => {
    const prev: MockCot[] = [
      { id: 'c1', numero_cot: '26-001', total: 50000 },
      { id: 'c2', numero_cot: '26-002', total: 80000 }
    ];
    const fresh: MockCot[] = [{ id: 'c1', numero_cot: '26-001', total: 55000 }];

    const merged = mergeRemoteWithLocalEntities({
      fresh,
      prev,
      getKeys: c => [c.numero_cot, c.id],
      isInOutbox: () => false,
      getRecentLocal: () => null,
      sortFn: (a, b) => b.numero_cot.localeCompare(a.numero_cot)
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].numero_cot).toBe('26-001');
    expect(merged[0].total).toBe(55000);
  });

  it('conserva registros recién creados localmente si están pendientes en Outbox aunque aún no aparezcan en Supabase', () => {
    const prev: MockCot[] = [
      { id: 'c1', numero_cot: '26-001', total: 50000 },
      { id: 'c3', numero_cot: '26-003', total: 120000 }
    ];
    const fresh: MockCot[] = [{ id: 'c1', numero_cot: '26-001', total: 50000 }];

    const merged = mergeRemoteWithLocalEntities({
      fresh,
      prev,
      getKeys: c => [c.numero_cot, c.id],
      isInOutbox: c => c.numero_cot === '26-003',
      getRecentLocal: () => null,
      sortFn: (a, b) => b.numero_cot.localeCompare(a.numero_cot)
    });

    expect(merged.map(c => c.numero_cot)).toEqual(['26-003', '26-001']);
  });

  it('da prioridad a la mutación local reciente sin sobrescribir cambios en curso', () => {
    const prev: MockCot[] = [{ id: 'c1', numero_cot: '26-001', total: 50000 }];
    const fresh: MockCot[] = [{ id: 'c1', numero_cot: '26-001', total: 50000 }];
    const localEdit: MockCot = { id: 'c1', numero_cot: '26-001', total: 99000 };

    const merged = mergeRemoteWithLocalEntities({
      fresh,
      prev,
      getKeys: c => [c.numero_cot, c.id],
      isInOutbox: () => false,
      getRecentLocal: c => (c.numero_cot === '26-001' ? localEdit : null)
    });

    expect(merged[0].total).toBe(99000);
  });
});
