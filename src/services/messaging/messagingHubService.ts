import {
  CanalGrupoWhatsApp,
  ConfiguracionTaller,
  OrdenTrabajo,
  SolicitudInsumo,
  TareaEquipo
} from '../../types';
import { UsuarioTaller } from '../../types/usuarios.types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { formatWhatsAppPhone } from '../whatsappService';
import {
  ChannelDeliveryResult,
  DispatchRequest,
  DispatchSummary,
  EmailTipo,
  MessagingContextType
} from './messagingTypes';
import {
  getTeamContacts,
  normalizeTextKey,
  resolveGroupDestination,
  resolveTaskRecipients
} from './recipientDirectory';
import {
  buildSOSInsumoMessage,
  buildStockBajoBatchMessage,
  buildTareaAvanceMessage,
  buildTareaMessage,
  buildTestConnectionMessage
} from './messageTemplates';
import { sendWhatsAppWithRetry } from './whatsappAdapter';
import { sendVerifiedEmail } from './emailAdapter';

const STORAGE_LOCAL_AUDIT_KEY = 'wjg_messaging_audit_logs';

function mapRolDestinatario(label: string, isGroup: boolean): string {
  if (isGroup) return 'TRIPARTITO';
  const norm = normalizeTextKey(label);
  if (norm.includes('juan')) return 'JUAN_TALLER';
  if (norm.includes('wendy')) return 'WENDY_PINTURA';
  if (norm.includes('german')) return 'GERMAN_ADMIN';
  return 'CLIENTE';
}

async function logDeliveryAudit(
  result: ChannelDeliveryResult,
  mensajePlano: string,
  opts: { entidadTipo?: string; entidadId?: string }
): Promise<void> {
  const isGroup = result.channel === 'whatsapp_group';
  const isEmail = result.channel === 'email';
  const canalEnum = isEmail
    ? 'EMAIL'
    : isGroup
    ? 'WHATSAPP_GROUP'
    : 'WHATSAPP_GATEWAY';

  if (isSupabaseConfigured && supabase) {
    try {
      const idempotency = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const isOtUuid = Boolean(
        opts.entidadTipo === 'orden_trabajo' &&
          opts.entidadId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opts.entidadId)
      );

      await supabase.from('registro_notificaciones').insert({
        idempotency_key: idempotency,
        orden_trabajo_id: isOtUuid ? opts.entidadId : null,
        destinatario_nombre: result.targetLabel || 'Equipo WJGEEKS',
        destinatario_telefono: isEmail ? '573202796115' : result.destination,
        destinatario_correo: isEmail ? result.destination : null,
        rol_destinatario: mapRolDestinatario(result.targetLabel, isGroup),
        canal: canalEnum,
        mensaje_plano: mensajePlano,
        estado: result.success ? 'ENVIADO' : 'FALLIDO',
        enviado_at: result.success ? new Date().toISOString() : null,
        ultimo_error: result.success ? null : result.error || 'Error de envío',
        entidad_tipo: opts.entidadTipo || null,
        entidad_id: opts.entidadId || null,
        proveedor: result.provider || (isEmail ? 'edge_email' : 'whatsapp_qr_gateway')
      });
    } catch {
      // No interrumpir flujo operativo por errores de log
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_LOCAL_AUDIT_KEY);
      const logs = raw ? JSON.parse(raw) : [];
      logs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        ...result,
        entidadTipo: opts.entidadTipo,
        entidadId: opts.entidadId,
        fecha: new Date().toISOString()
      });
      window.localStorage.setItem(STORAGE_LOCAL_AUDIT_KEY, JSON.stringify(logs.slice(0, 120)));
    } catch {
      // ignorar cuota
    }
  }
}

