const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createStorageMock() as any;
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: globalThis.localStorage,
    dispatchEvent: () => true
  };
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WhatsAppGatewayService } from '../whatsappGatewayService';
import { WhatsAppNotificationService } from '../whatsappNotificationService';
import { openWhatsApp } from '../whatsappService';
import { EmailNotificationService, LINEA_CENTRAL_EMPRESA } from '../emailNotificationService';

describe('WhatsApp Gateway & Notificaciones Automáticas (WJGEEKS 3D PRO)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    WhatsAppGatewayService.saveConfig({
      provider: 'qr_gateway',
      gatewayUrl: 'http://localhost:3001',
      autoSendEnabled: true,
      officialPhone: '+57 320 2796115'
    });
  });

  it('1. Debe inicializarse con la línea oficial +57 320 2796115 y proveedor qr_gateway', () => {
    const config = WhatsAppGatewayService.getConfig();
    expect(config.officialPhone).toBe('+57 320 2796115');
    expect(config.provider).toBe('qr_gateway');
    expect(config.autoSendEnabled).toBe(true);
  });

  it('2. Debe permitir alternar a Meta Cloud API para escalabilidad futura', () => {
    WhatsAppGatewayService.saveConfig({
      provider: 'meta_cloud_api',
      metaPhoneNumberId: '1099238495',
      metaCloudToken: 'EAAGMOCKTOKEN'
    });

    const updated = WhatsAppGatewayService.getConfig();
    expect(updated.provider).toBe('meta_cloud_api');
    expect(updated.metaPhoneNumberId).toBe('1099238495');
    expect(updated.metaCloudToken).toBe('EAAGMOCKTOKEN');
  });

  it('3. Debe retornar fallbackUrl wa.me si el Gateway está desconectado o falla', async () => {
    // Forzamos fallo de red
    global.fetch = vi.fn().mockRejectedValue(new Error('Gateway offline'));

    const res = await WhatsAppGatewayService.sendTextMessage('3202796115', 'Mensaje de prueba');
    expect(res.success).toBe(false);
    expect(res.fallbackUrl).toContain('https://wa.me/573202796115?text=Mensaje%20de%20prueba');
  });

  it('4. Debe despachar exitosamente en segundo plano cuando el Gateway responde 200 OK', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'wjg-msg-12345', success: true })
    } as any);

    const res = await WhatsAppGatewayService.sendTextMessage('3217273025', 'Alerta para Juan');
    expect(res.success).toBe(true);
    expect(res.id).toBe('wjg-msg-12345');
  });

  it('5. openWhatsApp debe extraer teléfono y mensaje de wa.me URL y despachar automáticamente', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'wjg-msg-auto-99', success: true })
    } as any);

    const url = 'https://wa.me/573204814702?text=Alerta%20para%20Wendy';
    const sent = await openWhatsApp(url);
    expect(sent).toBe(true);
  });

  it('6. El canal de correo debe originar siempre desde wjgeeks3d@gmail.com', () => {
    expect(LINEA_CENTRAL_EMPRESA.correo).toBe('wjgeeks3d@gmail.com');
    expect(LINEA_CENTRAL_EMPRESA.telefonoE164).toBe('573202796115');
  });

  it('8. En entorno HTTPS (Vercel), no debe incluir candidatos HTTP locales para prevenir Mixed Content', () => {
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      ...originalWindow,
      location: { protocol: 'https:', hostname: 'wjg-lyart.vercel.app' }
    };

    WhatsAppGatewayService.saveConfig({
      gatewayUrl: 'http://localhost:3001'
    });

    const candidates = WhatsAppGatewayService.getGatewayCandidates();
    expect(candidates.every(c => !c.startsWith('http://'))).toBe(true);

    (globalThis as any).window = originalWindow;
  });

  it('9. En entorno HTTPS (Vercel), debe aceptar URLs seguras con túnel Cloudflare o Pinggy', () => {
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      ...originalWindow,
      location: { protocol: 'https:', hostname: 'wjg-lyart.vercel.app' }
    };

    WhatsAppGatewayService.saveConfig({
      gatewayUrl: 'https://wjgeeks-gateway.trycloudflare.com'
    });

    const candidates = WhatsAppGatewayService.getGatewayCandidates();
    expect(candidates).toContain('https://wjgeeks-gateway.trycloudflare.com');

    (globalThis as any).window = originalWindow;
  });

  it('10. openWhatsApp debe extraer teléfono y mensaje de api.whatsapp.com/send URLs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'wjg-msg-alt-format', success: true })
    } as any);

    const url = 'https://api.whatsapp.com/send?phone=573503443140&text=Alerta%20para%20German';
    const sent = await openWhatsApp(url);
    expect(sent).toBe(true);
  });
});
