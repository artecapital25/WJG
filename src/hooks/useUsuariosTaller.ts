import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { UsuarioTaller, UsuarioTallerInput } from '../types/usuarios.types';
import { toast } from '../components/ui/ToastProvider';
import { AuthSecurityService } from '../services/authSecurityService';

const LOCAL_STORAGE_USERS_KEY = 'wjg_usuarios_taller_cache';

const DEFAULT_USERS_SEED: UsuarioTaller[] = [
  {
    id: '08c6c49a-0422-414b-813e-8f58fa651bd5',
    nombre: 'Germán',
    rol: 'ADMIN_COBRANZAS',
    telefono: '3503443140',
    telefono_notificaciones: '573503443140',
    email: 'german@wjgeeks.com',
    cedula: '1098765432',
    permisos_areas: ['ventas', 'taller', 'finanzas', 'gestion'],
    pin_acceso: '1234',
    activo: true,
    must_change_password: false
  },
  {
    id: '4485aa21-3896-4510-b693-fc68e947372d',
    nombre: 'Wendy',
    rol: 'PINTURA_ACABADOS',
    telefono: '3204814702',
    telefono_notificaciones: '573204814702',
    email: 'wendy@wjgeeks.com',
    cedula: '1098765433',
    permisos_areas: ['taller', 'gestion'],
    pin_acceso: '1234',
    activo: true,
    must_change_password: false
  },
  {
    id: 'a48df7ca-8b06-4bab-bfa4-3b058912b06f',
    nombre: 'Juan',
    rol: 'IMPRESION_MANTENIMIENTO',
    telefono: '3217273025',
    telefono_notificaciones: '573217273025',
    email: 'juan@wjgeeks.com',
    cedula: '1098765434',
    permisos_areas: ['taller'],
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
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
      const { data, error } = await supabase
        .from('usuarios_taller')
        .select('id, nombre, rol, telefono, telefono_notificaciones, email, cedula, permisos_areas, activo, pin_acceso, password_hash, must_change_password, ultimo_acceso, dispositivo_info, created_at')
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Error consultando usuarios_taller en Supabase:', error.message);
        setIsError(true);
        setErrorMessage(error.message);
        // Si la tabla no está poblada, mantener cache local
        return;
      }

      if (data && data.length > 0) {
        // Normalizar permisos_areas a Array de strings
        const normalized: UsuarioTaller[] = data.map(item => ({
          ...item,
          permisos_areas: Array.isArray(item.permisos_areas) ? item.permisos_areas : ['taller']
        }));
        persistCache(normalized);
      } else {
        // Si data es [] vacía, intentar sembrar Juan, Wendy y Germán automáticamente
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
    // Normalizar teléfonos
    let cleanPhone = input.telefono.replace(/\D/g, '');
    let cleanNotif = (input.telefono_notificaciones || input.telefono).replace(/\D/g, '');
    if (cleanNotif.length === 10 && cleanNotif.startsWith('3')) {
      cleanNotif = `57${cleanNotif}`;
    }

    // Hash SHA-256 inicial para el PIN o Clave Alfanumérica
    const pin = (input.pin_acceso || '1234').trim();
    let pinHash = '';
    try {
      pinHash = await AuthSecurityService.sha256(pin);
    } catch {
      pinHash = '';
    }

    const payload: any = {
      nombre: input.nombre.trim(),
      rol: input.rol,
      telefono: cleanPhone,
      telefono_notificaciones: cleanNotif,
      email: input.email?.trim().toLowerCase() || null,
      cedula: input.cedula?.trim() || null,
      permisos_areas: input.permisos_areas && input.permisos_areas.length > 0 ? input.permisos_areas : ['taller'],
      pin_acceso: pin,
      password_hash: pinHash,
      pin_hash: pinHash,
      activo: input.activo !== undefined ? input.activo : true,
      must_change_password: false
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('usuarios_taller')
          .insert([payload])
          .select()
          .single();

        if (error) {
          const friendlyMsg = handlePostgresError(error);
          return { success: false, message: friendlyMsg };
        }

        const newUser = data as UsuarioTaller;
        const updated = [...usuarios, newUser];
        persistCache(updated);
        return { success: true, message: `Colaborador ${newUser.nombre} creado con éxito.`, usuario: newUser };
      } catch (err: any) {
        return { success: false, message: handlePostgresError(err) };
      }
    } else {
      // Modo Local Offline
      const mockId = `usr-${Date.now()}`;
      const newUser: UsuarioTaller = {
        ...(payload as any),
        id: mockId,
        created_at: new Date().toISOString()
      };
      const updated = [...usuarios, newUser];
      persistCache(updated);
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

    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');

    // Si se especificó una nueva clave o PIN en la edición
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

    if (isSupabaseConfigured && supabase) {
      try {
        const target = usuarios.find(u => u.id === id);
        let query = supabase.from('usuarios_taller').update(payload);
        if (isUUID(id)) {
          query = query.eq('id', id);
        } else if (target && isUUID(target.id)) {
          query = query.eq('id', target.id);
        } else if (target) {
          query = query.ilike('nombre', `%${target.nombre}%`);
        } else {
          query = query.eq('id', id);
        }

        const { error } = await query;

        if (error) {
          return { success: false, message: handlePostgresError(error) };
        }

        const updated = usuarios.map(u => (u.id === id || (u.nombre && target && u.nombre === target.nombre)) ? { ...u, ...payload } : u);
        persistCache(updated);
        return { success: true, message: 'Datos del colaborador actualizados exitosamente.' };
      } catch (err: any) {
        return { success: false, message: handlePostgresError(err) };
      }
    } else {
      const updated = usuarios.map(u => u.id === id ? { ...u, ...payload } : u);
      persistCache(updated);
      return { success: true, message: 'Colaborador actualizado localmente.' };
    }
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

  return {
    usuarios,
    isLoading,
    isError,
    errorMessage,
    fetchUsuarios,
    verificarDuplicado,
    createUsuario,
    updateUsuario,
    toggleActivo,
    cambiarPin,
    recuperarPin
  };
}
