// @ts-nocheck
/// <reference path="../deno.d.ts" />
// ==============================================================================
// Supabase Edge Function: send-transactional-email
// Motor Verificado de Correo Transaccional (Resend API + Google Apps Script S2S)
// WJGEEKS 3D PRO — Cero falsos positivos
// ==============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzEUGjnaQoMVZ5OtdY-QJldULcF_NYqxsda9y5nR72kf7kaQNIsp6AQbb5Z_Fop2syAJQ/exec';

export type EmailTipo =
  | 'tarea_asignada'
  | 'tarea_actualizada'
  | 'tarea_avance'
  | 'tarea_completada'
  | 'sos_insumo'
  | 'stock_bajo'
  | 'prueba_conexion'
  | 'cotizacion'
  | 'abono'
  | 'pieza_terminada'
  | 'cuenta_cobro'
  | 'alerta_equipo';

interface EmailRecipient {
  correo: string;
  nombre?: string;
}

interface EmailPayload {
  tipo: EmailTipo;
  destinatario_correo?: string;
  destinatario_nombre?: string;
  destinatarios?: EmailRecipient[];
  asunto?: string;
  tracking_url?: string;
  texto_plano?: string;
  html_custom?: string;
  apps_script_url?: string;
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
    titulo?: string;
    descripcion?: string;
    asignado_a?: string;
    prioridad?: string;
    tipo_tarea?: string;
    fecha_limite?: string;
    progreso?: number;
    autor_avance?: string;
    urgencia?: string;
    cantidad?: number;
    unidad?: string;
    enlace_compra?: string;
  };
}

