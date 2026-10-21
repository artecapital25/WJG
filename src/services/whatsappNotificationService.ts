import { CuentaCobro, TareaEquipo, OrdenTrabajo, ConfiguracionTaller } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { formatWhatsAppPhone, openWhatsApp } from './whatsappService';

export interface WhatsAppNotificationPayload {
  destinatarioTelefono: string;
  destinatarioNombre?: string;
  tipo: 'alerta_cobranza' | 'alerta_tarea_asignada' | 'alerta_ot_estado' | 'sos_insumo' | 'recordatorio_vencimiento';
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
• *Nequi:* ${config.nequi}
• *Daviplata:* ${config.daviplata}
• *Bancolombia:* ${config.bancolombia} (${config.titular_cuenta})

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
}
