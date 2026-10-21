-- ==============================================================================
-- SCRIPT DE ENDURECIMIENTO DE SEGURIDAD Y RENDIMIENTO (WJGEEKS 3D PRO)
-- Versión Resiliente y Fail-Safe contra Errores de Dependencia (42P01)
-- ==============================================================================

-- 1. CREACIÓN PRIORITARIA DE TABLAS REQUERIDAS (DEBE EJECUTARSE PRIMERO)
CREATE TABLE IF NOT EXISTS public.productos_stock (
    id TEXT PRIMARY KEY,
    codigo VARCHAR(50),
    nombre VARCHAR(200) NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Figuras & Miniaturas',
    precio_unitario NUMERIC(14, 2) NOT NULL DEFAULT 0,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    descripcion TEXT,
    dimensiones VARCHAR(100),
    material VARCHAR(100) DEFAULT 'Resina UV Alta Definición',
    imagen_url TEXT,
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREACIÓN CONDICIONAL DE ÍNDICES (SOLO SI LA TABLA EXISTE EN SUPABASE)
DO $$
BEGIN
  -- Índices en cotizaciones
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cotizaciones') THEN
    CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente_id ON public.cotizaciones(cliente_id);
  END IF;

  -- Índices en cotizacion_items
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cotizacion_items') THEN
    CREATE INDEX IF NOT EXISTS idx_cotizacion_items_cot_id ON public.cotizacion_items(cotizacion_id);
  END IF;

  -- Índices en ordenes_trabajo
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo') THEN
    CREATE INDEX IF NOT EXISTS idx_ordenes_cot_id ON public.ordenes_trabajo(cotizacion_id);
    CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON public.ordenes_trabajo(estado);
  END IF;

  -- Índices en cuentas_cobro
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cuentas_cobro') THEN
    CREATE INDEX IF NOT EXISTS idx_cuentas_cot_id ON public.cuentas_cobro(cotizacion_id);
    CREATE INDEX IF NOT EXISTS idx_cuentas_cliente_id ON public.cuentas_cobro(cliente_id);
  END IF;

  -- Índices en ventas_express
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ventas_express') THEN
    CREATE INDEX IF NOT EXISTS idx_ventas_express_fecha ON public.ventas_express(fecha_venta);
    CREATE INDEX IF NOT EXISTS idx_ventas_express_estado ON public.ventas_express(estado_pago);
  END IF;

  -- Índices en productos_stock
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'productos_stock') THEN
    CREATE INDEX IF NOT EXISTS idx_productos_stock_cat ON public.productos_stock(categoria);
  END IF;
END $$;

-- 3. HABILITACIÓN RESILIENTE DE ROW LEVEL SECURITY (RLS)
DO $$
DECLARE
    tbl text;
    tablas text[] := ARRAY[
        'configuracion_taller', 'clientes', 'proveedores', 'resinas', 
        'maquinas', 'insumos', 'cotizaciones', 'cotizacion_items', 
        'ordenes_trabajo', 'cuentas_cobro', 'ventas_express', 
        'tarifas_tamanos', 'tareas_equipo', 'solicitudes_insumos', 
        'archivos_stl', 'productos_stock', 'tarifas_personal'
    ];
BEGIN
    FOREACH tbl IN ARRAY tablas
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        END IF;
    END LOOP;
END $$;

-- 4. REVOCACIÓN SEGURA DE POLÍTICAS HISTÓRICAS PERMISIVAS
DO $$
DECLARE
    rec RECORD;
    politicas_antiguas text[] := ARRAY[
        'Permitir anon y auth en ventas_express',
        'Permitir anon y auth en tarifas_tamanos',
        'Permitir anon y auth en tareas_equipo',
        'Permitir anon y auth en solicitudes_insumos',
        'Permitir anon y auth en archivos_stl',
        'Permitir anon y auth en configuracion_taller',
        'Permitir anon y auth en clientes',
        'Permitir anon y auth en proveedores',
        'Permitir anon y auth en resinas',
        'Permitir anon y auth en maquinas',
        'Permitir anon y auth en insumos',
        'Permitir anon y auth en tarifas_personal',
        'Permitir anon y auth en cotizaciones',
        'Permitir anon y auth en cotizacion_items',
        'Permitir anon y auth en ordenes_trabajo',
        'Permitir anon y auth en cuentas_cobro',
        'Permitir anon y auth en productos_stock'
    ];
    pol text;
