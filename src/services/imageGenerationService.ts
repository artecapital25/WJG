/**
 * Image Generation & Visual Studio Service (Gemini & Nano Banana)
 * WJGEEKS 3D PRO - Layer 3: Creative AI & Visual Marketing Engine
 */

export type FormatoRedSocial = 'instagram_feed' | 'instagram_portrait' | 'instagram_story' | 'whatsapp_catalog' | 'banner_landscape';

export interface FormatoPreset {
  id: FormatoRedSocial;
  nombre: string;
  redSocial: 'instagram' | 'whatsapp' | 'web';
  aspectRatioLabel: string;
  width: number;
  height: number;
  descripcion: string;
  icono: string;
}

export const FORMATOS_PRESETS: FormatoPreset[] = [
  {
    id: 'instagram_feed',
    nombre: 'Instagram Post Cuadrado',
    redSocial: 'instagram',
    aspectRatioLabel: '1:1',
    width: 1080,
    height: 1080,
    descripcion: 'Feed tradicional de Instagram, Facebook y Catálogo WhatsApp',
    icono: '📸'
  },
  {
    id: 'instagram_portrait',
    nombre: 'Instagram Retrato (Feed Pro)',
    redSocial: 'instagram',
    aspectRatioLabel: '4:5',
    width: 1080,
    height: 1350,
    descripcion: 'Máxima ocupación visual en el scroll de Instagram',
    icono: '📱'
  },
  {
    id: 'instagram_story',
    nombre: 'Story / Reel / Estados WhatsApp',
    redSocial: 'instagram',
    aspectRatioLabel: '9:16',
    width: 1080,
    height: 1920,
    descripcion: 'Pantalla completa vertical para Stories, Reels y Estados',
    icono: '⚡'
  },
  {
    id: 'whatsapp_catalog',
    nombre: 'WhatsApp Catálogo & POS',
    redSocial: 'whatsapp',
    aspectRatioLabel: '1:1',
    width: 800,
    height: 800,
    descripcion: 'Optimizado para fichas de producto de WhatsApp Business y POS',
    icono: '💬'
  },
  {
    id: 'banner_landscape',
    nombre: 'Banner Horizontal / Web',
    redSocial: 'web',
    aspectRatioLabel: '16:9',
    width: 1920,
    height: 1080,
    descripcion: 'Cabeceras web, portadas de Facebook y contenido horizontal',
    icono: '🖥️'
  }
];

export type EstiloVisualId = 'estudio_comercial' | 'diorama_epico' | 'taller_artesanal' | 'resina_cyberpunk' | 'vitrina_coleccionista';

export interface EstiloVisual {
  id: EstiloVisualId;
  nombre: string;
  tagline: string;
  promptModificador: string;
  badgeColor: string;
  icono: string;
}

export const ESTILOS_VISUALES: EstiloVisual[] = [
  {
    id: 'estudio_comercial',
    nombre: 'Estudio Comercial 8K',
    tagline: 'Fondo neutro, iluminación softbox triple y macro detalle',
    promptModificador: 'commercial product photography, 8k resolution, ultra-detailed 3D printed resin collectible figure, smooth matte and satin finish, studio softbox 3-point lighting, acrylic pedestal reflection, dark charcoal gradient background, macro shot f/2.8 lens, sharp focus, hyperrealistic',
    badgeColor: '#38bdf8',
    icono: '📸'
  },
  {
    id: 'diorama_epico',
    nombre: 'Diorama Épico Anime/Gamer',
    tagline: 'Efectos de energía, rocas texturizadas y atmósfera cinematográfica',
    promptModificador: 'cinematic anime diorama scene, 3D printed collectible statue with dynamic pose, magical energy aura sparks and subtle neon glow, textured rocky pedestal base, dramatic rim lighting with cyan and orange contrast, volumetric haze, epic movie still shot, high octane render',
    badgeColor: '#f59e0b',
    icono: '⚡'
  },
  {
    id: 'taller_artesanal',
    nombre: 'Detrás de Cámaras en Taller',
    tagline: 'Tapete verde de modelismo, aerógrafo y pinceles finos',
    promptModificador: 'close-up authentic artisan workshop setting, green self-healing cutting mat background, metallic airbrush tool resting nearby, tiny Vallejo acrylic paint bottles, detail brushes, natural overhead daylight lamp, newly painted 3D resin figure with immaculate crisp edges, hobby craft atmosphere',
    badgeColor: '#10b981',
    icono: '🎨'
  },
  {
    id: 'resina_cyberpunk',
    nombre: 'Resina Translúcida & Cyberpunk',
    tagline: 'Resina UV cristalina con iluminación LED magenta y cian',
    promptModificador: 'futuristic cyberpunk aesthetic, translucent clear UV resin 3D print showing delicate internal geometry, neon magenta and vibrant cyan dual backlighting, dark moody reflective background, high tech collectible, raytracing reflections, sleek sci-fi look',
    badgeColor: '#c084fc',
    icono: '💎'
  },
  {
    id: 'vitrina_coleccionista',
    nombre: 'Vitrina de Coleccionista',
    tagline: 'Peana grabada, iluminación focal cenital y vitrina premium',
    promptModificador: 'luxury collector museum display showcase, elegant engraved black acrylic stand, warm overhead directional spotlight, crystal glass enclosure reflections, prestigious museum presentation of a masterwork resin figurine, opulent collector tier',
    badgeColor: '#ec4899',
    icono: '🏆'
  }
];

