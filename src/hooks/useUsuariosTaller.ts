import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { CloudSyncService } from '../services/cloudSyncService';
import { HubAreaPermission, UsuarioTaller, UsuarioTallerInput, parseDispositivoInfo } from '../types/usuarios.types';
import { toast } from '../components/ui/ToastProvider';
import { AuthSecurityService } from '../services/authSecurityService';

const LOCAL_STORAGE_USERS_KEY = 'wjg_usuarios_taller_cache';
const ALL_AREAS: HubAreaPermission[] = ['ventas', 'taller', 'finanzas', 'gestion', 'herramientas'];

export function inferAreaResponsabilidad(nombre?: string, current?: string | null): string {
  if (current && current.trim()) return current.trim();
  const n = (nombre || '').toLowerCase();
  if (n.includes('germ')) return 'Aplicación, Backoffice, Ventas y Redes';
  if (n.includes('juan')) return 'Encargado del Taller (Impresión 3D y Mantenimiento)';
  if (n.includes('wendy')) return 'Pintura, Acabados y Redes';
  return 'Operador Multifunción';
}

const DEFAULT_USERS_SEED: UsuarioTaller[] = [
  {
    id: '08c6c49a-0422-414b-813e-8f58fa651bd5',
    nombre: 'Germán',
    rol: 'ADMIN_COBRANZAS',
    area_responsabilidad: 'Aplicación, Backoffice, Ventas y Redes',
    costo_hora: 10000,
    costo_minuto: 166.67,
    aplica_mano_obra: true,
    telefono: '3503443140',
    telefono_notificaciones: '573503443140',
    email: 'german@wjgeeks.com',
    cedula: '1098765432',
    permisos_areas: ALL_AREAS,
    pin_acceso: '1234',
    activo: true,
    must_change_password: false
  },
  {
    id: '4485aa21-3896-4510-b693-fc68e947372d',
    nombre: 'Wendy',
    rol: 'ADMIN_COBRANZAS',
    area_responsabilidad: 'Pintura, Acabados y Redes',
    costo_hora: 10000,
    costo_minuto: 166.67,
    aplica_mano_obra: true,
    telefono: '3204814702',
    telefono_notificaciones: '573204814702',
    email: 'wendy@wjgeeks.com',
    cedula: '1098765433',
    permisos_areas: ALL_AREAS,
    pin_acceso: '1234',
    activo: true,
    must_change_password: false
  },
  {
    id: 'a48df7ca-8b06-4bab-bfa4-3b058912b06f',
    nombre: 'Juan',
    rol: 'ADMIN_COBRANZAS',
    area_responsabilidad: 'Encargado del Taller (Impresión 3D y Mantenimiento)',
    costo_hora: 10000,
    costo_minuto: 166.67,
    aplica_mano_obra: true,
    telefono: '3217273025',
    telefono_notificaciones: '573217273025',
    email: 'juan@wjgeeks.com',
    cedula: '1098765434',
    permisos_areas: ALL_AREAS,
    pin_acceso: '1234',
    activo: true,
    must_change_password: false
  }
];

