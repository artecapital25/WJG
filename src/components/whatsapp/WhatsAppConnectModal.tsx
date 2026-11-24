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
  KeyRound,
  RotateCcw,
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Megaphone,
  HelpCircle
} from 'lucide-react';
import { WhatsAppGatewayService, WhatsAppGatewayConfig, GatewayStatusResponse } from '../../services/whatsappGatewayService';
import { CanalGrupoWhatsApp, ConfiguracionTaller, GrupoWhatsAppConfig, MapaGruposWhatsApp } from '../../types';
import { UsuarioTaller } from '../../types/usuarios.types';
import {
  MessagingHubService,
  getConfiguredGroupChannels,
  getTeamContacts,
  normalizeTextKey,
  resolveGroupDestination
} from '../../services/messaging';
import { CloudSyncService } from '../../services/cloudSyncService';
import { StorageService } from '../../services/storageService';
import { toast } from '../ui/ToastProvider';
import { WjgButton } from '../ui/primitives/WjgButton';
import { WjgBadge } from '../ui/primitives/WjgBadge';
import { WjgTextInput } from '../ui/primitives/WjgTextInput';
import { WjgConfirmModal } from '../ui/primitives/WjgConfirmModal';
import { WjgSelect } from '../ui/WjgSelect';

interface WhatsAppConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: ConfiguracionTaller;
  onUpdateConfig?: (cfg: ConfiguracionTaller) => void;
  usuarios?: UsuarioTaller[];
}

