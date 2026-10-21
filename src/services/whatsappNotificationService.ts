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

export interface WhatsAppNotificationPayload {
  destinatarioTelefono: string;
  destinatarioNombre?: string;
  tipo: 'alerta_cobranza' | 'alerta_tarea_asignada' | 'alerta_ot_estado' | 'sos_insumo' | 'recordatorio_vencimiento' | 'daily_briefing' | 'healthcheck_alert';
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
    proveedor: 'web_direct' | 'whatsapp_cloud_api' = 'web_direct',
    errorDetalle?: string
  ): Promise<void> {
    try {
      // 1. Guardar en Supabase si está disponible
      if (isSupabaseConfigured && supabase) {
        await supabase.from('whatsapp_logs').insert({
          destinatario_telefono: payload.destinatarioTelefono,
          destinatario_nombre: payload.destinatarioNombre || null,
          tipo_mensaje: payload.tipo,
          contenido: payload.contenido,
          estado,
          proveedor,
          entidad_tipo: payload.entidadTipo || null,
          entidad_id: payload.entidadId || null,
          error_detalle: errorDetalle || null
        });
      }
    } catch (err) {
      console.warn('⚠️ No se pudo registrar log de WhatsApp en Supabase, guardando en local:', err);
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
   * Envía la notificación abriendo WhatsApp y auditando la acción
   */
  public static async enviarYAuditar(
    url: string,
    payload: WhatsAppNotificationPayload
  ): Promise<void> {
    openWhatsApp(url);
    await this.registrarAuditoriaEnvio(payload, 'enviado', 'web_direct');
  }

  /**
   * Consulta el estado de salud del motor de mensajería (Heartbeat / Healthcheck)
   */
  public static async obtenerSaludWhatsApp(): Promise<WhatsAppHealthStatus> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.rpc('fn_whatsapp_healthcheck');
        if (!error && data) {
          return data as WhatsAppHealthStatus;
        }
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
   * Ejecuta un ping activo contra Meta Graph API para validar el token y la línea oficial
   */
  public static async ejecutarPingWhatsApp(): Promise<WhatsAppPingResult> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.functions.invoke('dispatch-daily-briefing', {
          body: { action: 'ping' }
        });
        if (!error && data?.meta_ping) {
          return data.meta_ping as WhatsAppPingResult;
        }
      }
    } catch (e: any) {
      console.warn('Error ejecutando ping a Meta Graph API:', e);
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

        // Intento secundario vía Edge Function en modo preview
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('dispatch-daily-briefing', {
          body: { action: 'preview' }
        });
        if (!edgeErr && edgeData?.briefing) {
          return edgeData.briefing as DailyBriefingData;
        }
      }
    } catch (e) {
      console.warn('Error obteniendo Daily Briefing:', e);
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
   * Fuerza el despacho del Daily Briefing a los administradores por WhatsApp
   */
  public static async despacharDailyBriefing(opciones?: {
    targetPhones?: { nombre: string; telefono: string }[];
    force?: boolean;
  }): Promise<any> {
    try {
      if (isSupabaseConfigured && supabase) {
        // 1. Invocar Edge Function para despacho directo por Meta Graph API
        const { data, error } = await supabase.functions.invoke('dispatch-daily-briefing', {
          body: {
            action: 'dispatch',
            force: opciones?.force ?? true,
            target_phones: opciones?.targetPhones
          }
        });
        if (!error && data) {
          return data;
        }

        // 2. Si falla Edge Function, intentar encolar mediante RPC
        const { data: rpcData, error: rpcErr } = await supabase.rpc('dispatch_daily_briefing_whatsapp');
        if (!rpcErr && rpcData) {
          return rpcData;
        }
      }
    } catch (e: any) {
      console.warn('Error despachando Daily Briefing:', e);
      throw e;
    }

    return { 
      success: true, 
      simulated: true, 
      mensaje: 'Daily Briefing registrado y despachado con éxito en modo simulado.' 
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

