import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, UserCheck, Smartphone, Hash, Sparkles } from 'lucide-react';
import { WhatsAppOtpService } from '../../services/whatsappOtpService';
import { toast } from '../ui/ToastProvider';

interface CambiarPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'internal' | 'recovery';
  usuarioId?: string;
  usuarioNombre?: string;
  onCambiarPinInterno?: (id: string, pinActual: string, pinNuevo: string) => Promise<{ success: boolean; message: string }>;
  onRecuperarPin?: (cedula: string, telefono: string, pinNuevo: string) => Promise<{ success: boolean; message: string }>;
  onSuccess?: () => void;
}

export const CambiarPinModal: React.FC<CambiarPinModalProps> = ({
  isOpen,
  onClose,
  mode = 'internal',
  usuarioId,
  usuarioNombre,
  onCambiarPinInterno,
  onRecuperarPin,
  onSuccess
}) => {
  const [activeMode, setActiveMode] = useState<'internal' | 'recovery'>(mode);
  const [pinActual, setPinActual] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPins, setShowPins] = useState(false);

  // Campos de recuperación
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const strength = WhatsAppOtpService.calculatePasswordStrength(pinNuevo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanNew = pinNuevo.trim();
    if (cleanNew.length < 4) {
      setErrorMsg('La nueva clave o PIN debe contener al menos 4 caracteres o dígitos.');
      return;
    }

    if (cleanNew !== pinConfirm.trim()) {
      setErrorMsg('La confirmación de la nueva clave no coincide.');
      return;
    }

    setLoading(true);

    try {
      if (activeMode === 'internal') {
        if (!onCambiarPinInterno || !usuarioId) {
          setErrorMsg('No se especificó el usuario para cambio interno.');
          setLoading(false);
          return;
        }

        const res = await onCambiarPinInterno(usuarioId, pinActual, pinNuevo);
        if (res.success) {
          toast.success(res.message);
          if (onSuccess) onSuccess();
          handleClose();
        } else {
          setErrorMsg(res.message);
        }
      } else {
        // Modo Recuperación
        if (!cedula.trim() || !telefono.trim()) {
          setErrorMsg('Por favor ingresa tu cédula y número de teléfono.');
          setLoading(false);
          return;
        }

        if (!onRecuperarPin) {
          setErrorMsg('Servicio de recuperación no disponible.');
          setLoading(false);
          return;
        }

        const res = await onRecuperarPin(cedula, telefono, pinNuevo);
        if (res.success) {
          toast.success(res.message);
          if (onSuccess) onSuccess();
          handleClose();
        } else {
          setErrorMsg(res.message);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado al actualizar credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPinActual('');
    setPinNuevo('');
    setPinConfirm('');
    setCedula('');
    setTelefono('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(12px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '24px',
          padding: '30px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '1.2rem'
          }}
        >
          ✕
        </button>

        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
            marginBottom: '12px'
          }}>
            <KeyRound size={26} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>
            {activeMode === 'internal' ? 'Actualizar Clave o PIN de Acceso' : 'Recuperar Clave Operativa'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
            {activeMode === 'internal' 
              ? (usuarioNombre ? `Operador: ${usuarioNombre}` : 'Define tu PIN numérico o contraseña alfanumérica personal')
              : 'Verifica tu identidad con cédula y teléfono para restablecer tu acceso'}
          </p>
        </div>

        {/* Toggle de Modo: Cambio Interno vs Recuperación */}
        <div style={{
          display: 'flex',
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '12px',
          padding: '3px',
          marginBottom: '18px',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <button
            type="button"
            onClick={() => { setActiveMode('internal'); setErrorMsg(null); }}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: '9px',
              border: 'none',
              background: activeMode === 'internal' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeMode === 'internal' ? '#38bdf8' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            Sé mi clave / PIN actual
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('recovery'); setErrorMsg(null); }}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: '99px',
              border: 'none',
              background: activeMode === 'recovery' ? 'rgba(234, 179, 8, 0.2)' : 'transparent',
              color: activeMode === 'recovery' ? '#facc15' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            Olvidé mi clave (Recuperar)
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* MODO 1: INTERNO (CLAVE/PIN ACTUAL) */}
          {activeMode === 'internal' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: '5px' }}>
                CONTRASEÑA O PIN ACTUAL / TEMPORAL:
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPins ? 'text' : 'password'}
                  value={pinActual}
                  onChange={e => setPinActual(e.target.value)}
                  placeholder="Ingresa tu clave actual..."
                  required
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 14px',
                    borderRadius: '12px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPins(!showPins)}
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
                  {showPins ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ) : (
            /* MODO 2: RECUPERACIÓN (CÉDULA + TELÉFONO) */
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: '5px' }}>
                  DOCUMENTO DE IDENTIDAD (CÉDULA):
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text"
                    value={cedula}
                    onChange={e => setCedula(e.target.value)}
                    placeholder="ej: 1098765432"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 36px',
                      borderRadius: '12px',
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Hash size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: '5px' }}>
                  NÚMERO DE TELÉFONO REGISTRADO:
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="tel"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="ej: 3217273025"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 36px',
                      borderRadius: '12px',
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Smartphone size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                </div>
              </div>
            </>
          )}

          {/* NUEVA CLAVE O PIN */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>
                NUEVA CONTRASEÑA O PIN:
              </label>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                PIN numérico o clave alfanumérica
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPins ? 'text' : 'password'}
                value={pinNuevo}
                onChange={e => setPinNuevo(e.target.value)}
                placeholder="Ingresa PIN (ej: 1234) o clave compleja"
                required
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 14px',
                  borderRadius: '12px',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPins(!showPins)}
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
                {showPins ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Indicador de Tipo de Clave y Fortaleza en Tiempo Real */}
            {pinNuevo.length > 0 && (
              <div style={{ marginTop: '6px' }}>
                {strength.isPin ? (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    fontSize: '0.72rem',
                    fontWeight: 600
                  }}>
                    <CheckCircle2 size={13} />
                    <span>PIN Numérico ({pinNuevo.length} dígitos) • Acceso rápido</span>
                  </div>
                ) : pinNuevo.length >= 4 ? (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: `${strength.color}20`,
                    border: `1px solid ${strength.color}50`,
                    color: strength.color,
                    fontSize: '0.72rem',
                    fontWeight: 600
                  }}>
                    <ShieldCheck size={13} />
                    <span>Contraseña Alfanumérica ({strength.label})</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: '#f87171' }}>
                    Mínimo 4 caracteres o dígitos.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CONFIRMACIÓN DE CLAVE */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: '5px' }}>
              CONFIRMAR NUEVA CLAVE O PIN:
            </label>
            <input 
              type={showPins ? 'text' : 'password'}
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value)}
              placeholder="Repite tu nueva clave o PIN"
              required
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '12px',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Mensajes de error */}
          {errorMsg && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '11px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <ShieldCheck size={16} />
              <span>{loading ? 'Guardando...' : 'Guardar Nueva Clave / PIN'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
