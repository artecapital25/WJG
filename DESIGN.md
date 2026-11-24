# DESIGN.md — WJGEEKS 3D PRO

Sistema de diseño oficial del taller y plataforma de gestión **WJGEEKS 3D PRO** (formato inspirado en **VoltAgent/awesome-design-md**). Define la dirección visual, tokens de color, jerarquía tipográfica, elevación glassmorphism y reglas de componentes UI para escritorio y móvil.

---

## 1. Visual Theme & Atmosphere
- **Personalidad:** *Cyber-Tech Industrial Dark Mode* de precisión técnica. Diseñado para uso diario en taller 3D (cotización SLA/FDM/Láser/CNC, visor STL WebGL, POS Express y control financiero en tiempo real), priorizando alta legibilidad, fatiga visual mínima y visibilidad inmediata de alertas de pago y producción.
- **Principio 90/10:** 90% superficies pizarra oscuras con profundidad por capas y transparencia sutil; 10% acentos de marca azul/cyan y semántica financiera de alto contraste.

---

## 2. Color Palette & Surface Elevation

### Superficies y Elevación (`src/index.css`)
| Rol | Token / Valor | Uso Principal |
| :--- | :--- | :--- |
| Fondo Principal (Nivel 0) | `#070a10` (`--bg-main`) | Canvas global de la aplicación |
| Superficie Elevada (Nivel 1) | `#0d131f` | Contenedores, tablas, barras laterales |
| Superficie Tarjeta Glass (Nivel 2) | `#131c2e` | Tarjetas `.glass-card` y modales |
| Superficie Activa / Hover (Nivel 3) | `#19253d` | Filas activas, selectores e inputs en foco |
| Borde Glass Sutil | `rgba(255, 255, 255, 0.08)` | Delimitación limpia sin ruido visual |

### Marca y Acentos
| Rol | Valor Hex | Uso |
| :--- | :--- | :--- |
| Azul Institucional (Primary) | `#1b62b1` | Botones primarios, encabezados activos |
| Azul Acento (Interactive) | `#2577d0` | Estados hover, enlaces destacados |
| Cyan Técnico (Highlight) | `#38bdf8` (`--brand-cyan`) | SLA/FDM highlights, KPIs, botones `.btn-cyan` |
| Gris Corporativo | `#292a2f` | Superficies neutras y documentos PDF |

### Semántica Operativa y Financiera
| Estado / Significado | Valor Hex | Aplicación |
| :--- | :--- | :--- |
| Pagado Total / Aprobado / Éxito | `#10b981` | Badges pagado 100%, confirmaciones |
| Abono Parcial / Advertencia / Reversión | `#f59e0b` (`#fbbf24`) | Abonos parciales, alertas de saldo/edición |
| Producción / Proceso Especial / STL | `#8b5cf6` | Estados técnicos, taller y visor 3D |
| Pendiente Crítico / Vencido / Peligro | `#ef4444` | Saldo vencido, eliminación, estado $0 |

---

## 3. Typography & Numeric Hierarchy
- **Display & Títulos / KPIs:** `'Outfit', sans-serif` (pesos `700–800`), optimizada para escaneo rápido de precios COP, totales y números de orden (`#COT`, `#POS`, `#OT`).
- **UI, Tablas y Formularios:** `'Inter', sans-serif` (pesos `400–600`), alta claridad en etiquetas pequeñas (`0.72rem–0.85rem`).
- **Formato Monetario:** Pesos colombianos (`COP`) con `toLocaleString('es-CO')` (ej. `$80.000 COP`).
- **Inputs Móviles:** Tamaño mínimo `16px` en viewports móviles (`<= 768px`) para evitar zoom automático de navegadores iOS/Android.

---

## 4. Layout Rhythm, Components & Patterns

### Cards y Bento Grid (`.glass-card`)
- Padding interno estándar `16px–24px`, esquinas redondeadas `12px–16px`, backdrop blur moderado (`6px–12px` en modales y tarjetas principales).
- **Banners de Desglose 3DPCC (SLA y FDM):** Bloque informativo en tinte cyan translúcido (`rgba(56, 189, 248, 0.08)`, borde `rgba(56, 189, 248, 0.2)`) que muestra en tiempo real duración (`Xh Ym — Z min`) y costos de material, energía, repuestos (FEP/LCD o Boquilla/PEI) y lavado/curado UV.

### Header Superior Limpio y Layout Global (Regla Permanente)
- **Cero elementos flotantes invasivos en el Header:** La barra superior (`HeaderMinimal`) debe permanecer ultra-limpia y despejada (`min-height: calc(56px + env(safe-area-inset-top))`, `padding: 0 14px` en móvil, `0 18px` en escritorio):
  - **Izquierda:** Logotipo oficial `WJGEEKS` (ocultando el badge `3D PRO` en `<= 640px`) con punto de estado discreto (`header-status-dot`: verde online / ámbar local).
  - **Derecha:** Únicamente el botón del operador (`header-user-badge`) mostrando primer nombre compacto en móvil (`shortDisplayName`), contador numérico de alertas (`dailyAlertsCount`) y flecha para el menú desplegable (nombre completo dentro del encabezado del menú).
  - **Menú del Operador (`header-operator-menu`):** Homologado al estilo de desplegable POS (`#0b1329`, borde `rgba(56, 189, 248, 0.45)`, sombra profunda, ítems táctiles `>= 44px`).
  - **Reconexión de servicios externos (WhatsApp / Drive / Supabase):** Prohibido colocar píldoras o botones flotantes externos en la cabecera. La vinculación y el estado QR se ubican dentro del menú del operador (*"WhatsApp y Correo"*) y de forma reactiva en el modal de confirmación de envío ante errores `503`.
