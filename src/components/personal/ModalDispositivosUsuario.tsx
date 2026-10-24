import React from 'react';
import { 
  X, 
  Smartphone, 
  Laptop, 
  Tablet, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Check, 
  Trash2, 
  Fingerprint,
  Monitor
} from 'lucide-react';
import { UsuarioTaller, DispositivoConexion, parseDispositivoInfo } from '../../types/usuarios.types';

interface ModalDispositivosUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  usuario: UsuarioTaller | null;
  onMarcarSeguro: (usuarioId: string, fingerprint: string) => Promise<boolean>;
  onRevocarSeguro: (usuarioId: string, fingerprint: string) => Promise<boolean>;
}

export const ModalDispositivosUsuario: React.FC<ModalDispositivosUsuarioProps> = ({
  isOpen,
  onClose,
  usuario,
  onMarcarSeguro,
  onRevocarSeguro
}) => {
  if (!isOpen || !usuario) return null;

  const consolidado = parseDispositivoInfo(usuario.dispositivo_info);
  const dispositivos = consolidado?.historial_dispositivos || [];

  const formatFecha = (iso?: string) => {
    if (!iso) return 'Sin fecha registrada';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return iso;
    }
  };

  const getDeviceIcon = (tipo?: string) => {
    switch (tipo) {
      case 'movil':
        return <Smartphone size={20} color="#38bdf8" />;
      case 'tablet':
        return <Tablet size={20} color="#a855f7" />;
      default:
        return <Laptop size={20} color="#38bdf8" />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 1000,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Monitor size={18} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                Dispositivos de Conexión
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8' }}>
                Colaborador: <strong style={{ color: '#38bdf8' }}>{usuario.nombre}</strong> ({usuario.rol})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Resumen de Último Acceso */}
        <div style={{
          padding: '12px 20px',
          background: 'rgba(56, 189, 248, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
            <Clock size={14} color="#38bdf8" />
            <span>Última conexión registrada:</span>
          </div>
          <span style={{ fontWeight: 700, color: '#f8fafc' }}>
            {formatFecha(usuario.ultimo_acceso || undefined)}
          </span>
        </div>

        {/* Lista de Dispositivos */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {dispositivos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
              <Monitor size={40} style={{ opacity: 0.4, margin: '0 auto 10px' }} />
              <p style={{ fontWeight: 700, color: '#94a3b8', margin: '0 0 4px' }}>Sin dispositivos registrados aún</p>
              <p style={{ fontSize: '0.78rem', margin: 0 }}>
                El registro se creará automáticamente cuando este colaborador inicie sesión con su PIN o contraseña.
              </p>
            </div>
          ) : (
            dispositivos.map((dev, idx) => {
              const isLatest = idx === 0;

              return (
                <div
                  key={dev.id || dev.fingerprint || idx}
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: `1px solid ${dev.es_seguro ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        {getDeviceIcon(dev.tipo)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                            {dev.nombre}
                          </span>
                          {isLatest && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(56, 189, 248, 0.2)',
                              color: '#38bdf8'
                            }}>
                              Actual / Más reciente
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {dev.so} • {dev.navegador} {dev.resolucion ? `• ${dev.resolucion}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Badge Estado de Confianza */}
                    {dev.es_seguro ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(16, 185, 129, 0.18)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}>
                        <ShieldCheck size={13} />
                        <span>Dispositivo Seguro</span>
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(245, 158, 11, 0.18)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}>
                        <AlertTriangle size={13} />
                        <span>Nuevo / No Verificado</span>
                      </span>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: '8px',
                    fontSize: '0.72rem',
                    color: '#94a3b8'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Fingerprint size={12} color="#64748b" />
                      <span>Huella: <code style={{ color: '#cbd5e1' }}>{dev.fingerprint || dev.id}</code></span>
                      <span style={{ margin: '0 4px' }}>•</span>
                      <span>Conectado: {formatFecha(dev.fecha_conexion)}</span>
                    </div>

                    {/* Acciones de Confianza */}
                    <div>
                      {dev.es_seguro ? (
                        <button
                          type="button"
                          onClick={() => onRevocarSeguro(usuario.id, dev.fingerprint || dev.id)}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '6px',
                            color: '#f87171',
                            padding: '3px 8px',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Revocar confianza de este dispositivo"
                        >
                          <Trash2 size={11} /> Revocar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onMarcarSeguro(usuario.id, dev.fingerprint || dev.id)}
                          style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            borderRadius: '6px',
                            color: '#34d399',
                            padding: '3px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Marcar como dispositivo de confianza para este usuario"
                        >
                          <Check size={11} /> Marcar como Seguro
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#090d16',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
            Total registrados: <strong>{dispositivos.length}</strong> dispositivo(s)
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
