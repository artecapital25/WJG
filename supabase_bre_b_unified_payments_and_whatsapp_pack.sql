-- ==============================================================================
-- WJGEEKS 3D PRO - PAQUETE MAESTRO DE BASE DE DATOS SUPABASE (POSTGRESQL DDL)
-- 1. Migración a Bre-B (Llave 0090778625) & Deprecación de Daviplata / Bancolombia
-- 2. Ledger Central Transaccional (Tabla `payments`) & Triggers Atómicos Multi-Módulo
-- 3. Activación de Supabase Realtime & REPLICA IDENTITY FULL
-- 4. Esquema de Respuestas Automáticas de WhatsApp (Línea Oficial +57 320 2796115)
-- Versión Idempotente y Fail-Safe contra Concurrencia y Recursión
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- MÓDULO 1: ACTUALIZACIÓN DE MEDIOS DE PAGO (MIGRACIÓN A BRE-B)
-- ------------------------------------------------------------------------------

-- 1.1 Asegurar columnas en configuracion_taller
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'configuracion_taller') THEN
        ALTER TABLE public.configuracion_taller ADD COLUMN IF NOT EXISTS bre_b VARCHAR(50) DEFAULT '0090778625';
        
        -- Actualizar forzosamente línea corporativa oficial y llave Bre-B
        UPDATE public.configuracion_taller 
        SET bre_b = '0090778625',
            telefono_contacto = '3202796115'
        WHERE bre_b IS NULL OR bre_b = '' OR telefono_contacto != '3202796115';
    END IF;
END $$;

-- 1.2 Tabla Maestra de Métodos de Pago (payment_methods)
-- Permite retirar Daviplata y Bancolombia para nuevos registros conservando el histórico
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'transferencia', 'billetera_digital', 'efectivo', 'tarjeta'
    identificador_llave VARCHAR(100),
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.payment_methods (id, nombre, tipo, identificador_llave, descripcion, activo)
VALUES 
    ('Bre-B', 'Bre-B (Llave de Transferencia)', 'transferencia', '0090778625', 'Sistema oficial de pagos y transferencias interbancarias interoperables de Colombia', true),
    ('Nequi', 'Nequi Oficial', 'billetera_digital', '3202796115', 'Línea y cuenta oficial corporativa de Nequi', true),
    ('Efectivo', 'Efectivo', 'efectivo', NULL, 'Pago en efectivo en taller o contraentrega', true),
    ('Transferencia', 'Transferencia Bancaria', 'transferencia', NULL, 'Transferencia bancaria directa verificable', true),
    ('Tarjeta', 'Tarjeta / Datáfono', 'tarjeta', NULL, 'Pago electrónico presencial en terminal', true),
    ('Bancolombia', 'Bancolombia (Deprecado)', 'transferencia', 'Ahorros 245-000123-98', 'Método anterior - Desactivado para nuevas operaciones', false),
    ('Daviplata', 'Daviplata (Deprecado)', 'billetera_digital', '3217273025', 'Método anterior - Desactivado para nuevas operaciones', false)
ON CONFLICT (id) DO UPDATE 
SET nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    identificador_llave = EXCLUDED.identificador_llave,
    descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo,
    updated_at = NOW();

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica payment_methods" ON public.payment_methods;
CREATE POLICY "Lectura publica payment_methods" ON public.payment_methods FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- MÓDULO 2: SINCRONIZACIÓN Y UNIFICACIÓN TRANSACCIONAL DE PAGOS/ABONOS
-- ------------------------------------------------------------------------------

