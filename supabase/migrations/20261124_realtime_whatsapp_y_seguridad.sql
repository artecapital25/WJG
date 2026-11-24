-- ==============================================================================
-- WJGEEKS 3D PRO - MIGRACIÓN UNIFICADA:
-- 1. Seguridad Supabase (View Security Invoker, Revoke RPCs/Triggers, Limpieza RLS)
-- 2. Sincronización Multi-Dispositivo en Tiempo Real (supabase_realtime + REPLICA IDENTITY FULL)
-- 3. Persistencia Permanente de Sesión WhatsApp Baileys (whatsapp_baileys_sessions)
-- Script 100% idempotente. Seguro para ejecutar múltiples veces en Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BLOQUE 1: REMEDIACIÓN DE SEGURIDAD SUPABASE ADVISOR
-- ------------------------------------------------------------------------------

-- 1.1 Corregir vista_promedios_consumo_real (ERROR: security_definer_view -> security_invoker = true)
ALTER VIEW IF EXISTS public.vista_promedios_consumo_real SET (security_invoker = true);

-- Nota técnica sobre pg_net:
-- La extensión pg_net tiene extrelocatable = false en Postgres (ALTER EXTENSION pg_net SET SCHEMA ... no es soportado),
-- por lo que permanece en su esquema actual de forma intencional sin afectar seguridad ni funcionamiento.

-- 1.2 Revocar acceso público (anon/authenticated/PUBLIC) a funciones TRIGGER y RPCs internos/no usados por el frontend.
-- Se conservan intactos los 9 RPCs activos en src/ y get_public_tracking_info(uuid).
DO $$
DECLARE
  v_sig text;
  v_sigs text[] := ARRAY[
    -- 8 funciones Trigger (los triggers siguen ejecutándose normalmente por evento de tabla)
    'public.fn_disparar_dispatch_whatsapp_async()',
    'public.fn_encolar_notificacion_por_estado_ot()',
    'public.fn_registrar_historial_ot()',
    'public.fn_sincronizar_abono_a_ot_y_tracking()',
    'public.fn_sync_balances_from_ledger()',
    'public.fn_sync_ordenes_trabajo_to_modules()',
    'public.fn_sync_ventas_express_to_ot()',
    'public.fn_validar_reglas_anticipo_y_entrega()',
    -- 7 RPCs solo backend/cron o no invocados desde el frontend
    'public.cron_evaluar_cobranzas_y_encolar_whatsapp()',
    'public.approve_quote_and_settle(uuid, numeric, text, text)',
    'public.fn_resolver_auto_respuesta_whatsapp(text, text)',
    'public.has_permission(text)',
    'public.log_whatsapp_notification(text, text, text, text, text, text, text, text, text)',
    'public.rpc_registrar_venta_pos_atomica(text, text, text, text, text, numeric, numeric, text, date, text, text, text, boolean, text, text, text, text, boolean, integer)',
    'public.sync_calendar_event_to_source(uuid, timestamp with time zone, timestamp with time zone)'
  ];
BEGIN
  FOREACH v_sig IN ARRAY v_sigs LOOP
    IF to_regprocedure(v_sig) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated;', v_sig);
    END IF;
  END LOOP;
END $$;

-- 1.3 Eliminar políticas RLS duplicadas y redundantes dejando UNA sola política limpia por tabla
-- (mantiene operatividad del cliente web bajo autenticación por PIN personalizado).
DROP POLICY IF EXISTS "Acceso Taller abonos_pagos" ON public.abonos_pagos;
DROP POLICY IF EXISTS "Colaborativo: CRUD calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Acceso Taller clientes" ON public.clientes;
DROP POLICY IF EXISTS "Colaborativo: CRUD clientes" ON public.clientes;
DROP POLICY IF EXISTS "Acceso Taller cotizaciones" ON public.cotizaciones;
DROP POLICY IF EXISTS "Acceso Taller estados_ot" ON public.estados_ot;
DROP POLICY IF EXISTS "Colaborativo: CRUD insumos" ON public.insumos;
DROP POLICY IF EXISTS "Colaborativo: CRUD maquinas" ON public.maquinas;
DROP POLICY IF EXISTS "Acceso Taller ordenes_trabajo" ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "Colaborativo: CRUD productos_stock" ON public.productos_stock;
DROP POLICY IF EXISTS "Colaborativo: CRUD resinas" ON public.resinas;
DROP POLICY IF EXISTS "Colaborativo: CRUD solicitudes_insumos" ON public.solicitudes_insumos;
DROP POLICY IF EXISTS "Colaborativo: CRUD tareas_equipo" ON public.tareas_equipo;
DROP POLICY IF EXISTS "Acceso total usuarios_taller" ON public.usuarios_taller;

-- ------------------------------------------------------------------------------
-- BLOQUE 2: ACTIVACIÓN DE REALTIME MULTI-DISPOSITIVO EN SUPABASE
-- ------------------------------------------------------------------------------

-- 2.1 REPLICA IDENTITY FULL en tablas operativas base (relkind = 'r') para propagar eventos DELETE
-- Nota: cuentas_cobro es una VISTA derivada de ordenes_trabajo y abonos_pagos (ambas ya incluidas).
DO $$
DECLARE
  v_tbl text;
  v_replica_tables text[] := ARRAY[
    'cotizaciones',
    'ordenes_trabajo',
    'ventas_express',
    'insumos',
    'resinas',
    'filamentos',
    'maquinas',
    'consumos_reales_produccion',
    'productos_stock',
    'clientes',
    'configuracion_taller'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_replica_tables LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = v_tbl
        AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', v_tbl);
    END IF;
  END LOOP;
END $$;

-- 2.2 Añadir todas las tablas base operativas y catálogos (relkind = 'r') a supabase_realtime
DO $$
DECLARE
  v_tbl text;
  v_realtime_tables text[] := ARRAY[
    'cotizaciones',
    'ordenes_trabajo',
    'insumos',
    'resinas',
    'filamentos',
    'maquinas',
    'configuracion_taller',
    'abonos_pagos',
    'usuarios_taller',
    'consumos_reales_produccion',
    'ventas_express',
    'productos_stock',
    'clientes',
    'proveedores',
    'tarifas_tamanos',
    'tareas_equipo',
    'solicitudes_insumos',
    'produccion_interna',
    'backlog_mejoras_empresa'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH v_tbl IN ARRAY v_realtime_tables LOOP
      IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = v_tbl
          AND c.relkind = 'r'
      )
         AND NOT EXISTS (
           SELECT 1
           FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime'
             AND schemaname = 'public'
             AND tablename = v_tbl
         ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', v_tbl);
      END IF;
    END LOOP;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- BLOQUE 3: SESIÓN PERMANENTE WHATSAPP BAILEYS EN SUPABASE (RENDER-SAFE)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_baileys_sessions (
  session_id text NOT NULL,
  key_id text NOT NULL,
  data_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, key_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_baileys_sessions_session_id
  ON public.whatsapp_baileys_sessions (session_id);

-- RLS habilitado SIN políticas para anon ni authenticated: acceso exclusivo vía service_role en el servidor Node/Render.
ALTER TABLE public.whatsapp_baileys_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_baileys_sessions'
      AND policyname = 'Solo service_role whatsapp_baileys_sessions'
  ) THEN
    CREATE POLICY "Solo service_role whatsapp_baileys_sessions"
      ON public.whatsapp_baileys_sessions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
