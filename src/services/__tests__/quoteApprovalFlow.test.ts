import { describe, it, expect } from 'vitest';
import { Cotizacion, EstadoCotizacion, EstadoPago, CuentaCobro } from '../../types';

// Pure business logic validating the Quote -> Debt Generation & State Machine
export function validarTransicionEstadoCotizacion(
  estadoActual: EstadoCotizacion,
  nuevoEstado: EstadoCotizacion
): { valida: boolean; motivo?: string } {
  if (estadoActual === nuevoEstado) return { valida: true };

  // Terminal states cannot transition back to initial draft
  if (estadoActual === 'Rechazada' && nuevoEstado === 'Aceptada') {
    return { valida: false, motivo: 'Una cotización rechazada no puede aceptarse directamente.' };
  }

  if (estadoActual === 'Facturada' && (nuevoEstado === 'Borrador' || nuevoEstado === 'Enviada')) {
    return { valida: false, motivo: 'Una cotización facturada no puede revertirse a borrador.' };
  }

  return { valida: true };
}

export function generarCuentaCobroDesdeCotizacion(
  cot: Cotizacion,
  numeroCC: string
): CuentaCobro {
  const abono = Math.max(0, cot.abono || 0);
  const total = Math.max(0, cot.total);
  const saldoPendiente = Math.max(0, total - abono);

  let estadoPago: EstadoPago = 'Pendiente';
  if (saldoPendiente === 0 && total > 0) {
    estadoPago = 'Pagado Total';
  } else if (abono > 0) {
    estadoPago = 'Abono Parcial';
  }

  return {
    id: `cc-${cot.id}`,
    numero_cc: numeroCC,
    cotizacion_id: cot.id,
    cotizacion_numero: cot.numero_cot,
    cliente: cot.cliente,
    fecha_emision: new Date().toISOString().slice(0, 10),
    items_resumen: cot.items?.map(i => `${i.nombre_item} (x${i.cantidad})`).join(', ') || 'Piezas 3D',
    total,
    abono,
    saldo_pendiente: saldoPendiente,
    estado_pago: estadoPago,
    metodo_pago: cot.metodo_pago,
    comprobante_url: cot.comprobante_pago
  };
}

describe('quoteApprovalFlow - Critical Commercial Cycle', () => {
  const mockCliente = {
    id: 'cli-01',
    codigo: 10,
    nombre: 'Valeria Restrepo',
    nit_cc: '1098765432',
    telefono: '3157778899',
    correo: 'valeria@example.com'
  };

  it('generates a pending debt account with exact balance on 50% down-payment quote approval', () => {
    const cotizacion: Cotizacion = {
      id: 'cot-101',
      numero_cot: 'COT-0101',
      cliente: mockCliente,
      subtotal: 200000,
      iva_porcentaje: 0,
      descuento_porcentaje: 0,
      total: 200000,
      tiempo_entrega_estimado: '(5) Días hábiles',
      notas: 'Entrega en taller',
      abono: 100000,
      estado: 'Aceptada',
      items: [
        {
          id: 'item-1',
          nombre_item: 'Estatua Dragón 20cm',
          cantidad: 1,
          alto_mm: 200,
          ancho_mm: 120,
          profundidad_mm: 100,
          volumen_cm3: 240,
          peso_estimado_g: 276,
          resina_id: 'res-1',
          resina_nombre: 'Resina Grey 8K',
          maquina_id: 'maq-1',
          maquina_nombre: 'Saturn 3 Ultra',
          tiempo_impresion_min: 350,
          tiempo_desarrollo_min: 20,
          tiempo_armado_min: 15,
          tiempo_pintura_min: 30,
          costo_energia: 2500,
          costo_resina: 38000,
          costo_curado: 3500,
          costo_insumos: 5000,
          costo_mano_obra: 12000,
          costo_modelo_comprado: 0,
          costo_base_produccion: 61000,
          margen_ganancia: 0.50,
          precio_unitario: 200000,
          precio_total: 200000,
          tiempo_entrega: '(5) Días hábiles',
          descripcion_tecnica: 'Figura Resina UV alta definición'
        }
      ],
      vendedor: 'Germán Gómez',
      fecha: '2026-10-20',
      metodo_pago: 'Nequi'
    };

    const cuenta = generarCuentaCobroDesdeCotizacion(cotizacion, 'CC-045');

    expect(cuenta.numero_cc).toBe('CC-045');
    expect(cuenta.cotizacion_numero).toBe('COT-0101');
    expect(cuenta.total).toBe(200000);
    expect(cuenta.abono).toBe(100000);
    expect(cuenta.saldo_pendiente).toBe(100000);
    expect(cuenta.estado_pago).toBe('Abono Parcial');
    expect(cuenta.cliente.nombre).toBe('Valeria Restrepo');
  });

  it('marks account as Pagado Total when abono covers 100% of total', () => {
    const cotizacionTotal: Cotizacion = {
      id: 'cot-102',
      numero_cot: 'COT-0102',
      cliente: mockCliente,
      subtotal: 85000,
      iva_porcentaje: 0,
      descuento_porcentaje: 0,
      total: 85000,
      tiempo_entrega_estimado: '(3) Días hábiles',
      notas: '',
      abono: 85000,
      estado: 'Aceptada',
      items: [],
      vendedor: 'Wendy',
      fecha: '2026-10-20',
      metodo_pago: 'Daviplata'
    };

    const cuenta = generarCuentaCobroDesdeCotizacion(cotizacionTotal, 'CC-046');

    expect(cuenta.total).toBe(85000);
    expect(cuenta.abono).toBe(85000);
    expect(cuenta.saldo_pendiente).toBe(0);
    expect(cuenta.estado_pago).toBe('Pagado Total');
  });

  it('marks account as Pendiente when abono is 0 or undefined', () => {
    const cotizacionSinAbono: Cotizacion = {
      id: 'cot-103',
      numero_cot: 'COT-0103',
      cliente: mockCliente,
      subtotal: 150000,
      iva_porcentaje: 0,
      descuento_porcentaje: 0,
      total: 150000,
      tiempo_entrega_estimado: '(3) Días hábiles',
      notas: '',
      estado: 'Aceptada',
      items: [],
      vendedor: 'Juan',
      fecha: '2026-10-20'
    };

    const cuenta = generarCuentaCobroDesdeCotizacion(cotizacionSinAbono, 'CC-047');

    expect(cuenta.saldo_pendiente).toBe(150000);
    expect(cuenta.estado_pago).toBe('Pendiente');
  });

  describe('validarTransicionEstadoCotizacion', () => {
    it('permits valid linear progression from Borrador to Enviada to Aceptada to Facturada', () => {
      expect(validarTransicionEstadoCotizacion('Borrador', 'Enviada').valida).toBe(true);
      expect(validarTransicionEstadoCotizacion('Enviada', 'Aceptada').valida).toBe(true);
      expect(validarTransicionEstadoCotizacion('Aceptada', 'Facturada').valida).toBe(true);
    });

    it('blocks invalid regression from Facturada to Borrador', () => {
      const res = validarTransicionEstadoCotizacion('Facturada', 'Borrador');
      expect(res.valida).toBe(false);
      expect(res.motivo).toContain('no puede revertirse');
    });

    it('blocks illegal reactivation from Rechazada to Aceptada', () => {
      const res = validarTransicionEstadoCotizacion('Rechazada', 'Aceptada');
      expect(res.valida).toBe(false);
      expect(res.motivo).toContain('no puede aceptarse directamente');
    });
  });
});
