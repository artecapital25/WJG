import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockInvoke = vi.fn();
const mockInsert = vi.fn();

vi.mock('../../supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    functions: {
      invoke: (...args: any[]) => mockInvoke(...args)
    },
    from: () => ({
      insert: (...args: any[]) => mockInsert(...args)
    })
  }
}));

import {
  getTeamContacts,
  findTeamContactByName,
  resolveTaskRecipients,
  getConfiguredGroupChannels
} from '../recipientDirectory';
import {
  buildTareaMessage,
  buildSOSInsumoMessage,
  buildStockBajoBatchMessage
} from '../messageTemplates';
import { sendWhatsAppWithRetry } from '../whatsappAdapter';
import { sendVerifiedEmail } from '../emailAdapter';
import { MessagingHubService } from '../messagingHubService';
import { WhatsAppGatewayService } from '../../whatsappGatewayService';
import { getHandoffConfig } from '../../../features/workshop/utils/workshopUtils';
import { generarTextoRecordatorioCobro } from '../../posService';
import type { ConfiguracionTaller, OrdenTrabajo, SolicitudInsumo, TareaEquipo } from '../../../types';
import type { VentaExpress } from '../../../types/pos';
import type { UsuarioTaller } from '../../../types/usuarios.types';

const mockUsuarios: UsuarioTaller[] = [
  {
    id: 'u-german',
    nombre: 'Germán Eduardo Reyes Vasquez',
    email: 'german.951026@gmail.com',
    telefono: '3503443140',
    telefono_notificaciones: '3503443140',
    rol: 'ADMIN_COBRANZAS',
    permisos_areas: ['ventas', 'taller', 'finanzas', 'gestion', 'herramientas'],
    activo: true
  },
  {
    id: 'u-juan',
    nombre: 'Juan',
    email: 'davidguz0812@gmail.com',
    telefono: '3217273025',
    telefono_notificaciones: '3217273025',
    rol: 'IMPRESION_MANTENIMIENTO',
    permisos_areas: ['taller', 'herramientas'],
    activo: true
  },
  {
    id: 'u-wendy',
    nombre: 'Wendy',
    email: 'wendysami97@gmail.com',
    telefono: '3204814702',
    telefono_notificaciones: '3204814702',
    rol: 'PINTURA_ACABADOS',
    permisos_areas: ['taller', 'finanzas', 'gestion'],
    activo: true
  }
];

const mockTallerConfig: ConfiguracionTaller = {
  tarifa_kwh: 900,
  margen_merma_resina: 10,
  telefono_contacto: '3202796115',
  telefono_contacto2: '3503443140',
  correo: 'wjgeeks3d@gmail.com',
  instagram: '@wjgeeks3d',
  nequi: '3202796115',
  bre_b: '0090778625',
  titular_cuenta: 'WJGEEKS 3D',
  whatsapp_grupos_config: {
    general: { jid: '120363000111@g.us', nombre: 'WJGEEKS General' },
    tareas: { jid: '120363000222@g.us', nombre: 'WJGEEKS Pendientes' },
    insumos: { jid: '120363000333@g.us', nombre: 'WJGEEKS Compras' }
  }
};

const sampleTarea: TareaEquipo = {
  id: 'tarea-001',
  titulo: 'Calibrar cama Bambu P1S',
  descripcion: 'Revisar nivelación antes de lote nocturno',
  asignado_a: 'Juan',
  prioridad: 'alta',
  tipo: 'puntual',
  completada: false,
  fecha_creacion: '2026-11-24T12:00:00Z',
  fecha_limite: '2026-11-25'
};

const sampleSOS: SolicitudInsumo = {
  id: 'sos-001',
  insumo_nombre: 'Resina Sunlu ABS-Like Gris',
  categoria: 'Resina',
  cantidad: 2,
  unidad: 'litros',
  urgencia: 'urgente',
  solicitado_por: 'Wendy',
  encargado_compra: 'Wendy',
  estado: 'pendiente',
  fecha_solicitud: '2026-11-24T12:30:00Z',
  notas: 'Stock crítico debajo de 200ml'
};

