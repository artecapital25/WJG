import { describe, it, expect } from 'vitest';
import {
  dilateBinaryMask,
  polygonsToSvgString,
  polygonsToThreeShapes,
  thresholdImageDataToBinaryMask,
  traceBinaryMaskToContours
} from '../imageToSvgService';
import {
  buildCutterStampGeometry,
  buildEventPlaqueGeometry,
  buildKeychainGeometry,
  buildLithophaneGeometry,
  buildMedalGeometry,
  buildQr3DGeometry,
  buildSvgExtrusionGeometry
} from '../meshGeneratorsService';

function createRingMask(size: number = 32): Uint8Array {
  const mask = new Uint8Array(size * size);
  for (let y = 4; y < size - 4; y++) {
    for (let x = 4; x < size - 4; x++) {
      const inHole = x >= 11 && x < size - 11 && y >= 11 && y < size - 11;
      mask[y * size + x] = inHole ? 0 : 1;
    }
  }
  return mask;
}

describe('imageToSvgService - Vectorizador de imágenes', () => {
  it('umbraliza RGBA a máscara binaria y dilata correctamente', () => {
    const w = 10;
    const h = 10;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const isCenter = i === 55;
      rgba[i * 4 + 0] = isCenter ? 10 : 250;
      rgba[i * 4 + 1] = isCenter ? 10 : 250;
      rgba[i * 4 + 2] = isCenter ? 10 : 250;
      rgba[i * 4 + 3] = 255;
    }
    const mask = thresholdImageDataToBinaryMask(rgba, w, h, 128, false);
    expect(mask[55]).toBe(1);
    expect(mask[0]).toBe(0);

    const dilated = dilateBinaryMask(mask, w, h, 2);
    expect(dilated[56]).toBe(1);
    expect(dilated[35]).toBe(1);
  });

  it('traza contorno exterior con hueco interno, genera SVG válido y THREE.Shape con holes', () => {
    const size = 32;
    const ring = createRingMask(size);
    const polys = traceBinaryMaskToContours(ring, size, size, {
      simplifyEpsilon: 0.5,
      smoothPasses: 0,
      minAreaPx: 4
    });

    expect(polys.length).toBe(1);
    expect(polys[0].outer.length).toBeGreaterThanOrEqual(4);
    expect(polys[0].holes.length).toBe(1);

    const svg = polygonsToSvgString(polys, size, size, { viewBoxWidthMm: 50, viewBoxHeightMm: 50 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain('viewBox="0 0 50.00 50.00"');

    const shapes = polygonsToThreeShapes(polys, size, size, 50, 50);
    expect(shapes.length).toBe(1);
    expect(shapes[0].holes.length).toBe(1);
  });
});

describe('meshGeneratorsService - 7 Generadores 3D STL', () => {
  it('1. Genera Litofanía plana y curva con malla sólida Z-up y dimensiones en mm', () => {
    const cols = 20;
    const rows = 16;
    const grid = new Float32Array(cols * rows);
    for (let i = 0; i < grid.length; i++) {
      grid[i] = (i % cols) / cols;
    }

    const flat = buildLithophaneGeometry(grid, cols, rows, {
      shape: 'plana',
      widthMm: 80,
      heightMm: 60,
      minThicknessMm: 0.8,
      maxThicknessMm: 3.2,
      frameMm: 3
    });
    expect(flat.trianglesCount).toBeGreaterThan(500);
    expect(flat.volumeCm3).toBeGreaterThan(1);
    expect(flat.dimensionsMm.x).toBeCloseTo(80, 0);
    expect(flat.dimensionsMm.y).toBeCloseTo(60, 0);
    expect(flat.dimensionsMm.z).toBeCloseTo(3.2, 1);

    const curved = buildLithophaneGeometry(grid, cols, rows, {
      shape: 'curva',
      widthMm: 100,
      heightMm: 75,
      minThicknessMm: 0.8,
      maxThicknessMm: 3.2,
      frameMm: 3,
      curveAngleDeg: 120
    });
    expect(curved.trianglesCount).toBeGreaterThan(500);
    expect(curved.dimensionsMm.z).toBeCloseTo(75, 0);
  });

  it('2. Genera Llavero 3D con relieve desde máscara y ojal de argolla', () => {
    const mask = createRingMask(28);
    const res = buildKeychainGeometry({
      shape: 'rect_redondeado',
      widthMm: 60,
      heightMm: 28,
      baseThicknessMm: 3,
      reliefHeightMm: 1.5,
      reliefMode: 'positivo',
      holePosition: 'izquierda',
      holeDiameterMm: 4,
      hasBorder: true,
      reliefMask: { mask, width: 28, height: 28 }
    });

    expect(res.trianglesCount).toBeGreaterThan(20);
    expect(res.volumeCm3).toBeGreaterThan(1);
    expect(res.dimensionsMm.x).toBeGreaterThan(60);
    expect(res.dimensionsMm.z).toBeCloseTo(4.5, 1);
  });

  it('3. Genera Medalla 3D circular con doble aro y ranura para cinta', () => {
    const mask = createRingMask(24);
    const res = buildMedalGeometry({
      shape: 'circulo',
      diameterMm: 65,
      baseThicknessMm: 3.2,
      reliefHeightMm: 1.6,
      loopType: 'ranura_cinta',
      doubleRim: true,
      reliefMask: { mask, width: 24, height: 24 }
    });

    expect(res.trianglesCount).toBeGreaterThan(50);
    expect(res.volumeCm3).toBeGreaterThan(2);
    expect(res.dimensionsMm.x).toBeCloseTo(65, 0);
    expect(res.dimensionsMm.y).toBeGreaterThan(65);
  });

  it('4. Genera Placas para Eventos (plana, cake topper y base de mesa)', () => {
    const mask = createRingMask(24);
    const topper = buildEventPlaqueGeometry({
      shape: 'nube',
      widthMm: 120,
      heightMm: 80,
      baseThicknessMm: 3.5,
      reliefHeightMm: 2,
      mounting: 'topper',
      topperStakeMm: 45,
      hasBorder: true,
      reliefMask: { mask, width: 24, height: 24 }
    });
    expect(topper.trianglesCount).toBeGreaterThan(50);
    expect(topper.dimensionsMm.y).toBeGreaterThan(100);

    const stand = buildEventPlaqueGeometry({
      shape: 'arco',
      widthMm: 100,
      heightMm: 70,
      baseThicknessMm: 3.5,
      reliefHeightMm: 1.8,
      mounting: 'base_mesa',
      hasBorder: false
    });
    expect(stand.volumeCm3).toBeGreaterThan(5);
  });

  it('5. Convierte máscara a SVG vectorial y extrusión STL 3D', () => {
    const mask = createRingMask(30);
    const res = buildSvgExtrusionGeometry(mask, 30, 30, {
      targetWidthMm: 70,
      targetHeightMm: 70,
      extrudeHeightMm: 3,
      includeBase: true,
      baseThicknessMm: 2,
      includeKeyringHole: true
    });

    expect(res.svgContent).toContain('<svg');
    expect(res.trianglesCount).toBeGreaterThan(30);
    expect(res.volumeCm3).toBeGreaterThan(1);
  });

  it('6. Genera Código QR 3D escaneable en STL desde texto/URL', () => {
    const res = buildQr3DGeometry({
      text: 'https://wjgeeks3d.com',
      sizeMm: 65,
      baseThicknessMm: 2.2,
      reliefHeightMm: 1.2,
      hasBorder: true,
      mounting: 'llavero',
      captionMask: { mask: createRingMask(24), width: 24, height: 24 }
    });

    expect(res.trianglesCount).toBeGreaterThan(200);
    expect(res.volumeCm3).toBeGreaterThan(2);
    expect(res.dimensionsMm.x).toBeCloseTo(65, 0);
  });

  it('7. Genera Cortador de galletas y Sello 3D espejado', () => {
    const mask = createRingMask(32);
    const cutter = buildCutterStampGeometry(mask, 32, 32, {
      mode: 'cortador',
      sizeMm: 75,
      cutterHeightMm: 15,
      bladeThicknessMm: 1.2,
      flangeWidthMm: 4,
      flangeThicknessMm: 2.2,
      baseThicknessMm: 3,
      reliefHeightMm: 2.8,
      includeHandle: true
    });
    expect(cutter.trianglesCount).toBeGreaterThan(30);
    expect(cutter.dimensionsMm.z).toBeCloseTo(15, 0);

    const stamp = buildCutterStampGeometry(mask, 32, 32, {
      mode: 'sello',
      sizeMm: 60,
      cutterHeightMm: 15,
      bladeThicknessMm: 1.2,
      flangeWidthMm: 4,
      flangeThicknessMm: 2.2,
      baseThicknessMm: 3,
      reliefHeightMm: 2.8,
      includeHandle: true
    });
    expect(stamp.trianglesCount).toBeGreaterThan(30);
    expect(stamp.dimensionsMm.z).toBeGreaterThan(10);
  });
});
