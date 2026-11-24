/**
 * Lector rápido de archivos .gcode en cliente (Bambu Studio, OrcaSlicer, PrusaSlicer, Cura)
 * Lee cabecera y pie (primeros y últimos 64 KB) para evitar bloquear el navegador con archivos grandes.
 */

export interface GCodeParsedData {
  nombreSugerido: string;
  slicerDetectado: 'Bambu Studio / OrcaSlicer' | 'PrusaSlicer' | 'Cura' | 'Genérico';
  tiempoMinutos: number;
  pesoGramos: number;
  pesoPurgaGramos: number;
  esMulticolorAMS: boolean;
  cantidadColores: number;
  tipoFilamento?: string;
  capas?: number;
  temperaturaNozzle?: number;
  temperaturaCama?: number;
}

function parseTiempoTexto(raw: string): number {
  const s = raw.trim().toLowerCase();
  // Si es número puro en segundos (ej. Cura ;TIME:14520)
  if (/^\d+(\.\d+)?$/.test(s)) {
    return Math.max(1, Math.round(parseFloat(s) / 60));
  }
  let totalMin = 0;
  const d = s.match(/(\d+)\s*d/);
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*m(?!m)/);
  const sec = s.match(/(\d+)\s*s/);
  if (d) totalMin += parseInt(d[1], 10) * 1440;
  if (h) totalMin += parseInt(h[1], 10) * 60;
  if (m) totalMin += parseInt(m[1], 10);
  if (sec && parseInt(sec[1], 10) >= 30) totalMin += 1;
  return totalMin;
}

function sumarListaNumerica(raw: string): number {
  const nums = raw
    .split(/[,;\s]+/)
    .map(v => parseFloat(v.trim()))
    .filter(n => !isNaN(n) && n > 0);
  return nums.reduce((acc, n) => acc + n, 0);
}

