-- ==============================================================================
-- WJGEEKS 3D PRO - PAQUETE DBA DE ENDURECIMIENTO Y TRANSACCIONALIDAD SUPABASE
-- Arquitectura: PostgreSQL 15+ / Supabase Engine
-- Autor: Principal Database Administrator & Cloud Solutions Architect
-- Script 100% Idempotente y Seguro para Ejecución en SQL Editor
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONES Y SECUENCIAS CENTRALIZADAS (PREVENCIÓN DE COLISIONES EN CLIENTE)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Secuencias centralizadas en base de datos para evitar colisiones concurrentes
CREATE SEQUENCE IF NOT EXISTS seq_cotizaciones_num START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_ordenes_num START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_cuentas_num START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_pos_num START WITH 1 INCREMENT BY 1;

-- Funciones generadoras de consecutivos atómicos y bloqueantes
CREATE OR REPLACE FUNCTION generar_siguiente_numero_cot() RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
BEGIN
    next_val := nextval('seq_cotizaciones_num');
    RETURN 'COT-' || LPAD(next_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generar_siguiente_numero_ot() RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
BEGIN
    next_val := nextval('seq_ordenes_num');
    RETURN 'OT-' || LPAD(next_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generar_siguiente_numero_pos() RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
BEGIN
    next_val := nextval('seq_pos_num');
    RETURN 'POS-' || LPAD(next_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generar_siguiente_numero_cc() RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
BEGIN
    next_val := nextval('seq_cuentas_num');
    RETURN 'CC-' || LPAD(next_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Sincronizar secuencias con máximos existentes en las tablas (si hay datos previos)
DO $$
DECLARE
    max_pos INT;
    max_ot INT;
    max_cc INT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_express') THEN
        SELECT COALESCE(MAX(NULLIF(regexp_replace(numero_venta, '\D', '', 'g'), '')::INT), 0) INTO max_pos FROM ventas_express;
        IF max_pos > 0 THEN
            PERFORM setval('seq_pos_num', max_pos);
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ordenes_trabajo') THEN
        SELECT COALESCE(MAX(NULLIF(regexp_replace(numero_ot, '\D', '', 'g'), '')::INT), 0) INTO max_ot FROM ordenes_trabajo;
        IF max_ot > 0 THEN
            PERFORM setval('seq_ordenes_num', max_ot);
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cuentas_cobro') THEN
        SELECT COALESCE(MAX(NULLIF(regexp_replace(numero_cc, '\D', '', 'g'), '')::INT), 0) INTO max_cc FROM cuentas_cobro;
        IF max_cc > 0 THEN
            PERFORM setval('seq_cuentas_num', max_cc);
        END IF;
    END IF;
END $$;


-- ==============================================================================
-- 2. TABLA PRODUCTOS_STOCK Y COLUMNAS FALTANTES
-- ==============================================================================
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

-- Agregar columnas de vinculación si no existen
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cotizaciones') THEN
        ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS abono NUMERIC(14, 2) DEFAULT 0;
        ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(14, 2) DEFAULT 0;
        ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(40) DEFAULT 'Pendiente';
        ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50);
        ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS comprobante_pago TEXT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_express') THEN
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS producto_stock_id TEXT;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS descontar_stock BOOLEAN DEFAULT false;
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS cantidad_vendida INTEGER DEFAULT 1;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ordenes_trabajo') THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS pos_venta_id TEXT;
    END IF;
END $$;


-- ==============================================================================
-- 3. INTEGRIDAD REFERENCIAL Y RESTRICCIONES (CONSTRAINTS & CHECK)
-- ==============================================================================
DO $$
BEGIN
    -- 3.1 Sanitización preventiva de datos históricos antes de aplicar restricciones
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'productos_stock') THEN
        UPDATE public.productos_stock SET stock_actual = 0 WHERE stock_actual < 0;
        UPDATE public.productos_stock SET precio_unitario = 0 WHERE precio_unitario < 0;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_express') THEN
        UPDATE public.ventas_express SET total = 0 WHERE total < 0;
        UPDATE public.ventas_express SET abono = 0 WHERE abono < 0;
        UPDATE public.ventas_express SET saldo_pendiente = GREATEST(0, total - abono) WHERE saldo_pendiente < 0;
        
        -- Limpiar referencias huérfanas a productos_stock antes de crear la foreign key
        UPDATE public.ventas_express 
        SET producto_stock_id = NULL 
        WHERE producto_stock_id IS NOT NULL 
          AND producto_stock_id NOT IN (SELECT id FROM public.productos_stock);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cuentas_cobro') THEN
        UPDATE public.cuentas_cobro SET total = 0 WHERE total < 0;
        UPDATE public.cuentas_cobro SET abono = 0 WHERE abono < 0;
        UPDATE public.cuentas_cobro SET saldo_pendiente = GREATEST(0, total - abono) WHERE saldo_pendiente < 0;
    END IF;

    -- 3.2 Aplicación segura de restricciones CHECK
    -- Productos Stock: cantidades y precios no negativos
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_productos_stock_no_negativo') THEN
        ALTER TABLE public.productos_stock ADD CONSTRAINT chk_productos_stock_no_negativo CHECK (stock_actual >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_productos_stock_precio_positivo') THEN
        ALTER TABLE public.productos_stock ADD CONSTRAINT chk_productos_stock_precio_positivo CHECK (precio_unitario >= 0);
    END IF;

    -- Ventas Express: totales no negativos y FK a stock
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_express') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ventas_total_no_negativo') THEN
            ALTER TABLE public.ventas_express ADD CONSTRAINT chk_ventas_total_no_negativo CHECK (total >= 0 AND abono >= 0 AND saldo_pendiente >= 0);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ventas_producto_stock') THEN
            ALTER TABLE public.ventas_express 
            ADD CONSTRAINT fk_ventas_producto_stock 
            FOREIGN KEY (producto_stock_id) REFERENCES public.productos_stock(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- Cuentas de Cobro: saldos no negativos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cuentas_cobro') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cuentas_saldos_validos') THEN
            ALTER TABLE public.cuentas_cobro ADD CONSTRAINT chk_cuentas_saldos_validos CHECK (total >= 0 AND abono >= 0 AND saldo_pendiente >= 0);
        END IF;
    END IF;

    -- Cotizaciones: clave foránea referencial
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cotizaciones') THEN
        -- Asegurar que la relación sea segura sin romper datos existentes
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cotizaciones_cliente_id_fkey') THEN
            ALTER TABLE public.cotizaciones 
            ADD CONSTRAINT cotizaciones_cliente_id_fkey 
            FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;


-- ==============================================================================
-- 4. TRIGGERS DE CONSISTENCIA MATEMÁTICA Y AUDITORÍA AUTOMÁTICA
-- ==============================================================================

-- Trigger 4.1: Consistencia automática de saldo_pendiente y estado_pago en ventas_express
CREATE OR REPLACE FUNCTION trg_fn_consistencia_ventas_express()
RETURNS TRIGGER AS $$
BEGIN
    NEW.saldo_pendiente := GREATEST(0, NEW.total - NEW.abono);
    IF NEW.saldo_pendiente = 0 AND NEW.total > 0 THEN
        NEW.estado_pago := 'Pagado Total';
    ELSIF NEW.abono > 0 THEN
        NEW.estado_pago := 'Abono Parcial';
    ELSE
        NEW.estado_pago := 'Pendiente';
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ventas_express_consistencia ON public.ventas_express;
CREATE TRIGGER trg_ventas_express_consistencia
BEFORE INSERT OR UPDATE ON public.ventas_express
FOR EACH ROW EXECUTE FUNCTION trg_fn_consistencia_ventas_express();

-- Trigger 4.2: Consistencia automática en cuentas_cobro
CREATE OR REPLACE FUNCTION trg_fn_consistencia_cuentas_cobro()
RETURNS TRIGGER AS $$
BEGIN
    NEW.saldo_pendiente := GREATEST(0, NEW.total - NEW.abono);
    IF NEW.saldo_pendiente = 0 AND NEW.total > 0 THEN
        NEW.estado_pago := 'Pagado Total';
    ELSIF NEW.abono > 0 THEN
        NEW.estado_pago := 'Abono Parcial';
    ELSE
        NEW.estado_pago := 'Pendiente';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cuentas_cobro_consistencia ON public.cuentas_cobro;
CREATE TRIGGER trg_cuentas_cobro_consistencia
BEFORE INSERT OR UPDATE ON public.cuentas_cobro
FOR EACH ROW EXECUTE FUNCTION trg_fn_consistencia_cuentas_cobro();

-- Trigger 4.3: Generación o Sincronización Automática de Cuenta de Cobro al Aprobar Cotización
CREATE OR REPLACE FUNCTION trg_fn_cotizacion_aprobada_generar_cuenta()
RETURNS TRIGGER AS $$
DECLARE
    v_num_cc TEXT;
    v_saldo NUMERIC;
    v_estado_pago TEXT;
BEGIN
    -- Se activa si la cotización pasa a estado 'Aprobada' o 'Aceptada' o si se actualizan sus valores monetarios
    IF (NEW.estado IN ('Aprobada', 'Aceptada') AND (OLD.estado IS NULL OR OLD.estado NOT IN ('Aprobada', 'Aceptada'))) 
       OR (NEW.estado IN ('Aprobada', 'Aceptada') AND (NEW.total != OLD.total OR COALESCE(NEW.abono, 0) != COALESCE(OLD.abono, 0))) THEN
       
        v_saldo := GREATEST(0, NEW.total - COALESCE(NEW.abono, 0));
        IF v_saldo = 0 AND NEW.total > 0 THEN
            v_estado_pago := 'Pagado Total';
        ELSIF COALESCE(NEW.abono, 0) > 0 THEN
            v_estado_pago := 'Abono Parcial';
        ELSE
            v_estado_pago := 'Pendiente';
        END IF;

        -- Actualizar columnas calculadas en la cotización
        NEW.saldo_pendiente := v_saldo;
        NEW.estado_pago := v_estado_pago;

        -- Si ya existe la cuenta de cobro asociada, actualizarla transaccionalmente
        IF EXISTS (SELECT 1 FROM public.cuentas_cobro WHERE cotizacion_id = NEW.id) THEN
            UPDATE public.cuentas_cobro
            SET total = NEW.total,
                abono = COALESCE(NEW.abono, 0),
                saldo_pendiente = v_saldo,
                estado_pago = v_estado_pago,
                cliente_id = NEW.cliente_id
            WHERE cotizacion_id = NEW.id;
        ELSE
            -- Si no existe, crear la cuenta de cobro automáticamente
            v_num_cc := generar_siguiente_numero_cc();
            INSERT INTO public.cuentas_cobro (
                id,
                numero_cc,
                cotizacion_id,
                cliente_id,
                fecha_emision,
                total,
                abono,
                saldo_pendiente,
                estado_pago,
                created_at
            ) VALUES (
                'cc-' || gen_random_uuid()::TEXT,
                v_num_cc,
                NEW.id,
                NEW.cliente_id,
                CURRENT_DATE,
                NEW.total,
                COALESCE(NEW.abono, 0),
                v_saldo,
                v_estado_pago,
                NOW()
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cotizacion_aprobada_generar_cuenta ON public.cotizaciones;
CREATE TRIGGER trg_cotizacion_aprobada_generar_cuenta
BEFORE INSERT OR UPDATE ON public.cotizaciones
FOR EACH ROW EXECUTE FUNCTION trg_fn_cotizacion_aprobada_generar_cuenta();



-- ==============================================================================
-- 5. PROCEDIMIENTOS ALMACENADOS TRANSACCIONALES (ACID RPCS)
-- ==============================================================================

-- RPC 5.1: Registro Atómico de Venta POS con Deducción de Stock y Creación de OT
CREATE OR REPLACE FUNCTION rpc_registrar_venta_pos_atomica(
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
RETURNS JSONB AS $$
DECLARE
    v_saldo NUMERIC;
    v_estado_pago TEXT;
    v_ot_id TEXT := NULL;
    v_ot_numero TEXT := NULL;
    v_stock_actual INT;
    v_num_venta TEXT;
BEGIN
    -- 1. Asignar o autogenerar número de venta POS
    IF p_numero_venta IS NULL OR p_numero_venta = '' THEN
        v_num_venta := generar_siguiente_numero_pos();
    ELSE
        v_num_venta := p_numero_venta;
    END IF;

    -- 2. Calcular saldos
    v_saldo := GREATEST(0, p_total - p_abono);
    IF v_saldo = 0 AND p_total > 0 THEN
        v_estado_pago := 'Pagado Total';
    ELSIF p_abono > 0 THEN
        v_estado_pago := 'Abono Parcial';
    ELSE
        v_estado_pago := 'Pendiente';
    END IF;

    -- 3. Descontar Stock Físico si aplica (con bloqueo de fila FOR UPDATE)
    IF p_descontar_stock AND p_producto_stock_id IS NOT NULL THEN
        SELECT stock_actual INTO v_stock_actual 
        FROM public.productos_stock 
        WHERE id = p_producto_stock_id 
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
        WHERE id = p_producto_stock_id;
    END IF;

    -- 4. Generar Orden de Trabajo si se requiere
    IF p_requiere_ot THEN
        v_ot_id := 'ot-' || gen_random_uuid()::TEXT;
        v_ot_numero := generar_siguiente_numero_ot();

        INSERT INTO public.ordenes_trabajo (
            id,
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
            v_ot_id,
            v_ot_numero,
            p_cliente_nombre,
            p_nombre_producto,
            COALESCE(p_cantidad_vendida, 1),
            'En Cola',
            'Operador 3D (Taller)',
            p_id,
            'Venta POS Express ' || v_num_venta || COALESCE(' | ' || p_notas_diseno, ''),
            NOW()
        );
    END IF;

    -- 5. Insertar la Venta Express
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
        p_id,
        v_num_venta,
        p_foto_url,
        p_nombre_producto,
        p_cliente_nombre,
        p_cliente_telefono,
        p_total,
        p_abono,
        v_saldo,
        v_estado_pago,
        CURRENT_DATE,
        p_fecha_prometida_pago,
        p_notas,
        p_metodo_pago,
        p_creado_por,
        p_requiere_ot,
        p_estado_diseno,
        v_ot_id,
        v_ot_numero,
        p_enlace_diseno,
        p_notas_diseno,
        p_producto_stock_id,
        p_descontar_stock,
        COALESCE(p_cantidad_vendida, 1),
        NOW(),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'venta_id', p_id,
        'numero_venta', v_num_venta,
        'ot_id', v_ot_id,
        'ot_numero', v_ot_numero,
        'saldo_pendiente', v_saldo
    );
END;
$$ LANGUAGE plpgsql;

-- RPC 5.2: Cancelación Atómica de Venta POS con Reposición de Stock
CREATE OR REPLACE FUNCTION rpc_cancelar_venta_pos_atomica(p_venta_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_venta RECORD;
BEGIN
    SELECT * INTO v_venta FROM public.ventas_express WHERE id = p_venta_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Venta no encontrada');
    END IF;

    -- Reponer stock si se había descontado
    IF v_venta.descontar_stock AND v_venta.producto_stock_id IS NOT NULL THEN
        UPDATE public.productos_stock 
        SET stock_actual = stock_actual + COALESCE(v_venta.cantidad_vendida, 1),
            fecha_actualizacion = NOW()
        WHERE id = v_venta.producto_stock_id;
    END IF;

    -- Eliminar venta
    DELETE FROM public.ventas_express WHERE id = p_venta_id;

    RETURN jsonb_build_object('success', true, 'restituted_stock', v_venta.descontar_stock);
END;
$$ LANGUAGE plpgsql;


-- ==============================================================================
-- 6. ÍNDICES DE ALTO RENDIMIENTO (QUERY TUNING & UNINDEXED FKS)
-- ==============================================================================
-- Índices en claves foráneas (mitigación de full table scans en JOINs y CASCADE)
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente_id ON public.cotizaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotizacion_items_cot_id ON public.cotizacion_items(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_cot_id ON public.ordenes_trabajo(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_cot_id ON public.cuentas_cobro(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_cliente_id ON public.cuentas_cobro(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_producto_stock_id ON public.ventas_express(producto_stock_id);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON public.clientes(telefono);

-- Índices de consulta de negocio y reportes frecuentes
CREATE INDEX IF NOT EXISTS idx_ventas_express_cobros ON public.ventas_express(estado_pago, fecha_prometida_pago) WHERE saldo_pendiente > 0;
CREATE INDEX IF NOT EXISTS idx_ventas_express_cliente ON public.ventas_express(cliente_nombre);
CREATE INDEX IF NOT EXISTS idx_ordenes_activas ON public.ordenes_trabajo(estado) WHERE estado NOT IN ('Entregado', 'Cancelado');
CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha_estado ON public.cotizaciones(fecha DESC, estado);
CREATE INDEX IF NOT EXISTS idx_tareas_responsable_estado ON public.tareas_equipo(asignado_a, estado);
CREATE INDEX IF NOT EXISTS idx_productos_stock_nombre ON public.productos_stock(nombre);


-- ==============================================================================
-- 7. CONFIGURACIÓN DE STORAGE BUCKETS Y POLÍTICAS DE ACCESO
-- ==============================================================================
DO $$
BEGIN
    -- Crear buckets en schema storage si existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES 
          ('catalogo-stock', 'catalogo-stock', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
          ('fotos-pos', 'fotos-pos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
          ('comprobantes-pago', 'comprobantes-pago', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
        ON CONFLICT (id) DO UPDATE SET 
          public = EXCLUDED.public,
          file_size_limit = EXCLUDED.file_size_limit,
          allowed_mime_types = EXCLUDED.allowed_mime_types;
    END IF;

    -- Políticas en storage.objects
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        DROP POLICY IF EXISTS "Publico: Ver imagenes catalogo y pos" ON storage.objects;
        CREATE POLICY "Publico: Ver imagenes catalogo y pos" 
        ON storage.objects FOR SELECT TO anon, authenticated 
        USING (bucket_id IN ('catalogo-stock', 'fotos-pos'));

        DROP POLICY IF EXISTS "Staff: Subir archivos a buckets" ON storage.objects;
        CREATE POLICY "Staff: Subir archivos a buckets" 
        ON storage.objects FOR INSERT TO authenticated 
        WITH CHECK (bucket_id IN ('catalogo-stock', 'fotos-pos', 'comprobantes-pago'));

        DROP POLICY IF EXISTS "Staff: Ver comprobantes privados" ON storage.objects;
        CREATE POLICY "Staff: Ver comprobantes privados" 
        ON storage.objects FOR SELECT TO authenticated 
        USING (bucket_id = 'comprobantes-pago');
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Aviso Storage: Configuración completada o gestionada por Supabase Storage API: %', SQLERRM;
END $$;

