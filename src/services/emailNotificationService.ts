// ==============================================================================
// SERVICIO DE CORREO TRANSACCIONAL Y DISPARO DUAL (WHATSAPP + CORREO)
// Central de Despacho Oficial WJGEEKS (+57 320 2796115)
// ==============================================================================

import { supabase } from './supabaseClient';
import { Cotizacion, OrdenTrabajo } from '../types';
import { GoogleSheetsSyncService, OFFICIAL_APPS_SCRIPT_URL } from './googleSheetsSyncService';

export const LINEA_CENTRAL_EMPRESA = {
  nombre: 'WJGEEKS Central Oficial',
  telefono: '3202796115',
  telefonoE164: '573202796115',
  correo: 'wjgeeks3d@gmail.com'
};

export const CONTACTOS_EQUIPO_INTERNO = {
  juan: {
    nombre: 'Juan',
    telefono: '3217273025',
    telefonoE164: '573217273025',
    rol: 'Taller & Impresión 3D'
  },
  wendy: {
    nombre: 'Wendy',
    telefono: '3204814702',
    telefonoE164: '573204814702',
    rol: 'Pintura, Acabados & Compras'
  },
  german: {
    nombre: 'Germán',
    telefono: '3503443140',
    telefonoE164: '573503443140',
    rol: 'Dirección & Modelado 3D'
  }
};

export interface TransactionalEmailPayload {
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

export const EmailNotificationService = {
  /**
   * Invoca la Edge Function send-transactional-email de Supabase de manera desacoplada
   * o encola en registro_notificaciones para evitar fallos de red/CORS en consola
   */
  async enviarCorreoTransaccional(payload: TransactionalEmailPayload): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        return { success: false, error: 'Supabase desconectado' };
      }

      if (!payload.destinatario_correo || !payload.destinatario_correo.includes('@')) {
        return { success: false, error: 'Correo de destinatario inválido o no suministrado' };
      }

