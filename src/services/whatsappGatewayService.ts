/**
 * ==============================================================================
 * SERVICIO DE CONEXIÓN WHATSAPP GATEWAY (OPCIÓN A - SESIÓN QR WEB)
 * WJGEEKS 3D PRO v3.1
 * Línea Oficial: +57 320 2796115
 * ==============================================================================
 * Conecta con un Gateway REST de WhatsApp (Evolution API, Baileys, UltraMsg o
 * el servidor local scripts/whatsapp_gateway_server.cjs).
 * Permite enviar mensajes de forma 100% automática en segundo plano sin perder
 * la app móvil de WhatsApp en el celular de la empresa.
 * ==============================================================================
 */

import { formatWhatsAppPhone } from './whatsappService';
import { toast } from '../components/ui/ToastProvider';

export interface WhatsAppGatewayConfig {
  provider: 'qr_gateway' | 'meta_cloud_api';
  gatewayUrl: string;
  apiKey?: string;
  instanceName?: string;
  autoSendEnabled: boolean;
  officialPhone: string;
  metaCloudToken?: string;
  metaPhoneNumberId?: string;
}

const STORAGE_KEY_WA_GATEWAY = 'wjg_whatsapp_gateway_config';

const DEFAULT_CONFIG: WhatsAppGatewayConfig = {
  provider: 'qr_gateway',
  gatewayUrl: (import.meta as any).env?.VITE_WHATSAPP_GATEWAY_URL || 'https://wjg.onrender.com',
  apiKey: (import.meta as any).env?.VITE_WHATSAPP_GATEWAY_KEY || '',
  instanceName: 'wjgeeks3d',
  autoSendEnabled: true,
  officialPhone: '+57 320 2796115',
  metaCloudToken: (import.meta as any).env?.VITE_META_CLOUD_TOKEN || '',
  metaPhoneNumberId: (import.meta as any).env?.VITE_META_PHONE_NUMBER_ID || ''
};

export interface GatewayStatusResponse {
  connected: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'qr_ready' | 'error';
  phone?: string;
  qrCode?: string; // Base64 image o raw string
  pairingCode?: string;
  message?: string;
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
  return null;
}

