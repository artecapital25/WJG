import { parseGCodeContent } from './gcodeService';

export type SlicerFileFormat =
  | 'gcode'
  | 'bgcode'
  | '3mf'
  | 'ctb'
  | 'goo'
  | 'pwmb'
  | 'photon'
  | 'desconocido';

export interface SlicerParsedResult {
  formato: SlicerFileFormat;
  tecnologia: 'SLA_RESINA' | 'FDM_FILAMENTO';
  nombreSugerido: string;
  slicerDetectado: string;
  tiempoMinutos: number;
  pesoGramos: number;
  volumenMl?: number;
  pesoPurgaGramos: number;
  esMulticolorAMS: boolean;
  cantidadColores: number;
  tipoMaterial?: string;
  capas?: number;
  alturaCapaMm?: number;
  altoMm?: number;
  anchoMm?: number;
  profundidadMm?: number;
  thumbnailDataUrl?: string;
  camposExtraidos: string[];
  camposFaltantes: string[];
  advertencia?: string;
}

const DEFAULT_RESIN_DENSITY_G_ML = 1.13;

function cleanModelName(fileName: string): string {
  return (
    fileName
      .replace(/\.(gcode|gco|g|bgcode|3mf|ctb|goo|pwmb|pm5s|pwmo|photon)$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim() || 'Pieza Slicer'
  );
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function readAscii(view: DataView, start: number, maxLen: number): string {
  const end = Math.min(view.byteLength, start + maxLen);
  let out = '';
  for (let i = start; i < end; i++) {
    const b = view.getUint8(i);
    if (b === 0) break;
    if (b >= 32 && b <= 126) out += String.fromCharCode(b);
  }
  return out.trim();
}

function extractGCodeThumbnail(content: string): string | undefined {
  const match = content.match(
    /;\s*thumbnail\s+begin\s+\d+x\d+\s+\d+([\s\S]*?);\s*thumbnail\s+end/i
  );
  if (!match?.[1]) return undefined;
  const cleaned = match[1]
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*;?\s*/, '').trim())
    .join('');
  if (cleaned.length < 32) return undefined;
  return `data:image/png;base64,${cleaned}`;
}

export function parseGCodeWithThumbnail(
  content: string,
  fileName: string = 'pieza.gcode'
): SlicerParsedResult {
  const base = parseGCodeContent(content, fileName);
  const thumbnailDataUrl = extractGCodeThumbnail(content);
  const camposExtraidos: string[] = [];
  const camposFaltantes: string[] = [];

  if (base.tiempoMinutos > 0) camposExtraidos.push('Tiempo de impresión');
  else camposFaltantes.push('Tiempo de impresión');

  if (base.pesoGramos > 0) camposExtraidos.push('Peso filamento (g)');
  else camposFaltantes.push('Peso filamento (g)');

  if (base.capas) camposExtraidos.push('Capas');
  if (base.esMulticolorAMS) camposExtraidos.push(`AMS (${base.cantidadColores} colores)`);
  if (thumbnailDataUrl) camposExtraidos.push('Miniatura PNG');

  const isBgcode = /\.bgcode$/i.test(fileName);

  return {
    formato: isBgcode ? 'bgcode' : 'gcode',
    tecnologia: 'FDM_FILAMENTO',
    nombreSugerido: base.nombreSugerido,
    slicerDetectado: base.slicerDetectado,
    tiempoMinutos: base.tiempoMinutos,
    pesoGramos: base.pesoGramos,
    pesoPurgaGramos: base.pesoPurgaGramos,
    esMulticolorAMS: base.esMulticolorAMS,
    cantidadColores: base.cantidadColores,
    tipoMaterial: base.tipoFilamento,
    capas: base.capas,
    thumbnailDataUrl,
    camposExtraidos,
    camposFaltantes,
    advertencia:
      camposFaltantes.length > 0
        ? `Faltan datos en el archivo (${camposFaltantes.join(', ')}). Completa manualmente los faltantes.`
        : undefined
  };
}

