# Flujos Operativos y Reglas de Negocio — WJGEEKS 3D

## 1. Ciclo de Vida de una Orden de Trabajo (OT)

```
[Cotización Aprobada]
         │
         ▼
[1. PENDIENTE_ANTICIPO] (Requiere >= 50% de abono registrado)
         │
         ▼ (Trigger fn_validar_reglas_anticipo_y_entrega)
[2. MODELADO_PREP] (Alistamiento de archivos STL y soportes)
         │
         ▼
[3. IMPRESION] (Asignada a impresora 3D y resina UV específica)
         │
         ▼
[4. POST_PROCESADO] (Lavado IPA y curado en cámara UV)
         │
         ▼
[5. PINTURA_ACABADO] (Aerografía, pincel seco y barniz protector)
         │
         ▼
[6. CONTROL_CALIDAD] (Inspección dimensional y de detalle)
         │
         ▼
[7. LISTO_ENTREGA] (Empaque y notificación al cliente)
         │
         ▼ (Requiere saldo_pendiente = 0)
[8. ENTREGADO] (Cierre de OT y liquidación)
```

---

## 2. Reglas Financieras y de Cobranzas
- **Anticipo Mínimo**: Ninguna pieza personalizada pasa a fase de impresión sin un anticipo de al menos el **50%**.
- **Liquidación al Retirar**: Las piezas no pueden pasar a estado `ENTREGADO` si `saldo_pendiente > 0`.
- **Notificaciones WhatsApp**: Al cambiar a `LISTO_ENTREGA` o `PENDIENTE_ANTICIPO`, el sistema encola automáticamente una notificación en `registro_notificaciones` para el cliente y los operadores.

---

## 3. Manejo de Stock Físico (Vitrina)
- Los productos en stock representan figuras y accesorios ya fabricados y listos para entrega inmediata.
- En el módulo de Stock se calcula el valor comercial total y las unidades en taller.
- Las ventas express descuentan unidades de forma atómica en Supabase y notifican a los operadores si el inventario llega al `stock_minimo`.

---

## 4. Balance Financiero Unificado (Cotizaciones + POS Express)
- **Centralización en `abonos_pagos`**: Todo abono o pago total (sea de una Cotización/OT o de una Venta Express POS) se asienta en la tabla `abonos_pagos`.
- **Compatibilidad POS**: La columna `orden_trabajo_id` es anulable (`NULLABLE`), permitiendo vincular pagos con `pos_venta_id` para ventas directas sin orden de manufactura.
- **`vista_balance_taller`**:
  - `total_ingresos_recaudados`: Suma de todos los abonos en `abonos_pagos`.
  - `total_por_cobrar`: Saldo pendiente de órdenes de trabajo activas (`ordenes_trabajo`) **más** saldo pendiente de ventas POS directas (`ventas_express`).
  - Desglose por método de pago: `recaudado_bre_b`, `recaudado_nequi`, `recaudado_efectivo`.
- **Vista de Finanzas en Frontend**: La pantalla `FinancialReportView` consolida todas las operaciones y permite filtrar por canal (`Cotizaciones` vs `POS`), periodo y estado de cobro, generando el balance oficial exportable a Excel (.xls).