function escapeHtml(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtmlEmail(payload: EmailPayload, nombreSaludo: string): { asunto: string; html: string; plain: string } {
  const { tipo, tracking_url, datos = {} } = payload;
  const formattedTotal = datos.total ? `$${Number(datos.total).toLocaleString('es-CO')} COP` : '';
  const formattedAbono = datos.abono ? `$${Number(datos.abono).toLocaleString('es-CO')} COP` : '';
  const formattedSaldo = datos.saldo_pendiente !== undefined ? `$${Number(datos.saldo_pendiente).toLocaleString('es-CO')} COP` : '';

  let asunto = payload.asunto || '';
  let badgeTexto = 'WJGEEKS 3D PRO';
  let tituloPrincipal = '';
  let descripcionCuerpo = '';
  let ctaLabel = '🔍 Abrir Panel WJGEEKS 3D PRO';

  if (tipo === 'tarea_asignada') {
    asunto = asunto || `📋 Nueva Tarea: ${datos.titulo || datos.numero_doc || 'Equipo WJGEEKS'}`;
    badgeTexto = '📋 Nueva Tarea Asignada';
    tituloPrincipal = datos.titulo || 'Nueva tarea asignada en el taller';
    descripcionCuerpo = `Hola <strong>${escapeHtml(nombreSaludo)}</strong>, se registró una nueva tarea asignada a <strong>${escapeHtml(datos.asignado_a || nombreSaludo)}</strong>.`;
    ctaLabel = '📋 Ver en Tablero de Tareas';
  } else if (tipo === 'tarea_actualizada') {
    asunto = asunto || `✏️ Tarea Actualizada: ${datos.titulo || 'Equipo WJGEEKS'}`;
    badgeTexto = '✏️ Tarea Actualizada';
    tituloPrincipal = datos.titulo || 'Actualización de tarea';
    descripcionCuerpo = `Hola <strong>${escapeHtml(nombreSaludo)}</strong>, la tarea asignada a <strong>${escapeHtml(datos.asignado_a || nombreSaludo)}</strong> fue modificada.`;
    ctaLabel = '📋 Revisar Tarea Actualizada';
  } else if (tipo === 'tarea_avance') {
    asunto = asunto || `📈 Avance (${datos.progreso ?? 0}%): ${datos.titulo || 'Tarea WJGEEKS'}`;
    badgeTexto = `📈 Bitácora • ${datos.progreso ?? 0}%`;
    tituloPrincipal = `Nuevo avance en: ${datos.titulo || 'Tarea'}`;
    descripcionCuerpo = `<strong>${escapeHtml(datos.autor_avance || 'Equipo')}</strong> registró un nuevo avance en la bitácora del taller.`;
    ctaLabel = '📈 Abrir Bitácora de Tarea';
  } else if (tipo === 'tarea_completada') {
    asunto = asunto || `✅ Tarea Completada: ${datos.titulo || 'Equipo WJGEEKS'}`;
    badgeTexto = '✅ Tarea Completada';
    tituloPrincipal = datos.titulo || 'Tarea completada';
    descripcionCuerpo = `Hola <strong>${escapeHtml(nombreSaludo)}</strong>, esta tarea fue marcada como completada en WJGEEKS 3D PRO.`;
    ctaLabel = '✅ Ver en Tablero';
  } else if (tipo === 'sos_insumo') {
    asunto = asunto || `🚨 S.O.S Insumo: ${datos.item_nombre || datos.titulo || 'Material requerido'}`;
    badgeTexto = '🚨 S.O.S Bodega & Compras';
    tituloPrincipal = `Solicitud de Insumo: ${datos.item_nombre || datos.titulo || ''}`;
    descripcionCuerpo = `Hola <strong>${escapeHtml(nombreSaludo)}</strong>, se requiere gestionar la compra de un insumo o material para mantener la producción al día.`;
    ctaLabel = '🛒 Gestionar Orden de Insumo';
  } else if (tipo === 'stock_bajo') {
    asunto = asunto || `⚠️ Alerta Stock Bajo en Bodega — WJGEEKS 3D`;
    badgeTexto = '⚠️ Alerta Automática de Bodega';
    tituloPrincipal = datos.titulo || 'Materiales por debajo del stock mínimo';
    descripcionCuerpo = `Hola <strong>${escapeHtml(nombreSaludo)}</strong>, el sistema detectó materiales o insumos por debajo del mínimo operativo tras el consumo en taller.`;
    ctaLabel = '📦 Revisar Reposición en S.O.S';
  } else if (tipo === 'prueba_conexion') {
    asunto = asunto || `🧪 Verificación Real de Correo WJGEEKS 3D (wjgeeks3d@gmail.com)`;
    badgeTexto = '🧪 Prueba de Canal Oficial';
    tituloPrincipal = 'Canal de Correo Verificado';
    descripcionCuerpo = `Hola <strong>${escapeHtml(nombreSaludo)}</strong>, este mensaje confirma el envío real y verificado desde la plataforma WJGEEKS 3D PRO.`;
  } else if (tipo === 'cotizacion') {
    asunto = asunto || `Cotización Oficial ${datos.numero_doc || ''} - WJGEEKS 3D`;
    badgeTexto = '📄 Cotización de Manufactura 3D';
    tituloPrincipal = `Cotización ${datos.numero_doc || ''}`;
    descripcionCuerpo = `Hola <strong>${escapeHtml(nombreSaludo)}</strong>, adjuntamos el detalle técnico y financiero de tu proyecto en resina o impresión 3D.`;
    ctaLabel = '🔍 Ver Rastreo en Vivo de tu Pieza 3D';
  } else if (tipo === 'abono') {
    asunto = asunto || `Comprobante de Pago / Abono - Orden ${datos.numero_doc || ''}`;
    badgeTexto = '💳 Recibo de Abono Confirmado';
    tituloPrincipal = '¡Pago Registrado Exitosamente!';
    descripcionCuerpo = `Hola <strong>${escapeHtml(nombreSaludo)}</strong>, hemos asentado tu abono de <strong>${formattedAbono}</strong> para tu orden <strong>${escapeHtml(datos.numero_doc || '')}</strong>.`;
    ctaLabel = '🔍 Ver Estado de tu Pedido';
  } else if (tipo === 'pieza_terminada') {
    asunto = asunto || `🎉 ¡Tu figura 3D está terminada al 100%! - Orden ${datos.numero_doc || ''}`;
    badgeTexto = '✨ ¡Producción Finalizada 100%!';
    tituloPrincipal = '¡Tu Pedido está Listo para Entrega!';
    descripcionCuerpo = `Hola <strong>${escapeHtml(nombreSaludo)}</strong>, tu pieza <strong>${escapeHtml(datos.item_nombre || 'de colección')}</strong> superó control de calidad y está lista para despacho.`;
    ctaLabel = '🔍 Ver Detalle de Entrega';
  } else {
    asunto = asunto || `Notificación Oficial WJGEEKS 3D - Ref: ${datos.numero_doc || ''}`;
    badgeTexto = '📦 WJGEEKS 3D Pro';
    tituloPrincipal = datos.titulo || `Aviso de Servicio - ${datos.numero_doc || ''}`;
    descripcionCuerpo = `Hola <strong>${escapeHtml(nombreSaludo)}</strong>, tienes una nueva notificación operativa desde WJGEEKS 3D PRO.`;
  }

  const rowsHtml: string[] = [];
  if (datos.numero_doc) rowsHtml.push(`<div class="table-row"><span class="lbl">Referencia:</span><span class="val">${escapeHtml(datos.numero_doc)}</span></div>`);
  if (datos.asignado_a) rowsHtml.push(`<div class="table-row"><span class="lbl">Responsable:</span><span class="val val-cyan">${escapeHtml(datos.asignado_a)}</span></div>`);
  if (datos.prioridad) rowsHtml.push(`<div class="table-row"><span class="lbl">Prioridad:</span><span class="val">${escapeHtml(String(datos.prioridad).toUpperCase())}</span></div>`);
  if (datos.urgencia) rowsHtml.push(`<div class="table-row"><span class="lbl">Urgencia:</span><span class="val">${escapeHtml(String(datos.urgencia).toUpperCase())}</span></div>`);
  if (datos.tipo_tarea) rowsHtml.push(`<div class="table-row"><span class="lbl">Tipo:</span><span class="val">${escapeHtml(datos.tipo_tarea)}</span></div>`);
  if (datos.fecha_limite) rowsHtml.push(`<div class="table-row"><span class="lbl">Fecha Límite:</span><span class="val">${escapeHtml(datos.fecha_limite)}</span></div>`);
  if (typeof datos.progreso === 'number') rowsHtml.push(`<div class="table-row"><span class="lbl">Progreso:</span><span class="val val-emerald">${datos.progreso}%</span></div>`);
  if (datos.item_nombre) rowsHtml.push(`<div class="table-row"><span class="lbl">Pieza / Material:</span><span class="val">${escapeHtml(datos.item_nombre)}</span></div>`);
  if (datos.cantidad) rowsHtml.push(`<div class="table-row"><span class="lbl">Cantidad:</span><span class="val">${escapeHtml(datos.cantidad)} ${escapeHtml(datos.unidad || 'und')}</span></div>`);
  if (datos.metodo_pago) rowsHtml.push(`<div class="table-row"><span class="lbl">Método de Pago:</span><span class="val">${escapeHtml(datos.metodo_pago)}</span></div>`);
  if (formattedTotal) rowsHtml.push(`<div class="table-row"><span class="lbl">Total:</span><span class="val">${formattedTotal}</span></div>`);
  if (formattedAbono) rowsHtml.push(`<div class="table-row"><span class="lbl">Abonado:</span><span class="val val-emerald">${formattedAbono}</span></div>`);
  if (formattedSaldo) rowsHtml.push(`<div class="table-row"><span class="lbl">Saldo Pendiente:</span><span class="val val-cyan">${formattedSaldo}</span></div>`);
  if (datos.fecha) rowsHtml.push(`<div class="table-row"><span class="lbl">Fecha:</span><span class="val">${escapeHtml(datos.fecha)}</span></div>`);

  const detailText = datos.mensaje_personalizado || datos.descripcion || '';
  const detailBlock = detailText
    ? `<div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px; margin: 16px 0; color: #e2e8f0; font-size: 14px; white-space: pre-wrap;">${escapeHtml(detailText)}</div>`
    : '';

  const linkCompraBlock = datos.enlace_compra
    ? `<p style="font-size: 13px; color: #cbd5e1; margin: 10px 0;">🔗 <strong>Enlace de compra:</strong> <a href="${escapeHtml(datos.enlace_compra)}" style="color: #38bdf8;">${escapeHtml(datos.enlace_compra)}</a></p>`
    : '';

  const html = payload.html_custom || `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(asunto)}</title>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070a10; color: #f1f5f9; }
        .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #0d131f; border-radius: 16px; overflow: hidden; border: 1px solid rgba(56, 189, 248, 0.25); }
        .header { background: linear-gradient(135deg, #1b62b1 0%, #0369a1 100%); padding: 28px 24px; text-align: center; }
        .logo-title { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 1px; margin: 0; }
        .logo-cyan { color: #38bdf8; }
        .badge { display: inline-block; padding: 4px 12px; background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; border-radius: 20px; font-size: 12px; font-weight: 700; color: #38bdf8; margin-top: 8px; text-transform: uppercase; }
        .content { padding: 28px 24px; line-height: 1.6; }
        .headline { font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; }
        .table-box { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 16px; margin: 18px 0; }
        .table-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; gap: 12px; }
        .table-row:last-child { border-bottom: none; }
        .lbl { color: #94a3b8; font-weight: 500; }
        .val { color: #ffffff; font-weight: 700; text-align: right; }
        .val-cyan { color: #38bdf8; font-weight: 800; }
        .val-emerald { color: #34d399; font-weight: 800; }
        .btn-cta { display: inline-block; width: calc(100% - 32px); padding: 14px 16px; background: linear-gradient(135deg, #1b62b1 0%, #2577d0 100%); color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 800; text-align: center; border-radius: 12px; margin: 16px 0 8px 0; }
        .footer { background-color: #080d1a; padding: 18px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
        .footer a { color: #38bdf8; text-decoration: none; }
      </style>
    </head>
    <body>
      <div style="padding: 20px 10px;">
        <div class="wrapper">
          <div class="header">
            <h1 class="logo-title">WJGEEKS <span class="logo-cyan">3D</span></h1>
            <div class="badge">${escapeHtml(badgeTexto)}</div>
          </div>
          <div class="content">
            <h2 class="headline">${escapeHtml(tituloPrincipal)}</h2>
            <p style="color: #cbd5e1; margin-bottom: 16px;">${descripcionCuerpo}</p>
            ${rowsHtml.length > 0 ? `<div class="table-box">${rowsHtml.join('')}</div>` : ''}
            ${detailBlock}
            ${linkCompraBlock}
            ${tracking_url ? `
              <div style="text-align: center;">
                <a href="${escapeHtml(tracking_url)}" class="btn-cta" target="_blank">${escapeHtml(ctaLabel)}</a>
              </div>
            ` : ''}
            <div style="background: rgba(56, 189, 248, 0.08); border-left: 4px solid #38bdf8; padding: 12px 14px; border-radius: 6px; font-size: 13px; color: #94a3b8; margin-top: 14px;">
              💡 <strong>Línea Oficial WJGEEKS 3D:</strong> +57 320 2796115 • Correo: wjgeeks3d@gmail.com
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0 0 6px 0;">WJGEEKS 3D PRO — Manufactura Aditiva, Resina 8K &amp; Acabados</p>
            <p style="margin: 0;">Línea Oficial: +57 320 2796115 | <a href="https://instagram.com/wjgeeks3d" target="_blank">@WJGEEKS3D</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const plain =
    payload.texto_plano ||
    `${asunto}\n\n${tituloPrincipal}\n${detailText ? `${detailText}\n` : ''}${tracking_url ? `\nEnlace: ${tracking_url}` : ''}`;

  return { asunto, html, plain };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const resendApiKey = (Deno.env.get('RESEND_API_KEY') || '').trim();
    const customFrom = (Deno.env.get('TRANSACTIONAL_EMAIL_FROM') || '').trim();
    const emailRemitente = customFrom || 'WJGEEKS 3D <notificaciones@wjgeeks.com>';
    const preferResend = Boolean(
      resendApiKey &&
      customFrom &&
      !customFrom.toLowerCase().includes('@gmail.com') &&
      !customFrom.toLowerCase().includes('onboarding@resend.dev')
    );

    let payload: EmailPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, verified: false, error: 'Body JSON inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recipients: EmailRecipient[] = [];
    if (Array.isArray(payload.destinatarios) && payload.destinatarios.length > 0) {
      for (const r of payload.destinatarios) {
        if (r?.correo && String(r.correo).includes('@')) {
          recipients.push({ correo: String(r.correo).trim(), nombre: r.nombre });
        }
      }
    } else if (payload.destinatario_correo && String(payload.destinatario_correo).includes('@')) {
      recipients.push({
        correo: String(payload.destinatario_correo).trim(),
        nombre: payload.destinatario_nombre,
      });
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, verified: false, error: 'No se proporcionó ningún correo de destinatario válido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nombreSaludo =
      recipients.length === 1
        ? recipients[0].nombre || payload.destinatario_nombre || 'Equipo WJGEEKS'
        : recipients.map(r => r.nombre).filter(Boolean).join(', ') || 'Equipo WJGEEKS';

    const { asunto, html, plain } = buildHtmlEmail(payload, nombreSaludo);
    const toEmails = recipients.map(r => r.correo);

    // 1. Proveedor prioritario: Resend API solo si hay un dominio propio verificado en TRANSACTIONAL_EMAIL_FROM
    let resendFallbackNote = '';
    if (preferResend) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: emailRemitente,
            to: toEmails,
            subject: asunto,
            html,
            text: plain,
          }),
        });

        const resendData = await resendRes.json().catch(() => ({}));
        if (resendRes.ok) {
          return new Response(
            JSON.stringify({
              success: true,
              verified: true,
              provider: 'resend',
              messageId: resendData?.id,
              recipients: toEmails,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        resendFallbackNote = `Resend rechazó el envío (HTTP ${resendRes.status}: ${resendData?.message || 'dominio no verificado'}); se intentó respaldo por Apps Script.`;
      } catch (resendErr: any) {
        resendFallbackNote = `Error conectando con Resend (${resendErr?.message || 'red'}); se intentó respaldo por Apps Script.`;
      }
    }

    // 2. Proveedor Google Apps Script Server-to-Server (canal oficial wjgeeks3d@gmail.com)
    const appsScriptUrl = (
      payload.apps_script_url ||
      Deno.env.get('GOOGLE_APPS_SCRIPT_URL') ||
      DEFAULT_APPS_SCRIPT_URL
    ).trim();

    if (!appsScriptUrl || !appsScriptUrl.startsWith('https://script.google.com/')) {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          provider: 'none',
          error: 'No hay RESEND_API_KEY ni URL válida de Google Apps Script configurada.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gasRes = await fetch(appsScriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'send_email',
        to: toEmails.join(','),
        destinatario_correo: toEmails.join(','),
        destinatario_nombre: nombreSaludo,
        subject: asunto,
        asunto,
        htmlBody: html,
        plainBody: plain,
        remitente: 'wjgeeks3d@gmail.com',
        tipo: payload.tipo,
        datos: payload.datos || {},
      }),
    });

    const rawText = await gasRes.text();
    let gasJson: any = null;
    try {
      gasJson = JSON.parse(rawText);
    } catch {
      gasJson = null;
    }

    const esSyncDeHojas =
      typeof gasJson?.message === 'string' &&
      gasJson.message.toLowerCase().includes('base de datos sincronizada');

    const envioConfirmado = Boolean(
      gasRes.ok &&
      gasJson &&
      !esSyncDeHojas &&
      (gasJson.success === true || gasJson.status === 'sent' || gasJson.emailSent === true)
    );

    if (envioConfirmado) {
      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          provider: 'google_apps_script',
          messageId: gasJson?.messageId || `gas-${Date.now()}`,
          recipients: toEmails,
          detail: gasJson?.message || 'Correo enviado desde wjgeeks3d@gmail.com',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const errorDetalle = esSyncDeHojas
      ? 'El Google Apps Script publicado aún tiene una versión antigua sin el handler "send_email". Actualiza el código desde Drive & Respaldos > Obtener Código Apps Script e implementa una Nueva versión.'
      : gasJson?.message ||
        gasJson?.error ||
        (rawText.includes('<html') || rawText.includes('<!DOCTYPE')
          ? 'Google Apps Script devolvió HTML en lugar de JSON (verifica permisos "Cualquiera" y publica una Nueva versión con send_email).'
          : `Respuesta inesperada de Google Apps Script (HTTP ${gasRes.status}).`);

    return new Response(
      JSON.stringify({
        success: false,
        verified: false,
        provider: 'google_apps_script',
        needsAppsScriptUpdate: true,
        recipients: toEmails,
        error: resendFallbackNote ? `${errorDetalle} (${resendFallbackNote})` : errorDetalle,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        verified: false,
        error: error?.message || 'Error interno en send-transactional-email',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