describe('MessagingHubService & Centralización de Mensajería', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recipientDirectory', () => {
    it('resuelve contactos desde usuarios_taller y encuentra nombres sin tilde', () => {
      const contacts = getTeamContacts(mockUsuarios);
      expect(contacts).toHaveLength(3);

      const german = findTeamContactByName('German', mockUsuarios);
      expect(german?.nombre).toBe('Germán Eduardo Reyes Vasquez');
      expect(german?.telefonoE164).toBe('573503443140');
      expect(german?.correo).toBe('german.951026@gmail.com');
    });

    it('enruta tareas individuales a 1 WhatsApp personal y 1 correo personal', () => {
      const resolved = resolveTaskRecipients('Juan', mockUsuarios, mockTallerConfig, 'tareas');
      expect(resolved.isGroupTarget).toBe(false);
      expect(resolved.whatsappTargets).toHaveLength(1);
      expect(resolved.whatsappTargets[0].type).toBe('individual');
      expect(resolved.whatsappTargets[0].whatsappTarget).toBe('573217273025');
      expect(resolved.emailTargets).toEqual([
        { correo: 'davidguz0812@gmail.com', nombre: 'Juan' }
      ]);
    });

    it('enruta tareas grupales ("Todos") al grupo @g.us del canal y correos de los 3 integrantes', () => {
      const resolved = resolveTaskRecipients('Todos', mockUsuarios, mockTallerConfig, 'tareas');
      expect(resolved.isGroupTarget).toBe(true);
      expect(resolved.whatsappTargets).toHaveLength(1);
      expect(resolved.whatsappTargets[0].type).toBe('group');
      expect(resolved.whatsappTargets[0].whatsappTarget).toBe('120363000222@g.us');
      expect(resolved.emailTargets).toHaveLength(3);
    });

    it('hace fallback al grupo general cuando un canal específico no está configurado', () => {
      const resolved = resolveTaskRecipients('Todos', mockUsuarios, mockTallerConfig, 'taller');
      expect(resolved.groupConfigured?.jid).toBe('120363000111@g.us');
      expect(resolved.whatsappTargets[0].whatsappTarget).toBe('120363000111@g.us');
    });

    it('si no hay ningún grupo configurado, envía individualmente por WhatsApp a los 3 integrantes', () => {
      const sinGrupos: ConfiguracionTaller = { ...mockTallerConfig, whatsapp_grupos_config: undefined };
      WhatsAppGatewayService.saveConfig({ internalGroupJid: '', gruposConfig: undefined });
      const resolved = resolveTaskRecipients('Todos', mockUsuarios, sinGrupos, 'tareas');
      expect(resolved.isGroupTarget).toBe(true);
      expect(resolved.groupConfigured).toBeNull();
      expect(resolved.whatsappTargets).toHaveLength(3);
      expect(resolved.whatsappTargets.every(t => t.type === 'individual')).toBe(true);
    });
  });

  describe('messageTemplates', () => {
    it('construye mensaje de tarea con prioridad, tipo, fecha límite y tracking url', () => {
      const built = buildTareaMessage(sampleTarea, 'asignada');
      expect(built.whatsappText).toContain('Calibrar cama Bambu P1S');
      expect(built.whatsappText).toContain('2026-11-25');
      expect(built.emailType).toBe('tarea_asignada');
      expect(built.emailSubject).toContain('Juan');
      expect(built.trackingUrl).toContain('?tab=tareas');
    });

    it('construye mensajes S.O.S Insumo y lote de stock bajo', () => {
      const sosMsg = buildSOSInsumoMessage(sampleSOS, 'creada');
      expect(sosMsg.emailType).toBe('sos_insumo');
      expect(sosMsg.whatsappText).toContain('Resina Sunlu ABS-Like Gris');

      const batchMsg = buildStockBajoBatchMessage([sampleSOS]);
      expect(batchMsg.emailType).toBe('stock_bajo');
      expect(batchMsg.emailSubject).toContain('1 ítem');
      expect(batchMsg.whatsappText).toContain('Stock bajo');
    });
  });

  describe('whatsappAdapter', () => {
    it('despierta Render con /health y reintenta una vez ante timeout o 503', async () => {
      const sendSpy = vi
        .spyOn(WhatsAppGatewayService, 'sendTextMessage')
        .mockResolvedValueOnce({
          success: false,
          error: 'HTTP 503: Service Unavailable',
          fallbackUrl: 'https://wa.me/573217273025'
        })
        .mockResolvedValueOnce({
          success: true,
          id: 'wa-msg-retry-ok'
        });

      const healthSpy = vi
        .spyOn(WhatsAppGatewayService, 'requestGateway')
        .mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));

      const result = await sendWhatsAppWithRetry('573217273025', 'Hola Juan');
      expect(healthSpy).toHaveBeenCalledWith('/health', { method: 'GET' }, 18000);
      expect(sendSpy).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.wokeAttempted).toBe(true);
      expect(result.id).toBe('wa-msg-retry-ok');
    });

    it('no reintenta con /health ante error de sesión no conectada y preserva fallbackUrl', async () => {
      vi.spyOn(WhatsAppGatewayService, 'sendTextMessage').mockResolvedValueOnce({
        success: false,
        error: 'Sesión WhatsApp no autenticada (escanea QR)',
        fallbackUrl: 'https://wa.me/573217273025'
      });
      const healthSpy = vi.spyOn(WhatsAppGatewayService, 'requestGateway');

      const result = await sendWhatsAppWithRetry('573217273025', 'Hola');
      expect(healthSpy).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.wokeAttempted).toBe(false);
      expect(result.fallbackUrl).toBe('https://wa.me/573217273025');
    });
  });

  describe('emailAdapter', () => {
    it('reporta fallo real y needsAppsScriptUpdate cuando la Edge Function detecta Apps Script antiguo', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: false,
          verified: false,
          needsAppsScriptUpdate: true,
          error: 'Apps Script antiguo sin action=send_email'
        },
        error: null
      });

      const res = await sendVerifiedEmail({
        tipo: 'tarea_asignada',
        destinatarios: [{ correo: 'davidguz0812@gmail.com', nombre: 'Juan' }],
        asunto: 'Prueba',
        tallerConfig: mockTallerConfig
      });

      expect(res.success).toBe(false);
      expect(res.verified).toBe(false);
      expect(res.needsAppsScriptUpdate).toBe(true);
    });

    it('confirma entrega verificada cuando la Edge Function responde verified=true', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          verified: true,
          provider: 'resend',
          messageId: 're_12345'
        },
        error: null
      });

      const res = await sendVerifiedEmail({
        tipo: 'tarea_asignada',
        destinatarios: [{ correo: 'davidguz0812@gmail.com', nombre: 'Juan' }],
        asunto: 'Tarea Calibración',
        tallerConfig: mockTallerConfig
      });

      expect(res.success).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.provider).toBe('resend');
      expect(res.messageId).toBe('re_12345');
    });
  });

  describe('MessagingHubService.dispatch', () => {
    it('ejecuta WhatsApp y Correo en paralelo sin que el fallo de un canal bloquee el otro', async () => {
      vi.spyOn(WhatsAppGatewayService, 'sendTextMessage').mockResolvedValueOnce({
        success: true,
        id: 'wa-ok-1'
      });

      mockInvoke.mockResolvedValueOnce({
        data: {
          success: false,
          verified: false,
          needsAppsScriptUpdate: true,
          error: 'Falta action=send_email'
        },
        error: null
      });

      const summary = await MessagingHubService.notifyTask(sampleTarea, 'asignada', {
        config: mockTallerConfig,
        usuarios: mockUsuarios
      });

      expect(summary.whatsappOkCount).toBe(1);
      expect(summary.whatsappFailCount).toBe(0);
      expect(summary.emailOkCount).toBe(0);
      expect(summary.emailFailCount).toBe(1);
      expect(summary.needsAppsScriptUpdate).toBe(true);
      expect(summary.success).toBe(true);
    });
  });

  describe('Ola 2: Clientes externos, Taller OTs, Daily Briefing y Cobros', () => {
    const sampleOT: OrdenTrabajo = {
      id: 'ot-001',
      numero_ot: 'OT-0099',
      cotizacion_id: 'cot-99',
      cotizacion_numero: 'COT-26-099',
      cliente_nombre: 'Carlos Collector',
      cliente_telefono: '3001112233',
      item_nombre: 'Busto Batman 1/6',
      cantidad: 1,
      estado: 'Pintura y Armado',
      operador_asignado: 'Wendy',
      fecha_creacion: '2026-11-24T10:00:00Z',
      tiempo_impresion_min: 180,
      tiempo_armado_min: 30,
      tiempo_pintura_min: 90,
      resina_nombre: 'Sunlu ABS-Like',
      maquina_nombre: 'Anycubic MONO 4',
      detalles_tecnicos: 'Base magnética',
      saldo_pendiente: 85000
    };

    const sampleVenta: VentaExpress = {
      id: 'pos-001',
      numero_venta: 'POS-045',
      nombre_producto: 'Figura Luffy Gear 5',
      cliente_nombre: 'Laura Gómez',
      cliente_telefono: '3112223344',
      total: 120000,
      abono: 50000,
      saldo_pendiente: 70000,
      estado_pago: 'Abono Parcial',
      fecha_venta: '2026-11-24',
      fecha_prometida_pago: '2026-11-28'
    };

    it('notifyExternalClient envía WhatsApp externo y correo verificado en paralelo', async () => {
      const sendSpy = vi.spyOn(WhatsAppGatewayService, 'sendTextMessage').mockResolvedValueOnce({
        success: true,
        id: 'wa-ext-1'
      });

      mockInvoke.mockResolvedValueOnce({
        data: { success: true, verified: true, provider: 'apps_script', messageId: 'mail-ext-1' },
        error: null
      });

      const summary = await MessagingHubService.notifyExternalClient({
        context: 'cotizacion',
        entidadTipo: 'cotizacion',
        entidadId: 'cot-99',
        clienteNombre: 'Carlos Collector',
        clienteTelefono: '3001112233',
        clienteCorreo: 'carlos@ejemplo.com',
        whatsappText: 'Cotización lista para revisión',
        emailSubject: 'Cotización N° 26-099',
        emailType: 'cotizacion',
        config: mockTallerConfig
      });

      expect(sendSpy).toHaveBeenCalledWith('573001112233', 'Cotización lista para revisión');
      expect(summary.whatsappOkCount).toBe(1);
      expect(summary.emailOkCount).toBe(1);
      expect(summary.results[0].channel).toBe('whatsapp_individual');
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });

    it('notifyWorkshopHandoff enruta inspección tripartita al grupo taller (fallback general) + 3 correos', async () => {
      const sendSpy = vi.spyOn(WhatsAppGatewayService, 'sendTextMessage').mockResolvedValueOnce({
        success: true,
        id: 'wa-taller-group-1'
      });

      mockInvoke.mockResolvedValueOnce({
        data: { success: true, verified: true, provider: 'resend', messageId: 'mail-team-1' },
        error: null
      });

      const handoff = getHandoffConfig(sampleOT, mockTallerConfig, mockUsuarios);
      expect(handoff.isGrupoEquipo).toBe(true);

      const summary = await MessagingHubService.notifyWorkshopHandoff({
        ot: sampleOT,
        destinatarioNombre: handoff.nombre,
        destinatarioTelefono: handoff.telefono,
        isGrupoEquipo: handoff.isGrupoEquipo,
        whatsappText: handoff.mensaje,
        config: mockTallerConfig,
        usuarios: mockUsuarios
      });

      expect(sendSpy).toHaveBeenCalledWith('120363000111@g.us', handoff.mensaje);
      expect(summary.whatsappOkCount).toBe(1);
      expect(summary.emailOkCount).toBe(1);
      expect(summary.results.some(r => r.channel === 'whatsapp_group')).toBe(true);
    });

    it('notifyWorkshopHandoff y getHandoffConfig resuelven integrante individual desde usuarios_taller', async () => {
      const sendSpy = vi.spyOn(WhatsAppGatewayService, 'sendTextMessage').mockResolvedValueOnce({
        success: true,
        id: 'wa-wendy-1'
      });

      mockInvoke.mockResolvedValueOnce({
        data: { success: true, verified: true, provider: 'apps_script', messageId: 'mail-wendy-1' },
        error: null
      });

      const otCurado: OrdenTrabajo = { ...sampleOT, estado: 'Curado' };
      const handoff = getHandoffConfig(otCurado, mockTallerConfig, mockUsuarios);
      expect(handoff.isGrupoEquipo).toBeUndefined();
      expect(handoff.telefono).toBe('573204814702');
      expect(handoff.correo).toBe('wendysami97@gmail.com');

      const summary = await MessagingHubService.notifyWorkshopHandoff({
        ot: otCurado,
        destinatarioNombre: handoff.nombre,
        destinatarioTelefono: handoff.telefono,
        destinatarioCorreo: handoff.correo,
        whatsappText: handoff.mensaje,
        config: mockTallerConfig,
        usuarios: mockUsuarios
      });

      expect(sendSpy).toHaveBeenCalledWith('573204814702', handoff.mensaje);
      expect(summary.whatsappOkCount).toBe(1);
      expect(summary.emailOkCount).toBe(1);
    });

    it('notifyDailyBriefing despacha al grupo general @g.us y a los 3 correos del equipo', async () => {
      const sendSpy = vi.spyOn(WhatsAppGatewayService, 'sendTextMessage').mockResolvedValueOnce({
        success: true,
        id: 'wa-briefing-group'
      });

      mockInvoke.mockResolvedValueOnce({
        data: { success: true, verified: true, provider: 'resend', messageId: 'mail-briefing' },
        error: null
      });

      const summary = await MessagingHubService.notifyDailyBriefing({
        mensajeWhatsApp: '🌅 Reporte Diario Operativo',
        mode: 'grupo',
        config: mockTallerConfig,
        usuarios: mockUsuarios
      });

      expect(sendSpy).toHaveBeenCalledWith('120363000111@g.us', '🌅 Reporte Diario Operativo');
      expect(summary.whatsappOkCount).toBe(1);
      expect(summary.emailOkCount).toBe(1);
    });

    it('generarTextoRecordatorioCobro incluye saldo pendiente y llave Bre-B configurada', () => {
      const texto = generarTextoRecordatorioCobro(sampleVenta, mockTallerConfig);
      expect(texto).toContain('Laura Gómez');
      expect(texto).toContain('POS-045');
      expect(texto).toContain('70.000');
      expect(texto).toContain('0090778625');
    });

    it('getConfiguredGroupChannels combina los 5 canales base con grupos personalizados y protege canales de clientes', () => {
      const cfgConPersonalizados: ConfiguracionTaller = {
        ...mockTallerConfig,
        whatsapp_grupos_config: {
          ...(mockTallerConfig.whatsapp_grupos_config || {}),
          custom_vip_1001: {
            jid: '120363000999@g.us',
            nombre: 'Difusión Clientes VIP',
            etiqueta: 'Difusión Clientes VIP',
            audiencia: 'clientes',
            esPersonalizado: true
          },
          custom_clientes_sin_jid: {
            jid: '',
            nombre: 'Canal Sin JID',
            etiqueta: 'Canal Sin JID',
            audiencia: 'clientes',
            esPersonalizado: true
          }
        }
      };

      const channels = getConfiguredGroupChannels(cfgConPersonalizados);
      expect(channels.length).toBeGreaterThanOrEqual(7);
      const vip = channels.find(c => c.id === 'custom_vip_1001');
      expect(vip?.audiencia).toBe('clientes');
      expect(vip?.jid).toBe('120363000999@g.us');

      expect(WhatsAppGatewayService.resolveGroup('custom_vip_1001', cfgConPersonalizados)?.jid).toBe(
        '120363000999@g.us'
      );
      // Canal de clientes sin JID nunca debe hacer fallback silencioso al grupo interno del equipo
      expect(WhatsAppGatewayService.resolveGroup('custom_clientes_sin_jid', cfgConPersonalizados)).toBeNull();
    });
  });
});
