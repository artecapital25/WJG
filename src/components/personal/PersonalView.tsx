import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, ShieldCheck, Smartphone, 
  KeyRound, RefreshCw, Power, MessageSquare, Edit3, 
  AlertCircle, Check, CheckCircle2, Lock, Sparkles, Send,
  Hash, Mail, Phone, ShoppingBag, Box, TrendingUp, Settings,
  Eye, EyeOff, Laptop, Tablet, Clock, AlertTriangle, Fingerprint
} from 'lucide-react';
import { useUsuariosTaller } from '../../hooks/useUsuariosTaller';
import { UsuarioTaller, UsuarioTallerInput, HubAreaPermission, HUB_PERMISSIONS_CONFIG, parseDispositivoInfo } from '../../types/usuarios.types';
import { CambiarPinModal } from '../auth/CambiarPinModal';
import { ModalDispositivosUsuario } from './ModalDispositivosUsuario';
import { toast } from '../ui/ToastProvider';
import { formatWhatsAppPhone, openWhatsApp } from '../../services/whatsappService';

const ROLES_PREDEFINIDOS = [
  { id: 'ADMIN_COBRANZAS', label: 'Admin & Cobranzas (Acceso Total)', badgeColor: '#0ea5e9' },
  { id: 'PINTURA_ACABADOS', label: 'Pintura & Acabados (Wendy)', badgeColor: '#c084fc' },
  { id: 'IMPRESION_MANTENIMIENTO', label: 'Impresión & Slicer (Juan)', badgeColor: '#34d399' },
  { id: 'VENTAS_POS', label: 'Ventas & Caja POS', badgeColor: '#f59e0b' }
];

