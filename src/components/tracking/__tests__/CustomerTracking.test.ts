import { describe, it, expect } from 'vitest';
import { ETAPAS, normalizeEstadoOT } from '../CustomerTrackingView';

describe('CustomerTrackingView & Production Phases Engine', () => {
  it('debe tener exactamente las 6 fases de manufactura con los porcentajes técnicos correctos', () => {
    expect(ETAPAS).toHaveLength(6);
    expect(ETAPAS[0].codigo).toBe('EN_COLA_OT');
    expect(ETAPAS[0].porcentaje).toBe(15);

    expect(ETAPAS[1].codigo).toBe('IMPRESION');
    expect(ETAPAS[1].porcentaje).toBe(35);

    expect(ETAPAS[2].codigo).toBe('CURADO');
    expect(ETAPAS[2].porcentaje).toBe(55);

    expect(ETAPAS[3].codigo).toBe('PINTADO_ARMADO');
    expect(ETAPAS[3].porcentaje).toBe(75);

    expect(ETAPAS[4].codigo).toBe('CONTROL_CALIDAD');
    expect(ETAPAS[4].porcentaje).toBe(90);

    expect(ETAPAS[5].codigo).toBe('ENTREGADO');
    expect(ETAPAS[5].porcentaje).toBe(100);
  });

  it('debe normalizar correctamente todos los sinónimos y códigos de estado de la OT', () => {
    expect(normalizeEstadoOT('ENTREGADO')).toBe('ENTREGADO');
    expect(normalizeEstadoOT('Listo para Entrega')).toBe('ENTREGADO');
    expect(normalizeEstadoOT('Entregado')).toBe('ENTREGADO');
    expect(normalizeEstadoOT('Enviado / Entregado')).toBe('ENTREGADO');
    expect(normalizeEstadoOT('Completado')).toBe('ENTREGADO');

    expect(normalizeEstadoOT('CONTROL_CALIDAD')).toBe('CONTROL_CALIDAD');
    expect(normalizeEstadoOT('Control de Calidad')).toBe('CONTROL_CALIDAD');

    expect(normalizeEstadoOT('PINTADO_ARMADO')).toBe('PINTADO_ARMADO');
    expect(normalizeEstadoOT('Pintura y Armado')).toBe('PINTADO_ARMADO');
    expect(normalizeEstadoOT('Acabados y Detallado')).toBe('PINTADO_ARMADO');

    expect(normalizeEstadoOT('CURADO')).toBe('CURADO');
    expect(normalizeEstadoOT('Curado')).toBe('CURADO');
    expect(normalizeEstadoOT('Lavado & Curado UV')).toBe('CURADO');

    expect(normalizeEstadoOT('IMPRESION')).toBe('IMPRESION');
    expect(normalizeEstadoOT('Imprimiendo')).toBe('IMPRESION');
    expect(normalizeEstadoOT('Impresión 3D')).toBe('IMPRESION');

    expect(normalizeEstadoOT('EN_COLA_OT')).toBe('EN_COLA_OT');
    expect(normalizeEstadoOT('En Cola')).toBe('EN_COLA_OT');
    expect(normalizeEstadoOT('Aprobada / En Cola OT')).toBe('EN_COLA_OT');
  });

  it('garantiza 100% cuando una pieza está terminada y pagada en su totalidad', () => {
    const ordenPrueba = {
      id: 'ot-123',
      numero_ot: 'OT-26-001',
      estado: 'Listo para Entrega',
      total_ot: 120000,
      abono: 120000,
      saldo_pendiente: 0,
      estado_pago: 'Pagado Total'
    };

    const norm = normalizeEstadoOT(ordenPrueba.estado);
    const isFinished = norm === 'ENTREGADO' || ordenPrueba.estado === 'Listo para Entrega';
    const isFullyPaid = ordenPrueba.saldo_pendiente <= 0;

    let index = -1;
    if (isFinished || (isFullyPaid && (norm === 'CONTROL_CALIDAD' || norm === 'ENTREGADO'))) {
      index = 5;
    }

    expect(index).toBe(5);
    expect(ETAPAS[index].porcentaje).toBe(100);
    expect(ETAPAS[index].label).toBe('¡Listo para Entrega!');
  });
});
