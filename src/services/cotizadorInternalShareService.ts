import { Personal, PiezaCotizada } from '../types';

function toBase64UrlUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64UrlUtf8(token: string): string {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((token.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Codifica una PiezaCotizada en un token compacto UTF-8 para abrirla directamente
 * en el Cotizador desde cualquier dispositivo del equipo (sin depender de BD).
 */
export function encodeDraftReviewPayload(pieza: PiezaCotizada): string {
  const sanitized: PiezaCotizada = {
    ...pieza,
    imagen_url:
      pieza.imagen_url && pieza.imagen_url.length <= 2000 && !pieza.imagen_url.startsWith('data:image/')
        ? pieza.imagen_url
        : undefined
  };
  return toBase64UrlUtf8(JSON.stringify(sanitized));
}

export function decodeDraftReviewPayload(token: string): PiezaCotizada | null {
  try {
    if (!token || token.length < 10) return null;
    const jsonStr = fromBase64UrlUtf8(token.trim());
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object' || !parsed.nombre_item) return null;
    return parsed as PiezaCotizada;
  } catch {
    return null;
  }
}

export function buildDraftReviewEditUrl(pieza: PiezaCotizada, origin?: string): string {
  const baseOrigin =
    origin ||
    (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://wjg-lyart.vercel.app');
  const token = encodeDraftReviewPayload(pieza);
  return `${baseOrigin.replace(/\/+$/, '')}/?tab=cotizador&draft_review=${token}`;
}

export function resolveOperatorDisplayName(id?: string, personal: Personal[] = []): string | null {
  if (!id) return null;
  const p = personal.find(per => per.id === id);
  if (!p) return null;
  const nombre = p.nombre || p.rol;
  const hora = Number(p.costo_hora) > 0 ? `$${Number(p.costo_hora).toLocaleString('es-CO')}/h` : '';
  return hora ? `${nombre} (${hora})` : nombre;
}

const fmtCop = (n?: number) => `$${Math.round(n || 0).toLocaleString('es-CO')} COP`;

/**
 * Genera el informe técnico-financiero completo para revisión interna del equipo WJGEEKS
 * antes de agregar la pieza a una cotización final.
 */
export function generarInformeInternoWhatsApp(
  pieza: PiezaCotizada,
  opciones: {
    cantidad: number;
    personal?: Personal[];
    editUrl?: string;
  }
): string {
  const cantidad = Math.max(1, Number(opciones.cantidad) || pieza.cantidad || 1);
  const personal = opciones.personal || [];
  const tech = pieza.tecnologia || 'SLA_RESINA';
  const opDiseno = resolveOperatorDisplayName(pieza.operador_diseno_id, personal);
  const opArmado = resolveOperatorDisplayName(pieza.operador_armado_id, personal);
  const opPintura = resolveOperatorDisplayName(pieza.operador_pintura_id, personal);

  const apartadosLines = (pieza.desglose_apartados || []).map(ap => {
    const tagProrrateo = ap.esProrrateado ? ` (÷${cantidad})` : '';
    return `• *${ap.etiqueta}${tagProrrateo}:* Costo ${fmtCop(ap.costoUnitario)} ➔ Cobro ${fmtCop(ap.cobroUnitario)}`;
  });

  const horas = Math.floor((pieza.tiempo_impresion_min || 0) / 60);
  const mins = (pieza.tiempo_impresion_min || 0) % 60;
  const modoLabel = pieza.modo_margen === 'markup' ? 'Markup sobre Costo' : 'Margen Bruto sobre Venta';
  const pctMargen = Math.round((pieza.margen_ganancia || 0) * 100);

  const lines: string[] = [
    `🔒 *REVISIÓN INTERNA WJGEEKS (NO ENVIAR AL CLIENTE)*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🧩 *Pieza:* ${pieza.nombre_item}`,
    `📦 *Cantidad:* ${cantidad} und. • *Tecnología:* ${tech}`,
    `📐 *Medidas:* ${pieza.alto_mm}×${pieza.ancho_mm}×${pieza.profundidad_mm} mm`,
    `🧪 *Material/Peso:* ${pieza.resina_nombre} (${pieza.peso_estimado_g || 0} g)`,
    `⏱️ *Impresión:* ${horas}h ${mins}m (${pieza.tiempo_impresion_min || 0} min) • ${pieza.maquina_nombre}`,
    ...(opDiseno || opArmado || opPintura
      ? [
          `👷 *Responsables MO:* ${[
            opDiseno ? `Diseño: ${opDiseno}` : null,
            opArmado ? `Taller: ${opArmado}` : null,
            pieza.va_pintado && opPintura ? `Pintura: ${opPintura}` : null
          ]
            .filter(Boolean)
            .join(' | ')}`
        ]
      : []),
    ``,
    `📊 *DESGLOSE UNITARIO PASO A PASO:*`,
    ...(apartadosLines.length > 0 ? apartadosLines : [`• Costo Base Producción: ${fmtCop(pieza.costo_base_produccion)}`]),
    ``,
    `💰 *RESUMEN FINANCIERO (${modoLabel} ${pctMargen}%):*`,
    `• *Costo Real Taller:* ${fmtCop(pieza.costo_base_produccion)} c/u (Lote: ${fmtCop((pieza.costo_base_produccion || 0) * cantidad)})`,
    `• *Precio Sugerido:* *${fmtCop(pieza.precio_unitario)} c/u* (Total Lote: *${fmtCop(pieza.precio_total)}*)`,
    `• *Utilidad Neta:* +${fmtCop(pieza.utilidad_neta_unitaria)} c/u (Lote: +${fmtCop(pieza.utilidad_neta_total)})`,
    ...(pieza.precio_con_margen_bruto && pieza.precio_con_markup
      ? [
          `• *Comparativa:* Margen Bruto ${fmtCop(pieza.precio_con_margen_bruto)} vs Markup ${fmtCop(pieza.precio_con_markup)}`
        ]
      : []),
    ...(opciones.editUrl
      ? [
          ``,
          `✏️ *¿Necesitas ajustar medidas, tiempos o margen? Abre directo esta pieza aquí:*`,
          opciones.editUrl
        ]
      : [])
  ];

  return lines.join('\n');
}
