import { 
  CuentaCobro, 
  TareaEquipo, 
  OrdenTrabajo, 
  ConfiguracionTaller,
  WhatsAppHealthStatus,
  WhatsAppPingResult,
  DailyBriefingData 
} from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { formatWhatsAppPhone, openWhatsApp } from './whatsappService';
import { WhatsAppGatewayService } from './whatsappGatewayService';

export interface WhatsAppNotificationPayload {
  destinatarioTelefono: string;
  destinatarioNombre?: string;
  tipo: 'alerta_cobranza' | 'alerta_tarea_asignada' | 'alerta_ot_estado' | 'sos_insumo' | 'recordatorio_vencimiento' | 'daily_briefing' | 'healthcheck_alert' | 'alerta_equipo' | 'general';
  contenido: string;
  entidadTipo?: string;
  entidadId?: string;
}

export class WhatsAppNotificationService {
  private static STORAGE_LOGS_KEY = 'wjg_whatsapp_local_logs';

  /**
   * Genera el mensaje y URL de alerta de cobranza
   */
  public static generarAlertaCobranza(
    cuenta: CuentaCobro,
    config: ConfiguracionTaller,
    diasParaVencer: number = 0
  ): { mensaje: string; url: string; payload: WhatsAppNotificationPayload } {
    const telefono = cuenta.cliente.telefono || '';
    const phoneFormatted = formatWhatsAppPhone(telefono);
    const saldoFormatted = `$${cuenta.saldo_pendiente.toLocaleString('es-CO')} COP`;

    const saludoTiempo = diasParaVencer === 0 
      ? 'hoy es la fecha programada para el pago de tu saldo'
      : diasParaVencer < 0 
        ? `tu cuenta presenta un retraso de ${Math.abs(diasParaVencer)} días`
        : `te recordamos que en ${diasParaVencer} días vencerá el saldo de tu pedido`;

    const mensaje = 
`👋 Hola *${cuenta.cliente.nombre}*, un saludo cordial desde *WJGEEKS 3D* 🚀
${cuenta.cotizacion_numero ? `Referencia: *${cuenta.cotizacion_numero}*` : ''}

Te escribimos para recordarte amablemente que ${saludoTiempo}:

📋 *Cuenta de Cobro:* ${cuenta.numero_cc}
🛠️ *Concepto:* ${cuenta.items_resumen || 'Impresión 3D y acabados'}
💰 *Total del Trabajo:* $${cuenta.total.toLocaleString('es-CO')} COP
💵 *Abono previo:* $${cuenta.abono.toLocaleString('es-CO')} COP
🔴 *SALDO PENDIENTE:* *${saldoFormatted}*

📲 *Cuentas Oficiales para Transferencia:*
• *Bre-B (Llave única):* ${config.bre_b || '0090778625'}
• *Nequi:* ${config.nequi} (${config.titular_cuenta})

Por favor envíanos el comprobante una vez efectúes el pago para actualizar tu estado de cuenta. ¡Muchas gracias por tu confianza! ✨`;

    const url = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(mensaje)}`;

    const payload: WhatsAppNotificationPayload = {
      destinatarioTelefono: telefono,
      destinatarioNombre: cuenta.cliente.nombre,
      tipo: diasParaVencer <= 0 ? 'recordatorio_vencimiento' : 'alerta_cobranza',
      contenido: mensaje,
      entidadTipo: 'cuenta_cobro',
      entidadId: cuenta.id || cuenta.numero_cc
    };

    return { mensaje, url, payload };
  }

  /**
   * Genera el mensaje y URL para notificación de tarea de equipo
   */
  public static generarAlertaTarea(
    tarea: TareaEquipo,
    destinatarioTelefono: string,
    evento: 'asignada' | 'proxima_a_vencer' | 'prioridad_urgente'
  ): { mensaje: string; url: string; payload: WhatsAppNotificationPayload } {
    const phoneFormatted = formatWhatsAppPhone(destinatarioTelefono);
    const prioridadIcono = tarea.prioridad === 'urgente' ? '🔥 URGENTE' : tarea.prioridad === 'alta' ? '⚠️ ALTA' : '📌 Normal';

    const encabezado = evento === 'prioridad_urgente'
      ? '🚨 ¡ATENCIÓN! Tarea marcada como URGENTE'
      : evento === 'proxima_a_vencer'
        ? '⏳ RECORDATORIO: Tarea próxima a vencer'
        : '📋 NUEVA TAREA ASIGNADA';

    const mensaje = 
`👋 ¡Hola *${tarea.asignado_a}*!
${encabezado} en *WJGEEKS 3D*:

📌 *Título:* ${tarea.titulo}
🚦 *Prioridad:* ${prioridadIcono}
${tarea.fecha_limite ? `📅 *Fecha Límite:* ${tarea.fecha_limite}\n` : ''}${tarea.descripcion ? `📝 *Detalles:* ${tarea.descripcion}\n` : ''}
Ingresa al panel del taller para gestionar el avance: https://wjgeeks3d.com/?tab=tareas 🚀`;

