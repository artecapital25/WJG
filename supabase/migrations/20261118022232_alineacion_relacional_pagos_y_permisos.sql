-- =========================================================================
-- MIGRACIÓN IDEMPOTENTE DE ALINEACIÓN RELACIONAL Y FINANCIERA — WJGEEKS 3D PRO
-- Objetivo: Garantizar columnas financieras y de relación entre cotizaciones,
-- ordenes_trabajo, ventas_express, abonos_pagos y usuarios_taller sin borrar
-- ni sobrescribir información existente.
-- =========================================================================

-- 1. Tabla cotizaciones: metadatos de abono, saldo, vendedor e impuestos
ALTER TABLE IF EXISTS public.cotizaciones
  ADD COLUMN IF NOT EXISTS cliente_nombre text,
  ADD COLUMN IF NOT EXISTS cliente_telefono text,
  ADD COLUMN IF NOT EXISTS vendedor_nombre text,
  ADD COLUMN IF NOT EXISTS iva_porcentaje numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_monto numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descuento_monto numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abono numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_pendiente numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_pago text DEFAULT 'Pendiente',
  ADD COLUMN IF NOT EXISTS metodo_pago text DEFAULT 'Bre-B',
  ADD COLUMN IF NOT EXISTS comprobante_pago text;

-- 2. Tabla ordenes_trabajo: trazabilidad cruzada sin falsas coincidencias
ALTER TABLE IF EXISTS public.ordenes_trabajo
  ADD COLUMN IF NOT EXISTS cotizacion_id uuid,
  ADD COLUMN IF NOT EXISTS cotizacion_numero text,
  ADD COLUMN IF NOT EXISTS pos_venta_id text,
  ADD COLUMN IF NOT EXISTS total_ot numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_abonado numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abono numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_pendiente numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_pago text DEFAULT 'Pendiente',
  ADD COLUMN IF NOT EXISTS metodo_pago text DEFAULT 'Bre-B',
  ADD COLUMN IF NOT EXISTS comprobante_pago text,
  ADD COLUMN IF NOT EXISTS stl_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ot_cotizacion_id ON public.ordenes_trabajo (cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_ot_pos_venta_id ON public.ordenes_trabajo (pos_venta_id);

-- 3. Tabla ventas_express (POS): campos fiscales, de diseño y relación con OT/Stock
ALTER TABLE IF EXISTS public.ventas_express
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_porcentaje numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_monto numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abono numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_pendiente numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_pago text DEFAULT 'Pendiente',
  ADD COLUMN IF NOT EXISTS metodo_pago text DEFAULT 'Bre-B',
  ADD COLUMN IF NOT EXISTS requiere_ot boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS estado_diseno text,
  ADD COLUMN IF NOT EXISTS ot_id text,
  ADD COLUMN IF NOT EXISTS ot_numero text,
  ADD COLUMN IF NOT EXISTS enlace_diseno text,
  ADD COLUMN IF NOT EXISTS notas_diseno text,
  ADD COLUMN IF NOT EXISTS producto_stock_id text,
  ADD COLUMN IF NOT EXISTS descontar_stock boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cantidad_vendida integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. Tabla abonos_pagos (Ledger Central): vínculos directos con POS, OT, Cotización y Cuenta
ALTER TABLE IF EXISTS public.abonos_pagos
  ADD COLUMN IF NOT EXISTS cotizacion_id uuid,
  ADD COLUMN IF NOT EXISTS orden_trabajo_id uuid,
  ADD COLUMN IF NOT EXISTS pos_venta_id text,
  ADD COLUMN IF NOT EXISTS cuenta_cobro_id text,
  ADD COLUMN IF NOT EXISTS metodo_pago text DEFAULT 'BRE_B',
  ADD COLUMN IF NOT EXISTS referencia_transaccion text,
  ADD COLUMN IF NOT EXISTS comprobante_url text,
  ADD COLUMN IF NOT EXISTS cuenta_receptora text,
  ADD COLUMN IF NOT EXISTS nota text;

CREATE INDEX IF NOT EXISTS idx_abonos_pos_venta_id ON public.abonos_pagos (pos_venta_id);
CREATE INDEX IF NOT EXISTS idx_abonos_cotizacion_id ON public.abonos_pagos (cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_abonos_ot_id ON public.abonos_pagos (orden_trabajo_id);

-- 5. Tabla usuarios_taller: habilitar acceso transversal a todas las áreas para usuarios activos (columna jsonb)
UPDATE public.usuarios_taller
SET permisos_areas = '["ventas", "taller", "finanzas", "gestion"]'::jsonb
WHERE activo IS NOT FALSE
  AND (
    permisos_areas IS NULL
    OR jsonb_typeof(permisos_areas) <> 'array'
    OR jsonb_array_length(permisos_areas) < 4
  );

-- 6. Vistas financieras: respetar políticas RLS del invocador (security_invoker = true)
ALTER VIEW IF EXISTS public.payments SET (security_invoker = true);
ALTER VIEW IF EXISTS public.cuentas_cobro SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vista_balance_taller SET (security_invoker = true);
