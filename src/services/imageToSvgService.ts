import * as THREE from 'three';

export interface Point2D {
  x: number;
  y: number;
}

export interface TracedPolygon {
  outer: Point2D[];
  holes: Point2D[][];
  area: number;
}

export interface TraceContoursOptions {
  simplifyEpsilon?: number;
  smoothPasses?: number;
  minAreaPx?: number;
}

/**
 * Convierte un buffer RGBA en una máscara binaria (0 = fondo, 1 = figura).
 * Por defecto considera píxeles oscuros y opacos como figura; con `invert = true` invierte la selección.
 */
export function thresholdImageDataToBinaryMask(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number = 128,
  invert: boolean = false
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const thr = Math.max(0, Math.min(255, threshold));

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = rgba[idx] ?? 0;
    const g = rgba[idx + 1] ?? 0;
    const b = rgba[idx + 2] ?? 0;
    const a = rgba[idx + 3] ?? 255;

    if (a < 30) {
      mask[i] = invert ? 1 : 0;
      continue;
    }

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const isSolid = invert ? lum >= thr : lum < thr;
    mask[i] = isSolid ? 1 : 0;
  }

  return mask;
}

/**
 * Dilatación morfológica circular para engrosar siluetas o construir paredes de cortadores.
 */
export function dilateBinaryMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radiusPx: number
): Uint8Array {
  const r = Math.max(0, Math.round(radiusPx));
  if (r === 0) return new Uint8Array(mask);

  const out = new Uint8Array(width * height);
  const r2 = r * r;
  const offsets: Array<[number, number]> = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r2) {
        offsets.push([dx, dy]);
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 1) {
        for (let k = 0; k < offsets.length; k++) {
          const nx = x + offsets[k][0];
          const ny = y + offsets[k][1];
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            out[ny * width + nx] = 1;
          }
        }
      }
    }
  }

  return out;
}

function signedPolygonArea(pts: Point2D[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    sum += p1.x * p2.y - p2.x * p1.y;
  }
  return sum * 0.5;
}

function pointToSegmentDist(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 <= 1e-12) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function simplifyClosedPolygon(pts: Point2D[], epsilon: number): Point2D[] {
  if (pts.length <= 4 || epsilon <= 0) return pts;

  // Douglas-Peucker abierto desde los dos puntos más alejados o extremo a extremo cerrado
  const dp = (arr: Point2D[]): Point2D[] => {
    if (arr.length <= 2) return arr;
    let maxDist = 0;
    let maxIdx = 0;
    const first = arr[0];
    const last = arr[arr.length - 1];
    for (let i = 1; i < arr.length - 1; i++) {
      const d = pointToSegmentDist(arr[i], first, last);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist > epsilon) {
      const left = dp(arr.slice(0, maxIdx + 1));
      const right = dp(arr.slice(maxIdx));
      return [...left.slice(0, -1), ...right];
    }
    return [first, last];
  };

  // Encontrar el índice más distante del punto 0 para partir el anillo
  let splitIdx = 1;
  let bestD = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[0].x, pts[i].y - pts[0].y);
    if (d > bestD) {
      bestD = d;
      splitIdx = i;
    }
  }

  const part1 = dp([...pts.slice(0, splitIdx + 1)]);
  const part2 = dp([...pts.slice(splitIdx), pts[0]]);
  const merged = [...part1.slice(0, -1), ...part2.slice(0, -1)];
  return merged.length >= 3 ? merged : pts;
}

function chaikinSmoothClosed(pts: Point2D[], passes: number): Point2D[] {
  let current = pts;
  for (let pass = 0; pass < passes; pass++) {
    if (current.length < 3) break;
    const next: Point2D[] = [];
    for (let i = 0; i < current.length; i++) {
      const p0 = current[i];
      const p1 = current[(i + 1) % current.length];
      next.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y });
      next.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y });
    }
    current = next;
  }
  return current;
}

function isPointInPolygon(pt: Point2D, poly: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function removeCollinearVertices(pts: Point2D[]): Point2D[] {
  if (pts.length <= 3) return pts;
  const res: Point2D[] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const cross = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
    if (Math.abs(cross) > 1e-6) {
      res.push(curr);
    }
  }
  return res.length >= 3 ? res : pts;
}

