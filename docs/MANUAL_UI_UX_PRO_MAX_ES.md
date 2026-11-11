# Manual de Uso en Español: Skill `ui-ux-pro-max` en Google Antigravity

Este manual explica cómo utilizar la skill **UI/UX Pro Max** instalada en tu configuración global (`C:\Users\germa\.gemini\config\skills\ui-ux-pro-max\`) y en el proyecto **WJGEEKS 3D PRO** (`d:\WJG\.agents\skills\ui-ux-pro-max\`).

---

## 1. ¿Qué es `ui-ux-pro-max` y dónde quedó instalada?

`ui-ux-pro-max` es un motor de inteligencia de diseño que le enseña al asistente de IA a diseñar interfaces de nivel profesional (Mobile-First, ergonómicas, con jerarquía visual real y paleta de marca consistente) sin afectar tu código de negocio ni tu base de datos en Supabase.

### Ubicaciones Instaladas:
1. **Global (Disponible en todos tus proyectos de Antigravity):**
   - Instrucciones Maestras: `C:\Users\germa\.gemini\config\skills\ui-ux-pro-max\SKILL.md`
   - Motor de Búsqueda Local: `C:\Users\germa\.gemini\config\skills\ui-ux-pro-max\scripts\search.py`
   - Este Manual: `C:\Users\germa\.gemini\config\skills\ui-ux-pro-max\MANUAL_USO_ESPANOL.md`
2. **Proyecto WJGEEKS 3D PRO (Respaldado en tu repositorio):**
   - Skill del Proyecto: [SKILL.md](file:///d:/WJG/.agents/skills/ui-ux-pro-max/SKILL.md)
   - Motor Python Local: [search.py](file:///d:/WJG/.agents/skills/ui-ux-pro-max/scripts/search.py)
   - Copia del Manual: [MANUAL_UI_UX_PRO_MAX_ES.md](file:///d:/WJG/docs/MANUAL_UI_UX_PRO_MAX_ES.md)

---

## 2. ¿Cómo Invocarla desde el Chat con Antigravity?

No necesitas escribir comandos complicados. Antigravity detecta la skill automáticamente cuando hablas de diseño, o puedes invocarla explícitamente mencionando **`ui-ux-pro-max`**.

### Ejemplos de Prompts Listos para Usar (Copiar y Pegar):

#### A. Para Rediseñar un Módulo Completo (Enfoque Celular / Taller)
> *"Usando la skill `ui-ux-pro-max`, mejora la interfaz móvil del módulo de **Kanban de Órdenes de Trabajo** para que se maneje con una sola mano en el celular, aplicando los colores del logo WJGEEKS y manteniendo el 100% de la lógica actual."*

#### B. Para Mejorar Formularios Largos en Móvil (Ej. Cotizador 3D o Catálogos)
> *"Aplica `ui-ux-pro-max` (dominio `mobile` y `ux`) sobre el formulario del Cotizador para agrupar los campos en tarjetas limpias, con botones táctiles de 48px y sin que el teclado del celular tape los totales."*

#### C. Para Tablas Contables y Cuentas de Cobro en Celular
> *"Con `ui-ux-pro-max`, transforma la vista móvil de Cuentas de Cobro y Balance Financiero en tarjetas tipo Bento Grid con indicadores claros de pagado/pendiente y botones directos de abono y WhatsApp."*

#### D. Para Crear una Comparativa "Antes y Después" Antes de Modificar Código
> *"Usa `ui-ux-pro-max` para mostrarme una vista previa del Antes y Después de la pantalla de Stock antes de aplicar los cambios en el código."*

---

## 3. Cómo Usar el Motor de Búsqueda por Terminal (Opcional)

La skill incluye un script en Python (`search.py`) que no requiere instalar librerías externas. El agente lo ejecuta automáticamente, pero tú también puedes probarlo en la terminal si deseas consultar reglas de diseño:

```powershell
# Buscar reglas de diseño para móviles y taller
python "d:\WJG\.agents\skills\ui-ux-pro-max\scripts\search.py" "movil taller botones" --domain mobile

# Consultar el sistema de colores oficial de WJGEEKS 3D PRO
python "d:\WJG\.agents\skills\ui-ux-pro-max\scripts\search.py" "wjgeeks logo" --domain colors

# Consultar estilos de tarjetas y dashboards financieros
python "d:\WJG\.agents\skills\ui-ux-pro-max\scripts\search.py" "bento finanzas" --domain styles
```

### Dominios Disponibles en `--domain`:
| Dominio | Qué contiene |
| :--- | :--- |
| `all` | Busca en todas las categorías al mismo tiempo. |
| `mobile` | Reglas para uso en celular (Touch targets de 44-48px, zona del pulgar, anti-zoom en inputs). |
| `colors` | Paleta oficial extraída del logo WJGEEKS (`#1b62b1`, `#292a2f`, `#38bdf8`, `#ffffff`) y colores semánticos. |
| `styles` | Estilos visuales (*Tactile Industrial Dark*, *Bento Grid Operativo*, *Layered Glassmorphism*). |
| `typography` | Jerarquía tipográfica con `Outfit` (títulos y cifras) + `Inter` (lectura rápida) + `tabular-nums`. |
| `charts` | Guías para barras de progreso, KPIs financieros y métricas en pantallas pequeñas. |
| `ux` | Leyes de usabilidad (Fitts, Hick, Von Restorff) para evitar toques accidentales en taller. |
| `react` | Reglas de oro para refactorizar CSS/JSX sin tocar hooks ni Supabase. |

---

## 4. Sistema de Identidad de Marca WJGEEKS 3D PRO Integrado

La skill ya tiene memorizados los colores reales de tu logo vectorial ([wjg_logo_vector.svg](file:///d:/WJG/public/wjg_logo_vector.svg)):

1. **Azul Cobalto Extrusor (`#1b62b1` / `#2577d0`):** Representa el extrusor 3D, las varillas y el dinamismo de pintura del logo. Se usa en botones de acción principal, cabeceras activas y realces de marca.
2. **Grafito Pincel (`#292a2f` / `#131c2e`):** Representa la solidez de las letras **W** y **G**. Se usa en la estructura de tarjetas, bordes industriales y superficies elevadas.
3. **Cian Filamento (`#38bdf8`):** Acento luminoso para indicar qué pestaña, filtro o tarjeta está seleccionada en el celular bajo cualquier condición de luz en el taller.
4. **Blanco Insignia (`#ffffff` / `#f8fafc`):** Garantiza lectura instantánea en montos de dinero, gramos de resina/filamento y nombres de clientes.
