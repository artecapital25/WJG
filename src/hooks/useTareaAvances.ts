import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { TareaAvance, TareaAvanceInput } from '../types/tasks';
import { toast } from '../components/ui/ToastProvider';

const CACHE_PREFIX = 'wjg_tarea_avances_';
const CONTEOS_CACHE_KEY = 'wjg_tarea_avances_conteos';

// Validador estricto de formato UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function useTareaAvances(activeTareaId?: string) {
  const [avances, setAvances] = useState<TareaAvance[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CONTEOS_CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {};
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Cargar avances en caché local para respuesta inmediata
  const cargarDeCache = useCallback((tareaId: string): TareaAvance[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${tareaId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }, []);

  // Guardar en caché local
  const guardarEnCache = useCallback((tareaId: string, items: TareaAvance[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${CACHE_PREFIX}${tareaId}`, JSON.stringify(items));
    } catch {}
  }, []);

  // 1. Obtener avances de una tarea específica ordenados por fecha descendente
  const getAvances = useCallback(async (tareaId: string): Promise<TareaAvance[]> => {
    if (!tareaId) return [];

    // Carga optimista desde caché
    const cached = cargarDeCache(tareaId);
    if (cached.length > 0) {
      setAvances(cached);
    }

    if (!isSupabaseConfigured || !supabase) {
      return cached;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tarea_avances')
        .select('id, tarea_id, usuario_id, usuario_nombre, nota_avance, porcentaje_avance, created_at')
        .eq('tarea_id', tareaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error al consultar tarea_avances:', error.message);
        return cached;
      }

      const listaMapeada: TareaAvance[] = (data || []).map((row: any) => ({
        id: row.id,
        tarea_id: row.tarea_id,
        usuario_id: row.usuario_id || undefined,
        usuario_nombre: row.usuario_nombre,
        nota_avance: row.nota_avance,
        porcentaje_avance: typeof row.porcentaje_avance === 'number' ? row.porcentaje_avance : undefined,
        created_at: row.created_at
      }));

      setAvances(listaMapeada);
      guardarEnCache(tareaId, listaMapeada);

      // Actualizar conteo de esta tarea
      setConteos(prev => {
        const updated = { ...prev, [tareaId]: listaMapeada.length };
        try { localStorage.setItem(CONTEOS_CACHE_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });

      return listaMapeada;
    } catch (err) {
      console.warn('Excepción al consultar tarea_avances:', err);
      return cached;
    } finally {
      setIsLoading(false);
    }
  }, [cargarDeCache, guardarEnCache]);

  // 2. Obtener conteo de notas para todas las tareas (para badges en las tarjetas)
  const refreshConteos = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('tarea_avances')
        .select('tarea_id');

      if (error) {
        console.warn('Error al traer conteo de avances:', error.message);
        return;
      }

      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        counts[row.tarea_id] = (counts[row.tarea_id] || 0) + 1;
      });

      setConteos(counts);
      try { localStorage.setItem(CONTEOS_CACHE_KEY, JSON.stringify(counts)); } catch {}
    } catch (e) {
      console.warn('Excepción al calcular conteo de avances:', e);
    }
  }, []);

  // 3. Registrar un nuevo avance atómico en la bitácora
  const agregarAvance = useCallback(async (
    tareaId: string,
    nota: string,
    porcentaje?: number,
    usuario?: { id?: string; nombre: string; rol?: string }
  ): Promise<TareaAvance | null> => {
    const cleanNota = (nota || '').trim();
    if (!tareaId || !cleanNota) {
      toast.warning('La nota de avance no puede estar vacía');
      return null;
    }

    setIsSaving(true);
    const nombreOperador = usuario?.nombre || 'Colaborador WJGEEKS';
    
    // Validar si el usuario_id tiene formato UUID válido
    let validUsuarioId: string | null = null;
    if (usuario?.id && UUID_REGEX.test(usuario.id)) {
      validUsuarioId = usuario.id;
    }

    const nuevoOptimista: TareaAvance = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `avance-${Date.now()}`,
      tarea_id: tareaId,
      usuario_id: validUsuarioId || undefined,
      usuario_nombre: nombreOperador,
      nota_avance: cleanNota,
      porcentaje_avance: typeof porcentaje === 'number' ? Math.max(0, Math.min(100, Math.round(porcentaje))) : undefined,
      created_at: new Date().toISOString()
    };

    // Actualización optimista local
    setAvances(prev => [nuevoOptimista, ...prev]);
    setConteos(prev => {
      const updated = { ...prev, [tareaId]: (prev[tareaId] || 0) + 1 };
      try { localStorage.setItem(CONTEOS_CACHE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (!isSupabaseConfigured || !supabase) {
      setIsSaving(false);
      toast.success('Avance guardado localmente (modo offline)');
      return nuevoOptimista;
    }

    try {
      const payload: Record<string, any> = {
        tarea_id: tareaId,
        usuario_nombre: nombreOperador,
        nota_avance: cleanNota,
        porcentaje_avance: typeof porcentaje === 'number' ? Math.max(0, Math.min(100, Math.round(porcentaje))) : null
      };

      if (validUsuarioId) {
        payload.usuario_id = validUsuarioId;
      }

      const { data, error } = await supabase
        .from('tarea_avances')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Error insertando tarea_avance en Supabase:', error.message);
        toast.error(`Error guardando avance: ${error.message}`);
        return nuevoOptimista;
      }

      const guardadoReal: TareaAvance = {
        id: data.id,
        tarea_id: data.tarea_id,
        usuario_id: data.usuario_id,
        usuario_nombre: data.usuario_nombre,
        nota_avance: data.nota_avance,
        porcentaje_avance: typeof data.porcentaje_avance === 'number' ? data.porcentaje_avance : undefined,
        created_at: data.created_at
      };

      // Sustituir el temporal por el registro persistido con UUID de BD
      setAvances(prev => prev.map(a => a.id === nuevoOptimista.id ? guardadoReal : a));
      toast.success('Avance registrado en la bitácora técnica');
      return guardadoReal;
    } catch (err: any) {
      console.error('Excepción guardando avance:', err);
      toast.warning('Avance conservado en memoria.');
      return nuevoOptimista;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Carga inicial cuando se especifica activeTareaId
  useEffect(() => {
    if (activeTareaId) {
      getAvances(activeTareaId);
    }
  }, [activeTareaId, getAvances]);

  // Cargar conteos globales al montar
  useEffect(() => {
    refreshConteos();
  }, [refreshConteos]);

  // Suscripción Realtime a cambios en tarea_avances (con canal único por instancia)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channelId = `tarea_avances_${activeTareaId || 'global'}_${Math.random().toString(36).substring(2, 7)}_${Date.now()}`;
    const channel = supabase.channel(channelId);

    try {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tarea_avances' }, (payload) => {
          refreshConteos();
          if (activeTareaId) {
            const recTareaId = (payload.new as any)?.tarea_id || (payload.old as any)?.tarea_id;
            if (recTareaId === activeTareaId) {
              getAvances(activeTareaId);
            }
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('Error al suscribir canal realtime de tarea_avances:', err);
    }

    return () => {
      try {
        supabase?.removeChannel(channel);
      } catch (e) {
        console.warn('Error al remover canal realtime de tarea_avances:', e);
      }
    };
  }, [activeTareaId, getAvances, refreshConteos]);

  return {
    avances,
    conteos,
    isLoading,
    isSaving,
    getAvances,
    agregarAvance,
    refreshConteos
  };
}