export interface GenerarImagenParams {
  nombreFigura: string;
  estilo: EstiloVisualId;
  formato: FormatoRedSocial;
  detallesAdicionales?: string;
  seed?: number;
}

export interface BrandingOverlayConfig {
  mostrarLogo: boolean;
  mostrarPrecio: boolean;
  precioCOP?: number;
  mostrarMedida: boolean;
  medidaCm?: string;
  mostrarWhatsApp: boolean;
  telefonoWhatsApp?: string;
}

/**
 * Construye el prompt final optimizado para el motor Nano Banana
 */
export function construirPromptNanoBanana(
  nombreFigura: string,
  estiloId: EstiloVisualId,
  detallesAdicionales: string = ''
): string {
  const estilo = ESTILOS_VISUALES.find(e => e.id === estiloId) || ESTILOS_VISUALES[0];
  const itemLimpio = nombreFigura.trim() || 'Custom Collectible Figure';
  const detallesLimpios = detallesAdicionales.trim() ? `, ${detallesAdicionales.trim()}` : '';

  return `${itemLimpio}${detallesLimpios}, ${estilo.promptModificador}`;
}

/**
 * Genera la URL de renderizado directo mediante el motor Nano Banana
 */
export function construirUrlNanoBanana(
  prompt: string,
  width: number,
  height: number,
  seed?: number
): string {
  const seedFinal = typeof seed === 'number' && seed > 0 ? seed : Math.floor(Math.random() * 9999999);
  const encodedPrompt = encodeURIComponent(prompt.trim());

  // Motor visual Nano Banana de alta resolución
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seedFinal}&nologo=true&enhance=true&model=flux`;
}

/**
 * Renderiza una imagen compuesta con Canvas superponiendo la marca y badges comerciales
 */
export async function renderizarCanvasConBranding(
  imagenUrl: string,
  overlay: BrandingOverlayConfig,
  formato: FormatoPreset
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = formato.width;
        canvas.height = formato.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(imagenUrl);
          return;
        }

        // 1. Dibujar la imagen base renderizada
        ctx.drawImage(img, 0, 0, formato.width, formato.height);

        // Si no se requiere ningún overlay, retornar directamente
        if (!overlay.mostrarLogo && !overlay.mostrarPrecio && !overlay.mostrarMedida && !overlay.mostrarWhatsApp) {
          resolve(canvas.toDataURL('image/jpeg', 0.92));
          return;
        }

        const basePadding = Math.round(formato.width * 0.035);
        const fontSizeScale = formato.width / 1080;

        // 2. Overlay: Logo WJGEEKS 3D en la esquina superior izquierda
        if (overlay.mostrarLogo) {
          const logoBadgeWidth = 240 * fontSizeScale;
          const logoBadgeHeight = 44 * fontSizeScale;
          const logoX = basePadding;
          const logoY = basePadding;

          ctx.save();
          ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = 1.5 * fontSizeScale;
          ctx.beginPath();
          ctx.roundRect(logoX, logoY, logoBadgeWidth, logoBadgeHeight, 10 * fontSizeScale);
          ctx.fill();
          ctx.stroke();

          // Texto del logo
          ctx.font = `900 ${18 * fontSizeScale}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText('WJGEEKS', logoX + 16 * fontSizeScale, logoY + 28 * fontSizeScale);

          ctx.font = `900 ${18 * fontSizeScale}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('3D PRO', logoX + 116 * fontSizeScale, logoY + 28 * fontSizeScale);
          ctx.restore();
        }

        // 3. Overlay: Medida de Altura / Resina 8K en la esquina superior derecha
        if (overlay.mostrarMedida && overlay.medidaCm) {
          const textMedida = `📏 ${overlay.medidaCm} | Resina 8K`;
          ctx.save();
          ctx.font = `800 ${15 * fontSizeScale}px system-ui, sans-serif`;
          const textWidth = ctx.measureText(textMedida).width;
          const badgeWidth = textWidth + (28 * fontSizeScale);
          const badgeHeight = 40 * fontSizeScale;
          const badgeX = formato.width - basePadding - badgeWidth;
          const badgeY = basePadding;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1 * fontSizeScale;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 10 * fontSizeScale);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#f1f5f9';
          ctx.fillText(textMedida, badgeX + 14 * fontSizeScale, badgeY + 25 * fontSizeScale);
          ctx.restore();
        }

        // 4. Overlay: Barra Inferior con Precio y WhatsApp Directo
        if (overlay.mostrarPrecio || overlay.mostrarWhatsApp) {
          const barHeight = 88 * fontSizeScale;
          const barY = formato.height - basePadding - barHeight;
          const barX = basePadding;
          const barWidth = formato.width - (basePadding * 2);

          ctx.save();
          // Gradiente suave de fondo oscuro
          const grad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
          grad.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
          grad.addColorStop(1, 'rgba(30, 41, 59, 0.88)');

          ctx.fillStyle = grad;
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.lineWidth = 1.5 * fontSizeScale;
          ctx.beginPath();
          ctx.roundRect(barX, barY, barWidth, barHeight, 14 * fontSizeScale);
          ctx.fill();
          ctx.stroke();

          // Precio en COP
          if (overlay.mostrarPrecio && typeof overlay.precioCOP === 'number' && overlay.precioCOP > 0) {
            ctx.font = `900 ${28 * fontSizeScale}px system-ui, sans-serif`;
            ctx.fillStyle = '#34d399'; // Verde éxito
            const precioTexto = `$${overlay.precioCOP.toLocaleString('es-CO')} COP`;
            ctx.fillText(precioTexto, barX + 20 * fontSizeScale, barY + 54 * fontSizeScale);

            ctx.font = `700 ${12 * fontSizeScale}px system-ui, sans-serif`;
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('PRECIO OFICIAL DE TALLER', barX + 22 * fontSizeScale, barY + 26 * fontSizeScale);
          }

          // WhatsApp en el lado derecho
          if (overlay.mostrarWhatsApp) {
            const telefono = overlay.telefonoWhatsApp || '320 279 6115';
            const waTexto = `📲 Pedidos WhatsApp: +57 ${telefono}`;
            ctx.font = `800 ${18 * fontSizeScale}px system-ui, sans-serif`;
            const waWidth = ctx.measureText(waTexto).width;
            const waX = barX + barWidth - waWidth - (24 * fontSizeScale);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(waTexto, waX, barY + 52 * fontSizeScale);

            ctx.font = `700 ${11 * fontSizeScale}px system-ui, sans-serif`;
            ctx.fillStyle = '#38bdf8';
            const envioTexto = '🇨🇴 Envíos a todo el país • Garantía 100%';
            const envioWidth = ctx.measureText(envioTexto).width;
            ctx.fillText(envioTexto, barX + barWidth - envioWidth - (24 * fontSizeScale), barY + 26 * fontSizeScale);
          }

          ctx.restore();
        }

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        console.error('Error al renderizar canvas compuesto con branding:', err);
        resolve(imagenUrl);
      }
    };

    img.onerror = () => {
      resolve(imagenUrl);
    };

    img.src = imagenUrl;
  });
}

/**
 * Copia un DataURL de imagen al portapapeles del sistema operativo (Blob image/png)
 */
export async function copiarImagenAlPortapapeles(dataUrl: string): Promise<boolean> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    // Convertir a PNG para asegurar compatibilidad de portapapeles en Windows y navegadores modernos
    const pngBlob = blob.type === 'image/png' ? blob : await convertirBlobAPng(blob);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob })
    ]);
    return true;
  } catch (err) {
    console.warn('Error al copiar imagen al portapapeles:', err);
    return false;
  }
}

/**
 * Helper para convertir cualquier blob de imagen a PNG usando un canvas auxiliar
 */
async function convertirBlobAPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((b) => {
          URL.revokeObjectURL(url);
          resolve(b || blob);
        }, 'image/png');
      } else {
        URL.revokeObjectURL(url);
        resolve(blob);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
  });
}