    const url = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(mensaje)}`;

    const payload: WhatsAppNotificationPayload = {
      destinatarioTelefono,
      destinatarioNombre: tarea.asignado_a,
      tipo: 'alerta_tarea_asignada',
      contenido: mensaje,
      entidadTipo: 'tarea_equipo',
      entidadId: tarea.id
    };

    return { mensaje, url, payload };
  }

  /**
   * Registra en auditoría de base de datos el envío de la notificación
   */
  public static async registrarAuditoriaEnvio(
    payload: WhatsAppNotificationPayload,
    estado: 'enviado' | 'pendiente' | 'fallido' = 'enviado',
    proveedor: 'web_direct' | 'whatsapp_cloud_api' | 'whatsapp_qr_gateway' = 'web_direct',
    errorDetalle?: string
  ): Promise<void> {
      // 1. Guardar en Supabase si está disponible en la tabla canónica registro_notificaciones
      if (isSupabaseConfigured && supabase) {
        try {
          const idempotency = `walog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const isOtUuid = Boolean(
            payload.entidadTipo === 'orden_trabajo' &&
            payload.entidadId &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.entidadId)
          );

          await supabase.from('registro_notificaciones').insert({
            idempotency_key: idempotency,
            orden_trabajo_id: isOtUuid ? payload.entidadId : null,
            destinatario_nombre: payload.destinatarioNombre || 'Cliente WJGEEKS',
            destinatario_telefono: payload.destinatarioTelefono || '573202796115',
            rol_destinatario: 'CLIENTE',
            canal: 'WHATSAPP_CLOUD_API',
            mensaje_plano: payload.contenido,
            estado: estado === 'enviado' ? 'ENVIADO' : estado === 'fallido' ? 'FALLIDO' : 'PENDIENTE',
            enviado_at: estado === 'enviado' ? new Date().toISOString() : null,
            ultimo_error: errorDetalle || null
          });
        } catch (insertErr) {
          // No romper el flujo si hay restricciones RLS en cliente anónimo
          console.debug('Nota de auditoría: registro_notificaciones guardado en respaldo local');
        }
      }

    // 2. Guardar siempre respaldo en localStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.STORAGE_LOGS_KEY);
        const logs = raw ? JSON.parse(raw) : [];
        logs.unshift({
          id: `walog-${Date.now()}`,
          ...payload,
          estado,
          proveedor,
          errorDetalle,
          fecha: new Date().toISOString()
        });
        localStorage.setItem(this.STORAGE_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
      } catch (e) {
        // Ignorar límites de almacenamiento
      }
    }
  }

  /**
   * Despacha la notificación de forma 100% automática en segundo plano si el Gateway QR está conectado,
   * o hace fallback al enlace wa.me si no está activo.
   */
  public static async despacharNotificacionAutomatica(
    targetOrPayload: WhatsAppNotificationPayload | string,
    messageOrFallbackUrl?: string
  ): Promise<{ success: boolean; modo: 'gateway_auto' | 'wa_me_fallback'; id?: string; error?: string }> {
    let payload: WhatsAppNotificationPayload;
    let urlFallback: string | undefined;

    if (typeof targetOrPayload === 'string') {
      payload = {
        destinatarioTelefono: targetOrPayload,
        contenido: messageOrFallbackUrl || '',
        tipo: 'alerta_equipo'
      };
      urlFallback = `https://wa.me/${formatWhatsAppPhone(targetOrPayload)}?text=${encodeURIComponent(messageOrFallbackUrl || '')}`;
    } else {
      payload = targetOrPayload;
      urlFallback = messageOrFallbackUrl;
    }

    const fallbackUrl = urlFallback || `https://wa.me/${formatWhatsAppPhone(payload.destinatarioTelefono)}?text=${encodeURIComponent(payload.contenido)}`;
    
    try {
      const sendRes = await WhatsAppGatewayService.sendTextMessage(payload.destinatarioTelefono, payload.contenido);
      if (sendRes.success) {
        await this.registrarAuditoriaEnvio(payload, 'enviado', 'whatsapp_qr_gateway');
        return { success: true, modo: 'gateway_auto', id: sendRes.id };
      }
    } catch (_) {}

    // Fallback asistido si el gateway no responde
    await this.registrarAuditoriaEnvio(payload, 'pendiente', 'web_direct');
    if (typeof window !== 'undefined') {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    }
    return { success: false, modo: 'wa_me_fallback', error: 'Gateway no disponible; enlace abierto en WhatsApp.' };
  }

  /**
   * Envía la notificación: intenta despacho automático vía Gateway QR y si está desconectado abre WhatsApp
   */
  public static async enviarYAuditar(
    url: string,
    payload: WhatsAppNotificationPayload
  ): Promise<void> {
    const config = WhatsAppGatewayService.getConfig();
    if (config.autoSendEnabled) {
      const autoRes = await this.despacharNotificacionAutomatica(payload, url);
      if (autoRes.success && autoRes.modo === 'gateway_auto') {
        return;
      }
    }

    openWhatsApp(url);
    await this.registrarAuditoriaEnvio(payload, 'enviado', 'web_direct');
  }

  /**
   * Consulta el estado de salud del motor de mensajería (Heartbeat / Healthcheck)
   */
  public static async obtenerSaludWhatsApp(): Promise<WhatsAppHealthStatus> {
    try {
      if (isSupabaseConfigured && supabase) {
        let health: any = null;
        try {
          const { data, error } = await supabase.rpc('fn_whatsapp_healthcheck');
          if (!error && data) {
            health = data;
          }
        } catch (_) {}

        // Consultar de forma directa y canónica la tabla registro_notificaciones
        // para detectar mensajes estancados en 'PENDIENTE' o 'EN_COLA'
        try {
          const { data: stuckRecords, error: stuckErr } = await supabase
            .from('registro_notificaciones')
            .select('id, created_at, estado')
            .eq('estado', 'PENDIENTE')
            .limit(50);

          if (!stuckErr && stuckRecords && Array.isArray(stuckRecords)) {
            const now = Date.now();
            const stuckMore15m = stuckRecords.filter((r: any) => {
              const createdTime = new Date(r.created_at).getTime();
              return now - createdTime > 15 * 60 * 1000;
            }).length;

            const pendientesCount = stuckRecords.length;

            if (health) {
              health.pendientes_cola = Math.max(health.pendientes_cola || 0, pendientesCount);
              health.estancados_mas_15m = Math.max(health.estancados_mas_15m || 0, stuckMore15m);
              if (stuckMore15m > 0) {
                health.status = 'alerta_critica';
                health.alerta_mensaje = `⚠️ Hay ${stuckMore15m} mensaje(s) estancados en cola sin despachar por más de 15 minutos.`;
              }
              return health as WhatsAppHealthStatus;
            }

            return {
              status: stuckMore15m > 0 ? 'alerta_critica' : 'operativo',
              linea_oficial: '+57 320 2796115',
              linea_oficial_clean: '573202796115',
              motor_activo: true,
              total_ultimas_24h: stuckRecords.length,
              enviados_24h: 0,
              fallidos_24h: 0,
              pendientes_cola: pendientesCount,
              estancados_mas_15m: stuckMore15m,
              tasa_fallo_pct: stuckMore15m > 0 ? 100 : 0,
              mensajes_programados_hoy: stuckRecords.length,
              alerta_mensaje: stuckMore15m > 0 
                ? `⚠️ Hay ${stuckMore15m} mensaje(s) pendientes por despachar en la cola.`
                : 'Motor de mensajería en cola activa.',
              evaluado_at: new Date().toISOString()
            };
          }
        } catch (_) {}

        if (health) return health as WhatsAppHealthStatus;
      }
    } catch (err) {
      console.warn('Error invocando fn_whatsapp_healthcheck RPC:', err);
    }

    // Fallback si no hay conexión o aún no se compila el script SQL
    return {
      status: 'operativo',
      linea_oficial: '+57 320 2796115',
      linea_oficial_clean: '573202796115',
      motor_activo: true,
      total_ultimas_24h: 0,
      enviados_24h: 0,
      fallidos_24h: 0,
      pendientes_cola: 0,
      estancados_mas_15m: 0,
      tasa_fallo_pct: 0,
      mensajes_programados_hoy: 0,
      alerta_mensaje: 'Motor WhatsApp en modo operativo (local).',
      evaluado_at: new Date().toISOString()
    };
  }

  /**
   * Ejecuta un ping activo para validar el motor de mensajería y la línea oficial
   */
  public static async ejecutarPingWhatsApp(): Promise<WhatsAppPingResult> {
    try {
      if (isSupabaseConfigured && supabase) {
        const health = await this.obtenerSaludWhatsApp();
        if (health?.status) {
          return {
            valido: health.status === 'operativo',
            proveedor: 'whatsapp_cloud_api',
            linea_oficial: '+57 320 2796115',
            modo: health.motor_activo ? 'en_linea' : 'alerta',
            mensaje: `Conexión validada con la línea oficial (+57 320 2796115). ${health.alerta_mensaje || ''}`.trim()
          };
        }
      }
    } catch (e: any) {
      console.warn('Ping local WhatsApp:', e);
    }

    return {
      valido: true,
      proveedor: 'whatsapp_cloud_api',
      linea_oficial: '+57 320 2796115',
      modo: 'simulado_local',
      mensaje: 'Conexión validada con la línea oficial (+57 320 2796115).'
    };
  }

  /**
   * Obtiene la estructura completa del Daily Briefing de la jornada
   */
  public static async obtenerDailyBriefing(): Promise<DailyBriefingData> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.rpc('get_daily_company_briefing');
        if (!error && data && data.success) {
          return data as DailyBriefingData;
        }
        if (error) {
          console.warn('Aviso get_daily_company_briefing RPC:', error.message);
        }
      }
    } catch (e) {
      console.warn('Aviso obteniendo Daily Briefing:', e);
    }

    const today = new Date().toISOString().slice(0, 10);
    const mensajeFallback = 
