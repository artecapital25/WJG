import { Cotizacion, Cliente } from '../types';
import { VentaExpress } from '../types/pos';

export type FiltroTipoCliente = 'todos' | 'nuevos' | 'recurrentes';

/**
 * Normaliza un número telefónico extrayendo solo dígitos
 * y tomando los últimos 10 dígitos (estándar móvil colombiano).
 */
export function normalizarTelefono(tel?: string | null): string {
  if (!tel) return '';
  const digits = tel.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Normaliza un texto para búsquedas insensibles a mayúsculas y acentos/tildes.
 */
export function normalizarTexto(txt?: string | null): string {
  if (!txt) return '';
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export interface ClienteIdentificador {
  id?: string | null;
  nombre?: string | null;
  telefono?: string | null;
  nit_cc?: string | null;
}

/**
 * Mapeo consolidado de transacciones por cliente a través de cotizaciones y ventas POS.
 */
export class CatalogoClientesStats {
  private conteoPorKey = new Map<string, number>();

  constructor(cotizaciones: Cotizacion[] = [], ventas: VentaExpress[] = []) {
    // 1. Indexar cotizaciones
    for (const cot of cotizaciones) {
      this.registrarTransaccion({
        id: cot.cliente?.id,
        nombre: cot.cliente?.nombre,
        telefono: cot.cliente?.telefono,
        nit_cc: cot.cliente?.nit_cc
      });
    }

    // 2. Indexar ventas express de mostrador
    for (const v of ventas) {
      this.registrarTransaccion({
        nombre: v.cliente_nombre,
        telefono: v.cliente_telefono
      });
    }
  }

  private registrarTransaccion(c: ClienteIdentificador) {
    const keys = this.obtenerClavesCliente(c);
    if (keys.length === 0) return;

    // Buscar si alguna de las claves ya tiene conteo previo
    let currentCount = 0;
    for (const k of keys) {
      const val = this.conteoPorKey.get(k);
      if (val !== undefined && val > currentCount) {
        currentCount = val;
      }
    }

    const nextCount = currentCount + 1;
    for (const k of keys) {
      this.conteoPorKey.set(k, nextCount);
    }
  }

  public obtenerClavesCliente(c: ClienteIdentificador): string[] {
    const keys: string[] = [];
    if (c.id && c.id.trim() !== '') {
      keys.push(`id:${c.id.trim()}`);
    }
    const telNorm = normalizarTelefono(c.telefono);
    if (telNorm && telNorm.length >= 7) {
      keys.push(`tel:${telNorm}`);
    }
    const nomNorm = normalizarTexto(c.nombre);
    if (nomNorm && nomNorm !== 'cliente general' && nomNorm !== 'mostrador' && nomNorm !== 'cliente final') {
      keys.push(`nom:${nomNorm}`);
    }
    if (c.nit_cc && c.nit_cc.trim() !== '' && c.nit_cc.trim() !== '222222222222') {
      keys.push(`nit:${c.nit_cc.trim()}`);
    }
    return keys;
  }

  /**
   * Obtiene el número de transacciones totales (cotizaciones + POS) asociadas a este cliente.
   */
  public getTransaccionesCount(c: ClienteIdentificador): number {
    const keys = this.obtenerClavesCliente(c);
    if (keys.length === 0) return 1;

    let maxCount = 0;
    for (const k of keys) {
      const val = this.conteoPorKey.get(k);
      if (val !== undefined && val > maxCount) {
        maxCount = val;
      }
    }
    return maxCount > 0 ? maxCount : 1;
  }

  /**
   * Un cliente es NUEVO si su conteo de cotizaciones/ventas es exactamente 1 (primera vez).
   */
  public esClienteNuevo(c: ClienteIdentificador): boolean {
    return this.getTransaccionesCount(c) <= 1;
  }

  /**
   * Un cliente es RECURRENTE / EXISTENTE si tiene 2 o más transacciones en el sistema.
   */
  public esClienteRecurrente(c: ClienteIdentificador): boolean {
    return this.getTransaccionesCount(c) >= 2;
  }
}

/**
 * Helper para clasificar rápidamente un cliente.
 */
export function clasificarCliente(
  cliente: ClienteIdentificador,
  cotizaciones: Cotizacion[] = [],
  ventas: VentaExpress[] = []
): { esNuevo: boolean; esRecurrente: boolean; totalTransacciones: number } {
  const stats = new CatalogoClientesStats(cotizaciones, ventas);
  const total = stats.getTransaccionesCount(cliente);
  return {
    esNuevo: total <= 1,
    esRecurrente: total >= 2,
    totalTransacciones: total
  };
}

/**
 * Coincidencia de búsqueda multicriterio (nombre, teléfono o NIT)
 */
export function coincideBusquedaCliente(
  c: ClienteIdentificador,
  query: string
): boolean {
  const q = normalizarTexto(query);
  if (!q) return true;

  const nom = normalizarTexto(c.nombre);
  if (nom.includes(q)) return true;

  const tel = normalizarTelefono(c.telefono);
  const qDigits = q.replace(/\D/g, '');
  if (qDigits && tel.includes(qDigits)) return true;

  if (c.nit_cc && normalizarTexto(c.nit_cc).includes(q)) return true;
  if (c.id && normalizarTexto(c.id).includes(q)) return true;

  return false;
}

