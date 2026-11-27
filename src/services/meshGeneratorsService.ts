import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import QRCode from 'qrcode';
import { calculateGeometryVolume } from './stlService';
import {
  dilateBinaryMask,
  polygonsToSvgString,
  polygonsToThreeShapes,
  traceBinaryMaskToContours
} from './imageToSvgService';

export type BaseShapeType =
  | 'rect_redondeado'
  | 'circulo'
  | 'corazon'
  | 'estrella'
  | 'escudo'
  | 'nube'
  | 'hueso'
  | 'hexagono'
  | 'arco'
  | 'flor';

export type IconPresetId =
  | 'ninguno'
  | 'corazon'
  | 'estrella'
  | 'huella'
  | 'corona'
  | 'pies_bebe'
  | 'mariposa'
  | 'trofeo'
  | 'rayo'
  | 'flor'
  | 'globos'
  | 'diamante';

export type FontPresetId = 'sans' | 'rounded' | 'serif' | 'script';

export interface GeneratedMeshResult {
  geometry: THREE.BufferGeometry;
  dimensionsMm: { x: number; y: number; z: number };
  volumeCm3: number;
  trianglesCount: number;
  svgContent?: string;
}

export interface MaskData {
  mask: Uint8Array;
  width: number;
  height: number;
}

export interface LithophaneParams {
  shape: 'plana' | 'curva' | 'llavero';
  widthMm: number;
  heightMm: number;
  minThicknessMm: number;
  maxThicknessMm: number;
  frameMm: number;
  invert?: boolean;
  curveAngleDeg?: number;
  holeDiameterMm?: number;
}

export interface KeychainParams {
  shape: BaseShapeType;
  widthMm: number;
  heightMm: number;
  baseThicknessMm: number;
  reliefHeightMm: number;
  reliefMode: 'positivo' | 'negativo';
  holePosition: 'izquierda' | 'arriba' | 'ninguno';
  holeDiameterMm: number;
  hasBorder: boolean;
  borderWidthMm?: number;
  reliefMask?: MaskData;
}

export interface MedalParams {
  shape: 'circulo' | 'escudo';
  diameterMm: number;
  baseThicknessMm: number;
  reliefHeightMm: number;
  loopType: 'ranura_cinta' | 'argolla' | 'ninguno';
  doubleRim: boolean;
  reliefMask?: MaskData;
}

export interface PlaqueParams {
  shape: 'nube' | 'arco' | 'corazon' | 'estrella' | 'circulo' | 'rect_redondeado' | 'hexagono' | 'escudo';
  widthMm: number;
  heightMm: number;
  baseThicknessMm: number;
  reliefHeightMm: number;
  mounting: 'plana' | 'colgante' | 'topper' | 'base_mesa';
  topperStakeMm?: number;
  hasBorder: boolean;
  reliefMask?: MaskData;
}

export interface SvgToolParams {
  targetWidthMm: number;
  targetHeightMm: number;
  extrudeHeightMm: number;
  includeBase: boolean;
  baseThicknessMm: number;
  includeKeyringHole: boolean;
  simplifyEpsilon?: number;
  smoothPasses?: number;
}

export interface Qr3DParams {
  text: string;
  sizeMm: number;
  baseThicknessMm: number;
  reliefHeightMm: number;
  hasBorder: boolean;
  mounting: 'plano' | 'llavero' | 'base_mesa';
  captionMask?: MaskData;
}

export interface CutterStampParams {
  mode: 'cortador' | 'sello';
  sizeMm: number;
  cutterHeightMm: number;
  bladeThicknessMm: number;
  flangeWidthMm: number;
  flangeThicknessMm: number;
  baseThicknessMm: number;
  reliefHeightMm: number;
  includeHandle: boolean;
}

const clampNum = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

/**
 * Normaliza atributos (solo `position` no-indexado), fusiona geometrías,
 * centra en X/Y y apoya exactamente `minZ = 0` para impresión plana Z-up.
 */
export function normalizeAndMergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const prepared: THREE.BufferGeometry[] = [];

  for (const g of geometries) {
    if (!g) continue;
    const nonIdx = g.index ? g.toNonIndexed() : g.clone();
    const pos = nonIdx.getAttribute('position');
    if (!pos || pos.count === 0) {
      nonIdx.dispose();
      continue;
    }
    for (const key of Object.keys(nonIdx.attributes)) {
      if (key !== 'position') {
        nonIdx.deleteAttribute(key);
      }
    }
    prepared.push(nonIdx);
  }

  if (prepared.length === 0) {
    const fallback = new THREE.BoxGeometry(10, 10, 2);
    fallback.translate(0, 0, 1);
    return fallback;
  }

  const merged =
    prepared.length === 1
      ? prepared[0]
      : BufferGeometryUtils.mergeGeometries(prepared, false) || prepared[0];

  if (prepared.length > 1) {
    prepared.forEach(p => {
      if (p !== merged) p.dispose();
    });
  }

  merged.computeBoundingBox();
  if (merged.boundingBox) {
    const cx = (merged.boundingBox.min.x + merged.boundingBox.max.x) * 0.5;
    const cy = (merged.boundingBox.min.y + merged.boundingBox.max.y) * 0.5;
    const minZ = merged.boundingBox.min.z;
    merged.translate(-cx, -cy, -minZ);
  }

  merged.computeVertexNormals();
  merged.computeBoundingBox();
  return merged;
}

export function computeMeshMetrics(geometry: THREE.BufferGeometry): {
  dimensionsMm: { x: number; y: number; z: number };
  volumeCm3: number;
  trianglesCount: number;
} {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox || new THREE.Box3();
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const bboxVolMm3 = Math.max(0.01, size.x * size.y * size.z);
  let volMm3 = calculateGeometryVolume(geometry);
  if (!volMm3 || !Number.isFinite(volMm3) || volMm3 <= 0 || volMm3 > bboxVolMm3 * 1.15) {
    volMm3 = bboxVolMm3 * 0.55;
  }

  const posCount = geometry.index ? geometry.index.count : geometry.attributes.position?.count || 0;
  return {
    dimensionsMm: {
      x: Number(size.x.toFixed(1)),
      y: Number(size.y.toFixed(1)),
      z: Number(size.z.toFixed(1))
    },
    volumeCm3: Number((volMm3 / 1000).toFixed(2)),
    trianglesCount: Math.round(posCount / 3)
  };
}

