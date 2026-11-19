import { Cliente, Cotizacion, OrdenTrabajo } from '../types';
import { VentaExpress } from '../types/pos';

export type FiltroTipoCliente = 'todos' | 'nuevos' | 'recurrentes';

const NOMBRES_GENERICOS = new Set([
  'cliente general',
  'mostrador',
  'cliente final',
  'cliente',
  'sin nombre'
]);

const TELEFONOS_PLACEHOLDER = new Set([
  '3000000000',
  '300000000',
  '0000000000',
  '0000000',
  '1234567890',
  '1111111111',
  '9999999999'
]);

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
 * Valida si un teléfono es real y usable como identificador único (descarta placeholders como 3000000000).
 */
export function esTelefonoValido(tel?: string | null): boolean {
  const norm = normalizarTelefono(tel);
  if (norm.length < 7) return false;
  if (TELEFONOS_PLACEHOLDER.has(norm)) return false;
  if (/^(\d)\1+$/.test(norm)) return false;
  return true;
}

/**
 * Normaliza una cédula o NIT, corrigiendo notación científica heredada de Excel (ej. 1.018480904E9 -> 1018480904)
 * y descartando valores genéricos/placeholder como 222222222222.
 */
export function normalizarNitCc(nit?: string | null): string {
  if (!nit) return '';
  let raw = String(nit).trim();
  if (!raw) return '';

  if (/^[0-9]+(\.[0-9]+)?[eE][+-]?[0-9]+$/.test(raw)) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      raw = String(Math.round(parsed));
    }
  }

  const clean = raw.replace(/[\s.\-]/g, '').toLowerCase();
  if (
    !clean ||
    clean.length < 5 ||
    clean === '222222222222' ||
    clean === 'na' ||
    clean === 'n/a' ||
    clean === 'sinnit' ||
    clean === 'null' ||
    /^0+$/.test(clean)
  ) {
    return '';
  }

  return clean;
}

/**
 * Normaliza un correo electrónico para comparación única.
 */
export function normalizarCorreo(correo?: string | null): string {
  if (!correo) return '';
  const clean = correo.trim().toLowerCase().replace(/\s+/g, '');
  if (!clean || !clean.includes('@') || clean.length < 5) return '';
  const parts = clean.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1].includes('.')) return '';
  return clean;
}

/**
 * Normaliza un texto para búsquedas insensibles a mayúsculas y acentos/tildes.
 */
