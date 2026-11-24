import { CanalGrupoWhatsApp, ConfiguracionTaller, GrupoWhatsAppConfig } from '../../types';
import { UsuarioTaller } from '../../types/usuarios.types';
import { WhatsAppGatewayService } from '../whatsappGatewayService';
import { formatWhatsAppPhone } from '../whatsappService';
import { RecipientTarget, TeamMemberContact } from './messagingTypes';

const LOCAL_STORAGE_USERS_KEY = 'wjg_usuarios_taller_cache';

const FALLBACK_TEAM_CONTACTS: TeamMemberContact[] = [
  {
    id: '08c6c49a-0422-414b-813e-8f58fa651bd5',
    nombre: 'Germán Eduardo Reyes Vasquez',
    nombreCorto: 'Germán',
    rol: 'Dirección & Modelado 3D',
    telefono: '3503443140',
    telefonoE164: '573503443140',
    correo: 'german.951026@gmail.com',
    activo: true
  },
  {
    id: 'a48df7ca-8b06-4bab-bfa4-3b058912b06f',
    nombre: 'Juan',
    nombreCorto: 'Juan',
    rol: 'Taller & Impresión 3D',
    telefono: '3217273025',
    telefonoE164: '573217273025',
    correo: 'davidguz0812@gmail.com',
    activo: true
  },
  {
    id: '4485aa21-3896-4510-b693-fc68e947372d',
    nombre: 'Wendy',
    nombreCorto: 'Wendy',
    rol: 'Pintura, Acabados & Compras',
    telefono: '3204814702',
    telefonoE164: '573204814702',
    correo: 'wendysami97@gmail.com',
    activo: true
  }
];

