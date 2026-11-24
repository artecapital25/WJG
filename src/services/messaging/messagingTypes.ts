import { CanalGrupoWhatsApp, ConfiguracionTaller } from '../../types';
import { UsuarioTaller } from '../../types/usuarios.types';

export type MessagingContextType =
  | 'tarea'
  | 'sos_insumo'
  | 'stock_bajo'
  | 'general'
  | 'cotizacion'
  | 'pos'
  | 'ot'
  | 'cobro';

export type MessagingChannel = 'whatsapp' | 'email';

export type EmailTipo =
  | 'tarea_asignada'
  | 'tarea_actualizada'
  | 'tarea_avance'
  | 'tarea_completada'
  | 'sos_insumo'
  | 'stock_bajo'
  | 'prueba_conexion'
  | 'cotizacion'
  | 'abono'
  | 'pieza_terminada'
  | 'cuenta_cobro'
  | 'alerta_equipo';

export interface TeamMemberContact {
  id: string;
  nombre: string;
  nombreCorto: string;
  rol: string;
  telefono: string;
  telefonoE164: string;
  correo: string;
  activo: boolean;
}

export interface RecipientTarget {
  type: 'individual' | 'group' | 'external';
  label: string;
  whatsappTarget?: string;
  correo?: string;
  groupChannel?: CanalGrupoWhatsApp;
}

export interface ChannelDeliveryResult {
  channel: 'whatsapp_individual' | 'whatsapp_group' | 'email';
  targetLabel: string;
  destination: string;
  success: boolean;
  verified?: boolean;
  provider?: string;
  messageId?: string;
  error?: string;
  fallbackUrl?: string;
  wokeAttempted?: boolean;
  needsAppsScriptUpdate?: boolean;
}

export interface DispatchRequest {
  context: MessagingContextType;
  entidadTipo?: string;
  entidadId?: string;
  whatsappEnabled?: boolean;
  emailEnabled?: boolean;
  whatsappTargets?: RecipientTarget[];
  emailTargets?: Array<{ correo: string; nombre: string }>;
  whatsappText: string;
  emailSubject: string;
  emailType: EmailTipo;
  emailData?: Record<string, any>;
  trackingUrl?: string;
  tallerConfig?: ConfiguracionTaller | null;
  usuarios?: UsuarioTaller[];
  allowWakeUpRetry?: boolean;
}

export interface DispatchSummary {
  success: boolean;
  results: ChannelDeliveryResult[];
  whatsappOkCount: number;
  whatsappFailCount: number;
  emailOkCount: number;
  emailFailCount: number;
  fallbackUrls: Array<{ label: string; url: string }>;
  needsAppsScriptUpdate: boolean;
  summaryText: string;
}
