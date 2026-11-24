import { describe, it, expect } from 'vitest';
import {
  parse3MFBuffer,
  parseAnycubicBuffer,
  parseCTBBuffer,
  parseGCodeWithThumbnail,
  parseGOOBuffer,
  parseSlicerFile
} from '../slicerParserService';

/**
 * Construye un archivo ZIP válido método 0 (STORE) en memoria para probar .3mf sin dependencias externas.
 */
function buildStoredZip(files: { name: string; content: string | Uint8Array }[]): ArrayBuffer {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const cdParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = typeof file.content === 'string' ? encoder.encode(file.content) : file.content;

    // Local File Header (30 bytes + name)
    const lh = new Uint8Array(30 + nameBytes.length);
    const lhv = new DataView(lh.buffer);
    lhv.setUint32(0, 0x04034b50, true);
    lhv.setUint16(4, 20, true);
    lhv.setUint16(8, 0, true); // method STORE
    lhv.setUint32(18, dataBytes.length, true);
    lhv.setUint32(22, dataBytes.length, true);
    lhv.setUint16(26, nameBytes.length, true);
    lh.set(nameBytes, 30);

    localParts.push(lh, dataBytes);

    // Central Directory Header (46 bytes + name)
    const cd = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(cd.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint32(20, dataBytes.length, true);
    cdv.setUint32(24, dataBytes.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);

    cdParts.push(cd);
    offset += lh.length + dataBytes.length;
  }

  const cdSize = cdParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22);
  const eocdv = new DataView(eocd.buffer);
  eocdv.setUint32(0, 0x06054b50, true);
  eocdv.setUint16(8, files.length, true);
  eocdv.setUint16(10, files.length, true);
  eocdv.setUint32(12, cdSize, true);
  eocdv.setUint32(16, offset, true);

  const totalLen = offset + cdSize + 22;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of [...localParts, ...cdParts, eocd]) {
    out.set(p, pos);
    pos += p.length;
  }
  return out.buffer;
}

