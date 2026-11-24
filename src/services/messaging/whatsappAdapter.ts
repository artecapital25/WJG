import { WhatsAppGatewayService } from '../whatsappGatewayService';

export interface WhatsAppAdapterResult {
  success: boolean;
  id?: string;
  error?: string;
  wokeAttempted: boolean;
  fallbackUrl?: string;
  isGroup: boolean;
}

function isWakeableFailure(error?: string): boolean {
  if (!error) return true;
  const e = error.toLowerCase();
  return (
    e.includes('abort') ||
    e.includes('timeout') ||
    e.includes('network') ||
    e.includes('failed to fetch') ||
    e.includes('no responde') ||
    e.includes('502') ||
    e.includes('503') ||
    e.includes('504')
  );
}

/**
 * Envía mensaje vía Gateway QR (individual o grupo @g.us) con wake-up retry automático para Render.
 */
export async function sendWhatsAppWithRetry(
  target: string,
  message: string,
  options?: { allowWakeUpRetry?: boolean }
): Promise<WhatsAppAdapterResult> {
  const isGroup = String(target || '').includes('@g.us');
  const firstRes = await WhatsAppGatewayService.sendTextMessage(target, message);

  if (firstRes.success) {
    return {
      success: true,
      id: firstRes.id,
      wokeAttempted: false,
      fallbackUrl: firstRes.fallbackUrl,
      isGroup
    };
  }

  const allowRetry = options?.allowWakeUpRetry !== false;
  if (!allowRetry || !isWakeableFailure(firstRes.error)) {
    return {
      success: false,
      error: firstRes.error || 'Error enviando por WhatsApp Gateway.',
      wokeAttempted: false,
      fallbackUrl: firstRes.fallbackUrl,
      isGroup
    };
  }

  // Intento único de despertar el servidor Render y reintentar
  let wokeAttempted = true;
  try {
    await WhatsAppGatewayService.requestGateway('/health', { method: 'GET' }, 18000);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const retryRes = await WhatsAppGatewayService.sendTextMessage(target, message);
    if (retryRes.success) {
      return {
        success: true,
        id: retryRes.id,
        wokeAttempted,
        fallbackUrl: retryRes.fallbackUrl,
        isGroup
      };
    }
    return {
      success: false,
      error: retryRes.error || firstRes.error,
      wokeAttempted,
      fallbackUrl: retryRes.fallbackUrl || firstRes.fallbackUrl,
      isGroup
    };
  } catch (err: any) {
    return {
      success: false,
      error: firstRes.error || err?.message || 'Gateway de WhatsApp no disponible.',
      wokeAttempted,
      fallbackUrl: firstRes.fallbackUrl,
      isGroup
    };
  }
}