export function parseGCodeContent(content: string, fileName: string = 'pieza.gcode'): GCodeParsedData {
  const nombreSugerido = fileName
    .replace(/\.(gcode|gco|g)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim() || 'Pieza G-Code';

  let slicerDetectado: GCodeParsedData['slicerDetectado'] = 'Genérico';
  if (/BambuStudio|OrcaSlicer/i.test(content)) {
    slicerDetectado = 'Bambu Studio / OrcaSlicer';
  } else if (/PrusaSlicer|SuperSlicer/i.test(content)) {
    slicerDetectado = 'PrusaSlicer';
  } else if (/Cura_SteamEngine|FLAVOR:Marlin/i.test(content)) {
    slicerDetectado = 'Cura';
  }

  let tiempoMinutos = 0;
  let pesoGramos = 0;
  let pesoPurgaGramos = 0;
  let cantidadColores = 1;
  let tipoFilamento: string | undefined;
  let capas: number | undefined;
  let temperaturaNozzle: number | undefined;
  let temperaturaCama: number | undefined;

  // 1. Tiempo de impresión
  const bambuTime = content.match(/;\s*(?:total\s+)?estimated\s+printing\s+time(?:\s*\([^)]*\))?\s*[:=]\s*([^\r\n]+)/i);
  const modelTime = content.match(/;\s*model\s+printing\s+time:\s*([^\r\n;]+)/i);
  const curaTime = content.match(/;\s*TIME:\s*(\d+)/i);
  if (bambuTime?.[1]) {
    tiempoMinutos = parseTiempoTexto(bambuTime[1]);
  } else if (modelTime?.[1]) {
    tiempoMinutos = parseTiempoTexto(modelTime[1]);
  } else if (curaTime?.[1]) {
    tiempoMinutos = parseTiempoTexto(curaTime[1]);
  }

  // 2. Peso en gramos (total y/o multicolor)
  const totalGramsMatch = content.match(/;\s*(?:total\s+)?filament\s+used\s*\[g\]\s*[:=]\s*([^\r\n]+)/i);
  const prusaGramsMatch = content.match(/;\s*filament\s+used\s*\[g\]\s*=\s*([^\r\n]+)/i);
  const flushGramsMatch = content.match(/;\s*(?:total\s+)?filament\s+flush(?:ed)?(?:\s*weight)?\s*\[g\]\s*[:=]\s*([^\r\n]+)/i);
  const purgeTowerMatch = content.match(/;\s*prime\s+tower\s+filament\s*\[g\]\s*[:=]\s*([^\r\n]+)/i);
  const curaWeightMatch = content.match(/;\s*Filament\s+weight\s*[:=]\s*([\d.]+)/i);

  const rawGramsLine = totalGramsMatch?.[1] || prusaGramsMatch?.[1];
  if (rawGramsLine) {
    const parts = rawGramsLine
      .split(/[,;\s]+/)
      .map(v => parseFloat(v.trim()))
      .filter(n => !isNaN(n) && n > 0);
    if (parts.length > 0) {
      pesoGramos = Number(parts.reduce((a, b) => a + b, 0).toFixed(2));
      if (parts.length > 1) cantidadColores = parts.length;
    }
  } else if (curaWeightMatch?.[1]) {
    pesoGramos = Number(parseFloat(curaWeightMatch[1]).toFixed(2));
  }

  // Fallback por metros si el slicer solo reportó longitud (aprox PLA 1.75mm ≈ 2.98 g/m)
  if (pesoGramos === 0) {
    const lengthMetersMatch = content.match(/;\s*(?:total\s+)?filament\s+used\s*\[m\]\s*[:=]\s*([^\r\n]+)/i);
    const curaLenMatch = content.match(/;\s*Filament\s+used:\s*([\d.]+)\s*m/i);
    if (lengthMetersMatch?.[1]) {
      pesoGramos = Number((sumarListaNumerica(lengthMetersMatch[1]) * 2.98).toFixed(2));
    } else if (curaLenMatch?.[1]) {
      pesoGramos = Number((parseFloat(curaLenMatch[1]) * 2.98).toFixed(2));
    }
  }

  if (flushGramsMatch?.[1]) {
    pesoPurgaGramos += sumarListaNumerica(flushGramsMatch[1]);
  }
  if (purgeTowerMatch?.[1]) {
    pesoPurgaGramos += sumarListaNumerica(purgeTowerMatch[1]);
  }
  pesoPurgaGramos = Number(pesoPurgaGramos.toFixed(2));

  // 3. Metadatos útiles (filamento, capas, temperaturas)
  const filTypeMatch = content.match(/;\s*filament_type\s*=\s*([^\r\n]+)/i);
  if (filTypeMatch?.[1]) {
    const first = filTypeMatch[1].split(/[;,]/)[0]?.trim();
    if (first) tipoFilamento = first;
    const uniqueColors = filTypeMatch[1].split(/[;,]/).map(s => s.trim()).filter(Boolean).length;
    if (uniqueColors > cantidadColores) cantidadColores = uniqueColors;
  }

  const layersMatch = content.match(/;\s*(?:total\s+layer\s+number|LAYER_COUNT)\s*[:=]\s*(\d+)/i);
  if (layersMatch?.[1]) capas = parseInt(layersMatch[1], 10);

  const nozzleMatch = content.match(/(?:M104|M109)\s+S(\d+)/);
  if (nozzleMatch?.[1]) temperaturaNozzle = parseInt(nozzleMatch[1], 10);

  const bedMatch = content.match(/(?:M140|M190)\s+S(\d+)/);
  if (bedMatch?.[1]) temperaturaCama = parseInt(bedMatch[1], 10);

  return {
    nombreSugerido,
    slicerDetectado,
    tiempoMinutos,
    pesoGramos,
    pesoPurgaGramos,
    esMulticolorAMS: cantidadColores > 1 || pesoPurgaGramos > 0,
    cantidadColores,
    tipoFilamento,
    capas,
    temperaturaNozzle,
    temperaturaCama
  };
}

export async function parseGCodeFile(file: File): Promise<GCodeParsedData> {
  const CHUNK_SIZE = 96 * 1024; // 96 KB cabeza + 96 KB cola
  let text = '';
  if (file.size <= CHUNK_SIZE * 2) {
    text = await file.text();
  } else {
    const head = await file.slice(0, CHUNK_SIZE).text();
    const tail = await file.slice(file.size - CHUNK_SIZE).text();
    text = `${head}\n${tail}`;
  }
  return parseGCodeContent(text, file.name);
}
