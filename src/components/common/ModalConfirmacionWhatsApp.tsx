import React from 'react';
import { ConfiguracionTaller } from '../../types';
import { EmailTipo, MessagingContextType } from '../../services/messaging';
import { WjgMessageDispatcherModal } from '../messaging/WjgMessageDispatcherModal';

export interface ResumenFinancieroItem {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}

export interface ModalConfirmacionWhatsAppProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo?: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteCorreo?: string;
  mensajeWhatsApp: string;
  resumenDetalle: ResumenFinancieroItem[];
  onConfirmadoExitoso: () => void;
  onConfirmarSinEnvio: () => void;
  context?: MessagingContextType;
  emailType?: EmailTipo;
  emailSubject?: string;
  emailData?: Record<string, any>;
  trackingUrl?: string;
  entidadTipo?: string;
  entidadId?: string;
  config?: ConfiguracionTaller | null;
}

/**
 * Wrapper reutilizable para confirmación de despacho a clientes externos (Cotizaciones / POS).
 * Delega el envío multi-canal (WhatsApp + Correo Verificado) al motor central WjgMessageDispatcherModal.
 */
export const ModalConfirmacionWhatsApp: React.FC<ModalConfirmacionWhatsAppProps> = ({
  isOpen,
  onClose,
  titulo,
  subtitulo,
  clienteNombre,
  clienteTelefono,
  clienteCorreo,
  mensajeWhatsApp,
  resumenDetalle,
  onConfirmadoExitoso,
  onConfirmarSinEnvio,
  context = 'general',
  emailType = 'cotizacion',
  emailSubject,
  emailData,
  trackingUrl,
  entidadTipo,
  entidadId,
  config
}) => {
  return (
    <WjgMessageDispatcherModal
      isOpen={isOpen}
      onClose={onClose}
      title={titulo}
      subtitle={subtitulo || 'Despacho oficial por WhatsApp (+57 320 2796115) y Correo Verificado'}
      context={context}
      defaultTargetMode="cliente"
      hideModeSelector={true}
      externalRecipient={{
        nombre: clienteNombre,
        telefono: clienteTelefono,
        correo: clienteCorreo
      }}
      resumenDetalle={resumenDetalle}
      initialWhatsAppText={mensajeWhatsApp}
      initialEmailSubject={emailSubject || `${titulo} — WJGEEKS 3D`}
      emailType={emailType}
      emailData={emailData}
      trackingUrl={trackingUrl}
      entidadTipo={entidadTipo}
      entidadId={entidadId}
      config={config}
      primaryButtonLabel="Enviar y Guardar"
      secondarySaveAction={{
        label: 'Guardar sin enviar',
        onClick: onConfirmarSinEnvio
      }}
      onDispatched={summary => {
        if (summary.success) {
          onConfirmadoExitoso();
        }
      }}
      onFallbackOpened={onConfirmadoExitoso}
    />
  );
};
