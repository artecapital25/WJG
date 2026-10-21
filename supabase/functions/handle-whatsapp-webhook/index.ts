// @ts-nocheck
/// <reference path="../deno.d.ts" />
// ==============================================================================
// Supabase Edge Function: Webhook Entrante de WhatsApp (Meta Cloud API)
// Manejador de Respuestas Automáticas Interactivas (Bre-B, Saldos, OT y Horarios)
// Línea Oficial de Despacho: +57 320 2796115
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  const url = new URL(req.url);

  // 1. Verificación del Webhook por Meta (GET /hub.challenge)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const expectedToken = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || 'wjg3d_meta_webhook_secure_token';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('Webhook de WhatsApp verificado exitosamente por Meta.');
      return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
  }

  // 2. Procesamiento de Mensajes Entrantes (POST)
  if (req.method === 'POST') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      const waToken = Deno.env.get('WHATSAPP_CLOUD_API_TOKEN') || '';
      const waPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '';

      const body = await req.json();

      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (!message || message.type !== 'text') {
        // Mensajes que no son de texto o estados de entrega (sent, delivered, read)
        return new Response(JSON.stringify({ status: 'ignored_or_read_receipt' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const senderPhone = message.from; // ej: '573109998877'
      const incomingText = message.text?.body || '';
      const messageId = message.id;

      console.log(`Mensaje entrante de ${senderPhone}: "${incomingText}"`);

      if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(JSON.stringify({ error: 'Supabase credentials missing' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // 3. Resolver auto-respuesta mediante función PostgreSQL en Supabase
      const { data: resolverResult, error: resolverErr } = await supabase.rpc('fn_resolver_auto_respuesta_whatsapp', {
        p_mensaje: incomingText,
        p_telefono_remitente: senderPhone,
      });

      if (resolverErr) {
        console.warn('Error resolviendo auto-respuesta en base de datos:', resolverErr);
      }

      if (resolverResult && resolverResult.match && resolverResult.response) {
        const replyText = resolverResult.response;

        // 4. Despachar respuesta automática vía Meta WhatsApp Business Cloud API
        if (waToken && waPhoneId) {
          const endpoint = `https://graph.facebook.com/v18.0/${waPhoneId}/messages`;
          const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: senderPhone,
            type: 'text',
            text: {
              preview_url: false,
              body: replyText,
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
          console.log(`Respuesta enviada a ${senderPhone}:`, resData);
        } else {
          console.log(`[SIMULACIÓN AUTO-RESPUESTA] Para ${senderPhone}: "${replyText}"`);
        }

        // 5. Registrar log de la interacción
        await supabase.from('whatsapp_notification_logs').insert({
          destinatario_telefono: senderPhone,
          destinatario_nombre: 'Cliente WhatsApp',
          tipo: 'auto_respuesta_bot',
          contenido: replyText,
          estado: waToken && waPhoneId ? 'sent' : 'simulated_sent',
          id_externo: messageId,
          enviado_at: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({ status: 'processed', match: Boolean(resolverResult?.match) }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('Error procesando webhook de WhatsApp:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
});
