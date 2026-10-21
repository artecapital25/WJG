// ==============================================================================
// Supabase Edge Function: Envío Desatendido de OTP para Recuperación de Contraseña
// Mensajería: Meta WhatsApp Business Cloud API v18.0+
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
    const { phone, otp, userName } = await req.json();

    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros phone u otp' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const waToken = Deno.env.get('WHATSAPP_CLOUD_API_TOKEN') || '';
    const waPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '';

    // Sanitizar número (E.164: Colombia +57 si no tiene código de país)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
      cleanPhone = `57${cleanPhone}`;
    }

    const greeting = userName ? `Hola ${userName}, ` : '';
    const messageBody = `🔐 *WJGEEKS 3D - Código de Seguridad*\n\n${greeting}Tu código para restablecer tu contraseña es:\n\n👉 *${otp}*\n\n⏳ Vence en 10 minutos. Por tu seguridad, no compartas este código con nadie.`;

    // Si las credenciales de Meta están configuradas, despachar por Graph API
    let metaResponse = null;
    let deliveryStatus = 'simulated';

    if (waToken && waPhoneId) {
      const graphUrl = `https://graph.facebook.com/v18.0/${waPhoneId}/messages`;
      const res = await fetch(graphUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: messageBody,
          },
        }),
      });

      metaResponse = await res.json();
      deliveryStatus = res.ok ? 'sent' : 'failed';
    }

    // Registrar en logs de auditoría de Supabase si la clave de servicio está disponible
    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseAdmin.from('whatsapp_notification_logs').insert({
        tipo_alerta: 'otp_recuperacion_password',
        destinatario_telefono: cleanPhone,
        destinatario_nombre: userName || 'Personal',
        mensaje_texto: `OTP enviado para restablecimiento de contraseña`,
        estado_entrega: deliveryStatus,
        respuesta_proveedor: metaResponse || { note: 'Modo dev o despacho completado' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      status: deliveryStatus,
      cleanPhone 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