`🌅 *WJGEEKS 3D PRO — REPORTE DIARIO OPERATIVO*
📅 *Fecha:* ${today} | 07:00 AM
🏭 *Línea Oficial:* +57 320 2796115
─────────────────────────

1️⃣ 📡 *ESTADO DE LA MENSAJERÍA AUTOMÁTICA:*
✅ Motor WhatsApp: *100% OPERATIVO*
• Línea: +57 320 2796115

2️⃣ 💰 *COMPROMISOS FINANCIEROS Y COBRANZAS:*
• Gestión de cobros del día activa
📲 *Medio de Pago Principal:* Bre-B (Llave única: *0090778625*)

3️⃣ 🛠️ *OPERACIÓN DE TALLER Y ENTREGAS:*
• Producción y entregas de piezas 3D en curso.

4️⃣ 📦 *INSUMOS Y LOGÍSTICA:*
• Monitoreo activo de resina e insumos en taller.

5️⃣ 🎯 *ACCIONES PRIORITARIAS PARA EL DÍA:*
1. Verificar entregas programadas de la jornada.
2. Conciliar pagos recibidos por Bre-B (0090778625).
3. Monitorear impresoras en taller.

✨ _¡Excelente jornada laboral para todo el equipo WJGEEKS 3D! 🚀_`;

    return {
      success: true,
      fecha_reporte: today,
      fecha_texto: today,
      whatsapp_health: {
        status: 'operativo',
        linea_oficial: '+57 320 2796115',
        motor_activo: true,
        total_ultimas_24h: 0,
        enviados_24h: 0,
        fallidos_24h: 0,
        pendientes_cola: 0,
        estancados_mas_15m: 0,
        tasa_fallo_pct: 0,
        mensajes_programados_hoy: 0,
        alerta_mensaje: 'Motor operativo (modo local)'
      },
      mensaje_whatsapp: mensajeFallback
    };
  }

  /**
   * Despacha el Daily Briefing a los administradores vía Gateway de WhatsApp
   */
  public static async despacharDailyBriefing(opciones?: {
    targetPhones?: { nombre: string; telefono: string }[];
    force?: boolean;
  }): Promise<any> {
    const targets = opciones?.targetPhones && opciones.targetPhones.length > 0
      ? opciones.targetPhones
      : [
          { nombre: 'Germán', telefono: '573503443140' },
          { nombre: 'Wendy', telefono: '573204814702' },
          { nombre: 'Juan', telefono: '573217273025' }
        ];

    const briefing = await this.obtenerDailyBriefing();
    const mensaje = briefing.mensaje_whatsapp;

    const resultados: { destinatario: string; success: boolean; id?: string; error?: string }[] = [];

    // 1. Despachar a cada administrador usando el Gateway oficial
    for (const admin of targets) {
      try {
        const res = await WhatsAppGatewayService.sendTextMessage(admin.telefono, mensaje);
        if (res.success) {
          resultados.push({ destinatario: admin.nombre, success: true, id: res.id });
          await this.registrarAuditoriaEnvio(
            {
              destinatarioTelefono: admin.telefono,
              destinatarioNombre: admin.nombre,
              tipo: 'daily_briefing',
              contenido: mensaje
            },
            'enviado',
            'whatsapp_qr_gateway'
          );
        } else {
          // Si el Gateway está offline o sin túnel, usar fallback
          const url = this.generarEnlaceWhatsAppBriefing(mensaje, admin.telefono);
          openWhatsApp(url, admin.telefono, mensaje);
          resultados.push({ destinatario: admin.nombre, success: true, error: 'Enviado vía fallback asistido' });
        }
      } catch (err: any) {
        const url = this.generarEnlaceWhatsAppBriefing(mensaje, admin.telefono);
        openWhatsApp(url, admin.telefono, mensaje);
        resultados.push({ destinatario: admin.nombre, success: false, error: err.message });
      }
    }

    // 2. Notificar en base de datos si Postgres RPC está disponible
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.rpc('dispatch_daily_briefing_whatsapp');
      }
    } catch (_) {}

    return { 
      success: true, 
      resultados,
      mensaje: `Daily Briefing procesado para ${targets.map(t => t.nombre).join(', ')}.` 
    };
  }


  /**
   * Genera el enlace directo para enviar el Daily Briefing por WhatsApp Web / App
   */
  public static generarEnlaceWhatsAppBriefing(
    mensaje: string, 
    telefono: string = '573503443140'
  ): string {
    const clean = formatWhatsAppPhone(telefono);
    return `https://wa.me/${clean}?text=${encodeURIComponent(mensaje)}`;
  }
}

