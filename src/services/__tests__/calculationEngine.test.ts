import { describe, it, expect } from 'vitest';
import {
  calcularCotizacionIntegral,
  calcularPrecioVentaUnificado,
  recalcularPiezaPorModoMargen,
  ParametrosPiezaInput
} from '../calculationEngine';
import { ConfiguracionTaller, Filamento, Insumo, Maquina, Personal, Resina } from '../../types';

const mockConfig: ConfiguracionTaller = {
  tarifa_kwh: 834,
  margen_merma_resina: 1.4,
  margen_merma_fdm: 1.15,
  telefono_contacto: '3000000000',
  telefono_contacto2: '3000000001',
  instagram: '@wjgeeks',
  nequi: '3000000000',
  titular_cuenta: 'WJGEEKS',
  tasa_fallo_sla_pct: 8,
  tasa_fallo_fdm_pct: 5,
  gastos_fijos_mensuales: 800000,
  horas_facturables_mes: 160,
  consumibles_sla_por_impresion: 1500,
  precio_minimo_trabajo: 15000,
  comision_pasarela_default_pct: 0,
  modo_margen_default: 'margen_bruto',
  piso_margen_alerta_pct: 20
};

const mockResina: Resina = {
  id: 'res-1',
  tipo: 'Standard',
  marca: 'Anycubic',
  color: 'Grey',
  volumen_l: 1,
  densidad_g_cm3: 1.1,
  peso_g: 1000,
  precio_compra: 140000,
  costo_gramo: 140,
  velocidad_impresion_mm_h: 25,
  resumen: 'Resina estándar'
};

const mockFilamento: Filamento = {
  id: 'fil-1',
  marca: 'Bambu Lab',
  tipo: 'PLA',
  color: 'Matte Black',
  peso_bobina_g: 1000,
  precio_compra: 95000,
  costo_gramo: 95,
  stock_actual_g: 1000,
  activo: true
};

const mockMaquinaSLA: Maquina = {
  id: 'maq-sla',
  nombre: 'Anycubic Photon Mono 4',
  tipo: 'Impresora Resina SLA',
  tecnologia: 'SLA_RESINA',
  consumo_kwh: 0.08,
  costo_minuto: 35,
  estado: 'Disponible',
  precio_compra: 1600000,
  vida_util_horas: 2000,
  mantenimiento_mensual: 40000
};

const mockMaquinaFDM: Maquina = {
  id: 'maq-fdm',
  nombre: 'Bambu Lab P1S',
  tipo: 'Impresora Filamento FDM',
  tecnologia: 'FDM_FILAMENTO',
  consumo_kwh: 0.15,
  costo_minuto: 25,
  estado: 'Disponible'
};

const mockPersonal: Personal[] = [
  { id: 'pers-dev', rol: 'Diseño y Desarrollo 3D', costo_hora: 12000, costo_minuto: 200 },
  { id: 'pers-pint', rol: 'Pintura y Acabados', costo_hora: 18000, costo_minuto: 300 }
];

const mockInsumos: Record<string, Insumo> = {
  herraje: {
    id: 'ins-herr',
    codigo: 1,
    nombre: 'Argolla llavero metálica',
    marca: 'Genérica',
    categoria: 'Herrajes',
    presentacion: 100,
    costo_total: 25000,
    costo_unitario: 250
  },
  cinta: {
    id: 'ins-cinta',
    codigo: 2,
    nombre: 'Cinta doble faz 3M rollo',
    marca: '3M',
    categoria: 'Adhesivos',
    presentacion: 1,
    costo_total: 20000,
    costo_unitario: 20000
  },
  empaque: {
    id: 'ins-caja',
    codigo: 3,
    nombre: 'Caja + Tarjeta Colección',
    marca: 'WJG',
    categoria: 'Empaques',
    presentacion: 1,
    costo_total: 3500,
    costo_unitario: 3500
  },
  pintura: {
    id: 'ins-pint',
    codigo: 4,
    nombre: 'Acrílico Vallejo Negro',
    marca: 'Vallejo',
    categoria: 'Pinturas',
    presentacion: 17,
    costo_total: 17000,
    costo_unitario: 1000
  }
};

