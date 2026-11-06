import { describe, it, expect } from 'vitest';
import {
  calcularVolumenCm3,
  calcularPesoResinaG,
  calcularTiempoImpresionMin,
  calcularConsumoElectricoKWh,
  calcularDesgastePantallaLCD,
  calcularCostoManoObra,
  calcularTotalesCotizacion,
  calcularDescuentoVolumenSugerido,
  formatearLineaIVA,
  LEYENDA_IVA_CERO,
  validarRegla50Anticipo,
  generarNumeroCotSugerido,
  limpiarNotasObservaciones
} from '../pricingCalculator';
import { PiezaCotizada, Cotizacion, ConfiguracionTaller } from '../../../../types';
import { generateCotizacionWhatsAppText } from '../../../../services/whatsappService';
import { crearDocPDFCotizacion } from '../../../../services/pdfService';

describe('pricingCalculator - Pure Math & 50% Rule Engine', () => {
  it('1. calcularVolumenCm3: calcula cm3 exactos para dimensiones 3D', () => {
    // 100mm x 60mm x 60mm = 360,000 mm3 = 360 cm3
    expect(calcularVolumenCm3(100, 60, 60)).toBe(360);
    expect(calcularVolumenCm3(0, 50, 50)).toBe(0);
    expect(calcularVolumenCm3(-10, 50, 50)).toBe(0);
  });

  it('2. calcularPesoResinaG: respeta estructura sólida vs ahuecada con densidad', () => {
    const vol = 100; // cm3
    const densidad = 1.15; // g/cm3

    // Sólido: 100 * 1.15 = 115g
    const solido = calcularPesoResinaG(vol, densidad, 'solido');
    expect(solido).toBe(115);

    // Ahuecado con 35% de pared/relleno: 100 * 1.15 * 0.35 = 40.25g
    const ahuecado = calcularPesoResinaG(vol, densidad, 'ahuecado', 35);
    expect(ahuecado).toBe(40.25);

    // Override manual
    expect(calcularPesoResinaG(vol, densidad, 'solido', 35, 85)).toBe(85);
  });

  it('3. calcularTiempoImpresionMin: calcula minutos en base a altura Z y velocidad', () => {
    // 100mm a 20 mm/h = 5 horas = 300 min
    expect(calcularTiempoImpresionMin(100, 20)).toBe(300);
    // Override manual
    expect(calcularTiempoImpresionMin(100, 20, 180)).toBe(180);
  });

  it('4. calcularConsumoElectricoKWh: convierte Watts y minutos a kWh exactos', () => {
    // 50W durante 120 minutos (2h) = 100 Wh = 0.1 kWh
    expect(calcularConsumoElectricoKWh(50, 120)).toBe(0.1);
  });

  it('5. calcularDesgastePantallaLCD: amortiza pantalla mono en horas de uso', () => {
    // Pantalla $300,000 COP, 2000 horas vida útil = $150 COP por hora.
    // 120 minutos (2 horas) = $300 COP de desgaste
    expect(calcularDesgastePantallaLCD(300000, 2000, 120)).toBe(300);
  });

  it('6. calcularCostoManoObra: calcula costo por minuto de dedicación de operario', () => {
    // Salario $1,500,000 COP / (192h * 60m) = $130.208 COP por minuto
    // 60 minutos = $7812.5 COP
    const costo = calcularCostoManoObra(1500000, 192, 60);
    expect(costo).toBeCloseTo(7812.5, 1);
  });

  it('7. calcularTotalesCotizacion: calcula reactivamente subtotal, descuento y total neto', () => {
    const mockItems = [
      { id: '1', precio_total: 100000 } as PiezaCotizada,
      { id: '2', precio_total: 50000 } as PiezaCotizada
    ];

    const sinDescuento = calcularTotalesCotizacion(mockItems, 0);
    expect(sinDescuento.subtotal).toBe(150000);
    expect(sinDescuento.descuentoMonto).toBe(0);
    expect(sinDescuento.total).toBe(150000);

    const con10Pct = calcularTotalesCotizacion(mockItems, 10);
    expect(con10Pct.subtotal).toBe(150000);
    expect(con10Pct.descuentoMonto).toBe(15000);
    expect(con10Pct.subtotalConDescuento).toBe(135000);
    expect(con10Pct.total).toBe(135000);

    // Con IVA del 19% sin descuento comercial
    const conIva19 = calcularTotalesCotizacion(mockItems, 0, 19);
    expect(conIva19.subtotal).toBe(150000);
    expect(conIva19.ivaMonto).toBe(28500);
    expect(conIva19.total).toBe(178500);

    // Con Descuento 10% e IVA 19% (IVA sobre base imponible con descuento)
    // Base = 150000 - 15000 = 135000. IVA 19% = 25650. Total = 160650
    const conDescuentoEIva = calcularTotalesCotizacion(mockItems, 10, 19);
    expect(conDescuentoEIva.subtotalConDescuento).toBe(135000);
    expect(conDescuentoEIva.ivaMonto).toBe(25650);
    expect(conDescuentoEIva.total).toBe(160650);
  });

  it('7b. calcularDescuentoVolumenSugerido: respeta las escalas para pedidos por mayor', () => {
    expect(calcularDescuentoVolumenSugerido(1)).toBe(0);
    expect(calcularDescuentoVolumenSugerido(5)).toBe(0);
    // Escala 6-11 unid -> 10%
    expect(calcularDescuentoVolumenSugerido(6)).toBe(10);
    expect(calcularDescuentoVolumenSugerido(11)).toBe(10);
    // Escala 12-23 unid -> 15%
    expect(calcularDescuentoVolumenSugerido(12)).toBe(15);
    expect(calcularDescuentoVolumenSugerido(23)).toBe(15);
    // Escala 24+ unid -> 20%
    expect(calcularDescuentoVolumenSugerido(24)).toBe(20);
    expect(calcularDescuentoVolumenSugerido(100)).toBe(20);
  });

  it('8. validarRegla50Anticipo: verifica la política de anticipo del 50%', () => {
    const total = 200000;

    // Sin pago
    const sinPago = validarRegla50Anticipo(total, 0, 'Pendiente');
    expect(sinPago.abonoEfectivo).toBe(0);
    expect(sinPago.saldoPendiente).toBe(200000);
    expect(sinPago.cumpleMinimo50).toBe(false);
    expect(sinPago.montoFaltantePara50).toBe(100000);

    // Abono menor al 50% ($60,000 = 30%)
    const abonoInsuficiente = validarRegla50Anticipo(total, 60000, 'Abono Parcial');
    expect(abonoInsuficiente.porcentajeAbonado).toBe(30);
    expect(abonoInsuficiente.cumpleMinimo50).toBe(false);
    expect(abonoInsuficiente.montoFaltantePara50).toBe(40000);

    // Abono del 50% ($100,000)
    const abonoExacto50 = validarRegla50Anticipo(total, 100000, 'Abono Parcial');
    expect(abonoExacto50.porcentajeAbonado).toBe(50);
    expect(abonoExacto50.cumpleMinimo50).toBe(true);
    expect(abonoExacto50.montoFaltantePara50).toBe(0);

    // Pago Total
    const pagado = validarRegla50Anticipo(total, 0, 'Pagado Total');
    expect(pagado.abonoEfectivo).toBe(200000);
    expect(pagado.saldoPendiente).toBe(0);
    expect(pagado.cumpleMinimo50).toBe(true);
  });

  it('9. generarNumeroCotSugerido: genera correlativo consecutivo incremental', () => {
    const cots = [
      { numero_cot: '25-073' },
      { numero_cot: '25-074' },
      { numero_cot: '25-075' }
    ];
    const sugerido = generarNumeroCotSugerido(cots);
    expect(sugerido).toBe('26-076');
  });

  it('10. limpiarNotasObservaciones: remueve guiones repetidos y añade advertencia parcial', () => {
    const notasSucias = '-- Entrega en taller --\n-- Garantía 30 días';
    const limpias = limpiarNotasObservaciones(notasSucias, true);
    expect(limpias).toContain('Entrega en taller');
    expect(limpias).toContain('Garantía 30 días');
    expect(limpias).toContain('NOTA: Cotización preliminar');
  });

  it('11. formatearLineaIVA: garantiza desglose fiscal obligatorio incluso cuando el IVA sea 0%', () => {
    const ivaCero = formatearLineaIVA(0, 0);
    expect(ivaCero.porcentaje).toBe(0);
    expect(ivaCero.monto).toBe(0);
    expect(ivaCero.leyenda).toBe(LEYENDA_IVA_CERO);
    expect(ivaCero.lineaCompleta).toContain('IVA (0%): $0 COP (Régimen Simple / No Responsable)');
    expect(ivaCero.lineaWhatsApp).toContain('🏛️ *IVA (0%):* $0 COP _(Régimen Simple / No Responsable)_');

    const ivaGeneral = formatearLineaIVA(19, 19000);
    expect(ivaGeneral.porcentaje).toBe(19);
    expect(ivaGeneral.monto).toBe(19000);
    expect(ivaGeneral.lineaCompleta).toContain('IVA (19%): +$19.000 COP');
    expect(ivaGeneral.lineaWhatsApp).toContain('🏛️ *IVA (19%):* +$19.000 COP');
  });

  it('12. Descuento por volumen opcional: respeta switch por pieza y no se imprime en la descripción física', () => {
    const piezaConVolumen: PiezaCotizada = {
      id: 'pz-vol-1',
      nombre_item: 'Figura Coleccionable',
      cantidad: 10,
      alto_mm: 100,
      ancho_mm: 50,
      profundidad_mm: 50,
      volumen_cm3: 25,
      peso_estimado_g: 50,
      resina_id: 'res-1',
      resina_nombre: 'Resina Gris',
      maquina_id: 'maq-1',
      maquina_nombre: 'Anycubic',
      tiempo_impresion_min: 180,
      tiempo_desarrollo_min: 0,
      tiempo_armado_min: 0,
      tiempo_pintura_min: 0,
      costo_energia: 1000,
      costo_resina: 5000,
      costo_curado: 500,
      costo_insumos: 1000,
      costo_mano_obra: 3000,
      costo_modelo_comprado: 0,
      costo_base_produccion: 10500,
      margen_ganancia: 0.4,
      precio_unitario: 15000,
      precio_total: 150000,
      tiempo_entrega: '(3) Días hábiles',
      descripcion_tecnica: 'Resina estándar',
      aplica_descuento_volumen: true,
      descuento_volumen_porcentaje: 10,
      descuento_volumen_monto: 1500
    };

    const mockConfig: ConfiguracionTaller = {
      tarifa_kwh: 834,
      margen_merma_resina: 1.4,
      telefono_contacto: '3202796115',
      telefono_contacto2: '3217273025',
      correo: 'wjgeeks3d@gmail.com',
      instagram: '@WJGEEKS3D',
      nequi: '3202796115',
      bre_b: '0090778625',
      titular_cuenta: 'WJGEEKS 3D PRO'
    };

    const mockCotizacion: Cotizacion = {
      id: 'cot-vol',
      numero_cot: '26-001',
      fecha: '2026-11-06',
      tiempo_entrega_estimado: '(3) Días hábiles',
      cliente: { id: 'c1', codigo: 1, nombre: 'Cliente Test', nit_cc: '', telefono: '3202796115', correo: '' },
      vendedor: 'Wendy',
      estado: 'Enviada',
      items: [piezaConVolumen],
      subtotal: 150000,
      descuento_porcentaje: 0,
      iva_porcentaje: 0,
      total: 150000,
      notas: '• Incluye descuento especial por volumen aplicado al lote de fabricación.'
    };

    // 1. WhatsApp text
    const msg = generateCotizacionWhatsAppText(mockCotizacion, mockConfig);
    // Debe contener la nota en Observaciones, pero NO en la descripción del ítem
    expect(msg).toContain('• Incluye descuento especial por volumen');
    expect(msg).not.toContain('🎉 _Descuento por volumen');

    // 2. PDF Spec text
    const doc = crearDocPDFCotizacion(mockCotizacion, mockConfig);
    expect(doc).toBeDefined();
  });
});
