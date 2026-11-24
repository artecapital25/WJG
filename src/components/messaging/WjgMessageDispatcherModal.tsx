import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  Mail,
  MessageCircle,
  Users,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Settings2
} from 'lucide-react';
import { CanalGrupoWhatsApp, ConfiguracionTaller } from '../../types';
import { UsuarioTaller } from '../../types/usuarios.types';
import { formatWhatsAppPhone } from '../../services/whatsappService';
import {
  WjgModal,
  WjgButton,
  WjgSelect,
  WjgSwitch,
  WjgBadge,
  WjgTextArea,
  WjgTextInput,
  toast
} from '../ui';
import {
  DispatchSummary,
  EmailTipo,
  MessagingContextType,
  MessagingHubService,
  RecipientTarget,
  getConfiguredGroupChannels,
  getTeamContacts,
  normalizeTextKey,
  resolveGroupDestination
} from '../../services/messaging';

export type DispatcherTargetMode = 'individual' | 'grupo' | 'todos_individual' | 'cliente';

export interface WjgMessageDispatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  context: MessagingContextType;
  defaultGroupChannel?: CanalGrupoWhatsApp;
  defaultTargetMode?: DispatcherTargetMode;
  defaultAssigneeName?: string;
  externalRecipient?: { nombre: string; telefono?: string; correo?: string };
  resumenDetalle?: Array<{ etiqueta: string; valor: string; destacado?: boolean }>;
  hideModeSelector?: boolean;
  primaryButtonLabel?: string;
  secondarySaveAction?: { label: string; onClick: () => void };
  onFallbackOpened?: () => void;
  initialWhatsAppText: string;
  initialEmailSubject: string;
  emailType: EmailTipo;
  emailData?: Record<string, any>;
  trackingUrl?: string;
  entidadTipo?: string;
  entidadId?: string;
  usuarios?: UsuarioTaller[];
  config?: ConfiguracionTaller | null;
  onDispatched?: (summary: DispatchSummary) => void;
}

