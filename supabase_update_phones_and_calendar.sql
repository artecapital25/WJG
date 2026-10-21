-- ==============================================================================
-- WJGEEKS 3D PRO - SCRIPT MAESTRO DE PARCHE Y CONSOLIDACIÓN TÉCNICA
-- Actualización de Teléfonos Oficiales, Calendario, WhatsApp y Sincronización Realtime
-- Versión Idempotente y Fail-Safe contra Errores de Sintaxis y Duplicados
-- ==============================================================================

-- 1. ACTUALIZACIÓN INMEDIATA DE TELÉFONOS DEL PERSONAL EN USUARIOS_SISTEMA
-- Números canónicos:
-- Germán: 350 3443140
-- Wendy:  320 4814702
-- Juan:   321 7273025

CREATE TABLE IF NOT EXISTS public.usuarios_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefono_whatsapp VARCHAR(30) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'taller', -- 'admin', 'pos', 'taller', 'cobranzas'
    password_hash VARCHAR(64) NOT NULL,
    must_change_password BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    dispositivo_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actualizar si ya existen o insertar si no están registrados
INSERT INTO public.usuarios_sistema (nombre, email, telefono_whatsapp, rol, password_hash, must_change_password, activo)
VALUES 
    ('Germán (Admin)', 'german@wjgeeks.com', '3503443140', 'admin', 'bbcfa57ecf8a672f1d0f9a0d796e10de46c29095f6cb7a7cf5e7102ecb290ca0', false, true),
    ('Wendy (Finanzas)', 'wendy@wjgeeks.com', '3204814702', 'cobranzas', '03efa8e49bc68e7ec8ff1ceb76ffcfa6beab15f8a2a51a941bf21d4d8fc5ea19', false, true),
    ('Juan (Producción)', 'juan@wjgeeks.com', '3217273025', 'taller', 'c40a5a51052dd5fc321cf73812833134bc20c7cc67389ee46ab05eefae02a803', false, true)
ON CONFLICT (email) DO UPDATE 
SET telefono_whatsapp = EXCLUDED.telefono_whatsapp,
    rol = EXCLUDED.rol,
    nombre = EXCLUDED.nombre,
    activo = true,
    updated_at = NOW();

-- Garantizar actualización forzosa en caso de coincidencia por rol o nombre
UPDATE public.usuarios_sistema SET telefono_whatsapp = '3503443140' WHERE email = 'german@wjgeeks.com';
UPDATE public.usuarios_sistema SET telefono_whatsapp = '3204814702' WHERE email = 'wendy@wjgeeks.com';
UPDATE public.usuarios_sistema SET telefono_whatsapp = '3217273025' WHERE email = 'juan@wjgeeks.com';