function buildSummary(results: ChannelDeliveryResult[]): DispatchSummary {
  const waResults = results.filter(r => r.channel !== 'email');
  const emailResults = results.filter(r => r.channel === 'email');

  const whatsappOkCount = waResults.filter(r => r.success).length;
  const whatsappFailCount = waResults.filter(r => !r.success).length;
  const emailOkCount = emailResults.filter(r => r.success).length;
  const emailFailCount = emailResults.filter(r => !r.success).length;

  const fallbackUrls = waResults
    .filter(r => !r.success && r.fallbackUrl)
    .map(r => ({ label: r.targetLabel, url: r.fallbackUrl! }));

  const needsAppsScriptUpdate = emailResults.some(r => r.needsAppsScriptUpdate);

  const parts: string[] = [];
  if (waResults.length > 0) {
    if (whatsappOkCount > 0 && whatsappFailCount === 0) {
      parts.push(`WhatsApp: enviado (${waResults.map(r => r.targetLabel).join(', ')})`);
    } else if (whatsappOkCount > 0) {
      parts.push(`WhatsApp: ${whatsappOkCount}/${waResults.length} enviados`);
    } else {
      parts.push(`WhatsApp: falló (${waResults[0]?.error || 'desconectado'})`);
    }
  }
  if (emailResults.length > 0) {
    if (emailOkCount > 0 && emailFailCount === 0) {
      parts.push(`Correo: verificado (${emailResults.map(r => r.destination).join(', ')})`);
    } else {
      parts.push(`Correo: ${emailResults[0]?.error || 'no confirmado'}`);
    }
  }

  return {
    success: whatsappOkCount > 0 || emailOkCount > 0,
    results,
    whatsappOkCount,
    whatsappFailCount,
    emailOkCount,
    emailFailCount,
    fallbackUrls,
    needsAppsScriptUpdate,
    summaryText: parts.join(' • ')
  };
}

