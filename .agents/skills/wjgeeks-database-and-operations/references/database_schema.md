# Esquema de Base de Datos — WJGEEKS 3D (Supabase PostgreSQL 17)

## 1. Tablas Principales

### `productos_stock`
Inventario físico para venta en vitrina o entrega inmediata.
- `id` (text, PK): Identificador único (UUID o slug).
- `codigo` (varchar): Código numérico o SKU.
- `nombre` (varchar, NOT NULL): Nombre del producto / figura.
- `categoria` (varchar): Categoría (`FIGURAS`, `COLLARES`, `ARETES`, `LLAVEROS`, `PERSONALIZADOS`).
- `precio_unitario` (numeric, NOT NULL): Precio unitario en COP.
- `precio_venta` (numeric): Precio de venta final con descuento si aplica.
- `stock_actual` (integer, NOT NULL): Unidades disponibles físicas.
- `stock_minimo` (integer): Umbral de alerta de reabastecimiento.
- `descripcion` (text): Detalles del acabado o modelo.
- `dimensiones` (varchar): Medidas (ej. "15 cm x 10 cm").
- `material` (varchar): Tipo de resina (ej. "Resina UV Alta Definición").
- `imagen_url` (text): URL o Base64 optimizado de la imagen.
- `activo` (boolean): `true` para productos visibles en catálogo.
- `fecha_actualizacion` (timestamptz): Última edición.

### `cotizaciones`
Presupuestos generados en el cotizador digital.
- `id` (uuid, PK)
- `numero_cotizacion` (text, UNIQUE): Ej. `COT-001`.
- `cliente_id` (uuid, FK `clientes.id`)
- `cliente_nombre`, `cliente_telefono` (text)
- `total` (numeric), `abono_requerido` (numeric)
- `estado` (text): `BORRADOR`, `ENVIADA`, `APROBADA`, `RECHAZADA`.
- `tiempo_entrega_estimado` (text)

### `cotizacion_items`
Detalle técnico de cada pieza dentro de una cotización.
- `id` (uuid, PK)
- `cotizacion_id` (uuid, FK `cotizaciones.id`)
- `nombre_pieza` (text)
- `resina_id`, `maquina_id` (text)
- `alto_mm`, `ancho_mm`, `profundidad_mm` (numeric)
- `peso_estimado_g` (numeric), `tiempo_impresion_min` (integer)
- `precio_unitario`, `precio_total` (numeric)

### `ordenes_trabajo`
Pipeline operativo de producción física en taller.
- `id` (uuid, PK)
- `numero_ot` (text, UNIQUE): Ej. `OT-001`.
- `cotizacion_id` (uuid, FK `cotizaciones.id`)
- `cliente_id` (uuid, FK `clientes.id`)
- `estado_actual` (text): `PENDIENTE_ANTICIPO`, `MODELADO_PREP`, `IMPRESION`, `POST_PROCESADO`, `PINTURA_ACABADO`, `CONTROL_CALIDAD`, `LISTO_ENTREGA`, `ENTREGADO`, `CANCELADO`.
- `total_cotizado` (numeric), `total_abonado` (numeric), `saldo_pendiente` (numeric)
- `estado_pago` (text): `PENDIENTE`, `ANTICIPO_PARCIAL`, `PAGADO_TOTAL`.
- `tracking_token` (uuid, UNIQUE): Token de seguimiento público para clientes.
- `responsable_actual_id` (uuid, FK `usuarios_taller.id`)

### `abonos_pagos`
Registro contable de cada ingreso recibido.
- `id` (uuid, PK)
- `orden_trabajo_id` (uuid, FK `ordenes_trabajo.id`)
- `cotizacion_id` (uuid, FK `cotizaciones.id`)
- `monto` (numeric, NOT NULL)
- `metodo_pago` (text): `NEQUI`, `BANCOLOMBIA`, `DAVIPLATA`, `EFECTIVO`, `DATAFONO`, `OTRO`.
- `comprobante_url` (text)
- `registrado_por` (uuid, FK `usuarios_taller.id`)
- `created_at` (timestamptz)

### `usuarios_taller`
Directorio del equipo y control de acceso RBAC.
- `id` (uuid / text, PK)
- `nombre` (text): Germán, Wendy, Juan.
- `rol` (text): `ADMIN_COBRANZAS`, `PINTURA_ACABADOS`, `IMPRESION_MANTENIMIENTO`.
- `telefono` (text), `telefono_notificaciones` (text)
- `cedula` (text, UNIQUE)
- `email` (text, UNIQUE)
- `pin_acceso` (text): PIN de 4 dígitos.
- `password_hash` (text): Hash SHA-256.
- `permisos_areas` (jsonb / text[]): `['ventas', 'taller', 'finanzas', 'gestion']`.
- `activo` (boolean)

---

## 2. Vistas y Procedimientos Almacenados (RPC)
- `rpc_registrar_venta_pos_atomica`: Registra venta POS, crea OT si se requiere, descuenta stock y registra el abono de forma atómica en una sola transacción.
- `rpc_cancelar_venta_pos_atomica`: Reversa la venta y devuelve el stock.
- `fn_cambiar_pin_usuario`: Permite a los operadores cambiar o restablecer su PIN con cédula y teléfono de verificación.
- `vista_balance_taller`: Vista agregada de ingresos, costos de resina y saldos pendientes.