export const WhatsAppGatewayService = {
  /**
   * Obtiene la configuración actual del Gateway
   */
  getConfig(): WhatsAppGatewayConfig {
    const storage = getStorage();
    if (!storage) return DEFAULT_CONFIG;
    try {
      const stored = storage.getItem(STORAGE_KEY_WA_GATEWAY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Si el usuario tenía localhost o vacío o en HTTPS tenía HTTP plano, usar la nube oficial de Render
        const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
        if (!parsed.gatewayUrl || (isHttps && parsed.gatewayUrl.startsWith('http://'))) {
          parsed.gatewayUrl = 'https://wjg.onrender.com';
        }
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (_) {}
    return DEFAULT_CONFIG;
  },

  /**
   * Guarda cambios en la configuración del Gateway
   */
  saveConfig(newConfig: Partial<WhatsAppGatewayConfig>): WhatsAppGatewayConfig {
    const updated = { ...this.getConfig(), ...newConfig };
    const storage = getStorage();
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY_WA_GATEWAY, JSON.stringify(updated));
      } catch (_) {}
    }
    return updated;
  },

  /**
   * Obtiene la lista ordenada de URLs candidatas para contactar el Gateway
   * garantizando soporte para Vite proxy (/api/wa), localhost y acceso desde red local.
   */
  getGatewayCandidates(): string[] {
    const config = this.getConfig();
    const primary = (config.gatewayUrl || '').trim().replace(/\/+$/, '');
    const list: string[] = [];

    const isBrowser = typeof window !== 'undefined';
    const isHttps = isBrowser && window.location?.protocol === 'https:';

    // 1. URL Primaria explícita configurada (o Cloud de Render por defecto)
    if (primary) {
      if (isHttps) {
        if (primary.startsWith('https://') || primary.startsWith('/')) {
          list.push(primary);
        }
      } else {
        list.push(primary);
      }
    }

    // 2. Nube 24/7 oficial en Render (Siempre disponible)
    if (!list.includes('https://wjg.onrender.com')) {
      list.push('https://wjg.onrender.com');
    }

    // 2. Fallbacks de red local y desarrollo (SOLO en HTTP local, nunca en HTTPS público)
    if (isBrowser) {
      if (!isHttps) {
        // Proxy local Vite para resolver CORS y bloqueos de red privada
        if (!list.includes('/api/wa')) {
          list.push('/api/wa');
        }
        // Si navegamos desde otro dispositivo en la misma red Wi-Fi
        if (window.location?.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          const lanUrl = `http://${window.location.hostname}:3001`;
          if (!list.includes(lanUrl)) {
            list.push(lanUrl);
          }
        }
        if (!list.includes('http://localhost:3001')) {
          list.push('http://localhost:3001');
        }
        if (!list.includes('http://127.0.0.1:3001')) {
          list.push('http://127.0.0.1:3001');
        }
      }
    } else {
      if (!list.includes('http://localhost:3001')) {
        list.push('http://localhost:3001');
      }
    }

    return list;
  },

  /**
   * Ejecuta una petición HTTP al Gateway intentando las URLs candidatas
   */
  async requestGateway(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 4000
  ): Promise<Response> {
    const config = this.getConfig();
    const candidates = this.getGatewayCandidates();
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const isBrowser = typeof window !== 'undefined';
    const isHttps = isBrowser && window.location?.protocol === 'https:';

    if (candidates.length === 0) {
      if (isHttps) {
        throw new Error('MixedContentPrevented: En Vercel (HTTPS) se requiere configurar una URL con túnel seguro https:// (Cloudflare o Pinggy).');
      }
      throw new Error('Gateway de WhatsApp no configurado o no disponible en red local.');
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {})
    };
    if (config.apiKey) {
      headers['apikey'] = config.apiKey;
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    let lastError: any = null;
    for (const base of candidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const url = `${base}${path}`;

        const res = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok || res.status === 503 || res.status < 500) {
          return res;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Gateway de WhatsApp no responde en ninguna dirección configurada.');
  },

  /**
   * Consulta el estado de conexión del Gateway y si el QR está disponible
   */
  async checkStatus(): Promise<GatewayStatusResponse> {
    const config = this.getConfig();

    // Modo Meta Cloud API
    if (config.provider === 'meta_cloud_api') {
      if (!config.metaCloudToken || !config.metaPhoneNumberId) {
        return {
          connected: false,
          status: 'disconnected',
          message: 'Falta configurar Meta Cloud Token y Phone Number ID.'
        };
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`https://graph.facebook.com/v21.0/${config.metaPhoneNumberId}?fields=display_phone_number,verified_name`, {
          headers: { 'Authorization': `Bearer ${config.metaCloudToken}` },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return {
            connected: true,
            status: 'connected',
            phone: data.display_phone_number || config.officialPhone,
            message: `Meta Cloud API Conectada (${data.verified_name || 'WJGEEKS 3D'})`
          };
        } else {
          return {
            connected: false,
            status: 'error',
            message: `Error Meta API: ${res.statusText}`
          };
        }
      } catch (err: any) {
        return {
          connected: false,
          status: 'error',
          message: `Fallo de conexión con Meta Cloud: ${err.message}`
        };
      }
    }

    // Modo QR Gateway (Opción A)
    const isBrowser = typeof window !== 'undefined';
    const isHttps = isBrowser && window.location?.protocol === 'https:';
    const candidates = this.getGatewayCandidates();

    if (isHttps && candidates.length === 0) {
      return {
        connected: false,
        status: 'disconnected',
        message: 'Vercel opera bajo HTTPS. Configura tu túnel gratuito (Cloudflare o Pinggy) en Ajustes para despacho automático, o usa el envío asistido.'
      };
    }

    try {
      const res = await this.requestGateway('/status', { method: 'GET' }, 3500);
      if (res.ok) {
        const data = await res.json();
        const isConnected = Boolean(data.connected || data.status === 'connected' || data.state === 'open');
        return {
          connected: isConnected,
          status: isConnected ? 'connected' : (data.qr ? 'qr_ready' : (data.status || 'disconnected')),
          phone: data.phone || data.number || config.officialPhone,
          qrCode: data.qr || data.qrcode || null,
          pairingCode: data.pairingCode || null,
          message: isConnected 
            ? `Conectado exitosamente con ${data.phone || config.officialPhone}` 
            : (data.qr ? 'Código QR listo para escanear' : (data.message || 'Esperando vinculación...'))
        };
      }
    } catch (_) {
      // Fallback
    }

    return {
      connected: false,
      status: 'disconnected',
      message: isHttps 
        ? 'Túnel seguro desconectado. Verifica que tu túnel Cloudflare o Pinggy esté activo en el celular o PC.'
        : 'Gateway local/nube no responde. Si usas el servidor local, ejecútalo con npm run wa:gateway.'
    };
  },

  /**
   * Obtiene el código QR actual para escanear desde WhatsApp > Dispositivos vinculados
   */
  async getQrCode(): Promise<{ success: boolean; qr?: string; message?: string }> {
    try {
      const res = await this.requestGateway('/qr', { method: 'GET' }, 3500);
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          qr: data.qr || data.qrcode || data.base64 || null,
          message: 'Código QR generado correctamente.'
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'No fue posible obtener el código QR del servidor gateway.'
      };
    }

    return { success: false, message: 'Servidor gateway no disponible.' };
  },

  /**
   * Solicita el reseteo limpio de la sesión y purga de credenciales corruptas
   */
  async resetSession(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await this.requestGateway('/reset', { method: 'POST' }, 5000);
      if (res.ok) {
        return await res.json();
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'Error de conexión al resetear sesión' };
    }
    return { success: false, message: 'No se pudo contactar el servidor para resetear la sesión.' };
  },

  /**
   * Solicita código de vinculación de 8 dígitos para vincular sin cámara
   */
  async requestPairingCode(phone: string): Promise<{ success: boolean; code?: string; message?: string }> {
    try {
      const res = await this.requestGateway('/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      }, 7000);
      if (res.ok) {
        return await res.json();
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al solicitar código de vinculación' };
    }
    return { success: false, message: 'Servidor no respondió a la solicitud de código de vinculación.' };
  },

  /**
   * Envía un mensaje de texto de forma 100% automática en segundo plano
   */
  async sendTextMessage(
    destinatarioTelefono: string,
    mensaje: string
  ): Promise<{ success: boolean; id?: string; error?: string; fallbackUrl?: string }> {
    const config = this.getConfig();
    const cleanPhone = formatWhatsAppPhone(destinatarioTelefono);
    const fallbackUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;

    if (!config.autoSendEnabled) {
      return { success: false, fallbackUrl, error: 'Envío automático deshabilitado en ajustes.' };
    }

    // Soporte para Meta Cloud API (si el usuario decide migrar en el futuro)
    if (config.provider === 'meta_cloud_api') {
      if (!config.metaCloudToken || !config.metaPhoneNumberId) {
        return { success: false, fallbackUrl, error: 'Falta configurar Meta Cloud Token y Phone ID.' };
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`https://graph.facebook.com/v21.0/${config.metaPhoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.metaCloudToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { preview_url: false, body: mensaje }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const msgId = data.messages?.[0]?.id || `meta-${Date.now()}`;
          return { success: true, id: msgId };
        } else {
          const errData = await res.json().catch(() => null);
          const errMsg = errData?.error?.message || `Error HTTP ${res.status}`;
          return { success: false, error: errMsg, fallbackUrl };
        }
      } catch (err: any) {
        return { success: false, error: err.message, fallbackUrl };
      }
    }

    // Modo QR Gateway (Opción A - Celular físico activo)
    try {
      const payload = {
        number: cleanPhone,
        phone: cleanPhone,
        to: cleanPhone,
        message: mensaje,
        text: mensaje
      };

      const res = await this.requestGateway('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 7000);

      if (res.ok) {
        const json = await res.json();
        return {
          success: true,
          id: json.id || json.messageId || `msg-${Date.now()}`
        };
      } else {
        const errText = await res.text();
        return {
          success: false,
          error: `Error HTTP ${res.status}: ${errText}`,
          fallbackUrl
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Fallo de red al contactar Gateway',
        fallbackUrl
      };
    }
  }
};
