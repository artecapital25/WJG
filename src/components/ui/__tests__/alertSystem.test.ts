import { describe, it, expect } from 'vitest';
import {
  resolveProgressScale,
  resolveStockAlert,
  resolvePaymentAlert,
  resolveTaskAlert,
  resolveSupplyRequestAlert,
  resolveWorkOrderAlert,
  resolveCalendarEventAlert,
  getAlertSurfaceClassName,
} from '../alertSystem';

describe('alertSystem — Patrón Oficial de Alertas Visuales y Sombreados', () => {
  it('resolveProgressScale interpola de Rojo (0%) -> Ámbar (50%) -> Verde (100%) con clamping seguro', () => {
    const p0 = resolveProgressScale(0);
    expect(p0.percent).toBe(0);
    expect(p0.color).toBe('#ef4444');
    expect(p0.tone).toBe('danger');

    const p25 = resolveProgressScale(25);
    expect(p25.percent).toBe(25);
    expect(p25.tone).toBe('warning');
    expect(p25.color).not.toBe('#ef4444');

    const p50 = resolveProgressScale(50);
    expect(p50.percent).toBe(50);
    expect(p50.color).toBe('#f59e0b');
    expect(p50.tone).toBe('warning');

    const p75 = resolveProgressScale(75);
    expect(p75.percent).toBe(75);
    expect(p75.tone).toBe('warning');

    const p100 = resolveProgressScale(100);
    expect(p100.percent).toBe(100);
    expect(p100.color).toBe('#10b981');
    expect(p100.tone).toBe('success');

    expect(resolveProgressScale(-20).percent).toBe(0);
    expect(resolveProgressScale(140).percent).toBe(100);
    expect(resolveProgressScale(Number.NaN).percent).toBe(0);
  });

  it('resolveStockAlert clasifica Agotado (Rojo), Agotándose (Amarillo) y Disponible (Verde) según tipo', () => {
    expect(resolveStockAlert({ actual: 0, tipo: 'resina' }).tone).toBe('danger');
    expect(resolveStockAlert({ actual: 200, tipo: 'resina' }).tone).toBe('warning');
    expect(resolveStockAlert({ actual: 201, tipo: 'resina' }).tone).toBe('success');

    expect(resolveStockAlert({ actual: 0, tipo: 'filamento' }).tone).toBe('danger');
    expect(resolveStockAlert({ actual: 150, tipo: 'filamento' }).tone).toBe('warning');
    expect(resolveStockAlert({ actual: 650, tipo: 'filamento', capacidadMaxima: 1000 }).percent).toBe(65);

    expect(resolveStockAlert({ actual: 0, tipo: 'insumo' }).tone).toBe('danger');
    expect(resolveStockAlert({ actual: 2, tipo: 'insumo' }).tone).toBe('warning');
    expect(resolveStockAlert({ actual: 5, tipo: 'insumo' }).tone).toBe('success');

    expect(resolveStockAlert({ actual: 1, tipo: 'producto', minimo: 2 }).tone).toBe('warning');
    expect(resolveStockAlert({ actual: 10, tipo: 'producto', cancelado: true }).tone).toBe('muted');
  });

  it('resolvePaymentAlert diferencia Sin Pago ($0), Abono Parcial, Pagado 100%, Vencido y Cancelado', () => {
    const sinPago = resolvePaymentAlert({ total: 100000, abono: 0 });
    expect(sinPago.tone).toBe('danger');
    expect(sinPago.percent).toBe(0);

    const parcial = resolvePaymentAlert({ total: 100000, abono: 50000 });
    expect(parcial.tone).toBe('warning');
    expect(parcial.percent).toBe(50);

    const pagado = resolvePaymentAlert({ total: 100000, abono: 100000 });
    expect(pagado.tone).toBe('success');
    expect(pagado.percent).toBe(100);

    const revertido = resolvePaymentAlert({ total: 100000, abono: 20000, saldoPendiente: 80000 });
    expect(revertido.tone).toBe('warning');
    expect(revertido.percent).toBe(20);

    const vencido = resolvePaymentAlert({ total: 100000, abono: 40000, vencido: true });
    expect(vencido.tone).toBe('danger');

    const cancelado = resolvePaymentAlert({ total: 100000, abono: 0, cancelado: true });
    expect(cancelado.tone).toBe('muted');
  });

  it('resolveTaskAlert y resolveSupplyRequestAlert cubren vencidas, urgentes, progreso, completadas y canceladas', () => {
    expect(resolveTaskAlert({ completada: true, porcentaje: 100 }).tone).toBe('success-soft');
    expect(resolveTaskAlert({ cancelada: true }).tone).toBe('muted');
    expect(resolveTaskAlert({ prioridad: 'urgente' }).tone).toBe('danger');
    expect(resolveTaskAlert({ fechaLimite: '2026-11-20', hoyStr: '2026-11-26' }).tone).toBe('danger');
    expect(resolveTaskAlert({ fechaLimite: '2026-11-26', hoyStr: '2026-11-26' }).tone).toBe('warning');
    expect(resolveTaskAlert({ porcentaje: 40 }).tone).toBe('info');
    expect(resolveTaskAlert({ prioridad: 'media', porcentaje: 0 }).tone).toBe('warning');

    expect(resolveSupplyRequestAlert({ estado: 'pendiente', urgencia: 'taller_detenido' }).tone).toBe('danger');
    expect(resolveSupplyRequestAlert({ estado: 'pendiente', urgencia: 'normal' }).tone).toBe('warning');
    expect(resolveSupplyRequestAlert({ estado: 'en_camino', urgencia: 'normal' }).tone).toBe('info');
    expect(resolveSupplyRequestAlert({ estado: 'recibido' }).tone).toBe('success-soft');
    expect(resolveSupplyRequestAlert({ estado: 'cancelado' }).tone).toBe('muted');
  });

  it('resolveWorkOrderAlert y resolveCalendarEventAlert generan clases y tonos esperados', () => {
    expect(resolveWorkOrderAlert({ estado: 'Cancelado', total: 50000, abono: 0 }).tone).toBe('muted');
    expect(resolveWorkOrderAlert({ estado: 'Imprimiendo', total: 80000, abono: 0, saldoPendiente: 80000 }).tone).toBe('danger');
    expect(resolveWorkOrderAlert({ estado: 'Listo para Entrega', total: 80000, abono: 40000, saldoPendiente: 40000 }).tone).toBe('warning');
    expect(resolveWorkOrderAlert({ estado: 'Listo para Entrega', total: 80000, abono: 80000, saldoPendiente: 0 }).tone).toBe('success');
    expect(resolveWorkOrderAlert({ estado: 'Curado', total: 80000, abono: 80000, saldoPendiente: 0 }).tone).toBe('purple');

    expect(resolveCalendarEventAlert({ tipo_evento: 'vencimiento_cobro', fecha_inicio: '2026-11-26', hoyStr: '2026-11-26' }).tone).toBe('danger');
    expect(resolveCalendarEventAlert({ tipo_evento: 'entrega_pedido', fecha_inicio: '2026-11-20', hoyStr: '2026-11-26' }).tone).toBe('danger');
    expect(resolveCalendarEventAlert({ tipo_evento: 'entrega_pedido', fecha_inicio: '2026-11-28', hoyStr: '2026-11-26' }).tone).toBe('info');
    expect(resolveCalendarEventAlert({ tipo_evento: 'entrega_pedido', estado: 'completado', fecha_inicio: '2026-11-20' }).tone).toBe('success-soft');

    expect(getAlertSurfaceClassName('warning', 'glass-card')).toBe('glass-card wjg-alert-surface wjg-alert-tone-warning');
  });
});
