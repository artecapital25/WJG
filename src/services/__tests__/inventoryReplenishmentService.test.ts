import { describe, it, expect } from 'vitest';
import {
  detectarYCrearSolicitudesStockBajo,
  calcularReabastecimientoAlRecibir,
  UMBRAL_STOCK_BAJO_RESINA_G,
  UMBRAL_STOCK_BAJO_FILAMENTO_G
} from '../inventoryReplenishmentService';
import { Filamento, Insumo, Resina, SolicitudInsumo } from '../../types';

const baseResina: Resina = {
  id: 'res-1',
  tipo: 'Standard',
  marca: 'Anycubic',
  color: 'Gris',
  volumen_l: 1,
  densidad_g_cm3: 1.13,
  peso_g: 150,
  precio_compra: 89000,
  costo_gramo: 78.76,
  velocidad_impresion_mm_h: 20,
  resumen: 'Anycubic Standard Gris'
};

const baseFilamento: Filamento = {
  id: 'fil-1',
  marca: 'Bambu Lab',
  tipo: 'PLA Matte',
  color: 'Negro',
  peso_bobina_g: 1000,
  precio_compra: 95000,
  costo_gramo: 95,
  stock_actual_g: 0,
  enlace_compra: 'https://store.bambulab.com/pla',
  activo: true
};

const baseInsumo: Insumo = {
  id: 'ins-1',
  codigo: 10,
  nombre: 'Guantes Nitrilo Negros',
  marca: 'WJG',
  categoria: 'Consumibles SLA',
  presentacion: 50,
  stock_actual: 1,
  unidad_medida: 'pares',
  costo_total: 25000,
  costo_unitario: 500
};

describe('inventoryReplenishmentService', () => {
  it('genera solicitudes automáticas cuando resina, filamento o insumo caen bajo umbral', () => {
    const nuevas = detectarYCrearSolicitudesStockBajo({
      resinasAfectadas: [{ ...baseResina, peso_g: UMBRAL_STOCK_BAJO_RESINA_G - 20 }],
      filamentosAfectados: [{ ...baseFilamento, stock_actual_g: 0 }],
      insumosAfectados: [baseInsumo],
      solicitudesExistentes: [],
      origenNota: 'OT-099'
    });

    expect(nuevas).toHaveLength(3);

    const solRes = nuevas.find(s => s.catalogo_tipo === 'resina');
    expect(solRes?.urgencia).toBe('urgente');
    expect(solRes?.origen_tipo).toBe('auto_stock_bajo');
    expect(solRes?.catalogo_item_id).toBe('res-1');

    const solFil = nuevas.find(s => s.catalogo_tipo === 'filamento');
    expect(solFil?.urgencia).toBe('taller_detenido');
    expect(solFil?.enlace_compra).toBe('https://store.bambulab.com/pla');

    const solIns = nuevas.find(s => s.catalogo_tipo === 'insumo');
    expect(solIns?.catalogo_item_id).toBe('ins-1');
  });

  it('evita duplicados si ya existe una orden abierta para el mismo ítem', () => {
    const ordenAbierta: SolicitudInsumo = {
      id: 'sos-existing',
      insumo_nombre: 'Anycubic Standard Gris',
      cantidad: 1,
      unidad: 'botellas',
      urgencia: 'urgente',
      solicitado_por: 'Juan',
      encargado_compra: 'Wendy',
      estado: 'en_camino',
      fecha_solicitud: '2026-11-23',
      catalogo_tipo: 'resina',
      catalogo_item_id: 'res-1'
    };

    const nuevas = detectarYCrearSolicitudesStockBajo({
      resinasAfectadas: [{ ...baseResina, peso_g: 50 }],
      filamentosAfectados: [{ ...baseFilamento, stock_actual_g: UMBRAL_STOCK_BAJO_FILAMENTO_G + 300 }],
      solicitudesExistentes: [ordenAbierta]
    });

    expect(nuevas).toHaveLength(0);
  });

  it('reabastece resina en botellas ➔ gramos, filamento en bobinas ➔ gramos e insumo en unidades, sin duplicar', () => {
    const solRes: SolicitudInsumo = {
      id: 'sos-r1',
      insumo_nombre: 'Anycubic Standard Gris',
      cantidad: 2,
      unidad: 'botellas',
      urgencia: 'urgente',
      solicitado_por: 'Sistema',
      encargado_compra: 'Wendy',
      estado: 'recibido',
      fecha_solicitud: '2026-11-23',
      catalogo_tipo: 'resina',
      catalogo_item_id: 'res-1',
      stock_reabastecido: false
    };

    const resReab = calcularReabastecimientoAlRecibir(solRes, {
      resinas: [baseResina],
      filamentos: [baseFilamento],
      insumos: [baseInsumo]
    });
    expect(resReab.aplicado).toBe(true);
    expect(resReab.resinaActualizada?.peso_g).toBe(150 + 2 * 1130);

    // Protección doble reabastecimiento
    const resDuplicado = calcularReabastecimientoAlRecibir(
      { ...solRes, stock_reabastecido: true },
      { resinas: [baseResina], filamentos: [baseFilamento], insumos: [baseInsumo] }
    );
    expect(resDuplicado.aplicado).toBe(false);

    const solFil: SolicitudInsumo = {
      ...solRes,
      id: 'sos-f1',
      insumo_nombre: 'Bambu Lab PLA Matte Negro',
      cantidad: 1,
      unidad: 'bobinas',
      catalogo_tipo: 'filamento',
      catalogo_item_id: 'fil-1'
    };
    const filReab = calcularReabastecimientoAlRecibir(solFil, {
      resinas: [baseResina],
      filamentos: [baseFilamento],
      insumos: [baseInsumo]
    });
    expect(filReab.aplicado).toBe(true);
    expect(filReab.filamentoActualizado?.stock_actual_g).toBe(1000);

    const solIns: SolicitudInsumo = {
      ...solRes,
      id: 'sos-i1',
      insumo_nombre: 'Guantes Nitrilo Negros',
      cantidad: 25,
      unidad: 'pares',
      catalogo_tipo: 'insumo',
      catalogo_item_id: 'ins-1'
    };
    const insReab = calcularReabastecimientoAlRecibir(solIns, {
      resinas: [baseResina],
      filamentos: [baseFilamento],
      insumos: [baseInsumo]
    });
    expect(insReab.aplicado).toBe(true);
    expect(insReab.insumoActualizado?.stock_actual).toBe(26);
  });
});