      // 1. Despacho prioritario vía Google Apps Script Webhook (wjgeeks3d@gmail.com)
      const sheetsCfg = GoogleSheetsSyncService.getConfig();
      const googleScriptUrl = ((import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL || sheetsCfg.webAppUrl || OFFICIAL_APPS_SCRIPT_URL || '').trim();
      let functionInvokedOk = false;

      if (googleScriptUrl && googleScriptUrl.startsWith('https://script.google.com/')) {
        try {
          await fetch(googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
              action: 'send_email',
              ...payload,
              remitente: LINEA_CENTRAL_EMPRESA.correo
            })
          });
          functionInvokedOk = true;
        } catch (gasErr) {
          console.warn('[EmailNotification] Fallo al despachar por Google Apps Script:', gasErr);
        }
      }

      // 2. Despacho alternativo vía Edge Function de Supabase
      if (!functionInvokedOk) {
        try {
          const { data, error } = await supabase.functions.invoke('send-transactional-email', {
            body: {
              ...payload,
              remitente: LINEA_CENTRAL_EMPRESA.correo
            }
          });

          if (!error && (data?.success || data?.id)) {
            functionInvokedOk = true;
          }
        } catch (_) {
          // Fallback
        }
      }

      // 3. Registro canónico en Supabase: tabla registro_notificaciones para trazabilidad
      try {
        const idempotency = `mail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await supabase.from('registro_notificaciones').insert([{
          idempotency_key: idempotency,
          destinatario_nombre: payload.destinatario_nombre || 'Cliente WJGEEKS',
          destinatario_telefono: payload.destinatario_correo,
          rol_destinatario: 'CLIENTE',
          canal: 'EMAIL_TRANSACCIONAL',
          mensaje_plano: `Asunto: ${payload.asunto || 'Notificación'}\nDestinatario: ${payload.destinatario_correo}\nTipo: ${payload.tipo}`,
          estado: functionInvokedOk ? 'ENVIADO' : 'PENDIENTE',
          enviado_at: functionInvokedOk ? new Date().toISOString() : null
        }]);
      } catch (dbErr) {
        console.debug('Nota de auditoría: registro_notificaciones correo respaldado');
      }

      if (!functionInvokedOk) {
        return {
          success: false,
          error: 'No hay un canal de correo activo. Para enviar desde wjgeeks3d@gmail.com, configura la URL de tu Google Apps Script en Ajustes de Drive o habilita Resend en Supabase.'
        };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error procesando envío de correo' };
    }
  },

  /**
   * Envía un correo de prueba de conectividad y mensajería
   */
  async enviarCorreoPrueba(correoDestino: string, nombreDestino: string = 'Germán'): Promise<{ success: boolean; error?: string }> {
    const payload: TransactionalEmailPayload = {
      tipo: 'alerta_equipo',
      destinatario_correo: correoDestino.replace(/\.,com$/i, '.com').trim(),
      destinatario_nombre: nombreDestino,
      asunto: '🚀 Prueba de Mensajería Transaccional - WJGEEKS 3D PRO',
      datos: {
        numero_doc: 'TEST-001',
        total: 85000,
        abono: 45000,
        saldo_pendiente: 40000,
        metodo_pago: 'Bre-B (0090778625)',
        item_nombre: 'Figura Articulada Dragón Mech 3D (Resina 8K)'
      }
    };

    return this.enviarCorreoTransaccional(payload);
  },

  /**
   * Envía correo con la cotización oficial y botón de rastreo en vivo
   */
  async enviarCorreoCotizacion(cotizacion: Cotizacion, trackingUrl?: string): Promise<{ success: boolean; error?: string }> {
    const correoCliente = cotizacion.cliente.correo;
    if (!correoCliente || !correoCliente.includes('@')) {
      return { success: false, error: 'El cliente no tiene un correo electrónico registrado' };
    }

    const payload: TransactionalEmailPayload = {
      tipo: 'cotizacion',
      destinatario_correo: correoCliente,
      destinatario_nombre: cotizacion.cliente.nombre,
      asunto: `Cotización Oficial ${cotizacion.numero_cot} - WJGEEKS 3D`,
      tracking_url: trackingUrl || `${window.location.origin}/?portal=cliente&cot=${encodeURIComponent(cotizacion.numero_cot)}`,
      datos: {
        numero_doc: cotizacion.numero_cot,
        total: cotizacion.total,
        abono: cotizacion.abono || 0,
        saldo_pendiente: cotizacion.saldo_pendiente,
        metodo_pago: cotizacion.metodo_pago,
        fecha: cotizacion.fecha,
        detalles_items: cotizacion.items.map(it => ({
          nombre: it.nombre_item,
          cantidad: it.cantidad,
          precio: it.precio_total
        }))
      }
    };

    return this.enviarCorreoTransaccional(payload);
  },

  /**
   * Envía comprobante de abono / pago por correo electrónico
   */
  async enviarCorreoAbono(
    cliente: { nombre: string; correo?: string },
    referenciaDoc: string,
    montoAbonado: number,
    saldoRestante: number,
    totalDoc: number,
    metodoPago?: string,
    trackingUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!cliente.correo || !cliente.correo.includes('@')) {
      return { success: false, error: 'El cliente no tiene correo registrado' };
    }

    const payload: TransactionalEmailPayload = {
      tipo: 'abono',
      destinatario_correo: cliente.correo,
      destinatario_nombre: cliente.nombre,
      asunto: `Comprobante de Abono - ${referenciaDoc} (WJGEEKS 3D)`,
      tracking_url: trackingUrl,
      datos: {
        numero_doc: referenciaDoc,
        total: totalDoc,
        abono: montoAbonado,
        saldo_pendiente: saldoRestante,
        metodo_pago: metodoPago || 'Bre-B'
      }
    };

    return this.enviarCorreoTransaccional(payload);
  },

  /**
   * Notifica por correo que la pieza ha sido finalizada al 100% y está lista para despacho
   */
  async enviarCorreoPiezaTerminada(
    ot: OrdenTrabajo,
    correoDestino?: string,
    trackingUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    const destino = correoDestino;
    if (!destino || !destino.includes('@')) {
      return { success: false, error: 'Sin correo de destino válido' };
    }

    const payload: TransactionalEmailPayload = {
      tipo: 'pieza_terminada',
      destinatario_correo: destino,
      destinatario_nombre: ot.cliente_nombre,
      asunto: `🎉 ¡Tu figura 3D está terminada al 100%! - Orden ${ot.numero_ot}`,
      tracking_url: trackingUrl || `${window.location.origin}/?portal=cliente&ot=${encodeURIComponent(ot.numero_ot)}`,
      datos: {
        numero_doc: ot.numero_ot,
        item_nombre: ot.item_nombre,
        total: ot.precio_cobrado || ((ot.abono || 0) + (ot.saldo_pendiente || 0)),
        abono: ot.abono || 0,
        saldo_pendiente: ot.saldo_pendiente || 0
      }
    };

    return this.enviarCorreoTransaccional(payload);
  },

  /**
   * Disparo Dual Híbrido: Despacha la notificación simultáneamente a WhatsApp y por Correo.
   * Si WhatsApp falla o se interrumpe, el correo asegura entrega garantizada.
   */
  async disparoDualNotificacion(params: {
    cliente: { nombre: string; telefono?: string; correo?: string };
    referenciaDoc: string;
    mensajeWhatsAppUrl?: string;
    emailPayload?: TransactionalEmailPayload;
  }): Promise<{ whatsappIniciado: boolean; emailEnviado: boolean }> {
    let emailEnviado = false;
    let whatsappIniciado = false;

    const promesas: Promise<any>[] = [];

    // 1. Envío por Correo Electrónico en segundo plano
    if (params.emailPayload && params.cliente.correo) {
      promesas.push(
        this.enviarCorreoTransaccional(params.emailPayload)
          .then(res => {
            emailEnviado = res.success;
          })
          .catch(() => {
            emailEnviado = false;
          })
      );
    }

    // 2. Disparo de WhatsApp unificado mediante openWhatsApp
    if (params.mensajeWhatsAppUrl) {
      whatsappIniciado = true;
      try {
        const { openWhatsApp } = await import('./whatsappService');
        await openWhatsApp(params.mensajeWhatsAppUrl);
      } catch (e) {
        console.warn('No se pudo despachar WhatsApp:', e);
      }
    }

    await Promise.allSettled(promesas);

    return { whatsappIniciado, emailEnviado };
  }
};
