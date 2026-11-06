import { describe, it, expect, beforeEach } from 'vitest';

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createStorageMock() as any;
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: globalThis.localStorage,
    dispatchEvent: () => true
  };
} else if (!(globalThis as any).window.dispatchEvent) {
  (globalThis as any).window.dispatchEvent = () => true;
}

import { 
  calcularCotizacionIntegral, 
  calcularTotalesCotizacion,
  formatearLineaIVA,
  LEYENDA_IVA_CERO
} from '../../features/cotizador/utils/pricingCalculator';
import { 
  crearDocPDFCotizacion, 
  crearDocPDFCuentaCobro, 
  crearDocPDFReciboPOS 
} from '../pdfService';
import { 
  generateCotizacionWhatsAppText, 
  generateCuentaCobroWhatsAppText 
} from '../whatsappService';
import { generarTextoComprobantePOS } from '../posService';
import { StorageService } from '../storageService';
import { 
  Cotizacion, 
  CuentaCobro, 
  PiezaCotizada, 
  Personal, 
  ConfiguracionTaller, 
  Maquina, 
  Resina, 
  Cliente 
} from '../../types';
import { VentaExpress } from '../../types/pos';

describe('Auditoría Integral E2E: Front - Back - Documentos - Supabase Snapshot', () => {
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
    telefono_contacto: '3202796115',
    telefono_contacto2: '3202796115',
    instagram: '@wjgeeks3d',
    nequi: '3202796115',
    titular_cuenta: 'WJGEEKS 3D PRO'
  };

  const dummySLA: Maquina = {
    id: 'maq-sla-1',
    nombre: 'Anycubic Photon Mono 4K',
    tipo: 'SLA 3D Printer',
    costo_minuto: 75,
    consumo_kwh: 0.055,
    estado: 'operativa'
  };

  const dummyFDM: Maquina = {
    id: 'maq-fdm-1',
    nombre: 'Bambu Lab P1S',
    tipo: 'FDM 3D Printer',
    costo_minuto: 100,
    consumo_kwh: 0.18,
    estado: 'operativa'
  };

  const dummyLaser: Maquina = {
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

  const dummyCliente: Cliente = {
    id: 'cli-test-01',
    codigo: 101,
    nombre: 'Empresa Industrial SAS',
    nit_cc: '901234567-1',
    telefono: '3158889900',
    correo: 'contacto@industrial.com'
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Debe generar y calcular una orden multi-fabricación con SLA, FDM y Láser combinados', () => {
    // Pieza 1: SLA
    const itemSLA = calcularCotizacionIntegral({
      nombre_item: 'Prototipo Miniatura SLA',
      cantidad: 2,
      alto_mm: 80,
      ancho_mm: 50,
      profundidad_mm: 50,
      resina: dummyResina,
      impresora: dummySLA,
      tecnologia: 'SLA_RESINA',
      tiempoDesarrolloMin: 15,
      tiempoArmadoMin: 10,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.40
    }, dummyPersonal, dummyConfig);

    // Pieza 2: FDM
    const itemFDM = calcularCotizacionIntegral({
      nombre_item: 'Carcasa Estructural FDM',
      cantidad: 8, // Descuento por volumen >= 6 -> 10%
      alto_mm: 120,
      ancho_mm: 120,
      profundidad_mm: 40,
      resina: dummyResina,
      impresora: dummyFDM,
      tecnologia: 'FDM_FILAMENTO',
      materialFilamento: 'PETG',
      pesoFilamentoG: 85,
      costoRolloKg: 85000,
      tiempoFDMMin: 220,
      tiempoDesarrolloMin: 10,
      tiempoArmadoMin: 5,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.40,
      aplicaDescuentoVolumen: true
    }, dummyPersonal, dummyConfig);

    // Pieza 3: Láser CO2
    const itemLaser = calcularCotizacionIntegral({
      nombre_item: 'Cubierta Frontal Láser',
      cantidad: 2,
      alto_mm: 150,
      ancho_mm: 200,
      profundidad_mm: 3,
      resina: dummyResina,
      impresora: dummyLaser,
      tecnologia: 'CORTE_LASER',
      materialLamina: 'Acrílico Cristal 3mm',
      espesorLaminaMm: 3,
      tiempoLaserMin: 12,
      tipoProcesoLaser: 'corte',
      tiempoDesarrolloMin: 10,
      tiempoArmadoMin: 5,
      tiempoPinturaMin: 0,
      accesorios: [],
      pinturas: [],
      costoModeloComprado: 0,
      margenGanancia: 0.40
    }, dummyPersonal, dummyConfig);

    const items = [itemSLA, itemFDM, itemLaser];

    expect(items.length).toBe(3);
    expect(items[0].tecnologia).toBe('SLA_RESINA');
    expect(items[1].tecnologia).toBe('FDM_FILAMENTO');
    expect(items[2].tecnologia).toBe('CORTE_LASER');
    expect(items[1].aplica_descuento_volumen).toBe(true);
    expect(items[1].descuento_volumen_porcentaje).toBe(10);

    // Liquidación fiscal con IVA 0% (Régimen Simple)
    const totalesIva0 = calcularTotalesCotizacion(items, 0, 0);
    expect(totalesIva0.subtotal).toBe(items.reduce((acc, it) => acc + it.precio_total, 0));
    expect(totalesIva0.ivaMonto).toBe(0);
    expect(totalesIva0.total).toBe(totalesIva0.subtotal);

    // Formateador oficial de IVA
    const lineaIva0 = formatearLineaIVA(0, 0);
    expect(lineaIva0.lineaCompleta).toContain('0%');
    expect(lineaIva0.esCero).toBe(true);
    expect(lineaIva0.leyenda).toBe(LEYENDA_IVA_CERO);

    // Liquidación fiscal con IVA 19%
    const totalesIva19 = calcularTotalesCotizacion(items, 0, 19);
    expect(totalesIva19.ivaMonto).toBe(Math.round(totalesIva19.subtotal * 0.19));
    expect(totalesIva19.total).toBe(totalesIva19.subtotal + totalesIva19.ivaMonto);
  });

  it('2. Debe generar documentos PDF válidos para Cotización, Cuenta de Cobro y Recibo POS Dual', () => {
    const itemTest: PiezaCotizada = {
      id: 'it-1',
      nombre_item: 'Base Mecanizada',
      cantidad: 2,
      alto_mm: 50,
      ancho_mm: 50,
      profundidad_mm: 20,
      volumen_cm3: 50,
      peso_estimado_g: 60,
      tecnologia: 'FDM_FILAMENTO',
      material_filamento: 'PLA+',
      resina_id: 'res-1',
      resina_nombre: 'PLA+ Negro',
      maquina_id: 'maq-1',
      maquina_nombre: 'Bambu Lab P1S',
      tiempo_impresion_min: 120,
      tiempo_desarrollo_min: 10,
      tiempo_armado_min: 5,
      tiempo_pintura_min: 0,
      costo_energia: 1200,
      costo_resina: 6000,
      costo_curado: 0,
      costo_insumos: 0,
      costo_mano_obra: 2500,
      costo_modelo_comprado: 0,
      costo_base_produccion: 9700,
      margen_ganancia: 0.40,
      precio_unitario: 25000,
      precio_total: 50000,
      tiempo_entrega: '(2) Días hábiles',
      descripcion_tecnica: 'Impresión FDM en PLA+'
    };

    const cotizacionMock: Cotizacion = {
      id: 'cot-test-01',
      numero_cot: '25-080',
      cliente: dummyCliente,
      vendedor: 'Wendy',
      fecha: '2026-11-05',
      estado: 'Enviada',
      items: [itemTest],
      subtotal: 50000,
      iva_porcentaje: 0,
      iva_monto: 0,
      descuento_porcentaje: 0,
      total: 50000,
      tiempo_entrega_estimado: '(2) Días hábiles',
      notas: 'No incluye flete fuera de la ciudad.',
      abono: 25000,
      saldo_pendiente: 25000,
      estado_pago: 'Abono Parcial'
    };

    // PDF de Cotización
    const docCot = crearDocPDFCotizacion(cotizacionMock, dummyConfig);
    expect(docCot).toBeDefined();
    expect(docCot.output('arraybuffer').byteLength).toBeGreaterThan(1000);

    // PDF de Cuenta de Cobro
    const cuentaMock: CuentaCobro = {
      id: 'cc-test-01',
      cotizacion_id: cotizacionMock.id,
      numero_cc: 'CC-045',
      cotizacion_numero: cotizacionMock.numero_cot,
      cliente: dummyCliente,
      fecha_emision: '2026-11-05',
      items_resumen: 'Fabricación 3D Base Mecanizada',
      subtotal: 50000,
      iva_porcentaje: 0,
      iva_monto: 0,
      total: 50000,
      abono: 25000,
      saldo_pendiente: 25000,
      estado_pago: 'Abono Parcial'
    };

    const docCC = crearDocPDFCuentaCobro(cuentaMock, dummyConfig);
    expect(docCC).toBeDefined();
    expect(docCC.output('arraybuffer').byteLength).toBeGreaterThan(1000);

    // PDF de Recibo POS en formato Ticket 80mm
    const ventaPOS: VentaExpress = {
      id: 'pos-test-01',
      numero_venta: 'POS-105',
      cliente_nombre: 'Carlos Ruiz',
      cliente_telefono: '3001112233',
      nombre_producto: 'Figura Coleccionable',
      cantidad_vendida: 1,
      subtotal: 45000,
      iva_porcentaje: 0,
      iva_monto: 0,
      total: 45000,
      abono: 45000,
      saldo_pendiente: 0,
      estado_pago: 'Pagado Total',
      metodo_pago: 'Bre-B',
      fecha_venta: '2026-11-05'
    };

    const docTicketPOS = crearDocPDFReciboPOS(ventaPOS, dummyConfig, 'ticket80mm');
    expect(docTicketPOS).toBeDefined();
    expect(docTicketPOS.output('arraybuffer').byteLength).toBeGreaterThan(1000);

    // PDF de Recibo POS en formato Recibo Formal
    const docCartaPOS = crearDocPDFReciboPOS(ventaPOS, dummyConfig, 'reciboCarta');
    expect(docCartaPOS).toBeDefined();
    expect(docCartaPOS.output('arraybuffer').byteLength).toBeGreaterThan(1000);
  });

  it('3. Debe generar textos de WhatsApp estructurados con desglose fiscal explícito y tecnología', () => {
    const itemLaser: PiezaCotizada = {
      id: 'it-laser',
      nombre_item: 'Placa conmemorativa',
      cantidad: 1,
      alto_mm: 100,
      ancho_mm: 150,
      profundidad_mm: 3,
      volumen_cm3: 45,
      peso_estimado_g: 50,
      tecnologia: 'CORTE_LASER',
      material_lamina: 'Acrílico Humo 3mm',
      resina_id: 'laser-mat',
      resina_nombre: 'Acrílico Humo 3mm',
      maquina_id: 'maq-laser',
      maquina_nombre: 'Láser CO2',
      tiempo_impresion_min: 15,
      tiempo_desarrollo_min: 5,
      tiempo_armado_min: 5,
      tiempo_pintura_min: 0,
      costo_energia: 800,
      costo_resina: 4000,
      costo_curado: 0,
      costo_insumos: 0,
      costo_mano_obra: 1500,
      costo_modelo_comprado: 0,
      costo_base_produccion: 6300,
      margen_ganancia: 0.40,
      precio_unitario: 30000,
      precio_total: 30000,
      tiempo_entrega: '(1) Día hábil',
      descripcion_tecnica: 'Corte Láser en Acrílico'
    };

    const cotizacionMock: Cotizacion = {
      id: 'cot-wa-01',
      numero_cot: '25-081',
      cliente: dummyCliente,
      vendedor: 'Wendy',
      fecha: '2026-11-05',
      estado: 'Enviada',
      items: [itemLaser],
      subtotal: 30000,
      iva_porcentaje: 0,
      iva_monto: 0,
      descuento_porcentaje: 0,
      total: 30000,
      tiempo_entrega_estimado: '(1) Día hábil',
      notas: 'Incluye embalaje protector.',
      abono: 15000,
      saldo_pendiente: 15000,
      estado_pago: 'Abono Parcial'
    };

    const waCotizacion = generateCotizacionWhatsAppText(cotizacionMock, dummyConfig);
    expect(waCotizacion).toContain('[⚡ Láser]');
    expect(waCotizacion).toContain('IVA (0%):');
    expect(waCotizacion).toContain(LEYENDA_IVA_CERO);
    expect(waCotizacion).toContain('TOTAL:');

    const cuentaMock: CuentaCobro = {
      id: 'cc-wa-01',
      cotizacion_id: cotizacionMock.id,
      numero_cc: 'CC-046',
      cotizacion_numero: '25-081',
      cliente: dummyCliente,
      fecha_emision: '2026-11-05',
      items_resumen: 'Corte Láser Acrílico',
      subtotal: 30000,
      iva_porcentaje: 0,
      iva_monto: 0,
      total: 30000,
      abono: 15000,
      saldo_pendiente: 15000,
      estado_pago: 'Abono Parcial'
    };

    const waCuenta = generateCuentaCobroWhatsAppText(cuentaMock, dummyConfig);
    expect(waCuenta).toContain('IVA (0%):');
    expect(waCuenta).toContain('SALDO PENDIENTE:');

    const ventaPOS: VentaExpress = {
      id: 'pos-wa-01',
      numero_venta: 'POS-106',
      cliente_nombre: 'Mariana Gómez',
      cliente_telefono: '3114445566',
      nombre_producto: 'Figura Dragón',
      cantidad_vendida: 1,
      subtotal: 35000,
      iva_porcentaje: 0,
      iva_monto: 0,
      total: 35000,
      abono: 35000,
      saldo_pendiente: 0,
      estado_pago: 'Pagado Total',
      metodo_pago: 'Nequi',
      fecha_venta: '2026-11-05'
    };

    const waPOS = generarTextoComprobantePOS(ventaPOS, dummyConfig);
    expect(waPOS).toContain('Subtotal:');
    expect(waPOS).toContain('IVA (0%):');
    expect(waPOS).toContain('Total:');
  });

  it('4. Debe persistir y recuperar borradores de piezas en almacenamiento local sin pérdida ante recargas', () => {
    const draftTest: PiezaCotizada = {
      id: 'draft-piece-101',
      nombre_item: 'Borrador Guardado en PC',
      cantidad: 3,
      alto_mm: 75,
      ancho_mm: 75,
      profundidad_mm: 75,
      volumen_cm3: 120,
      peso_estimado_g: 130,
      tecnologia: 'FDM_FILAMENTO',
      resina_id: 'fdm-pla',
      resina_nombre: 'PLA Gris',
      maquina_id: 'maq-fdm',
      maquina_nombre: 'Bambu Lab',
      tiempo_impresion_min: 180,
      tiempo_desarrollo_min: 10,
      tiempo_armado_min: 5,
      tiempo_pintura_min: 0,
      costo_energia: 1500,
      costo_resina: 9000,
      costo_curado: 0,
      costo_insumos: 0,
      costo_mano_obra: 2500,
      costo_modelo_comprado: 0,
      costo_base_produccion: 13000,
      margen_ganancia: 0.40,
      precio_unitario: 35000,
      precio_total: 105000,
      tiempo_entrega: '(2) Días hábiles',
      descripcion_tecnica: 'Pieza de prueba borrador persistente'
    };

    // 1. Guardar borrador en storage
    StorageService.saveDraftPieces([draftTest]);

    // 2. Recuperar borrador
    const recuperado = StorageService.getDraftPieces();
    expect(recuperado.length).toBe(1);
    expect(recuperado[0].id).toBe('draft-piece-101');
    expect(recuperado[0].nombre_item).toBe('Borrador Guardado en PC');
    expect(recuperado[0].tecnologia).toBe('FDM_FILAMENTO');

    // 3. Guardar metadatos de borrador
    StorageService.saveDraftBuilderMeta({
      clienteId: 'cli-test-01',
      vendedor: 'Wendy',
      descuentoPorcentaje: 5,
      ivaPorcentaje: 0,
      notas: 'Entrega prioritaria'
    });

    const metaRecuperada = StorageService.getDraftBuilderMeta();
    expect(metaRecuperada).toBeDefined();
    expect(metaRecuperada?.clienteId).toBe('cli-test-01');
    expect(metaRecuperada?.descuentoPorcentaje).toBe(5);

    // 4. Limpieza exitosa tras guardar
    StorageService.clearDraftPieces();
    StorageService.clearDraftBuilderMeta();
    expect(StorageService.getDraftPieces().length).toBe(0);
    expect(StorageService.getDraftBuilderMeta()).toBeNull();
  });
});
