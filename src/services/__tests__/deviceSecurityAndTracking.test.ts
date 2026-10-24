import { describe, it, expect, beforeEach } from 'vitest';
import { AuthSecurityService } from '../authSecurityService';
import { parseDispositivoInfo, DispositivoInfoConsolidado } from '../../types/usuarios.types';

// Mocking Storage & Window for Vitest Node.js Environment
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
if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = createStorageMock() as any;
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    navigator: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      language: 'es-CO'
    },
    screen: { width: 1920, height: 1080 },
    localStorage: globalThis.localStorage,
    sessionStorage: globalThis.sessionStorage
  };
}

describe('Device Security, Hardware Fingerprinting & Connection Auditing', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('detectCurrentDeviceInfo', () => {
    it('detects desktop Windows PC with Chrome browser correctly', () => {
      const info = AuthSecurityService.detectCurrentDeviceInfo(false);

      expect(info.tipo).toBe('escritorio');
      expect(info.so).toBe('Windows 10/11');
      expect(info.navegador).toContain('Chrome');
      expect(info.resolucion).toBe('1920x1080');
      expect(info.nombre).toContain('Windows 10/11');
      expect(info.nombre).toContain('PC');
      expect(info.fingerprint).toBeDefined();
      expect(info.fingerprint.length).toBeGreaterThan(0);
    });

    it('flags device as trusted when explicitly remembered or session is trusted', () => {
      const infoExplicit = AuthSecurityService.detectCurrentDeviceInfo(true);
      expect(infoExplicit.es_seguro).toBe(true);

      const infoNotExplicit = AuthSecurityService.detectCurrentDeviceInfo(false);
      expect(infoNotExplicit.es_seguro).toBe(false);
    });
  });

  describe('parseDispositivoInfo helper', () => {
    it('returns null for empty, null, or undefined inputs', () => {
      expect(parseDispositivoInfo(null)).toBeNull();
      expect(parseDispositivoInfo(undefined)).toBeNull();
      expect(parseDispositivoInfo('')).toBeNull();
      expect(parseDispositivoInfo('   ')).toBeNull();
    });

    it('parses valid consolidated JSON structure correctly', () => {
      const consolidado: DispositivoInfoConsolidado = {
        ultimo_dispositivo: {
          id: 'dev-1',
          nombre: 'Windows 10/11 (Chrome 120) • PC',
          tipo: 'escritorio',
          navegador: 'Chrome 120',
          so: 'Windows 10/11',
          resolucion: '1920x1080',
          fecha_conexion: '2026-10-23T18:00:00Z',
          es_seguro: true,
          fingerprint: 'fp-123'
        },
        historial_dispositivos: [
          {
            id: 'dev-1',
            nombre: 'Windows 10/11 (Chrome 120) • PC',
            tipo: 'escritorio',
            navegador: 'Chrome 120',
            so: 'Windows 10/11',
            resolucion: '1920x1080',
            fecha_conexion: '2026-10-23T18:00:00Z',
            es_seguro: true,
            fingerprint: 'fp-123'
          }
        ]
      };

      const result = parseDispositivoInfo(JSON.stringify(consolidado));
      expect(result).not.toBeNull();
      expect(result?.ultimo_dispositivo.nombre).toBe('Windows 10/11 (Chrome 120) • PC');
      expect(result?.ultimo_dispositivo.es_seguro).toBe(true);
      expect(result?.historial_dispositivos).toHaveLength(1);
    });

    it('migrates legacy plain string gracefully into consolidated structure', () => {
      const legacyString = 'Chrome en Android - Celular Juan';
      const result = parseDispositivoInfo(legacyString);

      expect(result).not.toBeNull();
      expect(result?.ultimo_dispositivo.nombre).toBe(legacyString);
      expect(result?.ultimo_dispositivo.tipo).toBe('movil');
      expect(result?.historial_dispositivos).toHaveLength(1);
    });
  });

  describe('recordUserConnection', () => {
    it('records new unverified device with es_seguro = false and es_nuevo = true', async () => {
      const mockUserId = 'user-test-uuid-001';
      localStorage.setItem('wjg_usuarios_taller_cache', JSON.stringify([
        { id: mockUserId, nombre: 'Juan Operador', rol: 'IMPRESION_MANTENIMIENTO', dispositivo_info: null }
      ]));

      const consolidado = await AuthSecurityService.recordUserConnection(mockUserId, false);

      expect(consolidado.ultimo_dispositivo.es_seguro).toBe(false);
      expect(consolidado.ultimo_dispositivo.es_nuevo).toBe(true);
      expect(consolidado.historial_dispositivos).toHaveLength(1);

      // Verify cached user was updated
      const updatedCache = JSON.parse(localStorage.getItem('wjg_usuarios_taller_cache') || '[]');
      const user = updatedCache.find((u: any) => u.id === mockUserId);
      expect(user.dispositivo_info).toBeDefined();
      expect(user.dispositivo_info.ultimo_dispositivo.es_nuevo).toBe(true);
    });

    it('records trusted device with es_seguro = true when rememberDevice is true', async () => {
      const mockUserId = 'user-test-uuid-002';
      localStorage.setItem('wjg_usuarios_taller_cache', JSON.stringify([
        { id: mockUserId, nombre: 'Germán Admin', rol: 'ADMIN_COBRANZAS', dispositivo_info: null }
      ]));

      const consolidado = await AuthSecurityService.recordUserConnection(mockUserId, true);

      expect(consolidado.ultimo_dispositivo.es_seguro).toBe(true);
      expect(consolidado.ultimo_dispositivo.es_nuevo).toBe(false);
    });
  });

  describe('toggleDeviceTrust (Admin Whitelisting/Revocation)', () => {
    it('allows admin to mark a device as trusted and revokes new device alert', async () => {
      const mockUserId = 'user-test-uuid-003';
      const devFingerprint = 'fp-test-unique-abc';

      const initialConsolidado: DispositivoInfoConsolidado = {
        ultimo_dispositivo: {
          id: devFingerprint,
          nombre: 'Android 14 (Chrome 122) • Celular',
          tipo: 'movil',
          navegador: 'Chrome 122',
          so: 'Android 14',
          resolucion: '390x844',
          fecha_conexion: '2026-10-23T15:00:00Z',
          es_seguro: false,
          es_nuevo: true,
          fingerprint: devFingerprint
        },
        historial_dispositivos: [
          {
            id: devFingerprint,
            nombre: 'Android 14 (Chrome 122) • Celular',
            tipo: 'movil',
            navegador: 'Chrome 122',
            so: 'Android 14',
            resolucion: '390x844',
            fecha_conexion: '2026-10-23T15:00:00Z',
            es_seguro: false,
            es_nuevo: true,
            fingerprint: devFingerprint
          }
        ]
      };

      localStorage.setItem('wjg_usuarios_taller_cache', JSON.stringify([
        { id: mockUserId, nombre: 'Wendy Acabados', rol: 'PINTURA_ACABADOS', dispositivo_info: initialConsolidado }
      ]));

      const success = await AuthSecurityService.toggleDeviceTrust(mockUserId, devFingerprint, true);
      expect(success).toBe(true);

      const updatedCache = JSON.parse(localStorage.getItem('wjg_usuarios_taller_cache') || '[]');
      const user = updatedCache.find((u: any) => u.id === mockUserId);
      const updatedInfo = parseDispositivoInfo(user.dispositivo_info);

      expect(updatedInfo?.ultimo_dispositivo.es_seguro).toBe(true);
      expect(updatedInfo?.ultimo_dispositivo.es_nuevo).toBe(false);
      expect(updatedInfo?.historial_dispositivos[0].es_seguro).toBe(true);
    });

    it('allows admin to revoke trust from an existing device', async () => {
      const mockUserId = 'user-test-uuid-004';
      const devFingerprint = 'fp-test-revocation-xyz';

      const initialConsolidado: DispositivoInfoConsolidado = {
        ultimo_dispositivo: {
          id: devFingerprint,
          nombre: 'Windows 11 (Edge) • PC',
          tipo: 'escritorio',
          navegador: 'Edge',
          so: 'Windows 10/11',
          resolucion: '2560x1440',
          fecha_conexion: '2026-10-23T16:00:00Z',
          es_seguro: true,
          fingerprint: devFingerprint
        },
        historial_dispositivos: [
          {
            id: devFingerprint,
            nombre: 'Windows 11 (Edge) • PC',
            tipo: 'escritorio',
            navegador: 'Edge',
            so: 'Windows 10/11',
            resolucion: '2560x1440',
            fecha_conexion: '2026-10-23T16:00:00Z',
            es_seguro: true,
            fingerprint: devFingerprint
          }
        ]
      };

      localStorage.setItem('wjg_usuarios_taller_cache', JSON.stringify([
        { id: mockUserId, nombre: 'Operador Taller', rol: 'VENTAS_POS', dispositivo_info: initialConsolidado }
      ]));

      const success = await AuthSecurityService.toggleDeviceTrust(mockUserId, devFingerprint, false);
      expect(success).toBe(true);

      const updatedCache = JSON.parse(localStorage.getItem('wjg_usuarios_taller_cache') || '[]');
      const user = updatedCache.find((u: any) => u.id === mockUserId);
      const updatedInfo = parseDispositivoInfo(user.dispositivo_info);

      expect(updatedInfo?.ultimo_dispositivo.es_seguro).toBe(false);
      expect(updatedInfo?.historial_dispositivos[0].es_seguro).toBe(false);
    });
  });
});
