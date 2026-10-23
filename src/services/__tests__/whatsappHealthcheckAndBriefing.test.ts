import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabaseClient', () => ({
  supabase: {
    rpc: vi.fn().mockImplementation((fnName: string) => {
      if (fnName === 'fn_whatsapp_healthcheck') {
        return Promise.resolve({
          data: {
            status: 'operativo',
            linea_oficial: '+57 320 2796115',
            motor_activo: true,
            total_ultimas_24h: 12,
            enviados_24h: 12,
            fallidos_24h: 0,
            pendientes_cola: 0,
            estancados_mas_15m: 0,
            tasa_fallo_pct: 0,
            mensajes_programados_hoy: 4,
            alerta_mensaje: 'Motor WhatsApp en modo operativo (Supabase Cloud).',
            evaluado_at: new Date().toISOString()
          },
          error: null
        });
      }
      if (fnName === 'get_daily_company_briefing') {
        return Promise.resolve({
          data: {
            success: true,
            mensaje_whatsapp: `🌅 *WJGEEKS 3D PRO — REPORTE DIARIO OPERATIVO*
Línea oficial: +57 320 2796115
Llave Bre-B: 0090778625
*ESTADO DE LA MENSAJERÍA AUTOMÁTICA*
*COMPROMISOS FINANCIEROS Y COBRANZAS*
*OPERACIÓN DE TALLER Y ENTREGAS*
*INSUMOS Y LOGÍSTICA*
*ACCIONES PRIORITARIAS PARA EL DÍA*`
          },
          error: null
        });
      }
      return Promise.resolve({ data: null, error: null });
    })
  },
  isSupabaseConfigured: true
}));

import { WhatsAppNotificationService } from '../whatsappNotificationService';

describe('WhatsApp Healthcheck & Daily Briefing Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. obtenerSaludWhatsApp: Retorna estado operativo por defecto y línea oficial +57 320 2796115', async () => {
    const health = await WhatsAppNotificationService.obtenerSaludWhatsApp();

    expect(health).toBeDefined();
    expect(health.linea_oficial).toBe('+57 320 2796115');
    expect(health.status).toBe('operativo');
    expect(health.motor_activo).toBe(true);
    expect(health.tasa_fallo_pct).toBe(0);
    expect(health.estancados_mas_15m).toBe(0);
  });

  it('2. ejecutarPingWhatsApp: Valida conectividad y modo con la línea oficial', async () => {
    const ping = await WhatsAppNotificationService.ejecutarPingWhatsApp();

    expect(ping).toBeDefined();
    expect(ping.valido).toBe(true);
    expect(ping.linea_oficial).toBe('+57 320 2796115');
    expect(ping.mensaje).toContain('+57 320 2796115');
  });

  it('3. obtenerDailyBriefing: Genera reporte estructurado con Bre-B (0090778625) y línea oficial', async () => {
    const briefing = await WhatsAppNotificationService.obtenerDailyBriefing();

    expect(briefing).toBeDefined();
    expect(briefing.success).toBe(true);
    expect(briefing.mensaje_whatsapp).toContain('WJGEEKS 3D PRO — REPORTE DIARIO OPERATIVO');
    expect(briefing.mensaje_whatsapp).toContain('+57 320 2796115');
    expect(briefing.mensaje_whatsapp).toContain('0090778625'); // Llave Bre-B
    expect(briefing.mensaje_whatsapp).toContain('ESTADO DE LA MENSAJERÍA AUTOMÁTICA');
    expect(briefing.mensaje_whatsapp).toContain('COMPROMISOS FINANCIEROS Y COBRANZAS');
    expect(briefing.mensaje_whatsapp).toContain('OPERACIÓN DE TALLER Y ENTREGAS');
    expect(briefing.mensaje_whatsapp).toContain('INSUMOS Y LOGÍSTICA');
    expect(briefing.mensaje_whatsapp).toContain('ACCIONES PRIORITARIAS PARA EL DÍA');
  });

  it('4. generarEnlaceWhatsAppBriefing: Construye URL válida para WhatsApp Web/Móvil con destinatario admin', () => {
    const mensaje = '🌅 *WJGEEKS 3D PRO — REPORTE DIARIO*';
    const urlGerman = WhatsAppNotificationService.generarEnlaceWhatsAppBriefing(mensaje, '573503443140');
    const urlWendy = WhatsAppNotificationService.generarEnlaceWhatsAppBriefing(mensaje, '3204814702');

    expect(urlGerman).toContain('https://wa.me/573503443140?text=');
    expect(urlWendy).toContain('https://wa.me/573204814702?text=');
    expect(urlGerman).toContain(encodeURIComponent(mensaje));
  });

  it('5. despacharDailyBriefing: Ejecuta el despacho simulado cuando no hay API externa conectada', async () => {
    const res = await WhatsAppNotificationService.despacharDailyBriefing({ force: true });

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });
});
