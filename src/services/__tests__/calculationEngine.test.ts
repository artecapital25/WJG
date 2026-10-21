import { describe, it, expect } from 'vitest';
import { calcularPieza3D, ParametrosPiezaInput } from '../calculationEngine';
import { Resina, Maquina, Personal, ConfiguracionTaller, Insumo } from '../../types';

describe('calculationEngine - calcularPieza3D', () => {
  const mockResina: Resina = {
    id: 'res-01',
    tipo: 'Standard 8K',
    marca: 'Elegoo',
    color: 'Space Grey',
    volumen_l: 1,
    densidad_g_cm3: 1.15,
    peso_g: 1150,
    precio_compra: 135000,
    costo_gramo: 117.39,
    velocidad_impresion_mm_h: 30,
    resumen: 'Elegoo Standard 8K Grey'
  };

  const mockImpresora: Maquina = {
    id: 'maq-01',
    nombre: 'Elegoo Saturn 3 Ultra',
    tipo: 'MSLA Resina',
    consumo_kwh: 0.1,
    costo_minuto: 6.255,
    estado: 'operativa'
  };

  const mockEstacionCurado: Maquina = {
    id: 'cur-01',
    nombre: 'Elegoo Mercury Plus 2.0',
    tipo: 'Wash & Cure',
    consumo_kwh: 0.08,
    costo_minuto: 5.004,
    estado: 'operativa'
  };

  const mockInsumoAlcohol: Insumo = {
    id: 'ins-01',
    codigo: 101,
    nombre: 'Alcohol Isopropílico 99%',
    marca: 'Químicos Global',
    categoria: 'Solventes',
    presentacion: 1000,
    costo_total: 10270,
    costo_unitario: 10.27
  };

  const mockPersonal: Personal[] = [
    { id: 'per-01', rol: 'Desarrollador 3D', costo_hora: 10000, costo_minuto: 166.67 },
    { id: 'per-02', rol: 'Pintor / Acabados', costo_hora: 10000, costo_minuto: 166.67 }
  ];

  const mockConfig: ConfiguracionTaller = {
    tarifa_kwh: 900,
    margen_merma_resina: 1.40,
    telefono_contacto: '3001234567',
    telefono_contacto2: '3009876543',
    instagram: '@wjgeeks3d',
    nequi: '3001234567',
    daviplata: '3001234567',
    bancolombia: '123456789',
    titular_cuenta: 'Germán Gómez'
  };

  it('calculates solid piece correctly (volume, weight, resin cost with merma)', () => {
    const input: ParametrosPiezaInput = {
      nombre_item: 'Figura Batman 15cm',
      cantidad: 1,
      alto_mm: 150,
      ancho_mm: 60,
      profundidad_mm: 40,
      resina: mockResina,
      impresora: mockImpresora,
      requiereCurado: true,
      estacionCurado: mockEstacionCurado,
      insumoCurado: mockInsumoAlcohol,
      tiempoDesarrolloMin: 15,
      tiempoArmadoMin: 10,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.45,
      tipoEstructura: 'solido'
    };

    const resultado = calcularPieza3D(input, mockPersonal, mockConfig);

    // Volumen cm3: (150 * 60 * 40) / 1000 = 360 cm3
    expect(resultado.volumen_cm3).toBe(360);

    // Peso estimado sólido: 360 * 1.15 = 414g
    expect(resultado.peso_estimado_g).toBe(414);

    // Tiempo impresión: (150 / 30) * 60 = 300 min
    expect(resultado.tiempo_impresion_min).toBe(300);

    // Costo energía impresión: 300 * 6.255 = 1876.5
    // Curado: peso >= 250g -> 15 min * 5.004 = 75.06
    // Energía total redondeada
    expect(resultado.costo_energia).toBeGreaterThan(1900);

    // Costo resina: 414 * 117.39 * 1.40 = ~68,039 COP
    expect(resultado.costo_resina).toBeGreaterThan(65000);

    // Precio unitario debe estar redondeado a centenas COP exactas (ej. divisible entre 100)
    expect(resultado.precio_unitario % 100).toBe(0);
    expect(resultado.precio_total).toBe(resultado.precio_unitario * input.cantidad);
    expect(resultado.tipo_estructura).toBe('solido');
  });

  it('calculates hollow (ahuecado) piece with custom ratio (35%) correctly', () => {
    const input: ParametrosPiezaInput = {
      nombre_item: 'Busto Ahuecado',
      cantidad: 2,
      alto_mm: 100,
      ancho_mm: 50,
      profundidad_mm: 50,
      resina: mockResina,
      impresora: mockImpresora,
      requiereCurado: true,
      estacionCurado: mockEstacionCurado,
      insumoCurado: mockInsumoAlcohol,
      tiempoDesarrolloMin: 10,
      tiempoArmadoMin: 10,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.40,
      tipoEstructura: 'ahuecado',
      porcentajeRelleno: 35
    };

    const resultado = calcularPieza3D(input, mockPersonal, mockConfig);

    // Volumen cm3: (100 * 50 * 50) / 1000 = 250 cm3
    expect(resultado.volumen_cm3).toBe(250);

    // Peso con relleno 35%: 250 * 1.15 * 0.35 = 100.625 -> 100.63g
    expect(resultado.peso_estimado_g).toBeCloseTo(100.63, 1);
    expect(resultado.tipo_estructura).toBe('ahuecado');
    expect(resultado.porcentaje_relleno).toBe(35);
  });

  it('handles manual resin weight override mode', () => {
    const input: ParametrosPiezaInput = {
      nombre_item: 'Pieza Peso Manual',
      cantidad: 1,
      alto_mm: 80,
      ancho_mm: 30,
      profundidad_mm: 30,
      resina: mockResina,
      impresora: mockImpresora,
      requiereCurado: false,
      tiempoDesarrolloMin: 0,
      tiempoArmadoMin: 0,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.30,
      modoCalculoResina: 'manual',
      pesoResinaManualG: 45
    };

    const resultado = calcularPieza3D(input, mockPersonal, mockConfig);

    expect(resultado.peso_estimado_g).toBe(45);
    // En modo manual, el factor de soporte/merma es 1.10
    // 45 * 117.39 * 1.10 = 5810.8 COP
    expect(resultado.costo_resina).toBe(Math.round(45 * mockResina.costo_gramo * 1.10));
  });

  it('handles partial / pending data gracefully without NaN', () => {
    const input: ParametrosPiezaInput = {
      nombre_item: 'Proyecto por Confirmar',
      cantidad: 1,
      alto_mm: 0,
      ancho_mm: 0,
      profundidad_mm: 0,
      resina: mockResina,
      impresora: mockImpresora,
      tiempoDesarrolloMin: 0,
      tiempoArmadoMin: 0,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.40,
      datosPendientes: true
    };

    const resultado = calcularPieza3D(input, mockPersonal, mockConfig);

    expect(resultado.datos_pendientes).toBe(true);
    expect(Number.isNaN(resultado.precio_unitario)).toBe(false);
    expect(Number.isNaN(resultado.costo_base_produccion)).toBe(false);
    expect(resultado.descripcion_tecnica).toContain('Dimensiones: [Pendiente de verificar');
  });

  it('applies fixed tariff pricing when specified', () => {
    const input: ParametrosPiezaInput = {
      nombre_item: 'Figura Tamaño Mini Tarifa Fija',
      cantidad: 1,
      alto_mm: 50,
      ancho_mm: 30,
      profundidad_mm: 30,
      resina: mockResina,
      impresora: mockImpresora,
      tiempoDesarrolloMin: 5,
      tiempoArmadoMin: 5,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.40,
      precioFijadoTarifa: true,
      precioUnitarioManual: 35000,
      tarifaTamanoAplicada: {
        altura_cm: 5,
        precio_sugerido: 35000
      }
    };

    const resultado = calcularPieza3D(input, mockPersonal, mockConfig);

    expect(resultado.precio_unitario).toBe(35000);
    expect(resultado.precio_fijado_tarifa).toBe(true);
    expect(resultado.tarifa_tamano_aplicada?.precio_sugerido).toBe(35000);
  });
});
