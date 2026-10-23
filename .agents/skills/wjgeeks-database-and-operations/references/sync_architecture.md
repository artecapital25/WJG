# Arquitectura de Sincronización — WJGEEKS 3D

## 1. Principio Single Source of Truth
WJGEEKS 3D utiliza un patrón híbrido:
1. **Lectura local inmediata (Offline-First)**: Los componentes React montan inicialmente leyendo de `StorageService` (`localStorage`) para renderizado instantáneo sin pantallas en blanco (<10ms).
2. **Hidratación desde la Nube (Supabase)**: En [src/App.tsx](file:///d:/WJG/src/App.tsx#L274), `syncCloudData` ejecuta en segundo plano un `Promise.all` para traer los datos más recientes de Supabase y actualizar tanto el estado de React como el `localStorage`.
3. **Escucha Reactiva (Realtime)**: Un WebSocket abierto a Supabase (`wjgeeks_live_sync`) escucha eventos `INSERT`, `UPDATE`, `DELETE` en las tablas clave y sincroniza en caliente todos los navegadores y dispositivos móviles conectados.

---

## 2. Mapa del Flujo de Datos

```
[Usuario realiza acción]
         │
         ▼
[Actualizar Estado React (setProductosStock, etc.)]
         │
         ├──► [StorageService.save...() (localStorage local)]
         │
         └──► [CloudSyncService.save...() (Supabase Postgres)]
                     │
                     ▼
             [Supabase Realtime Channel]
                     │
                     ▼ (Broadcast WebSocket)
      [Demás Dispositivos / Operadores Taller]
                     │
                     ▼
             [fetchFreshData() -> setEstado React]
```

---

## 3. Checklist para Nuevas Tablas o Entidades
Cuando se agregue un nuevo módulo o tabla a Supabase:
- [ ] Definir el tipo TypeScript en `src/types/`.
- [ ] Implementar `fetchEntidad` y `saveEntidad` en `src/services/cloudSyncService.ts`.
- [ ] Implementar `getEntidad` y `saveEntidad` en `src/services/storageService.ts`.
- [ ] Agregar la carga en `syncCloudData` en `src/App.tsx`.
- [ ] Agregar el evento en `subscribeRealtime` en `cloudSyncService.ts`.
- [ ] Normalizar categorías o textos clave (evitar fallos por mayúsculas/minúsculas).
