---
name: wjgeeks-database-and-operations
description: >-
  Guía maestra y procedimientos operativos para la administración de la base de datos Supabase,
  el modelo relacional (órdenes de trabajo, cotizaciones, stock, cuentas de cobro, usuarios, abonos),
  y los procesos internos de sincronización en la aplicación web WJGEEKS 3D PRO.
  Usar cuando se requiera consultar o modificar el esquema de base de datos, corregir flujos de sincronización,
  ejecutar consultas SQL o diagnosticar la consistencia entre el frontend y Supabase.
---

# WJGEEKS 3D: Manejo de Base de Datos y Procesos Operativos Internos

Esta skill contiene el conocimiento técnico, arquitectura y protocolos operativos para el mantenimiento, consulta y extensión del sistema integral de **WJGEEKS 3D PRO v3.1**.

## 1. Arquitectura del Sistema y Principio Fundamental

> **Regla de Oro (Single Source of Truth):**
> La base de datos PostgreSQL en **Supabase** es la única fuente oficial de la verdad.
> El servicio `StorageService` (`localStorage`) opera únicamente como **caché local optimista y soporte offline**.
> Ningún módulo debe depender exclusivamente de `localStorage` para datos compartidos o transaccionales.

### Puntos de Entrada Clave:
- **Cliente Supabase**: [src/services/supabaseClient.ts](file:///d:/WJG/src/services/supabaseClient.ts)
- **Servicio de Nube**: [src/services/cloudSyncService.ts](file:///d:/WJG/src/services/cloudSyncService.ts)
- **Caché Local**: [src/services/storageService.ts](file:///d:/WJG/src/services/storageService.ts)
- **Orquestador Principal**: [src/App.tsx](file:///d:/WJG/src/App.tsx)

---

## 2. Herramientas MCP de Supabase Recomendadas

Cuando interactúes con la base de datos a través del agente, utiliza las herramientas del servidor MCP `supabase`:

| Herramienta | Cuándo Usarla |
| :--- | :--- |
| `list_tables` | Listar todas las tablas y verificar si RLS está activo. |
| `execute_sql` | Consultas analíticas (`SELECT`), verificación de filas o diagnósticos. |
| `apply_migration` | Cambios DDL estructurales (`CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`). |
| `get_advisors` | Auditoría de vulnerabilidades de seguridad y rendimiento en Postgres. |
| `generate_typescript_types` | Generar o refrescar interfaces TypeScript sincronizadas con la DB. |
| `query_logs` | Inspeccionar errores de base de datos, timeouts o fallas en RPCs. |

---

## 3. Catálogo de Tablas Principales

Consulta la referencia técnica completa en [database_schema.md](./references/database_schema.md).

1. **`productos_stock`**: Inventario de figuras, aretes, collares, llaveros y personalizados listos para entrega inmediata.
2. **`cotizaciones` & `cotizacion_items`**: Cálculos de costos, resinas, tiempos de impresión y tarifas.
3. **`ordenes_trabajo` & `historial_estados_ot`**: Seguimiento técnico del ciclo de producción (Taller 3D).
4. **`cuentas_cobro` & `abonos_pagos`**: Libro contable, anticipos y liquidación de saldos.
5. **`ventas_express`**: Venta directa en mostrador o WhatsApp con descuento automático de stock físico.
6. **`usuarios_taller`**: Directorio de colaboradores con PIN, cédula y roles RBAC (Germán, Wendy, Juan).
7. **`tareas_equipo` & `tarea_avances`**: Tablero Kanban y bitácora técnica de avances.
8. **`registro_notificaciones`**: Cola de mensajes asíncronos para WhatsApp (+57 320 2796115).

---

## 4. Protocolo de Sincronización Bidireccional

Consulta la guía detallada en [sync_architecture.md](./references/sync_architecture.md).

Al agregar una nueva entidad en la base de datos o modificar una existente, se deben actualizar los siguientes puntos:
1. **Descarga en arranque**: Registrar la llamada en `syncCloudData()` dentro de [src/App.tsx](file:///d:/WJG/src/App.tsx).
2. **Escucha en tiempo real**: Suscribir la tabla en `CloudSyncService.subscribeRealtime()` en [src/services/cloudSyncService.ts](file:///d:/WJG/src/services/cloudSyncService.ts).
3. **Persistencia dual**: Cada guardado debe actualizar primero el estado local y la caché de `StorageService`, y paralelamente llamar a `CloudSyncService.save...()`.
4. **Normalización de Categorías**: Nunca comparar cadenas sensibles a mayúsculas/minúsculas sin normalizar previamente (`.trim().toUpperCase()`).

---

## 5. Flujos Operativos y Reglas de Negocio

Consulta los flujos completos en [operational_workflows.md](./references/operational_workflows.md).

- **Anticipo para Producción**: Ninguna Orden de Trabajo entra a producción (`IMPRESION`, `PINTURA`) sin al menos el 50% de anticipo registrado en `abonos_pagos`.
- **Descuento de Stock**: Toda venta express marcada con `descontar_stock: true` descuenta automáticamente las unidades en `productos_stock`.
- **RBAC**:
  - `ADMIN_COBRANZAS` (Germán): Acceso total a ventas, taller, finanzas y gestión.
  - `PINTURA_ACABADOS` (Wendy): Acceso a taller, tareas de pintura y gestión.
  - `IMPRESION_MANTENIMIENTO` (Juan): Acceso a taller, calibración de máquinas e impresión.

---

## 6. Procedimientos y Runbooks Operativos

### Runbook 1: Diagnóstico de Stock y Verificación de Figuras
1. Ejecutar el script de salud [health_check.sql](./scripts/health_check.sql) mediante MCP `execute_sql`.
2. Verificar que el total de registros coincida con lo mostrado en la tarjeta "Total Referencias" en la vista de Stock.
3. Si un producto no aparece en pantalla, comprobar:
   - Que `activo` sea `true` en `productos_stock`.
   - Que la categoría corresponda a las contempladas en `matchCategoriaHelper` en [ProductosStockView.tsx](file:///d:/WJG/src/components/stock/ProductosStockView.tsx).
   - Presionar el botón *"Sincronizar Nube"* en la vista de Stock para refresco inmediato.

### Runbook 2: Creación o Migración de Tablas
1. Inspeccionar el esquema actual con MCP `list_tables`.
2. Preparar el script SQL DDL asegurando:
   - Clave primaria (`id uuid DEFAULT gen_random_uuid() PRIMARY KEY`).
   - `created_at timestamptz DEFAULT now()`.
   - Índices para claves foráneas (`CREATE INDEX idx_... ON ...`).
   - Activación de RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
3. Aplicar con MCP `apply_migration` especificando el nombre de migración en formato `timestamp_nombre.sql`.
4. Ejecutar MCP `generate_typescript_types` para refrescar los tipos del frontend.

### Runbook 3: Diagnóstico de Sockets en Tiempo Real
1. Si un navegador no recibe cambios de otro en tiempo real:
   - Verificar si en la consola hay advertencias de canal duplicado o `closed`.
   - Comprobar que en [src/services/cloudSyncService.ts](file:///d:/WJG/src/services/cloudSyncService.ts) se esté ejecutando `supabase.removeChannel()` antes de la suscripción.
   - En desarrollo, asegurarse de que el Service Worker esté inactivo (desregistrado en `!import.meta.env.PROD`).

