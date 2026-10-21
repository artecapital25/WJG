// @ts-nocheck
/// <reference path="../deno.d.ts" />
// ==============================================================================
// Supabase Edge Function: Despacho Automatizado Desatendido de WhatsApp
// Proveedor: WhatsApp Business Cloud API (Meta Graph API v18.0+)
// Cero intervención manual - Procesamiento por Lotes, Idempotencia y Reintentos
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const waToken = Deno.env.get('WHATSAPP_CLOUD_API_TOKEN') || '';
    const waPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Configuración de Supabase incompleta' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Obtener mensajes encolados pendientes de despacho
    const { data: queue, error: fetchError } = await supabase
      .from('whatsapp_notification_logs')
      .select('*')
      .eq('estado', 'queued')
      .lte('proximo_reintento_at', new Date().toISOString())
      .lt('intentos', 3)
      .order('created_at', { ascending: true })
      .limit(25);

    if (fetchError) {
      throw fetchError;
    }

    const resultados: { id: string; status: string; error?: string }[] = [];

    // 2. Procesar cada notificación desatendida
    for (const item of (queue || [])) {
      try {
        // Limpiar teléfono destino
        let cleanPhone = (item.destinatario_telefono || '').replace(/\D/g, '');
        if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
          cleanPhone = `57${cleanPhone}`;
        }

        // Si la API de WhatsApp Cloud está configurada, despachar vía HTTP directo
        if (waToken && waPhoneId) {
          const endpoint = `https://graph.facebook.com/v18.0/${waPhoneId}/messages`;
          const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: {
              preview_url: false,
              body: item.contenido,
            },
          };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${waToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          const resData = await response.json();

          if (response.ok && resData?.messages?.[0]?.id) {
            await supabase
              .from('whatsapp_notification_logs')
              .update({
                estado: 'sent',
                id_externo: resData.messages[0].id,
                enviado_at: new Date().toISOString(),
                error_detalle: null,
              })
              .eq('id', item.id);

            resultados.push({ id: item.id, status: 'sent' });
          } else {
            throw new Error(resData?.error?.message || `HTTP Error ${response.status}`);
          }
        } else {
          // Si no hay token de WhatsApp Cloud en variables de entorno, simular envío exitoso en local/staging
          await supabase
            .from('whatsapp_notification_logs')
            .update({
              estado: 'sent',
              id_externo: `simulated-${Date.now()}`,
              enviado_at: new Date().toISOString(),
              error_detalle: 'Despacho simulado (WHATSAPP_CLOUD_API_TOKEN no provisto)',
            })
            .eq('id', item.id);

          resultados.push({ id: item.id, status: 'simulated_sent' });
        }
      } catch (sendErr: any) {
        const nuevosIntentos = (item.intentos || 0) + 1;
        const maxIntentos = item.max_intentos || 3;
        const estadoFinal = nuevosIntentos >= maxIntentos ? 'failed' : 'queued';

        // Reintento exponencial (5 min, 20 min, 60 min)
        const delayMinutos = Math.pow(nuevosIntentos, 2) * 5;
        const proximoReintento = new Date(Date.now() + delayMinutos * 60 * 1000).toISOString();

        await supabase
          .from('whatsapp_notification_logs')
          .update({
            estado: estadoFinal,
            intentos: nuevosIntentos,
            proximo_reintento_at: proximoReintento,
            error_detalle: sendErr.message || 'Error de despacho',
          })
          .eq('id', item.id);

        resultados.push({ id: item.id, status: estadoFinal, error: sendErr.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        procesados: resultados.length,
        resultados,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
