-- ==============================================================================
-- WJGEEKS 3D PRO: PARCHE MAESTRO DE SINCRONIZACIÓN MULTI-DISPOSITIVO Y REALTIME
-- ==============================================================================
-- Soluciona:
-- 1. Error RLS 42501 (bloqueo de INSERT/UPDATE/DELETE desde clientes móviles y PCs).
-- 2. Habilita REPLICA IDENTITY FULL para que los eventos de DELETE en tiempo real 
--    propaguen la eliminación inmediatamente a todos los dispositivos conectados.
-- 3. Publicación de tablas operativas en el canal supabase_realtime.
-- 4. Idempotente y seguro para ejecutar múltiples veces en el SQL Editor de Supabase.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HABILITAR REPLICA IDENTITY FULL EN TODAS LAS TABLAS OPERATIVAS
-- Esto garantiza que al eliminar o actualizar un registro en la PC o celular,
-- Postgres envíe a WebSockets la fila completa eliminada/actualizada.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tablas text[] := ARRAY[
        'ordenes_trabajo', 
        'cotizaciones', 
        'cotizacion_items', 
        'cuentas_cobro', 
        'ventas_express', 
        'clientes', 
        'tareas_equipo', 
        'solicitudes_insumos', 
        'productos_stock', 
        'resinas', 
        'insumos', 
        'maquinas'
    ];
BEGIN
    FOREACH tbl IN ARRAY tablas
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);
        END IF;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2. PUBLICACIÓN EN SUPABASE REALTIME (WebSockets Bidireccionales)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tablas text[] := ARRAY[
        'ordenes_trabajo', 
        'cotizaciones', 
        'cuentas_cobro', 
        'ventas_express', 
        'clientes', 
        'tareas_equipo', 
        'solicitudes_insumos', 
        'productos_stock'
    ];
BEGIN
    FOREACH tbl IN ARRAY tablas
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' AND tablename = tbl
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
            END IF;
        END IF;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS RLS COLABORATIVAS PARA LA FASE OPERATIVA ACTUAL
-- Otorga permisos completos a anon y authenticated para evitar el error 42501
-- que aislaba las creaciones/ediciones de ventas POS y órdenes de trabajo en local.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tablas text[] := ARRAY[
        'ordenes_trabajo', 
        'cotizaciones', 
        'cotizacion_items', 
        'cuentas_cobro', 
        'ventas_express', 
        'clientes', 
        'tareas_equipo', 
        'solicitudes_insumos', 
        'productos_stock', 
        'resinas', 
        'insumos', 
        'maquinas', 
        'tarifas_tamanos', 
        'tarifas_personal',
        'configuracion_taller',
        'archivos_stl'
    ];
BEGIN
    FOREACH tbl IN ARRAY tablas
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Asegurar RLS activo
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
            
            -- Eliminar políticas antiguas o restrictivas
            EXECUTE format('DROP POLICY IF EXISTS "Colaborativo: CRUD %s" ON public.%I;', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Permitir anon y auth en %s" ON public.%I;', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Staff: Acceso total %s" ON public.%I;', tbl, tbl);
            
            -- Crear política colaborativa abierta para anon y authenticated
            EXECUTE format(
                'CREATE POLICY "Colaborativo: CRUD %s" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', 
                tbl, tbl
            );
        END IF;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 4. VALIDACIÓN DE COLUMNAS CLAVE EN ventas_express Y ordenes_trabajo
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Asegurar columnas en ordenes_trabajo
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo') THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS pos_venta_id TEXT;
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid();
        UPDATE public.ordenes_trabajo SET tracking_token = gen_random_uuid() WHERE tracking_token IS NULL;
    END IF;

    -- Asegurar columnas en ventas_express
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ventas_express') THEN
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS foto_url TEXT;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS requiere_ot BOOLEAN DEFAULT false;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS estado_diseno VARCHAR(30);
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS ot_numero VARCHAR(30);
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS ot_id TEXT;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS enlace_diseno TEXT;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS notas_diseno TEXT;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS producto_stock_id TEXT;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS descontar_stock BOOLEAN DEFAULT false;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS cantidad_vendida INTEGER DEFAULT 1;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. VERIFICACIÓN FINAL
-- ------------------------------------------------------------------------------
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('ordenes_trabajo', 'cotizaciones', 'cuentas_cobro', 'ventas_express')
ORDER BY tablename, policyname;
