-- ==============================================================================
-- WJGEEKS 3D PRO - PAQUETE AVANZADO ENTERPRISE: CALENDARIO, NOTIFICACIONES,
-- RBAC DINÁMICO, TRACKING SEGURO AISLADO Y AUDITORÍA DE SEGURIDAD
-- Motor: PostgreSQL 15+ / Supabase Engine
-- Autor: Principal Software Architect & Lead Security Engineer
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. CONTROL DE ACCESO PROGRESIVO Y RBAC DINÁMICO (MÓDULO 1)
-- ==============================================================================

-- 1.1 Tabla de Parámetros de Sistema y Modo de Colaboración
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(80) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuración por defecto: Modo Colaborativo Abierto (Fase Actual)
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'security_mode',
    '{"colaborativo_global": true, "enforce_strict_rbac": false}'::JSONB,
    'Fase actual de acceso colaborativo total vs RBAC estricto para nuevos empleados'
)
ON CONFLICT (key) DO NOTHING;

-- 1.2 Catálogo de Roles Empresariales
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 Catálogo de Permisos Granulares
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100) UNIQUE NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 Matriz de Relación Roles <-> Permisos
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- 1.5 Asignación de Roles a Usuarios de Supabase Auth
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Referencia opcional a auth.users si existe
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- 1.6 Población Inicial de Roles y Permisos Estándar
INSERT INTO public.roles (codigo, nombre, descripcion, is_system) VALUES
('superadmin', 'Super Administrador', 'Control total técnico y de negocio', true),
('admin_taller', 'Administrador de Taller', 'Gestión integral de producción, personal e insumos', true),
('vendedor_pos', 'Vendedor / Punto de Venta', 'Emisión de cotizaciones, ventas POS y registro de cobros', true),
('operario_3d', 'Operario de Impresión y Postprocesado', 'Manejo de cola de OTs, lavado, curado y pintura', true),
('contador', 'Contador / Cobranzas', 'Auditoría de cuentas de cobro, conciliación y finanzas', true),
('cliente_portal', 'Cliente (Portal Limitado)', 'Solo lectura de su pedido vía token criptográfico', true)
ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

INSERT INTO public.permissions (codigo, modulo, descripcion) VALUES
('cotizaciones.crear', 'cotizaciones', 'Crear y calcular cotizaciones técnicas'),
('cotizaciones.aprobar', 'cotizaciones', 'Aprobar cotización y enviar a taller'),
('cotizaciones.editar', 'cotizaciones', 'Modificar valores y piezas de cotización'),
('cotizaciones.eliminar', 'cotizaciones', 'Eliminar o anular cotizaciones'),
('pos.vender', 'pos', 'Registrar ventas express en punto de venta'),
('pos.cancelar', 'pos', 'Anular o revertir ventas express'),
('taller.ver_ots', 'taller', 'Visualizar cola y órdenes de fabricación'),
('taller.cambiar_estado', 'taller', 'Avanzar etapa (imprimiendo, curado, listo)'),
('taller.asignar_operador', 'taller', 'Asignar técnico responsable de pieza'),
('cuentas.ver', 'finanzas', 'Visualizar cartera y cuentas de cobro'),
('cuentas.registrar_abono', 'finanzas', 'Registrar pagos y liquidar saldos'),
('cuentas.eliminar', 'finanzas', 'Eliminar cuentas de cobro'),
('insumos.solicitar', 'insumos', 'Emitir solicitudes SOS de compra de insumos'),
('insumos.gestionar_stock', 'insumos', 'Actualizar inventario físico y costos'),
('tareas.crear', 'equipo', 'Asignar tareas al cronograma'),
('tareas.completar', 'equipo', 'Marcar tareas finalizadas'),
('calendario.gestionar', 'calendario', 'Crear y reubicar eventos en el calendario'),
('sistema.administrar_usuarios', 'seguridad', 'Asignar roles y permisos a empleados')
ON CONFLICT (codigo) DO NOTHING;

-- Asignar todos los permisos al rol superadmin y admin_taller
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r 
CROSS JOIN public.permissions p
WHERE r.codigo IN ('superadmin', 'admin_taller')
ON CONFLICT DO NOTHING;

