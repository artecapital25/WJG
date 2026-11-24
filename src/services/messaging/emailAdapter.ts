import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { GoogleSheetsSyncService, OFFICIAL_APPS_SCRIPT_URL } from '../googleSheetsSyncService';
import { ConfiguracionTaller } from '../../types';
import { EmailTipo } from './messagingTypes';

export interface VerifiedEmailRequest {
  tipo: EmailTipo;
  destinatarios: Array<{ correo: string; nombre?: string }>;
  asunto: string;
  tracking_url?: string;
  texto_plano?: string;
  datos?: Record<string, any>;
  tallerConfig?: ConfiguracionTaller | null;
}

export interface VerifiedEmailResult {
  success: boolean;
  verified: boolean;
  provider?: string;
  messageId?: string;
  error?: string;
  needsAppsScriptUpdate?: boolean;
}

/**
 * Envía correo transaccional de forma verificada a través de la Edge Function `send-transactional-email`.
 * Nunca usa `mode: 'no-cors'` ciego ni marca éxito simulado.
 */
export async function sendVerifiedEmail(req: VerifiedEmailRequest): Promise<VerifiedEmailResult> {
  const validRecipients = (req.destinatarios || []).filter(
    r => r?.correo && r.correo.includes('@')
  );

  if (validRecipients.length === 0) {
    return {
      success: false,
      verified: false,
      error: 'No hay ningún correo electrónico válido para los destinatarios.'
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      verified: false,
      error: 'Supabase no está configurado en este entorno para invocar la función de correo.'
    };
  }

  const sheetsCfg = GoogleSheetsSyncService.getConfig();
  const appsScriptUrl = (
    req.tallerConfig?.email_apps_script_url ||
    (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL ||
    sheetsCfg.webAppUrl ||
    OFFICIAL_APPS_SCRIPT_URL ||
    ''
  ).trim();

  try {
    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        tipo: req.tipo,
        destinatario_correo: validRecipients[0].correo,
        destinatario_nombre: validRecipients[0].nombre || 'Equipo WJGEEKS',
        destinatarios: validRecipients,
        asunto: req.asunto,
        tracking_url: req.tracking_url,
        texto_plano: req.texto_plano,
        datos: req.datos || {},
        apps_script_url: appsScriptUrl
      }
    });

    if (error) {
      return {
        success: false,
        verified: false,
        error: error.message || 'Error invocando la función de correo en Supabase.'
      };
    }

    if (data?.success && data?.verified) {
      return {
        success: true,
        verified: true,
        provider: data.provider,
        messageId: data.messageId
      };
    }

    return {
      success: false,
      verified: false,
      provider: data?.provider,
      needsAppsScriptUpdate: Boolean(data?.needsAppsScriptUpdate),
      error:
        data?.error ||
        'El servidor de correo no confirmó la entrega. Verifica la configuración de Apps Script o Resend.'
    };
  } catch (err: any) {
    return {
      success: false,
      verified: false,
      error: err?.message || 'Error de red enviando correo transaccional.'
    };
  }
}