export function normalizarTexto(txt?: string | null): string {
  if (!txt) return '';
  return txt
    .replace(/\u00a0/g, ' ')
    .replace(/\u202c/g, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ClienteIdentificador {
  id?: string | null;
  nombre?: string | null;
  telefono?: string | null;
  nit_cc?: string | null;
  correo?: string | null;
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
        nit_cc: cot.cliente?.nit_cc,
        correo: cot.cliente?.correo
      });
    }

    // 2. Indexar ventas express de mostrador
    for (const v of ventas) {
      this.registrarTransaccion({
        id: v.cliente_id,
        nombre: v.cliente_nombre,
        telefono: v.cliente_telefono,
        nit_cc: v.cliente_nit_cc,
        correo: v.cliente_correo
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
    if (esTelefonoValido(c.telefono)) {
      keys.push(`tel:${normalizarTelefono(c.telefono)}`);
    }
    const nomNorm = normalizarTexto(c.nombre);
    if (nomNorm && !NOMBRES_GENERICOS.has(nomNorm)) {
      keys.push(`nom:${nomNorm}`);
    }
    const nitNorm = normalizarNitCc(c.nit_cc);
    if (nitNorm) {
      keys.push(`nit:${nitNorm}`);
    }
    const correoNorm = normalizarCorreo(c.correo);
    if (correoNorm) {
      keys.push(`mail:${correoNorm}`);
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
 * Coincidencia de búsqueda multicriterio (nombre, teléfono, NIT/CC o correo)
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

  const nitNorm = normalizarNitCc(c.nit_cc);
  if (nitNorm && nitNorm.includes(q.replace(/[\s.\-]/g, ''))) return true;
  if (c.nit_cc && normalizarTexto(c.nit_cc).includes(q)) return true;

  const correoNorm = normalizarTexto(c.correo);
  if (correoNorm && correoNorm.includes(q)) return true;

  if (c.id && normalizarTexto(c.id).includes(q)) return true;

  return false;
}

function editDistanceAtMostOneOrTwo(a: string, b: string): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 2) return 99;
  const dp: number[] = Array.from({ length: lb + 1 }, (_, j) => j);
  for (let i = 1; i <= la; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= lb; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }
  return dp[lb];
}

function nombresSonSimilares(nombreA?: string | null, nombreB?: string | null): boolean {
  const a = normalizarTexto(nombreA);
  const b = normalizarTexto(nombreB);
  if (!a || !b || a.length < 2 || b.length < 2) return false;
  if (NOMBRES_GENERICOS.has(a) || NOMBRES_GENERICOS.has(b)) return false;
  if (a === b) return true;

  if (a.length >= 3 && b.includes(a)) return true;
  if (b.length >= 3 && a.includes(b)) return true;

  const tokensA = a.split(' ').filter(t => t.length >= 2);
  const tokensB = b.split(' ').filter(t => t.length >= 2);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // Todas las palabras relevantes del nombre corto aparecen (exacto o edit<=1) en el largo
  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  const allShortMatch = shorter.every(ts =>
    ts.length >= 3 && longer.some(tl => tl === ts || (ts.length >= 5 && editDistanceAtMostOneOrTwo(ts, tl) <= 1))
  );
  if (allShortMatch) return true;

  // Primer nombre >= 4 letras coincide exactamente con el primer nombre del otro
  if (tokensA[0].length >= 4 && tokensA[0] === tokensB[0]) {
    if (tokensA.length === 1 || tokensB.length === 1) return true;
    const apellidoMatch = tokensA.slice(1).some(ta =>
      tokensB.slice(1).some(tb => ta === tb || (ta.length >= 4 && editDistanceAtMostOneOrTwo(ta, tb) <= 1))
    );
    if (apellidoMatch) return true;
  }

  return false;
}

export interface ResultadoCoincidenciaCliente {
  exactMatch: Cliente | null;
  matchReason: 'id' | 'nit_cc' | 'telefono' | 'correo' | null;
  nameMatches: Cliente[];
}

/**
 * Busca coincidencias jerárquicas por Identificador Único (1° ID, 2° Cédula/NIT, 3° Teléfono 10d, 4° Correo)
 * y posibles homónimos por Nombre para cotejo manual en mostrador o cotizador.
 */
export function buscarCoincidenciasCliente(
  candidato: Partial<Cliente>,
  clientes: Cliente[]
): ResultadoCoincidenciaCliente {
  let exactMatch: Cliente | null = null;
  let matchReason: ResultadoCoincidenciaCliente['matchReason'] = null;

  if (candidato.id && candidato.id.trim() !== '') {
    const byId = clientes.find(c => c.id === candidato.id);
    if (byId) {
      exactMatch = byId;
      matchReason = 'id';
    }
  }

  const candNit = normalizarNitCc(candidato.nit_cc);
  if (!exactMatch && candNit) {
    const byNit = clientes.find(c => normalizarNitCc(c.nit_cc) === candNit);
    if (byNit) {
      exactMatch = byNit;
      matchReason = 'nit_cc';
    }
  }

  if (!exactMatch && esTelefonoValido(candidato.telefono)) {
    const candTel = normalizarTelefono(candidato.telefono);
    const byTel = clientes.find(c => esTelefonoValido(c.telefono) && normalizarTelefono(c.telefono) === candTel);
    if (byTel) {
      exactMatch = byTel;
      matchReason = 'telefono';
    }
  }

  const candCorreo = normalizarCorreo(candidato.correo);
  if (!exactMatch && candCorreo) {
    const byMail = clientes.find(c => normalizarCorreo(c.correo) === candCorreo);
    if (byMail) {
      exactMatch = byMail;
      matchReason = 'correo';
    }
  }

  const nameMatches = clientes.filter(c => {
    if (exactMatch && c.id === exactMatch.id) return false;
    return nombresSonSimilares(candidato.nombre, c.nombre);
  });

  return { exactMatch, matchReason, nameMatches };
}

/**
 * Enriquece / actualiza un cliente existente con datos nuevos o corregidos de una compra o edición,
 * preservando información completa frente a placeholders o campos vacíos.
 */
export function enriquecerClienteExistente(
  existente: Cliente,
  nuevosDatos: Partial<Cliente>,
  opciones?: { allowShorterName?: boolean }
): { clienteActualizado: Cliente; huboCambios: boolean } {
  const actualNit = normalizarNitCc(existente.nit_cc);
  const nuevoNit = normalizarNitCc(nuevosDatos.nit_cc);
  const nitFinal = nuevoNit || actualNit;

  const actualCorreo = normalizarCorreo(existente.correo);
  const nuevoCorreo = normalizarCorreo(nuevosDatos.correo);
  const correoFinal = nuevoCorreo || actualCorreo;

  const actualTelValido = esTelefonoValido(existente.telefono);
  const nuevoTelValido = esTelefonoValido(nuevosDatos.telefono);
  const telFinal = nuevoTelValido
    ? normalizarTelefono(nuevosDatos.telefono)
    : (actualTelValido ? normalizarTelefono(existente.telefono) : (nuevosDatos.telefono?.trim() || existente.telefono || ''));

  const nombreNuevo = (nuevosDatos.nombre || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const nombreExistente = (existente.nombre || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  let nombreFinal = nombreExistente || nombreNuevo || 'Cliente General';

  if (nombreNuevo && !NOMBRES_GENERICOS.has(normalizarTexto(nombreNuevo))) {
    const normNuevo = normalizarTexto(nombreNuevo);
    const normExist = normalizarTexto(nombreExistente);
    const tokensExist = normExist.split(' ').filter(Boolean);
    const tokensNuevo = normNuevo.split(' ').filter(Boolean);
    const todosTokensContenidos = tokensNuevo.length > 0 &&
      tokensNuevo.every(tn => tokensExist.some(te => te === tn || te.startsWith(tn)));
    const esAbreviacionEstricta = !opciones?.allowShorterName &&
      normExist.length > normNuevo.length &&
      (normExist.includes(normNuevo) || todosTokensContenidos);

    if (!normExist || NOMBRES_GENERICOS.has(normExist) || (!esAbreviacionEstricta && nombreNuevo !== nombreExistente)) {
      nombreFinal = nombreNuevo;
    }
  }

  const clienteActualizado: Cliente = {
    ...existente,
    nombre: nombreFinal,
    telefono: telFinal,
    nit_cc: nitFinal,
    correo: correoFinal
  };

  const huboCambios =
    clienteActualizado.nombre !== existente.nombre ||
    clienteActualizado.telefono !== (existente.telefono || '') ||
    clienteActualizado.nit_cc !== (existente.nit_cc || '') ||
    clienteActualizado.correo !== (existente.correo || '');

  return { clienteActualizado, huboCambios };
}

export interface HistorialClienteConsolidado {
  cotizaciones: Cotizacion[];
  ventas: VentaExpress[];
  ordenes: OrdenTrabajo[];
  resumen: {
    totalCotizado: number;
    totalPOS: number;
    totalOperado: number;
    totalAbonado: number;
    saldoPendiente: number;
    totalRegistros: number;
  };
}

/**
 * Cruza toda la actividad de un cliente (Cotizaciones, Ventas POS Express y Órdenes de Trabajo OT)
 * usando ID, NIT/CC, teléfono normalizado, correo o nombre exacto normalizado.
 */
export function obtenerHistorialCliente(
  cliente: Cliente,
  cotizaciones: Cotizacion[] = [],
  ventas: VentaExpress[] = [],
  ordenes: OrdenTrabajo[] = []
): HistorialClienteConsolidado {
  const cliTel = esTelefonoValido(cliente.telefono) ? normalizarTelefono(cliente.telefono) : '';
  const cliNit = normalizarNitCc(cliente.nit_cc);
  const cliMail = normalizarCorreo(cliente.correo);
  const cliNom = normalizarTexto(cliente.nombre);

  const coincideRegistro = (ref: {
    id?: string | null;
    nombre?: string | null;
    telefono?: string | null;
    nit_cc?: string | null;
    correo?: string | null;
  }): boolean => {
    if (ref.id && cliente.id && ref.id === cliente.id) return true;
    const refNit = normalizarNitCc(ref.nit_cc);
    if (cliNit && refNit && cliNit === refNit) return true;
    const refTel = esTelefonoValido(ref.telefono) ? normalizarTelefono(ref.telefono) : '';
    if (cliTel && refTel && cliTel === refTel) return true;
    const refMail = normalizarCorreo(ref.correo);
    if (cliMail && refMail && cliMail === refMail) return true;
    const refNom = normalizarTexto(ref.nombre);
    if (cliNom && refNom && !NOMBRES_GENERICOS.has(cliNom) && cliNom === refNom) return true;
    return false;
  };

  const cotsMatch = cotizaciones.filter(c =>
    coincideRegistro({
      id: c.cliente?.id,
      nombre: c.cliente?.nombre,
      telefono: c.cliente?.telefono,
      nit_cc: c.cliente?.nit_cc,
      correo: c.cliente?.correo
    })
  );

  const ventasMatch = ventas.filter(v =>
    coincideRegistro({
      id: v.cliente_id,
      nombre: v.cliente_nombre,
      telefono: v.cliente_telefono,
      nit_cc: v.cliente_nit_cc,
      correo: v.cliente_correo
    })
  );

  const cotsIds = new Set(cotsMatch.map(c => c.id));
  const cotsNums = new Set(cotsMatch.map(c => c.numero_cot));
  const ventasIds = new Set(ventasMatch.map(v => v.id));

  const ordenesMatch = ordenes.filter(o =>
    (o.cotizacion_id && cotsIds.has(o.cotizacion_id)) ||
    (o.cotizacion_numero && cotsNums.has(o.cotizacion_numero)) ||
    (o.pos_venta_id && ventasIds.has(o.pos_venta_id)) ||
    coincideRegistro({
      id: (o as any).cliente_id,
      nombre: o.cliente_nombre,
      telefono: o.cliente_telefono
    })
  );

  const totalCotizado = cotsMatch.reduce((s, c) => s + (Number(c.total) || 0), 0);
  const totalPOS = ventasMatch.reduce((s, v) => s + (Number(v.total) || 0), 0);
  const totalAbonado =
    cotsMatch.reduce((s, c) => s + (Number(c.abono) || 0), 0) +
    ventasMatch.reduce((s, v) => s + (Number(v.abono) || 0), 0);
  const saldoPendiente =
    cotsMatch.reduce((s, c) => s + (Number(c.saldo_pendiente) || 0), 0) +
    ventasMatch.reduce((s, v) => s + (Number(v.saldo_pendiente) || 0), 0);

  return {
    cotizaciones: cotsMatch,
    ventas: ventasMatch,
    ordenes: ordenesMatch,
    resumen: {
      totalCotizado,
      totalPOS,
      totalOperado: totalCotizado + totalPOS,
      totalAbonado,
      saldoPendiente,
      totalRegistros: cotsMatch.length + ventasMatch.length + ordenesMatch.length
    }
  };
}

