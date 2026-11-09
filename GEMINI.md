# PROTOCOLO MAESTRO DE INTERACCIÓN Y DESARROLLO — WJGEEKS 3D PRO

Este documento define la regla operativa obligatoria para el asistente de desarrollo al interactuar con el usuario en este proyecto.

---

## 1. REGLA FUNDAMENTAL DE TRATAMIENTO DE SOLICITUDES

Cada vez que el usuario plantee una solicitud, ajuste, nueva función o requerimiento en texto normal:

### Fase 1: Diagnóstico y Enriquecimiento (5 a 6 Preguntas Clave)
* **Prohibido asumir requerimientos ambiguos:** No saltar de inmediato a modificar código o bases de datos sin antes estructurar el problema.
* **Formular de 5 a 6 preguntas estratégicas:** Las preguntas deben cubrir:
  1. **Impacto en Negocio y Flujo de Trabajo:** ¿Cómo interactúan Germán, Juan o Wendy con esta función?
  2. **Arquitectura y Base de Datos (Supabase):** ¿Afecta tablas existentes, requiere nuevas columnas, claves foráneas o políticas RLS?
  3. **Inventario y Bodega:** ¿Afecta stock físico en unidades, gramos de resina o filamento, o consumos auxiliares?
  4. **Experiencia de Usuario (UI/UX Móvil y Escritorio):** ¿Dónde se ubica el botón, tabla o modal, y qué alertas deben mostrarse?
  5. **Contabilidad y Ledger:** ¿Impacta cotizaciones, OTs, cuentas de cobro o libro contable (`abonos_pagos`)?
  6. **Casos Límite y Reglas de Eliminación/Rollback:** ¿Qué pasa al eliminar, editar o cancelar el registro?

### Fase 2: Elaboración del Prompt Maestro y Plan de Implementación (`/plan`)
* Con las respuestas y el análisis consolidado, se debe redactar el **Prompt Técnico de Implementación**.
* Este prompt debe derivar obligatoriamente en un **Plan de Implementación Estructurado** (artefacto o checklist técnico) con:
  - Archivos a modificar y crear.
  - Scripts SQL para Supabase si aplica.
  - Flujo de sincronización bidireccional (`CloudSyncService` + `StorageService`).
  - Pruebas de verificación paso a paso.

### Fase 3: Ejecución e Informe de Entrega Obligatorio
Al culminar cualquier implementación, la respuesta debe contener obligatoriamente:
1. **Lo Realizado:** Detalle minucioso de cada archivo, función y tabla modificada, con enlaces directos clicables.
2. **Lo que Hace Falta:** Tareas pendientes, integraciones futuras o recomendaciones para la siguiente iteración.
3. **Validación en Vivo:** Confirmación explícita de pruebas funcionales y de sincronización en Supabase.

---

## 2. REGLA TÉCNICA DE ELIMINACIÓN Y GESTIÓN DE CATÁLOGOS
* Todos los catálogos (Filamentos, Resinas, Insumos, Máquinas, Personal, Clientes, Proveedores, Tarifas) deben permitir **Crear, Editar y ELIMINAR** registros (incluyendo datos de prueba).
* Ninguna entidad puede quedar bloqueada para borrado. Toda acción de eliminación debe contemplar:
  1. Confirmación de seguridad en la UI.
  2. Eliminación en el estado local de React (`useState`).
  3. Eliminación en la caché local (`StorageService`).
  4. Eliminación en Supabase (`CloudSyncService.delete...`).

