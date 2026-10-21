import React, { useState } from 'react';
import { Lock, ShieldCheck, Eye, EyeOff, Sparkles, Smartphone, AlertTriangle, KeyRound, MessageSquare, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { AuthSecurityService } from '../../services/authSecurityService';
import { PasswordResetModal } from './PasswordResetModal';
import { MustChangePasswordModal } from './MustChangePasswordModal';
import { toast } from '../ui/ToastProvider';

interface StaffAuthGuardProps {
  onLoginSuccess: (userLabel: string) => void;
}

export const StaffAuthGuard: React.FC<StaffAuthGuardProps> = ({ onLoginSuccess }) => {
  const [loginMethod, setLoginMethod] = useState<'profile' | 'credentials'>('profile');
  const [selectedStaff, setSelectedStaff] = useState<string>('german');
  const [emailOrPhone, setEmailOrPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modales de Recuperación y Cambio Obligatorio
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showMustChangeModal, setShowMustChangeModal] = useState<boolean>(false);
  const [mustChangeUserId, setMustChangeUserId] = useState<string>('');
  const [pendingSuccessLabel, setPendingSuccessLabel] = useState<string>('');

  const staffProfiles = [
    { id: 'german', name: 'Germán', role: 'Administrador Global', avatar: 'G', phone: '3204814702', email: 'german@wjgeeks.com' },
    { id: 'wendy', name: 'Wendy', role: 'Administración / Finanzas', avatar: 'W', phone: '3100000002', email: 'wendy@wjgeeks.com' },
    { id: 'juan', name: 'Juan', role: 'Taller / Producción', avatar: 'J', phone: '3100000003', email: 'juan@wjgeeks.com' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage('Por favor ingresa tu contraseña o PIN de acceso.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const enteredPassword = password.trim();
      const identifier = loginMethod === 'profile' 
        ? staffProfiles.find(p => p.id === selectedStaff)?.email || selectedStaff 
        : emailOrPhone.trim();

      const userLabel = loginMethod === 'profile'
        ? selectedStaff.toUpperCase()
        : identifier.split('@')[0].toUpperCase();

      // 1. Verificar primero en la tabla `usuarios_sistema` si Supabase está activo
      if (isSupabaseConfigured && supabase) {
        const cleanIdent = identifier.toLowerCase();
        const cleanPhone = identifier.replace(/\D/g, '');

        let query = supabase.from('usuarios_sistema').select('*');
        if (cleanPhone.length >= 7) {
          query = query.or(`email.eq.${cleanIdent},telefono_whatsapp.ilike.%${cleanPhone}%`);
        } else {
          query = query.eq('email', cleanIdent);
        }

        const { data: dbUsers, error: dbErr } = await query.limit(1);

        if (!dbErr && dbUsers && dbUsers.length > 0) {
          const userRec = dbUsers[0];

          // Validación de estado de cuenta (Kill Switch)
          if (!userRec.activo) {
            setErrorMessage('Esta cuenta ha sido desactivada por el administrador. Contacta a soporte.');
            setLoading(false);
            return;
          }

          // Validación de hash de contraseña
          const encoder = new TextEncoder();
          const data = encoder.encode(enteredPassword);
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
          const enteredHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

          if (userRec.password_hash === enteredHash || (await AuthSecurityService.verifyEmergencyPin(enteredPassword))) {
            // Actualizar último acceso y metadata de dispositivo
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            supabase.from('usuarios_sistema').update({
              ultimo_acceso: new Date().toISOString(),
              dispositivo_info: {
                tipo: isMobile ? 'movil' : 'escritorio',
                navegador: navigator.userAgent.slice(0, 80),
                fecha: new Date().toISOString()
              }
            }).eq('id', userRec.id).then();

            // Verificar si tiene cambio obligatorio de clave
            if (userRec.must_change_password) {
              setMustChangeUserId(userRec.id);
              setPendingSuccessLabel(userRec.nombre || userLabel);
              setShowMustChangeModal(true);
              setLoading(false);
              return;
            }

            // Inicio de sesión exitoso
            finalizeLogin(userRec.nombre || userLabel);
            return;
          }
        }
      }

      // 2. Validación de PIN de Taller / Emergencia mediante Hash Criptográfico
      const isPinValid = await AuthSecurityService.verifyEmergencyPin(enteredPassword);

      if (isPinValid) {
        finalizeLogin(userLabel);
        return;
      }

      setErrorMessage('Contraseña o PIN incorrecto. ¿Olvidaste tu contraseña? Recupérala vía WhatsApp.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error validando credenciales de acceso.');
    } finally {
      setLoading(false);
    }
  };

  const finalizeLogin = (label: string) => {
    if (rememberDevice) {
      AuthSecurityService.saveTrustedDevice(label);
    } else {
      sessionStorage.setItem('wjg_admin_unlocked', 'true');
      localStorage.setItem('wjg_staff_user', label);
    }
    toast.success(`Acceso Autorizado • Sesión activa como ${label}`);
    onLoginSuccess(label);
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#090d16',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Background Ambient Glows */}
      <div 
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '520px',
          height: '520px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '10%',
          width: '380px',
          height: '380px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <div 
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(15, 23, 42, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(24px)',
          borderRadius: '26px',
          padding: '36px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Header con Marca WJGEEKS 3D */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <div 
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.4)',
              marginBottom: '16px'
            }}
          >
            <Lock size={30} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 6px 0' }}>
            WJGEEKS 3D PRO
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Plataforma Operativa de Taller, Ventas y POS
          </p>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '10px',
              padding: '4px 12px',
              borderRadius: '999px',
              backgroundColor: 'rgba(14, 165, 233, 0.1)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              fontSize: '0.72rem',
              color: '#38bdf8',
              fontWeight: 600
            }}
          >
            <ShieldCheck size={14} /> Acceso Exclusivo a Personal Autorizado
          </div>
        </div>

        {/* Selector de Método: Perfil Rápido vs Entrada Dual (Email / Teléfono) */}
        <div 
          style={{
            display: 'flex',
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '20px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setLoginMethod('profile');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: loginMethod === 'profile' ? '#0ea5e9' : 'transparent',
              color: loginMethod === 'profile' ? '#ffffff' : '#94a3b8',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Equipo Taller
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('credentials');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: loginMethod === 'credentials' ? '#0ea5e9' : 'transparent',
              color: loginMethod === 'credentials' ? '#ffffff' : '#94a3b8',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Correo / WhatsApp
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Método 1: Selección de Perfil */}
          {loginMethod === 'profile' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Selecciona tu Cuenta
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {staffProfiles.map(profile => {
                  const isSelected = selectedStaff === profile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        setSelectedStaff(profile.id);
                        setErrorMessage(null);
                      }}
                      style={{
                        padding: '12px 6px',
                        borderRadius: '14px',
                        border: isSelected ? '2px solid #0ea5e9' : '1px solid rgba(255, 255, 255, 0.08)',
                        backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                        color: isSelected ? '#38bdf8' : '#cbd5e1',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    >
                      <div 
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#0ea5e9' : '#334155',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}
                      >
                        {profile.avatar}
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 700 : 500 }}>
                        {profile.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Método 2: Entrada Dual (Correo o Teléfono de WhatsApp) */}
          {loginMethod === 'credentials' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Correo o Número de WhatsApp
              </label>
              <input 
                type="text"
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                placeholder="ej: german@wjgeeks.com o 3204814702"
                autoFocus
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Campo de Contraseña con Toggle Ojo */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contraseña / PIN
              </label>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ingresa tu clave de acceso..."
                style={{
                  width: '100%',
                  padding: '14px 44px 14px 16px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  fontSize: '0.95rem',
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
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Casilla Dispositivo de Confianza (30 días) */}
          <label 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              cursor: 'pointer',
              fontSize: '0.82rem',
              color: '#94a3b8',
              userSelect: 'none'
            }}
          >
            <input 
              type="checkbox"
              checked={rememberDevice}
              onChange={e => setRememberDevice(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#0ea5e9',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Smartphone size={14} color="#38bdf8" /> Mantener sesión iniciada en este dispositivo (30 días)
            </span>
          </label>

          {/* Mensajes de Error */}
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
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Botón de Ingreso con Anti Doble Envío */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 10px 20px -5px rgba(14, 165, 233, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} /> Iniciar Sesión Operativa
              </>
            )}
          </button>
        </form>

        {/* Enlace Directo a Recuperación vía WhatsApp */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#10b981',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500
            }}
          >
            <MessageSquare size={14} /> Recuperar contraseña vía WhatsApp en 1 clic
          </button>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>
          🔒 Sesión segura con cifrado SHA-256 Web Crypto y aislamiento multi-dispositivo.
        </div>
      </div>

      {/* Modal de Recuperación vía WhatsApp OTP */}
      <PasswordResetModal 
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        initialIdentifier={
          loginMethod === 'credentials' && emailOrPhone
            ? emailOrPhone
            : staffProfiles.find(p => p.id === selectedStaff)?.email || ''
        }
      />

      {/* Modal de Cambio Obligatorio de Contraseña (Primer inicio) */}
      <MustChangePasswordModal 
        isOpen={showMustChangeModal}
        userEmailOrId={mustChangeUserId}
        onPasswordChanged={() => {
          setShowMustChangeModal(false);
          finalizeLogin(pendingSuccessLabel);
        }}
      />
    </div>
  );
};