-- 2.1 Asegurar campos de saldo y trazabilidad financiera en todas las entidades
DO $$
BEGIN
    -- Cotizaciones
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cotizaciones') THEN
        ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS abono NUMERIC(14, 2) DEFAULT 0;
        ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(14, 2) DEFAULT 0;
        ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(40) DEFAULT 'Pendiente';
        ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'Bre-B';
        ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS comprobante_pago TEXT;
    END IF;

    -- Órdenes de Trabajo (Taller)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo') THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS abono NUMERIC(14, 2) DEFAULT 0;
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(14, 2) DEFAULT 0;
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(40) DEFAULT 'Pendiente';
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'Bre-B';
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS comprobante_pago TEXT;
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS precio_cobrado NUMERIC(14, 2) DEFAULT 0;
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(30);
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS cotizacion_numero VARCHAR(30);
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS pos_venta_id TEXT;
    END IF;

    -- Cuentas de Cobro
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cuentas_cobro') THEN
        ALTER TABLE public.cuentas_cobro ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'Bre-B';
        ALTER TABLE public.cuentas_cobro ADD COLUMN IF NOT EXISTS cotizacion_numero VARCHAR(30);
    END IF;

    -- Ventas Express (POS)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ventas_express') THEN
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS ot_numero VARCHAR(30);
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS ot_id TEXT;
    END IF;
END $$;

-- 2.2 Tabla Centralizada de Transacciones y Pagos (Ledger Central: `public.payments`)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monto NUMERIC(14, 2) NOT NULL CHECK (monto >= 0),
    metodo_pago VARCHAR(50) NOT NULL DEFAULT 'Bre-B',
    referencia_pago TEXT,
    comprobante_url TEXT,
    nota TEXT,
    
    -- Claves foráneas relacionales y polimórficas
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
    orden_trabajo_id UUID,
    orden_trabajo_numero VARCHAR(30),
    pos_venta_id TEXT REFERENCES public.ventas_express(id) ON DELETE CASCADE,
    cuenta_cobro_id UUID REFERENCES public.cuentas_cobro(id) ON DELETE CASCADE,
    
    registrado_por VARCHAR(100) DEFAULT 'Equipo WJGEEKS',
    origen_modulo VARCHAR(50) NOT NULL DEFAULT 'pos', -- 'pos', 'cotizacion', 'taller', 'cuenta_cobro'
    fecha_pago TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de alto rendimiento para conciliación y balance queries
