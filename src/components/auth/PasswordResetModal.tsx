import React, { useState, useEffect } from 'react';
import { X, MessageSquare, ShieldCheck, KeyRound, Eye, EyeOff, ArrowRight, RotateCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { WhatsAppOtpService, PasswordStrengthResult } from '../../services/whatsappOtpService';
import { toast } from '../ui/ToastProvider';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  initialIdentifier = ''
}) => {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [phoneMasked, setPhoneMasked] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    if (initialIdentifier) setIdentifier(initialIdentifier);
  }, [initialIdentifier]);

  // Temporizador para reenvío de OTP (60s)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const strength: PasswordStrengthResult = WhatsAppOtpService.calculatePasswordStrength(newPassword);

  // Paso 1: Solicitar OTP por WhatsApp
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Ingresa tu correo electrónico o número de WhatsApp.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    const res = await WhatsAppOtpService.requestPasswordResetOtp(identifier);
    setLoading(false);

    if (res.success) {
      setPhoneMasked(res.phoneMasked || '');
      setStep('verify');
      setCooldown(60);
      toast.success('Código de seguridad enviado a tu WhatsApp');
    } else {
      setErrorMessage(res.message);
    }
  };

  // Reenviar OTP
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setErrorMessage(null);

    const res = await WhatsAppOtpService.requestPasswordResetOtp(identifier);
    setLoading(false);

    if (res.success) {
      setCooldown(60);
      toast.info('Nuevo código de seguridad enviado');
    } else {
      setErrorMessage(res.message);
    }
  };

  // Paso 2: Verificar OTP y Establecer Nueva Contraseña
  const handleVerifyAndChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (otpCode.trim().length !== 6) {
      setErrorMessage('El código debe ser de 6 dígitos numéricos.');
      return;
    }

    if (!strength.isValid) {
      setErrorMessage('La contraseña debe tener mínimo 8 caracteres, al menos 1 mayúscula y 1 número.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const res = await WhatsAppOtpService.verifyOtpAndSetNewPassword(
      identifier,
      otpCode,
      newPassword
    );
    setLoading(false);

    if (res.success) {
      toast.success(res.message);
      onClose();
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '32px 28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div 
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)'
            }}
          >
            <MessageSquare size={28} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 6px 0' }}>
            Recuperar Contraseña
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
            {step === 'request' 
              ? 'Te enviaremos un código de seguridad OTP desatendido a tu WhatsApp.'
              : `Ingresa el código enviado al número ${phoneMasked || 'registrado'}.`}
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div 
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}
          >
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PASO 1: SOLICITAR CÓDIGO */}
        {step === 'request' && (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
                Correo Electrónico o Teléfono de WhatsApp
              </label>
              <input 
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="ej: german@wjgeeks.com o 3204814702"
                autoFocus
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.92rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)'
              }}
            >
              {loading ? (
                <span>Enviando código...</span>
              ) : (
                <>
                  <span>Enviar Código a mi WhatsApp</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* PASO 2: VERIFICAR OTP Y DEFINIR NUEVA CLAVE */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyAndChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Código OTP */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Código OTP (6 dígitos)
                </label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: cooldown > 0 ? '#64748b' : '#38bdf8',
                    fontSize: '0.75rem',
                    cursor: cooldown > 0 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCw size={12} />
                  {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
                </button>
              </div>

              <input 
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#38bdf8',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Nueva Contraseña */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                Nueva Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número..."
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Medidor de Fortaleza en Tiempo Real */}
              {newPassword && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: strength.color, marginBottom: '4px' }}>
                    <span>Seguridad: {strength.label}</span>
                    <span>{strength.isValid ? 'Cumple requisitos' : 'Faltan requisitos'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', height: '4px' }}>
                    {[0, 1, 2, 3].map(i => (
                      <div 
                        key={i}
                        style={{
                          height: '100%',
                          borderRadius: '2px',
                          backgroundColor: i < strength.score ? strength.color : 'rgba(255,255,255,0.1)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                Confirmar Contraseña
              </label>
              <input 
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !strength.isValid || newPassword !== confirmPassword || otpCode.length !== 6}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.92rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: (loading || !strength.isValid || newPassword !== confirmPassword || otpCode.length !== 6) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 10px 20px -5px rgba(14, 165, 233, 0.4)'
              }}
            >
              {loading ? (
                <span>Actualizando contraseña...</span>
              ) : (
                <>
                  <KeyRound size={18} />
                  <span>Guardar Nueva Contraseña</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('request')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '4px'
              }}
            >
              Volver a ingresar teléfono o correo
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
