import React, { useMemo } from 'react';
import { ConfiguracionTaller, TareaEquipo } from '../../types';
import { UsuarioTaller } from '../../types/usuarios.types';
import { WjgMessageDispatcherModal } from '../messaging/WjgMessageDispatcherModal';
import { buildTareaMessage } from '../../services/messaging';

interface ModalEnviarTareaWhatsAppProps {
  isOpen: boolean;
  tarea: TareaEquipo | null;
  onClose: () => void;
  usuarios?: UsuarioTaller[];
  config?: ConfiguracionTaller | null;
}

export const ModalEnviarTareaWhatsApp: React.FC<ModalEnviarTareaWhatsAppProps> = ({
  isOpen,
  tarea,
  onClose,
  usuarios,
  config
}) => {
  const built = useMemo(() => {
    if (!tarea) return null;
    return buildTareaMessage(tarea, 'asignada');
  }, [tarea]);

  if (!isOpen || !tarea || !built) return null;

  return (
    <WjgMessageDispatcherModal
      isOpen={isOpen}
      onClose={onClose}
      title="Notificar Tarea (WhatsApp & Correo)"
      subtitle={`${tarea.titulo} • Responsable: ${tarea.asignado_a}`}
      context="tarea"
      defaultGroupChannel="tareas"
      defaultTargetMode={tarea.asignado_a === 'Todos' ? 'grupo' : 'individual'}
      defaultAssigneeName={tarea.asignado_a}
      initialWhatsAppText={built.whatsappText}
      initialEmailSubject={built.emailSubject}
      emailType={built.emailType}
      emailData={built.emailData}
      trackingUrl={built.trackingUrl}
      entidadTipo="tarea_equipo"
      entidadId={tarea.id}
      usuarios={usuarios}
      config={config}
    />
  );
};