-- Asignar permisos específicos a vendedor_pos
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.codigo = 'vendedor_pos' 
  AND p.codigo IN ('cotizaciones.crear', 'cotizaciones.aprobar', 'pos.vender', 'cuentas.ver', 'cuentas.registrar_abono', 'taller.ver_ots')
ON CONFLICT DO NOTHING;

-- Asignar permisos específicos a operario_3d
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.codigo = 'operario_3d' 
  AND p.codigo IN ('taller.ver_ots', 'taller.cambiar_estado', 'insumos.solicitar', 'tareas.ver_tareas', 'tareas.completar')
ON CONFLICT DO NOTHING;

-- 1.7 Función Evaluadora de Permisos (Respetando Fase Actual Colaborativa)
CREATE OR REPLACE FUNCTION public.has_permission(p_permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_colaborativo BOOLEAN;
    v_user_id UUID;
    v_has BOOLEAN := FALSE;
BEGIN
    -- 1. Verificar si estamos en Fase Actual (Acceso Total Colaborativo)
    SELECT (value->>'colaborativo_global')::BOOLEAN INTO v_colaborativo
    FROM public.system_settings
    WHERE key = 'security_mode';

    IF v_colaborativo IS TRUE OR v_colaborativo IS NULL THEN
        -- Durante la fase colaborativa actual, todo usuario del equipo tiene acceso completo
        RETURN TRUE;
    END IF;

    -- 2. Fase Estricta Futura: Verificar usuario autenticado
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 3. Superadministradores siempre tienen acceso
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_user_id AND r.codigo = 'superadmin'
    ) THEN
        RETURN TRUE;
    END IF;

    -- 4. Verificar permiso específico asignado
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = v_user_id AND p.codigo = p_permission_code
    ) INTO v_has;

    RETURN v_has;
END;
$$;

-- ==============================================================================
-- 2. CALENDARIO OPERATIVO INTEGRAL Y CRONOGRAMA CENTRALIZADO (MÓDULO 2)
-- ==============================================================================

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
    creado_por UUID DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices optimizados para consultas por rango de fecha en el calendario
