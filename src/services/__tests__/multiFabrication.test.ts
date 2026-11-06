import { describe, it, expect } from 'vitest';
import { 
  calcularPieza3D, 
  calcularPiezaFDM, 
  calcularPiezaLaser, 
  calcularPiezaCNC, 
  calcularCotizacionIntegral,
  ParametrosPiezaInput 
} from '../calculationEngine';
import { Resina, Maquina, Personal, ConfiguracionTaller, PiezaCotizada } from '../../types';

describe('Multi-Fabricación: Motor de Cálculo Polimórfico (SLA, FDM, Láser, CNC)', () => {
  const dummyPersonal: Personal[] = [
    {
      id: 'per-1',
      rol: 'Operario Principal',
      costo_minuto: 130.21,
      costo_hora: 7812.5
    }
  ];

  const dummyConfig: ConfiguracionTaller = {
    tarifa_kwh: 834.0,
    margen_merma_resina: 1.40,
    telefono_contacto: '3001234567',
    telefono_contacto2: '3007654321',
    instagram: '@wjgeeks3d',
    nequi: '3001234567',
    titular_cuenta: 'WJGEEKS 3D PRO'
  };

  const dummyMaquinaSLA: Maquina = {
    id: 'maq-sla-1',
    nombre: 'Anycubic Photon Mono 4K',
    tipo: 'SLA 3D Printer',
    costo_minuto: 75,
    consumo_kwh: 0.055,
    estado: 'operativa'
  };

  const dummyMaquinaFDM: Maquina = {
    id: 'maq-fdm-1',
    nombre: 'Bambu Lab P1S',
    tipo: 'FDM 3D Printer',
    costo_minuto: 100,
    consumo_kwh: 0.18,
    estado: 'operativa'
  };

  const dummyMaquinaLaser: Maquina = {
    id: 'maq-laser-1',
    nombre: 'Láser CO2 80W 6040',
    tipo: 'Laser Cutter CO2',
    costo_minuto: 300,
    consumo_kwh: 0.8,
    estado: 'operativa'
  };

  const dummyResina: Resina = {
    id: 'res-1',
    tipo: 'Resina Estándar Gris',
    marca: 'Anycubic',
    color: 'Gris',
    volumen_l: 1,
    peso_g: 1150,
    precio_compra: 135000,
    costo_gramo: 135,
    densidad_g_cm3: 1.15,
    velocidad_impresion_mm_h: 20,
    resumen: 'Resina fotopolimérica UV 405nm'
  };

  it('1. Debe calcular correctamente una pieza SLA Resina con lavado y curado UV', () => {
    const inputSLA: ParametrosPiezaInput = {
      nombre_item: 'Estatua Dragón SLA',
      cantidad: 1,
      alto_mm: 120,
      ancho_mm: 60,
      profundidad_mm: 60,
      resina: dummyResina,
      impresora: dummyMaquinaSLA,
      tecnologia: 'SLA_RESINA',
      tiempoDesarrolloMin: 15,
      tiempoArmadoMin: 10,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.40
    };

    const resultado = calcularCotizacionIntegral(inputSLA, dummyPersonal, dummyConfig);

    expect(resultado.tecnologia).toBe('SLA_RESINA');
    expect(resultado.precio_unitario).toBeGreaterThan(0);
    expect(resultado.precio_total).toBe(resultado.precio_unitario);
    expect(resultado.costo_resina).toBeGreaterThan(0);
    expect(resultado.costo_curado).toBeGreaterThan(0);
  });

  it('2. Debe calcular correctamente una pieza FDM con filamento PLA y descuento por volumen', () => {
    const inputFDM: ParametrosPiezaInput = {
      nombre_item: 'Soporte Mecánico FDM',
      cantidad: 10, // Debe aplicar descuento por volumen (>= 6 unidades -> 10%)
      alto_mm: 80,
      ancho_mm: 80,
      profundidad_mm: 30,
      resina: dummyResina,
      impresora: dummyMaquinaFDM,
      tecnologia: 'FDM_FILAMENTO',
      materialFilamento: 'PLA+',
      pesoFilamentoG: 65,
      costoRolloKg: 85000,
      tiempoFDMMin: 150,
      tiempoDesarrolloMin: 10,
      tiempoArmadoMin: 5,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.40,
      aplicaDescuentoVolumen: true
    };

    const resultado = calcularCotizacionIntegral(inputFDM, dummyPersonal, dummyConfig);

    expect(resultado.tecnologia).toBe('FDM_FILAMENTO');
    expect(resultado.material_filamento).toBe('PLA+');
    expect(resultado.peso_filamento_g).toBe(65);
    expect(resultado.aplica_descuento_volumen).toBe(true);
    expect(resultado.descuento_volumen_porcentaje).toBe(10);
    expect(resultado.precio_unitario).toBeLessThan(resultado.precio_unitario_original || Infinity);
    expect(resultado.precio_total).toBe(resultado.precio_unitario * 10);
  });

  it('3. Debe calcular correctamente un trabajo de Corte Láser CO2 en Acrílico', () => {
    const inputLaser: ParametrosPiezaInput = {
      nombre_item: 'Letrero Acrílico Grabado',
      cantidad: 2,
      alto_mm: 200,
      ancho_mm: 300,
      profundidad_mm: 3,
      resina: dummyResina,
      impresora: dummyMaquinaLaser,
      tecnologia: 'CORTE_LASER',
      materialLamina: 'Acrílico Cristal 3mm',
      espesorLaminaMm: 3,
      tiempoLaserMin: 18,
      tipoProcesoLaser: 'corte',
      tiempoDesarrolloMin: 20,
      tiempoArmadoMin: 10,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.40
    };

    const resultado = calcularCotizacionIntegral(inputLaser, dummyPersonal, dummyConfig);

    expect(resultado.tecnologia).toBe('CORTE_LASER');
    expect(resultado.material_lamina).toBe('Acrílico Cristal 3mm');
    expect(resultado.espesor_lamina_mm).toBe(3);
    expect(resultado.tiempo_laser_min).toBe(18);
    expect(resultado.precio_unitario).toBeGreaterThan(0);
    expect(resultado.precio_total).toBe(resultado.precio_unitario * 2);
  });

  it('4. Debe calcular correctamente una pieza de Router CNC en Madera Cedro', () => {
    const inputCNC: ParametrosPiezaInput = {
      nombre_item: 'Relieve Tallado en Madera CNC',
      cantidad: 1,
      alto_mm: 150,
      ancho_mm: 150,
      profundidad_mm: 25,
      resina: dummyResina,
      impresora: dummyMaquinaLaser,
      tecnologia: 'CNC_ROUTER',
      materialBloque: 'Madera Cedro',
      costoBloqueMaterial: 45000,
      tiempoMecanizadoMin: 60,
      tiempoDesarrolloMin: 15,
      tiempoArmadoMin: 15,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.40
    };

    const resultado = calcularCotizacionIntegral(inputCNC, dummyPersonal, dummyConfig);

    expect(resultado.tecnologia).toBe('CNC_ROUTER');
    expect(resultado.material_bloque).toBe('Madera Cedro');
    expect(resultado.tiempo_mecanizado_min).toBe(60);
    expect(resultado.costo_resina).toBe(45000); // Costo del material bloque
    expect(resultado.precio_unitario).toBeGreaterThan(45000);
  });

  it('5. Debe permitir combinar ítems de múltiples tecnologías en una sola orden con subtotales e IVA', () => {
    const itemSLA: PiezaCotizada = calcularCotizacionIntegral({
      nombre_item: 'Figura Coleccionable',
      cantidad: 2,
      alto_mm: 100,
      ancho_mm: 50,
      profundidad_mm: 50,
      resina: dummyResina,
      impresora: dummyMaquinaSLA,
      tecnologia: 'SLA_RESINA',
      tiempoDesarrolloMin: 10,
      tiempoArmadoMin: 10,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.40
    }, dummyPersonal, dummyConfig);

    const itemLaser: PiezaCotizada = calcularCotizacionIntegral({
      nombre_item: 'Base Acrílica Iluminada',
      cantidad: 2,
      alto_mm: 100,
      ancho_mm: 100,
      profundidad_mm: 4,
      resina: dummyResina,
      impresora: dummyMaquinaLaser,
      tecnologia: 'CORTE_LASER',
      materialLamina: 'Acrílico Humo 4mm',
      tiempoLaserMin: 8,
      tiempoDesarrolloMin: 5,
      tiempoArmadoMin: 5,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.40
    }, dummyPersonal, dummyConfig);

    const ordenItems = [itemSLA, itemLaser];

    const subtotalCombinado = ordenItems.reduce((acc, it) => acc + it.precio_total, 0);
    const ivaPorcentaje = 0; // Régimen simple
    const ivaMonto = Math.round(subtotalCombinado * (ivaPorcentaje / 100));
    const totalFinal = subtotalCombinado + ivaMonto;

    expect(ordenItems.length).toBe(2);
    expect(ordenItems[0].tecnologia).toBe('SLA_RESINA');
    expect(ordenItems[1].tecnologia).toBe('CORTE_LASER');
    expect(subtotalCombinado).toBe(itemSLA.precio_total + itemLaser.precio_total);
    expect(totalFinal).toBe(subtotalCombinado);
    expect(ivaMonto).toBe(0);
  });
});