/**
 * Traza contornos cerrados (exteriores + huecos) desde una máscara binaria usando
 * extracción de aristas de frontera entre celdas 1 y 0, suavizado Chaikin y simplificación Douglas-Peucker.
 * Nota: en coordenadas de imagen (Y hacia abajo), los contornos exteriores resultan con área positiva
 * al recorrer con la celda sólida a la izquierda, y los huecos con área negativa.
 */
export function traceBinaryMaskToContours(
  mask: Uint8Array,
  width: number,
  height: number,
  options: TraceContoursOptions = {}
): TracedPolygon[] {
  const simplifyEpsilon = options.simplifyEpsilon ?? 0.85;
  const smoothPasses = options.smoothPasses ?? 1;
  const minAreaPx = options.minAreaPx ?? 6;

  // Borde de 1 px con ceros para asegurar que todos los lazos sean cerrados
  const pw = width + 2;
  const ph = height + 2;
  const padded = new Uint8Array(pw * ph);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      padded[(y + 1) * pw + (x + 1)] = mask[y * width + x] ? 1 : 0;
    }
  }

  interface Edge {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    dx: number;
    dy: number;
    used: boolean;
  }

  const edges: Edge[] = [];
  const startMap = new Map<string, number[]>();

  const addEdge = (x0: number, y0: number, x1: number, y1: number) => {
    const idx = edges.length;
    edges.push({ x0, y0, x1, y1, dx: x1 - x0, dy: y1 - y0, used: false });
    const key = `${x0},${y0}`;
    const bucket = startMap.get(key);
    if (bucket) bucket.push(idx);
    else startMap.set(key, [idx]);
  };

  // Extraer todas las aristas dirigidas manteniendo la celda sólida (1) a la izquierda
  // En coordenadas de pantalla (X derecha, Y abajo), izquierda de (+1, 0) es (0, -1), etc.:
  // Arriba de sólido (y-1 vacía): borde de (x+1, y) -> (x, y) [dx=-1, dy=0 -> izquierda es +Y, sólido abajo!]
  // Verifiquemos con un píxel en (1,1):
  //   Top: (2,1)->(1,1), Left: (1,1)->(1,2), Bottom: (1,2)->(2,2), Right: (2,2)->(2,1)
  //   Área con signo de [(2,1),(1,1),(1,2),(2,2)]: > 0 (CCW en Y-down => positivo).
  for (let y = 1; y < ph - 1; y++) {
    for (let x = 1; x < pw - 1; x++) {
      if (padded[y * pw + x] !== 1) continue;
      if (padded[(y - 1) * pw + x] === 0) addEdge(x + 1, y, x, y); // Top
      if (padded[y * pw + (x - 1)] === 0) addEdge(x, y, x, y + 1); // Left
      if (padded[(y + 1) * pw + x] === 0) addEdge(x, y + 1, x + 1, y + 1); // Bottom
      if (padded[y * pw + (x + 1)] === 0) addEdge(x + 1, y + 1, x + 1, y); // Right
    }
  }

  const loops: Point2D[][] = [];
  for (let i = 0; i < edges.length; i++) {
    if (edges[i].used) continue;

    const loop: Point2D[] = [];
    let currIdx = i;
    let safety = 0;
    const maxSteps = edges.length + 5;

    while (currIdx !== -1 && !edges[currIdx].used && safety < maxSteps) {
      safety++;
      const e = edges[currIdx];
      e.used = true;
      // Restar 1 px de padding para volver a coordenadas [0..width, 0..height]
      loop.push({ x: e.x0 - 1, y: e.y0 - 1 });

      const nextCandidates = startMap.get(`${e.x1},${e.y1}`) || [];
      let chosen = -1;
      let bestCross = -Infinity;

      for (let c = 0; c < nextCandidates.length; c++) {
        const candIdx = nextCandidates[c];
        const cand = edges[candIdx];
        if (cand.used) continue;
        // En vértice compartido (esquinas tocándose en diagonal), preferir girar hacia la derecha respecto al sólido (mantener regiones separadas)
        const cross = e.dx * cand.dy - e.dy * cand.dx;
        if (chosen === -1 || cross > bestCross) {
          bestCross = cross;
          chosen = candIdx;
        }
      }

      currIdx = chosen;
    }

    if (loop.length >= 4) {
      loops.push(loop);
    }
  }

  const outers: Array<{ pts: Point2D[]; area: number }> = [];
  const rawHoles: Array<{ pts: Point2D[]; area: number }> = [];

  for (const rawLoop of loops) {
    let pts = removeCollinearVertices(rawLoop);
    if (smoothPasses > 0) {
      pts = chaikinSmoothClosed(pts, smoothPasses);
    }
    if (simplifyEpsilon > 0) {
      pts = simplifyClosedPolygon(pts, simplifyEpsilon);
    }
    if (pts.length < 3) continue;

    const area = signedPolygonArea(pts);
    if (Math.abs(area) < minAreaPx) continue;

    // En coordenadas de imagen (Y hacia abajo) con la celda sólida a la izquierda:
    // los contornos exteriores tienen área negativa (< 0) y los huecos área positiva (> 0).
    if (area < 0) {
      outers.push({ pts, area: Math.abs(area) });
    } else {
      rawHoles.push({ pts, area: Math.abs(area) });
    }
  }

  const result: TracedPolygon[] = outers
    .sort((a, b) => b.area - a.area)
    .map(o => ({ outer: o.pts, holes: [], area: o.area }));

  // Asignar cada hueco al contorno exterior más pequeño que lo contiene
  for (const hole of rawHoles) {
    const probe = hole.pts[0];
    let bestParentIdx = -1;
    let bestParentArea = Infinity;
    for (let i = 0; i < result.length; i++) {
      if (result[i].area < bestParentArea && isPointInPolygon(probe, result[i].outer)) {
        bestParentArea = result[i].area;
        bestParentIdx = i;
      }
    }
    if (bestParentIdx !== -1) {
      result[bestParentIdx].holes.push(hole.pts);
    }
  }

  return result;
}

