import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Smartphone, 
  Send, 
  Mail, 
  Settings2, 
  ExternalLink,
  ShieldCheck,
  Server,
  KeyRound,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { WhatsAppGatewayService, WhatsAppGatewayConfig, GatewayStatusResponse } from '../../services/whatsappGatewayService';
import { EmailNotificationService } from '../../services/emailNotificationService';
import { WhatsAppNotificationService } from '../../services/whatsappNotificationService';
import { toast } from '../ui/ToastProvider';

interface WhatsAppConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppConnectModal: React.FC<WhatsAppConnectModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<WhatsAppGatewayConfig>(WhatsAppGatewayService.getConfig());
  const [status, setStatus] = useState<GatewayStatusResponse>({
    connected: false,
    status: 'disconnected',
    message: 'Consultando estado...'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRequestingPairing, setIsRequestingPairing] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qr' | 'settings' | 'test'>('qr');
  
  // Test states
  const [testPhone, setTestPhone] = useState('3503443140');
  const [testEmail, setTestEmail] = useState('wjgeeks3d@gmail.com');
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    refreshStatus();

    // Sondeo periódico activo cada 2.0s mientras el modal esté abierto
    const interval = setInterval(() => {
      WhatsAppGatewayService.checkStatus().then(res => {
        setStatus(prev => {
          // Si el servidor está reconectando o negociando nuevo QR, preservar el QR previo para evitar parpadeos
          const qrCodeToUse = res.qrCode || (res.connected ? undefined : prev.qrCode);
          if (
            prev.connected !== res.connected ||
            prev.status !== res.status ||
            prev.qrCode !== qrCodeToUse ||
            prev.message !== res.message
          ) {
            return {
              ...res,
              qrCode: qrCodeToUse
            };
          }
          return prev;
        });
      }).catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, config.gatewayUrl]);

  const refreshStatus = async () => {
    setIsLoading(true);
    try {
      const res = await WhatsAppGatewayService.checkStatus();
      setStatus(prev => ({
        ...res,
        qrCode: res.qrCode || (res.connected ? undefined : prev.qrCode)
      }));
      if (res.pairingCode) setPairingCode(res.pairingCode);
    } catch (_) {
      setStatus(prev => ({
        connected: false,
        status: 'disconnected',
        qrCode: prev.qrCode,
        message: 'No fue posible conectar con el servidor gateway.'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSession = async () => {
    setIsResetting(true);
    try {
      const res = await WhatsAppGatewayService.resetSession();
      if (res.success) {
        toast.success(res.message);
        setStatus(prev => ({
          ...prev,
          connected: false,
          status: 'connecting',
          qrCode: undefined,
          message: 'Generando nuevo código QR limpio...'
        }));
        setPairingCode(null);
        setTimeout(refreshStatus, 2500);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al resetear la sesión');
    } finally {
      setIsResetting(false);
    }
  };

  const handleRequestPairingCode = async () => {
    setIsRequestingPairing(true);
    try {
      const res = await WhatsAppGatewayService.requestPairingCode(config.officialPhone);
      if (res.success && res.code) {
        setPairingCode(res.code);
        toast.success(`Código de vinculación generado: ${res.code}`);
      } else {
        toast.warning(res.message || 'No fue posible generar el código. Usa el código QR.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al solicitar código');
    } finally {
      setIsRequestingPairing(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = WhatsAppGatewayService.saveConfig(config);
    setConfig(saved);
    toast.success('Configuración guardada correctamente.');
    refreshStatus();
  };

  const handleSendTestWhatsApp = async (phoneToUse?: string) => {
    const target = phoneToUse || testPhone;
    if (!target) {
      toast.error('Ingresa un número de teléfono de destino.');
      return;
    }

    setIsSendingWa(true);
    try {
      const testMsg = `🧪 *WJGEEKS 3D - Mensaje de Prueba*\n\nHola! Esta es una prueba del canal oficial de WhatsApp de WJGEEKS (+57 320 2796115).\n\n✅ Canal: ${config.provider === 'qr_gateway' ? 'Gateway QR (Sesión Empresa)' : 'Meta Cloud API'}\n🕒 Fecha: ${new Date().toLocaleTimeString('es-CO')}\n\n_Mensaje automático del sistema 3D PRO._`;
      
      const res = await WhatsAppNotificationService.despacharNotificacionAutomatica(target, testMsg);
      if (res.success) {
        toast.success(`WhatsApp enviado correctamente a ${target}`);
      } else {
        toast.warning(res.error || 'Mensaje no enviado automáticamente; enlace de WhatsApp abierto.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar WhatsApp.');
    } finally {
      setIsSendingWa(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Ingresa un correo electrónico.');
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await EmailNotificationService.enviarCorreoTransaccional({
        tipo: 'alerta_equipo',
        destinatario_correo: testEmail,
        destinatario_nombre: 'Equipo WJGEEKS',
        asunto: '🧪 Verificación de Correo WJGEEKS 3D (wjgeeks3d@gmail.com)',
        tracking_url: window.location.origin,
        datos: {
          numero_doc: 'PRUEBA-001',
          mensaje_personalizado: 'Este correo certifica que el canal transaccional de WJGEEKS 3D PRO está funcionando desde la cuenta oficial wjgeeks3d@gmail.com a través de Google Apps Script.',
          fecha: new Date().toLocaleString('es-CO')
        }
      });

      if (res.success) {
        toast.success(`Correo enviado exitosamente a ${testEmail} desde wjgeeks3d@gmail.com`);
      } else {
        toast.error(`Error al despachar correo: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.15)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Smartphone size={22} color="#4ade80" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Canal Oficial WhatsApp & Correo
                </h2>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}>
                  320 2796115
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0' }}>
                Envíos automáticos a clientes y equipo desde la línea corporativa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Bar */}
        <div style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: status.connected 
            ? 'rgba(34, 197, 94, 0.08)' 
            : status.status === 'qr_ready'
            ? 'rgba(56, 189, 248, 0.08)'
            : 'rgba(239, 68, 68, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {status.connected ? (
              <CheckCircle2 size={16} color="#4ade80" />
            ) : status.status === 'qr_ready' ? (
              <QrCode size={16} color="#38bdf8" />
            ) : (
              <AlertTriangle size={16} color="#f87171" />
            )}
            <span style={{ 
              fontSize: '0.85rem', 
              fontWeight: 600, 
              color: status.connected ? '#4ade80' : status.status === 'qr_ready' ? '#38bdf8' : '#f87171' 
            }}>
              {status.message}
            </span>
          </div>

          <button
            onClick={refreshStatus}
            disabled={isLoading}
            style={{
              padding: '4px 10px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              color: '#cbd5e1',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            Actualizar Estado
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(15, 23, 42, 0.6)'
        }}>
          <button
            onClick={() => setActiveTab('qr')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'qr' ? '2px solid #22c55e' : '2px solid transparent',
              color: activeTab === 'qr' ? '#4ade80' : '#94a3b8',
              fontWeight: activeTab === 'qr' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <QrCode size={15} />
            Vincular Celular (QR)
          </button>
          <button
            onClick={() => setActiveTab('test')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'test' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'test' ? '#38bdf8' : '#94a3b8',
              fontWeight: activeTab === 'test' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Send size={15} />
            Pruebas en Vivo
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'settings' ? '2px solid #a855f7' : '2px solid transparent',
              color: activeTab === 'settings' ? '#c084fc' : '#94a3b8',
              fontWeight: activeTab === 'settings' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Settings2 size={15} />
            Ajustes & Meta API
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: QR PAIRING */}
          {activeTab === 'qr' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
              {status.connected ? (
                <div style={{
                  padding: '2rem 1.5rem',
                  backgroundColor: 'rgba(34, 197, 94, 0.05)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '12px',
                  width: '100%'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}>
                    <CheckCircle2 size={36} color="#4ade80" />
                  </div>
                  <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                    ¡WhatsApp Oficial Vinculado y Activo!
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto 1.25rem' }}>
                    El sistema está listo para despachar cotizaciones, confirmaciones de abono y alertas de taller en segundo plano desde el número <strong style={{ color: '#4ade80' }}>+57 320 2796115</strong>.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={() => setActiveTab('test')}
                      style={{
                        padding: '0.6rem 1.2rem',
                        backgroundColor: '#22c55e',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Send size={15} />
                      Realizar Envío de Prueba
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    padding: '1.25rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.45)',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '240px',
                    minHeight: '240px',
                    position: 'relative'
                  }}>
                    {status.qrCode ? (
                      <>
                        <img 
                          src={status.qrCode.startsWith('data:') ? status.qrCode : `data:image/png;base64,${status.qrCode}`} 
                          alt="Código QR WhatsApp Oficial" 
                          style={{ width: '220px', height: '220px', objectFit: 'contain', display: 'block' }}
                        />
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 700, 
                          color: '#0f172a', 
                          marginTop: '0.5rem',
                          backgroundColor: '#e2e8f0',
                          padding: '2px 8px',
                          borderRadius: '9999px'
                        }}>
                          ⚡ Protocolo Multi-Device Oficial
                        </span>
                      </>
                    ) : (
                      <div style={{ color: '#475569', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1rem', textAlign: 'center' }}>
                        <Loader2 size={42} color="#0284c7" className="animate-spin" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                          {status.status === 'connecting' ? 'Generando código QR seguro...' : `Esperando Gateway (${config.gatewayUrl})`}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '220px', lineHeight: '1.4' }}>
                          Asegúrate de ejecutar en la terminal <code style={{ backgroundColor: '#f1f5f9', padding: '2px 5px', borderRadius: '4px', color: '#0f172a' }}>npm run wa:gateway</code>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Acciones de Reseteo y Código de 8 Dígitos */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem', width: '100%' }}>
                    <button
                      onClick={handleResetSession}
                      disabled={isResetting}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#fca5a5',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: isResetting ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <RotateCcw size={13} className={isResetting ? 'animate-spin' : ''} />
                      {isResetting ? 'Purgando sesión...' : 'Limpiar / Resetear Sesión'}
                    </button>

                    <button
                      onClick={handleRequestPairingCode}
                      disabled={isRequestingPairing}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '8px',
                        color: '#7dd3fc',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: isRequestingPairing ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <KeyRound size={13} className={isRequestingPairing ? 'animate-spin' : ''} />
                      {isRequestingPairing ? 'Solicitando...' : 'Vincular por Código de 8 Dígitos'}
                    </button>
                  </div>

                  {/* Visualización de Código de Emparejamiento si está activo */}
                  {pairingCode && (
                    <div style={{
                      width: '100%',
                      padding: '1rem',
                      marginBottom: '1rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Código de vinculación para {config.officialPhone}:
                      </div>
                      <div style={{
                        fontSize: '1.6rem',
                        fontWeight: 900,
                        letterSpacing: '4px',
                        color: '#38bdf8',
                        fontFamily: 'monospace'
                      }}>
                        {pairingCode}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.4rem' }}>
                        En WhatsApp ve a <em>Dispositivos vinculados &gt; Vincular con número de teléfono</em> e introduce este código.
                      </div>
                    </div>
                  )}

                  <div style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '1rem',
                    textAlign: 'left',
                    width: '100%',
                    fontSize: '0.85rem',
                    color: '#cbd5e1'
                  }}>
                    <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '0.4rem' }}>
                      📱 Pasos para vincular el celular oficial:
                    </strong>
                    <ol style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                      <li>Abre WhatsApp en el celular de la empresa (<strong>320 2796115</strong>).</li>
                      <li>Toca los tres puntos (⋮) o Ajustes &gt; <strong>Dispositivos vinculados</strong>.</li>
                      <li>Toca <strong>Vincular un dispositivo</strong> y apunta la cámara a este código QR.</li>
                      <li>¡Listo! Tu celular físico seguirá funcionando normalmente y el sistema podrá enviar en segundo plano.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE TESTS */}
          {activeTab === 'test' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* WhatsApp Test Section */}
              <div style={{
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Smartphone size={18} color="#4ade80" />
                  <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem', fontWeight: 700 }}>
                    1. Envío de WhatsApp en Vivo (+57 320 2796115)
                  </h4>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 1rem' }}>
                  Envía un mensaje de prueba con un solo clic a los miembros del equipo interno o a un número personalizado.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button
                    onClick={() => handleSendTestWhatsApp('3217273025')}
                    disabled={isSendingWa}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.8rem',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <strong style={{ display: 'block', color: '#38bdf8' }}>Juan (Impresión)</strong>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>+57 321 727 3025</span>
                  </button>

                  <button
                    onClick={() => handleSendTestWhatsApp('3204814702')}
                    disabled={isSendingWa}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.8rem',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <strong style={{ display: 'block', color: '#ec4899' }}>Wendy (Pintura)</strong>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>+57 320 481 4702</span>
                  </button>

                  <button
                    onClick={() => handleSendTestWhatsApp('3503443140')}
                    disabled={isSendingWa}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.8rem',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <strong style={{ display: 'block', color: '#a855f7' }}>Germán (Dirección)</strong>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>+57 350 344 3140</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Número personalizado (ej: 3503443140)"
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                  <button
                    onClick={() => handleSendTestWhatsApp()}
                    disabled={isSendingWa}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#22c55e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Send size={14} />
                    {isSendingWa ? 'Enviando...' : 'Enviar Prueba'}
                  </button>
                </div>
              </div>

              {/* Email Test Section */}
              <div style={{
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Mail size={18} color="#38bdf8" />
                  <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem', fontWeight: 700 }}>
                    2. Envío de Correo Transaccional (wjgeeks3d@gmail.com)
                  </h4>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 1rem' }}>
                  Prueba el envío con diseño HTML cyberpunk ejecutado desde el Google Apps Script oficial de la empresa.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Correo de destino"
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                  <button
                    onClick={handleSendTestEmail}
                    disabled={isSendingEmail}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Mail size={14} />
                    {isSendingEmail ? 'Enviando...' : 'Probar Correo'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SETTINGS & META CLOUD API */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Proveedor de Envío de WhatsApp:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, provider: 'qr_gateway' })}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: `1px solid ${config.provider === 'qr_gateway' ? '#22c55e' : 'rgba(255, 255, 255, 0.1)'}`,
                      backgroundColor: config.provider === 'qr_gateway' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                      color: config.provider === 'qr_gateway' ? '#4ade80' : '#94a3b8',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Opción A: Gateway QR</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Celular físico activo (+57 320 2796115)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, provider: 'meta_cloud_api' })}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: `1px solid ${config.provider === 'meta_cloud_api' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                      backgroundColor: config.provider === 'meta_cloud_api' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                      color: config.provider === 'meta_cloud_api' ? '#38bdf8' : '#94a3b8',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Opción B: Meta Cloud API</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>API oficial de Meta (Futuro)</div>
                  </button>
                </div>
              </div>

              {config.provider === 'qr_gateway' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      URL del Gateway (Servidor Local o Túnel Seguro Cloudflare/Pinggy):
                    </label>
                    <input
                      type="text"
                      value={config.gatewayUrl}
                      onChange={(e) => setConfig({ ...config, gatewayUrl: e.target.value })}
                      placeholder={typeof window !== 'undefined' && window.location?.protocol === 'https:' ? 'https://tu-subdominio.trycloudflare.com' : 'http://localhost:3001'}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        backgroundColor: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.85rem'
                      }}
                    />

                    {/* Guía de Túnel Gratuito Cloudflare / Pinggy */}
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      color: '#94a3b8'
                    }}>
                      <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🌐 Opciones de Conexión Gratuitas:
                      </div>
                      <div style={{ marginBottom: '0.35rem' }}>
                        • <strong>Cloudflare Quick Tunnel (Gratis & Estable):</strong> Ejecuta en PC o Termux:
                        <code style={{ display: 'block', backgroundColor: '#020617', padding: '3px 6px', borderRadius: '4px', color: '#f59e0b', margin: '3px 0' }}>
                          cloudflared tunnel --url http://127.0.0.1:3001
                        </code>
                        Copia la URL <span style={{ color: '#38bdf8' }}>https://xxx.trycloudflare.com</span> y pégala arriba.
                      </div>
                      <div>
                        • <strong>Pinggy SSH (Instantáneo sin descargas):</strong> Ejecuta en cualquier consola con SSH:
                        <code style={{ display: 'block', backgroundColor: '#020617', padding: '3px 6px', borderRadius: '4px', color: '#34d399', margin: '3px 0' }}>
                          ssh -p 443 -R0:localhost:3001 a.pinggy.io
                        </code>
                        Copia la URL <span style={{ color: '#34d399' }}>https://xxx.free.pinggy.link</span> y pégala arriba.
                      </div>
                      {typeof window !== 'undefined' && window.location?.protocol === 'https:' && !config.gatewayUrl?.startsWith('https://') && (
                        <div style={{ marginTop: '0.4rem', color: '#fbbf24', fontSize: '0.72rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                          ⚠️ <em>Estás en Vercel (HTTPS): Sin un túnel https://, el sistema utilizará el envío asistido por WhatsApp Web de forma transparente.</em>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      API Key (Opcional si tu Gateway tiene autenticación):
                    </label>
                    <input
                      type="password"
                      autoComplete="off"
                      value={config.apiKey || ''}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="Dejar en blanco para servidor local estándar"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        backgroundColor: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      Meta Phone Number ID:
                    </label>
                    <input
                      type="text"
                      value={config.metaPhoneNumberId || ''}
                      onChange={(e) => setConfig({ ...config, metaPhoneNumberId: e.target.value })}
                      placeholder="Ej: 104523948572910"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        backgroundColor: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      Meta Cloud Access Token (Bearer):
                    </label>
                    <input
                      type="password"
                      autoComplete="off"
                      value={config.metaCloudToken || ''}
                      onChange={(e) => setConfig({ ...config, metaCloudToken: e.target.value })}
                      placeholder="EAAGm..."
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        backgroundColor: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="autoSendCheck"
                  checked={config.autoSendEnabled}
                  onChange={(e) => setConfig({ ...config, autoSendEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#22c55e', cursor: 'pointer' }}
                />
                <label htmlFor="autoSendCheck" style={{ fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  Habilitar despacho 100% automático en segundo plano
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="submit"
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