export function normalizeTextKey(value?: string | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function getShortName(nombre: string): string {
  const clean = (nombre || '').trim();
  if (!clean) return 'Equipo';
  const norm = normalizeTextKey(clean);
  if (norm.startsWith('german')) return 'Germán';
  if (norm.startsWith('wendy')) return 'Wendy';
  if (norm.startsWith('juan')) return 'Juan';
  return clean.split(/\s+/)[0] || clean;
}

function readCachedUsers(): UsuarioTaller[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toTeamContact(u: UsuarioTaller): TeamMemberContact {
  const shortName = getShortName(u.nombre);
  const rawPhone = u.telefono_notificaciones || u.telefono || '';
  const e164 = formatWhatsAppPhone(rawPhone);
  const fallbackMatch = FALLBACK_TEAM_CONTACTS.find(
    f => normalizeTextKey(f.nombreCorto) === normalizeTextKey(shortName)
  );
  const correo = (u.email && u.email.includes('@')) ? u.email.trim() : (fallbackMatch?.correo || '');

  return {
    id: u.id,
    nombre: u.nombre,
    nombreCorto: shortName,
    rol: u.area_responsabilidad || u.rol || fallbackMatch?.rol || 'Equipo WJGEEKS',
    telefono: (u.telefono || rawPhone).replace(/\D/g, ''),
    telefonoE164: e164 || fallbackMatch?.telefonoE164 || '',
    correo,
    activo: u.activo !== false
  };
}

/**
 * Única fuente de verdad para contactos del equipo (lee usuarios_taller o su caché local, con fallback seguro).
 */
export function getTeamContacts(usuarios?: UsuarioTaller[]): TeamMemberContact[] {
  const source = usuarios && usuarios.length > 0 ? usuarios : readCachedUsers();
  if (!source || source.length === 0) {
    return FALLBACK_TEAM_CONTACTS;
  }

  const activos = source.filter(u => u.activo !== false);
  if (activos.length === 0) return FALLBACK_TEAM_CONTACTS;
  return activos.map(toTeamContact);
}

/**
 * Busca un integrante del equipo por nombre completo, primer nombre o coincidencia normalizada sin tildes.
 */
export function findTeamContactByName(
  nombre?: string | null,
  usuarios?: UsuarioTaller[]
): TeamMemberContact | null {
  const q = normalizeTextKey(nombre);
  if (!q) return null;
  const contacts = getTeamContacts(usuarios);

  const exact = contacts.find(
    c => normalizeTextKey(c.nombre) === q || normalizeTextKey(c.nombreCorto) === q
  );
  if (exact) return exact;

  return (
    contacts.find(c => {
      const nFull = normalizeTextKey(c.nombre);
      const nShort = normalizeTextKey(c.nombreCorto);
      return nFull.includes(q) || q.includes(nShort);
    }) || null
  );
}

export interface ConfiguredGroupChannelOption {
  id: CanalGrupoWhatsApp;
  label: string;
  subtitle: string;
  audiencia: 'equipo' | 'clientes';
  jid: string;
  nombre: string;
  esPersonalizado: boolean;
}

export const BASE_GROUP_CHANNELS_META: Array<{
  id: CanalGrupoWhatsApp;
  label: string;
  subtitle: string;
  audiencia: 'equipo' | 'clientes';
}> = [
  {
    id: 'tareas',
    label: '📋 Grupo Tareas & Pendientes',
    subtitle: 'Tareas grupales ("Todos"), rutinas y avances de bitácora',
    audiencia: 'equipo'
  },
  {
    id: 'insumos',
    label: '🛒 Grupo Bodega & S.O.S Insumos',
    subtitle: 'Pedidos urgentes de material y alertas de stock bajo',
    audiencia: 'equipo'
  },
  {
    id: 'taller',
    label: '🖨️ Grupo Taller & Producción',
    subtitle: 'Pases de turno y calidad de Órdenes de Trabajo',
    audiencia: 'equipo'
  },
  {
    id: 'cotizaciones',
    label: '💼 Grupo Revisiones Cotizador',
    subtitle: 'Informes internos + PDFs desde el cotizador',
    audiencia: 'equipo'
  },
  {
    id: 'general',
    label: '🏠 Grupo Principal WJGEEKS',
    subtitle: 'Canal general de la empresa y respaldo universal',
    audiencia: 'equipo'
  }
];

/**
 * Combina los 5 canales base con cualquier canal/grupo personalizado guardado por el taller
 * (ej. canales internos adicionales o grupos de difusión para clientes).
 */
export function getConfiguredGroupChannels(
  tallerConfig?: ConfiguracionTaller | null
): ConfiguredGroupChannelOption[] {
  const localCfg = WhatsAppGatewayService.getConfig();
  const mergedMap: Record<string, GrupoWhatsAppConfig | undefined> = {
    ...(localCfg.gruposConfig || {}),
    ...(tallerConfig?.whatsapp_grupos_config || {})
  };

  const baseIds = new Set(BASE_GROUP_CHANNELS_META.map(b => String(b.id)));
  const result: ConfiguredGroupChannelOption[] = BASE_GROUP_CHANNELS_META.map(base => {
    const entry = mergedMap[String(base.id)];
    const fallbackGeneralJid =
      base.id === 'general'
        ? tallerConfig?.whatsapp_internal_group_jid || localCfg.internalGroupJid || ''
        : '';
    const fallbackGeneralName =
      base.id === 'general'
        ? tallerConfig?.whatsapp_internal_group_name || localCfg.internalGroupName || ''
        : '';

    return {
      id: base.id,
      label: entry?.etiqueta || base.label,
      subtitle: entry?.descripcion || base.subtitle,
      audiencia: entry?.audiencia || base.audiencia,
      jid: entry?.jid || fallbackGeneralJid,
      nombre: entry?.nombre || fallbackGeneralName,
      esPersonalizado: false
    };
  });

  Object.entries(mergedMap).forEach(([key, entry]) => {
    if (!entry || baseIds.has(key)) return;
    const aud = entry.audiencia === 'clientes' ? 'clientes' : 'equipo';
    const prefix = aud === 'clientes' ? '📢 ' : '🏷️ ';
    const rawLabel = (entry.etiqueta || entry.nombre || key).trim();
    const label = /^[📢🏷️👥📋🛒🖨️💼🏠]/u.test(rawLabel) ? rawLabel : `${prefix}${rawLabel}`;
    result.push({
      id: key,
      label,
      subtitle:
        entry.descripcion ||
        (aud === 'clientes'
          ? 'Canal de difusión / novedades para clientes'
          : 'Canal personalizado del taller'),
      audiencia: aud,
      jid: entry.jid || '',
      nombre: entry.nombre || rawLabel,
      esPersonalizado: true
    });
  });

  return result;
}

export function resolveGroupDestination(
  canal: CanalGrupoWhatsApp = 'general',
  tallerConfig?: ConfiguracionTaller | null
): GrupoWhatsAppConfig | null {
  return WhatsAppGatewayService.resolveGroup(canal, tallerConfig);
}

/**
 * Resuelve destinatarios de WhatsApp y Correo para una tarea o solicitud según su asignado.
 * - Si asignado === 'Todos': WhatsApp -> Grupo configurado del canal (o los 3 si no hay grupo) + Correo -> los 3.
 * - Si asignado es 1 persona: WhatsApp -> número del integrante + Correo -> correo del integrante.
 */
export function resolveTaskRecipients(
  asignadoA: string,
  usuarios?: UsuarioTaller[],
  tallerConfig?: ConfiguracionTaller | null,
  groupChannel: CanalGrupoWhatsApp = 'tareas',
  forceGroup: boolean = false
): {
  isGroupTarget: boolean;
  groupConfigured: GrupoWhatsAppConfig | null;
  whatsappTargets: RecipientTarget[];
  emailTargets: Array<{ correo: string; nombre: string }>;
} {
  const contacts = getTeamContacts(usuarios);
  const isTodos = forceGroup || normalizeTextKey(asignadoA) === 'todos';
  const group = resolveGroupDestination(groupChannel, tallerConfig);

  if (isTodos) {
    const whatsappTargets: RecipientTarget[] = group
      ? [
          {
            type: 'group',
            label: group.nombre || `Grupo WhatsApp (${groupChannel})`,
            whatsappTarget: group.jid,
            groupChannel
          }
        ]
      : contacts
          .filter(c => Boolean(c.telefonoE164))
          .map(c => ({
            type: 'individual' as const,
            label: c.nombreCorto,
            whatsappTarget: c.telefonoE164,
            correo: c.correo
          }));

    const emailTargets = contacts
      .filter(c => Boolean(c.correo && c.correo.includes('@')))
      .map(c => ({ correo: c.correo, nombre: c.nombreCorto }));

    return {
      isGroupTarget: true,
      groupConfigured: group,
      whatsappTargets,
      emailTargets
    };
  }

  const member = findTeamContactByName(asignadoA, usuarios);
  if (member) {
    return {
      isGroupTarget: false,
      groupConfigured: group,
      whatsappTargets: member.telefonoE164
        ? [
            {
              type: 'individual',
              label: member.nombreCorto,
              whatsappTarget: member.telefonoE164,
              correo: member.correo
            }
          ]
        : [],
      emailTargets:
        member.correo && member.correo.includes('@')
          ? [{ correo: member.correo, nombre: member.nombreCorto }]
          : []
    };
  }

  return {
    isGroupTarget: false,
    groupConfigured: group,
    whatsappTargets: [],
    emailTargets: []
  };
}