-- 2. SOLUCIÓN RESILIENTE PARA ÍNDICES Y CONFLICTOS EN TABLA CLIENTES (ERROR 23505)
DO $$
BEGIN
    -- Si la tabla clientes existe, asegurar que no falle por duplicados
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clientes') THEN
        -- Crear índice estándar no restrictivo si el índice único falló previamente por duplicados
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'clientes' AND indexname = 'idx_clientes_telefono') THEN
            CREATE INDEX idx_clientes_telefono ON public.clientes(telefono);
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. CALENDARIO OPERATIVO INTEGRAL (TABLA CALENDAR_EVENTS)
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ,
    todo_el_dia BOOLEAN DEFAULT FALSE,
    tipo_evento VARCHAR(50) NOT NULL, 
    -- 'tarea_individual', 'tarea_grupal', 'rutina_diaria', 'vencimiento_cobro', 'entrega_pedido', 'llegada_insumo', 'vencimiento_cotizacion'
    color VARCHAR(30) DEFAULT '#0ea5e9',
    responsable VARCHAR(100) DEFAULT 'Todos',
    responsable_avatar_url TEXT,
    es_recurrente BOOLEAN DEFAULT FALSE,
    regla_recurrencia VARCHAR(50), -- 'diaria', 'semanal', 'quincenal', 'mensual'
    estado VARCHAR(30) DEFAULT 'pendiente', -- 'pendiente', 'en_progreso', 'completado', 'cancelado'
    entidad_origen_tipo VARCHAR(50), -- 'orden_trabajo', 'cuenta_cobro', 'cotizacion', 'tarea_equipo', 'solicitud_insumo', 'evento_manual'
    entidad_origen_id TEXT,
    creado_por UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_fechas ON public.calendar_events(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_calendar_tipo ON public.calendar_events(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_calendar_responsable ON public.calendar_events(responsable);
CREATE INDEX IF NOT EXISTS idx_calendar_entidad ON public.calendar_events(entidad_origen_tipo, entidad_origen_id);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Colaborativo: CRUD calendar_events" ON public.calendar_events;
CREATE POLICY "Colaborativo: CRUD calendar_events" ON public.calendar_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Función de sincronización bidireccional al mover o reprogramar eventos del calendario
CREATE OR REPLACE FUNCTION public.sync_calendar_event_to_source(
    p_event_id UUID,
    p_nueva_fecha_inicio TIMESTAMPTZ,
    p_nueva_fecha_fin TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event RECORD;
BEGIN
    SELECT * INTO v_event FROM public.calendar_events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Evento de calendario no encontrado');
    END IF;

    UPDATE public.calendar_events
    SET fecha_inicio = p_nueva_fecha_inicio,
        fecha_fin = COALESCE(p_nueva_fecha_fin, p_nueva_fecha_inicio),
        updated_at = NOW()
    WHERE id = p_event_id;

    IF v_event.entidad_origen_tipo = 'orden_trabajo' AND v_event.entidad_origen_id IS NOT NULL THEN
        UPDATE public.ordenes_trabajo
        SET fecha_finalizacion = p_nueva_fecha_inicio
        WHERE id::TEXT = v_event.entidad_origen_id OR numero_ot = v_event.entidad_origen_id;

    ELSIF v_event.entidad_origen_tipo = 'cuenta_cobro' AND v_event.entidad_origen_id IS NOT NULL THEN
        UPDATE public.cuentas_cobro
        SET fecha_emision = p_nueva_fecha_inicio::DATE
        WHERE id::TEXT = v_event.entidad_origen_id OR numero_cc = v_event.entidad_origen_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'event_id', p_event_id,
        'entidad_origen', v_event.entidad_origen_tipo,
        'nueva_fecha', p_nueva_fecha_inicio
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_calendar_event_to_source(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

-- 4. MENSAJERÍA DESATENDIDA POR WHATSAPP (TABLA WHATSAPP_NOTIFICATION_LOGS)
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(160) UNIQUE NOT NULL,
    destinatario_telefono VARCHAR(30) NOT NULL,
    destinatario_nombre VARCHAR(150),
    tipo_mensaje VARCHAR(50) NOT NULL, -- 'alerta_cobranza', 'alerta_ot_estado', 'alerta_tarea', 'recuperacion_otp'
    plantilla_id VARCHAR(100),
    contenido TEXT NOT NULL,
    estado VARCHAR(30) DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'failed'
    proveedor VARCHAR(50) DEFAULT 'whatsapp_cloud_api',
    id_externo VARCHAR(200),
    error_detalle TEXT,
    intentos INTEGER DEFAULT 0,
    max_intentos INTEGER DEFAULT 3,
    proximo_reintento_at TIMESTAMPTZ DEFAULT NOW(),
    entidad_tipo VARCHAR(50),
    entidad_id TEXT,
    enviado_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_cola_estado ON public.whatsapp_notification_logs(estado, proximo_reintento_at);
CREATE INDEX IF NOT EXISTS idx_wa_cola_idempotency ON public.whatsapp_notification_logs(idempotency_key);

ALTER TABLE public.whatsapp_notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Colaborativo: CRUD whatsapp_notification_logs" ON public.whatsapp_notification_logs;
CREATE POLICY "Colaborativo: CRUD whatsapp_notification_logs" ON public.whatsapp_notification_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. SINCRONIZACIÓN MULTI-DISPOSITIVO EN TIEMPO REAL (SUPABASE REALTIME)
-- Configuración de REPLICA IDENTITY FULL para capturar registros completos en updates/deletes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo') THEN
        ALTER TABLE public.ordenes_trabajo REPLICA IDENTITY FULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cuentas_cobro') THEN
        ALTER TABLE public.cuentas_cobro REPLICA IDENTITY FULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cotizaciones') THEN
        ALTER TABLE public.cotizaciones REPLICA IDENTITY FULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ventas_express') THEN
        ALTER TABLE public.ventas_express REPLICA IDENTITY FULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_events') THEN
        ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_notification_logs') THEN
        ALTER TABLE public.whatsapp_notification_logs REPLICA IDENTITY FULL;
    END IF;
END $$;

-- Agregar tablas a la publicación de Realtime si no están ya agregadas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_notification_logs;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.ordenes_trabajo;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.cuentas_cobro;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.cotizaciones;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.ventas_express;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- 6. VERIFICACIÓN FINAL DE RESULTADOS
SELECT 
    nombre, 
    email, 
    telefono_whatsapp, 
    rol, 
    activo, 
    updated_at 
FROM public.usuarios_sistema 
ORDER BY nombre;
