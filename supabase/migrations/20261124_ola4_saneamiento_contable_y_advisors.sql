-- ============================================================================
-- WJGEEKS 3D PRO — OLA 4: SANEAMIENTO CONTABLE Y HARDENING SUPABASE
-- Ejecutar completo en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Idempotente y seguro para producción (Proyecto: brjzpbqxjakihpsbkqfh).
-- ============================================================================

BEGIN;

-- 1. Resolver ERROR Advisor `security_definer_view` en vista_balance_taller
ALTER VIEW public.vista_balance_taller SET (security_invoker = true);

-- 2. Actualizar trigger fn_sincronizar_abono_ot para mantener sincronizados `total_abonado` y `abono`
--    (sin intentar escribir la columna generada `saldo_pendiente`)
CREATE OR REPLACE FUNCTION public.fn_sincronizar_abono_ot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions', 'pg_temp'
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
            abono = v_total_abonado,
            updated_at = NOW()
        WHERE id = v_ot_id;
    ELSE
        UPDATE public.ordenes_trabajo
        SET
            total_abonado = v_total_abonado,
            abono = v_total_abonado,
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
            WHEN GREATEST(0, COALESCE(v_total_ot, 0) - v_total_abonado) <= 0 AND COALESCE(v_total_ot, 0) > 0 THEN 'Pagado Total'
            WHEN v_total_abonado > 0 THEN 'Abono Parcial'
            ELSE 'Pendiente'
        END
        WHERE id = v_ot_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 3. Persistir la nueva URL oficial de Google Apps Script en configuracion_taller
UPDATE public.configuracion_taller
SET email_apps_script_url = 'https://script.google.com/macros/s/AKfycby3wMIXe7A3kAyst3cSxbIE9M5HUnmBgJGrGJ6Xi6nMfjN4ckFzZO6p53R1ET2bMuTbRg/exec'
WHERE COALESCE(email_apps_script_url, '') = ''
   OR email_apps_script_url LIKE '%AKfycbzEUGjnaQoMVZ5OtdY-QJldULcF_NYqxsda9y5nR72kf7kaQNIsp6AQbb5Z_Fop2syAJQ%';

-- 4. Alinear las 16 OTs históricas donde `abono` difería de `total_abonado`
--    (`saldo_pendiente` es GENERATED ALWAYS AS (total_ot - total_abonado) STORED, no se modifica)
UPDATE public.ordenes_trabajo
SET abono = COALESCE(total_abonado, 0)
WHERE COALESCE(abono, 0) <> COALESCE(total_abonado, 0);

-- 5. Eliminar los 2 índices duplicados reportados por Performance Advisors
DROP INDEX IF EXISTS public.idx_abonos_cot_id;
ALTER TABLE public.ordenes_trabajo DROP CONSTRAINT IF EXISTS uq_ordenes_trabajo_numero_ot;
DROP INDEX IF EXISTS public.uq_ordenes_trabajo_numero_ot;

-- 6. Eliminar las 2 políticas RLS SELECT redundantes para `anon` (ya cubiertas por sus políticas ALL)
DROP POLICY IF EXISTS "Publico: Consultar datos de contacto taller" ON public.configuracion_taller;
DROP POLICY IF EXISTS "Publico: Consultar catalogo stock" ON public.productos_stock;

-- NOTA DE SEGURIDAD (Advisors `anon_security_definer_function_executable`):
-- No se revoca aquí EXECUTE sobre RPCs como `admin_crear_usuario`, `admin_toggle_usuario_activo`,
-- `fn_cambiar_pin_usuario`, `fn_whatsapp_healthcheck` o `get_daily_company_briefing` porque
-- el cliente web actual autentica al equipo con PIN personalizado usando la anon key de Supabase.
-- Revocarlas sin migrar antes a Supabase Auth JWT bloquearía el login y los modales del taller.

COMMIT;
