import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhatsAppOtpService } from '../whatsappOtpService';

// Polyfill Web Crypto for Node environment if necessary
if (!globalThis.crypto) {
  const { webcrypto } = require('crypto');
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

describe('WhatsApp OTP Service & Security Suite', () => {
  it('1. Generación de OTP criptográfico de 6 dígitos', () => {
    const otp1 = WhatsAppOtpService.generateSecure6DigitOtp();
    const otp2 = WhatsAppOtpService.generateSecure6DigitOtp();

    expect(otp1).toHaveLength(6);
    expect(otp2).toHaveLength(6);
    expect(Number(otp1)).toBeGreaterThanOrEqual(100000);
    expect(Number(otp1)).toBeLessThanOrEqual(999999);
    expect(/^\d{6}$/.test(otp1)).toBe(true);
  });

  it('2. Hash criptográfico SHA-256 es determinístico y seguro', async () => {
    const text = 'wjg3d';
    const hash = await WhatsAppOtpService.hashStringSha256(text);

    expect(hash).toHaveLength(64);
    expect(hash).toBe('bbcfa57ecf8a672f1d0f9a0d796e10de46c29095f6cb7a7cf5e7102ecb290ca0');

    // Diferente texto produce diferente hash
    const hash2 = await WhatsAppOtpService.hashStringSha256('otraClave123');
    expect(hash).not.toBe(hash2);
  });

  it('3. Evaluador de claves: Valida PIN numérico y detecta claves demasiado cortas (< 4 caracteres)', () => {
    // Menos de 4 caracteres es inválido
    const r1 = WhatsAppOtpService.calculatePasswordStrength('123');
    expect(r1.isValid).toBe(false);
    expect(r1.label).toBe('Muy Débil');

    // PIN numérico de 4 dígitos es válido y detectado como PIN
    const pin4 = WhatsAppOtpService.calculatePasswordStrength('1234');
    expect(pin4.isValid).toBe(true);
    expect(pin4.isPin).toBe(true);
    expect(pin4.label).toBe('PIN Rápido');

    // PIN numérico de 6 dígitos es válido
    const pin6 = WhatsAppOtpService.calculatePasswordStrength('987654');
    expect(pin6.isValid).toBe(true);
    expect(pin6.isPin).toBe(true);

    // Clave alfanumérica sencilla (6 caracteres) es válida
    const simpleAlpha = WhatsAppOtpService.calculatePasswordStrength('juan3d');
    expect(simpleAlpha.isValid).toBe(true);
    expect(simpleAlpha.isPin).toBe(false);
  });

  it('4. Evaluador de claves: Valida contraseñas complejas y calcula fortaleza', () => {
    const strong = WhatsAppOtpService.calculatePasswordStrength('Wjg#2026Pro!');
    expect(strong.isValid).toBe(true);
    expect(strong.isPin).toBe(false);
    expect(strong.score).toBe(4);
    expect(strong.label).toBe('Fuerte');
    expect(strong.rules.minLength).toBe(true);
    expect(strong.rules.hasUppercase).toBe(true);
    expect(strong.rules.hasNumber).toBe(true);
    expect(strong.rules.hasSpecial).toBe(true);
  });

  it('5. Generador de clave provisional: Genera contraseña válida y segura', () => {
    const prov = WhatsAppOtpService.generateProvisionalPassword();
    expect(prov.startsWith('Wjg2026#')).toBe(true);
    expect(prov.length).toBeGreaterThanOrEqual(10);

    const check = WhatsAppOtpService.calculatePasswordStrength(prov);
    expect(check.isValid).toBe(true);
  });
});