interface ZipEntryMeta {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

async function decompressDeflateRaw(compressed: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    const copy = new Uint8Array(compressed.byteLength);
    copy.set(compressed);
    writer.write(copy);
    writer.close();
    const response = new Response(ds.readable);
    const buf = await response.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function extractZipEntries(
  buffer: ArrayBuffer,
  shouldRead: (name: string) => boolean
): Promise<Map<string, Uint8Array>> {
  const result = new Map<string, Uint8Array>();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Buscar End of Central Directory (PK\x05\x06)
  let eocdOffset = -1;
  const minOffset = Math.max(0, bytes.length - 65558);
  for (let i = bytes.length - 22; i >= minOffset; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) return result;

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const entries: ZipEntryMeta[] = [];

  let ptr = cdOffset;
  const decoder = new TextDecoder('utf-8');
  for (let n = 0; n < totalEntries && ptr + 46 <= bytes.length; n++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);
    const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));

    entries.push({ name, method, compressedSize, localHeaderOffset });
    ptr += 46 + nameLen + extraLen + commentLen;
  }

  for (const entry of entries) {
    if (!shouldRead(entry.name)) continue;
    const lh = entry.localHeaderOffset;
    if (lh + 30 > bytes.length || view.getUint32(lh, true) !== 0x04034b50) continue;

    const lhNameLen = view.getUint16(lh + 26, true);
    const lhExtraLen = view.getUint16(lh + 28, true);
    const dataStart = lh + 30 + lhNameLen + lhExtraLen;
    const dataEnd = Math.min(bytes.length, dataStart + entry.compressedSize);
    const payload = bytes.subarray(dataStart, dataEnd);

    if (entry.method === 0) {
      result.set(entry.name, payload);
    } else if (entry.method === 8) {
      const inflated = await decompressDeflateRaw(payload);
      if (inflated) result.set(entry.name, inflated);
    }
  }

  return result;
}

