/**
 * Contratos TypeScript Estrictos para Directorio de Operadores y RBAC Ligero
 * Sistema WJGEEKS 3D PRO
 */

export type HubAreaPermission = 'ventas' | 'taller' | 'finanzas' | 'gestion';

export type RolOperativoTaller = 
  | 'ADMIN_COBRANZAS' 
  | 'PINTURA_ACABADOS' 
  | 'IMPRESION_MANTENIMIENTO' 
  | 'VENTAS_POS' 
  | string;

export interface DispositivoConexion {
  id: string; // fingerprint único
  nombre: string; // ej: "Windows 10/11 (Chrome) • PC"
  tipo: 'escritorio' | 'movil' | 'tablet';
  navegador: string;
  so: string;
  resolucion?: string;
  fecha_conexion: string; // ISO
  es_seguro: boolean; // ¿Registrado de confianza?
  fingerprint: string;
  es_nuevo?: boolean;
}

export interface DispositivoInfoConsolidado {
  ultimo_dispositivo: DispositivoConexion;
  historial_dispositivos: DispositivoConexion[];
}

export function parseDispositivoInfo(raw: any): DispositivoInfoConsolidado | null {
  if (!raw) return null;
  let parsed: any;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // Cadena simple en texto plano (ej: legacy "Chrome en Android - Celular Juan")
      const isMobile = /m[oó]vil|celular|android|iphone/i.test(trimmed);
      const dev: DispositivoConexion = {
        id: 'dev-legacy-str',
        nombre: trimmed,
        tipo: isMobile ? 'movil' : 'escritorio',
        navegador: 'Navegador Web',
        so: 'Desconocido',
        fecha_conexion: new Date().toISOString(),
        es_seguro: true,
        fingerprint: 'legacy-str'
      };
      return {
        ultimo_dispositivo: dev,
        historial_dispositivos: [dev]
      };
    }
  } else {
    parsed = raw;
  }

  if (parsed && parsed.ultimo_dispositivo) {
    return {
      ultimo_dispositivo: parsed.ultimo_dispositivo,
      historial_dispositivos: Array.isArray(parsed.historial_dispositivos) ? parsed.historial_dispositivos : [parsed.ultimo_dispositivo]
    };
  }

  // Compatibilidad con objeto simple anterior
  if (parsed && (parsed.tipo || parsed.navegador || parsed.nombre)) {
    const dev: DispositivoConexion = {
      id: parsed.id || parsed.fingerprint || 'dev-legacy',
      nombre: parsed.nombre || `${parsed.tipo === 'movil' ? 'Dispositivo Móvil' : 'PC'} (${parsed.navegador || 'Web'})`,
      tipo: parsed.tipo || 'escritorio',
      navegador: parsed.navegador || 'Navegador Web',
      so: parsed.so || 'Desconocido',
      fecha_conexion: parsed.fecha || new Date().toISOString(),
      es_seguro: Boolean(parsed.es_seguro ?? true),
      fingerprint: parsed.fingerprint || 'legacy'
    };
    return {
      ultimo_dispositivo: dev,
      historial_dispositivos: [dev]
    };
  }

  return null;
}

export interface UsuarioTaller {
  id: string;
  nombre: string;
  rol: RolOperativoTaller;
  telefono: string;
  telefono_notificaciones: string;
  email?: string | null;
  cedula?: string | null;
  permisos_areas: HubAreaPermission[];
  pin_acceso?: string;
  password_hash?: string;
  pin_hash?: string;
  activo: boolean;
  must_change_password?: boolean;
  ultimo_acceso?: string | null;
  dispositivo_info?: DispositivoInfoConsolidado | any;
  created_at?: string;
}

export interface UsuarioTallerInput {
  nombre: string;
  rol: string;
  telefono: string;
  telefono_notificaciones: string;
  email?: string;
  cedula?: string;
  permisos_areas: HubAreaPermission[];
  pin_acceso?: string;
  activo?: boolean;
}

export interface HubPermissionDefinition {
  id: HubAreaPermission;
  label: string;
  descripcion: string;
  color: string;
  bgColor: string;
  borderColor: string;
  submodulos: string[];
}

export const HUB_PERMISSIONS_CONFIG: Record<HubAreaPermission, HubPermissionDefinition> = {
  ventas: {
    id: 'ventas',
    label: 'Ventas',
    descripcion: 'Cotizador 3D, Cotizaciones Historial, POS Express',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    submodulos: ['Cotizador 3D', 'Cotizaciones', 'POS Express']
  },
  taller: {
    id: 'taller',
    label: 'Taller',
    descripcion: 'Kanban OTs, Visor STL, Stock, Calendario, Rastreo 3D',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.12)',
    borderColor: 'rgba(168, 85, 247, 0.35)',
    submodulos: ['Kanban OTs', 'Visor STL', 'Stock', 'Calendario', 'Rastreo']
  },
  finanzas: {
    id: 'finanzas',
    label: 'Finanzas',
    descripcion: 'Cuentas de Cobranzas, Abonos, Balance Financiero, Plan WJG',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    submodulos: ['Cobranzas', 'Balance', 'Plan WJG']
  },
  gestion: {
    id: 'gestion',
    label: 'Gestión',
    descripcion: 'Personal, Directorio de Operadores, Tareas & S.O.S, Marketing IA, Ajustes',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    submodulos: ['Personal', 'Equipo & S.O.S', 'Marketing IA', 'Ajustes']
  }
};
