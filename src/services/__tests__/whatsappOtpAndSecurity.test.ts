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

  it('3. Evaluador de fortaleza de contraseña: Detecta contraseñas débiles', () => {
    // Menos de 8 caracteres
    const r1 = WhatsAppOtpService.calculatePasswordStrength('Short1A');
    expect(r1.isValid).toBe(false);

    // Sin mayúscula
    const r2 = WhatsAppOtpService.calculatePasswordStrength('password1234');
    expect(r2.isValid).toBe(false);
    expect(r2.rules.hasUppercase).toBe(false);

    // Sin número
    const r3 = WhatsAppOtpService.calculatePasswordStrength('PasswordOnly');
    expect(r3.isValid).toBe(false);
    expect(r3.rules.hasNumber).toBe(false);
  });

  it('4. Evaluador de fortaleza de contraseña: Valida contraseñas robustas', () => {
    const strong = WhatsAppOtpService.calculatePasswordStrength('Wjg#2026Pro!');
    expect(strong.isValid).toBe(true);
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
