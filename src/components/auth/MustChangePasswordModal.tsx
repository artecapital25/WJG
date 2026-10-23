import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, ShieldAlert, CheckCircle } from 'lucide-react';
import { WhatsAppOtpService, PasswordStrengthResult } from '../../services/whatsappOtpService';
import { toast } from '../ui/ToastProvider';

interface MustChangePasswordModalProps {
  isOpen: boolean;
  userEmailOrId: string;
  onPasswordChanged: () => void;
}

export const MustChangePasswordModal: React.FC<MustChangePasswordModalProps> = ({
  isOpen,
  userEmailOrId,
  onPasswordChanged
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const strength: PasswordStrengthResult = WhatsAppOtpService.calculatePasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword.trim()) {
      setErrorMessage('Ingresa la contraseña actual o provisional asignada.');
      return;
    }

    if (!strength.isValid || newPassword.trim().length < 4) {
      setErrorMessage('La nueva clave o PIN debe tener al menos 4 caracteres o dígitos.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMessage('Las nuevas contraseñas o PINs no coinciden.');
      return;
    }

    setLoading(true);
    const res = await WhatsAppOtpService.updatePasswordInSession(
      userEmailOrId,
      currentPassword.trim(),
      newPassword.trim()
    );
    setLoading(false);

    if (res.success) {
      toast.success('¡Clave o PIN actualizado exitosamente! Acceso concedido.');
      onPasswordChanged();
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.92)',
        backdropFilter: 'blur(16px)',
        zIndex: 10001,
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
          border: '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: '24px',
          padding: '36px 30px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          position: 'relative'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div 
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              boxShadow: '0 10px 20px -5px rgba(234, 179, 8, 0.4)'
            }}
          >
            <ShieldAlert size={30} color="#0f172a" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 6px 0' }}>
            Cambio Obligatorio de Contraseña
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
            Por políticas de seguridad en tu primer inicio de sesión o restablecimiento, debes definir una contraseña personal definitiva.
          </p>
        </div>

        {errorMessage && (
          <div 
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.82rem',
              marginBottom: '16px'
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
              Contraseña Actual o Provisional
            </label>
            <input 
              type={showPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Ingresa la clave temporal..."
              autoFocus
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

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                Nueva Clave o PIN Personal
              </label>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                PIN numérico o clave alfanumérica
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="PIN (ej: 1234) o clave alfanumérica compleja..."
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

            {newPassword && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: strength.color, marginBottom: '4px' }}>
                  <span>{strength.isPin ? 'Tipo: PIN Numérico' : `Seguridad: ${strength.label}`}</span>
                  <span>{strength.isValid ? '✓ Válida para ingresar' : 'Mínimo 4 caracteres'}</span>
                </div>
                {!strength.isPin && (
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
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
              Confirmar Nueva Clave o PIN
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
            disabled={loading || !strength.isValid || newPassword !== confirmPassword || !currentPassword}
            style={{
              marginTop: '8px',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.92rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: (loading || !strength.isValid || newPassword !== confirmPassword || !currentPassword) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? <span>Actualizando...</span> : <span>Confirmar y Entrar al Sistema</span>}
          </button>
        </form>
      </div>
    </div>
  );
};
