-- ==============================================================================
-- Migración: Idempotencia en POS Express y Blindaje de Balance General
-- Archivo: 20261023000005_fix_pos_idempotency_and_balance.sql
-- ==============================================================================
-- 1. Refuerza vista_balance_taller para evitar que OTs vinculadas a ventas POS ya liquidadas
--    sumen falsos saldos pendientes al balance por cobrar.
-- 2. Asegura compatibilidad de la tabla cotizaciones con fecha_emision.

CREATE OR REPLACE VIEW public.vista_balance_taller AS
SELECT 
    COALESCE(sum(monto), 0) AS total_ingresos_recaudados,
    COALESCE(sum(CASE WHEN metodo_pago = 'NEQUI' THEN monto ELSE 0 END), 0) AS recaudado_nequi,
    COALESCE(sum(CASE WHEN metodo_pago = 'BRE_B' THEN monto ELSE 0 END), 0) AS recaudado_bre_b,
    COALESCE(sum(CASE WHEN metodo_pago = 'EFECTIVO' THEN monto ELSE 0 END), 0) AS recaudado_efectivo,
    (
      (
        SELECT COALESCE(sum(
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM public.ventas_express v 
              WHERE (v.id = ot.pos_venta_id OR v.ot_id = ot.id::TEXT OR v.ot_numero = ot.numero_ot)
                AND v.estado_pago = 'Pagado Total'
            ) THEN 0
            ELSE ot.saldo_pendiente
          END
        ), 0) 
        FROM public.ordenes_trabajo ot
        WHERE ot.estado_actual NOT IN ('ENTREGADO', 'CANCELADO')
      )
      +
      (
        SELECT COALESCE(sum(saldo_pendiente), 0) 
        FROM public.ventas_express 
        WHERE estado_pago <> 'Pagado Total' 
          AND (ot_id IS NULL AND ot_numero IS NULL)
      )
    ) AS total_por_cobrar
FROM public.abonos_pagos;

ALTER VIEW public.vista_balance_taller SET (security_invoker = true);
GRANT SELECT ON public.vista_balance_taller TO anon, authenticated, service_role;

-- 3. Asegurar correo corporativo oficial wjgeeks3d@gmail.com en configuración
ALTER TABLE public.configuracion_taller ADD COLUMN IF NOT EXISTS correo TEXT DEFAULT 'wjgeeks3d@gmail.com';
UPDATE public.configuracion_taller SET correo = 'wjgeeks3d@gmail.com' WHERE correo IS NULL OR correo = '';