/**
 * Serializa contornos trazados en un archivo SVG vectorial limpio en milímetros.
 */
export function polygonsToSvgString(
  polygons: TracedPolygon[],
  width: number,
  height: number,
  options: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    viewBoxWidthMm?: number;
    viewBoxHeightMm?: number;
  } = {}
): string {
  const fill = options.fill ?? '#0f172a';
  const stroke = options.stroke ?? 'none';
  const strokeWidth = options.strokeWidth ?? 0;
  const vbW = options.viewBoxWidthMm ?? width;
  const vbH = options.viewBoxHeightMm ?? height;
  const scaleX = width > 0 ? vbW / width : 1;
  const scaleY = height > 0 ? vbH / height : 1;

  const formatPath = (pts: Point2D[]) => {
    if (pts.length === 0) return '';
    return (
      `M ${(pts[0].x * scaleX).toFixed(2)} ${(pts[0].y * scaleY).toFixed(2)} ` +
      pts
        .slice(1)
        .map(p => `L ${(p.x * scaleX).toFixed(2)} ${(p.y * scaleY).toFixed(2)}`)
        .join(' ') +
      ' Z'
    );
  };

  const paths = polygons
    .map(poly => {
      const d = [formatPath(poly.outer), ...poly.holes.map(formatPath)].filter(Boolean).join(' ');
      return `  <path d="${d}" fill="${fill}" fill-rule="evenodd" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    })
    .join('\n');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW.toFixed(1)}mm" height="${vbH.toFixed(1)}mm" viewBox="0 0 ${vbW.toFixed(2)} ${vbH.toFixed(2)}">`,
    paths,
    `</svg>`
  ].join('\n');
}

/**
 * Convierte polígonos trazados en objetos THREE.Shape centrados en (0, 0) en milímetros,
 * listos para ser extruidos con THREE.ExtrudeGeometry.
 */
export function polygonsToThreeShapes(
  polygons: TracedPolygon[],
  widthPx: number,
  heightPx: number,
  targetWidthMm: number,
  targetHeightMm: number
): THREE.Shape[] {
  const safeW = Math.max(1, widthPx);
  const safeH = Math.max(1, heightPx);

  const toMmX = (px: number) => (px / safeW - 0.5) * targetWidthMm;
  const toMmY = (py: number) => (0.5 - py / safeH) * targetHeightMm;

  return polygons.map(poly => {
    const shape = new THREE.Shape();
    poly.outer.forEach((pt, idx) => {
      const x = toMmX(pt.x);
      const y = toMmY(pt.y);
      if (idx === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();

    poly.holes.forEach(holePts => {
      const hole = new THREE.Path();
      holePts.forEach((pt, idx) => {
        const x = toMmX(pt.x);
        const y = toMmY(pt.y);
        if (idx === 0) hole.moveTo(x, y);
        else hole.lineTo(x, y);
      });
      hole.closePath();
      shape.holes.push(hole);
    });

    return shape;
  });
}