export function exportGeneratedGeometryToSTL(geometry: THREE.BufferGeometry, baseFileName: string): void {
  const exporter = new STLExporter();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  const stlData = exporter.parse(mesh, { binary: true });

  const bytes =
    stlData instanceof DataView
      ? new Uint8Array(stlData.buffer, stlData.byteOffset, stlData.byteLength)
      : new TextEncoder().encode(String(stlData));

  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const cleanName = (baseFileName || 'modelo_3d')
    .replace(/\.stl$/i, '')
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'modelo_3d';
  a.href = url;
  a.download = `${cleanName}_WJG.stl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function makeRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = w * 0.5;
  const hh = h * 0.5;
  const rad = Math.min(r, hw * 0.95, hh * 0.95);
  shape.moveTo(-hw + rad, -hh);
  shape.lineTo(hw - rad, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + rad);
  shape.lineTo(hw, hh - rad);
  shape.quadraticCurveTo(hw, hh, hw - rad, hh);
  shape.lineTo(-hw + rad, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - rad);
  shape.lineTo(-hw, -hh + rad);
  shape.quadraticCurveTo(-hw, -hh, -hw + rad, -hh);
  return shape;
}

/**
 * Crea cualquiera de las 10 formas base paramétricas en milímetros centradas en (0, 0).
 */
export function createBaseShape2D(
  shapeType: BaseShapeType,
  widthMm: number,
  heightMm: number,
  cornerRadiusMm?: number
): THREE.Shape {
  const w = Math.max(8, widthMm);
  const h = Math.max(8, heightMm);
  const hw = w * 0.5;
  const hh = h * 0.5;
  const shape = new THREE.Shape();

  switch (shapeType) {
    case 'circulo': {
      const segs = 48;
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const x = Math.cos(a) * hw;
        const y = Math.sin(a) * hh;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      return shape;
    }

    case 'hexagono': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = Math.cos(a) * hw;
        const y = Math.sin(a) * hh;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      return shape;
    }

    case 'estrella': {
      const pts = 10;
      for (let i = 0; i < pts; i++) {
        const a = (i / pts) * Math.PI * 2 + Math.PI / 2;
        const rFactor = i % 2 === 0 ? 1.0 : 0.48;
        const x = Math.cos(a) * hw * rFactor;
        const y = Math.sin(a) * hh * rFactor;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      return shape;
    }

    case 'corazon': {
      const segs = 64;
      for (let i = 0; i < segs; i++) {
        const t = (i / segs) * Math.PI * 2;
        const rawX = 16 * Math.pow(Math.sin(t), 3);
        const rawY =
          13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const x = (rawX / 16) * hw;
        const y = ((rawY + 2) / 16) * hh;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      return shape;
    }

    case 'escudo': {
      shape.moveTo(-hw * 0.9, hh * 0.95);
      shape.lineTo(hw * 0.9, hh * 0.95);
      shape.quadraticCurveTo(hw, hh * 0.95, hw, hh * 0.72);
      shape.lineTo(hw * 0.92, -hh * 0.05);
      shape.quadraticCurveTo(hw * 0.78, -hh * 0.65, 0, -hh);
      shape.quadraticCurveTo(-hw * 0.78, -hh * 0.65, -hw * 0.92, -hh * 0.05);
      shape.lineTo(-hw, hh * 0.72);
      shape.quadraticCurveTo(-hw, hh * 0.95, -hw * 0.9, hh * 0.95);
      shape.closePath();
      return shape;
    }

    case 'nube': {
      const lobes = [
        { cx: -0.48, cy: -0.18, rx: 0.44, ry: 0.46 },
        { cx: -0.25, cy: 0.25, rx: 0.42, ry: 0.48 },
        { cx: 0.2, cy: 0.28, rx: 0.46, ry: 0.5 },
        { cx: 0.5, cy: -0.12, rx: 0.42, ry: 0.44 },
        { cx: 0.02, cy: -0.35, rx: 0.62, ry: 0.36 }
      ];
      const segs = 72;
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        // Rayo radial aproximado al envolvente de lóbulos
        let maxT = 0.3;
        for (const l of lobes) {
          // Intersección aproximada con elipse desplazada
          const dx = ux;
          const dy = uy;
          const A = (dx * dx) / (l.rx * l.rx) + (dy * dy) / (l.ry * l.ry);
          const B = -2 * ((l.cx * dx) / (l.rx * l.rx) + (l.cy * dy) / (l.ry * l.ry));
          const C = (l.cx * l.cx) / (l.rx * l.rx) + (l.cy * l.cy) / (l.ry * l.ry) - 1;
          const disc = B * B - 4 * A * C;
          if (disc >= 0) {
            const t = (-B + Math.sqrt(disc)) / (2 * A);
            if (t > maxT) maxT = t;
          }
        }
        const x = ux * maxT * hw;
        const y = uy * maxT * hh;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      return shape;
    }

    case 'hueso': {
      const rEnd = Math.min(hh * 0.48, w * 0.19);
      const shaftHalfH = rEnd * 0.55;
      const endX = hw - rEnd;
      shape.moveTo(-endX, -shaftHalfH);
      shape.lineTo(endX, -shaftHalfH);
      // Cabeza derecha inferior -> superior
      shape.absarc(endX, -rEnd * 0.72, rEnd, -Math.PI * 0.7, Math.PI * 0.35, false);
      shape.absarc(endX, rEnd * 0.72, rEnd, -Math.PI * 0.35, Math.PI * 0.75, false);
      shape.lineTo(-endX, shaftHalfH);
      // Cabeza izquierda superior -> inferior
      shape.absarc(-endX, rEnd * 0.72, rEnd, Math.PI * 0.25, Math.PI * 1.35, false);
      shape.absarc(-endX, -rEnd * 0.72, rEnd, Math.PI * 0.65, Math.PI * 1.75, false);
      shape.closePath();
      return shape;
    }

    case 'arco': {
      const archStartY = hh - hw;
      if (archStartY > -hh + 4) {
        shape.moveTo(-hw, -hh);
        shape.lineTo(hw, -hh);
        shape.lineTo(hw, archStartY);
        shape.absarc(0, archStartY, hw, 0, Math.PI, false);
        shape.closePath();
        return shape;
      }
      return makeRoundedRectShape(w, h, Math.min(hw, hh) * 0.45);
    }

    case 'flor': {
      const petals = 8;
      const segs = 96;
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const r = 0.76 + 0.24 * Math.cos(petals * a);
        const x = Math.cos(a) * hw * r;
        const y = Math.sin(a) * hh * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      return shape;
    }

    case 'rect_redondeado':
    default:
      return makeRoundedRectShape(w, h, cornerRadiusMm ?? Math.min(w, h) * 0.16);
  }
}

function createPerforatedTabGeometry(
  cx: number,
  cy: number,
  outerRadiusMm: number,
  holeDiameterMm: number,
  thicknessMm: number
): THREE.BufferGeometry {
  const outerR = Math.max(3, outerRadiusMm);
  const innerR = Math.max(1, Math.min(outerR - 1.2, holeDiameterMm * 0.5));
  const tabShape = new THREE.Shape();
  tabShape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const holePath = new THREE.Path();
  holePath.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  tabShape.holes.push(holePath);

  const geo = new THREE.ExtrudeGeometry(tabShape, {
    depth: Math.max(1, thicknessMm),
    bevelEnabled: false,
    curveSegments: 24
  });
  geo.translate(cx, cy, 0);
  return geo;
}

function createSlotTabGeometry(
  cx: number,
  cy: number,
  slotWidthMm: number,
  slotHeightMm: number,
  thicknessMm: number
): THREE.BufferGeometry {
  const wall = 2.6;
  const outerW = slotWidthMm + wall * 2;
  const outerH = slotHeightMm + wall * 2;
  const outerShape = makeRoundedRectShape(outerW, outerH, wall);
  const innerHole = makeRoundedRectShape(slotWidthMm, slotHeightMm, Math.min(slotWidthMm, slotHeightMm) * 0.3);
  outerShape.holes.push(innerHole);

  const geo = new THREE.ExtrudeGeometry(outerShape, {
    depth: Math.max(1, thicknessMm),
    bevelEnabled: false,
    curveSegments: 16
  });
  geo.translate(cx, cy, 0);
  return geo;
}

function createBorderRingGeometry(
  shapeType: BaseShapeType,
  widthMm: number,
  heightMm: number,
  borderWidthMm: number,
  zStart: number,
  heightZ: number
): THREE.BufferGeometry {
  const bw = Math.max(1.2, Math.min(borderWidthMm, Math.min(widthMm, heightMm) * 0.25));
  const outer = createBaseShape2D(shapeType, widthMm, heightMm);
  const inner = createBaseShape2D(shapeType, widthMm - bw * 2, heightMm - bw * 2);
  const innerPts = inner.getPoints(48);
  const holePath = new THREE.Path();
  innerPts.forEach((p, i) => {
    if (i === 0) holePath.moveTo(p.x, p.y);
    else holePath.lineTo(p.x, p.y);
  });
  holePath.closePath();
  outer.holes.push(holePath);

  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: heightZ,
    bevelEnabled: false,
    curveSegments: 24
  });
  geo.translate(0, 0, zStart);
  return geo;
}

function extrudeMaskIntoArea(
  maskData: MaskData,
  targetWidthMm: number,
  targetHeightMm: number,
  zStart: number,
  extrudeDepthMm: number,
  invertMask: boolean = false,
  simplifyEpsilon: number = 0.75
): THREE.BufferGeometry[] {
  const { mask, width, height } = maskData;
  let effectiveMask = mask;
  if (invertMask) {
    effectiveMask = new Uint8Array(mask.length);
    for (let i = 0; i < mask.length; i++) {
      effectiveMask[i] = mask[i] ? 0 : 1;
    }
  }

  const polys = traceBinaryMaskToContours(effectiveMask, width, height, {
    simplifyEpsilon,
    smoothPasses: 1,
    minAreaPx: 4
  });
  if (polys.length === 0) return [];

  const shapes = polygonsToThreeShapes(polys, width, height, targetWidthMm, targetHeightMm);
  return shapes.map(shape => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.3, extrudeDepthMm),
      bevelEnabled: false,
      curveSegments: 8
    });
    g.translate(0, 0, zStart);
    return g;
  });
}

/**
 * 1. GENERADOR DE LITOFANÍAS 3D (Plana, Curva 120° y Llavero) — Malla 100% hermética Z-up.
 */
export function buildLithophaneGeometry(
  grayscale: Float32Array,
  gridW: number,
  gridH: number,
  params: LithophaneParams
): GeneratedMeshResult {
  const cols = Math.max(12, Math.floor(gridW));
  const rows = Math.max(12, Math.floor(gridH));
  const widthMm = clampNum(params.widthMm, 25, 220);
  const heightMm = clampNum(params.heightMm, 25, 220);
  const minT = clampNum(params.minThicknessMm, 0.6, 3.0);
  const maxT = clampNum(params.maxThicknessMm, minT + 0.8, 7.0);
  const frameMm = clampNum(params.frameMm, 0, 10);
  const invert = Boolean(params.invert);

  const thicknessAt = (ix: number, iy: number): number => {
    const xMm = (ix / (cols - 1)) * widthMm;
    const yMm = (iy / (rows - 1)) * heightMm;
    if (
      frameMm > 0 &&
      (xMm <= frameMm || xMm >= widthMm - frameMm || yMm <= frameMm || yMm >= heightMm - frameMm)
    ) {
      return maxT;
    }
    const rawLum = grayscale[iy * cols + ix] ?? 0.5;
    const lum = invert ? 1 - rawLum : rawLum;
    return maxT - clampNum(lum, 0, 1) * (maxT - minT);
  };

  const parts: THREE.BufferGeometry[] = [];
  const positions: number[] = [];

  const pushTri = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  };

  const pushQuad = (
    p00: [number, number, number],
    p10: [number, number, number],
    p11: [number, number, number],
    p01: [number, number, number]
  ) => {
    pushTri(p00[0], p00[1], p00[2], p10[0], p10[1], p10[2], p11[0], p11[1], p11[2]);
    pushTri(p00[0], p00[1], p00[2], p11[0], p11[1], p11[2], p01[0], p01[1], p01[2]);
  };

  if (params.shape === 'curva') {
    const angleRad = (clampNum(params.curveAngleDeg ?? 120, 45, 220) * Math.PI) / 180;
    const innerRadius = Math.max(18, widthMm / angleRad);

    const frontPt = (ix: number, iy: number): [number, number, number] => {
      const u = ix / (cols - 1);
      const v = 1 - iy / (rows - 1); // iy=0 arriba -> z=heightMm
      const theta = (u - 0.5) * angleRad;
      const r = innerRadius + thicknessAt(ix, iy);
      return [r * Math.sin(theta), -r * Math.cos(theta) + innerRadius, v * heightMm];
    };

    const backPt = (ix: number, iy: number): [number, number, number] => {
      const u = ix / (cols - 1);
      const v = 1 - iy / (rows - 1);
      const theta = (u - 0.5) * angleRad;
      const r = innerRadius;
      return [r * Math.sin(theta), -r * Math.cos(theta) + innerRadius, v * heightMm];
    };

    for (let iy = 0; iy < rows - 1; iy++) {
      for (let ix = 0; ix < cols - 1; ix++) {
        // Cara frontal
        pushQuad(frontPt(ix, iy + 1), frontPt(ix + 1, iy + 1), frontPt(ix + 1, iy), frontPt(ix, iy));
        // Cara trasera
        pushQuad(backPt(ix, iy), backPt(ix + 1, iy), backPt(ix + 1, iy + 1), backPt(ix, iy + 1));
      }
    }
    // Paredes superior e inferior
    for (let ix = 0; ix < cols - 1; ix++) {
      pushQuad(backPt(ix, 0), frontPt(ix, 0), frontPt(ix + 1, 0), backPt(ix + 1, 0));
      pushQuad(frontPt(ix, rows - 1), backPt(ix, rows - 1), backPt(ix + 1, rows - 1), frontPt(ix + 1, rows - 1));
    }
    // Paredes izquierda y derecha
    for (let iy = 0; iy < rows - 1; iy++) {
      pushQuad(backPt(0, iy + 1), frontPt(0, iy + 1), frontPt(0, iy), backPt(0, iy));
      pushQuad(frontPt(cols - 1, iy + 1), backPt(cols - 1, iy + 1), backPt(cols - 1, iy), frontPt(cols - 1, iy));
    }
  } else {
    const frontPt = (ix: number, iy: number): [number, number, number] => {
      const x = (ix / (cols - 1) - 0.5) * widthMm;
      const y = (0.5 - iy / (rows - 1)) * heightMm;
      return [x, y, thicknessAt(ix, iy)];
    };
    const backPt = (ix: number, iy: number): [number, number, number] => {
      const x = (ix / (cols - 1) - 0.5) * widthMm;
      const y = (0.5 - iy / (rows - 1)) * heightMm;
      return [x, y, 0];
    };

    for (let iy = 0; iy < rows - 1; iy++) {
      for (let ix = 0; ix < cols - 1; ix++) {
        pushQuad(frontPt(ix, iy + 1), frontPt(ix + 1, iy + 1), frontPt(ix + 1, iy), frontPt(ix, iy));
        pushQuad(backPt(ix, iy), backPt(ix + 1, iy), backPt(ix + 1, iy + 1), backPt(ix, iy + 1));
      }
    }
    for (let ix = 0; ix < cols - 1; ix++) {
      pushQuad(backPt(ix, 0), frontPt(ix, 0), frontPt(ix + 1, 0), backPt(ix + 1, 0));
      pushQuad(frontPt(ix, rows - 1), backPt(ix, rows - 1), backPt(ix + 1, rows - 1), frontPt(ix + 1, rows - 1));
    }
    for (let iy = 0; iy < rows - 1; iy++) {
      pushQuad(backPt(0, iy + 1), frontPt(0, iy + 1), frontPt(0, iy), backPt(0, iy));
      pushQuad(frontPt(cols - 1, iy + 1), backPt(cols - 1, iy + 1), backPt(cols - 1, iy), frontPt(cols - 1, iy));
    }
  }

  const lithoBody = new THREE.BufferGeometry();
  lithoBody.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  parts.push(lithoBody);

  if (params.shape === 'llavero') {
    const holeD = clampNum(params.holeDiameterMm ?? 4, 2.5, 8);
    parts.push(createPerforatedTabGeometry(0, heightMm * 0.5 + holeD * 0.55, holeD + 2.2, holeD, maxT));
  }

  const geometry = normalizeAndMergeGeometries(parts);
  const metrics = computeMeshMetrics(geometry);
  return { geometry, ...metrics };
}

/**
 * 2. GENERADOR DE LLAVEROS 3D CON RELIEVES DE LETRAS Y FIGURAS BÁSICAS
 */
export function buildKeychainGeometry(params: KeychainParams): GeneratedMeshResult {
  const w = clampNum(params.widthMm, 24, 140);
  const h = clampNum(params.heightMm, 20, 140);
  const baseT = clampNum(params.baseThicknessMm, 1.8, 10);
  const relH = clampNum(params.reliefHeightMm, 0.5, 6);
  const holeD = clampNum(params.holeDiameterMm, 2.5, 8);
  const parts: THREE.BufferGeometry[] = [];

  const baseShape = createBaseShape2D(params.shape, w, h);
  parts.push(
    new THREE.ExtrudeGeometry(baseShape, {
      depth: baseT,
      bevelEnabled: false,
      curveSegments: 32
    })
  );

  if (params.holePosition === 'izquierda') {
    const tabR = holeD * 0.5 + 2.6;
    parts.push(createPerforatedTabGeometry(-w * 0.5 - tabR * 0.45, 0, tabR, holeD, baseT));
  } else if (params.holePosition === 'arriba') {
    const tabR = holeD * 0.5 + 2.6;
    parts.push(createPerforatedTabGeometry(0, h * 0.5 + tabR * 0.45, tabR, holeD, baseT));
  }

  if (params.hasBorder) {
    parts.push(
      createBorderRingGeometry(params.shape, w, h, params.borderWidthMm ?? 2.2, baseT - 0.15, relH + 0.15)
    );
  }

  if (params.reliefMask) {
    const usableW = w * (params.hasBorder ? 0.78 : 0.86);
    const usableH = h * (params.hasBorder ? 0.72 : 0.82);
    parts.push(
      ...extrudeMaskIntoArea(
        params.reliefMask,
        usableW,
        usableH,
        baseT - 0.15,
        relH + 0.15,
        params.reliefMode === 'negativo'
      )
    );
  }

  const geometry = normalizeAndMergeGeometries(parts);
  const metrics = computeMeshMetrics(geometry);
  return { geometry, ...metrics };
}

/**
 * 3. GENERADOR DE MEDALLAS 3D PERSONALIZADAS
 */
export function buildMedalGeometry(params: MedalParams): GeneratedMeshResult {
  const d = clampNum(params.diameterMm, 30, 150);
  const baseT = clampNum(params.baseThicknessMm, 2.0, 10);
  const relH = clampNum(params.reliefHeightMm, 0.6, 5);
  const parts: THREE.BufferGeometry[] = [];

  const baseShape = createBaseShape2D(params.shape, d, d);
  parts.push(
    new THREE.ExtrudeGeometry(baseShape, {
      depth: baseT,
      bevelEnabled: false,
      curveSegments: 48
    })
  );

  // Borde exterior en relieve
  parts.push(createBorderRingGeometry(params.shape, d, d, 2.8, baseT - 0.15, relH + 0.15));

  if (params.doubleRim && d >= 40) {
    parts.push(createBorderRingGeometry(params.shape, d - 9, d - 9, 1.4, baseT - 0.15, relH * 0.85 + 0.15));
  }

  if (params.loopType === 'ranura_cinta') {
    parts.push(createSlotTabGeometry(0, d * 0.5 + 3.2, Math.min(26, d * 0.38), 4.2, baseT));
  } else if (params.loopType === 'argolla') {
    parts.push(createPerforatedTabGeometry(0, d * 0.5 + 3.5, 6.2, 5.2, baseT));
  }

  if (params.reliefMask) {
    const innerScale = params.doubleRim ? 0.62 : 0.72;
    parts.push(
      ...extrudeMaskIntoArea(
        params.reliefMask,
        d * innerScale,
        d * innerScale,
        baseT - 0.15,
        relH + 0.15,
        false
      )
    );
  }

  const geometry = normalizeAndMergeGeometries(parts);
  const metrics = computeMeshMetrics(geometry);
  return { geometry, ...metrics };
}

/**
 * 4. GENERADOR DE PLACAS & EVENTOS (Baby Shower, Cumpleaños, Nombres, Cake Toppers)
 */
export function buildEventPlaqueGeometry(params: PlaqueParams): GeneratedMeshResult {
  const w = clampNum(params.widthMm, 40, 220);
  const h = clampNum(params.heightMm, 30, 220);
  const baseT = clampNum(params.baseThicknessMm, 2.0, 10);
  const relH = clampNum(params.reliefHeightMm, 0.6, 6);
  const parts: THREE.BufferGeometry[] = [];

  const baseShape = createBaseShape2D(params.shape, w, h);
  parts.push(
    new THREE.ExtrudeGeometry(baseShape, {
      depth: baseT,
      bevelEnabled: false,
      curveSegments: 36
    })
  );

  if (params.hasBorder) {
    parts.push(createBorderRingGeometry(params.shape, w, h, 2.6, baseT - 0.15, relH + 0.15));
  }

  if (params.mounting === 'colgante') {
    const offsetX = w * 0.26;
    const offsetY = h * 0.44;
    parts.push(createPerforatedTabGeometry(-offsetX, offsetY, 4.4, 3.6, baseT));
    parts.push(createPerforatedTabGeometry(offsetX, offsetY, 4.4, 3.6, baseT));
  } else if (params.mounting === 'topper') {
    const stakeLen = clampNum(params.topperStakeMm ?? 45, 20, 110);
    const stakeW = 6.5;
    const stakeShape = new THREE.Shape();
    stakeShape.moveTo(-stakeW * 0.5, 0);
    stakeShape.lineTo(stakeW * 0.5, 0);
    stakeShape.lineTo(stakeW * 0.35, -stakeLen + 6);
    stakeShape.lineTo(0, -stakeLen);
    stakeShape.lineTo(-stakeW * 0.35, -stakeLen + 6);
    stakeShape.closePath();

    const stakeGeo = new THREE.ExtrudeGeometry(stakeShape, {
      depth: baseT,
      bevelEnabled: false
    });
    stakeGeo.translate(0, -h * 0.42, 0);
    parts.push(stakeGeo);
  } else if (params.mounting === 'base_mesa') {
    // Peana sólida integrada en la base inferior para mantener la placa estable
    const standW = Math.min(w * 0.85, Math.max(40, w * 0.68));
    const standDepth = 18;
    const standH = baseT + 1.5;
    const footGeo = new THREE.BoxGeometry(standW, standDepth, standH);
    footGeo.translate(0, -h * 0.46, standH * 0.5);
    parts.push(footGeo);
  }

  if (params.reliefMask) {
    const usableW = w * (params.hasBorder ? 0.74 : 0.82);
    const usableH = h * (params.hasBorder ? 0.68 : 0.76);
    parts.push(
      ...extrudeMaskIntoArea(
        params.reliefMask,
        usableW,
        usableH,
        baseT - 0.15,
        relH + 0.15,
        false
      )
    );
  }

  const geometry = normalizeAndMergeGeometries(parts);
  const metrics = computeMeshMetrics(geometry);
  return { geometry, ...metrics };
}

/**
 * 5. CONVERSOR IMAGEN → SVG VECTORIAL + EXTRUSIÓN STL 3D
 */
export function buildSvgExtrusionGeometry(
  mask: Uint8Array,
  maskW: number,
  maskH: number,
  params: SvgToolParams
): GeneratedMeshResult {
  const targetW = clampNum(params.targetWidthMm, 15, 220);
  const targetH = clampNum(params.targetHeightMm, 15, 220);
  const extrudeH = clampNum(params.extrudeHeightMm, 0.8, 25);
  const baseT = clampNum(params.baseThicknessMm, 1.5, 8);

  const polys = traceBinaryMaskToContours(mask, maskW, maskH, {
    simplifyEpsilon: params.simplifyEpsilon ?? 0.85,
    smoothPasses: params.smoothPasses ?? 1,
    minAreaPx: 4
  });

  const svgContent = polygonsToSvgString(polys, maskW, maskH, {
    fill: '#0f172a',
    viewBoxWidthMm: targetW,
    viewBoxHeightMm: targetH
  });

  const parts: THREE.BufferGeometry[] = [];
  const zOffset = params.includeBase ? baseT - 0.15 : 0;

  if (params.includeBase) {
    const baseShape = makeRoundedRectShape(targetW + 8, targetH + 8, 5);
    parts.push(
      new THREE.ExtrudeGeometry(baseShape, {
        depth: baseT,
        bevelEnabled: false,
        curveSegments: 24
      })
    );
  }

  const shapes = polygonsToThreeShapes(polys, maskW, maskH, targetW, targetH);
  shapes.forEach(shape => {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: extrudeH + (params.includeBase ? 0.15 : 0),
      bevelEnabled: false,
      curveSegments: 10
    });
    geo.translate(0, 0, zOffset);
    parts.push(geo);
  });

  if (params.includeKeyringHole) {
    const hBase = params.includeBase ? baseT : Math.min(extrudeH, 3.2);
    parts.push(createPerforatedTabGeometry(0, (targetH + (params.includeBase ? 8 : 0)) * 0.5 + 3.2, 5.2, 4.0, hBase));
  }

  const geometry = normalizeAndMergeGeometries(parts);
  const metrics = computeMeshMetrics(geometry);
  return { geometry, ...metrics, svgContent };
}

/**
 * 6. GENERADOR DE CÓDIGO QR 3D IMPRIMIBLE (Para WhatsApp, Instagram, WiFi, Web)
 */
export function buildQr3DGeometry(params: Qr3DParams): GeneratedMeshResult {
  const safeText = (params.text || 'https://wjgeeks3d.com').trim() || 'https://wjgeeks3d.com';
  const sizeMm = clampNum(params.sizeMm, 35, 180);
  const baseT = clampNum(params.baseThicknessMm, 1.6, 8);
  const relH = clampNum(params.reliefHeightMm, 0.6, 4);

  const qr = QRCode.create(safeText, { errorCorrectionLevel: 'M' });
  const modCount = qr.modules.size;
  const quietZoneMm = 4;
  const hasCaption = Boolean(params.captionMask);
  const captionAreaH = hasCaption ? Math.max(10, sizeMm * 0.22) : 0;
  const plateW = sizeMm;
  const plateH = sizeMm + captionAreaH;

  const parts: THREE.BufferGeometry[] = [];
  const plateShape = makeRoundedRectShape(plateW, plateH, 4.5);
  parts.push(
    new THREE.ExtrudeGeometry(plateShape, {
      depth: baseT,
      bevelEnabled: false,
      curveSegments: 20
    })
  );

  if (params.hasBorder) {
    parts.push(createBorderRingGeometry('rect_redondeado', plateW, plateH, 2.0, baseT - 0.15, relH + 0.15));
  }

  // Módulos del QR centrados en la mitad superior
  const qrArea = sizeMm - quietZoneMm * 2;
  const cellMm = qrArea / modCount;
  const overlap = 0.04; // leve solapamiento entre módulos adyacentes para malla sólida sin rendijas
  const qrCenterY = captionAreaH * 0.5;
  const moduleH = relH + 0.15;
  const moduleZCenter = baseT - 0.15 + moduleH * 0.5;

  for (let r = 0; r < modCount; r++) {
    for (let c = 0; c < modCount; c++) {
      if (qr.modules.get(r, c)) {
        const x = -qrArea * 0.5 + (c + 0.5) * cellMm;
        const y = qrCenterY + qrArea * 0.5 - (r + 0.5) * cellMm;
        const box = new THREE.BoxGeometry(cellMm + overlap, cellMm + overlap, moduleH);
        box.translate(x, y, moduleZCenter);
        parts.push(box);
      }
    }
  }

  if (params.captionMask) {
    parts.push(
      ...extrudeMaskIntoArea(
        params.captionMask,
        plateW * 0.82,
        captionAreaH * 0.72,
        baseT - 0.15,
        relH + 0.15,
        false
      ).map(g => {
        g.translate(0, -plateH * 0.5 + captionAreaH * 0.52, 0);
        return g;
      })
    );
  }

  if (params.mounting === 'llavero') {
    parts.push(createPerforatedTabGeometry(0, plateH * 0.5 + 3.0, 5.0, 3.8, baseT));
  } else if (params.mounting === 'base_mesa') {
    const stand = new THREE.BoxGeometry(plateW * 0.75, 16, baseT + 1.5);
    stand.translate(0, -plateH * 0.45, (baseT + 1.5) * 0.5);
    parts.push(stand);
  }

  const geometry = normalizeAndMergeGeometries(parts);
  const metrics = computeMeshMetrics(geometry);
  return { geometry, ...metrics };
}

/**
 * 7. GENERADOR DE CORTADORES DE GALLETAS Y SELLOS 3D (Con espejo automático en sellos)
 */
export function buildCutterStampGeometry(
  mask: Uint8Array,
  maskW: number,
  maskH: number,
  params: CutterStampParams
): GeneratedMeshResult {
  const sizeMm = clampNum(params.sizeMm, 30, 160);
  const aspect = maskH > 0 ? maskW / maskH : 1;
  const targetW = aspect >= 1 ? sizeMm : sizeMm * aspect;
  const targetH = aspect >= 1 ? sizeMm / aspect : sizeMm;
  const pxPerMm = maskW / Math.max(1, targetW);
  const parts: THREE.BufferGeometry[] = [];

  if (params.mode === 'sello') {
    // Espejo horizontal automático para que al presionar sobre masa/tinta salga al derecho
    const mirrored = new Uint8Array(mask.length);
    for (let y = 0; y < maskH; y++) {
      for (let x = 0; x < maskW; x++) {
        mirrored[y * maskW + (maskW - 1 - x)] = mask[y * maskW + x];
      }
    }

    const baseT = clampNum(params.baseThicknessMm, 2.0, 8);
    const relH = clampNum(params.reliefHeightMm, 1.5, 6);

    const dilatedBase = dilateBinaryMask(mirrored, maskW, maskH, Math.max(2, Math.round(3.5 * pxPerMm)));
    const basePolys = traceBinaryMaskToContours(dilatedBase, maskW, maskH, {
      simplifyEpsilon: 1.0,
      smoothPasses: 1,
      minAreaPx: 8
    });
    const baseShapes = polygonsToThreeShapes(basePolys, maskW, maskH, targetW, targetH);

    if (baseShapes.length > 0) {
      baseShapes.forEach(s => {
        parts.push(new THREE.ExtrudeGeometry(s, { depth: baseT, bevelEnabled: false, curveSegments: 10 }));
      });
    } else {
      const rect = makeRoundedRectShape(targetW, targetH, 4);
      parts.push(new THREE.ExtrudeGeometry(rect, { depth: baseT, bevelEnabled: false }));
    }

    const reliefPolys = traceBinaryMaskToContours(mirrored, maskW, maskH, {
      simplifyEpsilon: 0.75,
      smoothPasses: 1,
      minAreaPx: 4
    });
    const reliefShapes = polygonsToThreeShapes(reliefPolys, maskW, maskH, targetW, targetH);
    reliefShapes.forEach(s => {
      const g = new THREE.ExtrudeGeometry(s, { depth: relH + 0.15, bevelEnabled: false, curveSegments: 8 });
      g.translate(0, 0, baseT - 0.15);
      parts.push(g);
    });

    if (params.includeHandle) {
      const handleH = 12;
      const cyl = new THREE.CylinderGeometry(7, 9, handleH, 24);
      cyl.rotateX(Math.PI / 2);
      cyl.translate(0, 0, baseT + relH + handleH * 0.5 - 0.2);
      // Apoyar el mango sobre la base si no estorba o en la espalda: para imprimir sin soportes,
      // dejamos el agarre en el centro superior si el sello se imprime boca arriba, o base plana.
      parts.push(cyl);
    }
  } else {
    // Cortador de galletas / fondant: pared fina de corte + pestaña superior ergonómica
    const bladePx = Math.max(1, Math.round(clampNum(params.bladeThicknessMm, 0.8, 3.0) * pxPerMm));
    const flangePx = Math.max(1, Math.round(clampNum(params.flangeWidthMm, 2.0, 8.0) * pxPerMm));
    const cutterH = clampNum(params.cutterHeightMm, 8, 28);
    const flangeH = clampNum(params.flangeThicknessMm, 1.4, 5.0);

    const outerBlade = dilateBinaryMask(mask, maskW, maskH, bladePx);
    const bladeRing = new Uint8Array(mask.length);
    const outerFlange = dilateBinaryMask(mask, maskW, maskH, bladePx + flangePx);
    const flangeRing = new Uint8Array(mask.length);

    for (let i = 0; i < mask.length; i++) {
      bladeRing[i] = outerBlade[i] && !mask[i] ? 1 : 0;
      flangeRing[i] = outerFlange[i] && !mask[i] ? 1 : 0;
    }

    const flangePolys = traceBinaryMaskToContours(flangeRing, maskW, maskH, {
      simplifyEpsilon: 0.9,
      smoothPasses: 1,
      minAreaPx: 6
    });
    const flangeShapes = polygonsToThreeShapes(flangePolys, maskW, maskH, targetW, targetH);
    flangeShapes.forEach(s => {
      parts.push(new THREE.ExtrudeGeometry(s, { depth: flangeH, bevelEnabled: false, curveSegments: 10 }));
    });

    const bladePolys = traceBinaryMaskToContours(bladeRing, maskW, maskH, {
      simplifyEpsilon: 0.8,
      smoothPasses: 1,
      minAreaPx: 6
    });
    const bladeShapes = polygonsToThreeShapes(bladePolys, maskW, maskH, targetW, targetH);
    bladeShapes.forEach(s => {
      parts.push(new THREE.ExtrudeGeometry(s, { depth: cutterH, bevelEnabled: false, curveSegments: 10 }));
    });
  }

  const geometry = normalizeAndMergeGeometries(parts);
  const metrics = computeMeshMetrics(geometry);
  return { geometry, ...metrics };
}

/**
 * Dibuja 12 iconos vectoriales limpios en Canvas 2D para usarlos en llaveros, medallas y placas.
 */
export function drawIconOnCanvas(
  ctx: CanvasRenderingContext2D,
  iconId: IconPresetId,
  cx: number,
  cy: number,
  sizePx: number
): void {
  if (iconId === 'ninguno') return;
  const r = sizePx * 0.46;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (iconId) {
    case 'corazon': {
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = (i / 60) * Math.PI * 2;
        const x = (16 * Math.pow(Math.sin(t), 3) / 16) * r;
        const y = -((13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2) / 16) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'estrella': {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.45;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'huella': {
      ctx.beginPath();
      ctx.ellipse(0, r * 0.25, r * 0.46, r * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      const toes = [
        [-0.55, -0.25, -0.35],
        [-0.2, -0.52, -0.1],
        [0.2, -0.52, 0.1],
        [0.55, -0.25, 0.35]
      ];
      toes.forEach(([tx, ty, rot]) => {
        ctx.beginPath();
        ctx.ellipse(tx * r, ty * r, r * 0.16, r * 0.23, rot, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }

    case 'corona': {
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, r * 0.55);
      ctx.lineTo(-r * 0.95, -r * 0.35);
      ctx.lineTo(-r * 0.42, r * 0.08);
      ctx.lineTo(0, -r * 0.65);
      ctx.lineTo(r * 0.42, r * 0.08);
      ctx.lineTo(r * 0.95, -r * 0.35);
      ctx.lineTo(r * 0.85, r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-r * 0.85, r * 0.62, r * 1.7, r * 0.18);
      break;
    }

    case 'pies_bebe': {
      [-0.42, 0.42].forEach((side, idx) => {
        ctx.save();
        ctx.translate(side * r, 0);
        ctx.rotate(idx === 0 ? -0.15 : 0.15);
        ctx.beginPath();
        ctx.ellipse(0, r * 0.2, r * 0.24, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let t = 0; t < 4; t++) {
          ctx.beginPath();
          ctx.arc((-0.18 + t * 0.12) * r, -r * 0.42, r * 0.07, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      break;
    }

    case 'mariposa': {
      [-1, 1].forEach(dir => {
        ctx.beginPath();
        ctx.ellipse(dir * r * 0.48, -r * 0.22, r * 0.45, r * 0.34, dir * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(dir * r * 0.36, r * 0.32, r * 0.3, r * 0.25, -dir * 0.35, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillRect(-r * 0.08, -r * 0.55, r * 0.16, r * 1.1);
      break;
    }

    case 'trofeo': {
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.65);
      ctx.lineTo(r * 0.55, -r * 0.65);
      ctx.quadraticCurveTo(r * 0.5, r * 0.15, 0, r * 0.25);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.15, -r * 0.55, -r * 0.65);
      ctx.fill();
      ctx.fillRect(-r * 0.12, r * 0.2, r * 0.24, r * 0.42);
      ctx.fillRect(-r * 0.45, r * 0.6, r * 0.9, r * 0.2);
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.arc(-r * 0.58, -r * 0.32, r * 0.24, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.58, -r * 0.32, r * 0.24, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      break;
    }

    case 'rayo': {
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 0.9);
      ctx.lineTo(-r * 0.48, r * 0.08);
      ctx.lineTo(r * 0.02, r * 0.08);
      ctx.lineTo(-r * 0.2, r * 0.9);
      ctx.lineTo(r * 0.48, -r * 0.08);
      ctx.lineTo(-r * 0.02, -r * 0.08);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'flor': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'globos': {
      [
        [-0.3, -0.15, 0.36],
        [0.32, -0.3, 0.34]
      ].forEach(([bx, by, br]) => {
        ctx.beginPath();
        ctx.ellipse(bx * r, by * r, br * r * 0.85, br * r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = Math.max(2, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(bx * r, (by + br) * r);
        ctx.quadraticCurveTo(bx * r + r * 0.1, r * 0.55, 0, r * 0.85);
        ctx.stroke();
      });
      break;
    }

    case 'diamante': {
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.55);
      ctx.lineTo(r * 0.55, -r * 0.55);
      ctx.lineTo(r * 0.92, -r * 0.1);
      ctx.lineTo(0, r * 0.85);
      ctx.lineTo(-r * 0.92, -r * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

function getFontFamilyCss(fontId: FontPresetId): string {
  switch (fontId) {
    case 'rounded':
      return '"Outfit", "Trebuchet MS", "Arial Rounded MT Bold", sans-serif';
    case 'serif':
      return 'Georgia, "Times New Roman", serif';
    case 'script':
      return '"Brush Script MT", "Segoe Script", cursive, Georgia, serif';
    case 'sans':
    default:
      return '"Inter", "Arial Black", "Segoe UI", sans-serif';
  }
}

/**
 * Renderiza texto (1 o 2 líneas), icono y/o imagen subida en un canvas temporal
 * y retorna la máscara binaria lista para extrusión en 3D.
 */
export function renderGraphicCompositionToMask(options: {
  textLine1?: string;
  textLine2?: string;
  font?: FontPresetId;
  icon?: IconPresetId;
  iconPosition?: 'izquierda' | 'arriba' | 'solo_icono';
  uploadedImageCanvas?: HTMLCanvasElement | null;
  threshold?: number;
  invert?: boolean;
  canvasW?: number;
  canvasH?: number;
}): MaskData | null {
  if (typeof document === 'undefined') return null;

  const w = options.canvasW ?? 260;
  const h = options.canvasH ?? 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  if (options.uploadedImageCanvas) {
    // Ajustar imagen preservando relación de aspecto dentro del canvas
    const imgW = options.uploadedImageCanvas.width || 1;
    const imgH = options.uploadedImageCanvas.height || 1;
    const scale = Math.min((w * 0.9) / imgW, (h * 0.9) / imgH);
    const dw = imgW * scale;
    const dh = imgH * scale;
    ctx.drawImage(options.uploadedImageCanvas, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);
  }

  const line1 = (options.textLine1 || '').trim();
  const line2 = (options.textLine2 || '').trim();
  const hasIcon = options.icon && options.icon !== 'ninguno';
  const hasText = Boolean(line1 || line2);

  if (!options.uploadedImageCanvas && !hasIcon && !hasText) {
    return null;
  }

  if (hasIcon && options.iconPosition === 'solo_icono') {
    drawIconOnCanvas(ctx, options.icon!, w * 0.5, h * 0.5, Math.min(w, h) * 0.78);
  } else {
    let textCenterX = w * 0.5;
    let textAreaW = w * 0.88;
    let textCenterY = h * 0.5;

    if (hasIcon && !options.uploadedImageCanvas) {
      if (options.iconPosition === 'arriba') {
        drawIconOnCanvas(ctx, options.icon!, w * 0.5, h * 0.28, Math.min(w, h) * 0.38);
        textCenterY = h * 0.7;
      } else {
        const iconSize = Math.min(w * 0.28, h * 0.65);
        drawIconOnCanvas(ctx, options.icon!, w * 0.2, h * 0.5, iconSize);
        textCenterX = w * 0.62;
        textAreaW = w * 0.62;
      }
    }

    if (hasText) {
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontCss = getFontFamilyCss(options.font ?? 'rounded');

      const fitAndDraw = (txt: string, yPos: number, maxH: number) => {
        let fontSize = Math.round(maxH);
        ctx.font = `900 ${fontSize}px ${fontCss}`;
        while (fontSize > 12 && ctx.measureText(txt).width > textAreaW) {
          fontSize -= 2;
          ctx.font = `900 ${fontSize}px ${fontCss}`;
        }
        ctx.fillText(txt, textCenterX, yPos);
      };

      if (line1 && line2) {
        const span = hasIcon && options.iconPosition === 'arriba' ? h * 0.22 : h * 0.36;
        fitAndDraw(line1, textCenterY - span * 0.55, span * 0.85);
        fitAndDraw(line2, textCenterY + span * 0.6, span * 0.7);
      } else {
        const singleTxt = line1 || line2;
        fitAndDraw(singleTxt, textCenterY, hasIcon && options.iconPosition === 'arriba' ? h * 0.34 : h * 0.52);
      }
    }
  }

  const imgData = ctx.getImageData(0, 0, w, h);
  const thr = options.threshold ?? 140;
  const inv = Boolean(options.invert);
  // Nota: sobre fondo blanco y dibujo negro, lum < thr => 1 (figura sólida).
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const lum = 0.299 * imgData.data[idx] + 0.587 * imgData.data[idx + 1] + 0.114 * imgData.data[idx + 2];
    const a = imgData.data[idx + 3];
    const solid = a >= 30 && (inv ? lum >= thr : lum < thr);
    mask[i] = solid ? 1 : 0;
  }

  return { mask, width: w, height: h };
}

/**
 * Crea un canvas de muestra artística (para probar Litofanía o Vectorizador SVG al instante).
 */
export function createSamplePortraitCanvas(width: number = 140, height: number = 140): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#f8fafc');
  grad.addColorStop(0.55, '#cbd5e1');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Sol / Luna luminosa
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(width * 0.72, height * 0.26, width * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Montañas en capas de contraste
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.72);
  ctx.lineTo(width * 0.34, height * 0.34);
  ctx.lineTo(width * 0.68, height * 0.68);
  ctx.lineTo(width, height * 0.44);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.82);
  ctx.lineTo(width * 0.25, height * 0.62);
  ctx.lineTo(width * 0.56, height * 0.78);
  ctx.lineTo(width * 0.82, height * 0.58);
  ctx.lineTo(width, height * 0.8);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  return canvas;
}
