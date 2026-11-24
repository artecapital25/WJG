import { describe, it, expect } from 'vitest';
import {
  buildDraftReviewEditUrl,
  decodeDraftReviewPayload,
  encodeDraftReviewPayload,
  generarInformeInternoWhatsApp,
  resolveOperatorDisplayName
} from '../cotizadorInternalShareService';
import {
  generarPDFClientePreliminarBase64,
  generarPDFDesgloseInternoBase64
} from '../pdfService';
import { ConfiguracionTaller, Personal, PiezaCotizada } from '../../types';

const SAMPLE_PIECE: PiezaCotizada = {
  id: 'pieza-test-1',
  nombre_item: 'Estatua Malenia Escala 1/6',
  cantidad: 2,
  alto_mm: 240,
  ancho_mm: 150,
  profundidad_mm: 140,
  volumen_cm3: 320,
  peso_estimado_g: 361.6,
  resina_id: 'res-8k',
  resina_nombre: 'Anycubic High Speed 8K',
  maquina_id: 'maq-m5s',
  maquina_nombre: 'Photon Mono M5s',
  tiempo_impresion_min: 480,
  tiempo_desarrollo_min: 45,
  tiempo_armado_min: 30,
  tiempo_pintura_min: 180,
  costo_energia: 4200,
  costo_resina: 54000,
  costo_curado: 2500,
  costo_insumos: 8500,
  costo_mano_obra: 42500,
  costo_modelo_comprado: 20000,
  costo_base_produccion: 121700,
  margen_ganancia: 0.40,
  modo_margen: 'margen_bruto',
  precio_unitario: 202833,
  precio_total: 405666,
  precio_con_margen_bruto: 202833,
  precio_con_markup: 170380,
  utilidad_neta_unitaria: 81133,
  utilidad_neta_total: 162266,
  tiempo_entrega: '6 días hábiles',
  descripcion_tecnica: 'Resina 8K + Pintura Acrílica Artesanal',
  tecnologia: 'SLA_RESINA',
  va_pintado: true,
  operador_diseno_id: 'per-german',
  operador_armado_id: 'per-juan',
  operador_pintura_id: 'per-wendy',
  imagen_url: `data:image/png;base64,${'A'.repeat(4000)}`,
  desglose_apartados: [
    {
      clave: 'material_impresion',
      etiqueta: 'Resina SLA',
      costoUnitario: 54000,
      cobroUnitario: 90000,
      utilidadUnitaria: 36000,
      costoLote: 108000,
      cobroLote: 180000,
      esProrrateado: false,
      color: '#38bdf8'
    },
    {
      clave: 'archivo_modelo_3d',
      etiqueta: 'Archivo STL Comprado',
      costoUnitario: 10000,
      cobroUnitario: 16667,
      utilidadUnitaria: 6667,
      costoLote: 20000,
      cobroLote: 33334,
      esProrrateado: true,
      color: '#a855f7'
    }
  ]
};

const SAMPLE_PERSONAL: Personal[] = [
  { id: 'per-german', nombre: 'Germán', rol: 'Backoffice & Ventas', area_responsabilidad: 'Backoffice', costo_hora: 10000, costo_minuto: 166.67 },
  { id: 'per-juan', nombre: 'Juan', rol: 'Encargado de Taller', area_responsabilidad: 'Taller', costo_hora: 10000, costo_minuto: 166.67 },
  { id: 'per-wendy', nombre: 'Wendy', rol: 'Pintura y Redes', area_responsabilidad: 'Pintura', costo_hora: 10000, costo_minuto: 166.67 }
];

const SAMPLE_CONFIG: ConfiguracionTaller = {
  tarifa_kwh: 900,
  margen_merma_resina: 0.2,
  margen_merma_fdm: 0.15,
  telefono_contacto: '3217273025',
  telefono_contacto2: '3024242855',
  instagram: '@wjgeeks3d',
  nequi: '3217273025',
  titular_cuenta: 'WJGEEKS 3D PRO'
};

describe('cotizadorInternalShareService & PDFs pre-revisión', () => {
  it('codifica y decodifica una pieza preservando acentos UTF-8 y omitiendo base64 pesado', () => {
    const token = encodeDraftReviewPayload(SAMPLE_PIECE);
    expect(token.length).toBeGreaterThan(20);
    expect(token).not.toContain('+');
    expect(token).not.toContain('/');

    const decoded = decodeDraftReviewPayload(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.nombre_item).toBe('Estatua Malenia Escala 1/6');
    expect(decoded?.cantidad).toBe(2);
    expect(decoded?.imagen_url).toBeUndefined();
    expect(decoded?.desglose_apartados?.length).toBe(2);
  });

  it('retorna null ante tokens corruptos o vacíos', () => {
    expect(decodeDraftReviewPayload('')).toBeNull();
    expect(decodeDraftReviewPayload('abc')).toBeNull();
    expect(decodeDraftReviewPayload('token_invalido_123456')).toBeNull();
  });

  it('construye un enlace directo de edición para el Cotizador', () => {
    const url = buildDraftReviewEditUrl(SAMPLE_PIECE, 'https://wjg-lyart.vercel.app/');
    expect(url.startsWith('https://wjg-lyart.vercel.app/?tab=cotizador&draft_review=')).toBe(true);
    const token = url.split('draft_review=')[1];
    expect(decodeDraftReviewPayload(token)?.nombre_item).toBe(SAMPLE_PIECE.nombre_item);
  });

  it('resuelve operador y genera informe interno legible con advertencia NO ENVIAR AL CLIENTE', () => {
    expect(resolveOperatorDisplayName('per-juan', SAMPLE_PERSONAL)).toContain('Juan');
    const url = buildDraftReviewEditUrl(SAMPLE_PIECE, 'https://wjg-lyart.vercel.app');
    const text = generarInformeInternoWhatsApp(SAMPLE_PIECE, {
      cantidad: 2,
      personal: SAMPLE_PERSONAL,
      editUrl: url
    });

    expect(text).toContain('NO ENVIAR AL CLIENTE');
    expect(text).toContain('Estatua Malenia Escala 1/6');
    expect(text).toContain('Resina SLA');
    expect(text).toContain('Archivo STL Comprado (÷2)');
    expect(text).toContain('Margen Bruto');
    expect(text).toContain('https://wjg-lyart.vercel.app/?tab=cotizador&draft_review=');
  });

  it('genera ambos PDFs en base64 válido (Preliminar Cliente + Interno NO_ENVIAR_CLIENTE)', async () => {
    const pieceWithoutFakeImg = { ...SAMPLE_PIECE, imagen_url: undefined };
    const cli = await generarPDFClientePreliminarBase64(pieceWithoutFakeImg, SAMPLE_CONFIG);
    const intl = await generarPDFDesgloseInternoBase64(pieceWithoutFakeImg, SAMPLE_CONFIG, SAMPLE_PERSONAL);

    expect(cli.fileName).toMatch(/^Cotizacion_PRELIMINAR_Cliente_.*\.pdf$/);
    expect(cli.base64.startsWith('JVBERi0')).toBe(true);

    expect(intl.fileName).toMatch(/^NO_ENVIAR_CLIENTE_Desglose_Interno_.*\.pdf$/);
    expect(intl.base64.startsWith('JVBERi0')).toBe(true);
  });
});