export const MessagingHubService = {
  /**
   * Despachador único de mensajería instantánea (WhatsApp individual/grupo + Correo verificado) en paralelo.
   */
  async dispatch(request: DispatchRequest): Promise<DispatchSummary> {
    const waEnabled = request.whatsappEnabled !== false;
    const emailEnabled = request.emailEnabled !== false;

    const tasks: Array<Promise<ChannelDeliveryResult>> = [];

    if (waEnabled && request.whatsappTargets && request.whatsappTargets.length > 0) {
      for (const target of request.whatsappTargets) {
        if (!target.whatsappTarget) continue;
        tasks.push(
          (async (): Promise<ChannelDeliveryResult> => {
            const waRes = await sendWhatsAppWithRetry(
              target.whatsappTarget!,
              request.whatsappText,
              { allowWakeUpRetry: request.allowWakeUpRetry }
            );
            const result: ChannelDeliveryResult = {
              channel: waRes.isGroup || target.type === 'group' ? 'whatsapp_group' : 'whatsapp_individual',
              targetLabel: target.label,
              destination: target.whatsappTarget!,
              success: waRes.success,
              provider: 'whatsapp_qr_gateway',
              messageId: waRes.id,
              error: waRes.error,
              fallbackUrl: waRes.fallbackUrl,
              wokeAttempted: waRes.wokeAttempted
            };
            await logDeliveryAudit(result, request.whatsappText, {
              entidadTipo: request.entidadTipo,
              entidadId: request.entidadId
            });
            return result;
          })()
        );
      }
    }

    if (emailEnabled && request.emailTargets && request.emailTargets.length > 0) {
      const validEmails = request.emailTargets.filter(e => e.correo && e.correo.includes('@'));
      if (validEmails.length > 0) {
        tasks.push(
          (async (): Promise<ChannelDeliveryResult> => {
            const emailRes = await sendVerifiedEmail({
              tipo: request.emailType,
              destinatarios: validEmails,
              asunto: request.emailSubject,
              tracking_url: request.trackingUrl,
              texto_plano: request.whatsappText,
              datos: request.emailData,
              tallerConfig: request.tallerConfig
            });
            const destStr = validEmails.map(e => e.correo).join(', ');
            const labelStr = validEmails.map(e => e.nombre).join(', ');
            const result: ChannelDeliveryResult = {
              channel: 'email',
              targetLabel: labelStr,
              destination: destStr,
              success: emailRes.success,
              verified: emailRes.verified,
              provider: emailRes.provider,
              messageId: emailRes.messageId,
              error: emailRes.error,
              needsAppsScriptUpdate: emailRes.needsAppsScriptUpdate
            };
            await logDeliveryAudit(
              result,
              `[EMAIL ${request.emailType.toUpperCase()}] ${request.emailSubject}\nPara: ${destStr}`,
              { entidadTipo: request.entidadTipo, entidadId: request.entidadId }
            );
            return result;
          })()
        );
      }
    }

    const settled = await Promise.allSettled(tasks);
    const results: ChannelDeliveryResult[] = settled.map(s =>
      s.status === 'fulfilled'
        ? s.value
        : {
            channel: 'whatsapp_individual',
            targetLabel: 'Error inesperado',
            destination: '',
            success: false,
            error: s.reason?.message || 'Fallo interno'
          }
    );

    return buildSummary(results);
  },

  /**
   * Notifica creación, actualización o completado de una tarea.
   * Individual -> WhatsApp directo + Correo directo.
   * Grupal ('Todos') -> Grupo WhatsApp canal 'tareas' (fallback 'general') + Correo a los 3 integrantes.
   */
  async notifyTask(
    tarea: TareaEquipo,
    evento: 'asignada' | 'actualizada' | 'completada' = 'asignada',
    opts?: {
      usuarios?: UsuarioTaller[];
      config?: ConfiguracionTaller | null;
      forceGroup?: boolean;
      whatsappEnabled?: boolean;
      emailEnabled?: boolean;
    }
  ): Promise<DispatchSummary> {
    const resolved = resolveTaskRecipients(
      tarea.asignado_a,
      opts?.usuarios,
      opts?.config,
      'tareas',
      Boolean(opts?.forceGroup)
    );
    const built = buildTareaMessage(tarea, evento);

    return this.dispatch({
      context: 'tarea',
      entidadTipo: 'tarea_equipo',
      entidadId: tarea.id,
      whatsappEnabled: opts?.whatsappEnabled ?? true,
      emailEnabled: opts?.emailEnabled ?? (opts?.config?.email_auto_send !== false),
      whatsappTargets: resolved.whatsappTargets,
      emailTargets: resolved.emailTargets,
      whatsappText: built.whatsappText,
      emailSubject: built.emailSubject,
      emailType: built.emailType,
      emailData: built.emailData,
      trackingUrl: built.trackingUrl,
      tallerConfig: opts?.config,
      usuarios: opts?.usuarios
    });
  },

  /**
   * Notifica un avance de bitácora en tarea.
   */
  async notifyTaskAdvance(
    tarea: TareaEquipo,
    avance: { nota: string; porcentaje: number; autor: string },
    opts?: {
      usuarios?: UsuarioTaller[];
      config?: ConfiguracionTaller | null;
      whatsappEnabled?: boolean;
      emailEnabled?: boolean;
    }
  ): Promise<DispatchSummary> {
    const resolved = resolveTaskRecipients(tarea.asignado_a, opts?.usuarios, opts?.config, 'tareas', false);
    const built = buildTareaAvanceMessage(tarea, avance);

    return this.dispatch({
      context: 'tarea',
      entidadTipo: 'tarea_equipo',
      entidadId: tarea.id,
      whatsappEnabled: opts?.whatsappEnabled ?? true,
      emailEnabled: opts?.emailEnabled ?? (opts?.config?.email_auto_send !== false),
      whatsappTargets: resolved.whatsappTargets,
      emailTargets: resolved.emailTargets,
      whatsappText: built.whatsappText,
      emailSubject: built.emailSubject,
      emailType: built.emailType,
      emailData: built.emailData,
      trackingUrl: built.trackingUrl,
      tallerConfig: opts?.config,
      usuarios: opts?.usuarios
    });
  },

  /**
   * Notifica solicitud S.O.S de insumos (grupo 'insumos' si es grupal/todos, o encargado directo + correo).
   */
  async notifySOSInsumo(
    solicitud: SolicitudInsumo,
    opts?: {
      enviarAlGrupo?: boolean;
      evento?: 'creada' | 'seguimiento';
      usuarios?: UsuarioTaller[];
      config?: ConfiguracionTaller | null;
      whatsappEnabled?: boolean;
      emailEnabled?: boolean;
    }
  ): Promise<DispatchSummary> {
    const esGrupal = Boolean(opts?.enviarAlGrupo) || normalizeTextKey(solicitud.encargado_compra) === 'todos';
    const resolved = resolveTaskRecipients(
      solicitud.encargado_compra || 'Wendy',
      opts?.usuarios,
      opts?.config,
      'insumos',
      esGrupal
    );
    const built = buildSOSInsumoMessage(solicitud, opts?.evento || 'creada');

    return this.dispatch({
      context: 'sos_insumo',
      entidadTipo: 'solicitud_insumo',
      entidadId: solicitud.id,
      whatsappEnabled: opts?.whatsappEnabled ?? true,
      emailEnabled: opts?.emailEnabled ?? (opts?.config?.email_auto_send !== false),
      whatsappTargets: resolved.whatsappTargets,
      emailTargets: resolved.emailTargets,
      whatsappText: built.whatsappText,
      emailSubject: built.emailSubject,
      emailType: built.emailType,
      emailData: built.emailData,
      trackingUrl: built.trackingUrl,
      tallerConfig: opts?.config,
      usuarios: opts?.usuarios
    });
  },

  /**
   * Envía alerta consolidada de stock bajo al grupo de 'insumos' y correo al encargado.
   */
  async notifyLowStockBatch(
    solicitudes: SolicitudInsumo[],
    opts?: {
      usuarios?: UsuarioTaller[];
      config?: ConfiguracionTaller | null;
    }
  ): Promise<DispatchSummary | null> {
    if (!solicitudes || solicitudes.length === 0) return null;
    const resolved = resolveTaskRecipients(
      solicitudes[0]?.encargado_compra || 'Wendy',
      opts?.usuarios,
      opts?.config,
      'insumos',
      true
    );
    const built = buildStockBajoBatchMessage(solicitudes);

    return this.dispatch({
      context: 'stock_bajo',
      entidadTipo: 'solicitud_insumo',
      entidadId: solicitudes[0]?.id,
      whatsappEnabled: true,
      emailEnabled: opts?.config?.email_auto_send !== false,
      whatsappTargets: resolved.whatsappTargets,
      emailTargets: resolved.emailTargets,
      whatsappText: built.whatsappText,
      emailSubject: built.emailSubject,
      emailType: built.emailType,
      emailData: built.emailData,
      trackingUrl: built.trackingUrl,
      tallerConfig: opts?.config,
      usuarios: opts?.usuarios
    });
  },

  /**
   * Prueba en vivo desde WhatsAppConnectModal (individual, grupo de canal o correo).
   */
  async sendLiveTest(params: {
    mode: 'whatsapp_individual' | 'whatsapp_group' | 'email';
    targetPhoneOrJid?: string;
    targetEmail?: string;
    targetName?: string;
    groupChannel?: CanalGrupoWhatsApp;
    config?: ConfiguracionTaller | null;
    usuarios?: UsuarioTaller[];
  }): Promise<DispatchSummary> {
    const built = buildTestConnectionMessage(params.targetName || 'Equipo WJGEEKS');

    if (params.mode === 'whatsapp_group') {
      const group = resolveGroupDestination(params.groupChannel || 'general', params.config);
      const jid = params.targetPhoneOrJid || group?.jid;
      if (!jid) {
        return {
          success: false,
          results: [
            {
              channel: 'whatsapp_group',
              targetLabel: params.groupChannel || 'general',
              destination: '',
              success: false,
              error: 'No hay ningún grupo de WhatsApp configurado para este canal.'
            }
          ],
          whatsappOkCount: 0,
          whatsappFailCount: 1,
          emailOkCount: 0,
          emailFailCount: 0,
          fallbackUrls: [],
          needsAppsScriptUpdate: false,
          summaryText: 'No hay grupo configurado para este canal.'
        };
      }
      return this.dispatch({
        context: 'general',
        entidadTipo: 'prueba_conexion',
        whatsappEnabled: true,
        emailEnabled: false,
        whatsappTargets: [
          {
            type: 'group',
            label: group?.nombre || params.targetName || 'Grupo WhatsApp',
            whatsappTarget: jid,
            groupChannel: params.groupChannel || 'general'
          }
        ],
        whatsappText: built.whatsappText,
        emailSubject: built.emailSubject,
        emailType: 'prueba_conexion' as EmailTipo,
        tallerConfig: params.config,
        usuarios: params.usuarios
      });
    }

    if (params.mode === 'email') {
      return this.dispatch({
        context: 'general',
        entidadTipo: 'prueba_conexion',
        whatsappEnabled: false,
        emailEnabled: true,
        emailTargets: [
          {
            correo: (params.targetEmail || '').trim(),
            nombre: params.targetName || 'Equipo WJGEEKS'
          }
        ],
        whatsappText: built.whatsappText,
        emailSubject: built.emailSubject,
        emailType: 'prueba_conexion',
        emailData: built.emailData,
        trackingUrl: built.trackingUrl,
        tallerConfig: params.config,
        usuarios: params.usuarios
      });
    }

    const phoneE164 = formatWhatsAppPhone(params.targetPhoneOrJid || '');
    return this.dispatch({
      context: 'general',
      entidadTipo: 'prueba_conexion',
      whatsappEnabled: true,
      emailEnabled: false,
      whatsappTargets: [
        {
          type: 'individual',
          label: params.targetName || phoneE164,
          whatsappTarget: phoneE164
        }
      ],
      whatsappText: built.whatsappText,
      emailSubject: built.emailSubject,
      emailType: 'prueba_conexion',
      tallerConfig: params.config,
      usuarios: params.usuarios
    });
  },

  /**
   * Notifica a un cliente externo (cotizaciones, recibos POS, cobros de cartera, OTs listas)
   * enviando por WhatsApp y Correo verificado cuando el correo está disponible.
   */
  async notifyExternalClient(params: {
    context: MessagingContextType;
    entidadTipo?: string;
    entidadId?: string;
    clienteNombre: string;
    clienteTelefono?: string;
    clienteCorreo?: string;
    whatsappText: string;
    emailSubject: string;
    emailType: EmailTipo;
    emailData?: Record<string, any>;
    trackingUrl?: string;
    whatsappEnabled?: boolean;
    emailEnabled?: boolean;
    config?: ConfiguracionTaller | null;
    allowWakeUpRetry?: boolean;
  }): Promise<DispatchSummary> {
    const cleanPhone = formatWhatsAppPhone(params.clienteTelefono || '');
    const validPhone = cleanPhone.length >= 7 && cleanPhone !== '573000000000' && cleanPhone !== '3000000000';
    const cleanEmail = (params.clienteCorreo || '').trim();
    const validEmail = cleanEmail.includes('@');

    return this.dispatch({
      context: params.context,
      entidadTipo: params.entidadTipo,
      entidadId: params.entidadId,
      whatsappEnabled: params.whatsappEnabled ?? validPhone,
      emailEnabled:
        params.emailEnabled ?? (validEmail && params.config?.email_auto_send !== false),
      whatsappTargets: validPhone
        ? [
            {
              type: 'external',
              label: params.clienteNombre || 'Cliente',
              whatsappTarget: cleanPhone,
              correo: validEmail ? cleanEmail : undefined
            }
          ]
        : [],
      emailTargets: validEmail
        ? [{ correo: cleanEmail, nombre: params.clienteNombre || 'Cliente' }]
        : [],
      whatsappText: params.whatsappText,
      emailSubject: params.emailSubject,
      emailType: params.emailType,
      emailData: params.emailData,
      trackingUrl: params.trackingUrl,
      tallerConfig: params.config,
      allowWakeUpRetry: params.allowWakeUpRetry
    });
  },

  /**
   * Despacha un pase de turno o alerta de orden de trabajo (OT) hacia un integrante del taller,
   * al grupo de 'taller' (inspección tripartita), o al cliente final.
   */
  async notifyWorkshopHandoff(params: {
    ot: OrdenTrabajo;
    destinatarioNombre: string;
    destinatarioTelefono?: string;
    destinatarioCorreo?: string;
    isGrupoEquipo?: boolean;
    isCliente?: boolean;
    whatsappText: string;
    emailSubject?: string;
    trackingUrl?: string;
    whatsappEnabled?: boolean;
    emailEnabled?: boolean;
    config?: ConfiguracionTaller | null;
    usuarios?: UsuarioTaller[];
  }): Promise<DispatchSummary> {
    if (params.isCliente) {
      return this.notifyExternalClient({
        context: 'ot',
        entidadTipo: 'orden_trabajo',
        entidadId: params.ot.id,
        clienteNombre: params.destinatarioNombre || params.ot.cliente_nombre,
        clienteTelefono: params.destinatarioTelefono || params.ot.cliente_telefono,
        clienteCorreo: params.destinatarioCorreo,
        whatsappText: params.whatsappText,
        emailSubject:
          params.emailSubject ||
          `🎉 Actualización de Pedido ${params.ot.numero_ot} — WJGEEKS 3D`,
        emailType: 'pieza_terminada',
        emailData: {
          numero_doc: params.ot.numero_ot,
          item_nombre: params.ot.item_nombre,
          estado_ot: params.ot.estado,
          saldo_pendiente: params.ot.saldo_pendiente || 0,
          mensaje_personalizado: params.whatsappText
        },
        trackingUrl: params.trackingUrl,
        whatsappEnabled: params.whatsappEnabled,
        emailEnabled: params.emailEnabled,
        config: params.config
      });
    }

    const resolved = resolveTaskRecipients(
      params.isGrupoEquipo ? 'Todos' : params.destinatarioNombre,
      params.usuarios,
      params.config,
      'taller',
      Boolean(params.isGrupoEquipo)
    );

    const whatsappTargets =
      resolved.whatsappTargets.length > 0
        ? resolved.whatsappTargets
        : params.destinatarioTelefono
        ? [
            {
              type: 'individual' as const,
              label: params.destinatarioNombre,
              whatsappTarget: formatWhatsAppPhone(params.destinatarioTelefono),
              correo: params.destinatarioCorreo
            }
          ]
        : [];

    const emailTargets =
      resolved.emailTargets.length > 0
        ? resolved.emailTargets
        : params.destinatarioCorreo && params.destinatarioCorreo.includes('@')
        ? [{ correo: params.destinatarioCorreo.trim(), nombre: params.destinatarioNombre }]
        : [];

    return this.dispatch({
      context: 'ot',
      entidadTipo: 'orden_trabajo',
      entidadId: params.ot.id,
      whatsappEnabled: params.whatsappEnabled ?? true,
      emailEnabled: params.emailEnabled ?? (params.config?.email_auto_send !== false),
      whatsappTargets,
      emailTargets,
      whatsappText: params.whatsappText,
      emailSubject:
        params.emailSubject ||
        `🛠️ Taller OT ${params.ot.numero_ot}: ${params.ot.item_nombre}`,
      emailType: 'alerta_equipo',
      emailData: {
        numero_doc: params.ot.numero_ot,
        titulo: `OT ${params.ot.numero_ot} — ${params.ot.item_nombre}`,
        asignado_a: params.destinatarioNombre,
        mensaje_personalizado: params.whatsappText
      },
      trackingUrl: params.trackingUrl,
      tallerConfig: params.config,
      usuarios: params.usuarios
    });
  },

  /**
   * Despacha el Daily Briefing operativo al grupo general, a los 3 integrantes o a un miembro específico.
   */
  async notifyDailyBriefing(params: {
    mensajeWhatsApp: string;
    mode?: 'grupo' | 'individual' | 'todos_individual';
    targetMemberName?: string;
    whatsappEnabled?: boolean;
    emailEnabled?: boolean;
    config?: ConfiguracionTaller | null;
    usuarios?: UsuarioTaller[];
  }): Promise<DispatchSummary> {
    const mode = params.mode || 'grupo';
    const isIndividual = mode === 'individual' && Boolean(params.targetMemberName);
    const resolved = resolveTaskRecipients(
      isIndividual ? params.targetMemberName! : 'Todos',
      params.usuarios,
      params.config,
      'general',
      mode === 'grupo'
    );

    const contacts = getTeamContacts(params.usuarios);
    const whatsappTargets =
      mode === 'todos_individual'
        ? contacts
            .filter(c => Boolean(c.telefonoE164))
            .map(c => ({
              type: 'individual' as const,
              label: c.nombreCorto,
              whatsappTarget: c.telefonoE164,
              correo: c.correo
            }))
        : resolved.whatsappTargets;

    const today = new Date().toISOString().slice(0, 10);

    return this.dispatch({
      context: 'general',
      entidadTipo: 'daily_briefing',
      whatsappEnabled: params.whatsappEnabled ?? true,
      emailEnabled: params.emailEnabled ?? (params.config?.email_auto_send !== false),
      whatsappTargets,
      emailTargets: resolved.emailTargets,
      whatsappText: params.mensajeWhatsApp,
      emailSubject: `🌅 Daily Briefing Operativo — WJGEEKS 3D (${today})`,
      emailType: 'alerta_equipo',
      emailData: {
        numero_doc: 'BRIEFING',
        titulo: 'Reporte Diario Operativo WJGEEKS 3D',
        mensaje_personalizado: params.mensajeWhatsApp,
        fecha: today
      },
      tallerConfig: params.config,
      usuarios: params.usuarios
    });
  },

  getTeamContacts
};