describe('slicerParserService - Lector Universal de Archivos Slicer', () => {
  it('extrae miniatura PNG, peso, purga AMS y tiempo desde .gcode', () => {
    const fakePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const gcode = [
      '; BambuStudio 01.09.00',
      '; estimated printing time (normal mode) = 2h 30m 15s',
      `; thumbnail begin 100x100 ${fakePngBase64.length}`,
      `; ${fakePngBase64}`,
      '; thumbnail end',
      '; total filament used [g] = 45.2, 22.8',
      '; filament_type = PLA;PLA',
      '; total filament flushed weight [g] = 11.4',
      '; total layer number: 340'
    ].join('\n');

    const res = parseGCodeWithThumbnail(gcode, 'Tanjiro_Multicolor.gcode');
    expect(res.formato).toBe('gcode');
    expect(res.tecnologia).toBe('FDM_FILAMENTO');
    expect(res.tiempoMinutos).toBe(150);
    expect(res.pesoGramos).toBe(68);
    expect(res.pesoPurgaGramos).toBe(11.4);
    expect(res.esMulticolorAMS).toBe(true);
    expect(res.cantidadColores).toBe(2);
    expect(res.capas).toBe(340);
    expect(res.thumbnailDataUrl?.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('lee un archivo .3mf laminado (slice_info.config + miniatura PNG)', async () => {
    const sliceXml = `
      <config>
        <plate>
          <metadata key="prediction" value="5400"/>
          <metadata key="weight" value="94.5"/>
          <metadata key="layer_height" value="0.2"/>
          <metadata key="printer_model_id" value="Bambu Lab P1S"/>
          <filament id="1" type="PETG" used_g="60.5"/>
          <filament id="2" type="PETG" used_g="34.0"/>
        </plate>
      </config>
    `;
    const fakePngBytes = new Uint8Array(64).fill(137);
    const zipBuf = buildStoredZip([
      { name: 'Metadata/slice_info.config', content: sliceXml },
      { name: 'Metadata/plate_1.png', content: fakePngBytes }
    ]);

    const res = await parse3MFBuffer(zipBuf, 'Busto_Spiderman.3mf');
    expect(res.formato).toBe('3mf');
    expect(res.tecnologia).toBe('FDM_FILAMENTO');
    expect(res.tiempoMinutos).toBe(90);
    expect(res.pesoGramos).toBe(94.5);
    expect(res.esMulticolorAMS).toBe(true);
    expect(res.cantidadColores).toBe(2);
    expect(res.tipoMaterial).toBe('PETG');
    expect(res.alturaCapaMm).toBe(0.2);
    expect(res.thumbnailDataUrl?.startsWith('data:image/png;base64,')).toBe(true);
    expect(res.advertencia).toBeUndefined();
  });

  it('detecta .3mf sin laminar extrayendo dimensiones 3D y emitiendo advertencia parcial', async () => {
    const modelXml = `
      <model unit="millimeter">
        <resources><object id="1"><mesh><vertices>
          <vertex x="0" y="0" z="0" />
          <vertex x="80" y="65.5" z="142.4" />
        </vertices></mesh></object></resources>
      </model>
    `;
    const zipBuf = buildStoredZip([{ name: '3D/3dmodel.model', content: modelXml }]);
    const res = await parse3MFBuffer(zipBuf, 'Proyecto_Sin_Laminar.3mf');

    expect(res.anchoMm).toBe(80);
    expect(res.profundidadMm).toBe(65.5);
    expect(res.altoMm).toBe(142.4);
    expect(res.tiempoMinutos).toBe(0);
    expect(res.camposFaltantes).toContain('Tiempo de impresión');
    expect(res.advertencia).toContain('sin laminar');
  });

  it('lee archivos binarios de resina (.ctb, .goo y .pwmb)', () => {
    // 1. .ctb sintético
    const ctbBuf = new ArrayBuffer(160);
    const ctbView = new DataView(ctbBuf);
    ctbView.setFloat32(28, 125.4, true); // altoMm
    ctbView.setFloat32(32, 0.05, true); // layerHeight
    ctbView.setUint32(68, 2508, true); // capas
    ctbView.setUint32(76, 14400, true); // 4h = 240 min
    ctbView.setUint32(92, 100, true); // offset PrintParameters
    ctbView.setFloat32(136, 100, true); // 100 ml -> 113g
    const ctb = parseCTBBuffer(ctbBuf, 'Figura_Malenia.ctb');
    expect(ctb.tecnologia).toBe('SLA_RESINA');
    expect(ctb.altoMm).toBe(125.4);
    expect(ctb.capas).toBe(2508);
    expect(ctb.tiempoMinutos).toBe(240);
    expect(ctb.volumenMl).toBe(100);
    expect(ctb.pesoGramos).toBe(113);

    // 2. .goo sintético (big-endian compacto)
    const gooBuf = new ArrayBuffer(128);
    const gooView = new DataView(gooBuf);
    gooView.setUint32(64, 1800, false); // capas
    gooView.setFloat32(68, 0.05, false); // layerH
    gooView.setUint32(72, 10800, false); // 180 min
    gooView.setFloat32(76, 50, false); // 50 ml -> 56.5g
    const goo = parseGOOBuffer(gooBuf, 'Cabeza_Elegoo.goo');
    expect(goo.tecnologia).toBe('SLA_RESINA');
    expect(goo.capas).toBe(1800);
    expect(goo.tiempoMinutos).toBe(180);
    expect(goo.pesoGramos).toBe(56.5);

    // 3. .pwmb Anycubic sintético
    const pwmbBuf = new ArrayBuffer(128);
    const pwmbBytes = new Uint8Array(pwmbBuf);
    'HEADER'.split('').forEach((c, idx) => {
      pwmbBytes[16 + idx] = c.charCodeAt(0);
    });
    const pwmbView = new DataView(pwmbBuf);
    const base = 16 + 16;
    pwmbView.setFloat32(base + 4, 0.03, true);
    pwmbView.setUint32(base + 20, 7200, true); // 120 min
    pwmbView.setUint32(base + 24, 3000, true); // capas
    pwmbView.setFloat32(base + 28, 40, true); // 40 ml -> 45.2g
    const pwmb = parseAnycubicBuffer(pwmbBuf, 'MonoM5s_Pieza.pwmb');
    expect(pwmb.tecnologia).toBe('SLA_RESINA');
    expect(pwmb.capas).toBe(3000);
    expect(pwmb.tiempoMinutos).toBe(120);
    expect(pwmb.pesoGramos).toBe(45.2);
  });

  it('retorna advertencia segura sin lanzar excepción para formatos no soportados', async () => {
    const fakeFile = new File([new Uint8Array([1, 2, 3])], 'manual.pdf', { type: 'application/pdf' });
    const res = await parseSlicerFile(fakeFile);
    expect(res.formato).toBe('desconocido');
    expect(res.advertencia).toContain('Formato no compatible');
  });
});