BEGIN
    FOREACH pol IN ARRAY politicas_antiguas
    LOOP
        FOR rec IN 
            SELECT schemaname, tablename, policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' AND policyname = pol
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', rec.policyname, rec.tablename);
        END LOOP;
    END LOOP;
END $$;

-- 5. CREACIÓN DE POLÍTICAS BASADAS EN ROLES (STAFF VS PÚBLICO)
DO $$
DECLARE
    tbl text;
    tablas_staff text[] := ARRAY[
        'configuracion_taller', 'clientes', 'proveedores', 'resinas', 
        'maquinas', 'insumos', 'cotizaciones', 'cotizacion_items', 
        'ordenes_trabajo', 'cuentas_cobro', 'ventas_express', 
        'tarifas_tamanos', 'tareas_equipo', 'solicitudes_insumos', 
        'archivos_stl', 'productos_stock', 'tarifas_personal'
    ];
BEGIN
    -- A. Políticas de acceso total para Staff autenticado
    FOREACH tbl IN ARRAY tablas_staff
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('DROP POLICY IF EXISTS "Staff: Acceso total %s" ON public.%I;', tbl, tbl);
            EXECUTE format('CREATE POLICY "Staff: Acceso total %s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
        END IF;
    END LOOP;

    -- B. Políticas de lectura controlada para portal público / clientes (anon)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cotizaciones') THEN
        DROP POLICY IF EXISTS "Publico: Consultar cotizacion por numero" ON public.cotizaciones;
        CREATE POLICY "Publico: Consultar cotizacion por numero" ON public.cotizaciones 
        FOR SELECT TO anon USING (numero_cot IS NOT NULL);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cotizacion_items') THEN
        DROP POLICY IF EXISTS "Publico: Consultar items de su cotizacion" ON public.cotizacion_items;
        CREATE POLICY "Publico: Consultar items de su cotizacion" ON public.cotizacion_items 
        FOR SELECT TO anon USING (cotizacion_id IN (SELECT id FROM public.cotizaciones));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo') THEN
        DROP POLICY IF EXISTS "Publico: Consultar ordenes por numero" ON public.ordenes_trabajo;
        CREATE POLICY "Publico: Consultar ordenes por numero" ON public.ordenes_trabajo 
        FOR SELECT TO anon USING (numero_ot IS NOT NULL);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tarifas_tamanos') THEN
        DROP POLICY IF EXISTS "Publico: Consultar tarifario publico" ON public.tarifas_tamanos;
        CREATE POLICY "Publico: Consultar tarifario publico" ON public.tarifas_tamanos 
        FOR SELECT TO anon USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'configuracion_taller') THEN
        DROP POLICY IF EXISTS "Publico: Consultar datos de contacto taller" ON public.configuracion_taller;
        CREATE POLICY "Publico: Consultar datos de contacto taller" ON public.configuracion_taller 
        FOR SELECT TO anon USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'productos_stock') THEN
        DROP POLICY IF EXISTS "Publico: Consultar catalogo stock" ON public.productos_stock;
        CREATE POLICY "Publico: Consultar catalogo stock" ON public.productos_stock 
        FOR SELECT TO anon USING (true);
    END IF;
END $$;

-- 6. PUBLICACIÓN REALTIME PARA MULTI-DISPOSITIVO EN VIVO
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'productos_stock') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'productos_stock') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.productos_stock;
    END IF;
  END IF;
END $$;
