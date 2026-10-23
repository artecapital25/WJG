-- Migración: Unificación de Balance Financiero y Pagos POS
-- Permite que abonos_pagos acepte pagos directos de POS sin OT requerida,
-- protege la función de sincronización de abonos y consolida vista_balance_taller.

ALTER TABLE public.abonos_pagos ALTER COLUMN orden_trabajo_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_sincronizar_abono_ot()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_ot_id UUID;
    v_total_ot NUMERIC(14, 2);
    v_total_abonado NUMERIC(14, 2);
    v_is_generated BOOLEAN := FALSE;
BEGIN
    v_ot_id := COALESCE(NEW.orden_trabajo_id, OLD.orden_trabajo_id);
    IF v_ot_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT COALESCE(SUM(monto), 0) INTO v_total_abonado
    FROM public.abonos_pagos
    WHERE orden_trabajo_id = v_ot_id;

    SELECT total_ot INTO v_total_ot
    FROM public.ordenes_trabajo
    WHERE id = v_ot_id;

    SELECT (is_generated = 'ALWAYS') INTO v_is_generated
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'ordenes_trabajo' 
      AND column_name = 'saldo_pendiente';

    IF v_is_generated THEN
        UPDATE public.ordenes_trabajo
        SET 
            total_abonado = v_total_abonado,
            updated_at = NOW()
        WHERE id = v_ot_id;
    ELSE
        UPDATE public.ordenes_trabajo
        SET 
            total_abonado = v_total_abonado,
            saldo_pendiente = GREATEST(0, COALESCE(v_total_ot, 0) - v_total_abonado),
            updated_at = NOW()
        WHERE id = v_ot_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo' AND column_name = 'estado_pago'
    ) THEN
        UPDATE public.ordenes_trabajo
        SET estado_pago = CASE 
            WHEN GREATEST(0, COALESCE(v_total_ot, 0) - v_total_abonado) <= 0 THEN 'Pagado Total'
            WHEN v_total_abonado > 0 THEN 'Abono Parcial'
            ELSE 'Pendiente'
        END
        WHERE id = v_ot_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE VIEW public.vista_balance_taller AS
SELECT 
    COALESCE(sum(monto), 0) AS total_ingresos_recaudados,
    COALESCE(sum(CASE WHEN metodo_pago = 'NEQUI' THEN monto ELSE 0 END), 0) AS recaudado_nequi,
    COALESCE(sum(CASE WHEN metodo_pago = 'BRE_B' THEN monto ELSE 0 END), 0) AS recaudado_bre_b,
    COALESCE(sum(CASE WHEN metodo_pago = 'EFECTIVO' THEN monto ELSE 0 END), 0) AS recaudado_efectivo,
    (
      (SELECT COALESCE(sum(saldo_pendiente), 0) 
       FROM public.ordenes_trabajo 
       WHERE estado_actual NOT IN ('ENTREGADO', 'CANCELADO'))
      +
      (SELECT COALESCE(sum(saldo_pendiente), 0) 
       FROM public.ventas_express 
       WHERE estado_pago <> 'Pagado Total' 
         AND (ot_id IS NULL AND ot_numero IS NULL))
    ) AS total_por_cobrar
FROM public.abonos_pagos;
