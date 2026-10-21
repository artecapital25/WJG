-- ==============================================================================
-- CORRECCIÓN DEFINITIVA DE ESQUEMA Y RPC POS: TIPO UUID vs TEXT
-- Solución para el error:
-- "RPC POS falló con error de negocio: column "id" is of type uuid but expression is of type text"
-- Base de Datos: Supabase (PostgreSQL 15+)
-- Idempotente: Totalmente seguro de ejecutar múltiples veces.
-- ==============================================================================

-- 1. ASEGURAR COLUMNAS Y COMPATIBILIDAD DE TIPOS
DO $$
BEGIN
    -- Si id en ventas_express es de tipo UUID, convertir a TEXT para soportar IDs 'pos-...' y UUIDs
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ventas_express' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.ventas_express ALTER COLUMN id TYPE TEXT USING id::TEXT;
        ALTER TABLE public.ventas_express ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;
    END IF;

    -- Asegurar columnas en ordenes_trabajo
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo') THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS pos_venta_id TEXT;
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(30);
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(14, 2) DEFAULT 0;
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(40) DEFAULT 'Pendiente';
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'Bre-B';
    END IF;

    -- Asegurar columnas en ventas_express
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ventas_express') THEN
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS fecha_prometida_pago DATE;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS requiere_ot BOOLEAN DEFAULT false;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS ot_numero VARCHAR(30);
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS ot_id TEXT;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS estado_diseno VARCHAR(30);
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS enlace_diseno TEXT;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS notas_diseno TEXT;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS producto_stock_id TEXT;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS descontar_stock BOOLEAN DEFAULT false;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS cantidad_vendida INTEGER DEFAULT 1;
    END IF;
END $$;

-- 2. ASEGURAR SECUENCIAS
CREATE SEQUENCE IF NOT EXISTS seq_pos_num START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_ordenes_num START WITH 1 INCREMENT BY 1;

-- Sincronizar secuencias
DO $$
DECLARE
    max_pos INT;
    max_ot INT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ventas_express') THEN
        SELECT COALESCE(MAX(NULLIF(regexp_replace(numero_venta, '\D', '', 'g'), '')::INT), 0) INTO max_pos FROM public.ventas_express;
        IF max_pos > 0 THEN
            PERFORM setval('seq_pos_num', max_pos);
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo') THEN
        SELECT COALESCE(MAX(NULLIF(regexp_replace(numero_ot, '\D', '', 'g'), '')::INT), 0) INTO max_ot FROM public.ordenes_trabajo;
        IF max_ot > 0 THEN
            PERFORM setval('seq_ordenes_num', max_ot);
        END IF;
    END IF;
END $$;

-- Funciones generadoras de consecutivos
CREATE OR REPLACE FUNCTION public.generar_siguiente_numero_pos() RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
BEGIN
    next_val := nextval('seq_pos_num');
    RETURN 'POS-' || LPAD(next_val::TEXT, 3, '0');
EXCEPTION WHEN OTHERS THEN
    RETURN 'POS-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 1000)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generar_siguiente_numero_ot() RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
BEGIN
    next_val := nextval('seq_ordenes_num');
    RETURN 'OT-' || LPAD(next_val::TEXT, 4, '0');
EXCEPTION WHEN OTHERS THEN
    RETURN 'OT-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. RPC DEFINITIVA: REGISTRO ATÓMICO DE VENTA POS (PROTEGIDA CONTRA TIPOS UUID/TEXT)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_registrar_venta_pos_atomica(
    p_id TEXT,
    p_numero_venta TEXT,
    p_nombre_producto TEXT,
    p_cliente_nombre TEXT,
    p_cliente_telefono TEXT,
    p_total NUMERIC,
    p_abono NUMERIC,
    p_metodo_pago TEXT,
    p_fecha_prometida_pago DATE,
    p_notas TEXT,
    p_creado_por TEXT,
    p_foto_url TEXT,
    p_requiere_ot BOOLEAN,
    p_estado_diseno TEXT,
    p_enlace_diseno TEXT,
    p_notas_diseno TEXT,
    p_producto_stock_id TEXT,
    p_descontar_stock BOOLEAN,
    p_cantidad_vendida INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_saldo NUMERIC;
    v_estado_pago TEXT;
    v_ot_id TEXT := NULL;
    v_ot_numero TEXT := NULL;
    v_stock_actual INT;
    v_num_venta TEXT;
    v_ventas_id_type TEXT;
    v_final_id TEXT;