- **Subpestañas Contextuales (`HubNavigationController` / `.hub-subtabs-bar`):** Botones tipo píldora deslizables con `min-height: 42px`, gradiente activo cobalt-blue y contraste alto sobre fondo translúcido blur(12px).

### Desplegable Único Reutilizable (`WjgSelect`)
- **Prohibido usar `<select>` nativos del navegador:** Todos los selectores de formularios, filtros y modales deben usar `src/components/ui/WjgSelect.tsx`.
- **Estilo oficial (paridad Clientes POS):** Popover en `#0b1329`, borde `1px solid rgba(56, 189, 248, 0.45)`, sombra `0 12px 28px rgba(0,0,0,0.65)`, filas táctiles `>= 42px` con título + subtítulo/badge opcional y resaltado activo `rgba(56, 189, 248, 0.16)`.
- **Portal + Posicionamiento Inteligente:** Renderizado en `document.body` (`z-index: 100000`) con volteo automático hacia arriba/abajo para nunca cortarse dentro de modales con scroll.
- **Búsqueda Automática:** Activa barra de búsqueda interna (`font-size: 16px` en móvil para evitar auto-zoom) cuando la lista supera `6` opciones (`options.length > 6`), y abre directo sin buscador en listas cortas (`<= 6`).

### Ergonomía de Botones y Modales
- **Targets Táctiles:** Controles primarios y segmentadores con altura mínima `42px–44px` en móvil (`.btn-sm` mínimo `40px` en escritorio y `42px` en móvil).
- **Acciones siempre alcanzables:**
  - En **Cotizaciones**, el botón `Modificar` permanece habilitado en todos los estados (`Borrador`, `Enviada`, `Parcial`, `Aceptada`, `Facturada`).
  - En **POS Express**, toda venta muestra el botón `Abonar` (si tiene saldo) o `Cambiar Pago` (si ya está pagada) para corregir pagos o revertir estados de inmediato.
- **Modal de Corrección de Pagos (3 Estados):** Selector directo `Sin Pago ($0)` | `Abono Parcial` | `Pagado 100%`, monto libre acumulado sin bloqueo de múltiplos, selector de método (`Bre-B`, `Nequi`, `Efectivo`, `Transferencia`, `Tarjeta`) y alerta visual ámbar cuando la modificación reduce el abono y ajusta el ledger `abonos_pagos`.

### Regla Estricta para `<input type="number">`
- **Prohibido** colocar atributos `step="500"`, `step="1000"` o `step="5000"` sobre montos financieros: provocan errores nativos HTML5 de validez modular al ingresar valores exactos (ej. `$80.000` con `min="1"` o `$78.500`).
- **Obligatorio:** Usar `min="0" step="any"` (o `min="1" step="any"` en minutos positivos) y permitir borrado limpio (`value === 0 ? '' : value`).

### Patrones Cotizador 2.0 & Consumos Reales de Producción
- **Layout 2 Columnas Sticky (`.cotizador-two-col-layout` + `.cotizador-sticky-sidebar`):** En escritorio (`>= 1024px`), el formulario ocupa `60%` a la izquierda y el resumen financiero permanece visible (`position: sticky`) en `40%` a la derecha; en móvil apila en `1fr` acompañado por una barra flotante fija inferior (`.cotizador-mobile-sticky-bar`) con Costo, Utilidad Neta, Precio Unitario y botón Guardar/Agregar.
- **Píldoras por Apartado (`.section-subtotal-pill`):** Cada tarjeta del cotizador muestra en su cabecera su `Costo` interno y su `Cobro` al cliente en tiempo real, con números tabulares (`tabular-nums`).
- **Switch Dual `Margen Bruto` ⇄ `Markup` (`.modo-margen-switch`) & `🔒 USO INTERNO TALLER`:** Selector comparativo en el Cotizador y en las Cotizaciones para alternar fórmulas (`C / (1 - m)` vs `C × (1 + m)`) junto al panel de rentabilidad interna; ningún dato interno (`costo_total_taller`, `utilidad_neta_estimada`, `modo_margen`, `desglose_apartados`) se exporta a PDF ni WhatsApp del cliente.
- **Trazabilidad de Consumos Reales (`ModalConsumoRealOT`):** En Órdenes de Trabajo, pestañas dedicadas para **Taller / Impresión** y **Pintura / Acabados** comparan consumo estimado vs real, registran consumibles no contemplados (guantes, alcohol IPA, filtros, pinturas) y retroalimentan el banner `RealCostFeedbackBanner` en el cotizador.
- **Suite 3D PRO (`ToolsHubView` + `Suite3DProView`):** 5 calculadoras especializadas integradas con el catálogo del taller (Convertidor Volumen/Peso/COP, Escala 3D $k^3$, Cama Multi-Pieza, Altura de Capa y Envío Volumétrico Colombia) respetando `WjgSelect`, `step="any"` y `tabular-nums`.

---

## 5. Do's & Don'ts
- **DO:** Mantener paridad entre tecnologías (SLA y FDM con campo directo de minutos editable + desglose en vivo).
- **DO:** Conservar comentarios de procesos y feedback inmediato (toasts + indicadores visuales) durante la sincronización Supabase.
- **DON'T:** Usar colores de alto brillo fuera del 10% de acentos semánticos ni ocultar botones de corrección en registros ya cerrados/pagados.

