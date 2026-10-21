import React, { useState } from 'react';
import { Lock, ShieldCheck, Eye, EyeOff, Sparkles, Smartphone, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { AuthSecurityService } from '../../services/authSecurityService';
import { toast } from '../ui/ToastProvider';

interface StaffAuthGuardProps {
  onLoginSuccess: (userLabel: string) => void;
}

export const StaffAuthGuard: React.FC<StaffAuthGuardProps> = ({ onLoginSuccess }) => {
  const [selectedStaff, setSelectedStaff] = useState<string>('german');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const staffProfiles = [
    { id: 'german', name: 'Germán', role: 'Administrador / Modelado 3D', avatar: 'G' },
    { id: 'wendy', name: 'Wendy', role: 'Administración / Finanzas', avatar: 'W' },
    { id: 'juan', name: 'Juan', role: 'Operador Taller / Producción', avatar: 'J' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMessage('Por favor ingresa tu PIN de acceso o contraseña.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const inputProfile = selectedStaff.toLowerCase();
      const enteredPin = pin.trim();

      // 1. Si Supabase Auth está configurado con usuarios de correo
      if (isSupabaseConfigured && supabase) {
        let email = `${inputProfile}@wjgeeks.com`;
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: enteredPin
        });

        if (!error && data?.user) {
          const label = selectedStaff.toUpperCase();
          if (rememberDevice) {
            AuthSecurityService.saveTrustedDevice(label);
          } else {
            sessionStorage.setItem('wjg_admin_unlocked', 'true');
            localStorage.setItem('wjg_staff_user', label);
          }
          toast.success(`Bienvenido al sistema, ${label} 👋`);
          onLoginSuccess(label);
          return;
        }
      }

      // 2. Validación de PIN mediante Hash SHA-256 (Cero credenciales en texto plano)
      const isValid = await AuthSecurityService.verifyEmergencyPin(enteredPin);

      if (isValid) {
        const staffLabel = selectedStaff.toUpperCase();
        if (rememberDevice) {
          AuthSecurityService.saveTrustedDevice(staffLabel);
        } else {
          sessionStorage.setItem('wjg_admin_unlocked', 'true');
          localStorage.setItem('wjg_staff_user', staffLabel);
        }
        toast.success(`Acceso Autorizado • Sesión iniciada como ${staffLabel}`);
        onLoginSuccess(staffLabel);
        return;
      }

      setErrorMessage('PIN o contraseña incorrecta. Verifica tus credenciales e intenta nuevamente.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error validando credenciales.');
    } finally {
      setLoading(false);
    }
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
      {/* Background Glows */}
      <div 
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '10%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <div 
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '36px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Header con Logo y Candado */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
            Plataforma Operativa Interna de Taller y POS
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
            <ShieldCheck size={14} /> Acceso Restringido a Personal Autorizado
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selector de Perfil de Staff */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Selecciona tu Perfil
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
                      padding: '12px 8px',
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
                        fontSize: '0.9rem'
                      }}
                    >
                      {profile.avatar}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: isSelected ? 700 : 500 }}>
                      {profile.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input de PIN / Contraseña */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PIN de Taller / Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Ingresa tu clave de acceso..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 44px 14px 16px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
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
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Checkbox Dispositivo Confiable */}
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
              <Smartphone size={14} color="#38bdf8" /> Recordar este dispositivo por 30 días
            </span>
          </label>

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
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Botón de Entrada */}
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
              <span>Verificando...</span>
            ) : (
              <>
                <Sparkles size={18} /> Iniciar Sesión Operativa
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>
          🔒 Sesión segura con cifrado SHA-256 Web Crypto y aislamiento multi-dispositivo.
        </div>
      </div>
    </div>
  );
};