export const WhatsAppConnectModal: React.FC<WhatsAppConnectModalProps> = ({
  isOpen,
  onClose,
  config: tallerConfig,
  onUpdateConfig,
  usuarios
}) => {
  const [config, setConfig] = useState<WhatsAppGatewayConfig>(() =>
    tallerConfig ? WhatsAppGatewayService.syncFromTallerConfig(tallerConfig) : WhatsAppGatewayService.getConfig()
  );
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
  const [waGroups, setWaGroups] = useState<{ id: string; subject: string; size: number }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [testGroupChannel, setTestGroupChannel] = useState<CanalGrupoWhatsApp>('tareas');
  const [emailUpdateWarning, setEmailUpdateWarning] = useState<string | null>(null);
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [editingChannelKey, setEditingChannelKey] = useState<string | null>(null);
  const [customGroupLabel, setCustomGroupLabel] = useState('');
  const [customGroupDesc, setCustomGroupDesc] = useState('');
  const [customGroupAudiencia, setCustomGroupAudiencia] = useState<'equipo' | 'clientes'>('equipo');
  const [customGroupJid, setCustomGroupJid] = useState('');
  const [customGroupNombre, setCustomGroupNombre] = useState('');
  const [channelToDelete, setChannelToDelete] = useState<{ id: string; label: string } | null>(null);
  const [showBroadcastGuide, setShowBroadcastGuide] = useState(false);

  const teamContacts = React.useMemo(() => getTeamContacts(usuarios), [usuarios]);
  const allChannels = React.useMemo(
    () =>
      getConfiguredGroupChannels({
        ...(tallerConfig || StorageService.getConfig()),
        whatsapp_grupos_config: config.gruposConfig,
        whatsapp_internal_group_jid: config.internalGroupJid,
        whatsapp_internal_group_name: config.internalGroupName
      }),
    [config.gruposConfig, config.internalGroupJid, config.internalGroupName, tallerConfig]
  );
  
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wjg:wa-status-updated', { detail: { connected: res.connected } }));
        }
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wjg:wa-status-updated', { detail: { connected: res.connected } }));
      }
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

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const gruposSanitizados: MapaGruposWhatsApp = { ...(config.gruposConfig || {}) };
    if (!gruposSanitizados.general && config.internalGroupJid) {
      gruposSanitizados.general = {
        jid: config.internalGroupJid,
        nombre: config.internalGroupName || 'Grupo Principal WJGEEKS'
      };
    }

    const primaryJid = gruposSanitizados.general?.jid || config.internalGroupJid || '';
    const primaryNombre = gruposSanitizados.general?.nombre || config.internalGroupName || '';

    const saved = WhatsAppGatewayService.saveConfig({
      ...config,
      internalGroupJid: primaryJid,
      internalGroupName: primaryNombre,
      gruposConfig: gruposSanitizados
    });
    setConfig(saved);

    const baseTallerCfg = tallerConfig || StorageService.getConfig();
    const nextTallerCfg: ConfiguracionTaller = {
      ...baseTallerCfg,
      whatsapp_gateway_url: saved.gatewayUrl,
      whatsapp_auto_send: saved.autoSendEnabled,
      whatsapp_internal_group_jid: primaryJid || undefined,
      whatsapp_internal_group_name: primaryNombre || undefined,
      whatsapp_grupos_config: gruposSanitizados
    };
    StorageService.saveConfig(nextTallerCfg);
    if (onUpdateConfig) {
      onUpdateConfig(nextTallerCfg);
    } else {
      await CloudSyncService.saveConfiguracion(nextTallerCfg);
    }

    toast.success('Configuración de WhatsApp y Grupos guardada y sincronizada en Supabase.');
    refreshStatus();
  };

  const persistGruposMap = async (nextGrupos: MapaGruposWhatsApp, primaryJid?: string, primaryNombre?: string) => {
    const resolvedPrimaryJid = primaryJid !== undefined ? primaryJid : nextGrupos.general?.jid || config.internalGroupJid || '';
    const resolvedPrimaryNombre = primaryNombre !== undefined ? primaryNombre : nextGrupos.general?.nombre || config.internalGroupName || '';

    const saved = WhatsAppGatewayService.saveConfig({
      ...config,
      internalGroupJid: resolvedPrimaryJid,
      internalGroupName: resolvedPrimaryNombre,
      gruposConfig: nextGrupos
    });
    setConfig(saved);

    const baseTallerCfg = tallerConfig || StorageService.getConfig();
    const nextTallerCfg: ConfiguracionTaller = {
      ...baseTallerCfg,
      whatsapp_gateway_url: saved.gatewayUrl,
      whatsapp_auto_send: saved.autoSendEnabled,
      whatsapp_internal_group_jid: resolvedPrimaryJid || undefined,
      whatsapp_internal_group_name: resolvedPrimaryNombre || undefined,
      whatsapp_grupos_config: nextGrupos
    };
    StorageService.saveConfig(nextTallerCfg);
    if (onUpdateConfig) {
      onUpdateConfig(nextTallerCfg);
    } else {
      await CloudSyncService.saveConfiguracion(nextTallerCfg);
    }
  };

  const resetCustomGroupForm = () => {
    setShowNewGroupForm(false);
    setEditingChannelKey(null);
    setCustomGroupLabel('');
    setCustomGroupDesc('');
    setCustomGroupAudiencia('equipo');
    setCustomGroupJid('');
    setCustomGroupNombre('');
  };

  const handleSaveCustomGroup = async () => {
    const cleanLabel = customGroupLabel.trim();
    const cleanJid = customGroupJid.trim();
    if (!cleanLabel) {
      toast.warning('Ingresa un nombre para el canal o grupo.');
      return;
    }
    if (!cleanJid) {
      toast.warning('Selecciona un grupo de WhatsApp o pega el ID (@g.us).');
      return;
    }

    const foundWa = waGroups.find(g => g.id === cleanJid);
    const slugBase = normalizeTextKey(cleanLabel)
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 24) || 'canal';
    const key =
      editingChannelKey ||
      `custom_${slugBase}_${Math.floor(1000 + Math.random() * 9000)}`;

    const entry: GrupoWhatsAppConfig = {
      jid: cleanJid,
      nombre: foundWa?.subject || customGroupNombre.trim() || cleanLabel,
      etiqueta: cleanLabel,
      descripcion: customGroupDesc.trim() || undefined,
      audiencia: customGroupAudiencia,
      esPersonalizado: true
    };

    const nextGrupos: MapaGruposWhatsApp = {
      ...(config.gruposConfig || {}),
      [key]: entry
    };

    await persistGruposMap(nextGrupos);
    toast.success(
      editingChannelKey
        ? `Grupo "${cleanLabel}" actualizado y sincronizado.`
        : `Grupo "${cleanLabel}" agregado y sincronizado en Supabase.`
    );
    resetCustomGroupForm();
  };

  const handleConfirmDeleteCustomGroup = async () => {
    if (!channelToDelete) return;
    const nextGrupos: MapaGruposWhatsApp = { ...(config.gruposConfig || {}) };
    delete nextGrupos[channelToDelete.id];
    await persistGruposMap(nextGrupos);
    if (testGroupChannel === channelToDelete.id) {
      setTestGroupChannel('tareas');
    }
    toast.info(`Canal "${channelToDelete.label}" eliminado de la lista (el historial de mensajes enviados se conserva).`);
    setChannelToDelete(null);
  };

  const handleSendTestWhatsApp = async (phoneToUse?: string, nombreDestino?: string) => {
    const target = phoneToUse || testPhone;
    if (!target) {
      toast.error('Ingresa un número de teléfono de destino.');
      return;
    }

    setIsSendingWa(true);
    try {
      const res = await MessagingHubService.sendLiveTest({
        mode: 'whatsapp_individual',
        targetPhoneOrJid: target,
        targetName: nombreDestino || target,
        config: tallerConfig,
        usuarios
      });
      if (res.whatsappOkCount > 0) {
        toast.success(`WhatsApp enviado correctamente a ${nombreDestino || target}`);
      } else {
        const fb = res.fallbackUrls[0]?.url;
        toast.warning(res.results[0]?.error || 'No se pudo enviar automáticamente.');
        if (fb) window.open(fb, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar WhatsApp.');
    } finally {
      setIsSendingWa(false);
    }
  };

  const handleSendTestGroup = async () => {
    const group = resolveGroupDestination(testGroupChannel, tallerConfig);
    if (!group?.jid) {
      toast.warning(`Configura primero un grupo para "${testGroupChannel}" en Ajustes.`);
      setActiveTab('settings');
      return;
    }

    setIsSendingWa(true);
    try {
      const res = await MessagingHubService.sendLiveTest({
        mode: 'whatsapp_group',
        groupChannel: testGroupChannel,
        targetPhoneOrJid: group.jid,
        targetName: group.nombre,
        config: tallerConfig,
        usuarios
      });
      if (res.whatsappOkCount > 0) {
        toast.success(`Mensaje de prueba enviado al grupo "${group.nombre}"`);
      } else {
        toast.error(res.results[0]?.error || 'No se pudo enviar al grupo.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error enviando prueba al grupo.');
    } finally {
      setIsSendingWa(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Ingresa un correo electrónico válido.');
      return;
    }

    setIsSendingEmail(true);
    setEmailUpdateWarning(null);
    try {
      const res = await MessagingHubService.sendLiveTest({
        mode: 'email',
        targetEmail: testEmail,
        targetName: 'Equipo WJGEEKS',
        config: tallerConfig,
        usuarios
      });

      if (res.emailOkCount > 0) {
        toast.success(`Correo verificado y enviado exitosamente a ${testEmail} (${res.results[0]?.provider || 'verificado'})`);
      } else {
        const errMsg = res.results[0]?.error || 'No se pudo confirmar la entrega del correo.';
        if (res.needsAppsScriptUpdate) {
          setEmailUpdateWarning(errMsg);
        }
        toast.error(`Error al despachar correo: ${errMsg}`);
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
        zIndex: 10050,
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

        {/* Banner de Persistencia Permanente de Sesión */}
        {config.provider === 'qr_gateway' && (
          <div style={{
            padding: '0.55rem 1.5rem',
            backgroundColor: status.storageMode === 'supabase_persistent'
              ? 'rgba(16, 185, 129, 0.08)'
              : 'rgba(245, 158, 11, 0.08)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '0.74rem',
            color: status.storageMode === 'supabase_persistent' ? '#6ee7b7' : '#fcd34d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '6px'
          }}>
            <span>
              {status.storageMode === 'supabase_persistent'
                ? '🔒 Sesión permanente en Supabase activa: sobrevive reinicios y despliegues de Render sin pedir QR.'
                : '⚠️ Modo efímero detectado en Gateway: configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Render para que la vinculación QR sea permanente.'}
            </span>
          </div>
        )}

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
                  {teamContacts.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleSendTestWhatsApp(member.telefonoE164 || member.telefono, member.nombreCorto)}
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
                      <strong style={{ display: 'block', color: '#38bdf8' }}>{member.nombreCorto}</strong>
                      <span style={{ fontSize: '0.73rem', color: '#94a3b8', display: 'block' }}>+{member.telefonoE164 || member.telefono}</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{member.correo}</span>
                    </button>
                  ))}
                </div>

                <div style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  marginBottom: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4ade80' }}>
                    Probar envío a Grupo de WhatsApp:
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: '1 1 220px' }}>
                      <WjgSelect
                        compact
                        value={testGroupChannel}
                        onChange={val => setTestGroupChannel(val as CanalGrupoWhatsApp)}
                        options={allChannels.map(g => {
                          const resolved = resolveGroupDestination(g.id, {
                            ...(tallerConfig || StorageService.getConfig()),
                            whatsapp_grupos_config: config.gruposConfig,
                            whatsapp_internal_group_jid: config.internalGroupJid,
                            whatsapp_internal_group_name: config.internalGroupName
                          });
                          return {
                            value: g.id,
                            label: g.label,
                            subtitle: resolved ? `${resolved.nombre}` : 'Sin grupo asignado'
                          };
                        })}
                      />
                    </div>
                    <WjgButton
                      variant="whatsapp"
                      size="sm"
                      loading={isSendingWa}
                      leftIcon={<Send size={14} />}
                      onClick={handleSendTestGroup}
                    >
                      Probar Grupo
                    </WjgButton>
                  </div>
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

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Correo de destino"
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                  <button
                    type="button"
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
                    {isSendingEmail ? 'Verificando...' : 'Probar Correo Real'}
                  </button>
                </div>

                {emailUpdateWarning && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#fde68a',
                    fontSize: '0.76rem',
                    lineHeight: 1.45
                  }}>
                    <strong>⚠️ Acción requerida para correo directo:</strong> {emailUpdateWarning}
                  </div>
                )}
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

              {/* Gestor Multi-Grupo de WhatsApp sincronizado en Supabase */}
              <div style={{
                padding: '0.9rem',
                borderRadius: '10px',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#38bdf8' }}>
                      Grupos y Canales de Difusión WhatsApp (Sincronizados en la Nube)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Configura los 5 canales base o crea grupos ilimitados internos y de difusión para clientes.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <WjgButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<HelpCircle size={13} />}
                      onClick={() => setShowBroadcastGuide(v => !v)}
                    >
                      {showBroadcastGuide ? 'Ocultar Guía' : '¿Cómo crearlos?'}
                    </WjgButton>
                    <WjgButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={loadingGroups}
                      leftIcon={<RefreshCw size={13} />}
                      onClick={async () => {
                        setLoadingGroups(true);
                        const res = await WhatsAppGatewayService.listGroups();
                        setLoadingGroups(false);
                        if (res.success) {
                          setWaGroups(res.groups);
                          toast.success(`${res.groups.length} grupo(s) cargados desde WhatsApp.`);
                        } else {
                          toast.warning(res.error || 'Conecta WhatsApp primero para listar los grupos.');
                        }
                      }}
                    >
                      {loadingGroups ? 'Cargando...' : 'Cargar Grupos'}
                    </WjgButton>
                    <WjgButton
                      type="button"
                      variant="cyan"
                      size="sm"
                      leftIcon={<Plus size={13} />}
                      onClick={() => {
                        if (showNewGroupForm) {
                          resetCustomGroupForm();
                        } else {
                          setEditingChannelKey(null);
                          setShowNewGroupForm(true);
                        }
                      }}
                    >
                      {showNewGroupForm ? 'Cancelar' : 'Nuevo Grupo'}
                    </WjgButton>
                  </div>
                </div>

                {showBroadcastGuide && (
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    fontSize: '0.74rem',
                    color: '#cbd5e1',
                    lineHeight: 1.5
                  }}>
                    <strong style={{ color: '#34d399', display: 'block', marginBottom: '4px' }}>
                      📘 Guía Rápida: Grupos Internos vs. Canales de Difusión para Clientes
                    </strong>
                    <div>
                      <strong>1. Grupo Interno (Equipo):</strong> Crea un grupo normal en WhatsApp desde el celular oficial (<code>+57 320 2796115</code>) agregando a Germán, Juan y Wendy (ej. <em>&quot;WJGEEKS Pintura&quot;</em> o <em>&quot;WJGEEKS Entregas&quot;</em>). Luego pulsa <strong>Cargar Grupos</strong> aquí y asígnalo.
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <strong>2. Grupo de Difusión para Clientes:</strong> Crea un grupo en WhatsApp (ej. <em>&quot;Novedades WJGEEKS 3D&quot;</em>), entra en <em>Info del grupo → Permisos del grupo</em> y activa <strong>&quot;Enviar mensajes: Solo administradores&quot;</strong>. Así solo la línea oficial publica catálogos o promociones sin que los clientes chateen entre sí. Luego agrégalo aquí marcando audiencia <strong>Difusión Clientes</strong>.
                    </div>
                  </div>
                )}

                {showNewGroupForm && (
                  <div style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7dd3fc' }}>
                      {editingChannelKey ? '✏️ Editar Canal / Grupo Personalizado' : '➕ Agregar Nuevo Grupo / Canal'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                      <WjgTextInput
                        label="Nombre del Canal en la App"
                        value={customGroupLabel}
                        onChange={setCustomGroupLabel}
                        placeholder="Ej: Novedades Clientes VIP"
                      />
                      <div>
                        <label className="form-label">Audiencia del Grupo</label>
                        <WjgSelect
                          compact
                          value={customGroupAudiencia}
                          onChange={val => setCustomGroupAudiencia(val as 'equipo' | 'clientes')}
                          options={[
                            { value: 'equipo', label: '👥 Equipo Interno (Taller)', subtitle: 'Mantiene opción de correo al equipo' },
                            { value: 'clientes', label: '📢 Difusión Clientes', subtitle: 'Solo WhatsApp por defecto (sin spam interno)' }
                          ]}
                        />
                      </div>
                    </div>
                    <WjgTextInput
                      label="Descripción / Uso (opcional)"
                      value={customGroupDesc}
                      onChange={setCustomGroupDesc}
                      placeholder="Ej: Lanzamientos de figuras y disponibilidad semanal"
                    />
                    {waGroups.length > 0 ? (
                      <div>
                        <label className="form-label">Grupo Vinculado de WhatsApp</label>
                        <WjgSelect
                          compact
                          value={customGroupJid}
                          onChange={val => {
                            setCustomGroupJid(val);
                            const f = waGroups.find(g => g.id === val);
                            if (f) setCustomGroupNombre(f.subject);
                          }}
                          placeholder="Seleccionar grupo cargado de WhatsApp..."
                          options={waGroups.map(g => ({
                            value: g.id,
                            label: g.subject,
                            subtitle: `${g.size} integrantes • ${g.id}`
                          }))}
                        />
                      </div>
                    ) : (
                      <WjgTextInput
                        label="ID del Grupo WhatsApp (@g.us)"
                        value={customGroupJid}
                        onChange={setCustomGroupJid}
                        placeholder="Ej: 120363012345678901@g.us (o pulsa Cargar Grupos arriba)"
                      />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <WjgButton type="button" variant="secondary" size="sm" onClick={resetCustomGroupForm}>
                        Cancelar
                      </WjgButton>
                      <WjgButton type="button" variant="save" size="sm" onClick={handleSaveCustomGroup}>
                        {editingChannelKey ? 'Guardar Canal' : 'Agregar Canal'}
                      </WjgButton>
                    </div>
                  </div>
                )}

                {allChannels.map(canal => {
                  const currentGroup = config.gruposConfig?.[String(canal.id)] ||
                    (canal.id === 'general' && config.internalGroupJid
                      ? { jid: config.internalGroupJid, nombre: config.internalGroupName || '' }
                      : undefined);
                  const currentJid = currentGroup?.jid || '';

                  return (
                    <div
                      key={String(canal.id)}
                      style={{
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(2, 6, 23, 0.55)',
                        border: canal.audiencia === 'clientes'
                          ? '1px solid rgba(245, 158, 11, 0.32)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>{canal.label}</span>
                          {canal.audiencia === 'clientes' && (
                            <WjgBadge variant="warning">
                              <Megaphone size={10} /> Difusión Clientes
                            </WjgBadge>
                          )}
                          {canal.esPersonalizado && (
                            <WjgBadge variant="cyan">Personalizado</WjgBadge>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{canal.subtitle}</span>
                          {canal.esPersonalizado && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingChannelKey(String(canal.id));
                                  setCustomGroupLabel(currentGroup?.etiqueta || canal.label.replace(/^[📢🏷️]\s*/u, ''));
                                  setCustomGroupDesc(currentGroup?.descripcion || '');
                                  setCustomGroupAudiencia(canal.audiencia);
                                  setCustomGroupJid(currentJid);
                                  setCustomGroupNombre(currentGroup?.nombre || canal.nombre);
                                  setShowNewGroupForm(true);
                                }}
                                title="Editar canal personalizado"
                                style={{
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  color: '#7dd3fc',
                                  borderRadius: '6px',
                                  padding: '3px 6px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setChannelToDelete({ id: String(canal.id), label: canal.label })}
                                title="Eliminar canal personalizado"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#fca5a5',
                                  borderRadius: '6px',
                                  padding: '3px 6px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {waGroups.length > 0 ? (
                        <WjgSelect
                          compact
                          value={currentJid}
                          onChange={(val) => {
                            const found = waGroups.find(g => g.id === val);
                            const nextGrupos: MapaGruposWhatsApp = { ...(config.gruposConfig || {}) };
                            if (val) {
                              nextGrupos[String(canal.id)] = {
                                ...(currentGroup || {}),
                                jid: val,
                                nombre: found?.subject || val,
                                audiencia: canal.audiencia,
                                esPersonalizado: canal.esPersonalizado
                              };
                            } else if (!canal.esPersonalizado) {
                              delete nextGrupos[String(canal.id)];
                            }
                            setConfig({
                              ...config,
                              gruposConfig: nextGrupos,
                              ...(canal.id === 'general'
                                ? { internalGroupJid: val, internalGroupName: found?.subject || '' }
                                : {})
                            });
                          }}
                          placeholder={canal.id === 'general' ? 'Seleccionar grupo principal...' : 'Heredar del Grupo Principal'}
                          options={[
                            {
                              value: '',
                              label: canal.id === 'general' ? 'Sin grupo seleccionado' : 'Heredar del Grupo Principal'
                            },
                            ...waGroups.map(g => ({
                              value: g.id,
                              label: g.subject,
                              subtitle: `${g.size} integrantes • ${g.id}`
                            }))
                          ]}
                        />
                      ) : (
                        <input
                          type="text"
                          value={currentJid}
                          onChange={(e) => {
                            const val = e.target.value;
                            const nextGrupos: MapaGruposWhatsApp = { ...(config.gruposConfig || {}) };
                            if (val.trim()) {
                              nextGrupos[String(canal.id)] = {
                                ...(currentGroup || {}),
                                jid: val.trim(),
                                nombre: currentGroup?.nombre || canal.label,
                                audiencia: canal.audiencia,
                                esPersonalizado: canal.esPersonalizado
                              };
                            } else if (!canal.esPersonalizado) {
                              delete nextGrupos[String(canal.id)];
                            }
                            setConfig({
                              ...config,
                              gruposConfig: nextGrupos,
                              ...(canal.id === 'general' ? { internalGroupJid: val } : {})
                            });
                          }}
                          placeholder={
                            canal.id === 'general'
                              ? 'ID del grupo principal (ej: 120363012345678901@g.us)'
                              : 'Opcional: ID @g.us o presiona "Cargar Grupos"'
                          }
                          className="form-input"
                          style={{ fontSize: '0.78rem', minHeight: '36px' }}
                        />
                      )}

                      {currentGroup?.nombre && (
                        <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600 }}>
                          ✓ Vinculado: {currentGroup.nombre}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <WjgConfirmModal
                isOpen={Boolean(channelToDelete)}
                onClose={() => setChannelToDelete(null)}
                onConfirm={handleConfirmDeleteCustomGroup}
                title="Eliminar Grupo Personalizado"
                message={`¿Eliminar el canal "${channelToDelete?.label || ''}" de la configuración? Los mensajes históricos registrados en Supabase se mantendrán intactos.`}
                confirmText="Sí, eliminar canal"
                variant="danger"
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="submit"
                  className="btn wjg-btn-save"
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
