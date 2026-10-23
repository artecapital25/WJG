// ==============================================================================
// SERVICIO DE CORREO TRANSACCIONAL Y DISPARO DUAL (WHATSAPP + CORREO)
// Central de Despacho Oficial WJGEEKS (+57 320 2796115)
// ==============================================================================

import { supabase } from './supabaseClient';
import { Cotizacion, OrdenTrabajo } from '../types';

export const LINEA_CENTRAL_EMPRESA = {
  nombre: 'WJGEEKS Central Oficial',
  telefono: '3202796115',
  telefonoE164: '573202796115'
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
   */
  async enviarCorreoTransaccional(payload: TransactionalEmailPayload): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        console.warn('Supabase no inicializado para envío de correo transaccional.');
        return { success: false, error: 'Supabase desconectado' };
      }

      if (!payload.destinatario_correo || !payload.destinatario_correo.includes('@')) {
        return { success: false, error: 'Correo de destinatario inválido o no suministrado' };
      }

      const { data, error } = await supabase.functions.invoke('send-transactional-email', {
        body: payload
      });

      if (error) {
        console.warn('Error en Edge Function send-transactional-email:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      console.warn('Excepción al enviar correo transaccional:', e?.message || e);
      return { success: false, error: e?.message || 'Error de red' };
    }
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

    // 2. Disparo de WhatsApp
    if (params.mensajeWhatsAppUrl) {
      whatsappIniciado = true;
      try {
        window.open(params.mensajeWhatsAppUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.warn('No se pudo abrir ventana de WhatsApp:', e);
      }
    }

    await Promise.allSettled(promesas);

    return { whatsappIniciado, emailEnviado };
  }
};
