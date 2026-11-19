# Bitácora de Pendientes y Futuras Validaciones — WJGEEKS 3D PRO

Este documento forma parte del repositorio para hacer seguimiento claro entre lo que **ya está operativo** y lo que **queda pendiente o en validación** con el equipo (Germán, Wendy y Juan). También está conectado con la nueva pestaña **"📝 Bitácora & Futuras Validaciones"** dentro de **Estado de la Empresa** en la aplicación web y con la tabla `backlog_mejoras_empresa` en Supabase.

---

## 1. En Validación Futura (Pausado por Decisión Operativa)

### ⏸️ Reglas de Descuento Automático de Inventario (POS, Resinas, Filamentos e Insumos)
- **Estado:** `en_validacion`
- **Decisión actual:** Por instrucción explícita del equipo, **no se ejecutan descuentos automáticos de inventario por defecto desde POS Express** (`descontarStock` desactivado por defecto) hasta validar con mayor detalle y tiempo:
  1. Cómo se descuenta el stock físico en vitrina (`productos_stock`) frente a piezas personalizadas a pedido.
  2. Reglas exactas para merma de resina líquida (`resinas.peso_g`), carretes de filamento (`filamentos.stock_actual_g`) y consumos fraccionados/decimales de insumos (`insumos.stock_actual`).
  3. Protocolo de reversión cuando se edita o elimina una venta POS o una Orden de Trabajo.

---

## 2. Mejoras Implementadas en Esta Iteración
1. **Visibilidad y Reconexión Directa de WhatsApp Corporativo (+57 320 2796115):**
   - Indicador en vivo en la cabecera (`HeaderMinimal.tsx`) que muestra **WA Activo** o **Reconectar WA** cuando la sesión QR pierde vinculación (`HTTP 503`).
   - Botón directo en `ModalConfirmacionWhatsApp.tsx` para abrir el vinculador QR sin perder la venta ni la cotización, y envío asistido por `wa.me` limpio sin JSON crudo.
2. **Identidad Única de Clientes (Cédula/NIT, Teléfono 10 dígitos, Correo y Cotejo por Nombre):**
   - Limpieza de cédulas en notación científica heredadas de Excel y consolidación de clientes duplicados en Supabase.
   - `POSExpressView.tsx`, `CotizacionBuilderView.tsx`, `ModalNuevoClienteRapido.tsx` y `CatalogosManager.tsx` ahora buscan en todo el directorio, actualizan los datos del cliente en cada compra y muestran alerta de cotejo cuando solo coincide por nombre.
   - Modal **Historial 360°** en el Directorio de Clientes con todas sus Ventas POS, Cotizaciones y Órdenes de Trabajo.
   - Eliminación de clientes sincronizada en UI + `StorageService` + Supabase desvinculando llaves foráneas limpiamente (`ON DELETE SET NULL`).
3. **Bitácora Viva en "Estado de la Empresa":**
   - Pestaña editable para agregar, actualizar o marcar como implementados nuevos requerimientos del taller a medida que surjan.

---

## 3. Pendientes por Implementar / Escalar (Backlog)
- [ ] **Persistencia Remota de Sesión WhatsApp Gateway:** Almacenar credenciales Baileys en disco persistente o tabla de Supabase para que Render no cierre la sesión al reiniciar contenedores.
- [ ] **Validación Integral de Descuentos de Inventario:** Revisar con el equipo las reglas exactas de bodega antes de reactivar descuentos automáticos por defecto.
- [ ] **Pasarela de Pagos Automática (Wompi / Bold / PSE):** Links de pago en WhatsApp y portal de cliente con conciliación automática.
- [ ] **Módulo de Envíos Nacionales y Guías:** Interrapidísimo, Envía, Servientrega y rótulos de empaque frágil.
- [ ] **Horómetro de Impresoras y Vida Útil de FEP / LCD / Boquillas:** Contador acumulado de horas UV y alertas preventivas de mantenimiento.
- [ ] **Depuración Final en SQL Editor de Supabase (si los 6 duplicados vacíos siguen visibles en BD):** Ejecutar el paso 5 de `supabase_migracion_clientes_pos_backlog.sql` (`DELETE FROM public.clientes WHERE id IN (...)`).

