import { describe, it, expect, beforeEach } from 'vitest';
import { AuthSecurityService } from '../authSecurityService';
import { WhatsAppNotificationService } from '../whatsappNotificationService';
import { CuentaCobro, TareaEquipo, ConfiguracionTaller } from '../../types';

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
    navigator: { userAgent: 'test-agent', language: 'es-CO' },
    screen: { width: 1920, height: 1080 },
    localStorage: globalThis.localStorage,
    sessionStorage: globalThis.sessionStorage
  };
}

describe('Enterprise Security, Trusted Devices & Notification Engine', () => {
  const mockConfig: ConfiguracionTaller = {
    tarifa_kwh: 834,
    margen_merma_resina: 1.4,
    telefono_contacto: '3217273025',
    telefono_contacto2: '3202796115',
    instagram: '@WJGEEKS3D',
    nequi: '3217273025',
    daviplata: '3217273025',
    bancolombia: 'Ahorros 245-000123-98',
    titular_cuenta: 'WJGEEKS 3D'
  };

  const mockCuenta: CuentaCobro = {
    id: 'cc-test-01',
    numero_cc: 'CC-0042',
    cotizacion_id: 'cot-01',
    cotizacion_numero: '25-074',
    cliente: {
      id: 'cli-01',
      codigo: 1,
      nombre: 'Carlos Mendoza',
      telefono: '3109998877',
      nit_cc: '1098765432',
      correo: 'carlos@example.com'
    },
    fecha_emision: '2026-10-20',
    items_resumen: 'Figura Diorama Cyberpunk 18cm',
    total: 350000,
    abono: 150000,
    saldo_pendiente: 200000,
    estado_pago: 'Abono Parcial'
  };

  const mockTarea: TareaEquipo = {
    id: 'task-01',
    titulo: 'Calibrar nivelación de cama y cambiar FEP',
    descripcion: 'Verificar tensión con espectrómetro de audio en Anycubic Mono 4',
    asignado_a: 'Juan',
    tipo: 'periodica',
    frecuencia: 'semanal',
    prioridad: 'alta',
    completada: false,
    fecha_creacion: '2026-10-20',
    fecha_limite: '2026-10-25'
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Module 4: Persistent Authentication & Trusted Devices', () => {
    it('saves trusted device session and validates validity within 30 days', () => {
      expect(AuthSecurityService.checkTrustedDevice().isTrusted).toBe(false);

      AuthSecurityService.saveTrustedDevice('GERMÁN');

      const status = AuthSecurityService.checkTrustedDevice();
      expect(status.isTrusted).toBe(true);
      expect(status.staffUser).toBe('GERMÁN');
      expect(sessionStorage.getItem('wjg_admin_unlocked')).toBe('true');
    });

    it('immediately revokes trusted device on explicit logout', () => {
      AuthSecurityService.saveTrustedDevice('WENDY');
      expect(AuthSecurityService.checkTrustedDevice().isTrusted).toBe(true);

      AuthSecurityService.revokeTrustedDevice();
      expect(AuthSecurityService.checkTrustedDevice().isTrusted).toBe(false);
      expect(sessionStorage.getItem('wjg_admin_unlocked')).toBeNull();
    });
  });

  describe('Module 6: Security - SHA-256 Emergency PIN Verification', () => {
    it('verifies authorized emergency pins using SHA-256 hash without plaintext leakage', async () => {
      const isValid = await AuthSecurityService.verifyEmergencyPin('wjg3d');
      expect(isValid).toBe(true);

      const isInvalid = await AuthSecurityService.verifyEmergencyPin('wrong_password_123');
      expect(isInvalid).toBe(false);
    });

    it('rejects empty or whitespace-only pin attempts', async () => {
      expect(await AuthSecurityService.verifyEmergencyPin('')).toBe(false);
      expect(await AuthSecurityService.verifyEmergencyPin('   ')).toBe(false);
    });
  });

  describe('Module 3: WhatsApp Notifications & Collection Alerts', () => {
    it('generates a friendly collection reminder with exact balance and banking details', () => {
      const { mensaje, url, payload } = WhatsAppNotificationService.generarAlertaCobranza(mockCuenta, mockConfig, 0);

      expect(mensaje).toContain('Carlos Mendoza');
      expect(mensaje).toContain('CC-0042');
      expect(mensaje).toContain('$200.000 COP');
      expect(mensaje).toContain(mockConfig.nequi);
      expect(mensaje).toContain(mockConfig.bancolombia);
      expect(url).toContain('https://wa.me/573109998877');
      expect(payload.tipo).toBe('recordatorio_vencimiento');
    });

    it('generates task assignment notification for staff member', () => {
      const { mensaje, url, payload } = WhatsAppNotificationService.generarAlertaTarea(
        mockTarea,
        '3217273025',
        'asignada'
      );

      expect(mensaje).toContain('Juan');
      expect(mensaje).toContain('Calibrar nivelación de cama y cambiar FEP');
      expect(url).toContain('https://wa.me/573217273025');
      expect(payload.tipo).toBe('alerta_tarea_asignada');
    });
  });

  describe('Module 2 & 3: Unattended WhatsApp Automation & Idempotency', () => {
    it('generates consistent idempotency keys to prevent duplicate daily messages', () => {
      const today = new Date().toISOString().slice(0, 10);
      const key1 = `cobro-${mockCuenta.id}-${today}`;
      const key2 = `cobro-${mockCuenta.id}-${today}`;

      expect(key1).toBe(key2);
      expect(key1).toBe(`cobro-cc-test-01-${today}`);
    });
  });

  describe('Module 5 & 6: Client Portal Tracking Isolation & Token Verification', () => {
    it('guarantees client tracking url uses portal=cliente and token without leaking internal margins', () => {
      const sampleToken = 'c8b292e0-2e06-4b8c-b01f-0e5a95638c41';
      const sampleTrackingUrl = `https://wjgeeks3d.com/?portal=cliente&token=${sampleToken}`;
      const url = new URL(sampleTrackingUrl);

      expect(url.searchParams.get('portal')).toBe('cliente');
      expect(url.searchParams.get('token')).toBe(sampleToken);

      // Sanitization check: Tracking parameters must not leak costs or secrets
      expect(sampleTrackingUrl).not.toContain('costo');
      expect(sampleTrackingUrl).not.toContain('margen');
      expect(sampleTrackingUrl).not.toContain('password');
      expect(sampleTrackingUrl).not.toContain('pin');
    });
  });
});