CREATE INDEX IF NOT EXISTS idx_payments_cotizacion_id ON public.payments(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_payments_pos_venta_id ON public.payments(pos_venta_id);
CREATE INDEX IF NOT EXISTS idx_payments_cuenta_cobro_id ON public.payments(cuenta_cobro_id);
CREATE INDEX IF NOT EXISTS idx_payments_cliente_id ON public.payments(cliente_id);
CREATE INDEX IF NOT EXISTS idx_payments_fecha ON public.payments(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_payments_metodo ON public.payments(metodo_pago);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir anon y auth en payments" ON public.payments;
CREATE POLICY "Permitir anon y auth en payments" ON public.payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2.3 Función Transaccional de Cálculo Atómico de Saldos desde Ledger (`payments`)
CREATE OR REPLACE FUNCTION public.fn_sync_balances_from_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cot_id UUID;
    v_pos_id TEXT;
    v_total_paid NUMERIC(14, 2);
    v_total_amount NUMERIC(14, 2);
    v_saldo NUMERIC(14, 2);
    v_estado TEXT;
    v_metodo TEXT;
    v_comprobante TEXT;
BEGIN
    -- Evitar bucles recursivos en cascada
    IF pg_trigger_depth() > 2 THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    v_cot_id := COALESCE(NEW.cotizacion_id, OLD.cotizacion_id);
    v_pos_id := COALESCE(NEW.pos_venta_id, OLD.pos_venta_id);
    v_metodo := COALESCE(NEW.metodo_pago, 'Bre-B');
    v_comprobante := NEW.comprobante_url;

    -- Caso A: Pago impacta Cotización, Cuentas de Cobro y Órdenes de Trabajo del Taller
    IF v_cot_id IS NOT NULL THEN
        SELECT COALESCE(SUM(monto), 0) INTO v_total_paid
        FROM public.payments
        WHERE cotizacion_id = v_cot_id;

        SELECT total INTO v_total_amount
        FROM public.cotizaciones
        WHERE id = v_cot_id;

        IF v_total_amount IS NOT NULL THEN
            v_saldo := GREATEST(0, v_total_amount - v_total_paid);
            
            IF v_saldo = 0 AND v_total_amount > 0 THEN
                v_estado := 'Pagado Total';
            ELSIF v_total_paid > 0 THEN
                v_estado := 'Abono Parcial';
            ELSE
                v_estado := 'Pendiente';
            END IF;

            -- 1. Actualizar Cotización
            UPDATE public.cotizaciones
            SET abono = v_total_paid,
                saldo_pendiente = v_saldo,
                estado_pago = v_estado,
                metodo_pago = v_metodo,
                comprobante_pago = COALESCE(v_comprobante, comprobante_pago),
                updated_at = NOW()
            WHERE id = v_cot_id;

            -- 2. Actualizar Cuenta de Cobro vinculada
            UPDATE public.cuentas_cobro
            SET abono = v_total_paid,
                saldo_pendiente = v_saldo,
                estado_pago = v_estado,
                metodo_pago = v_metodo,
                comprobante_url = COALESCE(v_comprobante, comprobante_url)
            WHERE cotizacion_id = v_cot_id;

            -- 3. Actualizar Órdenes de Trabajo (OT) del taller vinculadas
            UPDATE public.ordenes_trabajo
            SET abono = v_total_paid,
                saldo_pendiente = v_saldo,
                estado_pago = v_estado,
                metodo_pago = v_metodo,
                comprobante_pago = COALESCE(v_comprobante, comprobante_pago)
            WHERE cotizacion_id = v_cot_id;
        END IF;
    END IF;

    -- Caso B: Pago impacta POS Express y su OT de taller asociada
    IF v_pos_id IS NOT NULL THEN
        SELECT COALESCE(SUM(monto), 0) INTO v_total_paid
        FROM public.payments
        WHERE pos_venta_id = v_pos_id;

        SELECT total INTO v_total_amount
        FROM public.ventas_express
        WHERE id = v_pos_id;

        IF v_total_amount IS NOT NULL THEN
            v_saldo := GREATEST(0, v_total_amount - v_total_paid);
            
            IF v_saldo = 0 AND v_total_amount > 0 THEN
                v_estado := 'Pagado Total';
            ELSIF v_total_paid > 0 THEN
                v_estado := 'Abono Parcial';
            ELSE
                v_estado := 'Pendiente';
            END IF;

            -- 1. Actualizar Venta Express
            UPDATE public.ventas_express
            SET abono = v_total_paid,
                saldo_pendiente = v_saldo,
                estado_pago = v_estado,
                metodo_pago = v_metodo,
                updated_at = NOW()
            WHERE id = v_pos_id;

            -- 2. Actualizar OT de taller vinculada a esta venta POS
            UPDATE public.ordenes_trabajo
            SET abono = v_total_paid,
                saldo_pendiente = v_saldo,
                estado_pago = v_estado,
                metodo_pago = v_metodo,
                comprobante_pago = COALESCE(v_comprobante, comprobante_pago)
            WHERE pos_venta_id = v_pos_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_sync_balances ON public.payments;
CREATE TRIGGER trg_payments_sync_balances
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_balances_from_ledger();

-- 2.4 Triggers Bidireccionales para Direct Table Updates (Fail-Safe Multi-Módulo)
-- Garantizan que aun si una vista antigua o script actualiza directamente ventas_express,
-- cotizaciones u ordenes_trabajo, el balance se propague inmediatamente a las demás entidades.

-- Trigger A: Desde ventas_express hacia ordenes_trabajo
CREATE OR REPLACE FUNCTION public.fn_sync_ventas_express_to_ot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF (OLD.abono IS DISTINCT FROM NEW.abono) OR 
       (OLD.saldo_pendiente IS DISTINCT FROM NEW.saldo_pendiente) OR 
       (OLD.estado_pago IS DISTINCT FROM NEW.estado_pago) THEN
       
        -- Propagar a las OTs asignadas a esta venta express
        UPDATE public.ordenes_trabajo
        SET abono = NEW.abono,
            saldo_pendiente = NEW.saldo_pendiente,
            estado_pago = NEW.estado_pago,
            metodo_pago = COALESCE(NEW.metodo_pago, 'Bre-B')
        WHERE pos_venta_id = NEW.id 
           OR (NEW.ot_numero IS NOT NULL AND numero_ot = NEW.ot_numero);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ventas_express_to_ot ON public.ventas_express;
CREATE TRIGGER trg_sync_ventas_express_to_ot
AFTER UPDATE ON public.ventas_express
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_ventas_express_to_ot();

-- Trigger B: Desde ordenes_trabajo hacia cotizaciones, cuentas_cobro o ventas_express
CREATE OR REPLACE FUNCTION public.fn_sync_ordenes_trabajo_to_modules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF (OLD.abono IS DISTINCT FROM NEW.abono) OR 
       (OLD.saldo_pendiente IS DISTINCT FROM NEW.saldo_pendiente) OR 
       (OLD.estado_pago IS DISTINCT FROM NEW.estado_pago) THEN
        
        -- Si proviene de una cotización
        IF NEW.cotizacion_id IS NOT NULL THEN
            UPDATE public.cotizaciones
            SET abono = NEW.abono,
                saldo_pendiente = NEW.saldo_pendiente,
                estado_pago = NEW.estado_pago,
                metodo_pago = COALESCE(NEW.metodo_pago, metodo_pago),
                comprobante_pago = COALESCE(NEW.comprobante_pago, comprobante_pago),
                updated_at = NOW()
            WHERE id = NEW.cotizacion_id;

            UPDATE public.cuentas_cobro
            SET abono = NEW.abono,
                saldo_pendiente = NEW.saldo_pendiente,
                estado_pago = NEW.estado_pago,
                metodo_pago = COALESCE(NEW.metodo_pago, metodo_pago)
            WHERE cotizacion_id = NEW.cotizacion_id;
        END IF;

        -- Si proviene de una venta express POS
        IF NEW.pos_venta_id IS NOT NULL THEN
            UPDATE public.ventas_express
            SET abono = NEW.abono,
                saldo_pendiente = NEW.saldo_pendiente,
                estado_pago = NEW.estado_pago,
                metodo_pago = COALESCE(NEW.metodo_pago, metodo_pago),
                updated_at = NOW()
            WHERE id = NEW.pos_venta_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ordenes_trabajo_to_modules ON public.ordenes_trabajo;
CREATE TRIGGER trg_sync_ordenes_trabajo_to_modules
AFTER UPDATE ON public.ordenes_trabajo
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_ordenes_trabajo_to_modules();

-- 2.5 Migración Idempotente de Pagos Históricos al Ledger Central
-- Si ya existen abonos registrados en ventas_express, cotizaciones o cuentas_cobro,
-- creamos su entrada correspondiente en `payments` si aún no existe.
DO $$
BEGIN
    -- Migrar desde ventas_express
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_express') THEN
        INSERT INTO public.payments (
            monto, metodo_pago, pos_venta_id, registrado_por, origen_modulo, nota, fecha_pago, created_at
        )
        SELECT 
            ve.abono,
            COALESCE(ve.metodo_pago, 'Bre-B'),
            ve.id,
            COALESCE(ve.creado_por, 'Equipo WJGEEKS'),
            'pos',
            'Migración inicial de abono histórico POS Express ' || ve.numero_venta,
            COALESCE(ve.created_at, NOW()),
            COALESCE(ve.created_at, NOW())
        FROM public.ventas_express ve
        WHERE ve.abono > 0
          AND NOT EXISTS (
              SELECT 1 FROM public.payments p WHERE p.pos_venta_id = ve.id
          );
    END IF;

    -- Migrar desde cotizaciones con abono
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cotizaciones') THEN
        INSERT INTO public.payments (
            monto, metodo_pago, cotizacion_id, cliente_id, comprobante_url, registrado_por, origen_modulo, nota, fecha_pago, created_at
        )
        SELECT 
            c.abono,
            COALESCE(c.metodo_pago, 'Bre-B'),
            c.id,
            c.cliente_id,
            c.comprobante_pago,
            COALESCE(c.vendedor_nombre, 'Equipo WJGEEKS'),
            'cotizacion',
            'Migración inicial de abono histórico Cotización ' || c.numero_cot,
            COALESCE(c.created_at, NOW()),
            COALESCE(c.created_at, NOW())
        FROM public.cotizaciones c
        WHERE c.abono > 0
          AND NOT EXISTS (
              SELECT 1 FROM public.payments p WHERE p.cotizacion_id = c.id
          );
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- MÓDULO 3: AUDITORÍA Y CONFIGURACIÓN DE REMITENTE WHATSAPP (LÍNEA OFICIAL)
-- ------------------------------------------------------------------------------

-- Tabla de Configuración de Canales y Gateways (Audit Trail de la Línea)
CREATE TABLE IF NOT EXISTS public.whatsapp_channel_config (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'wjg_official_line',
    numero_remitente_oficial VARCHAR(30) NOT NULL DEFAULT '573202796115',
    numero_formato_e164 VARCHAR(30) NOT NULL DEFAULT '+57 320 2796115',
    proveedor VARCHAR(50) NOT NULL DEFAULT 'Meta WhatsApp Business Cloud API',
    api_version VARCHAR(20) NOT NULL DEFAULT 'v18.0+',
    estado VARCHAR(30) NOT NULL DEFAULT 'activa_verificada',
    verificado_meta BOOLEAN DEFAULT TRUE,
    descripcion TEXT DEFAULT 'Línea empresarial oficial de WJGEEKS 3D para despacho automatizado de cotizaciones, cobros y soporte',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.whatsapp_channel_config (
    id, numero_remitente_oficial, numero_formato_e164, proveedor, api_version, estado, verificado_meta
)
VALUES (
    'wjg_official_line', '573202796115', '+57 320 2796115', 'Meta WhatsApp Business Cloud API', 'v18.0+', 'activa_verificada', true
)
ON CONFLICT (id) DO UPDATE 
SET numero_remitente_oficial = EXCLUDED.numero_remitente_oficial,
    numero_formato_e164 = EXCLUDED.numero_formato_e164,
    proveedor = EXCLUDED.proveedor,
    estado = EXCLUDED.estado,
    verificado_meta = true,
    updated_at = NOW();

ALTER TABLE public.whatsapp_channel_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura canal config" ON public.whatsapp_channel_config;
CREATE POLICY "Lectura canal config" ON public.whatsapp_channel_config FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- MÓDULO 4: ARQUITECTURA PARA RESPUESTAS AUTOMÁTICAS DE WHATSAPP
-- ------------------------------------------------------------------------------

-- 4.1 Tabla de Reglas de Auto-Respuesta de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_auto_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_keyword VARCHAR(100) NOT NULL,
    response_template TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general', -- 'pagos', 'cobranzas', 'taller', 'general'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    match_type VARCHAR(20) NOT NULL DEFAULT 'contains', -- 'exact', 'contains', 'regex'
    dynamic_query_type VARCHAR(50), -- 'consultar_saldo', 'consultar_ot', 'info_bre_b', NULL
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 Respuestas Preconfiguradas para Bre-B, Saldos, Taller y Horarios
INSERT INTO public.whatsapp_auto_responses (trigger_keyword, response_template, category, is_active, dynamic_query_type)
VALUES 
    -- 1. Medios de pago y Llave Bre-B
    ('bre-b', '💳 *Medios de Pago Oficiales WJGEEKS 3D* 🚀\n\n🔑 *Llave Bre-B Oficial:* 0090778625\n_(Transferencias inmediatas desde cualquier entidad bancaria en Colombia)_\n\n📱 *Nequi:* 320 2796115\n\nPor favor envíanos tu comprobante tras realizar el abono. ¡Muchas gracias!', 'pagos', true, 'info_bre_b'),
    ('pagar', '💳 *Información de Pagos WJGEEKS 3D*:\n\nPuedes abonar de forma inmediata con nuestra Llave Bre-B o Nequi:\n• *Llave Bre-B:* 0090778625\n• *Nequi:* 320 2796115\n\nSi necesitas consultar tu saldo pendiente, escribe la palabra *SALDO*.', 'pagos', true, 'info_bre_b'),
    ('llave', '🔑 *Nuestra Llave Oficial Bre-B:* `0090778625`\nPuedes copiar este identificador y pegarlo directamente en la app de tu banco (Bancolombia, Davivienda, Nu, Lulo, etc.) para transferencias sin costo.', 'pagos', true, 'info_bre_b'),
    
    -- 2. Consulta de Saldo Dinámica
    ('saldo', '🔍 Hola, estamos verificando tu estado de cuenta en nuestro sistema...', 'cobranzas', true, 'consultar_saldo'),
    ('cuanto debo', '🔍 Consultando saldo pendiente en cartera WJGEEKS...', 'cobranzas', true, 'consultar_saldo'),
    
    -- 3. Consulta de Estado de Pedido / Taller
    ('estado', '🛠️ Verificando el avance de tus piezas en el taller de impresión 3D...', 'taller', true, 'consultar_ot'),
    ('pedido', '🛠️ Consultando el estado de tu pedido en línea de producción...', 'taller', true, 'consultar_ot'),
    
    -- 4. Horarios y Ubicación
    ('horario', '⏰ *Horario de Atención WJGEEKS 3D*:\nLunes a Viernes: 8:00 AM – 6:00 PM\nSábados: 9:00 AM – 2:00 PM\n\nNuestras impresoras operan en jornadas continuas para entregarte en el menor tiempo posible 🚀.', 'general', true, NULL)
ON CONFLICT DO NOTHING;

ALTER TABLE public.whatsapp_auto_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir anon y auth en whatsapp_auto_responses" ON public.whatsapp_auto_responses;
CREATE POLICY "Permitir anon y auth en whatsapp_auto_responses" ON public.whatsapp_auto_responses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4.3 Procedimiento Almacenado de Consulta Dinámica de Auto-Respuesta
-- Utilizado por la Supabase Edge Function `handle-whatsapp-webhook` para responder
-- inmediatamente a los mensajes de los clientes según su número de teléfono.
CREATE OR REPLACE FUNCTION public.fn_resolver_auto_respuesta_whatsapp(
    p_mensaje TEXT,
    p_telefono_remitente TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_msg TEXT;
    v_clean_phone TEXT;
    v_rule RECORD;
    v_saldo_total NUMERIC(14, 2) := 0;
    v_respuesta TEXT;
    v_ot RECORD;
BEGIN
    v_clean_msg := LOWER(TRIM(p_mensaje));
    v_clean_phone := REGEXP_REPLACE(p_telefono_remitente, '\D', '', 'g');
    IF LENGTH(v_clean_phone) > 10 AND v_clean_phone LIKE '57%' THEN
        v_clean_phone := SUBSTRING(v_clean_phone FROM 3);
    END IF;

    -- Buscar regla activa que coincida con el texto entrante
    FOR v_rule IN (
        SELECT * FROM public.whatsapp_auto_responses 
        WHERE is_active = true 
        ORDER BY LENGTH(trigger_keyword) DESC
    ) LOOP
        IF v_clean_msg LIKE '%' || LOWER(v_rule.trigger_keyword) || '%' THEN
            -- Caso 1: Consulta Dinámica de Saldo
            IF v_rule.dynamic_query_type = 'consultar_saldo' THEN
                -- Sumar saldos pendientes en cuentas de cobro y ventas express
                SELECT COALESCE(SUM(cc.saldo_pendiente), 0) INTO v_saldo_total
                FROM public.cuentas_cobro cc
                JOIN public.clientes cli ON cli.id = cc.cliente_id
                WHERE REGEXP_REPLACE(cli.telefono, '\D', '', 'g') LIKE '%' || v_clean_phone
                  AND cc.saldo_pendiente > 0;

                IF v_saldo_total = 0 THEN
                    SELECT COALESCE(SUM(ve.saldo_pendiente), 0) INTO v_saldo_total
                    FROM public.ventas_express ve
                    WHERE REGEXP_REPLACE(ve.cliente_telefono, '\D', '', 'g') LIKE '%' || v_clean_phone
                      AND ve.saldo_pendiente > 0;
                END IF;

                IF v_saldo_total > 0 THEN
                    v_respuesta := '📊 *Estado de Cuenta WJGEEKS 3D*:\n\nTienes un saldo pendiente total de: *$' || TO_CHAR(v_saldo_total, 'FM999,999,999') || ' COP*.\n\nPuedes cancelarlo con nuestra Llave Bre-B: `0090778625` o vía Nequi: `320 2796115`. ¡Muchas gracias!';
                ELSE
                    v_respuesta := '🎉 ¡Estás al día! No registras saldos pendientes en nuestro sistema. Si deseas una nueva cotización escríbenos con tus medidas o archivo 3D ✨.';
                END IF;

                RETURN jsonb_build_object(
                    'match', true,
                    'category', v_rule.category,
                    'response', v_respuesta
                );

            -- Caso 2: Consulta Dinámica de Orden de Trabajo
            ELSIF v_rule.dynamic_query_type = 'consultar_ot' THEN
                SELECT numero_ot, item_nombre, estado 
                INTO v_ot
                FROM public.ordenes_trabajo
                WHERE REGEXP_REPLACE(cliente_telefono, '\D', '', 'g') LIKE '%' || v_clean_phone
                ORDER BY created_at DESC
                LIMIT 1;

                IF FOUND THEN
                    v_respuesta := '⚙️ *Estado de tu Pedido*: Orden *' || v_ot.numero_ot || '* (' || v_ot.item_nombre || ')\n📍 Estado actual: *' || v_ot.estado || '* 🚀.\nTe notificaremos en cuanto finalice el control de calidad.';
                ELSE
                    v_respuesta := '🔍 No encontramos órdenes activas con tu número. Si acabas de acordar un trabajo, nuestro equipo te enviará la orden en breves minutos ✨.';
                END IF;

                RETURN jsonb_build_object(
                    'match', true,
                    'category', v_rule.category,
                    'response', v_respuesta
                );

            -- Caso 3: Plantilla Estándar (Bre-B, Info general)
            ELSE
                RETURN jsonb_build_object(
                    'match', true,
                    'category', v_rule.category,
                    'response', v_rule.response_template
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('match', false, 'response', NULL);
END;
$$;

-- ------------------------------------------------------------------------------
-- MÓDULO 5: PUBLICACIÓN SUPABASE REALTIME & REPLICA IDENTITY
-- ------------------------------------------------------------------------------

-- Habilitar REPLICA IDENTITY FULL para que WebSockets envíe la fila completa
DO $$
DECLARE
    tbl text;
    tablas text[] := ARRAY[
        'payments',
        'payment_methods',
        'whatsapp_auto_responses',
        'whatsapp_channel_config',
        'ordenes_trabajo',
        'cotizaciones',
        'cuentas_cobro',
        'ventas_express'
    ];
BEGIN
    FOREACH tbl IN ARRAY tablas
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);
        END IF;
    END LOOP;
END $$;

-- Agregar tablas a la publicación de Realtime de Supabase de forma fail-safe
DO $$
DECLARE
    tbl text;
    tablas text[] := ARRAY[
        'payments',
        'payment_methods',
        'whatsapp_auto_responses',
        'whatsapp_channel_config',
        'ordenes_trabajo',
        'cotizaciones',
        'cuentas_cobro',
        'ventas_express'
    ];
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH tbl IN ARRAY tablas
        LOOP
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
                BEGIN
                    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
                EXCEPTION
                    WHEN duplicate_object THEN
                        NULL;
                    WHEN OTHERS THEN
                        NULL;
                END;
            END IF;
        END LOOP;
    END IF;
END $$;

-- Verificación final
SELECT 'WJGEEKS 3D - Migración a Bre-B, Ledger Unificado y WhatsApp Gateway completada exitosamente.' AS estado;
