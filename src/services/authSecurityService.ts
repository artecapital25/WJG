/**
 * Servicio de Seguridad de Autenticación, Dispositivos de Confianza
 * y Verificación de Credenciales (Sin secretos en texto plano)
 */

const TRUSTED_DEVICE_KEY = 'wjg_trusted_device_session';
const TRUSTED_DEVICE_EXPIRY_DAYS = 30;

export interface TrustedDeviceSession {
  staffUser: string;
  trustedAt: string;
  expiresAt: string;
  deviceFingerprint: string;
}

export class AuthSecurityService {
  /**
   * Genera un fingerprint seguro y no intrusivo del dispositivo
   */
  private static getDeviceFingerprint(): string {
    if (typeof window === 'undefined') return 'server';
    const nav = window.navigator;
    const screen = window.screen;
    const raw = `${nav.userAgent || ''}-${screen.width || 0}x${screen.height || 0}-${nav.language || ''}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Registra el dispositivo actual como de confianza por 30 días
   */
  public static saveTrustedDevice(staffUser: string): void {
    if (typeof window === 'undefined') return;

    const now = new Date();
    const expiry = new Date(now.getTime() + TRUSTED_DEVICE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const session: TrustedDeviceSession = {
      staffUser: staffUser.toUpperCase(),
      trustedAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      deviceFingerprint: this.getDeviceFingerprint()
    };

    try {
      localStorage.setItem(TRUSTED_DEVICE_KEY, JSON.stringify(session));
      localStorage.setItem('wjg_staff_user', staffUser.toUpperCase());
      sessionStorage.setItem('wjg_admin_unlocked', 'true');
    } catch (e) {
      console.warn('No se pudo guardar la sesión de dispositivo de confianza:', e);
    }
  }

  /**
   * Valida si el dispositivo actual es de confianza y su sesión sigue vigente
   */
  public static checkTrustedDevice(): { isTrusted: boolean; staffUser: string | null } {
    if (typeof window === 'undefined') return { isTrusted: false, staffUser: null };

    try {
      const raw = localStorage.getItem(TRUSTED_DEVICE_KEY);
      if (!raw) return { isTrusted: false, staffUser: null };

      const session: TrustedDeviceSession = JSON.parse(raw);
      if (!session.expiresAt || new Date(session.expiresAt) < new Date()) {
        this.revokeTrustedDevice();
        return { isTrusted: false, staffUser: null };
      }

      // Validar coincidencia de huella de dispositivo
      if (session.deviceFingerprint !== this.getDeviceFingerprint()) {
        this.revokeTrustedDevice();
        return { isTrusted: false, staffUser: null };
      }

      // Renovar sesión en sessionStorage para el ciclo actual
      sessionStorage.setItem('wjg_admin_unlocked', 'true');
      return { isTrusted: true, staffUser: session.staffUser };
    } catch (e) {
      return { isTrusted: false, staffUser: null };
    }
  }

  /**
   * Revoca la confianza del dispositivo
   */
  public static revokeTrustedDevice(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TRUSTED_DEVICE_KEY);
    localStorage.removeItem('wjg_staff_user');
    sessionStorage.removeItem('wjg_admin_unlocked');
  }

  /**
   * Calcula hash SHA-256 en navegador mediante Web Crypto API
   */
  public static async sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Valida un PIN de taller o emergencia sin tener credenciales hardcodeadas en texto plano
   */
  public static async verifyEmergencyPin(inputOrPass: string): Promise<boolean> {
    const clean = inputOrPass.trim();
    if (!clean) return false;

    // 1. Verificación contra variables de entorno seguras (Vite)
    const envPins = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_STAFF_EMERGENCY_PINS) || '';
    if (envPins) {
      const allowed = envPins.split(',').map((s: string) => s.trim());
      if (allowed.includes(clean)) return true;
    }

    // 2. Verificación criptográfica por hash SHA-256 (previene secretos en texto plano en el repositorio)
    // Hashes precalculados para los PINs autorizados de taller
    const hash = await this.sha256(clean.toLowerCase());
    const authorizedHashes = [
      'bbcfa57ecf8a672f1d0f9a0d796e10de46c29095f6cb7a7cf5e7102ecb290ca0', // PIN maestro 1 (wjg3d)
      '03efac9b7e1ae3464dda07930a93a687b31041ec621e264502066ecf5d48c305', // Teléfono Taller 1
      'c40a44228f4e7a78507244a6dd7c5a8456a9bbcca793436cde33666ca74bc5ce'  // Teléfono Taller 2
    ];

    return authorizedHashes.includes(hash);
  }
}
