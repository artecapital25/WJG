import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, ShieldCheck, Smartphone, Laptop, 
  KeyRound, Copy, Check, MessageSquare, Power, RefreshCw, 
  AlertCircle, Lock, Sparkles, Send, CheckCircle2 
} from 'lucide-react';
import { WhatsAppOtpService, UserSystemAccount } from '../../services/whatsappOtpService';
import { toast } from '../ui/ToastProvider';

export const UsuariosManagerView: React.FC = () => {
  const [users, setUsers] = useState<UserSystemAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Formulario nuevo usuario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState<'admin' | 'pos' | 'taller' | 'cobranzas'>('taller');
  const [passwordProvisional, setPasswordProvisional] = useState(WhatsAppOtpService.generateProvisionalPassword());
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rolesConfig = [
    { id: 'admin', label: 'Administrador Global', desc: 'Acceso total y configuración de sistema', badgeColor: '#0ea5e9' },
    { id: 'pos', label: 'Ventas / POS', desc: 'Caja rápida, ventas express y cotizaciones', badgeColor: '#10b981' },
    { id: 'taller', label: 'Taller / Producción', desc: 'Órdenes de trabajo (OT), insumos y calendario', badgeColor: '#8b5cf6' },
    { id: 'cobranzas', label: 'Cobranzas', desc: 'Cuentas por cobrar, abonos y cartera', badgeColor: '#f59e0b' }
  ];

  const loadUsers = async () => {
    setLoading(true);
    const data = await WhatsAppOtpService.adminFetchUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRegeneratePassword = () => {
    setPasswordProvisional(WhatsAppOtpService.generateProvisionalPassword());
    setCopied(false);
  };

  const handleCopyCredentials = () => {
    const text = `🔐 Credenciales WJGEEKS 3D:\nUsuario: ${email || nombre}\nWhatsApp: ${telefono}\nContraseña Temporal: ${passwordProvisional}\nAcceso: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Credenciales copiadas al portapapeles');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendWelcomeWhatsApp = (userPhone: string, userName: string, userPass: string) => {
    let clean = userPhone.replace(/\D/g, '');
    if (clean.length === 10 && clean.startsWith('3')) clean = `57${clean}`;
    const msg = encodeURIComponent(
      `👋 ¡Hola ${userName}! Te damos la bienvenida a *WJGEEKS 3D PRO*.\n\n` +
      `Tus credenciales de acceso operativo son:\n` +
      `🌐 *Plataforma:* ${window.location.origin}\n` +
      `👤 *Usuario / Teléfono:* ${userPhone}\n` +
      `🔑 *Contraseña Provisional:* ${userPass}\n\n` +
      `⚠️ *Nota:* En tu primer inicio de sesión se te solicitará definir tu contraseña personal definitiva.`
    );
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !email || !telefono || !passwordProvisional) {
      toast.warning('Completa todos los campos del formulario');
      return;
    }

    setSubmitting(true);
    const res = await WhatsAppOtpService.adminCreateUser({
      nombre,
      email,
      telefono,
      rol,
      passwordProvisional,
      mustChangePassword: true
    });
    setSubmitting(false);

    if (res.success) {
      toast.success(res.message);
      setShowCreateModal(false);
      // Limpiar formulario
      setNombre('');
      setEmail('');
      setTelefono('');
      setRol('taller');
      setPasswordProvisional(WhatsAppOtpService.generateProvisionalPassword());
      loadUsers();
    } else {
      toast.error(res.message);
    }
  };

  const handleToggleActive = async (user: UserSystemAccount) => {
    const newStatus = !user.activo;
    const res = await WhatsAppOtpService.adminToggleUserActive(user.id, newStatus);
    if (res.success) {
      toast.info(res.message);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, activo: newStatus } : u));
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '10px', borderRadius: '14px', background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
              <Users size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Gestión de Personal y Cuentas</h1>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                Control de roles, dispositivos vinculados, Kill Switch de acceso y bienvenida vía WhatsApp
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadUsers}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem'
            }}
          >
            <RefreshCw size={16} /> Refrescar
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              boxShadow: '0 8px 16px -4px rgba(14, 165, 233, 0.4)'
            }}
          >
            <UserPlus size={18} /> Nuevo Colaborador
          </button>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div 
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(30, 41, 59, 0.4)' }}>
                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>Colaborador</th>
                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>Rol Asignado</th>
                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>WhatsApp / Correo</th>
                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>Dispositivo / Conexión</th>
                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>Estado (Kill Switch)</th>
                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Cargando cuentas de personal...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No hay colaboradores registrados. Da clic en "Nuevo Colaborador" para comenzar.
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const roleObj = rolesConfig.find(r => r.id === u.rol) || rolesConfig[2];
                  const isMobile = u.dispositivo_info?.tipo === 'movil';

                  return (
                    <tr 
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background-color 0.2s',
                        opacity: u.activo ? 1 : 0.5
                      }}
                    >
                      {/* Nombre y Avatar */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div 
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: roleObj.badgeColor,
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.9rem'
                            }}
                          >
                            {u.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#f8fafc' }}>{u.nombre}</div>
                            {u.must_change_password && (
                              <span style={{ fontSize: '0.7rem', color: '#eab308', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <KeyRound size={10} /> Clave temporal pendiente
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td style={{ padding: '16px 20px' }}>
                        <span 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            backgroundColor: `${roleObj.badgeColor}20`,
                            border: `1px solid ${roleObj.badgeColor}50`,
                            color: roleObj.badgeColor,
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          <Shield size={12} /> {roleObj.label}
                        </span>
                      </td>

                      {/* Contacto */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ color: '#cbd5e1' }}>{u.telefono_whatsapp}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                      </td>

                      {/* Dispositivo y Último Acceso */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.8rem' }}>
                          {isMobile ? <Smartphone size={14} color="#38bdf8" /> : <Laptop size={14} color="#a855f7" />}
                          <span>{u.dispositivo_info?.tipo ? (isMobile ? 'Celular' : 'Escritorio') : 'Sin registro'}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString() : 'Nunca ha ingresado'}
                        </div>
                      </td>

                      {/* Estado / Kill Switch */}
                      <td style={{ padding: '16px 20px' }}>
                        <button
                          onClick={() => handleToggleActive(u)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: u.activo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: u.activo ? '#34d399' : '#f87171',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}
                        >
                          <Power size={13} /> {u.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleSendWelcomeWhatsApp(u.telefono_whatsapp, u.nombre, 'Wjg#Temporal')}
                          title="Enviar bienvenida por WhatsApp"
                          style={{
                            padding: '8px',
                            borderRadius: '10px',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            cursor: 'pointer'
                          }}
                        >
                          <MessageSquare size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Nuevo Colaborador (Onboarding Rápido) */}
      {showCreateModal && (
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
              maxWidth: '520px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '32px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px 0', color: '#f8fafc' }}>
                  Alta de Nuevo Colaborador
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  Genera credenciales y envía el acceso por WhatsApp en 1 clic
                </p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  NOMBRE COMPLETO
                </label>
                <input 
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="ej: Andrés Martínez"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    CORREO ELECTRÓNICO
                  </label>
                  <input 
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="andres@wjgeeks.com"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
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
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    WHATSAPP PRINCIPAL
                  </label>
                  <input 
                    type="tel"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="3201234567"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
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
              </div>

              {/* Rol Asignado */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                  ROL Y MATRIZ DE PERMISOS
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {rolesConfig.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRol(r.id as any)}
                      style={{
                        padding: '10px',
                        borderRadius: '12px',
                        border: rol === r.id ? `2px solid ${r.badgeColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                        backgroundColor: rol === r.id ? `${r.badgeColor}15` : 'rgba(30, 41, 59, 0.4)',
                        color: rol === r.id ? '#f8fafc' : '#94a3b8',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: rol === r.id ? r.badgeColor : '#e2e8f0' }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                        {r.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contraseña Temporal Generada */}
              <div 
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(30, 41, 59, 0.7)',
                  border: '1px dashed rgba(255, 255, 255, 0.2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Contraseña Provisional (Obliga cambio al entrar)
                  </span>
                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    Regenerar
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>
                    {passwordProvisional}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleCopyCredentials}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem'
                      }}
                    >
                      {copied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                    {telefono && (
                      <button
                        type="button"
                        onClick={() => handleSendWelcomeWhatsApp(telefono, nombre || 'Colaborador', passwordProvisional)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        <Send size={13} /> Enviar WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón Guardar */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: '8px',
                  padding: '13px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {submitting ? <span>Creando cuenta...</span> : <span>Confirmar y Dar de Alta</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