function parseSliceInfoXml(xml: string): {
  tiempoMinutos: number;
  pesoGramos: number;
  pesoPurgaGramos: number;
  cantidadColores: number;
  tipoMaterial?: string;
  alturaCapaMm?: number;
  slicerDetectado?: string;
} {
  let tiempoMinutos = 0;
  let pesoGramos = 0;
  const pesoPurgaGramos = 0;
  let cantidadColores = 1;
  let tipoMaterial: string | undefined;
  let alturaCapaMm: number | undefined;
  let slicerDetectado: string | undefined;

  const predMatch = xml.match(/key=["']prediction["']\s+value=["']([\d.]+)["']/i);
  if (predMatch?.[1]) {
    tiempoMinutos = Math.max(1, Math.round(parseFloat(predMatch[1]) / 60));
  }

  const weightMatch = xml.match(/key=["']weight["']\s+value=["']([\d.]+)["']/i);
  if (weightMatch?.[1]) {
    pesoGramos = Number(parseFloat(weightMatch[1]).toFixed(2));
  }

  const lhMatch = xml.match(/key=["']layer_height["']\s+value=["']([\d.]+)["']/i);
  if (lhMatch?.[1]) {
    alturaCapaMm = parseFloat(lhMatch[1]);
  }

  const printerMatch = xml.match(/key=["']printer_model_id["']\s+value=["']([^"']+)["']/i);
  if (printerMatch?.[1]) {
    slicerDetectado = `Bambu Studio / Orca (${printerMatch[1]})`;
  }

  const filRegex = /<filament\b([^>]*)>/gi;
  const usedMaterials: string[] = [];
  let sumFilamentG = 0;
  let filCount = 0;
  let m: RegExpExecArray | null;
  while ((m = filRegex.exec(xml)) !== null) {
    const attrs = m[1];
    const usedMatch = attrs.match(/used_g=["']([\d.]+)["']/i);
    const typeMatch = attrs.match(/type=["']([^"']+)["']/i);
    const usedG = usedMatch?.[1] ? parseFloat(usedMatch[1]) : 0;
    if (usedG > 0) {
      filCount++;
      sumFilamentG += usedG;
    }
    if (typeMatch?.[1] && !usedMaterials.includes(typeMatch[1])) {
      usedMaterials.push(typeMatch[1]);
    }
  }
  if (filCount > 1) cantidadColores = filCount;
  if (pesoGramos === 0 && sumFilamentG > 0) {
    pesoGramos = Number(sumFilamentG.toFixed(2));
  }
  if (usedMaterials.length > 0) tipoMaterial = usedMaterials[0];

  return {
    tiempoMinutos,
    pesoGramos,
    pesoPurgaGramos,
    cantidadColores,
    tipoMaterial,
    alturaCapaMm,
    slicerDetectado
  };
}

function parse3mfModelBounds(xml: string): {
  anchoMm?: number;
  profundidadMm?: number;
  altoMm?: number;
} {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let count = 0;

  const vertexRegex = /<vertex\b[^>]*x=["']([-\d.eE+]+)["'][^>]*y=["']([-\d.eE+]+)["'][^>]*z=["']([-\d.eE+]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = vertexRegex.exec(xml)) !== null) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const z = parseFloat(match[3]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
      count++;
      if (count > 250000) break;
    }
  }

  if (count === 0) return {};
  return {
    anchoMm: Number((maxX - minX).toFixed(1)),
    profundidadMm: Number((maxY - minY).toFixed(1)),
    altoMm: Number((maxZ - minZ).toFixed(1))
  };
}

export async function parse3MFBuffer(
  buffer: ArrayBuffer,
  fileName: string = 'modelo.3mf'
): Promise<SlicerParsedResult> {
  const nombreSugerido = cleanModelName(fileName);
  const decoder = new TextDecoder('utf-8');

  const entries = await extractZipEntries(buffer, name => {
    const lower = name.toLowerCase();
    return (
      lower.includes('slice_info') ||
      lower.endsWith('.gcode') ||
      lower.endsWith('3dmodel.model') ||
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.includes('metadata/')
    );
  });

  if (entries.size === 0) {
    return {
      formato: '3mf',
      tecnologia: 'FDM_FILAMENTO',
      nombreSugerido,
      slicerDetectado: '3MF',
      tiempoMinutos: 0,
      pesoGramos: 0,
      pesoPurgaGramos: 0,
      esMulticolorAMS: false,
      cantidadColores: 1,
      camposExtraidos: [],
      camposFaltantes: ['Tiempo de impresión', 'Peso filamento (g)'],
      advertencia: 'No se pudieron leer las entradas internas del archivo .3mf.'
    };
  }

  let tiempoMinutos = 0;
  let pesoGramos = 0;
  let pesoPurgaGramos = 0;
  let cantidadColores = 1;
  let tipoMaterial: string | undefined;
  let alturaCapaMm: number | undefined;
  let capas: number | undefined;
  let slicerDetectado = '3MF (Bambu / Orca / Prusa)';
  let thumbnailDataUrl: string | undefined;
  let bounds: { anchoMm?: number; profundidadMm?: number; altoMm?: number } = {};

  // 1. Miniatura preferida
  const thumbCandidates = Array.from(entries.keys()).filter(k =>
    /metadata\/(?:plate_\d+|thumbnail)[^/]*\.(png|jpe?g)$|auxiliaries\/\.thumbnails\/[^/]+\.(png|jpe?g)$/i.test(k)
  );
  const bestThumbKey =
    thumbCandidates.find(k => /plate_1\.png$/i.test(k)) ||
    thumbCandidates.find(k => /thumbnail\.png$/i.test(k)) ||
    thumbCandidates[0];
  if (bestThumbKey) {
    const rawThumb = entries.get(bestThumbKey);
    if (rawThumb && rawThumb.length > 32) {
      const mime = /\.jpe?g$/i.test(bestThumbKey) ? 'image/jpeg' : 'image/png';
      thumbnailDataUrl = `data:${mime};base64,${uint8ToBase64(rawThumb)}`;
    }
  }

  // 2. slice_info.config (Bambu Studio / OrcaSlicer)
  const sliceInfoKey = Array.from(entries.keys()).find(k => /slice_info\.config$/i.test(k));
  if (sliceInfoKey) {
    const xml = decoder.decode(entries.get(sliceInfoKey));
    const parsedXml = parseSliceInfoXml(xml);
    tiempoMinutos = parsedXml.tiempoMinutos;
    pesoGramos = parsedXml.pesoGramos;
    cantidadColores = parsedXml.cantidadColores;
    tipoMaterial = parsedXml.tipoMaterial;
    alturaCapaMm = parsedXml.alturaCapaMm;
    if (parsedXml.slicerDetectado) slicerDetectado = parsedXml.slicerDetectado;
  }

  // 3. G-code embebido dentro del .3mf
  const gcodeKey = Array.from(entries.keys()).find(k => /\.gcode$/i.test(k));
  if (gcodeKey) {
    const gcodeBytes = entries.get(gcodeKey)!;
    const headLen = Math.min(gcodeBytes.length, 64 * 1024);
    const tailStart = Math.max(0, gcodeBytes.length - 64 * 1024);
    const sampleText =
      gcodeBytes.length <= 128 * 1024
        ? decoder.decode(gcodeBytes)
        : `${decoder.decode(gcodeBytes.subarray(0, headLen))}\n${decoder.decode(gcodeBytes.subarray(tailStart))}`;
    const gParsed = parseGCodeWithThumbnail(sampleText, fileName);
    if (tiempoMinutos === 0 && gParsed.tiempoMinutos > 0) tiempoMinutos = gParsed.tiempoMinutos;
    if (pesoGramos === 0 && gParsed.pesoGramos > 0) pesoGramos = gParsed.pesoGramos;
    if (gParsed.pesoPurgaGramos > 0) pesoPurgaGramos = gParsed.pesoPurgaGramos;
    if (gParsed.cantidadColores > cantidadColores) cantidadColores = gParsed.cantidadColores;
    if (!tipoMaterial && gParsed.tipoMaterial) tipoMaterial = gParsed.tipoMaterial;
    if (!capas && gParsed.capas) capas = gParsed.capas;
    if (!thumbnailDataUrl && gParsed.thumbnailDataUrl) thumbnailDataUrl = gParsed.thumbnailDataUrl;
    if (gParsed.slicerDetectado !== 'Genérico') slicerDetectado = `${gParsed.slicerDetectado} (.3mf)`;
  }

  // 4. Dimensiones desde 3D/3dmodel.model si existe
  const modelKey = Array.from(entries.keys()).find(k => /3dmodel\.model$/i.test(k));
  if (modelKey) {
    const modelXml = decoder.decode(entries.get(modelKey));
    bounds = parse3mfModelBounds(modelXml);
  }

  const camposExtraidos: string[] = [];
  const camposFaltantes: string[] = [];
  if (tiempoMinutos > 0) camposExtraidos.push('Tiempo de impresión');
  else camposFaltantes.push('Tiempo de impresión');
  if (pesoGramos > 0) camposExtraidos.push('Peso filamento (g)');
  else camposFaltantes.push('Peso filamento (g)');
  if (bounds.altoMm) camposExtraidos.push('Dimensiones 3D (mm)');
  if (cantidadColores > 1) camposExtraidos.push(`AMS (${cantidadColores} colores)`);
  if (thumbnailDataUrl) camposExtraidos.push('Miniatura 3D');

  const esSinLaminar = tiempoMinutos === 0 && pesoGramos === 0;
  const advertencia = esSinLaminar
    ? 'Este .3mf contiene el proyecto/geometría sin laminar en el slicer. Ingresa manualmente gramos y tiempo, o expórtalo ya laminado.'
    : camposFaltantes.length > 0
      ? `Faltan en el .3mf: ${camposFaltantes.join(', ')}. Puedes completarlos manualmente.`
      : undefined;

  return {
    formato: '3mf',
    tecnologia: 'FDM_FILAMENTO',
    nombreSugerido,
    slicerDetectado,
    tiempoMinutos,
    pesoGramos,
    pesoPurgaGramos,
    esMulticolorAMS: cantidadColores > 1 || pesoPurgaGramos > 0,
    cantidadColores,
    tipoMaterial,
    capas,
    alturaCapaMm,
    altoMm: bounds.altoMm,
    anchoMm: bounds.anchoMm,
    profundidadMm: bounds.profundidadMm,
    thumbnailDataUrl,
    camposExtraidos,
    camposFaltantes,
    advertencia
  };
}

export function parseCTBBuffer(buffer: ArrayBuffer, fileName: string = 'pieza.ctb'): SlicerParsedResult {
  const nombreSugerido = cleanModelName(fileName);
  const view = new DataView(buffer);

  if (buffer.byteLength < 80) {
    return {
      formato: 'ctb',
      tecnologia: 'SLA_RESINA',
      nombreSugerido,
      slicerDetectado: 'Chitubox (.ctb)',
      tiempoMinutos: 0,
      pesoGramos: 0,
      pesoPurgaGramos: 0,
      esMulticolorAMS: false,
      cantidadColores: 1,
      camposExtraidos: [],
      camposFaltantes: ['Tiempo de impresión', 'Peso / Volumen de resina'],
      advertencia: 'Archivo .ctb incompleto o demasiado pequeño para leer cabecera.'
    };
  }

  const rawHeight = view.getFloat32(28, true);
  const rawLayerH = view.getFloat32(32, true);
  const rawLayers = view.getUint32(68, true);
  const rawTimeSec = view.getUint32(76, true);

  const altoMm = Number.isFinite(rawHeight) && rawHeight > 0.1 && rawHeight < 1000 ? Number(rawHeight.toFixed(1)) : undefined;
  const alturaCapaMm = Number.isFinite(rawLayerH) && rawLayerH >= 0.005 && rawLayerH <= 0.5 ? Number(rawLayerH.toFixed(3)) : undefined;
  const capas = rawLayers > 0 && rawLayers < 50000 ? rawLayers : undefined;
  const tiempoMinutos = rawTimeSec > 10 && rawTimeSec < 2592000 ? Math.max(1, Math.round(rawTimeSec / 60)) : 0;

  let volumenMl: number | undefined;
  let pesoGramos = 0;
  // Bloque extendido opcional (Chitubox PrintParameters)
  if (buffer.byteLength >= 96) {
    const slicerConfigOffset = view.getUint32(92, true);
    if (slicerConfigOffset > 96 && slicerConfigOffset + 44 <= buffer.byteLength) {
      const candidateVol = view.getFloat32(slicerConfigOffset + 36, true);
      if (Number.isFinite(candidateVol) && candidateVol > 0.05 && candidateVol < 20000) {
        volumenMl = Number(candidateVol.toFixed(2));
        pesoGramos = Number((volumenMl * DEFAULT_RESIN_DENSITY_G_ML).toFixed(2));
      }
    }
  }

  const camposExtraidos: string[] = [];
  const camposFaltantes: string[] = [];
  if (tiempoMinutos > 0) camposExtraidos.push('Tiempo de impresión');
  else camposFaltantes.push('Tiempo de impresión');
  if (pesoGramos > 0) camposExtraidos.push('Volumen/Peso de resina');
  else camposFaltantes.push('Volumen/Peso de resina (ml/g)');
  if (capas) camposExtraidos.push(`${capas} capas`);
  if (altoMm) camposExtraidos.push(`Altura Z ${altoMm} mm`);

  return {
    formato: 'ctb',
    tecnologia: 'SLA_RESINA',
    nombreSugerido,
    slicerDetectado: 'Chitubox / Lychee (.ctb)',
    tiempoMinutos,
    pesoGramos,
    volumenMl,
    pesoPurgaGramos: 0,
    esMulticolorAMS: false,
    cantidadColores: 1,
    capas,
    alturaCapaMm,
    altoMm,
    camposExtraidos,
    camposFaltantes,
    advertencia:
      camposFaltantes.length > 0
        ? `Archivo .ctb leído parcialmente. Falta: ${camposFaltantes.join(', ')} (algunas versiones CTB v4/v5 no guardan ml en texto plano).`
        : undefined
  };
}

export function parseGOOBuffer(buffer: ArrayBuffer, fileName: string = 'pieza.goo'): SlicerParsedResult {
  const nombreSugerido = cleanModelName(fileName);
  const view = new DataView(buffer);

  if (buffer.byteLength < 64) {
    return {
      formato: 'goo',
      tecnologia: 'SLA_RESINA',
      nombreSugerido,
      slicerDetectado: 'Elegoo / Lychee (.goo)',
      tiempoMinutos: 0,
      pesoGramos: 0,
      pesoPurgaGramos: 0,
      esMulticolorAMS: false,
      cantidadColores: 1,
      camposExtraidos: [],
      camposFaltantes: ['Tiempo de impresión', 'Volumen/Peso de resina'],
      advertencia: 'Archivo .goo demasiado pequeño para leer cabecera.'
    };
  }

  const software = readAscii(view, 12, 32) || 'Elegoo / Lychee (.goo)';
  // Elegoo .goo v3 header tras preview 116x116 + 290x290 (o compactado en pruebas sintéticas)
  let totalLayers: number | undefined;
  let layerHeightMm: number | undefined;
  let printTimeSec = 0;
  let volumenMl: number | undefined;

  const candidateOffsets = [195105, 64];
  for (const base of candidateOffsets) {
    if (base + 24 <= buffer.byteLength) {
      const layers = view.getUint32(base, false);
      const lh = view.getFloat32(base + 4, false);
      const tSec = view.getUint32(base + 8, false);
      const vol = view.getFloat32(base + 12, false);
      if (layers > 0 && layers < 50000 && lh >= 0.005 && lh <= 0.5) {
        totalLayers = layers;
        layerHeightMm = Number(lh.toFixed(3));
        if (tSec > 10 && tSec < 2592000) printTimeSec = tSec;
        if (Number.isFinite(vol) && vol > 0.05 && vol < 20000) volumenMl = Number(vol.toFixed(2));
        break;
      }
    }
  }

  const tiempoMinutos = printTimeSec > 0 ? Math.max(1, Math.round(printTimeSec / 60)) : 0;
  const pesoGramos = volumenMl ? Number((volumenMl * DEFAULT_RESIN_DENSITY_G_ML).toFixed(2)) : 0;
  const altoMm = totalLayers && layerHeightMm ? Number((totalLayers * layerHeightMm).toFixed(1)) : undefined;

  const camposExtraidos: string[] = [];
  const camposFaltantes: string[] = [];
  if (tiempoMinutos > 0) camposExtraidos.push('Tiempo de impresión');
  else camposFaltantes.push('Tiempo de impresión');
  if (pesoGramos > 0) camposExtraidos.push('Volumen/Peso de resina');
  else camposFaltantes.push('Volumen/Peso de resina (ml/g)');
  if (totalLayers) camposExtraidos.push(`${totalLayers} capas`);
  if (altoMm) camposExtraidos.push(`Altura Z ${altoMm} mm`);

  return {
    formato: 'goo',
    tecnologia: 'SLA_RESINA',
    nombreSugerido,
    slicerDetectado: software.includes('V') || software.length < 3 ? 'Elegoo / Lychee (.goo)' : software,
    tiempoMinutos,
    pesoGramos,
    volumenMl,
    pesoPurgaGramos: 0,
    esMulticolorAMS: false,
    cantidadColores: 1,
    capas: totalLayers,
    alturaCapaMm: layerHeightMm,
    altoMm,
    camposExtraidos,
    camposFaltantes,
    advertencia:
      camposFaltantes.length > 0
        ? `Archivo .goo leído parcialmente. Falta: ${camposFaltantes.join(', ')}.`
        : undefined
  };
}

export function parseAnycubicBuffer(buffer: ArrayBuffer, fileName: string = 'pieza.pwmb'): SlicerParsedResult {
  const nombreSugerido = cleanModelName(fileName);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const isPhoton = /\.photon$/i.test(fileName);

  // Buscar sección "HEADER" de Anycubic Photon Workshop (.pwmb / .pm5s / .pwmo)
  let headerStart = -1;
  const scanLimit = Math.min(bytes.length - 6, 4096);
  for (let i = 0; i < scanLimit; i++) {
    if (
      bytes[i] === 0x48 && // H
      bytes[i + 1] === 0x45 && // E
      bytes[i + 2] === 0x41 && // A
      bytes[i + 3] === 0x44 && // D
      bytes[i + 4] === 0x45 && // E
      bytes[i + 5] === 0x52 // R
    ) {
      headerStart = i;
      break;
    }
  }

  let capas: number | undefined;
  let alturaCapaMm: number | undefined;
  let tiempoMinutos = 0;
  let volumenMl: number | undefined;
  let pesoGramos = 0;

  if (headerStart >= 0 && headerStart + 52 <= buffer.byteLength) {
    const base = headerStart + 16; // Tras HEADER(12) + sectionSize(4)
    if (base + 32 <= buffer.byteLength) {
      const layerH = view.getFloat32(base + 4, true);
      const printSec = view.getUint32(base + 20, true);
      const layers = view.getUint32(base + 24, true);
      const vol = view.getFloat32(base + 28, true);

      if (Number.isFinite(layerH) && layerH >= 0.005 && layerH <= 0.5) {
        alturaCapaMm = Number(layerH.toFixed(3));
      }
      if (layers > 0 && layers < 50000) {
        capas = layers;
      }
      if (printSec > 10 && printSec < 2592000) {
        tiempoMinutos = Math.max(1, Math.round(printSec / 60));
      }
      if (Number.isFinite(vol) && vol > 0.05 && vol < 20000) {
        volumenMl = Number(vol.toFixed(2));
        pesoGramos = Number((volumenMl * DEFAULT_RESIN_DENSITY_G_ML).toFixed(2));
      }
    }
  }

  const altoMm = capas && alturaCapaMm ? Number((capas * alturaCapaMm).toFixed(1)) : undefined;
  const camposExtraidos: string[] = [];
  const camposFaltantes: string[] = [];

  if (tiempoMinutos > 0) camposExtraidos.push('Tiempo de impresión');
  else camposFaltantes.push('Tiempo de impresión');
  if (pesoGramos > 0) camposExtraidos.push('Volumen/Peso de resina');
  else camposFaltantes.push('Volumen/Peso de resina (ml/g)');
  if (capas) camposExtraidos.push(`${capas} capas`);
  if (altoMm) camposExtraidos.push(`Altura Z ${altoMm} mm`);

  return {
    formato: isPhoton ? 'photon' : 'pwmb',
    tecnologia: 'SLA_RESINA',
    nombreSugerido,
    slicerDetectado: 'Anycubic Photon Workshop',
    tiempoMinutos,
    pesoGramos,
    volumenMl,
    pesoPurgaGramos: 0,
    esMulticolorAMS: false,
    cantidadColores: 1,
    capas,
    alturaCapaMm,
    altoMm,
    camposExtraidos,
    camposFaltantes,
    advertencia:
      camposFaltantes.length > 0
        ? `Archivo Anycubic leído parcialmente. Falta: ${camposFaltantes.join(', ')}.`
        : undefined
  };
}

export async function compressThumbnailIfBrowser(dataUrl?: string): Promise<string | undefined> {
  if (!dataUrl || typeof document === 'undefined' || typeof Image === 'undefined') {
    return dataUrl;
  }
  return new Promise(resolve => {
    try {
      const img = new Image();
      img.onload = () => {
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const webp = canvas.toDataURL('image/webp', 0.78);
        resolve(webp && webp.startsWith('data:image/') ? webp : dataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

export async function parseSlicerFile(file: File): Promise<SlicerParsedResult> {
  const name = file.name || 'archivo';
  const lower = name.toLowerCase();

  try {
    if (lower.endsWith('.gcode') || lower.endsWith('.gco') || lower.endsWith('.g') || lower.endsWith('.bgcode')) {
      const CHUNK_SIZE = 128 * 1024;
      let text = '';
      if (file.size <= CHUNK_SIZE * 2) {
        text = await file.text();
      } else {
        const head = await file.slice(0, CHUNK_SIZE).text();
        const tail = await file.slice(file.size - CHUNK_SIZE).text();
        text = `${head}\n${tail}`;
      }
      const parsed = parseGCodeWithThumbnail(text, name);
      parsed.thumbnailDataUrl = await compressThumbnailIfBrowser(parsed.thumbnailDataUrl);
      return parsed;
    }

    if (lower.endsWith('.3mf')) {
      const buffer = await file.arrayBuffer();
      const parsed = await parse3MFBuffer(buffer, name);
      parsed.thumbnailDataUrl = await compressThumbnailIfBrowser(parsed.thumbnailDataUrl);
      return parsed;
    }

    if (lower.endsWith('.ctb')) {
      const sliceBuf = await file.slice(0, Math.min(file.size, 64 * 1024)).arrayBuffer();
      return parseCTBBuffer(sliceBuf, name);
    }

    if (lower.endsWith('.goo')) {
      const sliceBuf = await file.slice(0, Math.min(file.size, 256 * 1024)).arrayBuffer();
      return parseGOOBuffer(sliceBuf, name);
    }

    if (lower.endsWith('.pwmb') || lower.endsWith('.pm5s') || lower.endsWith('.pwmo') || lower.endsWith('.photon')) {
      const sliceBuf = await file.slice(0, Math.min(file.size, 64 * 1024)).arrayBuffer();
      return parseAnycubicBuffer(sliceBuf, name);
    }

    return {
      formato: 'desconocido',
      tecnologia: 'SLA_RESINA',
      nombreSugerido: cleanModelName(name),
      slicerDetectado: 'Formato no reconocido',
      tiempoMinutos: 0,
      pesoGramos: 0,
      pesoPurgaGramos: 0,
      esMulticolorAMS: false,
      cantidadColores: 1,
      camposExtraidos: [],
      camposFaltantes: ['Tiempo de impresión', 'Peso / Volumen'],
      advertencia: `Formato no compatible ("${name}"). Sube archivos .3mf, .gcode, .ctb, .goo o .pwmb/.pm5s.`
    };
  } catch (err) {
    return {
      formato: 'desconocido',
      tecnologia: 'SLA_RESINA',
      nombreSugerido: cleanModelName(name),
      slicerDetectado: 'Error de lectura',
      tiempoMinutos: 0,
      pesoGramos: 0,
      pesoPurgaGramos: 0,
      esMulticolorAMS: false,
      cantidadColores: 1,
      camposExtraidos: [],
      camposFaltantes: ['Tiempo de impresión', 'Peso / Volumen'],
      advertencia: err instanceof Error ? err.message : 'No se pudo procesar el archivo en el navegador.'
    };
  }
}
