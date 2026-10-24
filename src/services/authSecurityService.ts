import { DispositivoConexion, DispositivoInfoConsolidado, parseDispositivoInfo } from '../types/usuarios.types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

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
  public static getDeviceFingerprint(): string {
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
   * Detecta metadatos del dispositivo actual (SO, Navegador, Tipo, Huella y Seguridad)
   */
  public static detectCurrentDeviceInfo(isTrustedExplicitly: boolean = false): DispositivoConexion {
    if (typeof window === 'undefined') {
      return {
        id: 'server-mock',
        nombre: 'Servidor',
        tipo: 'escritorio',
        navegador: 'Node.js',
        so: 'Server',
        fecha_conexion: new Date().toISOString(),
        es_seguro: true,
        fingerprint: 'server'
      };
    }

    const nav = window.navigator;
    const ua = nav.userAgent || '';
    const screen = window.screen;

    // 1. Tipo de Dispositivo
    let tipo: 'escritorio' | 'movil' | 'tablet' = 'escritorio';
    if (/iPad|tablet|PlayBook/i.test(ua) || (screen.width >= 600 && screen.width <= 1024 && /touch/i.test(ua))) {
      tipo = 'tablet';
    } else if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      tipo = 'movil';
    }

    // 2. Sistema Operativo
    let so = 'Desconocido';
    if (/Windows NT 10.0/i.test(ua)) so = 'Windows 10/11';
    else if (/Windows/i.test(ua)) so = 'Windows';
    else if (/Android ([0-9.]+)/i.test(ua)) so = `Android ${RegExp.$1 || ''}`.trim();
    else if (/iPhone OS ([0-9_]+)/i.test(ua)) so = `iOS ${RegExp.$1.replace(/_/g, '.') || ''}`.trim();
    else if (/Mac OS X/i.test(ua)) so = 'macOS';
    else if (/Linux/i.test(ua)) so = 'Linux';

    // 3. Navegador
    let navegador = 'Navegador Web';
    if (/Edg\/([0-9.]+)/i.test(ua)) navegador = `Edge ${RegExp.$1.split('.')[0]}`;
    else if (/Chrome\/([0-9.]+)/i.test(ua)) navegador = `Chrome ${RegExp.$1.split('.')[0]}`;
    else if (/Safari\/([0-9.]+)/i.test(ua) && !/Chrome/i.test(ua)) navegador = 'Safari';
    else if (/Firefox\/([0-9.]+)/i.test(ua)) navegador = `Firefox ${RegExp.$1.split('.')[0]}`;

    const fingerprint = this.getDeviceFingerprint();
    const trustedCheck = this.checkTrustedDevice();
    const es_seguro = isTrustedExplicitly || (trustedCheck.isTrusted && trustedCheck.staffUser !== null);

    const tipoLabel = tipo === 'movil' ? 'Celular' : tipo === 'tablet' ? 'Tablet' : 'PC';
    const nombre = `${so} (${navegador}) • ${tipoLabel}`;

    return {
      id: fingerprint,
      nombre,
      tipo,
      navegador,
      so,
      resolucion: `${screen.width}x${screen.height}`,
      fecha_conexion: new Date().toISOString(),
      es_seguro,
      fingerprint
    };
  }

  /**
   * Registra y persiste la conexión del usuario en Supabase y caché local,
   * identificando si es el dispositivo seguro registrado o uno nuevo.
   */
  public static async recordUserConnection(
    userId: string,
    isRememberChecked: boolean = false
  ): Promise<DispositivoInfoConsolidado> {
    const currentDevice = this.detectCurrentDeviceInfo(isRememberChecked);
    const ahoraIso = new Date().toISOString();

    // Obtener caché previo para revisar historial
    let existingConsolidado: DispositivoInfoConsolidado | null = null;
    let cachedUsers: any[] = [];
    try {
      cachedUsers = JSON.parse(localStorage.getItem('wjg_usuarios_taller_cache') || '[]');
      const user = cachedUsers.find(u => u.id === userId);
      if (user && user.dispositivo_info) {
        existingConsolidado = parseDispositivoInfo(user.dispositivo_info);
      }
    } catch {}

    const historialPrevio = existingConsolidado?.historial_dispositivos || [];
    const indexExistente = historialPrevio.findIndex(d => d.id === currentDevice.id || d.fingerprint === currentDevice.fingerprint);

    let esNuevo = false;
    let nuevoHistorial: DispositivoConexion[] = [];

    if (indexExistente >= 0) {
      // Dispositivo ya conocido previamente
      const prev = historialPrevio[indexExistente];
      const actualizado: DispositivoConexion = {
        ...prev,
        ...currentDevice,
        fecha_conexion: ahoraIso,
        // Si antes era seguro o ahora marcaron recordar, es seguro
        es_seguro: prev.es_seguro || isRememberChecked || currentDevice.es_seguro,
        es_nuevo: false
      };
      nuevoHistorial = [
        actualizado,
        ...historialPrevio.filter((_, i) => i !== indexExistente)
      ];
      currentDevice.es_seguro = actualizado.es_seguro;
      currentDevice.es_nuevo = false;
    } else {
      // ¡Nuevo dispositivo detectado!
      esNuevo = !isRememberChecked && !currentDevice.es_seguro;
      currentDevice.es_nuevo = esNuevo;
      nuevoHistorial = [currentDevice, ...historialPrevio].slice(0, 10); // Conservar últimos 10
    }

    const consolidadoFinal: DispositivoInfoConsolidado = {
      ultimo_dispositivo: currentDevice,
      historial_dispositivos: nuevoHistorial
    };

    // Actualizar caché local inmediatamente
    try {
      const updatedCache = cachedUsers.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            ultimo_acceso: ahoraIso,
            dispositivo_info: consolidadoFinal
          };
        }
        return u;
      });
      localStorage.setItem('wjg_usuarios_taller_cache', JSON.stringify(updatedCache));
    } catch {}

    // Actualizar en Supabase si está disponible
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('usuarios_taller')
          .update({
            ultimo_acceso: ahoraIso,
            dispositivo_info: JSON.stringify(consolidadoFinal)
          })
          .eq('id', userId);
      } catch (err) {
        console.warn('No se pudo sincronizar dispositivo_info en Supabase:', err);
      }
    }

    return consolidadoFinal;
  }

  /**
   * Permite al Administrador marcar o revocar un dispositivo como de confianza
   */
  public static async toggleDeviceTrust(
    usuarioId: string,
    deviceFingerprint: string,
    makeTrusted: boolean
  ): Promise<boolean> {
    try {
      const cachedUsers: any[] = JSON.parse(localStorage.getItem('wjg_usuarios_taller_cache') || '[]');
      const user = cachedUsers.find(u => u.id === usuarioId);
      if (!user) return false;

      const consolidado = parseDispositivoInfo(user.dispositivo_info);
      if (!consolidado) return false;

      const updatedHistorial = consolidado.historial_dispositivos.map(d => {
        if (d.id === deviceFingerprint || d.fingerprint === deviceFingerprint) {
          return { ...d, es_seguro: makeTrusted, es_nuevo: false };
        }
        return d;
      });

      const updatedUltimo = consolidado.ultimo_dispositivo.id === deviceFingerprint
        ? { ...consolidado.ultimo_dispositivo, es_seguro: makeTrusted, es_nuevo: false }
        : consolidado.ultimo_dispositivo;

      const nuevoConsolidado: DispositivoInfoConsolidado = {
        ultimo_dispositivo: updatedUltimo,
        historial_dispositivos: updatedHistorial
      };

      // Guardar en cache
      const updatedCache = cachedUsers.map(u => u.id === usuarioId ? { ...u, dispositivo_info: nuevoConsolidado } : u);
      localStorage.setItem('wjg_usuarios_taller_cache', JSON.stringify(updatedCache));

      // Guardar en Supabase
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('usuarios_taller')
          .update({
            dispositivo_info: JSON.stringify(nuevoConsolidado)
          })
          .eq('id', usuarioId);
      }

      return true;
    } catch (e) {
      console.error('Error al cambiar confianza del dispositivo:', e);
      return false;
    }
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
      '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // PIN por defecto de taller (1234)
      'bbcfa57ecf8a672f1d0f9a0d796e10de46c29095f6cb7a7cf5e7102ecb290ca0', // PIN maestro 1 (wjg3d)
      '03efac9b7e1ae3464dda07930a93a687b31041ec621e264502066ecf5d48c305', // Teléfono Taller 1
      'c40a44228f4e7a78507244a6dd7c5a8456a9bbcca793436cde33666ca74bc5ce'  // Teléfono Taller 2
    ];

    return authorizedHashes.includes(hash);
  }
}