export const WjgMessageDispatcherModal: React.FC<WjgMessageDispatcherModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  context,
  defaultGroupChannel = 'general',
  defaultTargetMode = 'individual',
  defaultAssigneeName,
  externalRecipient,
  resumenDetalle,
  hideModeSelector = false,
  primaryButtonLabel,
  secondarySaveAction,
  onFallbackOpened,
  initialWhatsAppText,
  initialEmailSubject,
  emailType,
  emailData,
  trackingUrl,
  entidadTipo,
  entidadId,
  usuarios,
  config,
  onDispatched
}) => {
  const contacts = useMemo(() => getTeamContacts(usuarios), [usuarios]);

  const [targetMode, setTargetMode] = useState<DispatcherTargetMode>(defaultTargetMode);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [groupChannel, setGroupChannel] = useState<CanalGrupoWhatsApp>(defaultGroupChannel);
  const [externalPhone, setExternalPhone] = useState<string>(externalRecipient?.telefono || '');
  const [externalEmail, setExternalEmail] = useState<string>(externalRecipient?.correo || '');
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(true);
  const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
  const [whatsappText, setWhatsappText] = useState<string>(initialWhatsAppText);
  const [emailSubject, setEmailSubject] = useState<string>(initialEmailSubject);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [summary, setSummary] = useState<DispatchSummary | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setWhatsappText(initialWhatsAppText);
    setEmailSubject(initialEmailSubject);
    setGroupChannel(defaultGroupChannel);
    setSummary(null);

    const isClientMode =
      defaultTargetMode === 'cliente' || (hideModeSelector && Boolean(externalRecipient));
    const isTodos = !isClientMode && normalizeTextKey(defaultAssigneeName) === 'todos';

    if (isClientMode) {
      setTargetMode('cliente');
      const phoneInit = externalRecipient?.telefono || '';
      const mailInit = (externalRecipient?.correo || '').trim();
      setExternalPhone(phoneInit);
      setExternalEmail(mailInit);
      setWhatsappEnabled(true);
      setEmailEnabled(Boolean(mailInit && mailInit.includes('@')));
    } else {
      setWhatsappEnabled(true);
      setEmailEnabled(true);
      if (isTodos && defaultTargetMode === 'individual') {
        setTargetMode('grupo');
      } else {
        setTargetMode(defaultTargetMode);
      }
    }

    if (defaultAssigneeName && !isTodos && !isClientMode) {
      const q = normalizeTextKey(defaultAssigneeName);
      const match = contacts.find(
        c =>
          normalizeTextKey(c.nombre) === q ||
          normalizeTextKey(c.nombreCorto) === q ||
          normalizeTextKey(c.nombre).includes(q)
      );
      setSelectedMemberId(match?.id || contacts[0]?.id || '');
    } else {
      setSelectedMemberId(contacts[0]?.id || '');
    }
  }, [
    isOpen,
    initialWhatsAppText,
    initialEmailSubject,
    defaultGroupChannel,
    defaultTargetMode,
    defaultAssigneeName,
    externalRecipient,
    hideModeSelector,
    contacts
  ]);

  const selectedMember = useMemo(
    () => contacts.find(c => c.id === selectedMemberId) || contacts[0],
    [contacts, selectedMemberId]
  );

  const groupChannelOptions = useMemo(
    () => getConfiguredGroupChannels(config),
    [config, isOpen]
  );

  const selectedGroupChannelMeta = useMemo(
    () => groupChannelOptions.find(opt => opt.id === groupChannel),
    [groupChannelOptions, groupChannel]
  );

  const resolvedGroup = useMemo(
    () => resolveGroupDestination(groupChannel, config),
    [groupChannel, config, isOpen]
  );

  useEffect(() => {
    if (!isOpen || targetMode !== 'grupo') return;
    if (selectedGroupChannelMeta?.audiencia === 'clientes') {
      setEmailEnabled(false);
    }
  }, [isOpen, targetMode, selectedGroupChannelMeta]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(whatsappText);
      setCopied(true);
      toast.success('Mensaje copiado al portapapeles.');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error('No se pudo copiar el texto.');
    }
  };

  const buildTargets = (onlyFailed?: DispatchSummary): {
    whatsappTargets: RecipientTarget[];
    emailTargets: Array<{ correo: string; nombre: string }>;
  } => {
    if (onlyFailed) {
      const failedWa = onlyFailed.results
        .filter(r => r.channel !== 'email' && !r.success)
        .map(r => ({
          type: (r.channel === 'whatsapp_group'
            ? 'group'
            : targetMode === 'cliente'
            ? 'external'
            : 'individual') as 'group' | 'individual' | 'external',
          label: r.targetLabel,
          whatsappTarget: r.destination,
          groupChannel
        }));
      const failedEmails = onlyFailed.results
        .filter(r => r.channel === 'email' && !r.success)
        .flatMap(r =>
          r.destination
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(correo => ({ correo, nombre: r.targetLabel || 'Equipo' }))
        );
      return { whatsappTargets: failedWa, emailTargets: failedEmails };
    }

    if (targetMode === 'cliente') {
      const cleanPhone = formatWhatsAppPhone(externalPhone);
      const validPhone =
        cleanPhone.length >= 7 && cleanPhone !== '3000000000' && cleanPhone !== '573000000000';
      const cleanEmail = (externalEmail || '').trim();
      const validEmail = cleanEmail.includes('@');

      return {
        whatsappTargets: validPhone
          ? [
              {
                type: 'external' as const,
                label: externalRecipient?.nombre || 'Cliente',
                whatsappTarget: cleanPhone,
                correo: validEmail ? cleanEmail : undefined
              }
            ]
          : [],
        emailTargets: validEmail
          ? [{ correo: cleanEmail, nombre: externalRecipient?.nombre || 'Cliente' }]
          : []
      };
    }

    if (targetMode === 'grupo') {
      const whatsappTargets: RecipientTarget[] = resolvedGroup?.jid
        ? [
            {
              type: 'group',
              label: resolvedGroup.nombre || `Grupo (${groupChannel})`,
              whatsappTarget: resolvedGroup.jid,
              groupChannel
            }
          ]
        : [];
      const emailTargets = contacts
        .filter(c => c.correo && c.correo.includes('@'))
        .map(c => ({ correo: c.correo, nombre: c.nombreCorto }));
      return { whatsappTargets, emailTargets };
    }

    if (targetMode === 'todos_individual') {
      return {
        whatsappTargets: contacts
          .filter(c => Boolean(c.telefonoE164))
          .map(c => ({
            type: 'individual' as const,
            label: c.nombreCorto,
            whatsappTarget: c.telefonoE164,
            correo: c.correo
          })),
        emailTargets: contacts
          .filter(c => Boolean(c.correo && c.correo.includes('@')))
          .map(c => ({ correo: c.correo, nombre: c.nombreCorto }))
      };
    }

    return {
      whatsappTargets: selectedMember?.telefonoE164
        ? [
            {
              type: 'individual',
              label: selectedMember.nombreCorto,
              whatsappTarget: selectedMember.telefonoE164,
              correo: selectedMember.correo
            }
          ]
        : [],
      emailTargets:
        selectedMember?.correo && selectedMember.correo.includes('@')
          ? [{ correo: selectedMember.correo, nombre: selectedMember.nombreCorto }]
          : []
    };
  };

  const executeSend = async (retryFrom?: DispatchSummary) => {
    if (!whatsappEnabled && !emailEnabled) {
      toast.warning('Activa al menos un canal (WhatsApp o Correo).');
      return;
    }

    const { whatsappTargets, emailTargets } = buildTargets(retryFrom);

    if (targetMode === 'cliente' && !retryFrom) {
      if (whatsappEnabled && whatsappTargets.length === 0) {
        toast.warning('Ingresa un número de WhatsApp válido para el cliente.');
        if (!emailEnabled || emailTargets.length === 0) return;
      }
      if (emailEnabled && emailTargets.length === 0) {
        toast.warning('Ingresa un correo electrónico válido o desactiva el envío por correo.');
        if (!whatsappEnabled || whatsappTargets.length === 0) return;
      }
    }

    if (whatsappEnabled && targetMode === 'grupo' && whatsappTargets.length === 0 && !retryFrom) {
      toast.warning('No hay un Grupo de WhatsApp vinculado aún. Configúralo en "Vincular WhatsApp" o elige envío individual.');
      if (!emailEnabled) return;
    }

    setIsSending(true);
    try {
      const res = await MessagingHubService.dispatch({
        context,
        entidadTipo,
        entidadId,
        whatsappEnabled: retryFrom ? whatsappTargets.length > 0 : whatsappEnabled,
        emailEnabled: retryFrom ? emailTargets.length > 0 : emailEnabled,
        whatsappTargets,
        emailTargets,
        whatsappText,
        emailSubject,
        emailType,
        emailData,
        trackingUrl,
        tallerConfig: config,
        usuarios,
        allowWakeUpRetry: true
      });

      setSummary(res);
      onDispatched?.(res);

      if (res.whatsappFailCount === 0 && res.emailFailCount === 0 && res.results.length > 0) {
        toast.success(`Notificación enviada: ${res.summaryText}`);
      } else if (res.success) {
        toast.warning(`Envío parcial: ${res.summaryText}`);
      } else {
        toast.error(res.summaryText || 'No se pudo completar el envío por ningún canal.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error inesperado al despachar notificación.');
    } finally {
      setIsSending(false);
    }
  };

  const hasFailures = Boolean(summary && (summary.whatsappFailCount > 0 || summary.emailFailCount > 0));

  return (
    <WjgModal
      isOpen={isOpen}
      onClose={() => !isSending && onClose()}
      title={title}
      subtitle={subtitle || 'Despacho centralizado instantáneo por WhatsApp y Correo'}
      icon={<Send size={18} />}
      maxWidth="600px"
      borderColor="rgba(56, 189, 248, 0.38)"
      zIndex={100010}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '10px', flexWrap: 'wrap' }}>
          <WjgButton
            variant="ghost"
            size="sm"
            leftIcon={copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            onClick={handleCopy}
          >
            {copied ? 'Copiado' : 'Copiar texto'}
          </WjgButton>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {secondarySaveAction && (
              <WjgButton
                variant="secondary"
                size="sm"
                onClick={secondarySaveAction.onClick}
                disabled={isSending}
              >
                {secondarySaveAction.label}
              </WjgButton>
            )}
            <WjgButton variant="secondary" size="sm" onClick={onClose} disabled={isSending}>
              Cerrar
            </WjgButton>
            {hasFailures && (
              <WjgButton
                variant="warning"
                size="sm"
                loading={isSending}
                leftIcon={<RefreshCw size={14} />}
                onClick={() => executeSend(summary!)}
              >
                Reintentar Fallidos
              </WjgButton>
            )}
            <WjgButton
              variant="whatsapp"
              size="sm"
              loading={isSending}
              leftIcon={<Send size={14} />}
              onClick={() => executeSend()}
            >
              {isSending ? 'Enviando...' : primaryButtonLabel || 'Enviar Ahora'}
            </WjgButton>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Modo de Destino */}
        {!hideModeSelector && (
          <div>
            <label className="form-label">Destino de la Notificación</label>
            <WjgSelect
              value={targetMode}
              onChange={val => setTargetMode(val as DispatcherTargetMode)}
              options={[
                {
                  value: 'individual',
                  label: '👤 Integrante Específico (WhatsApp directo + Correo)',
                  subtitle: 'Envía directamente al celular y correo de la persona elegida'
                },
                {
                  value: 'grupo',
                  label: resolvedGroup
                    ? `👥 Grupo WhatsApp: ${resolvedGroup.nombre} + Correo a los 3`
                    : '👥 Grupo WhatsApp del Equipo + Correo a los 3',
                  subtitle: resolvedGroup
                    ? `Canal "${groupChannel}" vinculado (${resolvedGroup.jid})`
                    : 'Configura el grupo en WhatsApp y Correo si aún no aparece'
                },
                {
                  value: 'todos_individual',
                  label: '📲 Los 3 Integrantes por Separado + Correos',
                  subtitle: 'Envía chat privado y correo a Germán, Juan y Wendy'
                },
                ...(externalRecipient
                  ? [
                      {
                        value: 'cliente',
                        label: `🧾 Cliente: ${externalRecipient.nombre}`,
                        subtitle: 'Despacho directo al WhatsApp y correo del cliente'
                      }
                    ]
                  : [])
              ]}
            />
          </div>
        )}

        {/* Destinatario Cliente Externo */}
        {targetMode === 'cliente' && (
          <div
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Cliente Destinatario
              </span>
              <WjgBadge variant="cyan">
                👤 {externalRecipient?.nombre || 'Cliente'}
              </WjgBadge>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
              <WjgTextInput
                label="WhatsApp Cliente (+57)"
                value={externalPhone}
                onChange={setExternalPhone}
                placeholder="Ej: 3202796115"
              />
              <WjgTextInput
                label="Correo Electrónico Cliente"
                value={externalEmail}
                onChange={setExternalEmail}
                placeholder="cliente@correo.com (opcional)"
              />
            </div>
          </div>
        )}

        {/* Resumen Financiero / Operativo opcional */}
        {resumenDetalle && resumenDetalle.length > 0 && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(0, 0, 0, 0.28)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px'
            }}
          >
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>
              Resumen de la Operación
            </span>
            {resumenDetalle.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', gap: '8px' }}>
                <span style={{ color: item.destacado ? '#f8fafc' : '#94a3b8', fontWeight: item.destacado ? 700 : 400 }}>
                  {item.etiqueta}:
                </span>
                <span
                  style={{
                    color: item.destacado ? 'var(--brand-cyan)' : '#e2e8f0',
                    fontWeight: item.destacado ? 800 : 600
                  }}
                >
                  {item.valor}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Selector dinámico según modo */}
        {targetMode === 'individual' && (
          <div>
            <label className="form-label">Integrante Destinatario (Directorio Supabase)</label>
            <WjgSelect
              value={selectedMemberId}
              onChange={setSelectedMemberId}
              options={contacts.map(c => ({
                value: c.id,
                label: `${c.nombreCorto} (${c.rol})`,
                subtitle: `📱 +${c.telefonoE164 || c.telefono} • ✉️ ${c.correo || 'Sin correo'}`
              }))}
            />
          </div>
        )}

        {targetMode === 'grupo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Grupo / Categoría de WhatsApp</label>
                {selectedGroupChannelMeta?.audiencia === 'clientes' && (
                  <WjgBadge variant="warning">📢 Difusión Clientes</WjgBadge>
                )}
              </div>
              <WjgSelect
                value={groupChannel}
                onChange={val => setGroupChannel(val as CanalGrupoWhatsApp)}
                options={groupChannelOptions.map(opt => ({
                  value: opt.id,
                  label: opt.label,
                  subtitle: opt.jid
                    ? `${opt.subtitle} • ✓ ${opt.nombre || opt.jid}`
                    : opt.subtitle
                }))}
              />
            </div>

            {!resolvedGroup && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ fontSize: '0.76rem', color: '#fde68a' }}>
                  <strong>Grupo no configurado aún:</strong> vincula el grupo en Ajustes de WhatsApp para despachar en 1 clic.
                </div>
                <WjgButton
                  variant="warning"
                  size="sm"
                  leftIcon={<Settings2 size={13} />}
                  onClick={() => window.dispatchEvent(new CustomEvent('wjg:open-whatsapp-modal'))}
                >
                  Configurar Grupos
                </WjgButton>
              </div>
            )}
          </div>
        )}

        {/* Switches de Canales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
          <WjgSwitch
            checked={whatsappEnabled}
            onChange={setWhatsappEnabled}
            accentColor="#25D366"
            label={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <MessageCircle size={14} color="#4ade80" />
                Enviar por WhatsApp
              </span>
            }
            description={
              targetMode === 'cliente'
                ? externalPhone
                  ? `+${formatWhatsAppPhone(externalPhone)}`
                  : 'Sin teléfono válido'
                : targetMode === 'grupo'
                ? resolvedGroup
                  ? `Grupo: ${resolvedGroup.nombre}`
                  : 'Sin grupo vinculado'
                : targetMode === 'todos_individual'
                ? `${contacts.length} chats individuales`
                : selectedMember
                ? `+${selectedMember.telefonoE164}`
                : 'Sin número'
            }
          />
          <WjgSwitch
            checked={emailEnabled}
            onChange={setEmailEnabled}
            accentColor="#38bdf8"
            label={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} color="#38bdf8" />
                Enviar por Correo Real
              </span>
            }
            description={
              targetMode === 'cliente'
                ? externalEmail?.trim() || 'Ingresa un correo si deseas notificar'
                : targetMode === 'individual'
                ? selectedMember?.correo || 'Sin correo registrado'
                : `${contacts.filter(c => c.correo).length} correos del equipo`
            }
          />
        </div>

        {/* Asunto de Correo */}
        {emailEnabled && (
          <WjgTextInput
            label="Asunto del Correo Electrónico"
            value={emailSubject}
            onChange={setEmailSubject}
            placeholder="Asunto del correo..."
          />
        )}

        {/* Vista Previa Editable */}
        <WjgTextArea
          label="Mensaje (WhatsApp y Cuerpo de Correo)"
          value={whatsappText}
          onChange={setWhatsappText}
          rows={6}
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '0.8rem' }}
        />

        {/* Resultados en Vivo por Canal */}
        {summary && (
          <div
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(7, 10, 16, 0.7)',
              border: `1px solid ${summary.success && !hasFailures ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {summary.success && !hasFailures ? (
                  <CheckCircle2 size={15} color="#34d399" />
                ) : (
                  <AlertTriangle size={15} color="#fbbf24" />
                )}
                Estado de Entrega por Canal
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <WjgBadge variant={summary.whatsappOkCount > 0 ? 'success' : summary.whatsappFailCount > 0 ? 'danger' : 'neutral'}>
                  WA: {summary.whatsappOkCount} ok / {summary.whatsappFailCount} err
                </WjgBadge>
                <WjgBadge variant={summary.emailOkCount > 0 ? 'cyan' : summary.emailFailCount > 0 ? 'danger' : 'neutral'}>
                  Email: {summary.emailOkCount} ok / {summary.emailFailCount} err
                </WjgBadge>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {summary.results.map((r, idx) => (
                <div
                  key={`${r.channel}-${r.destination}-${idx}`}
                  style={{
                    fontSize: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ color: '#e2e8f0' }}>
                      {r.channel === 'email' ? '✉️ Correo' : r.channel === 'whatsapp_group' ? '👥 Grupo WA' : '📱 WhatsApp'} ({r.targetLabel}):
                    </strong>{' '}
                    <span style={{ color: r.success ? '#6ee7b7' : '#fca5a5' }}>
                      {r.success ? `Enviado${r.provider ? ` (${r.provider})` : ''}` : r.error || 'Error de envío'}
                    </span>
                  </div>
                  {!r.success && r.fallbackUrl && (
                    <WjgButton
                      variant="whatsapp"
                      size="sm"
                      leftIcon={<ExternalLink size={12} />}
                      onClick={() => {
                        window.open(r.fallbackUrl!, '_blank', 'noopener,noreferrer');
                        onFallbackOpened?.();
                      }}
                      style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.72rem' }}
                    >
                      Abrir wa.me
                    </WjgButton>
                  )}
                </div>
              ))}
            </div>

            {summary.needsAppsScriptUpdate && (
              <div style={{ fontSize: '0.73rem', color: '#fde68a', paddingTop: '4px' }}>
                💡 Para correo directo desde <strong>wjgeeks3d@gmail.com</strong>, actualiza el código de Google Apps Script en <em>Respaldos Drive → Obtener Código Apps Script</em> e implementa una <strong>Nueva versión</strong> (o define <code>RESEND_API_KEY</code> en Supabase Secrets).
              </div>
            )}
          </div>
        )}
      </div>
    </WjgModal>
  );
};
