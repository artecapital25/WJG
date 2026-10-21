import { describe, it, expect } from 'vitest';
import { ProductoStock } from '../../types';
import { VentaExpress } from '../../types/pos';

// Pure domain logic functions matching the implementation in App.tsx / posService
export function aplicarDeduccionStock(
  productosStock: ProductoStock[],
  venta: VentaExpress
): ProductoStock[] {
  if (!venta.descontar_stock || !venta.producto_stock_id) {
    return productosStock;
  }

  const cantidad = venta.cantidad_vendida || 1;

  return productosStock.map(p => {
    if (p.id === venta.producto_stock_id) {
      const nuevoStock = Math.max(0, p.stock_actual - cantidad);
      return {
        ...p,
        stock_actual: nuevoStock,
        fecha_actualizacion: new Date().toISOString()
      };
    }
    return p;
  });
}

export function aplicarReposicionStock(
  productosStock: ProductoStock[],
  venta: VentaExpress
): ProductoStock[] {
  if (!venta.descontar_stock || !venta.producto_stock_id) {
    return productosStock;
  }

  const cantidad = venta.cantidad_vendida || 1;

  return productosStock.map(p => {
    if (p.id === venta.producto_stock_id) {
      return {
        ...p,
        stock_actual: p.stock_actual + cantidad,
        fecha_actualizacion: new Date().toISOString()
      };
    }
    return p;
  });
}

describe('inventoryReconciliation - POS & Physical Stock Sync', () => {
  const stockInicial: ProductoStock[] = [
    {
      id: 'prod-001',
      codigo: 'FIG-01',
      nombre: 'Busto Spider-Man 12cm',
      categoria: 'Figuras Pintadas',
      precio_unitario: 45000,
      stock_actual: 5,
      descripcion: 'Busto en resina gris pintado a mano'
    },
    {
      id: 'prod-002',
      codigo: 'FIG-02',
      nombre: 'Llavero Darth Vader',
      categoria: 'Accesorios',
      precio_unitario: 12000,
      stock_actual: 2,
      descripcion: 'Llavero resina negra'
    }
  ];

  it('deducts physical stock correctly when descontar_stock is true', () => {
    const venta: VentaExpress = {
      id: 'v-001',
      numero_venta: 'POS-050',
      fecha_venta: '2026-10-20',
      cliente_nombre: 'Felipe Mora',
      cliente_telefono: '3000000000',
      nombre_producto: 'Busto Spider-Man 12cm',
      total: 90000,
      abono: 90000,
      saldo_pendiente: 0,
      estado_pago: 'Pagado Total',
      metodo_pago: 'efectivo',
      requiere_ot: false,
      producto_stock_id: 'prod-001',
      descontar_stock: true,
      cantidad_vendida: 2
    };

    const stockActualizado = aplicarDeduccionStock(stockInicial, venta);
    const itemActualizado = stockActualizado.find(p => p.id === 'prod-001');

    expect(itemActualizado?.stock_actual).toBe(3); // 5 - 2 = 3
    expect(itemActualizado?.fecha_actualizacion).toBeDefined();

    // Verify other items remain unchanged
    const otroItem = stockActualizado.find(p => p.id === 'prod-002');
    expect(otroItem?.stock_actual).toBe(2);
  });

  it('prevents negative stock (clamps to 0)', () => {
    const venta: VentaExpress = {
      id: 'v-002',
      numero_venta: 'POS-051',
      fecha_venta: '2026-10-20',
      cliente_nombre: 'Santiago Gómez',
      cliente_telefono: '3000000001',
      nombre_producto: 'Llavero Darth Vader',
      total: 48000,
      abono: 48000,
      saldo_pendiente: 0,
      estado_pago: 'Pagado Total',
      metodo_pago: 'nequi',
      requiere_ot: false,
      producto_stock_id: 'prod-002',
      descontar_stock: true,
      cantidad_vendida: 5 // Only 2 in stock
    };

    const stockActualizado = aplicarDeduccionStock(stockInicial, venta);
    const itemActualizado = stockActualizado.find(p => p.id === 'prod-002');

    expect(itemActualizado?.stock_actual).toBe(0);
  });

  it('does NOT alter stock when descontar_stock is false or undefined', () => {
    const venta: VentaExpress = {
      id: 'v-003',
      numero_venta: 'POS-052',
      fecha_venta: '2026-10-20',
      cliente_nombre: 'Ana Beltrán',
      cliente_telefono: '3000000002',
      nombre_producto: 'Busto Spider-Man 12cm',
      total: 45000,
      abono: 45000,
      saldo_pendiente: 0,
      estado_pago: 'Pagado Total',
      metodo_pago: 'daviplata',
      requiere_ot: false,
      producto_stock_id: 'prod-001',
      descontar_stock: false,
      cantidad_vendida: 1
    };

    const stockActualizado = aplicarDeduccionStock(stockInicial, venta);
    const itemActualizado = stockActualizado.find(p => p.id === 'prod-001');

    expect(itemActualizado?.stock_actual).toBe(5);
  });

  it('restocks inventory when a sale is canceled or deleted', () => {
    const stockAntesDeBorrar: ProductoStock[] = [
      {
        id: 'prod-001',
        nombre: 'Busto Spider-Man 12cm',
        categoria: 'Figuras Pintadas',
        precio_unitario: 45000,
        stock_actual: 3 // was reduced from 5 to 3
      }
    ];

    const ventaEliminada: VentaExpress = {
      id: 'v-001',
      numero_venta: 'POS-050',
      fecha_venta: '2026-10-20',
      cliente_nombre: 'Felipe Mora',
      cliente_telefono: '3000000000',
      nombre_producto: 'Busto Spider-Man 12cm',
      total: 90000,
      abono: 90000,
      saldo_pendiente: 0,
      estado_pago: 'Pagado Total',
      metodo_pago: 'efectivo',
      requiere_ot: false,
      producto_stock_id: 'prod-001',
      descontar_stock: true,
      cantidad_vendida: 2
    };

    const stockRepuesto = aplicarReposicionStock(stockAntesDeBorrar, ventaEliminada);
    const itemRepuesto = stockRepuesto.find(p => p.id === 'prod-001');

    expect(itemRepuesto?.stock_actual).toBe(5); // 3 + 2 = 5
  });
});
