import { useMemo } from 'react';
import { HubType } from '../components/ui/BottomNavBar';
import { TabType } from '../types';
import { HubAreaPermission, UsuarioTaller } from '../types/usuarios.types';

const TAB_TO_HUB_MAP: Record<TabType, HubAreaPermission> = {
  cotizador: 'ventas',
  cotizaciones: 'ventas',
  pos: 'ventas',
  workflow: 'taller',
  stl: 'taller',
  stock: 'taller',
  calendario: 'taller',
  seguimiento: 'taller',
  cuentas: 'finanzas',
  finanzas: 'finanzas',
  plan: 'finanzas',
  tareas: 'gestion',
  usuarios: 'gestion',
  marketing: 'gestion',
  catalogos: 'gestion',
  herramientas: 'gestion'
};

export function useAuthorization(activeOperatorName: string = 'Juan', usuarios: UsuarioTaller[] = []) {
  // Encontrar el usuario activo en la lista o aplicar fallback seguro por nombre oficial
  const currentUser = useMemo(() => {
    const cleanName = (activeOperatorName || '').trim().toLowerCase();
    const found = usuarios.find(u => u.nombre.toLowerCase().includes(cleanName));
    if (found) return found;

    // Fallbacks predeterminados para los miembros base
    if (cleanName.includes('german') || cleanName.includes('germán')) {
      return {
        id: '08c6c49a-0422-414b-813e-8f58fa651bd5',
        nombre: 'Germán',
        rol: 'ADMIN_COBRANZAS',
        telefono: '3503443140',
        telefono_notificaciones: '573503443140',
        permisos_areas: ['ventas', 'taller', 'finanzas', 'gestion'] as HubAreaPermission[],
        activo: true
      };
    }

    if (cleanName.includes('wendy')) {
      return {
        id: '4485aa21-3896-4510-b693-fc68e947372d',
        nombre: 'Wendy',
        rol: 'PINTURA_ACABADOS',
        telefono: '3204814702',
        telefono_notificaciones: '573204814702',
        permisos_areas: ['taller', 'gestion'] as HubAreaPermission[],
        activo: true
      };
    }

    // Default Juan: Solo Taller
    return {
      id: 'a48df7ca-8b06-4bab-bfa4-3b058912b06f',
      nombre: 'Juan',
      rol: 'IMPRESION_MANTENIMIENTO',
      telefono: '3217273025',
      telefono_notificaciones: '573217273025',
      permisos_areas: ['taller'] as HubAreaPermission[],
      activo: true
    };
  }, [activeOperatorName, usuarios]);

  const permisos: HubAreaPermission[] = useMemo(() => {
    if (!currentUser.activo) return [];
    return currentUser.permisos_areas || ['taller'];
  }, [currentUser]);

  const hasPermission = (area: HubAreaPermission): boolean => {
    return permisos.includes(area);
  };

  const canAccessHub = (hub: HubType): boolean => {
    return hasPermission(hub);
  };

  const canAccessTab = (tab: TabType): boolean => {
    // Tareas es un módulo transversal y operativo (PUBLIC_INTERNAL) accesible para todo el equipo del taller (Juan, Wendy, Germán)
    if (tab === 'tareas') return true;

    const requiredArea = TAB_TO_HUB_MAP[tab];
    if (!requiredArea) return true;
    return hasPermission(requiredArea);
  };

  return {
    currentUser,
    permisos,
    hasPermission,
    canAccessHub,
    canAccessTab,
    isGermanAdmin: currentUser.nombre.toLowerCase().includes('german')
  };
}
