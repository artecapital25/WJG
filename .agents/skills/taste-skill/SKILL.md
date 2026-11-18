---
name: taste-skill
description: Motor de dirección de arte y criterio estético frontend basado en Leonxlnx/taste-skill (design-taste-frontend). Garantiza interfaces de alta factura visual, jerarquía tipográfica clara, disciplina cromática, micro-interacciones con propósito y verificación visual real en lugar de páginas genéricas de IA.
---

# Taste Skill (Design-Taste Frontend) — WJGEEKS 3D PRO

Basado en el repositorio **Leonxlnx/taste-skill**, adaptado al lenguaje visual industrial y taller 3D de **WJGEEKS 3D PRO**.

## 1. Principios de Dirección de Arte (Anti-Slop)
- **Identidad clara, no genérica:** Mantener el carácter de *Taller Tecnológico 3D de Alta Precisión* (Cyber-Tech Industrial Dark Mode), definido en `DESIGN.md` y `src/index.css`. Prohibido mezclar estilos aleatorios (ej. tarjetas blancas brillantes sobre fondo oscuro o degradados neón arcoíris sin jerarquía).
- **Disciplina cromática 90/10:** El 90% de la superficie respira en tonos pizarra profundos (`#070a10`, `#0d131f`, `#131c2e`) con bordes sutiles (`rgba(255,255,255,0.08)`); el 10% restante concentra la atención mediante acentos calibrados (`#38bdf8` cyan técnico, `#1b62b1` azul WJGEEKS) y semántica estricta (verde `#10b981` pagado, ámbar `#f59e0b` parcial/alerta, rojo `#ef4444` saldo vencido/error).
- **Cero relleno visual innecesario:** No agregar badges repetitivos, iconos decorativos sin función ni tarjetas anidadas excesivas que fragmenten la lectura en móvil.

## 2. Jerarquía Tipográfica y Lectura Escaneable
- **Encabezados y KPIs (`Outfit`):** Pesos `700–800`, espaciado compacto, cifras alineadas y legibles de un vistazo en tarjetas de resumen, totales de cotización y saldos POS.
- **Etiquetas y datos operativos (`Inter`):** Etiquetas en `0.72rem–0.8rem` con contraste legible (`--text-muted` / `#94a3b8`), evitando textos diminutos `< 11px` ilegibles en taller.
- **Formato numérico colombiano (COP):** Usar siempre `toLocaleString('es-CO')` en valores monetarios mostrados y separar claramente costo base, abono y saldo pendiente.

## 3. Ritmo Espacial, Bento Grids y Modales Limpios
- **Respiración consistente:** Usar grillas Bento con `gap: 12px–16px` y rellenos internos coherentes (`16px–24px` en tarjetas y modales).
- **Modales accionables en 1 pantalla:** Todo modal (como Gestión/Corrección de Pago POS o Edición de Pieza) debe mantener el contexto clave arriba (cliente, producto, total vs abonado), controles directos en el centro (selector de estado de 3 vías + monto libre + método de pago) y resumen transparente de impacto abajo antes de confirmar.
- **Acciones críticas siempre accesibles:** Nunca ocultar botones importantes (como `Cambiar Pago` en ventas pagadas o `Modificar` en cotizaciones) detrás de restricciones innecesarias que obliguen a rodeos.

## 4. Micro-interacciones con Propósito (GPU-First)
- Animar únicamente propiedades compuestas por GPU (`transform`, `opacity`, `border-color`, `box-shadow` sutil) con transiciones rápidas (`150ms–220ms cubic-bezier(...)`).
- Retroalimentación inmediata ante estados críticos (ej. banner ámbar al detectar una reversión o reducción de abono que impactará `abonos_pagos`, confeti controlado al completar el 100% del pago).

## 5. Verificación Estética y Funcional Obligatoria
Antes de dar por terminada cualquier vista o modal:
1. Contrastar tokens contra `d:\WJG\DESIGN.md`.
2. Verificar en ancho escritorio y ancho móvil (`<= 768px`) que ningún botón se recorte, no haya desbordamiento horizontal y los targets táctiles cumplan `>= 42–44px`.
3. Comprobar que el contraste texto/fondo permita lectura rápida bajo luz de taller y pantalla móvil.

