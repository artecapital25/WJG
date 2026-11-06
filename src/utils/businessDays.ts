/**
 * Utilidades para cálculo de días hábiles, proyección de fechas de entrega
 * y plantillas de notas rápidas para el Cotizador de WJGEEKS 3D PRO.
 */

/**
 * Calcula la fecha calendario proyectada sumando un número de días hábiles.
 * En el taller se consideran días hábiles de lunes a sábado (omitiendo domingos).
 * Retorna fecha en formato ISO 'YYYY-MM-DD'.
 */
export function calcularFechaEstimada(diasHabiles: number, fechaBase: Date = new Date()): string {
  const fecha = new Date(fechaBase);
  let diasAgregados = 0;
  const diasMeta = Math.max(3, Math.min(60, Math.round(diasHabiles)));

  while (diasAgregados < diasMeta) {
    fecha.setDate(fecha.getDate() + 1);
    // 0 = Domingo
    if (fecha.getDay() !== 0) {
      diasAgregados++;
    }
  }

  return fecha.toISOString().slice(0, 10);
}

/**
 * Calcula el número de días hábiles (lunes a sábado) entre la fecha de hoy y una fecha objetivo.
 * Retorna un entero acotado entre 3 y 30 días hábiles.
 */
export function calcularDiasHabilesEntre(fechaObjetivoStr: string, fechaBase: Date = new Date()): number {
  if (!fechaObjetivoStr) return 3;

  const [year, month, day] = fechaObjetivoStr.split('-').map(Number);
  if (!year || !month || !day) return 3;

  const fechaFin = new Date(year, month - 1, day);
  const fechaActual = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate());

  if (fechaFin <= fechaActual) {
    return 3;
  }

  let diasHabiles = 0;
  const cursor = new Date(fechaActual);

  while (cursor < fechaFin) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() !== 0) {
      diasHabiles++;
    }
  }

  return Math.max(3, Math.min(30, diasHabiles));
}

/**
 * Formatea el texto canónico para cotizaciones y documentos.
 * Ej: "(5) Días hábiles (Aprox. 11/11/2026)"
 */
export function formatearTiempoEntrega(diasHabiles: number, fechaISO?: string): string {
  const dias = Math.max(3, Math.min(30, Math.round(diasHabiles)));
  if (!fechaISO) {
    return `(${dias}) Días hábiles`;
  }
  
  const [year, month, day] = fechaISO.split('-');
  if (year && month && day) {
    return `(${dias}) Días hábiles (Aprox. ${day}/${month}/${year})`;
  }

  return `(${dias}) Días hábiles`;
}

export interface NotaRapidaSugerida {
  id: string;
  etiqueta: string;
  texto: string;
}

export const NOTAS_RAPIDAS_SUGERIDAS: NotaRapidaSugerida[] = [
  {
    id: 'anticipo-50',
    etiqueta: 'Anticipo 50%',
    texto: '• Fabricación inicia tras confirmación del 50% de anticipo.'
  },
  {
    id: 'transporte-urbano',
    etiqueta: 'Transporte',
    texto: '• No incluye transporte fuera del perímetro urbano.'
  },
  {
    id: 'revision-malla',
    etiqueta: 'Revisión Slicer',
    texto: '• Archivos 3D y medidas sujetos a revisión en software de corte.'
  },
  {
    id: 'tolerancia-02',
    etiqueta: 'Tolerancia ±0.2mm',
    texto: '• Tolerancia dimensional estándar de ±0.2 mm según tecnología.'
  },
  {
    id: 'garantia-calidad',
    etiqueta: 'Garantía Estructural',
    texto: '• Garantía de calidad en detalle y resistencia estructural.'
  }
];

/**
 * Agrega o quita una nota rápida de un bloque de texto existente.
 */
export function toggleNotaRapida(textoActual: string, nota: string): string {
  const lineas = textoActual
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const notaLimpia = nota.trim();
  const index = lineas.findIndex(l => l.toLowerCase() === notaLimpia.toLowerCase());

  if (index >= 0) {
    // Si ya existe, se retira
    lineas.splice(index, 1);
  } else {
    // Si no existe, se anexa
    lineas.push(notaLimpia);
  }

  return lineas.join('\n');
}

