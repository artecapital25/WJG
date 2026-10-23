// @ts-nocheck
/// <reference path="../deno.d.ts" />
// ==============================================================================
// Supabase Edge Function: generate-marketing-campaign
// Generador Inteligente de Campañas de Marketing con Google Gemini 1.5 Flash
// WJGEEKS 3D PRO - Nicho Geek & Coleccionismo 3D en Colombia
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';
    const { 
      productoNombre, 
      precio, 
      dimensiones = '10 a 15 cm', 
      categoria = 'Anime / Gamer',
      redSocial = 'instagram' // 'instagram' | 'whatsapp' | 'tiktok'
    } = await req.json();

    if (!productoNombre) {
      return new Response(JSON.stringify({ error: 'productoNombre es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const precioFormateado = Number(precio) > 0 ? `$${Number(precio).toLocaleString('es-CO')} COP` : 'Consultar según altura';

    const promptSystem = `
Actúa como un Copywriter y Estratega de Marketing Digital Senior especializado en cultura Geek, Anime, Cine y Coleccionables de Impresión 3D en resina para el mercado colombiano.
Tu objetivo es redactar una pieza promocional altamente persuasiva para el producto: "${productoNombre}".

Metadatos clave de WJGEEKS 3D:
- Material: Resina 8K de ultra-alta definición, curado UV y acabados artesanales.
- Altura/Medidas: ${dimensiones}.
- Precio sugerido: ${precioFormateado}.
- Medios Oficiales de Pago: Llave Bre-B: 0090778625 / Nequi: 3217273025.
- Canal comercial directo de WhatsApp: +57 320 2796115 (https://wa.me/573202796115).
- Envíos seguros a toda Colombia.

Formato requerido según el canal "${redSocial}":
1. Si es "instagram": Un post estructurado con gancho visual inicial, descripción sensorial del nivel de detalle de la resina, precio claro, llamado a la acción al link de la bio / WhatsApp y hashtags relevantes (#WJGeeks3D #Impresion3DColombia #Resina8K #ColeccionablesColombia).
2. Si es "whatsapp": Un estado o mensaje directo corto, directo al grano, con emojis geek, precio y enlace directo de pedido.
3. Si es "tiktok": Un guion de 30 segundos con: [Gancho visual 0-3s], [Cuerpo del video mostrando detalles con la cámara 4-20s], y [Llamado a la acción 21-30s].

Responde únicamente en formato JSON con la siguiente estructura exacta:
{
  "titulo": "Título de la campaña",
  "copy": "Texto completo listo para publicar",
  "prompt_imagen_sugerido": "Prompt en inglés para generar la imagen promocional con iluminación de estudio y estilo resina 8K",
  "canales_pago_incluidos": true
}
`;

    let generatedData = null;

    if (geminiApiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptSystem }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        }),
      });

      const jsonRes = await res.json();
      const rawText = jsonRes?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        generatedData = JSON.parse(rawText);
      }
    }

    // Fallback de alta fidelidad si no hay API Key de Gemini configurada aún en Supabase Secrets
    if (!generatedData) {
      generatedData = {
        titulo: `🔥 ${productoNombre} en Resina 8K`,
        copy: `🔥 ¡NUEVA FIGURA COLECCIONABLE EN RESINA 8K! 🔥\n\nAcabamos de terminar esta pieza de "${productoNombre}" con micro-detalle alucinante 🎨✨.\n\n📏 Tamaño: ${dimensiones}\n💎 Calidad: Resina 8K ultra-definición + curado UV\n💰 Inversión: ${precioFormateado}\n\n📲 Medios de pago oficiales: Bre-B (0090778625) / Nequi (3217273025)\n🚀 Envíos a toda Colombia 🇨🇴\n\n👇 Cotiza o pide la tuya aquí:\nhttps://wa.me/573202796115?text=${encodeURIComponent(`Hola WJGEEKS, quiero pedir la figura de ${productoNombre}`)}`,
        prompt_imagen_sugerido: `Commercial studio photo of a 3D printed resin collectible figure of ${productoNombre}, 8k resolution, matte acrylic paint, macro shot, dramatic turntable lighting`,
        canales_pago_incluidos: true
      };
    }

    return new Response(JSON.stringify({ success: true, data: generatedData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