describe('calculationEngine - Motor Cotizador 2.0', () => {
  it('calcula Margen Bruto vs Markup correctamente y evita Infinity / negativos en >= 100%', () => {
    const res40Bruto = calcularPrecioVentaUnificado({
      costoBase: 60000,
      margen: 0.40,
      modoMargen: 'margen_bruto',
      comisionPct: 0
    });
    expect(res40Bruto.precioMargenBruto).toBe(100000); // 60000 / (1 - 0.40)
    expect(res40Bruto.precioMarkup).toBe(84000); // 60000 * 1.40
    expect(res40Bruto.precioActivo).toBe(100000);

    const res40Markup = calcularPrecioVentaUnificado({
      costoBase: 60000,
      margen: 0.40,
      modoMargen: 'markup',
      comisionPct: 0
    });
    expect(res40Markup.precioActivo).toBe(84000);

    // Protección clamp <= 90% en Margen Bruto (nunca Infinity ni precio negativo aunque margen >= 1)
    const resExtremo = calcularPrecioVentaUnificado({
      costoBase: 50000,
      margen: 1.50,
      modoMargen: 'margen_bruto',
      comisionPct: 5
    });
    expect(Number.isFinite(resExtremo.precioMargenBruto)).toBe(true);
    expect(resExtremo.precioMargenBruto).toBeGreaterThan(50000);
  });

  it('calcula Ganancia Inversa ($ COP fijos deseados) descontando comisión pasarela', () => {
    const res = calcularPrecioVentaUnificado({
      costoBase: 40000,
      margen: 0.40,
      tipoObjetivoPrecio: 'ganancia_fija',
      gananciaDeseadaCop: 30000,
      comisionPct: 5
    });
    // Precio >= (40000 + 30000) / 0.95 = 73684 -> 73700
    expect(res.precioGananciaFija).toBe(73700);
    expect(res.precioActivo).toBe(73700);
    expect(res.utilidadNeta).toBeGreaterThanOrEqual(29900);
  });

  it('prorratea Archivo 3D y Diseño 3D entre lotes (N=50) manteniendo Herrajes (% y und), Cajas y Pinturas al 100% por figura', () => {
    const baseInput: ParametrosPiezaInput = {
      nombre_item: 'Llavero Colección',
      cantidad: 50,
      alto_mm: 70,
      ancho_mm: 40,
      profundidad_mm: 30,
      tecnologia: 'SLA_RESINA',
      resina: mockResina,
      impresora: mockMaquinaSLA,
      modoCalculoResina: 'manual',
      pesoResinaManualG: 20,
      tiempoImpresionModo: 'manual',
      tiempoImpresionManualMin: 60,
      tiempoDesarrolloMin: 100, // 100 * 200 = 20000 total -> / 50 = 400 c/u
      tiempoArmadoMin: 2,
      tiempoPinturaMin: 5,
      accesorios: [
        { insumo: mockInsumos.herraje, cantidad: 1, modo_consumo: 'unidad', valor_entrada: 1 }, // 250 c/u
        { insumo: mockInsumos.cinta, cantidad: 0.05, modo_consumo: 'porcentaje', valor_entrada: 5 } // 5% de 20000 = 1000 c/u
      ],
      pinturas: [{ insumo: mockInsumos.pintura, cantidad_ml: 2 }], // 2000 c/u
      empaques: [{ insumo: mockInsumos.empaque, cantidad: 1 }], // 3500 c/u
      costoModeloComprado: 50000, // / 50 = 1000 c/u
      prorratearArchivo3D: true,
      prorratearDiseno3D: true,
      margenGanancia: 0.40,
      modoMargen: 'margen_bruto',
      aplicaDescuentoVolumen: false
    };

    const lote = calcularCotizacionIntegral(baseInput, mockPersonal, mockConfig);
    expect(lote.costo_modelo_comprado).toBe(1000);
    expect(lote.costo_diseno_unitario).toBe(400);
    // Herrajes 250 + 1000 = 1250 intacto por cada figura (NO /50)
    expect(lote.costo_herrajes_total).toBe(1250);
    // Empaque 3500 intacto por cada figura
    expect(lote.costo_empaque).toBe(3500);
    // Pintura 2000 intacto por cada figura
    expect(lote.costo_pinturas_total).toBe(2000);
  });

  it('mantiene coherencia exacta en desglose_apartados y soporta paridad FDM con AMS + recalcularPiezaPorModoMargen', () => {
    const fdmInput: ParametrosPiezaInput = {
      nombre_item: 'Busto Multicolor PLA',
      cantidad: 1,
      alto_mm: 150,
      ancho_mm: 90,
      profundidad_mm: 90,
      tecnologia: 'FDM_FILAMENTO',
      resina: mockResina,
      filamentoSeleccionado: mockFilamento,
      pesoFilamentoG: 120,
      costoRolloKg: 95000,
      tiempoFDMMin: 240,
      impresora: mockMaquinaFDM,
      amsActivo: true,
      amsColores: 4,
      amsPurgaPct: 15,
      tiempoDesarrolloMin: 30,
      tiempoArmadoMin: 10,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      empaques: [],
      costoModeloComprado: 0,
      margenGanancia: 0.50,
      modoMargen: 'margen_bruto',
      tasaFalloPct: 5,
      aplicaDescuentoVolumen: false
    };

    const pieza = calcularCotizacionIntegral(fdmInput, mockPersonal, mockConfig);
    expect(pieza.tecnologia).toBe('FDM_FILAMENTO');
    expect(pieza.ams_purga_gramos).toBe(18); // 15% de 120g
    expect(pieza.desglose_apartados && pieza.desglose_apartados.length).toBeGreaterThan(0);

    const sumaCostos = Math.round(
      (pieza.desglose_apartados || []).reduce((acc, ap) => acc + ap.costoUnitario, 0)
    );
    expect(Math.abs(sumaCostos - pieza.costo_base_produccion)).toBeLessThanOrEqual(5);

    const switchMarkup = recalcularPiezaPorModoMargen(pieza, 'markup');
    expect(switchMarkup.modo_margen).toBe('markup');
    expect(switchMarkup.precio_unitario).toBe(pieza.precio_con_markup);
    expect(switchMarkup.precio_unitario).toBeLessThan(pieza.precio_con_margen_bruto || 0);
  });
});
