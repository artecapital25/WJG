import { useMemo } from 'react';
import { HubType } from '../components/ui/BottomNavBar';
import { TabType } from '../types';
import { HubAreaPermission, UsuarioTaller } from '../types/usuarios.types';

const ALL_AREAS: HubAreaPermission[] = ['ventas', 'taller', 'finanzas', 'gestion', 'herramientas'];

export function useAuthorization(activeOperatorName: string = 'Juan', usuarios: UsuarioTaller[] = []) {
  // Encontrar el usuario activo en la lista o aplicar fallback seguro por nombre oficial
  const currentUser = useMemo(() => {
    const cleanName = (activeOperatorName || '').trim().toLowerCase();
    const found = usuarios.find(u => u.nombre.toLowerCase().includes(cleanName));
    if (found) {
      return {
        ...found,
        permisos_areas: ALL_AREAS
      };
    }

    // Fallbacks predeterminados para los miembros base
    if (cleanName.includes('german') || cleanName.includes('germán')) {
      return {
        id: '08c6c49a-0422-414b-813e-8f58fa651bd5',
        nombre: 'Germán',
        rol: 'ADMIN_COBRANZAS',
        telefono: '3503443140',
        telefono_notificaciones: '573503443140',
        permisos_areas: ALL_AREAS,
        activo: true
      };
    }

    if (cleanName.includes('wendy')) {
      return {
        id: '4485aa21-3896-4510-b693-fc68e947372d',
        nombre: 'Wendy',
        rol: 'ADMIN_COBRANZAS',
        telefono: '3204814702',
        telefono_notificaciones: '573204814702',
        permisos_areas: ALL_AREAS,
        activo: true
      };
    }

    // Default Juan o cualquier operador activo: Acceso total transversal
    return {
      id: 'a48df7ca-8b06-4bab-bfa4-3b058912b06f',
      nombre: activeOperatorName ? activeOperatorName.trim() : 'Juan',
      rol: 'ADMIN_COBRANZAS',
      telefono: '3217273025',
      telefono_notificaciones: '573217273025',
      permisos_areas: ALL_AREAS,
      activo: true
    };
  }, [activeOperatorName, usuarios]);

  const permisos: HubAreaPermission[] = useMemo(() => {
    if (!currentUser.activo) return [];
    return ALL_AREAS;
  }, [currentUser]);

  const hasPermission = (_area: HubAreaPermission): boolean => {
    return Boolean(currentUser.activo);
  };

  const canAccessHub = (_hub: HubType): boolean => {
    return Boolean(currentUser.activo);
  };

  const canAccessTab = (_tab: TabType): boolean => {
    return Boolean(currentUser.activo);
  };

  return {
    currentUser,
    permisos,
    hasPermission,
    canAccessHub,
    canAccessTab,
    isGermanAdmin: Boolean(currentUser.activo)
  };
}
