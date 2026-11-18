---
name: awesome-design-md
description: Estándar VoltAgent/awesome-design-md para mantener e implementar el sistema de diseño oficial de WJGEEKS 3D PRO documentado en DESIGN.md en la raíz del proyecto. Consultar siempre antes de crear o modificar componentes visuales, modales, dashboards o flujos de cotización y POS.
---

# Awesome DESIGN.md Standard — WJGEEKS 3D PRO

Este proyecto adopta el estándar **VoltAgent/awesome-design-md**, centralizando la fuente de verdad visual y de tokens en `d:\WJG\DESIGN.md`.

## Flujo Obligatorio para Agentes de Diseño/Código

1. **Lectura previa obligatoria:** Antes de diseñar o refactorizar cualquier pantalla, card, modal, tabla o componente PDF en `src/`, leer `d:\WJG\DESIGN.md` junto con `d:\WJG\.agents\skills\ui-ux-pro-max\SKILL.md`.
2. **Alineación estricta de tokens:** Usar los tokens CSS y valores de color/elevación/tipografía declarados en `d:\WJG\DESIGN.md` y `src/index.css` (nunca inventar paletas paralelas ni fuentes externas no autorizadas).
3. **Paridad multi-tecnología (SLA / FDM / Láser / CNC / POS):** Mantener consistencia estructural entre vistas hermanas (ej. que el selector de tiempo en minutos SLA y su banner de desglose 3DPCC espejen la claridad de FDM).
4. **Actualización viva:** Si un cambio aprobado introduce un nuevo patrón de componente (ej. modal de corrección de pagos en 3 estados o nuevo indicador de estado), actualizar `d:\WJG\DESIGN.md` para mantener sincronizada la documentación de diseño en Git.

