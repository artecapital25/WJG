import { describe, it, expect } from 'vitest';
import {
  calcularVolumenCm3,
  calcularPesoResinaG,
  calcularTiempoImpresionMin,
  calcularConsumoElectricoKWh,
  calcularDesgastePantallaLCD,
  calcularCostoManoObra,
  calcularTotalesCotizacion,
  validarRegla50Anticipo,
  generarNumeroCotSugerido,
  limpiarNotasObservaciones
} from '../pricingCalculator';
import { PiezaCotizada } from '../../../../types';

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
    expect(con10Pct.total).toBe(135000);
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
});
