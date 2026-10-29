import { describe, it, expect, vi, beforeEach } from 'vitest';
import { otMatchesCuenta, otMatchesVenta, ventaMatchesCuenta } from '../../components/cuentasCobro/cuentasCobroUtils';
import { OrdenTrabajo, CuentaCobro } from '../../types';
import { VentaExpress } from '../../types/pos';

describe('Deduplicación de OTs y Ventas en Cobranzas', () => {
  const mockVenta: VentaExpress = {
    id: 'pos-12345',
    numero_venta: 'POS-001',
    nombre_producto: 'Figura Batman',
    cliente_nombre: 'Bruce Wayne',
    cliente_telefono: '3001234567',
    total: 80000,
    abono: 40000,
    saldo_pendiente: 40000,
    estado_pago: 'Abono Parcial',
    fecha_venta: '2026-10-24',
    requiere_ot: true,
    ot_numero: 'OT-0001',
    ot_id: 'ot-uuid-1'
  };

  const mockOTPrincipal = {
    id: 'ot-uuid-1',
    numero_ot: 'OT-0001',
    cliente_nombre: 'Bruce Wayne',
    cliente_telefono: '3001234567',
    item_nombre: 'Figura Batman',
    cantidad: 1,
    estado: 'Imprimiendo',
    pos_venta_id: 'pos-12345',
    cotizacion_numero: 'POS-001',
    precio_cobrado: 80000,
    abono: 40000,
    saldo_pendiente: 40000,
    estado_pago: 'Abono Parcial'
  } as unknown as OrdenTrabajo;

  const mockOTSecundariaDuplicada = {
    id: 'ot-uuid-2',
    numero_ot: 'OT-0002',
    cliente_nombre: 'Bruce Wayne',
    cliente_telefono: '3001234567',
    item_nombre: 'Figura Batman (Pieza Extra)',
    cantidad: 1,
    estado: 'En Cola',
    pos_venta_id: 'pos-12345',
    precio_cobrado: 80000,
    abono: 40000,
    saldo_pendiente: 40000,
    estado_pago: 'Abono Parcial'
  } as unknown as OrdenTrabajo;

  const mockCuenta = {
    id: 'ot-uuid-1',
    numero_cc: 'CC-001',
    cotizacion_numero: 'COT-0001',
    cotizacion_id: '',
    cliente: {
      id: 'cli-1',
      codigo: 1,
      nombre: 'Bruce Wayne',
      nit_cc: '',
      telefono: '3001234567',
      correo: ''
    },
    fecha_emision: '2026-10-24',
    items_resumen: 'Figura Batman',
    total: 80000,
    abono: 40000,
    saldo_pendiente: 40000,
    estado_pago: 'Abono Parcial'
  } as unknown as CuentaCobro;

  it('debe vincular correctamente la venta POS con la cuenta de cobro derivada de su OT', () => {
    const match = ventaMatchesCuenta(mockVenta, mockCuenta);
    expect(match).toBe(true);
  });

  it('debe vincular la OT principal con la venta POS por pos_venta_id y ot_numero', () => {
    const match = otMatchesVenta(mockOTPrincipal, mockVenta);
    expect(match).toBe(true);
  });

  it('debe vincular la OT secundaria duplicada con la venta POS por pos_venta_id para evitar sumarla doble', () => {
    const match = otMatchesVenta(mockOTSecundariaDuplicada, mockVenta);
    expect(match).toBe(true);
  });

  it('debe vincular la OT a la cuenta de cobro correspondiente', () => {
    const match = otMatchesCuenta(mockOTPrincipal, mockCuenta);
    expect(match).toBe(true);
  });
});