export function useUsuariosTaller() {
  const [usuarios, setUsuarios] = useState<UsuarioTaller[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((u: any) => ({
              ...u,
              rol: u.rol || 'ADMIN_COBRANZAS',
              permisos_areas: ALL_AREAS
            }));
          }
        }
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_USERS_SEED;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper para persistir cache local
  const persistCache = (list: UsuarioTaller[]) => {
    setUsuarios(list);
    try {
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('No se pudo guardar usuarios_taller en cache:', e);
    }
  };

  // 1. Fetch de Usuarios con Supabase Single Source of Truth
  const fetchUsuarios = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const selectWithExtended = 'id, nombre, rol, area_responsabilidad, costo_hora, costo_minuto, aplica_mano_obra, telefono, telefono_notificaciones, email, cedula, permisos_areas, activo, pin_acceso, password_hash, must_change_password, ultimo_acceso, dispositivo_info, created_at';
      const selectBase = 'id, nombre, rol, costo_hora, costo_minuto, telefono, telefono_notificaciones, email, cedula, permisos_areas, activo, pin_acceso, password_hash, must_change_password, ultimo_acceso, dispositivo_info, created_at';

      let { data, error } = await supabase
        .from('usuarios_taller')
        .select(selectWithExtended)
        .order('nombre', { ascending: true });

      if (error && (error.code === '42703' || error.code === 'PGRST204' || /column/i.test(error.message || ''))) {
        const fallbackRes = await supabase
          .from('usuarios_taller')
          .select(selectBase)
          .order('nombre', { ascending: true });
        data = fallbackRes.data as any;
        error = fallbackRes.error;
      }

      if (error) {
        console.warn('Error consultando usuarios_taller en Supabase:', error.message);
        setIsError(true);
        setErrorMessage(error.message);
        return;
      }

      if (data && data.length > 0) {
        let existingLocal: UsuarioTaller[] = [];
        try {
          const cachedStr = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
          if (cachedStr) existingLocal = JSON.parse(cachedStr);
        } catch {}

        const idsToUpgrade: string[] = [];
        const normalized: UsuarioTaller[] = data.map((item: any) => {
          const prevPermisos = Array.isArray(item.permisos_areas) ? item.permisos_areas : [];
          if (item.activo !== false && prevPermisos.length < ALL_AREAS.length && item.id) {
            idsToUpgrade.push(item.id);
          }
          const localMatch = existingLocal.find(l => l.id === item.id);
          const costoHora = Number(item.costo_hora) > 0 ? Number(item.costo_hora) : (Number(localMatch?.costo_hora) || 10000);
          const costoMinuto = Number(item.costo_minuto) > 0
            ? Number(item.costo_minuto)
            : Number((costoHora / 60).toFixed(2));
          return {
            ...item,
            rol: item.rol || 'ADMIN_COBRANZAS',
            area_responsabilidad: inferAreaResponsabilidad(item.nombre, item.area_responsabilidad ?? localMatch?.area_responsabilidad),
            costo_hora: costoHora,
            costo_minuto: costoMinuto,
            aplica_mano_obra: item.aplica_mano_obra !== undefined ? Boolean(item.aplica_mano_obra) : (localMatch?.aplica_mano_obra ?? true),
            permisos_areas: ALL_AREAS,
            dispositivo_info: parseDispositivoInfo(item.dispositivo_info)
          };
        });
        persistCache(normalized);

        if (idsToUpgrade.length > 0) {
          supabase
            .from('usuarios_taller')
            .update({ permisos_areas: ALL_AREAS })
            .in('id', idsToUpgrade)
            .then(({ error: upgErr }) => {
              if (upgErr) console.warn('Aviso actualizando permisos_areas universales:', upgErr.message);
            });
        }
      } else {
        await autoSeedMiembrosOficiales();
      }
    } catch (err: any) {
      console.error('Fallo de conexión al cargar usuarios:', err);
      setIsError(true);
      setErrorMessage(err.message || 'Error de conexión con la base de datos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Si la tabla está vacía en BD, se asegura de insertar a Juan, Wendy y Germán
  const autoSeedMiembrosOficiales = async () => {
    if (!supabase) return;
    try {
      const { data: inserted, error } = await supabase
        .from('usuarios_taller')
        .insert(DEFAULT_USERS_SEED.map(u => ({
          nombre: u.nombre,
          rol: u.rol,
          telefono: u.telefono,
          telefono_notificaciones: u.telefono_notificaciones,
          email: u.email,
          cedula: u.cedula,
          permisos_areas: u.permisos_areas,
          pin_acceso: u.pin_acceso || '1234',
          activo: true
        })))
        .select();

      if (!error && inserted && inserted.length > 0) {
        persistCache(inserted as UsuarioTaller[]);
      }
    } catch (e) {
      console.warn('Autoseed no ejecutado:', e);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // 2. Verificación Reactiva de Duplicados en Tiempo Real (Debounced en el formulario)
  const verificarDuplicado = async (
    campo: 'telefono' | 'cedula' | 'email',
    valor: string,
    excludeId?: string
  ): Promise<{ existe: boolean; nombreExistente?: string }> => {
    const cleanVal = valor.trim().toLowerCase();
    if (!cleanVal) return { existe: false };

    // Verificación preliminar en estado local para feedback instantáneo (<1ms)
    const localMatch = usuarios.find(u => {
      if (excludeId && u.id === excludeId) return false;
      if (campo === 'telefono') {
        const p1 = u.telefono.replace(/\D/g, '');
        const p2 = cleanVal.replace(/\D/g, '');
        return p1.length >= 7 && p2.length >= 7 && (p1.includes(p2) || p2.includes(p1));
      }
      if (campo === 'cedula') return (u.cedula || '').trim().toLowerCase() === cleanVal;
      if (campo === 'email') return (u.email || '').trim().toLowerCase() === cleanVal;
      return false;
    });

    if (localMatch) {
      return { existe: true, nombreExistente: localMatch.nombre };
    }

    // Verificación profunda en Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('usuarios_taller').select('id, nombre');
        if (excludeId) query = query.neq('id', excludeId);

        if (campo === 'telefono') {
          query = query.or(`telefono.eq.${cleanVal},telefono_notificaciones.ilike.%${cleanVal}%`);
        } else if (campo === 'cedula') {
          query = query.eq('cedula', cleanVal);
        } else if (campo === 'email') {
          query = query.ilike('email', cleanVal);
        }

        const { data, error } = await query.limit(1);
        if (!error && data && data.length > 0) {
          return { existe: true, nombreExistente: data[0].nombre };
        }
      } catch {
        // ignorar fallo de red en verificación
      }
    }

    return { existe: false };
  };

  // Helper para traducir errores Postgres (código 23505 = unique_violation)
  const handlePostgresError = (error: any): string => {
    if (!error) return 'Error desconocido al procesar usuario.';
    const msg = error.message || '';
    const details = error.details || '';

    if (error.code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint') || details.includes('already exists')) {
      if (msg.includes('telefono') || details.includes('telefono')) {
        return 'Ya existe otro colaborador registrado con este número de teléfono o WhatsApp.';
      }
      if (msg.includes('cedula') || details.includes('cedula')) {
        return 'Ya existe otro colaborador registrado con este documento de identidad (cédula).';
      }
      if (msg.includes('email') || details.includes('email')) {
        return 'Ya existe otro colaborador registrado con este correo electrónico.';
      }
      return 'No se puede guardar: Ya existe un registro con estos mismos datos únicos (cédula, teléfono o correo).';
    }

    return msg || 'Error al comunicarse con la base de datos.';
  };

  // 3. Crear Usuario con Control de Duplicidad y Hash
  const createUsuario = async (input: UsuarioTallerInput): Promise<{ success: boolean; message: string; usuario?: UsuarioTaller }> => {
    let cleanPhone = input.telefono.replace(/\D/g, '');
    let cleanNotif = (input.telefono_notificaciones || input.telefono).replace(/\D/g, '');
    if (cleanNotif.length === 10 && cleanNotif.startsWith('3')) {
      cleanNotif = `57${cleanNotif}`;
    }

    const pin = (input.pin_acceso || '1234').trim();
    let pinHash = '';
    try {
      pinHash = await AuthSecurityService.sha256(pin);
    } catch {
      pinHash = '';
    }

    const costoHora = Number(input.costo_hora) > 0 ? Number(input.costo_hora) : 10000;
    const costoMinuto = Number(input.costo_minuto) > 0
      ? Number(input.costo_minuto)
      : Number((costoHora / 60).toFixed(2));
    const areaResp = inferAreaResponsabilidad(input.nombre, input.area_responsabilidad);
    const aplicaMO = input.aplica_mano_obra !== undefined ? Boolean(input.aplica_mano_obra) : true;

    const basePayload: any = {
      nombre: input.nombre.trim(),
      rol: input.rol,
      costo_hora: costoHora,
      costo_minuto: costoMinuto,
      telefono: cleanPhone,
      telefono_notificaciones: cleanNotif,
      email: input.email?.trim().toLowerCase() || null,
      cedula: input.cedula?.trim() || null,
      permisos_areas: input.permisos_areas && input.permisos_areas.length > 0 ? input.permisos_areas : ALL_AREAS,
      pin_acceso: pin,
      password_hash: pinHash,
      pin_hash: pinHash,
      activo: input.activo !== undefined ? input.activo : true,
      must_change_password: false
    };

    const extendedPayload: any = {
      ...basePayload,
      area_responsabilidad: areaResp,
      aplica_mano_obra: aplicaMO
    };

    const notifyPersonalChange = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wjg:personal-updated'));
      }
      CloudSyncService.broadcastChange('personal', 'upsert');
    };

    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase
          .from('usuarios_taller')
          .insert([extendedPayload])
          .select()
          .single();

        if (error && (error.code === '42703' || error.code === 'PGRST204' || /column/i.test(error.message || ''))) {
          const retry = await supabase
            .from('usuarios_taller')
            .insert([basePayload])
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) {
          const friendlyMsg = handlePostgresError(error);
          return { success: false, message: friendlyMsg };
        }

        const newUser: UsuarioTaller = {
          ...(data as UsuarioTaller),
          area_responsabilidad: (data as any)?.area_responsabilidad || areaResp,
          costo_hora: Number((data as any)?.costo_hora) || costoHora,
          costo_minuto: Number((data as any)?.costo_minuto) || costoMinuto,
          aplica_mano_obra: (data as any)?.aplica_mano_obra !== undefined ? Boolean((data as any).aplica_mano_obra) : aplicaMO
        };
        const updated = [...usuarios, newUser];
        persistCache(updated);
        notifyPersonalChange();
        return { success: true, message: `Colaborador ${newUser.nombre} creado con éxito.`, usuario: newUser };
      } catch (err: any) {
        return { success: false, message: handlePostgresError(err) };
      }
    } else {
      const mockId = `usr-${Date.now()}`;
      const newUser: UsuarioTaller = {
        ...(extendedPayload as any),
        id: mockId,
        created_at: new Date().toISOString()
      };
      const updated = [...usuarios, newUser];
      persistCache(updated);
      notifyPersonalChange();
      return { success: true, message: `Colaborador guardado localmente (${newUser.nombre}).`, usuario: newUser };
    }
  };

  // 4. Actualizar Usuario
  const updateUsuario = async (id: string, updates: Partial<UsuarioTallerInput>): Promise<{ success: boolean; message: string }> => {
    const payload: any = { ...updates };
    if (updates.email !== undefined) payload.email = updates.email ? updates.email.trim().toLowerCase() : null;
    if (updates.cedula !== undefined) payload.cedula = updates.cedula ? updates.cedula.trim() : null;
    if (updates.telefono) payload.telefono = updates.telefono.replace(/\D/g, '');
    if (updates.telefono_notificaciones) {
      let notif = updates.telefono_notificaciones.replace(/\D/g, '');
      if (notif.length === 10 && notif.startsWith('3')) notif = `57${notif}`;
      payload.telefono_notificaciones = notif;
    }
    if (updates.costo_hora !== undefined) {
      const ch = Math.max(0, Number(updates.costo_hora) || 0);
      payload.costo_hora = ch;
      payload.costo_minuto = Number((ch / 60).toFixed(2));
    }

    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');

    if (updates.pin_acceso && updates.pin_acceso.trim()) {
      const cleanKey = updates.pin_acceso.trim();
      payload.pin_acceso = cleanKey;
      try {
        const hash = await AuthSecurityService.sha256(cleanKey);
        payload.password_hash = hash;
      } catch {
        // ignore hash error
      }
    }

    const notifyPersonalChange = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wjg:personal-updated'));
      }
      CloudSyncService.broadcastChange('personal', 'upsert');
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const target = usuarios.find(u => u.id === id);
        const applyFilter = (q: any) => {
          if (isUUID(id)) return q.eq('id', id);
          if (target && isUUID(target.id)) return q.eq('id', target.id);
          if (target) return q.ilike('nombre', `%${target.nombre}%`);
          return q.eq('id', id);
        };

        let { error } = await applyFilter(supabase.from('usuarios_taller').update(payload));

        if (error && (error.code === '42703' || error.code === 'PGRST204' || /column/i.test(error.message || ''))) {
          const { area_responsabilidad: _ar, aplica_mano_obra: _amo, ...baseUpdates } = payload;
          const retry = await applyFilter(supabase.from('usuarios_taller').update(baseUpdates));
          error = retry.error;
        }

        if (error) {
          return { success: false, message: handlePostgresError(error) };
        }

        const updated = usuarios.map(u => (u.id === id || (u.nombre && target && u.nombre === target.nombre)) ? { ...u, ...payload } : u);
        persistCache(updated);
        notifyPersonalChange();
        return { success: true, message: 'Datos y tarifa del colaborador actualizados exitosamente.' };
      } catch (err: any) {
        return { success: false, message: handlePostgresError(err) };
      }
    } else {
      const updated = usuarios.map(u => u.id === id ? { ...u, ...payload } : u);
      persistCache(updated);
      notifyPersonalChange();
      return { success: true, message: 'Colaborador actualizado localmente.' };
    }
  };

  // 4.1 Eliminar Colaborador (Estado React + Cache local + Supabase)
  const deleteUsuario = async (id: string): Promise<{ success: boolean; message: string }> => {
    const target = usuarios.find(u => u.id === id);
    if (!target) return { success: false, message: 'Colaborador no encontrado.' };
    if (usuarios.filter(u => u.activo).length <= 1 && target.activo) {
      return { success: false, message: 'Debe permanecer al menos un colaborador activo en el sistema.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let q = supabase.from('usuarios_taller').delete();
        q = isUUID ? q.eq('id', id) : q.ilike('nombre', `%${target.nombre}%`);
        const { error } = await q;
        if (error) {
          return { success: false, message: error.message };
        }
      } catch (err: any) {
        return { success: false, message: err?.message || 'Error eliminando en Supabase.' };
      }
    }

    const updated = usuarios.filter(u => u.id !== id);
    persistCache(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wjg:personal-updated'));
    }
    CloudSyncService.broadcastChange('personal', 'delete');
    return { success: true, message: `Colaborador "${target.nombre}" eliminado definitivamente.` };
  };

  // 5. Toggle Kill Switch (Activo / Inactivo)
  const toggleActivo = async (id: string, nuevoEstado: boolean): Promise<boolean> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('usuarios_taller')
          .update({ activo: nuevoEstado })
          .eq('id', id);

        if (error) {
          toast.error(error.message);
          return false;
        }
      } catch {
        // fallback local
      }
    }

    const updated = usuarios.map(u => u.id === id ? { ...u, activo: nuevoEstado } : u);
    persistCache(updated);
    toast.info(nuevoEstado ? 'Acceso operativo reactivado' : 'Acceso operativo suspendido (Kill Switch)');
    return true;
  };

  // 6. Cambio de Clave / PIN dentro de la App (Permite PIN numérico o Contraseña Compleja)
  const cambiarPin = async (id: string, pinActual: string, pinNuevo: string): Promise<{ success: boolean; message: string }> => {
    const cleanNuevo = (pinNuevo || '').trim();
    const cleanActual = (pinActual || '').trim();

    if (!cleanNuevo || cleanNuevo.length < 4) {
      return { success: false, message: 'La nueva contraseña o PIN debe tener al menos 4 caracteres.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const newHash = await AuthSecurityService.sha256(cleanNuevo);
        const actualHash = await AuthSecurityService.sha256(cleanActual);

        // Intento 1: RPC fn_cambiar_pin_usuario si está disponible
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('fn_cambiar_pin_usuario', {
            p_usuario_id: id,
            p_pin_actual: cleanActual,
            p_pin_nuevo: cleanNuevo,
            p_es_recuperacion: false
          });

          if (!rpcErr && rpcRes && rpcRes.success) {
            await fetchUsuarios();
            return { success: true, message: rpcRes.message || '¡Clave actualizada con éxito!' };
          }
        } catch {
          // continuar a fallback directo
        }

        // Intento 2: Fallback directo a UPDATE con verificación exhaustiva
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
        const target = usuarios.find(u => u.id === id || (u.nombre && u.nombre.toLowerCase() === id.toLowerCase()));
        if (target) {
          const isActualValid = (target.pin_acceso && target.pin_acceso === cleanActual) ||
                                (target.password_hash && target.password_hash === actualHash) ||
                                (target.pin_hash && target.pin_hash === actualHash) ||
                                (await AuthSecurityService.verifyEmergencyPin(cleanActual));

          if (!isActualValid) {
            return { success: false, message: 'La clave o PIN actual no coincide.' };
          }
        }

        const updateData: Record<string, any> = {
          pin_acceso: cleanNuevo,
          password_hash: newHash,
          must_change_password: false,
          updated_at: new Date().toISOString()
        };

        let query = supabase.from('usuarios_taller').update(updateData);
        if (isUUID(id)) {
          query = query.eq('id', id);
        } else if (target && isUUID(target.id)) {
          query = query.eq('id', target.id);
        } else if (target) {
          query = query.ilike('nombre', `%${target.nombre}%`);
        } else {
          query = query.eq('id', id);
        }

        const { error: updErr } = await query;

        if (updErr) return { success: false, message: updErr.message };

        await fetchUsuarios();
        return { success: true, message: '¡Clave de acceso o PIN actualizado con éxito!' };
      } catch (err: any) {
        return { success: false, message: err.message || 'Error al cambiar clave o PIN.' };
      }
    } else {
      // Modo Local Offline
      const newHash = await AuthSecurityService.sha256(cleanNuevo);
      const updated = usuarios.map(u => u.id === id ? { ...u, pin_acceso: cleanNuevo, password_hash: newHash, pin_hash: newHash } : u);
      persistCache(updated);
      return { success: true, message: 'Clave de acceso actualizada en almacenamiento local.' };
    }
  };

  // 7. Recuperación de Clave / PIN desde Login (Cédula + Teléfono)
  const recuperarPin = async (cedula: string, telefono: string, pinNuevo: string): Promise<{ success: boolean; message: string }> => {
    const cleanNuevo = (pinNuevo || '').trim();
    if (!cleanNuevo || cleanNuevo.length < 4) {
      return { success: false, message: 'La nueva clave o PIN debe tener al menos 4 caracteres.' };
    }

    const cleanCedula = cedula.trim();
    const cleanPhone = telefono.replace(/\D/g, '');

    if (isSupabaseConfigured && supabase) {
      try {
        const newHash = await AuthSecurityService.sha256(cleanNuevo);

        // Intento 1: RPC fn_cambiar_pin_usuario
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('fn_cambiar_pin_usuario', {
            p_es_recuperacion: true,
            p_cedula_verificacion: cleanCedula,
            p_telefono_verificacion: cleanPhone,
            p_pin_nuevo: cleanNuevo
          });

          if (!rpcErr && rpcRes && rpcRes.success) {
            await fetchUsuarios();
            return { success: true, message: rpcRes.message || '¡Clave restablecida con éxito!' };
          }
        } catch {
          // continuar a fallback directo
        }

        // Intento 2: Fallback directo consultando cédula y teléfono
        const { data: users, error: qErr } = await supabase
          .from('usuarios_taller')
          .select('*')
          .eq('cedula', cleanCedula);

        if (qErr || !users || users.length === 0) {
          return { success: false, message: 'Documento de cédula no encontrado en el sistema.' };
        }

        const match = users.find(u => {
          const p1 = (u.telefono || '').replace(/\D/g, '');
          const p2 = (u.telefono_notificaciones || '').replace(/\D/g, '');
          return (p1.length >= 7 && p1.includes(cleanPhone)) || 
                 (p2.length >= 7 && p2.includes(cleanPhone)) ||
                 (cleanPhone.length >= 7 && (cleanPhone.includes(p1) || cleanPhone.includes(p2)));
        });

        if (!match) {
          return { success: false, message: 'El número de teléfono no coincide con la cédula registrada.' };
        }

        const { error: updErr } = await supabase
          .from('usuarios_taller')
          .update({
            pin_acceso: cleanNuevo,
            password_hash: newHash,
            pin_hash: newHash,
            must_change_password: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', match.id);

        if (updErr) return { success: false, message: updErr.message };

        await fetchUsuarios();
        return { success: true, message: `¡Clave de acceso restablecida con éxito para ${match.nombre}!` };
      } catch (err: any) {
        return { success: false, message: err.message || 'Error recuperando clave.' };
      }
    } else {
      // Local fallback
      const target = usuarios.find(u => (u.cedula || '').trim() === cleanCedula);
      if (!target) return { success: false, message: 'Cédula no registrada localmente.' };

      const newHash = await AuthSecurityService.sha256(cleanNuevo);
      const updated = usuarios.map(u => u.id === target.id ? { ...u, pin_acceso: cleanNuevo, password_hash: newHash, pin_hash: newHash } : u);
      persistCache(updated);
      return { success: true, message: `Clave restablecida localmente para ${target.nombre}.` };
    }
  };

  const marcarDispositivoSeguro = async (usuarioId: string, fingerprint: string) => {
    const ok = await AuthSecurityService.toggleDeviceTrust(usuarioId, fingerprint, true);
    if (ok) {
      toast.success('Dispositivo marcado como seguro y de confianza.');
      await fetchUsuarios();
    } else {
      toast.error('No se pudo actualizar el estado de confianza del dispositivo.');
    }
    return ok;
  };

  const revocarDispositivoSeguro = async (usuarioId: string, fingerprint: string) => {
    const ok = await AuthSecurityService.toggleDeviceTrust(usuarioId, fingerprint, false);
    if (ok) {
      toast.warning('Dispositivo revocado. Requerirá nueva verificación.');
      await fetchUsuarios();
    } else {
      toast.error('No se pudo revocar el dispositivo.');
    }
    return ok;
  };

  return {
    usuarios,
    isLoading,
    isError,
    errorMessage,
    fetchUsuarios,
    verificarDuplicado,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    toggleActivo,
    cambiarPin,
    recuperarPin,
    marcarDispositivoSeguro,
    revocarDispositivoSeguro
  };
}
