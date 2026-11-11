---
name: ui-ux-pro-max
description: >-
  Motor de inteligencia de diseño UI/UX Pro Max (basado en nextlevelbuilder/ui-ux-pro-max-skill).
  Proporciona sistemas de diseño completos, 57+ estilos UI, 95+ paletas de color, 56+ combinaciones
  tipográficas, 24 tipos de gráficas, reglas Mobile-First (ergonomía táctil, contraste WCAG AAA,
  micro-interacciones) y patrones de producción para React, TypeScript y Tailwind CSS.
  Activar siempre que el usuario solicite crear, rediseñar, auditar o mejorar interfaces gráficas (UI/UX),
  componentes visuales, dashboards, formularios móviles o sistemas de identidad de marca.
---

# UI/UX Pro Max — Design Intelligence Skill

Esta skill dota al agente de inteligencia de diseño estructurada para construir interfaces de usuario **profesionales, ergonómicas y listas para producción**, evitando los patrones genéricos de IA y priorizando la usabilidad real (especialmente en entornos **Mobile-First** y aplicaciones operativas).

---

## 1. Flujo de Trabajo Obligatorio (Design-First Workflow)

Antes de escribir o modificar cualquier código de interfaz (`tsx`, `jsx`, `css`):

### Paso 1: Análisis de Contexto y Dominio
Identifica las 4 dimensiones de la solicitud:
1. **Tipo de Producto / Módulo:** (Ej. Cotizador 3D, Kanban de Taller, POS Express, Cobranzas, Dashboard Financiero, Catálogo).
2. **Dispositivo Primario:**
   - Si es **Móvil / Operativo en Taller (90%+ uso)**: Aplicar reglas estrictas de **Thumb-Zone (Zona del Pulgar)**, botones de mínimo `44x44px` (`48px` ideal), inputs con `font-size: 16px` mínimo (evita auto-zoom en iOS/Android), tarjetas apilables con jerarquía de 3 niveles (Título/ID -> Métrica/Estado -> Acción Primaria).
   - Si es **Escritorio**: Layout multi-columna, atajos visuales, tablas con cabeceras fijas (`sticky`).
3. **Estilo Visual (UI Style):** Seleccionar de la matriz de estilos (ej. *Tactile Industrial Dark*, *Bento Grid*, *Glassmorphism Sutil*, *High-Contrast Operational*).
4. **Identidad de Marca:** Respetar los tokens oficiales del proyecto antes de inventar colores arbitrarios.

### Paso 2: Consulta al Motor Local de Diseño (`scripts/search.py`)
Puedes consultar la base de conocimiento de `ui-ux-pro-max` ejecutando el motor BM25 local en Python (sin dependencias externas):

```powershell
python "d:\WJG\.agents\skills\ui-ux-pro-max\scripts\search.py" "<consulta>" --domain <dominio>
```

**Dominios disponibles (`--domain`):**
- `all` (por defecto): Busca en toda la base de inteligencia de diseño + genera resumen de Design System.
- `styles`: 57+ estilos arquitectónicos UI (Glassmorphism, Bento Grid, Tactile Dark, Swiss Grid, etc.).
- `colors`: Paletas cromáticas por industria, reglas de contraste sobre modo oscuro/claro y tokens semánticos.
- `typography`: Pares tipográficos (`Outfit` + `Inter`, escalas modulares móviles, pesos y `letter-spacing`).
- `mobile`: Reglas ergonómicas Mobile-First, barra inferior, cabeceras compactas, tarjetas táctiles y formularios sin fricción.
- `charts`: Selección de los 24 tipos de visualización de datos y KPIs financieros/operativos.
- `ux`: Leyes de UX (Ley de Fitts, Ley de Hick, Efecto Von Restorff, estados de carga y feedback inmediato).
- `react`: Patrones limpios de componentes en React + Tailwind / CSS Variables sin romper la lógica de negocio.

---

## 2. Reglas de Oro Mobile-First & Aplicaciones Operativas