CREATE INDEX IF NOT EXISTS idx_calendar_fechas ON public.calendar_events(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_calendar_tipo ON public.calendar_events(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_calendar_responsable ON public.calendar_events(responsable);
CREATE INDEX IF NOT EXISTS idx_calendar_entidad ON public.calendar_events(entidad_origen_tipo, entidad_origen_id);

-- Función para actualizar la entidad de origen al reprogramar una fecha en el calendario
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

    -- 1. Actualizar el evento en calendario
    UPDATE public.calendar_events
    SET fecha_inicio = p_nueva_fecha_inicio,
        fecha_fin = COALESCE(p_nueva_fecha_fin, p_nueva_fecha_inicio),
        updated_at = NOW()
    WHERE id = p_event_id;

    -- 2. Propagación según tipo de entidad
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

-- ==============================================================================
-- 3. BITÁCORA Y COLA DE ALERTAS POR WHATSAPP (MÓDULO 3)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destinatario_telefono VARCHAR(30) NOT NULL,
    destinatario_nombre VARCHAR(150),
    tipo_mensaje VARCHAR(50) NOT NULL, 
    -- 'alerta_cobranza', 'alerta_tarea_asignada', 'alerta_ot_estado', 'sos_insumo', 'recordatorio_vencimiento'
    plantilla_id VARCHAR(100),
    contenido TEXT NOT NULL,
    estado VARCHAR(30) DEFAULT 'enviado', -- 'pendiente', 'enviado', 'entregado', 'fallido', 'leido'
    proveedor VARCHAR(50) DEFAULT 'whatsapp_cloud_api', -- 'whatsapp_cloud_api', 'twilio', 'web_direct'
    id_externo VARCHAR(200),
    error_detalle TEXT,
    intentos INTEGER DEFAULT 1,
    entidad_tipo VARCHAR(50),
    entidad_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_destinatario ON public.whatsapp_logs(destinatario_telefono);
CREATE INDEX IF NOT EXISTS idx_whatsapp_fecha ON public.whatsapp_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_tipo ON public.whatsapp_logs(tipo_mensaje);

-- Función RPC para registrar el envío de notificaciones de WhatsApp
CREATE OR REPLACE FUNCTION public.log_whatsapp_notification(
    p_telefono TEXT,
    p_nombre TEXT,
    p_tipo TEXT,
    p_contenido TEXT,
    p_estado TEXT DEFAULT 'enviado',
    p_proveedor TEXT DEFAULT 'web_direct',
    p_entidad_tipo TEXT DEFAULT NULL,
    p_entidad_id TEXT DEFAULT NULL,
    p_error_detalle TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.whatsapp_logs (
        destinatario_telefono,
        destinatario_nombre,
        tipo_mensaje,
        contenido,
        estado,
        proveedor,
        entidad_tipo,
        entidad_id,
        error_detalle,
        created_at
    ) VALUES (
        p_telefono,
        p_nombre,
        p_tipo,
        p_contenido,
        p_estado,
        p_proveedor,
        p_entidad_tipo,
        p_entidad_id,
        p_error_detalle,
        NOW()
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- ==============================================================================
-- 4. PORTAL PÚBLICO DE SEGUIMIENTO CON TOKEN CRIPTOGRÁFICO AISLADO (MÓDULO 5)
-- ==============================================================================

-- 4.1 Agregar tokens de seguimiento único y no secuencial
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ordenes_trabajo' AND column_name = 'tracking_token'
    ) THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN tracking_token UUID DEFAULT gen_random_uuid();
        -- Poblar registros existentes con tokens únicos
        UPDATE public.ordenes_trabajo SET tracking_token = gen_random_uuid() WHERE tracking_token IS NULL;
        ALTER TABLE public.ordenes_trabajo ALTER COLUMN tracking_token SET NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cotizaciones' AND column_name = 'tracking_token'
    ) THEN
        ALTER TABLE public.cotizaciones ADD COLUMN tracking_token UUID DEFAULT gen_random_uuid();
        UPDATE public.cotizaciones SET tracking_token = gen_random_uuid() WHERE tracking_token IS NULL;
        ALTER TABLE public.cotizaciones ALTER COLUMN tracking_token SET NOT NULL;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ordenes_tracking_token ON public.ordenes_trabajo(tracking_token);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cotizaciones_tracking_token ON public.cotizaciones(tracking_token);

-- 4.2 Función RPC de Consulta Pública Segura (Aislamiento Total de Datos Privados)
-- Retorna ÚNICAMENTE datos operativos visibles para el cliente.
-- NUNCA expone costos, proveedores, resinas por costo, notas internas de taller ni clientes ajenos.
CREATE OR REPLACE FUNCTION public.get_public_tracking_info(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ot RECORD;
    v_porcentaje INT;
    v_mensaje_etapa TEXT;
BEGIN
    -- 1. Buscar la Orden de Trabajo por su token seguro
    SELECT 
        o.id,
        o.numero_ot,
        o.cotizacion_numero,
        o.item_nombre,
        o.cantidad,
        o.estado,
        o.fecha_inicio,
        o.fecha_finalizacion,
        o.imagen_url,
        o.resina_nombre,
        o.detalles_tecnicos,
        c.nombre AS cliente_nombre_publico
    INTO v_ot
    FROM public.ordenes_trabajo o
    LEFT JOIN public.cotizaciones cot ON o.cotizacion_id = cot.id
    LEFT JOIN public.clientes c ON cot.cliente_id = c.id
    WHERE o.tracking_token = p_token;

    IF NOT FOUND THEN
        -- Si no se encontró por token de OT, buscar si el token corresponde a una cotización
        SELECT 
            o.id,
            o.numero_ot,
            o.cotizacion_numero,
            o.item_nombre,
            o.cantidad,
            o.estado,
            o.fecha_inicio,
            o.fecha_finalizacion,
            o.imagen_url,
            o.resina_nombre,
            o.detalles_tecnicos,
            'Cliente WJGEEKS' AS cliente_nombre_publico
        INTO v_ot
        FROM public.cotizaciones cot
        JOIN public.ordenes_trabajo o ON o.cotizacion_id = cot.id
        WHERE cot.tracking_token = p_token
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'encontrado', false,
                'mensaje', 'El pedido solicitado no existe o el enlace de seguimiento es inválido.'
            );
        END IF;
    END IF;

    -- 2. Calcular porcentaje y descripción según etapa
    CASE v_ot.estado
        WHEN 'En Cola' THEN
            v_porcentaje := 15;
            v_mensaje_etapa := 'Tu archivo 3D ha sido verificado y está programado en la fila de producción.';
        WHEN 'Imprimiendo' THEN
            v_porcentaje := 40;
            v_mensaje_etapa := 'La figura se encuentra en la impresora fotopolimerizando resina líquida capa por capa.';
        WHEN 'Curado' THEN
            v_porcentaje := 65;
            v_mensaje_etapa := 'Lavado químico para remover residuos y curado en cámara ultravioleta para máxima dureza.';
        WHEN 'Pintura y Armado' THEN
            v_porcentaje := 85;
            v_mensaje_etapa := 'Retiro de soportes, lijado fino, imprimación bicapa y mesa de acabados artesanales.';
        WHEN 'Control de Calidad' THEN
            v_porcentaje := 95;
            v_mensaje_etapa := 'Inspección minuciosa de tolerancias dimensionales, empaque protector y preparación.';
        WHEN 'Listo para Entrega' THEN
            v_porcentaje := 100;
            v_mensaje_etapa := '¡Tu pedido está completamente terminado y disponible para entrega inmediata o envío!';
        ELSE
            v_porcentaje := 20;
            v_mensaje_etapa := 'Tu pieza está en proceso activo en nuestro taller.';
    END CASE;

    -- 3. Retornar payload higienizado para consumo público
    RETURN jsonb_build_object(
        'encontrado', true,
        'numero_ot', v_ot.numero_ot,
        'pieza_nombre', v_ot.item_nombre,
        'cantidad', v_ot.cantidad,
        'estado', v_ot.estado,
        'porcentaje_progreso', v_porcentaje,
        'mensaje_etapa', v_mensaje_etapa,
        'material', COALESCE(v_ot.resina_nombre, 'Resina Fotopolímero 8K'),
        'imagen_referencia', v_ot.imagen_url,
        'fecha_estimada_entrega', v_ot.fecha_finalizacion,
        'taller_soporte_whatsapp', '+57 320 279 6115'
    );
END;
$$;

-- Permisos públicos para la función de tracking
REVOKE EXECUTE ON FUNCTION public.get_public_tracking_info(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_tracking_info(UUID) TO anon, authenticated;

-- Permisos para logueo de WhatsApp y calendario
GRANT EXECUTE ON FUNCTION public.log_whatsapp_notification(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sync_calendar_event_to_source(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated, anon;

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para acceso operativo durante fase colaborativa
DROP POLICY IF EXISTS "Permitir acceso colaborativo a calendar_events" ON public.calendar_events;
CREATE POLICY "Permitir acceso colaborativo a calendar_events" ON public.calendar_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir acceso colaborativo a whatsapp_logs" ON public.whatsapp_logs;
CREATE POLICY "Permitir acceso colaborativo a whatsapp_logs" ON public.whatsapp_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura de roles y permisos" ON public.roles;
CREATE POLICY "Permitir lectura de roles y permisos" ON public.roles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir lectura de permissions" ON public.permissions;
CREATE POLICY "Permitir lectura de permissions" ON public.permissions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir lectura de system_settings" ON public.system_settings;
CREATE POLICY "Permitir lectura de system_settings" ON public.system_settings FOR SELECT TO anon, authenticated USING (true);

-- ==============================================================================
-- 5. AUTOMATIZACIÓN DE WHATSAPP 100% DESATENDIDA (MÓDULO 2)
-- Cola de Mensajes con Idempotencia, Reintentos y Job Programado (pg_cron)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(160) UNIQUE NOT NULL,
    destinatario_telefono VARCHAR(30) NOT NULL,
    destinatario_nombre VARCHAR(150),
    tipo_mensaje VARCHAR(50) NOT NULL, -- 'alerta_cobranza', 'alerta_ot_estado', 'alerta_tarea'
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
DROP POLICY IF EXISTS "Permitir acceso a cola de notificaciones" ON public.whatsapp_notification_logs;
CREATE POLICY "Permitir acceso a cola de notificaciones" ON public.whatsapp_notification_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Procedimiento programado para evaluar deudas y encolar alertas automáticamente
CREATE OR REPLACE FUNCTION public.cron_evaluar_cobranzas_y_encolar_whatsapp()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cuenta RECORD;
    v_count INTEGER := 0;
    v_mensaje TEXT;
    v_idempotency_key TEXT;
    v_dias_plazo INT := 15;
    v_fecha_venc DATE;
    v_dias_retraso INT;
BEGIN
    FOR v_cuenta IN 
        SELECT 
            cc.id,
            cc.numero_cc,
            cc.cotizacion_numero,
            cc.total,
            cc.abono,
            cc.saldo_pendiente,
            cc.fecha_emision,
            c.nombre AS cliente_nombre,
            c.telefono AS cliente_telefono
        FROM public.cuentas_cobro cc
        LEFT JOIN public.clientes c ON cc.cliente_id = c.id
        WHERE cc.saldo_pendiente > 0 
          AND c.telefono IS NOT NULL 
          AND LENGTH(TRIM(c.telefono)) >= 7
    LOOP
        v_fecha_venc := v_cuenta.fecha_emision + (v_dias_plazo || ' days')::INTERVAL;
        v_dias_retraso := CURRENT_DATE - v_fecha_venc;

        -- Encolar recordatorio si vence hoy, o a los 3 días de vencido
        IF v_dias_retraso = 0 OR v_dias_retraso = 3 OR v_dias_retraso = 7 THEN
            v_idempotency_key := 'cobro-' || v_cuenta.id || '-' || CURRENT_DATE;

            v_mensaje := 'Hola ' || v_cuenta.cliente_nombre || ', un cordial saludo desde WJGEEKS 3D. '
                || 'Te recordamos que tu cuenta de cobro ' || v_cuenta.numero_cc 
                || ' presenta un saldo pendiente de $' || TO_CHAR(v_cuenta.saldo_pendiente, 'FM999G999G999') || ' COP. '
                || 'Medios de pago oficiales: Nequi / Daviplata: 3217273025, Bancolombia: Ahorros 245-000123-98. '
                || 'Agradecemos enviarnos tu comprobante una vez realizado el pago.';

            INSERT INTO public.whatsapp_notification_logs (
                idempotency_key,
                destinatario_telefono,
                destinatario_nombre,
                tipo_mensaje,
                contenido,
                estado,
                proveedor,
                entidad_tipo,
                entidad_id,
                created_at
            ) VALUES (
                v_idempotency_key,
                v_cuenta.cliente_telefono,
                v_cuenta.cliente_nombre,
                'alerta_cobranza',
                v_mensaje,
                'queued',
                'whatsapp_cloud_api',
                'cuenta_cobro',
                v_cuenta.id::TEXT,
                NOW()
            )
            ON CONFLICT (idempotency_key) DO NOTHING;

            IF FOUND THEN
                v_count := v_count + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;

-- Programación desatendida mediante pg_cron (a las 8:30 AM todos los días)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('evaluar_cobranzas_diarias_whatsapp');
        PERFORM cron.schedule(
            'evaluar_cobranzas_diarias_whatsapp',
            '30 8 * * *',
            'SELECT public.cron_evaluar_cobranzas_y_encolar_whatsapp();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Si pg_cron no está habilitado en este tier de Supabase, la función queda disponible para ejecución vía Edge Function o Supabase Scheduler
        NULL;
END $$;

-- ==============================================================================
-- 6. RPC ATÓMICA: APROBACIÓN DE COTIZACIÓN Y GENERACIÓN DE ORDEN DE PAGO (MÓDULO 3)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.approve_quote_and_settle(
    p_quote_id UUID,
    p_payment_amount NUMERIC(14, 2) DEFAULT 0.00,
    p_payment_method TEXT DEFAULT 'TRANSFERENCIA',
    p_comprobante_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_quote RECORD;
    v_new_pending_balance NUMERIC(14, 2);
    v_quote_status TEXT;
    v_estado_pago TEXT;
    v_order_id TEXT := NULL;
    v_num_cc TEXT;
    v_caller_id UUID;
BEGIN
    v_caller_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

    IF p_payment_amount < 0 THEN
        RAISE EXCEPTION 'El monto abonado no puede ser un valor negativo.';
    END IF;

    -- Concurrency Lock: Bloqueo exclusivo de fila
    SELECT id, numero_cot, cliente_id, total, estado, abono, saldo_pendiente
    INTO v_quote
    FROM public.cotizaciones
    WHERE id = p_quote_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cotización con ID % no encontrada.', p_quote_id;
    END IF;

    IF v_quote.estado IN ('Aceptada', 'Facturada', 'Rechazada') THEN
        RAISE EXCEPTION 'La cotización % ya se encuentra en estado % y no puede procesarse nuevamente.', 
            v_quote.numero_cot, v_quote.estado;
    END IF;

    IF p_payment_amount > v_quote.total THEN
        RAISE EXCEPTION 'El monto recibido (%) no puede superar el total de la cotización (%).', 
            p_payment_amount, v_quote.total;
    END IF;

    -- Cálculo de saldos y estados
    v_new_pending_balance := GREATEST(0, v_quote.total - p_payment_amount);

    IF v_new_pending_balance = 0 AND v_quote.total > 0 THEN
        v_estado_pago := 'Pagado Total';
    ELSIF p_payment_amount > 0 THEN
        v_estado_pago := 'Abono Parcial';
    ELSE
        v_estado_pago := 'Pendiente';
    END IF;

    v_quote_status := 'Aceptada';

    -- Actualizar Cotización
    UPDATE public.cotizaciones
    SET 
        estado = v_quote_status,
        abono = p_payment_amount,
        saldo_pendiente = v_new_pending_balance,
        estado_pago = v_estado_pago,
        metodo_pago = p_payment_method,
        comprobante_pago = p_comprobante_url,
        updated_at = NOW()
    WHERE id = p_quote_id;

    -- Generar o actualizar Cuenta de Cobro / Orden de Pago de forma atómica
    IF v_new_pending_balance > 0 OR p_payment_amount > 0 THEN
        IF EXISTS (SELECT 1 FROM public.cuentas_cobro WHERE cotizacion_id = p_quote_id) THEN
            UPDATE public.cuentas_cobro
            SET 
                total = v_quote.total,
                abono = p_payment_amount,
                saldo_pendiente = v_new_pending_balance,
                estado_pago = v_estado_pago,
                comprobante_url = COALESCE(p_comprobante_url, comprobante_url)
            WHERE cotizacion_id = p_quote_id
            RETURNING id::TEXT INTO v_order_id;
        ELSE
            v_num_cc := generar_siguiente_numero_cc();
            v_order_id := 'cc-' || gen_random_uuid()::TEXT;
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
                comprobante_url,
                created_at
            )
            VALUES (
                v_order_id::UUID,
                v_num_cc,
                p_quote_id,
                v_quote.cliente_id,
                CURRENT_DATE,
                v_quote.total,
                p_payment_amount,
                v_new_pending_balance,
                v_estado_pago,
                p_comprobante_url,
                NOW()
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'quote_id', p_quote_id,
        'numero_cot', v_quote.numero_cot,
        'previous_status', v_quote.estado,
        'new_status', v_quote_status,
        'total_amount', v_quote.total,
        'paid_amount', p_payment_amount,
        'pending_balance', v_new_pending_balance,
        'payment_state', v_estado_pago,
        'generated_payment_order_id', v_order_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_quote_and_settle(UUID, NUMERIC, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_evaluar_cobranzas_y_encolar_whatsapp() TO anon, authenticated;

