// @ts-nocheck
/// <reference path="../deno.d.ts" />
// ==============================================================================
// Supabase Edge Function: dispatch-whatsapp
// Motor de Despacho Desacoplado Asíncrono de Notificaciones WhatsApp (Meta Cloud API)
// Proveedor: WhatsApp Business Cloud API (Graph API v19.0+) + Fallback fail-safe
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationItem {
  id: string;
  destinatario_telefono: string;
  destinatario_nombre: string;
  rol_destinatario: string;
  canal: string;
  plantilla_hsm?: string;
  variables_plantilla?: Record<string, string>;
  mensaje_plano: string;
  intentos: number;
}

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
      return new Response(JSON.stringify({ error: 'Faltan credenciales de Supabase' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Si la llamada trae un item específico en el body (desde pg_net)
    let bodyData: any = null;
    try {
      bodyData = await req.json();
    } catch {
      bodyData = null;
    }

    let itemsToProcess: NotificationItem[] = [];

    if (bodyData && bodyData.notificacion_id) {
      const { data: singleItem, error: singleErr } = await supabase
        .from('registro_notificaciones')
        .select('*')
        .eq('id', bodyData.notificacion_id)
        .single();

      if (!singleErr && singleItem) {
        itemsToProcess.push(singleItem);
      }
    } else {
      // Leer los primeros 25 pendientes de la cola
      const { data: queue, error: queueErr } = await supabase
        .from('registro_notificaciones')
        .select('*')
        .eq('estado', 'PENDIENTE')
        .lt('intentos', 3)
        .order('created_at', { ascending: true })
        .limit(25);

      if (!queueErr && queue) {
        itemsToProcess = queue;
      }
    }

    const resultados: any[] = [];

    for (const item of itemsToProcess) {
      // Limpiar y formatear a formato E.164 Colombia
      let phone = (item.destinatario_telefono || '').replace(/\D/g, '');
      if (phone.length === 10 && phone.startsWith('3')) {
        phone = `57${phone}`;
      }

      // Preparar URL de contingencia móvil por si falla el envío
      const fallbackUrl = `https://wa.me/${phone}?text=${encodeURIComponent(item.mensaje_plano)}`;

      try {
        if (waToken && waPhoneId) {
          const endpoint = `https://graph.facebook.com/v19.0/${waPhoneId}/messages`;
          let payload: any;

          // Regla Meta 24h: Clientes externos usan plantilla preaprobada; personal interno usa texto directo
          if (item.rol_destinatario === 'CLIENTE' && item.plantilla_hsm) {
            payload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: phone,
              type: 'template',
              template: {
                name: item.plantilla_hsm,
                language: { code: 'es' },
                components: item.variables_plantilla ? [
                  {
                    type: 'body',
                    parameters: Object.values(item.variables_plantilla).map(val => ({
                      type: 'text',
                      text: String(val)
                    }))
                  }
                ] : []
              }
            };
          } else {
            // Personal interno (Juan, Wendy, Germán)
            payload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: phone,
              type: 'text',
              text: {
                preview_url: false,
                body: item.mensaje_plano
              }
            };
          }

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
              .from('registro_notificaciones')
              .update({
                estado: 'ENVIADO',
                id_externo_meta: resData.messages[0].id,
                enviado_at: new Date().toISOString(),
                ultimo_error: null,
              })
              .eq('id', item.id);

            resultados.push({ id: item.id, status: 'ENVIADO', external_id: resData.messages[0].id });
          } else {
            throw new Error(resData?.error?.message || `Error HTTP ${response.status}`);
          }
        } else {
          // Modo simulado / local si las variables de Meta aún no se configuran en Supabase
          await supabase
            .from('registro_notificaciones')
            .update({
              estado: 'ENVIADO',
              id_externo_meta: `sim-${Date.now()}`,
              enviado_at: new Date().toISOString(),
              ultimo_error: 'Modo simulación (Variables de Meta Cloud API pendientes en Supabase Secrets)',
            })
            .eq('id', item.id);

          resultados.push({ id: item.id, status: 'ENVIADO_SIMULADO', fallback_url: fallbackUrl });
        }
      } catch (err: any) {
        const nuevosIntentos = (item.intentos || 0) + 1;
        const estadoFinal = nuevosIntentos >= 3 ? 'FALLIDO' : 'PENDIENTE';

        await supabase
          .from('registro_notificaciones')
          .update({
            estado: estadoFinal,
            intentos: nuevosIntentos,
            ultimo_error: err.message || 'Error en envío',
          })
          .eq('id', item.id);

        resultados.push({ 
          id: item.id, 
          status: estadoFinal, 
          error: err.message,
          fallback_url: fallbackUrl 
        });
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