BEGIN
    -- 1. Asignar o autogenerar número de venta POS
    IF p_numero_venta IS NULL OR p_numero_venta = '' THEN
        v_num_venta := public.generar_siguiente_numero_pos();
    ELSE
        v_num_venta := p_numero_venta;
    END IF;

    -- 2. Calcular saldos
    v_saldo := GREATEST(0, COALESCE(p_total, 0) - COALESCE(p_abono, 0));
    IF v_saldo = 0 AND COALESCE(p_total, 0) > 0 THEN
        v_estado_pago := 'Pagado Total';
    ELSIF COALESCE(p_abono, 0) > 0 THEN
        v_estado_pago := 'Abono Parcial';
    ELSE
        v_estado_pago := 'Pendiente';
    END IF;

    -- 3. Descontar Stock Físico si aplica (con bloqueo FOR UPDATE)
    IF p_descontar_stock AND p_producto_stock_id IS NOT NULL THEN
        SELECT stock_actual INTO v_stock_actual 
        FROM public.productos_stock 
        WHERE id::TEXT = p_producto_stock_id::TEXT 
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto en stock con ID % no encontrado.', p_producto_stock_id;
        END IF;

        IF v_stock_actual < COALESCE(p_cantidad_vendida, 1) THEN
            RAISE EXCEPTION 'Stock insuficiente en catálogo. Disponible: %, Solicitado: %', v_stock_actual, p_cantidad_vendida;
        END IF;

        UPDATE public.productos_stock 
        SET stock_actual = stock_actual - COALESCE(p_cantidad_vendida, 1),
            fecha_actualizacion = NOW()
        WHERE id::TEXT = p_producto_stock_id::TEXT;
    END IF;

    -- 4. Generar Orden de Trabajo si se requiere
    -- NOTA CRÍTICA: No insertamos id explícito como texto en ordenes_trabajo para evitar
    -- el error: "column id is of type uuid but expression is of type text".
    -- Dejamos que Postgres asigne el UUID por default y lo capturamos con RETURNING id::TEXT.
    IF p_requiere_ot THEN
        v_ot_numero := public.generar_siguiente_numero_ot();

        INSERT INTO public.ordenes_trabajo (
            numero_ot,
            cliente_nombre,
            item_nombre,
            cantidad,
            estado,
            operador_asignado,
            pos_venta_id,
            observaciones,
            created_at
        ) VALUES (
            v_ot_numero,
            p_cliente_nombre,
            p_nombre_producto,
            COALESCE(p_cantidad_vendida, 1),
            'En Cola',
            'Operador 3D (Taller)',
            p_id,
            'Venta POS Express ' || v_num_venta || COALESCE(' | ' || p_notas_diseno, ''),
            NOW()
        )
        RETURNING id::TEXT INTO v_ot_id;
    END IF;

    -- 5. Detectar tipo de columna id en ventas_express (UUID vs TEXT)
    SELECT data_type INTO v_ventas_id_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ventas_express' AND column_name = 'id';

    IF v_ventas_id_type = 'uuid' THEN
        -- Si ventas_express.id es UUID en la base de datos
        IF p_id IS NOT NULL AND p_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            v_final_id := p_id;
        ELSE
            v_final_id := gen_random_uuid()::TEXT;
        END IF;

        INSERT INTO public.ventas_express (
            id,
            numero_venta,
            foto_url,
            nombre_producto,
            cliente_nombre,
            cliente_telefono,
            total,
            abono,
            saldo_pendiente,
            estado_pago,
            fecha_venta,
            fecha_prometida_pago,
            notas,
            metodo_pago,
            creado_por,
            requiere_ot,
            estado_diseno,
            ot_id,
            ot_numero,
            enlace_diseno,
            notas_diseno,
            producto_stock_id,
            descontar_stock,
            cantidad_vendida,
            created_at,
            updated_at
        ) VALUES (
            v_final_id::UUID,
            v_num_venta,
            p_foto_url,
            p_nombre_producto,
            p_cliente_nombre,
            p_cliente_telefono,
            COALESCE(p_total, 0),
            COALESCE(p_abono, 0),
            v_saldo,
            v_estado_pago,
            CURRENT_DATE,
            p_fecha_prometida_pago,
            p_notas,
            COALESCE(p_metodo_pago, 'Bre-B'),
            COALESCE(p_creado_por, 'Equipo WJGEEKS'),
            COALESCE(p_requiere_ot, false),
            p_estado_diseno,
            v_ot_id,
            v_ot_numero,
            p_enlace_diseno,
            p_notas_diseno,
            p_producto_stock_id,
            COALESCE(p_descontar_stock, false),
            COALESCE(p_cantidad_vendida, 1),
            NOW(),
            NOW()
        );
    ELSE
        -- Si ventas_express.id es TEXT o VARCHAR
        v_final_id := COALESCE(NULLIF(p_id, ''), 'pos-' || EXTRACT(EPOCH FROM NOW())::BIGINT);

        INSERT INTO public.ventas_express (
            id,
            numero_venta,
            foto_url,
            nombre_producto,
            cliente_nombre,
            cliente_telefono,
            total,
            abono,
            saldo_pendiente,
            estado_pago,
            fecha_venta,
            fecha_prometida_pago,
            notas,
            metodo_pago,
            creado_por,
            requiere_ot,
            estado_diseno,
            ot_id,
            ot_numero,
            enlace_diseno,
            notas_diseno,
            producto_stock_id,
            descontar_stock,
            cantidad_vendida,
            created_at,
            updated_at
        ) VALUES (
            v_final_id,
            v_num_venta,
            p_foto_url,
            p_nombre_producto,
            p_cliente_nombre,
            p_cliente_telefono,
            COALESCE(p_total, 0),
            COALESCE(p_abono, 0),
            v_saldo,
            v_estado_pago,
            CURRENT_DATE,
            p_fecha_prometida_pago,
            p_notas,
            COALESCE(p_metodo_pago, 'Bre-B'),
            COALESCE(p_creado_por, 'Equipo WJGEEKS'),
            COALESCE(p_requiere_ot, false),
            p_estado_diseno,
            v_ot_id,
            v_ot_numero,
            p_enlace_diseno,
            p_notas_diseno,
            p_producto_stock_id,
            COALESCE(p_descontar_stock, false),
            COALESCE(p_cantidad_vendida, 1),
            NOW(),
            NOW()
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'venta_id', v_final_id,
        'numero_venta', v_num_venta,
        'ot_id', v_ot_id,
        'ot_numero', v_ot_numero,
        'saldo_pendiente', v_saldo
    );
END;
$$;

-- 4. PERMISOS
GRANT EXECUTE ON FUNCTION public.rpc_registrar_venta_pos_atomica TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ventas_express TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ordenes_trabajo TO anon, authenticated, service_role;
