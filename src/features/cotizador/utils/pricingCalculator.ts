/**
 * Mathematical Engine & Pure Costing Utilities for 3D Printing
 * WJGEEKS 3D PRO - Layer 3: Math & Pure Utils
 */

import { Resina, Maquina, Insumo, Personal, ConfiguracionTaller, PiezaCotizada } from '../../../types';
import { ParametrosPiezaInput, calcularPieza3D } from '../../../services/calculationEngine';

/**
 * Calcula el volumen de la pieza en cm3 (ml)
 * Fórmula oficial WJGEEKS: (Alto mm * Ancho mm * Profundidad mm) / 1000
 */
export function calcularVolumenCm3(altoMm: number, anchoMm: number, profMm: number): number {
  if (altoMm <= 0 || anchoMm <= 0 || profMm <= 0) return 0;
  return Number(((altoMm * anchoMm * profMm) / 1000).toFixed(2));
}

/**
 * Calcula el peso estimado en gramos según la densidad de la resina y estructura
 */
export function calcularPesoResinaG(
  volumenCm3: number,
  densidadGcm3: number,
  tipoEstructura: 'solido' | 'ahuecado' = 'solido',
  porcentajeRelleno: number = 35,
  pesoManualG?: number
): number {
  if (pesoManualG && pesoManualG > 0) {
    return Number(pesoManualG.toFixed(2));
  }
  if (volumenCm3 <= 0 || densidadGcm3 <= 0) return 0;

  const ratio = tipoEstructura === 'ahuecado'
    ? ((porcentajeRelleno && porcentajeRelleno > 0) ? porcentajeRelleno / 100 : 0.35)
    : 1.0;

  return Number((volumenCm3 * densidadGcm3 * ratio).toFixed(2));
}

/**
 * Calcula el tiempo estimado de impresión en minutos
 */
export function calcularTiempoImpresionMin(
  altoMm: number,
  velocidadMmH: number = 20,
  tiempoManualMin?: number
): number {
  if (tiempoManualMin !== undefined && tiempoManualMin > 0) {
    return tiempoManualMin;
  }
  if (altoMm <= 0 || velocidadMmH <= 0) return 0;
  return Math.round((altoMm / velocidadMmH) * 60);
}

/**
 * Calcula el consumo eléctrico en kWh
 */
export function calcularConsumoElectricoKWh(potenciaWatts: number, tiempoMinutos: number): number {
  if (potenciaWatts <= 0 || tiempoMinutos <= 0) return 0;
  return (potenciaWatts / 1000) * (tiempoMinutos / 60);
}

/**
 * Desgaste proporcional de pantalla LCD mono (vida útil típica 2000 horas)
 */
export function calcularDesgastePantallaLCD(
  costoPantalla: number,
  vidaUtilHoras: number = 2000,
  tiempoImpresionMin: number
): number {
  if (costoPantalla <= 0 || vidaUtilHoras <= 0 || tiempoImpresionMin <= 0) return 0;
  const costoHora = costoPantalla / vidaUtilHoras;
  return Number(((tiempoImpresionMin / 60) * costoHora).toFixed(2));
}

/**
 * Calcula el costo minuto de mano de obra según salario y dedicación
 */
export function calcularCostoManoObra(
  salarioMensual: number,
  horasMensuales: number = 192,
  tiempoMinutos: number
): number {
  if (salarioMensual <= 0 || horasMensuales <= 0 || tiempoMinutos <= 0) return 0;
  const costoPorMinuto = salarioMensual / (horasMensuales * 60);
  return Number((tiempoMinutos * costoPorMinuto).toFixed(2));
}

/**
 * Wrapper de alta fidelidad para el cálculo integral de pieza 3D
 */
export function calcularCotizacionIntegral(
  input: ParametrosPiezaInput,
  personal: Personal[],
  config: ConfiguracionTaller
): PiezaCotizada {
  return calcularPieza3D(input, personal, config);
}

/**
 * Calcula los totales reactivos de una cotización: Subtotal, Descuento y Total neto
 */
export function calcularTotalesCotizacion(
  items: PiezaCotizada[],
  descuentoPorcentaje: number = 0
): { subtotal: number; descuentoMonto: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.precio_total) || 0), 0);
  const clampedDescuento = Math.max(0, Math.min(100, Number(descuentoPorcentaje) || 0));
  const descuentoMonto = Math.round((subtotal * clampedDescuento) / 100);
  const total = Math.max(0, subtotal - descuentoMonto);
  return { subtotal, descuentoMonto, total };
}

/**
 * Regla de negocio del 50%: Valida si el abono cubre el anticipo mínimo requerido
 * y calcula el saldo restante exacto.
 */
export interface Regla50AnticipoResult {
  porcentajeAbonado: number;
  abonoEfectivo: number;
  saldoPendiente: number;
  cumpleMinimo50: boolean;
  montoFaltantePara50: number;
}

export function validarRegla50Anticipo(
  total: number,
  abono: number,
  estadoPago: 'Pendiente' | 'Abono Parcial' | 'Pagado Total'
): Regla50AnticipoResult {
  if (total <= 0) {
    return {
      porcentajeAbonado: 100,
      abonoEfectivo: 0,
      saldoPendiente: 0,
      cumpleMinimo50: true,
      montoFaltantePara50: 0
    };
  }

  let abonoEfectivo = 0;
  if (estadoPago === 'Pagado Total') {
    abonoEfectivo = total;
  } else if (estadoPago === 'Abono Parcial') {
    abonoEfectivo = Math.min(total, Math.max(0, abono));
  } else {
    abonoEfectivo = 0;
  }

  const saldoPendiente = Math.max(0, total - abonoEfectivo);
  const porcentajeAbonado = Math.round((abonoEfectivo / total) * 100);
  const minimo50 = Math.ceil(total * 0.5);
  const cumpleMinimo50 = abonoEfectivo >= minimo50;
  const montoFaltantePara50 = cumpleMinimo50 ? 0 : minimo50 - abonoEfectivo;

  return {
    porcentajeAbonado,
    abonoEfectivo,
    saldoPendiente,
    cumpleMinimo50,
    montoFaltantePara50
  };
}

/**
 * Genera el número correlativo consecutivo estándar de cotización (ej: 25-074)
 */
export function generarNumeroCotSugerido(cotizaciones: { numero_cot?: string }[] = []): string {
  let maxNum = 73;
  cotizaciones.forEach(c => {
    const match = c.numero_cot?.match(/^(\d{2})-(\d+)$/);
    if (match) {
      const val = parseInt(match[2], 10);
      if (val > maxNum) maxNum = val;
    }
  });
  const añoDosDigitos = new Date().getFullYear().toString().slice(-2);
  return `${añoDosDigitos}-${(maxNum + 1).toString().padStart(3, '0')}`;
}

/**
 * Formatea notas y observaciones removiendo caracteres redundantes
 */
export function limpiarNotasObservaciones(notas: string, esParcial: boolean = false): string {
  const cleanNotas = (notas || 'No incluye transporte fuera del perímetro urbano.')
    .replace(/-{2,}/g, '-')
    .replace(/-\s*-+/g, '-')
    .split('\n')
    .map(l => l.replace(/^[-•*–—\s]+/, '').trim())
    .filter(Boolean)
    .join('\n');

  if (esParcial) {
    return `${cleanNotas}\nNOTA: Cotización preliminar. Medidas y resina sujetas a verificación en software 3D.`;
  }
  return cleanNotas;
}

export type { ParametrosPiezaInput };