### A. Ergonomía Táctil (Ley de Fitts en Móvil)
- **Área táctil mínima:** Todo botón, chip de filtro, pestaña o ícono interactivo debe tener al menos `44px × 44px` de área clicable (`min-height: 44px`).
- **Espaciado entre acciones destructivas y primarias:** Mínimo `12px` de separación entre "Eliminar/Cancelar" y "Guardar/Confirmar" para evitar toques accidentales en taller.
- **Acciones frecuentes al alcance del pulgar:** Navegación principal fija abajo (`BottomNavBar`), filtros rápidos en píldoras deslizables horizontales (`overflow-x: auto`, `scrollbar-width: none`) con indicador claro de selección.

### B. Jerarquía Visual y Contraste en Modo Oscuro (Tactile Dark UI)
- **Prohibido el negro puro plano sin capas:** Usar progresión de elevación por luminosidad:
  - Nivel 0 (Canvas de fondo): `#070a10`
  - Nivel 1 (Superficie de sección / contenedor): `#0d131f`
  - Nivel 2 (Tarjeta interactiva / Card): `#131c2e` con borde sutil `rgba(255, 255, 255, 0.08)` y borde superior de luz especular `rgba(255, 255, 255, 0.12)`.
  - Nivel 3 (Modal / Elemento flotante / Activo): `#19253d` con realce de marca (`#1b62b1` / `#38bdf8`).
- **Contraste de Texto (WCAG AA/AAA):**
  - Texto Primario (Títulos, montos, IDs): `#f8fafc` (Blanco nieve, contraste > 15:1).
  - Texto Secundario (Etiquetas, metadatos): `#94a3b8` (Slate 400, contraste > 6:1).
  - Texto Terciario / Ayuda: `#64748b` (Nunca menor a `#64748b` sobre fondo oscuro).

### C. Formularios y Entrada de Datos en Móvil
- **Cero Auto-Zoom en iOS/Android:** Todos los `<input>`, `<select>` y `<textarea>` deben tener `font-size: 16px` (`1rem`) o superior en viewports móviles.
- **Inputs Numéricos Rápidos:** Usar `inputMode="decimal"` o `inputMode="numeric"` y botones de incremento rápido (`-` / `+`) cuando el operador ajusta cantidades en taller.
- **Feedback Visual Instantáneo:** Estados `:active` con `transform: scale(0.98)` para que el usuario sienta respuesta física al tocar cada botón en pantalla táctil.

---

## 3. Perfil de Marca Integrado: WJGEEKS 3D PRO

Cuando se aplique en el ecosistema **WJGEEKS 3D PRO**, la paleta oficial extraída del logo vectorial (`public/wjg_logo_vector.svg`) es:

- **Azul Cobalto Extrusor (Brand Primary):** `#1b62b1`
- **Azul Eléctrico Táctil (Interactive Primary):** `#2577d0` (botones primarios con gradiente `linear-gradient(135deg, #1b62b1 0%, #2577d0 55%, #0ea5e9 100%)`)
- **Cian Filamento (Brand Accent & Focus):** `#38bdf8`
- **Grafito Pincel (Brand Structural Dark):** `#292a2f`
- **Blanco Insignia (Brand Crisp Light):** `#ffffff`
- **Estados Semánticos:**
  - Éxito / Entregado / Pagado: `#10b981` (Fondo badge: `rgba(16, 185, 129, 0.14)`)
  - Alerta / En Proceso / Pendiente: `#f59e0b` (Fondo badge: `rgba(245, 158, 11, 0.14)`)
  - Urgente / Deuda / Error: `#ef4444` (Fondo badge: `rgba(239, 68, 68, 0.14)`)
  - Post-Procesado / Especial: `#8b5cf6` (Fondo badge: `rgba(139, 92, 246, 0.14)`)

---

## 4. Checklist de Calidad UI/UX Antes de Entregar

- [ ] ¿Se respeta el 100% de la lógica de negocio, props, hooks y sincronización con Supabase?
- [ ] ¿Todos los botones e interactivos miden al menos `44px` de alto en móvil?
- [ ] ¿Los textos e importes monetarios tienen jerarquía clara (`Outfit` para cabeceras/montos, `Inter` para cuerpo, `tabular-nums` para cifras)?
- [ ] ¿Las tablas anchas tienen vista de tarjeta móvil o contenedor desplazable limpio con indicadores visuales?
- [ ] ¿No hay desbordamiento horizontal (`overflow-x`) indeseado en pantallas de `360px` a `430px` de ancho?
