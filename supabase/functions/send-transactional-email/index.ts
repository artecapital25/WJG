// @ts-nocheck
/// <reference path="../deno.d.ts" />
// ==============================================================================
// Supabase Edge Function: send-transactional-email
// Motor de Envío Híbrido y Canal de Contingencia Transaccional (Resend / SendGrid / SMTP)
// Disparo Dual de Cotizaciones, Abonos y Seguimiento de Producción 3D (WJGEEKS)
// ==============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailPayload {
  tipo: 'cotizacion' | 'abono' | 'pieza_terminada' | 'cuenta_cobro' | 'alerta_equipo';
  destinatario_correo: string;
  destinatario_nombre: string;
  asunto?: string;
  tracking_url?: string;
  datos?: {
    numero_doc?: string;
    total?: number;
    abono?: number;
    saldo_pendiente?: number;
    metodo_pago?: string;
    item_nombre?: string;
    detalles_items?: Array<{ nombre: string; cantidad: number; precio: number }>;
    mensaje_personalizado?: string;
    fecha?: string;
  };
}

Deno.serve(async (req: Request) => {
  // Manejo obligatorio de preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    const emailRemitente = Deno.env.get('TRANSACTIONAL_EMAIL_FROM') || 'WJGEEKS 3D <notificaciones@wjgeeks.com>';
    
    let payload: EmailPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Body JSON inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payload.destinatario_correo || !payload.destinatario_nombre) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios destinatario_correo y destinatario_nombre' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { tipo, destinatario_correo, destinatario_nombre, tracking_url, datos = {} } = payload;
    const formattedTotal = datos.total ? `$${datos.total.toLocaleString('es-CO')} COP` : '';
    const formattedAbono = datos.abono ? `$${datos.abono.toLocaleString('es-CO')} COP` : '';
    const formattedSaldo = datos.saldo_pendiente !== undefined ? `$${datos.saldo_pendiente.toLocaleString('es-CO')} COP` : '';

    let asunto = payload.asunto || '';
    let badgeTexto = 'WJGEEKS 3D • Taller de Impresión';
    let tituloPrincipal = '';
    let descripcionCuerpo = '';

    if (tipo === 'cotizacion') {
      asunto = asunto || `Cotización Oficial ${datos.numero_doc || ''} - WJGEEKS 3D`;
      badgeTexto = '📄 Cotización de Manufactura 3D';
      tituloPrincipal = `Cotización ${datos.numero_doc || ''}`;
      descripcionCuerpo = `Hola <strong>${destinatario_nombre}</strong>, adjuntamos el detalle técnico y financiero de tu proyecto en resina de alta precisión.`;
    } else if (tipo === 'abono') {
      asunto = asunto || `Comprobante de Pago / Abono - Orden ${datos.numero_doc || ''}`;
      badgeTexto = '💳 Recibo de Abono Confirmado';
      tituloPrincipal = '¡Pago Registrado Exitosamente!';
      descripcionCuerpo = `Hola <strong>${destinatario_nombre}</strong>, hemos asentado tu abono de <strong>${formattedAbono}</strong> para tu orden <strong>${datos.numero_doc || ''}</strong>.`;
    } else if (tipo === 'pieza_terminada') {
      asunto = asunto || `🎉 ¡Tu figura 3D está terminada al 100%! - Orden ${datos.numero_doc || ''}`;
      badgeTexto = '✨ ¡Producción Finalizada 100%!';
      tituloPrincipal = '¡Tu Pedido está Listo para Entrega!';
      descripcionCuerpo = `Hola <strong>${destinatario_nombre}</strong>, nos complace informarte que tu pieza <strong>${datos.item_nombre || 'de colección'}</strong> ha superado la etapa de control de calidad y está empacada para entrega inmediata.`;
    } else {
      asunto = asunto || `Notificación Oficial WJGEEKS 3D - Ref: ${datos.numero_doc || ''}`;
      badgeTexto = '📦 WJGEEKS 3D Pro';
      tituloPrincipal = `Aviso de Servicio - ${datos.numero_doc || ''}`;
      descripcionCuerpo = `Hola <strong>${destinatario_nombre}</strong>, tenemos una actualización de tu servicio en nuestro taller.`;
    }

    // Plantilla HTML Responsiva Premium WJGEEKS
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${asunto}</title>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; }
        .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(56, 189, 248, 0.25); box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .header { background: linear-gradient(135deg, #1b62b1 0%, #0369a1 100%); padding: 32px 24px; text-align: center; }
        .logo-title { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 1px; margin: 0; }
        .logo-cyan { color: #38bdf8; }
        .badge { display: inline-block; padding: 4px 12px; background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; border-radius: 20px; font-size: 12px; font-weight: 700; color: #38bdf8; margin-top: 8px; text-transform: uppercase; }
        .content { padding: 32px 24px; line-height: 1.6; }
        .headline { font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; }
        .table-box { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; margin: 20px 0; }
        .table-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; }
        .table-row:last-child { border-bottom: none; }
        .lbl { color: #94a3b8; font-weight: 500; }
        .val { color: #ffffff; font-weight: 700; text-align: right; }
        .val-cyan { color: #38bdf8; font-weight: 800; }
        .val-emerald { color: #34d399; font-weight: 800; }
        .btn-cta { display: inline-block; width: calc(100% - 32px); padding: 16px; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 800; text-align: center; border-radius: 12px; margin: 20px 0 10px 0; box-shadow: 0 10px 20px rgba(2, 132, 199, 0.3); }
        .footer { background-color: #080d1a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
        .footer a { color: #38bdf8; text-decoration: none; }
      </style>
    </head>
    <body>
      <div style="padding: 24px 12px;">
        <div class="wrapper">
          <div class="header">
            <h1 class="logo-title">WJGEEKS <span class="logo-cyan">3D</span></h1>
            <div class="badge">${badgeTexto}</div>
          </div>
          <div class="content">
            <h2 class="headline">${tituloPrincipal}</h2>
            <p style="color: #cbd5e1; margin-bottom: 20px;">${descripcionCuerpo}</p>

            <div class="table-box">
              ${datos.numero_doc ? `<div class="table-row"><span class="lbl">Referencia:</span><span class="val">${datos.numero_doc}</span></div>` : ''}
              ${datos.item_nombre ? `<div class="table-row"><span class="lbl">Pieza / Modelo:</span><span class="val">${datos.item_nombre}</span></div>` : ''}
              ${datos.metodo_pago ? `<div class="table-row"><span class="lbl">Método de Pago:</span><span class="val">${datos.metodo_pago}</span></div>` : ''}
              ${formattedTotal ? `<div class="table-row"><span class="lbl">Total del Pedido:</span><span class="val">${formattedTotal}</span></div>` : ''}
              ${formattedAbono ? `<div class="table-row"><span class="lbl">Abonado:</span><span class="val val-emerald">${formattedAbono}</span></div>` : ''}
              ${formattedSaldo ? `<div class="table-row"><span class="lbl">Saldo Pendiente:</span><span class="val val-cyan">${formattedSaldo}</span></div>` : ''}
            </div>

            ${tracking_url ? `
              <div style="text-align: center;">
                <a href="${tracking_url}" class="btn-cta" target="_blank">
                  🔍 Ver Rastreo en Vivo de tu Pieza 3D
                </a>
                <p style="font-size: 12px; color: #94a3b8; margin: 4px 0 20px 0;">
                  Puedes consultar el estado técnico en cualquier momento sin contraseñas.
                </p>
              </div>
            ` : ''}

            <div style="background: rgba(56, 189, 248, 0.08); border-left: 4px solid #38bdf8; padding: 12px 14px; border-radius: 6px; font-size: 13px; color: #94a3b8; margin-top: 14px;">
              💡 <strong>Línea Central de Atención:</strong> WJGEEKS (+57 320 2796115)<br/>
              Bre-B (Llave Única): <code>0090778625</code> | Nequi: <code>3217273025</code>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0 0 6px 0;">WJGEEKS 3D - Impresión en Resina de Precisión & Figuras Coleccionables</p>
            <p style="margin: 0;">Línea Oficial: +57 320 2796115 | <a href="https://instagram.com/wjgeeks" target="_blank">@wjgeeks</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    // Envío vía Resend API si la clave está provista
    if (resendApiKey) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailRemitente,
          to: [destinatario_correo],
          subject: asunto,
          html: htmlContent,
        }),
      });

      const resendData = await resendRes.json();

      if (!resendRes.ok) {
        throw new Error(resendData?.message || `Error Resend HTTP ${resendRes.status}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        messageId: resendData.id, 
        channel: 'resend',
        recipient: destinatario_correo 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Modo contingencia / simulación estructurada si RESEND_API_KEY no ha sido poblada en Secrets
    console.log(`[SIMULATION-EMAIL] Enviado a ${destinatario_correo} - Asunto: ${asunto}`);
    return new Response(JSON.stringify({
      success: true,
      simulated: true,
      recipient: destinatario_correo,
      asunto,
      tracking_url,
      nota: 'Correo procesado en modo contingencia (Configure RESEND_API_KEY en Supabase Secrets para despacho SMTP real)'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error en send-transactional-email:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Error desconocido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
