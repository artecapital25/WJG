---
name: modern-web-guidance
description: Guía oficial de estándares web modernos basada en GoogleChrome/modern-web-guidance adaptada para WJGEEKS 3D PRO (React 19 + TypeScript + Vite). Aplica criterios Web Platform Baseline, Core Web Vitals (LCP, INP, CLS), formularios HTML5 nativos sin bloqueos de validación, rendimiento en WebGL/Three.js y accesibilidad progresiva.
---

# Modern Web Guidance — WJGEEKS 3D PRO

Basado en las directrices oficiales de **GoogleChrome/modern-web-guidance** para aplicaciones web modernas de alto rendimiento.

## 1. Estándar Web Platform Baseline & CSS Moderno
- **Priorizar capacidades nativas del navegador (Baseline Widely Available):**
  - Usar variables CSS personalizadas (`--bg-main`, `--brand-cyan`, `--text-main`), `backdrop-filter: blur(...)`, `color-mix()`, `clamp()` para tipografía fluida y Grid/Flexbox modernos con `gap` nativo en lugar de márgenes frágiles o hacks JS.
  - Aprovechar `overflow-y: auto` y `scrollbar-gutter: stable` en modales para evitar saltos de layout horizontal al abrir diálogos.
  - Usar propiedades lógicas y `min-height: 44px` en controles interactivos para ergonomía táctil móvil y escritorio.
- **Compatibilidad HTML / CSS / TS (`webhint` + Baseline):**
  - Usar `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` sin `maximum-scale` ni `user-scalable=no` (el zoom accesible permanece activo; el auto-zoom en inputs móviles se previene con `font-size: 16px` en CSS).
  - Preferir `<meta name="color-scheme" content="dark" />` (Baseline universal) en `index.html` y mantener `theme_color` únicamente en `public/manifest.json` para PWA.
  - Declarar siempre prefijos de proveedor (`-webkit-backdrop-filter`, `-webkit-user-select`) **antes** de la propiedad estándar correspondiente (`backdrop-filter`, `user-select`).
  - Mantener `"forceConsistentCasingInFileNames": true` en `tsconfig.json` para evitar fallos de rutas entre Windows y entornos Linux (Vercel/Render).

## 2. Formularios HTML5 Nativos Sin Trampas de Validación
- **Regla Crítica para Campos Numéricos (`<input type="number">`):**
  - **NUNCA** usar `step="1000"`, `step="5000"`, `step="500"` ni combinaciones `min="1" step="1000"` en campos de dinero (COP), abonos o tiempos manuales. El navegador evalúa validez modular (`value = min + N * step`), bloqueando montos válidos como `$80.000` si `min="1"` o `$78.500` si `step="5000"`.
  - **Estándar obligatorio:** Usar `min="0"` y `step="any"` (o `min="1" step="any"` para minutos mínimos), permitiendo edición libre, borrado completo temporal (`value={val === 0 ? '' : val}`) y redondeo o clamping controlado en el `onSubmit` / lógica de negocio.
- **Móvil y Teclados:** Mantener `font-size >= 16px` en inputs móviles (`@media (max-width: 768px)`) para prevenir el auto-zoom forzado de iOS Safari/Chrome Mobile.

## 3. Core Web Vitals (LCP, INP, CLS)
- **INP (Interaction to Next Paint <= 200 ms):**
  - Evitar bloquear el hilo principal en eventos de clic o escritura (`onChange`). Cálculos costosos o formateos pesados deben memoizarse con `useMemo`.
  - No disparar sincronizaciones completas de red síncronas (`syncCloudData`) dentro de eventos `focus`/`visibilitychange` inmediatamente después de mutaciones locales o apertura de selectores nativos (`<input type="file">`).
  - Usar renderizado bajo demanda (*On-Demand Rendering*) en visores 3D Three.js/WebGL para no saturar GPU/CPU cuando no hay interacción del usuario.
- **LCP (Largest Contentful Paint <= 2.5 s):**
  - Cargar tipografías (`Outfit`, `Inter`) con `display=swap` y evitar hidrataciones que parpadeen o reviertan datos ya mostrados al usuario.
- **CLS (Cumulative Layout Shift <= 0.1):**
  - Reservar dimensiones claras en tarjetas Bento, modales y previsualizaciones de imagen STL para evitar saltos visuales al cargar datos de Supabase.

## 4. Gestión de Estado, Red y Persistencia Local-First
- **Consistencia optimista real:** Toda mutación confirmada por el usuario (cotizaciones, abonos POS Express, estados de OT) debe actualizar estado React + `StorageService` (caché/outbox) + Supabase en un flujo transaccional coherente, protegiendo las ediciones recientes frente a re-fetches tardíos o eventos Realtime eco.
- **Resiliencia ante pérdida de conectividad:** Mantener colas de sincronización pendientes (outbox) para evitar que una reconexión sobrescriba datos aún no confirmados en la nube.

## 5. Checklist Antes de Cerrar Cambios Web
1. Verificar que todo `<input type="number">` monetario o métrico use `step="any"` sin múltiplos artificiales.
2. Confirmar que los botones clave tengan `type="button"` (cuando no envían formularios) y áreas táctiles mínimas de `44x44px` en acciones primarias móviles.
3. Verificar que HTML, CSS y `tsconfig.json` cumplan Baseline y `webhint` (`meta-viewport`, `color-scheme`, orden `-webkit-*`, `forceConsistentCasingInFileNames: true`).
4. Validar compilación estricta TypeScript + Vite (`npm run build`) sin advertencias bloqueantes ni tipos implícitos rotos.

