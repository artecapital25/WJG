import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface EnqueueNotificationParams {
  idempotencyKey: string;
  destinatarioTelefono: string;
  destinatarioNombre?: string;
  tipo: 'alerta_cobranza' | 'alerta_ot_estado' | 'alerta_tarea' | 'recordatorio_vencimiento';
  contenido: string;
  entidadTipo?: string;
  entidadId?: string;
}

export class WhatsAppUnattendedService {
  /**
   * Encola una notificación en la base de datos de forma idempotente
   */
  public static async encolarNotificacion(params: EnqueueNotificationParams): Promise<{ success: boolean; enqueued: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: true, enqueued: false, error: 'Supabase no configurado en este entorno' };
    }

    try {
      const { data, error } = await supabase
        .from('whatsapp_notification_logs')
        .insert({
          idempotency_key: params.idempotencyKey,
          destinatario_telefono: params.destinatarioTelefono,
          destinatario_nombre: params.destinatarioNombre || null,
          tipo_mensaje: params.tipo,
          contenido: params.contenido,
          estado: 'queued',
          entidad_tipo: params.entidadTipo || null,
          entidad_id: params.entidadId || null,
          intentos: 0,
          proximo_reintento_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // Si hay colisión de clave de idempotencia, significa que ya se encoló hoy (evita spam)
        if (error.code === '23505') {
          return { success: true, enqueued: false, error: 'Mensaje ya encolado previamente (Idempotencia activa)' };
        }
        throw error;
      }

      return { success: true, enqueued: true };
    } catch (err: any) {
      console.warn('⚠️ Error al encolar mensaje desatendido de WhatsApp:', err);
      return { success: false, enqueued: false, error: err.message };
    }
  }

  /**
   * Dispara el despacho de mensajes encolados invocando la Edge Function
   */
  public static async dispararDespachoDesatendido(): Promise<{ success: boolean; procesados?: number; error?: string }> {
    const apiUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WHATSAPP_API_URL) || '';

    if (!apiUrl) {
      return { success: true, procesados: 0, error: 'VITE_WHATSAPP_API_URL no configurado' };
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''
        }
      });

      const json = await response.json();
      return { success: response.ok, procesados: json.procesados || 0 };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
