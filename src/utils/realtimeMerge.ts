/**
 * Utilidad pura para fusionar datos oficiales de Supabase (fuente única de verdad)
 * con mutaciones locales recientes o pendientes en la cola offline Outbox.
 *
 * Regla clave:
 * - Si un registro existía en `prev` pero ya NO viene en `fresh` de Supabase,
 *   NO se resucita a menos que esté protegido por una mutación reciente sin subir
 *   o pendiente en Outbox. Así, las eliminaciones hechas en un dispositivo se
 *   reflejan de inmediato en todos los demás.
 */
export function mergeRemoteWithLocalEntities<T>(params: {
  fresh: T[];
  prev: T[];
  getKeys: (item: T) => Array<string | undefined | null>;
  isInOutbox: (item: T) => boolean;
  getRecentLocal: (item: T) => T | null;
  sortFn?: (a: T, b: T) => number;
}): T[] {
  const { fresh, prev, getKeys, isInOutbox, getRecentLocal, sortFn } = params;

  const extractPrimaryKey = (item: T): string => {
    const keys = getKeys(item).filter((k): k is string => Boolean(k && String(k).trim()));
    return keys[0] || '';
  };

  const mergedMap = new Map<string, T>();
  const seenKeys = new Set<string>();

  const registerKeys = (item: T) => {
    getKeys(item).forEach(k => {
      if (k && String(k).trim()) seenKeys.add(String(k));
    });
  };

  // 1. Supabase manda como SSOT (respetando mutación local más reciente dentro de ventana de gracia)
  for (const remoteItem of fresh) {
    const recentLocal = getRecentLocal(remoteItem);
    const chosen = recentLocal || remoteItem;
    const pk = extractPrimaryKey(chosen);
    if (pk) mergedMap.set(pk, chosen);
    registerKeys(chosen);
  }

  // 2. Preservar únicamente ítems locales que aún no existen en remoto y tienen respaldo Outbox o mutación reciente
  for (const localItem of prev) {
    const keys = getKeys(localItem).filter((k): k is string => Boolean(k && String(k).trim()));
    const alreadyExists = keys.some(k => seenKeys.has(k));
    if (alreadyExists) continue;

    const recentLocal = getRecentLocal(localItem);
    if (recentLocal || isInOutbox(localItem)) {
      const chosen = recentLocal || localItem;
      const pk = extractPrimaryKey(chosen);
      if (pk) mergedMap.set(pk, chosen);
      registerKeys(chosen);
    }
  }

  const result = Array.from(mergedMap.values());
  if (sortFn) {
    result.sort(sortFn);
  }
  return result;
}
