import React, { useState } from 'react';
import { Lock, User, ShieldCheck, X, Eye, EyeOff, Sparkles, LogOut, Smartphone } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { AuthSecurityService } from '../../services/authSecurityService';
import { toast } from '../ui/ToastProvider';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userLabel: string) => void;
  onLogout: () => void;
  isAuthenticated: boolean;
  currentUser?: string | null;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onLogout,
  isAuthenticated,
  currentUser
}) => {
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const input = emailOrUser.trim().toLowerCase();
    const pass = password.trim();

    try {
      // 1. Si Supabase Auth está configurado con usuarios
      if (isSupabaseConfigured && supabase) {
        let email = input;
        if (input === 'german' || input === 'germán') email = 'german@wjgeeks.com';
        if (input === 'wendy') email = 'wendy@wjgeeks.com';
        if (input === 'juan') email = 'juan@wjgeeks.com';

        if (email.includes('@')) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass
          });

          if (!error && data?.user) {
            const label = (data.user.email?.split('@')[0] || 'Staff').toUpperCase();
            if (rememberDevice) {
              AuthSecurityService.saveTrustedDevice(label);
            } else {
              sessionStorage.setItem('wjg_admin_unlocked', 'true');
              localStorage.setItem('wjg_staff_user', label);
            }
            toast.success(`Bienvenido al sistema, ${label} 👋`);
            onLoginSuccess(label);
            onClose();
            return;
          }
        }
      }

      // 2. Verificación criptográfica de PIN de Taller / Emergencia (Sin secretos en texto plano)
      const isPinValid = (await AuthSecurityService.verifyEmergencyPin(pass)) || 
                         (await AuthSecurityService.verifyEmergencyPin(input));

      if (isPinValid) {
        const staffName = input.includes('wendy') ? 'WENDY' : input.includes('juan') ? 'JUAN' : 'GERMÁN';
        if (rememberDevice) {
          AuthSecurityService.saveTrustedDevice(staffName);
        } else {
          sessionStorage.setItem('wjg_admin_unlocked', 'true');
          localStorage.setItem('wjg_staff_user', staffName);
        }
        toast.success(`Acceso concedido (${staffName}) • Dispositivo verificado`);
        onLoginSuccess(staffName);
        onClose();
        return;
      }

      setErrorMessage('Credenciales no válidas. Verifica tu correo/usuario y contraseña.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAction = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // ignore
      }
    }
    AuthSecurityService.revokeTrustedDevice();
    toast.info('Sesión de personal cerrada. Dispositivo revocado.');
    onLogout();
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '420px',
          padding: '24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto'
          }}>
            <ShieldCheck size={26} color="#38bdf8" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
            {isAuthenticated ? 'Personal Conectado' : 'Acceso de Personal'}
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
            {isAuthenticated 
              ? `Sesión activa como ${currentUser || 'Staff del Taller'}`
              : 'Equipo WJGEEKS 3D (Germán, Wendy, Juan)'}
          </p>
        </div>

        {isAuthenticated ? (
          <div>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '20px',
              fontSize: '0.85rem',
              color: '#34d399',
              textAlign: 'center'
            }}>
              ✓ Permisos administrativos y de taller activos.
            </div>

            <button
              type="button"
              onClick={handleLogoutAction}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <LogOut size={16} />
              Cerrar Sesión Staff
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            {errorMessage && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '10px',
                color: '#f87171',
                fontSize: '0.8rem',
                marginBottom: '14px'
              }}>
                {errorMessage}
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                USUARIO O CORREO:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '34px' }}
                  placeholder="german / wendy / juan"
                  value={emailOrUser}
                  onChange={e => setEmailOrUser(e.target.value)}
                  required
                />
                <User size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '12px' }} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                CONTRASEÑA O PIN DE TALLER:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '34px', paddingRight: '34px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <Lock size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Checkbox Dispositivo de Confianza / Sesión Persistente */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox"
                id="rememberDeviceCheck"
                checked={rememberDevice}
                onChange={e => setRememberDevice(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--brand-cyan)' }}
              />
              <label 
                htmlFor="rememberDeviceCheck" 
                style={{ fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Smartphone size={13} color="var(--brand-cyan)" />
                Recordar este dispositivo de confianza (30 días)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontWeight: 700,
                fontSize: '0.9rem',
                justifyContent: 'center'
              }}
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión Staff'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