export const PersonalView: React.FC = () => {
  const {
    usuarios,
    isLoading,
    isError,
    errorMessage,
    fetchUsuarios,
    verificarDuplicado,
    createUsuario,
    updateUsuario,
    toggleActivo,
    cambiarPin,
    recuperarPin,
    marcarDispositivoSeguro,
    revocarDispositivoSeguro
  } = useUsuariosTaller();

  // Modales
  const [showModalForm, setShowModalForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioTaller | null>(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinTargetUser, setPinTargetUser] = useState<UsuarioTaller | null>(null);

  const [showDispositivosModal, setShowDispositivosModal] = useState(false);
  const [dispositivosTargetUser, setDispositivosTargetUser] = useState<UsuarioTaller | null>(null);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<string>('IMPRESION_MANTENIMIENTO');
  const [telefono, setTelefono] = useState('');
  const [telefonoNotif, setTelefonoNotif] = useState('');
  const [email, setEmail] = useState('');
  const [cedula, setCedula] = useState('');
  const [permisos, setPermisos] = useState<HubAreaPermission[]>(['taller']);
  const [pinInicial, setPinInicial] = useState('1234');
  const [showPinForm, setShowPinForm] = useState(false);

  // Validación de duplicados en tiempo real
  const [duplicadoWarn, setDuplicadoWarn] = useState<{ campo: string; nombre: string } | null>(null);
  const [isCheckingDuplicado, setIsCheckingDuplicado] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Debounced check para teléfono
  useEffect(() => {
    if (!telefono || telefono.length < 7) {
      if (duplicadoWarn?.campo === 'telefono') setDuplicadoWarn(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingDuplicado(true);
      const res = await verificarDuplicado('telefono', telefono, editingUser?.id);
      setIsCheckingDuplicado(false);
      if (res.existe) {
        setDuplicadoWarn({ campo: 'telefono', nombre: res.nombreExistente || 'otro colaborador' });
      } else if (duplicadoWarn?.campo === 'telefono') {
        setDuplicadoWarn(null);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [telefono, editingUser?.id]);

  // Debounced check para cédula
  useEffect(() => {
    if (!cedula || cedula.length < 5) {
      if (duplicadoWarn?.campo === 'cedula') setDuplicadoWarn(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingDuplicado(true);
      const res = await verificarDuplicado('cedula', cedula, editingUser?.id);
      setIsCheckingDuplicado(false);
      if (res.existe) {
        setDuplicadoWarn({ campo: 'cedula', nombre: res.nombreExistente || 'otro colaborador' });
      } else if (duplicadoWarn?.campo === 'cedula') {
        setDuplicadoWarn(null);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [cedula, editingUser?.id]);

  // Debounced check para email
  useEffect(() => {
    if (!email || !email.includes('@')) {
      if (duplicadoWarn?.campo === 'email') setDuplicadoWarn(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingDuplicado(true);
      const res = await verificarDuplicado('email', email, editingUser?.id);
      setIsCheckingDuplicado(false);
      if (res.existe) {
        setDuplicadoWarn({ campo: 'email', nombre: res.nombreExistente || 'otro colaborador' });
      } else if (duplicadoWarn?.campo === 'email') {
        setDuplicadoWarn(null);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [email, editingUser?.id]);

  const handleOpenCrear = () => {
    setEditingUser(null);
    setNombre('');
    setRol('IMPRESION_MANTENIMIENTO');
    setTelefono('');
    setTelefonoNotif('');
    setEmail('');
    setCedula('');
    setPermisos(['taller']);
    setPinInicial('1234');
    setDuplicadoWarn(null);
    setShowModalForm(true);
  };

  const handleOpenEditar = (user: UsuarioTaller) => {
    setEditingUser(user);
    setNombre(user.nombre);
    setRol(user.rol);
    setTelefono(user.telefono);
    setTelefonoNotif(user.telefono_notificaciones);
    setEmail(user.email || '');
    setCedula(user.cedula || '');
    setPermisos(user.permisos_areas && user.permisos_areas.length > 0 ? user.permisos_areas : ['taller']);
    setPinInicial('');
    setDuplicadoWarn(null);
    setShowModalForm(true);
  };

  const handleTogglePermisoArea = (area: HubAreaPermission) => {
    setPermisos(prev => {
      if (prev.includes(area)) {
        if (prev.length === 1) {
          toast.warning('El colaborador debe tener acceso al menos a un área de trabajo.');
          return prev;
        }
        return prev.filter(p => p !== area);
      } else {
        return [...prev, area];
      }
    });
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim() || !telefono.trim()) {
      toast.warning('Ingresa al menos el nombre y teléfono del colaborador.');
      return;
    }

    if (duplicadoWarn) {
      toast.error(`Conflicto de unicidad: El campo ${duplicadoWarn.campo} ya pertenece a ${duplicadoWarn.nombre}.`);
      return;
    }

    setSubmitting(true);

    if (editingUser) {
      // Actualización
      const updateData: any = {
        nombre: nombre.trim(),
        rol,
        telefono: telefono.trim(),
        telefono_notificaciones: telefonoNotif.trim() || telefono.trim(),
        email: email.trim() || undefined,
        cedula: cedula.trim() || undefined,
        permisos_areas: permisos
      };
      if (pinInicial.trim()) {
        updateData.pin_acceso = pinInicial.trim();
      }

      const res = await updateUsuario(editingUser.id, updateData);

      setSubmitting(false);
      if (res.success) {
        toast.success(res.message);
        setShowModalForm(false);
      } else {
        toast.error(res.message);
      }
    } else {
      // Creación
      const res = await createUsuario({
        nombre: nombre.trim(),
        rol,
        telefono: telefono.trim(),
        telefono_notificaciones: telefonoNotif.trim() || telefono.trim(),
        email: email.trim() || undefined,
        cedula: cedula.trim() || undefined,
        permisos_areas: permisos,
        pin_acceso: pinInicial.trim() || '1234'
      });

      setSubmitting(false);
      if (res.success) {
        toast.success(res.message);
        setShowModalForm(false);
      } else {
        toast.error(res.message);
      }
    }
  };

  const handleSendWhatsAppWelcome = (u: UsuarioTaller) => {
    const phone = formatWhatsAppPhone(u.telefono_notificaciones || u.telefono);
    const msg = encodeURIComponent(
      `👋 ¡Hola *${u.nombre}*! Te damos la bienvenida oficial al equipo operativo de *WJGEEKS 3D PRO* 🚀\n\n` +
      `Tus datos de acceso al sistema son:\n` +
      `🌐 *Plataforma:* ${window.location.origin}\n` +
      `👤 *Operador:* ${u.nombre}\n` +
      `📱 *Teléfono:* ${u.telefono}\n` +
      `🔐 *Clave o PIN:* ${u.pin_acceso || '1234'}\n` +
      `📋 *Áreas Asignadas:* ${u.permisos_areas?.join(', ') || 'taller'}\n\n` +
      `ℹ️ Puedes ingresar con este PIN o utilizar tu propia contraseña alfanumérica en el inicio de sesión.`
    );
    openWhatsApp(`https://wa.me/${phone}?text=${msg}`);
  };

  const getRoleBadge = (rolStr: string) => {
    const found = ROLES_PREDEFINIDOS.find(r => r.id === rolStr);
    if (found) return found;
    return { id: rolStr, label: rolStr, badgeColor: '#38bdf8' };
  };

  const formatUltimaConexion = (iso?: string | null) => {
    if (!iso) {
      return { texto: 'Sin conexiones registradas', color: '#64748b', enLinea: false };
    }
    try {
      const fecha = new Date(iso);
      const ahora = new Date();
      const diffMin = Math.round((ahora.getTime() - fecha.getTime()) / (1000 * 60));

      if (diffMin <= 15) {
        return { texto: 'En línea ahora', color: '#34d399', enLinea: true };
      }
      if (diffMin < 60) {
        return { texto: `Hace ${diffMin} min`, color: '#38bdf8', enLinea: false };
      }

      const diffHoras = Math.round(diffMin / 60);
      if (diffHoras < 24 && fecha.getDate() === ahora.getDate()) {
        const horaStr = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
        return { texto: `Hoy ${horaStr}`, color: '#fbbf24', enLinea: false };
      }

      if (diffHoras < 48) {
        return { texto: 'Ayer', color: '#cbd5e1', enLinea: false };
      }

      return {
        texto: fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }),
        color: '#94a3b8',
        enLinea: false
      };
    } catch {
      return { texto: String(iso), color: '#94a3b8', enLinea: false };
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', color: '#f8fafc', paddingBottom: '90px' }}>
      {/* Header Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '10px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <Users size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                Personal del Taller & Control RBAC
              </h1>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                Directorio de operadores, control de accesos a Hubs y cambio seguro de PIN
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchUsuarios()}
            style={{
              padding: '9px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refrescar</span>
          </button>

          <button
            onClick={handleOpenCrear}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              boxShadow: '0 8px 16px -4px rgba(14, 165, 233, 0.4)'
            }}
          >
            <UserPlus size={16} />
            <span>Nuevo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Banner de Error si falló la conexión */}
      {isError && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#fca5a5',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{errorMessage || 'Error consultando la base de datos de usuarios.'}</span>
          </div>
          <button 
            onClick={() => fetchUsuarios()}
            style={{ background: 'none', border: 'none', color: '#fff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Estado de Carga */}
      {isLoading && usuarios.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--brand-cyan)' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>Cargando directorio de personal desde Supabase...</p>
        </div>
      ) : usuarios.length === 0 ? (
        /* Empty State */
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
          <Users size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <h3 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '1.1rem' }}>No hay colaboradores registrados</h3>
          <p style={{ fontSize: '0.85rem', margin: '0 auto 18px auto', maxWidth: '400px' }}>
            Asegúrate de haber ejecutado el script SQL en Supabase o registra un nuevo colaborador para comenzar.
          </p>
          <button
            onClick={handleOpenCrear}
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 700 }}
          >
            <UserPlus size={16} /> Dar de Alta Colaborador
          </button>
        </div>
      ) : (
        /* Cuadrícula de Tarjetas de Colaboradores (Mobile-First y Responsiva) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {usuarios.map(u => {
            const roleObj = getRoleBadge(u.rol);
            const userAreas = u.permisos_areas || ['taller'];
            const dispositivoData = parseDispositivoInfo(u.dispositivo_info);
            const conexionInfo = formatUltimaConexion(u.ultimo_acceso);

            return (
              <div 
                key={u.id}
                className="glass-card"
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  border: `1px solid ${u.activo ? 'rgba(255, 255, 255, 0.1)' : 'rgba(239, 68, 68, 0.3)'}`,
                  opacity: u.activo ? 1 : 0.65,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Encabezado de Tarjeta con Avatar y Kill Switch */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        backgroundColor: `${roleObj.badgeColor}25`,
                        border: `1px solid ${roleObj.badgeColor}60`,
                        color: roleObj.badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.1rem'
                      }}>
                        {u.nombre.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                            {u.nombre}
                          </h3>
                        </div>
                        {u.cedula && (
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            C.C. {u.cedula}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Kill Switch Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleActivo(u.id, !u.activo)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: `1px solid ${u.activo ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                        backgroundColor: u.activo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: u.activo ? '#34d399' : '#f87171',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Alternar estado activo / inactivo (Kill Switch)"
                    >
                      <Power size={11} />
                      <span>{u.activo ? 'Activo' : 'Bloqueado'}</span>
                    </button>
                  </div>

                  {/* Badge de Rol */}
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: `${roleObj.badgeColor}20`,
                      border: `1px solid ${roleObj.badgeColor}40`,
                      color: roleObj.badgeColor,
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      <Shield size={11} />
                      <span>{roleObj.label}</span>
                    </span>
                  </div>

                  {/* Datos de Contacto */}
                  <div style={{ 
                    background: 'rgba(0, 0, 0, 0.25)', 
                    borderRadius: '10px', 
                    padding: '10px 12px', 
                    fontSize: '0.78rem',
                    marginBottom: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                      <Phone size={13} color="var(--brand-cyan)" />
                      <span>{u.telefono}</span>
                      {u.telefono_notificaciones && u.telefono_notificaciones !== u.telefono && (
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                          (Notif: +{u.telefono_notificaciones})
                        </span>
                      )}
                    </div>

                    {u.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                        <Mail size={13} color="#94a3b8" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.email}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Espacio de Última Conexión y Dispositivo Registrado */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '10px 12px',
                    marginBottom: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {/* Fila 1: Última Conexión */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.74rem' }}>
                        <Clock size={13} color="var(--brand-cyan)" />
                        <span>Última Conexión:</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {conexionInfo.enLinea && (
                          <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: '#34d399',
                            boxShadow: '0 0 6px #34d399',
                            display: 'inline-block'
                          }} />
                        )}
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: conexionInfo.color }}>
                          {conexionInfo.texto}
                        </span>
                      </div>
                    </div>

                    {/* Fila 2: Dispositivo Registrado (Seguro vs Nuevo) */}
                    {dispositivoData ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.74rem', maxWidth: '190px' }}>
                          {dispositivoData.ultimo_dispositivo.tipo === 'movil' ? (
                            <Smartphone size={13} color="#38bdf8" />
                          ) : dispositivoData.ultimo_dispositivo.tipo === 'tablet' ? (
                            <Tablet size={13} color="#a855f7" />
                          ) : (
                            <Laptop size={13} color="#38bdf8" />
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={dispositivoData.ultimo_dispositivo.nombre}>
                            {dispositivoData.ultimo_dispositivo.nombre}
                          </span>
                        </div>

                        {dispositivoData.ultimo_dispositivo.es_seguro ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(16, 185, 129, 0.18)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            fontSize: '0.67rem',
                            fontWeight: 800
                          }}>
                            <ShieldCheck size={11} /> Seguro
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(245, 158, 11, 0.18)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            fontSize: '0.67rem',
                            fontWeight: 800
                          }}>
                            <AlertTriangle size={11} /> Nuevo
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', paddingTop: '2px' }}>
                        Sin dispositivos registrados
                      </div>
                    )}

                    {/* Enlace para ver historial de dispositivos */}
                    {dispositivoData && dispositivoData.historial_dispositivos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setDispositivosTargetUser(u);
                          setShowDispositivosModal(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '0.71rem',
                          cursor: 'pointer',
                          padding: '2px 0 0',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          textDecoration: 'underline'
                        }}
                      >
                        <Laptop size={11} />
                        <span>Ver {dispositivoData.historial_dispositivos.length} dispositivo(s) registrados</span>
                      </button>
                    )}
                  </div>

                  {/* Permisos de Áreas (RBAC) */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Módulos / Hubs Autorizados:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(['ventas', 'taller', 'finanzas', 'gestion'] as HubAreaPermission[]).map(area => {
                        const hasArea = userAreas.includes(area);
                        const conf = HUB_PERMISSIONS_CONFIG[area];

                        return (
                          <span
                            key={area}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              backgroundColor: hasArea ? conf.bgColor : 'rgba(255, 255, 255, 0.03)',
                              border: `1px solid ${hasArea ? conf.borderColor : 'rgba(255, 255, 255, 0.08)'}`,
                              color: hasArea ? conf.color : '#64748b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              opacity: hasArea ? 1 : 0.45
                            }}
                          >
                            <span>{hasArea ? '✓' : '✕'}</span>
                            <span>{conf.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Acciones de la Tarjeta */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
                  paddingTop: '12px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditar(u)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, fontSize: '0.75rem', padding: '6px 10px' }}
                    title="Editar datos, rol y permisos del colaborador"
                  >
                    <Edit3 size={13} />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPinTargetUser(u);
                      setShowPinModal(true);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '6px 10px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.35)' }}
                    title="Cambiar PIN o contraseña de este colaborador"
                  >
                    <KeyRound size={13} />
                    <span>Clave / PIN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppWelcome(u)}
                    className="btn btn-whatsapp btn-sm"
                    style={{ padding: '6px 10px' }}
                    title="Enviar credenciales o aviso por WhatsApp"
                  >
                    <MessageSquare size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Crear / Editar Colaborador */}
      {showModalForm && (
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
          onClick={() => setShowModalForm(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '28px 24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>
                  {editingUser ? `Editar Colaborador: ${editingUser.nombre}` : 'Alta de Nuevo Colaborador'}
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  Asigna rol operativo, credenciales y matriz granular de accesos
                </p>
              </div>
              <button 
                onClick={() => setShowModalForm(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {/* Alerta de Conflicto de Duplicidad en Tiempo Real */}
            {duplicadoWarn && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.18)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                color: '#fca5a5',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} color="#ef4444" />
                <span>
                  <strong>¡Atención!</strong> Este {duplicadoWarn.campo} ya se encuentra registrado con <strong>{duplicadoWarn.nombre}</strong>.
                </span>
              </div>
            )}

            <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Nombre y Cédula */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: '5px' }}>
                    NOMBRE COMPLETO:
                  </label>
                  <input 
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="ej: Andrés Martínez"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: '5px' }}>
                    CÉDULA (ÚNICA):
                  </label>
                  <input 
                    type="text"
                    value={cedula}
                    onChange={e => setCedula(e.target.value)}
                    placeholder="ej: 1098765432"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.6)',
                      border: duplicadoWarn?.campo === 'cedula' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Teléfono y Correo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: '5px' }}>
                    WHATSAPP PRINCIPAL:
                  </label>
                  <input 
                    type="tel"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="ej: 3217273025"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.6)',
                      border: duplicadoWarn?.campo === 'telefono' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: '5px' }}>
                    CORREO ELECTRÓNICO:
                  </label>
                  <input 
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ej: andres@wjgeeks.com"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.6)',
                      border: duplicadoWarn?.campo === 'email' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Rol Operativo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  ROL OPERATIVO:
                </label>
                <select
                  value={rol}
                  onChange={e => setRol(e.target.value)}
                  className="form-select"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px' }}
                >
                  {ROLES_PREDEFINIDOS.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Matriz Granular de Permisos por Áreas */}
              <div style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                  MATRIZ DE ACCESO A HUBS (RBAC):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {(['ventas', 'taller', 'finanzas', 'gestion'] as HubAreaPermission[]).map(area => {
                    const conf = HUB_PERMISSIONS_CONFIG[area];
                    const isChecked = permisos.includes(area);

                    return (
                      <div
                        key={area}
                        onClick={() => handleTogglePermisoArea(area)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: isChecked ? `1px solid ${conf.borderColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isChecked ? conf.bgColor : 'rgba(15, 23, 42, 0.6)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // click en el contenedor
                          style={{ accentColor: conf.color, cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: isChecked ? conf.color : '#94a3b8' }}>
                            {conf.label}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            {conf.submodulos.slice(0, 2).join(', ')}...
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clave / PIN de Acceso (Tanto para Nuevo como Edición) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>
                    {editingUser ? 'CAMBIAR CLAVE / PIN (OPCIONAL):' : 'CLAVE O PIN DE ACCESO:'}
                  </label>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    PIN numérico o clave alfanumérica
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPinForm ? 'text' : 'password'}
                    value={pinInicial}
                    onChange={e => setPinInicial(e.target.value)}
                    placeholder={editingUser ? 'Dejar en blanco para conservar la actual...' : 'ej: 1234 o ClaveSegura#2026'}
                    required={!editingUser}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#38bdf8',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinForm(!showPinForm)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    {showPinForm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  💡 Cada colaborador puede usar un PIN numérico (mín. 4 dígitos) o una contraseña alfanumérica compleja según su preferencia.
                </span>
              </div>

              {/* Botones de Envío */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModalForm(false)}
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
                  disabled={submitting || Boolean(duplicadoWarn)}
                  style={{
                    flex: 2,
                    padding: '11px',
                    borderRadius: '12px',
                    border: 'none',
                    background: duplicadoWarn ? '#475569' : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: submitting || duplicadoWarn ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <ShieldCheck size={16} />
                  <span>{submitting ? 'Guardando...' : editingUser ? 'Actualizar Colaborador' : 'Crear Colaborador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cambio de PIN */}
      {pinTargetUser && (
        <CambiarPinModal
          isOpen={showPinModal}
          onClose={() => {
            setShowPinModal(false);
            setPinTargetUser(null);
          }}
          mode="internal"
          usuarioId={pinTargetUser.id}
          usuarioNombre={pinTargetUser.nombre}
          onCambiarPinInterno={cambiarPin}
          onRecuperarPin={recuperarPin}
          onSuccess={() => fetchUsuarios()}
        />
      )}

      {/* Modal de Gestión de Dispositivos Conectados */}
      {dispositivosTargetUser && (
        <ModalDispositivosUsuario
          isOpen={showDispositivosModal}
          onClose={() => {
            setShowDispositivosModal(false);
            setDispositivosTargetUser(null);
          }}
          usuario={dispositivosTargetUser}
          onMarcarSeguro={marcarDispositivoSeguro}
          onRevocarSeguro={revocarDispositivoSeguro}
        />
      )}
    </div>
  );
};
