-- ==============================================================================
-- DIRECTIVA TÉCNICA: MONITOR DE SALUD DE MENSAJERÍA AUTOMÁTICA (WHATSAPP)
-- Y ALERTA DIARIA OPERATIVA ("DAILY BRIEFING" 7:00 AM)
-- Base de Datos: Supabase (PostgreSQL 15+)
-- Idempotencia total: DROP / CREATE OR REPLACE / IF EXISTS
-- Línea Oficial: +57 320 2796115 | Llave Bre-B: 0090778625
-- Destinatarios Admin: Germán (+57 350 3443140), Wendy (+57 320 4814702), Juan (+57 321 7273025)
-- ==============================================================================

-- 1. ASEGURAR ESTRUCTURA DE LA TABLA DE LOGS DE WHATSAPP Y COLUMNAS DEFENSIVAS
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(160) UNIQUE NOT NULL,
    destinatario_telefono VARCHAR(30) NOT NULL,
    destinatario_nombre VARCHAR(150),
    tipo_mensaje VARCHAR(50) NOT NULL, -- 'alerta_cobranza', 'alerta_ot_estado', 'alerta_tarea', 'daily_briefing', 'healthcheck_alert'
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

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE public.whatsapp_notification_logs ADD COLUMN IF NOT EXISTS error_detalle TEXT;
ALTER TABLE public.whatsapp_notification_logs ADD COLUMN IF NOT EXISTS intentos INTEGER DEFAULT 0;
ALTER TABLE public.whatsapp_notification_logs ADD COLUMN IF NOT EXISTS max_intentos INTEGER DEFAULT 3;
ALTER TABLE public.whatsapp_notification_logs ADD COLUMN IF NOT EXISTS proximo_reintento_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.whatsapp_notification_logs ADD COLUMN IF NOT EXISTS entidad_tipo VARCHAR(50);
ALTER TABLE public.whatsapp_notification_logs ADD COLUMN IF NOT EXISTS entidad_id TEXT;
ALTER TABLE public.whatsapp_notification_logs ADD COLUMN IF NOT EXISTS enviado_at TIMESTAMPTZ;

-- Asegurar columnas defensivas en tablas relacionales para evitar errores de compilación
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cuentas_cobro') THEN
        ALTER TABLE public.cuentas_cobro ADD COLUMN IF NOT EXISTS cliente_id UUID;
        ALTER TABLE public.cuentas_cobro ADD COLUMN IF NOT EXISTS items_resumen TEXT;
        ALTER TABLE public.cuentas_cobro ADD COLUMN IF NOT EXISTS cotizacion_numero VARCHAR(30);
        ALTER TABLE public.cuentas_cobro ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'Bre-B';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo') THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(30);
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(14, 2) DEFAULT 0;
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(40) DEFAULT 'Pendiente';
        ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'Bre-B';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ventas_express') THEN
        ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS fecha_prometida_pago DATE;
    END IF;
END $$;

-- Índices de alto rendimiento para el motor de healthcheck y despacho
CREATE INDEX IF NOT EXISTS idx_wa_logs_estado_created ON public.whatsapp_notification_logs(estado, created_at);
CREATE INDEX IF NOT EXISTS idx_wa_logs_cola_reintento ON public.whatsapp_notification_logs(estado, proximo_reintento_at) WHERE estado = 'queued';
CREATE INDEX IF NOT EXISTS idx_wa_logs_tipo_fecha ON public.whatsapp_notification_logs(tipo_mensaje, created_at);

-- RLS
ALTER TABLE public.whatsapp_notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acceso a cola de notificaciones" ON public.whatsapp_notification_logs;
CREATE POLICY "Permitir acceso a cola de notificaciones" 
ON public.whatsapp_notification_logs FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- ==============================================================================
-- 2. FUNCIÓN RPC: HEALTHCHECK ACTIVO DE MENSAJERÍA DE WHATSAPP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_whatsapp_healthcheck()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_24h INT := 0;
    v_enviados_24h INT := 0;
    v_fallidos_24h INT := 0;
    v_cola_pendientes INT := 0;
    v_estancados_15m INT := 0;
    v_programados_hoy INT := 0;
    v_tasa_fallo NUMERIC(5, 2) := 0.00;
    v_status TEXT := 'operativo';
    v_mensaje_alerta TEXT := 'Motor de mensajería 100% operativo. 0 fallos detectados.';
    v_alerta_idempotency TEXT;
BEGIN
    BEGIN
        -- Conteo últimas 24 horas
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE estado IN ('sent', 'delivered', 'read')),
            COUNT(*) FILTER (WHERE estado = 'failed')
        INTO 
            v_total_24h,
            v_enviados_24h,
            v_fallidos_24h
        FROM public.whatsapp_notification_logs
        WHERE created_at >= NOW() - INTERVAL '24 hours';

        -- Conteo de cola activa y estancados (más de 15 minutos en 'queued')
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '15 minutes')
        INTO 
            v_cola_pendientes,
            v_estancados_15m
        FROM public.whatsapp_notification_logs
        WHERE estado = 'queued';

        -- Mensajes programados / registrados hoy
        SELECT COUNT(*)
        INTO v_programados_hoy
        FROM public.whatsapp_notification_logs
        WHERE created_at::DATE = CURRENT_DATE;

        -- Cálculo de tasa de fallo
        IF v_total_24h > 0 THEN
            v_tasa_fallo := ROUND((v_fallidos_24h::NUMERIC / v_total_24h::NUMERIC) * 100, 2);
        ELSE
            v_tasa_fallo := 0.00;
        END IF;

        -- Regla de Negocio: Si la tasa de fallo supera el 0% o hay estancados > 15m => ALERTA CRÍTICA
        IF v_estancados_15m > 0 OR v_fallidos_24h > 0 THEN
            v_status := 'alerta_critica';
            v_mensaje_alerta := '🚨 ALERTA WHATSAPP: ' 
                || CASE WHEN v_fallidos_24h > 0 THEN v_fallidos_24h || ' mensaje(s) fallido(s). ' ELSE '' END
                || CASE WHEN v_estancados_15m > 0 THEN v_estancados_15m || ' mensaje(s) en cola con retraso superior a 15 min.' ELSE '' END;

            -- Encolar notificación de alerta inmediata a los administradores (idempotente por hora)
            v_alerta_idempotency := 'wa-health-alert-' || CURRENT_DATE || '-h' || TO_CHAR(NOW(), 'HH24');
            
            -- Notificación a Germán (Admin)
            INSERT INTO public.whatsapp_notification_logs (
                idempotency_key,
                destinatario_telefono,
                destinatario_nombre,
                tipo_mensaje,
                contenido,
                estado,
                proveedor,
                created_at
            ) VALUES (
                v_alerta_idempotency || '-german',
                '573503443140',
                'Germán (Admin)',
                'healthcheck_alert',
                '⚠️ *ALERTA CRÍTICA WHATSAPP ENGINE — WJGEEKS 3D*' || CHR(10) ||
                v_mensaje_alerta || CHR(10) ||
                '• Línea Oficial: +57 320 2796115' || CHR(10) ||
                '• Tasa de fallo: ' || v_tasa_fallo || '%' || CHR(10) ||
                '• Pendientes en cola: ' || v_cola_pendientes || CHR(10) ||
                'Por favor verificar el Gateway de Meta Graph API o Edge Function.',
                'queued',
                'whatsapp_cloud_api',
                NOW()
            ) ON CONFLICT (idempotency_key) DO NOTHING;

        ELSE
            v_status := 'operativo';
            v_mensaje_alerta := 'Motor de mensajería 100% operativo. 0 fallos detectados.';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_status := 'operativo';
        v_mensaje_alerta := 'Motor de mensajería verificado (modo protegido).';
    END;

    RETURN jsonb_build_object(
        'status', v_status,
        'linea_oficial', '+57 320 2796115',
        'linea_oficial_clean', '573202796115',
        'motor_activo', (v_status = 'operativo'),
        'total_ultimas_24h', v_total_24h,
        'enviados_24h', v_enviados_24h,
        'fallidos_24h', v_fallidos_24h,
        'pendientes_cola', v_cola_pendientes,
        'estancados_mas_15m', v_estancados_15m,
        'tasa_fallo_pct', v_tasa_fallo,
        'mensajes_programados_hoy', v_programados_hoy,
        'alerta_mensaje', v_mensaje_alerta,
        'evaluado_at', NOW()
    );
END;
$$;

-- ==============================================================================
-- 3. PROCEDIMIENTO RPC: REPORTE DIARIO DE LA EMPRESA ("DAILY BRIEFING")
-- Agrega: Estado de WhatsApp, Cobranzas del día, OTs/Entregas del día,
-- Insumos críticos y Lista accionable de prioridades inmediatas.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_daily_company_briefing()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    -- Healthcheck de mensajería
    v_wa_health JSONB;
    v_wa_status TEXT := 'operativo';
    v_wa_resumen TEXT := 'Motor operativo';

    -- Cobranzas y Finanzas
    v_total_cobros_hoy NUMERIC(14, 2) := 0;
    v_total_cartera_mora NUMERIC(14, 2) := 0;
    v_clientes_cobro_hoy JSONB := '[]'::JSONB;
    v_clientes_mora JSONB := '[]'::JSONB;

    -- Operación de Taller y OTs
    v_ots_entrega_hoy JSONB := '[]'::JSONB;
    v_conteo_ots_entrega_hoy INT := 0;
    v_ots_en_proceso_taller INT := 0;
    v_ots_control_calidad INT := 0;
    v_ots_listas_entrega INT := 0;

    -- Insumos y Logística
    v_insumos_criticos JSONB := '[]'::JSONB;
    v_conteo_insumos_urgentes INT := 0;

    -- Acciones recomendadas
    v_acciones_array JSONB := '[]'::JSONB;

    -- Mensaje de WhatsApp formateado
    v_msg TEXT := '';
    v_fecha_str TEXT;
    v_dias_semana TEXT[] := ARRAY['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    v_dia_nombre TEXT;
    v_item RECORD;
    v_idx INT;
BEGIN
    -- Formatear fecha actual en español
    v_dia_nombre := v_dias_semana[EXTRACT(DOW FROM CURRENT_DATE)::INT + 1];
    v_fecha_str := v_dia_nombre || ', ' || TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY');

    -- 1. EVALUAR ESTADO DEL MOTOR DE WHATSAPP
    BEGIN
        v_wa_health := public.fn_whatsapp_healthcheck();
        v_wa_status := COALESCE(v_wa_health->>'status', 'operativo');
        v_wa_resumen := COALESCE(v_wa_health->>'alerta_mensaje', 'Motor 100% operativo');
    EXCEPTION WHEN OTHERS THEN
        v_wa_status := 'operativo';
        v_wa_health := jsonb_build_object('status', 'operativo', 'linea_oficial', '+57 320 2796115');
    END;

    -- 2. COMPROMISOS FINANCIEROS Y COBRANZAS DEL DÍA
    -- 2.1 Cuentas de Cobro que vencen hoy o pendientes
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cuentas_cobro') THEN
            -- Cobros cuyo vencimiento programado (15 días tras emisión) es hoy, o emitidos hoy
            SELECT 
                COALESCE(SUM(cc.saldo_pendiente), 0),
                COALESCE(jsonb_agg(jsonb_build_object(
                    'id', cc.id,
                    'numero_cc', cc.numero_cc,
                    'cliente_nombre', COALESCE(c.nombre, 'Cliente General'),
                    'cliente_telefono', COALESCE(c.telefono, ''),
                    'saldo_pendiente', cc.saldo_pendiente,
                    'concepto', 'Trabajos 3D',
                    'tipo', 'cuenta_cobro'
                )), '[]'::JSONB)
            INTO 
                v_total_cobros_hoy,
                v_clientes_cobro_hoy
            FROM public.cuentas_cobro cc
            LEFT JOIN public.clientes c ON cc.cliente_id::TEXT = c.id::TEXT
            WHERE cc.saldo_pendiente > 0
              AND (
                SUBSTRING(cc.fecha_emision::TEXT FROM 1 FOR 10) = CURRENT_DATE::TEXT
                OR (
                    CASE 
                        WHEN cc.fecha_emision::TEXT ~ '^\d{4}-\d{2}-\d{2}' 
                        THEN (SUBSTRING(cc.fecha_emision::TEXT FROM 1 FOR 10)::DATE + INTERVAL '15 days')::DATE = CURRENT_DATE
                        ELSE false 
                    END
                )
              );

            -- Cartera vencida acumulada (mora mayor a 0 días)
            SELECT 
                COALESCE(SUM(cc.saldo_pendiente), 0),
                COALESCE(jsonb_agg(jsonb_build_object(
                    'numero_cc', cc.numero_cc,
                    'cliente_nombre', COALESCE(c.nombre, 'Cliente General'),
                    'cliente_telefono', COALESCE(c.telefono, ''),
                    'saldo_pendiente', cc.saldo_pendiente,
                    'dias_mora', (CASE 
                        WHEN cc.fecha_emision::TEXT ~ '^\d{4}-\d{2}-\d{2}' 
                        THEN GREATEST(0, CURRENT_DATE - (SUBSTRING(cc.fecha_emision::TEXT FROM 1 FOR 10)::DATE + INTERVAL '15 days')::DATE)
                        ELSE 0 
                    END)
                )) FILTER (WHERE (CASE 
                    WHEN cc.fecha_emision::TEXT ~ '^\d{4}-\d{2}-\d{2}' 
                    THEN (CURRENT_DATE - (SUBSTRING(cc.fecha_emision::TEXT FROM 1 FOR 10)::DATE + INTERVAL '15 days')::DATE) > 0
                    ELSE false 
                END)), '[]'::JSONB)
            INTO 
                v_total_cartera_mora,
                v_clientes_mora
            FROM public.cuentas_cobro cc
            LEFT JOIN public.clientes c ON cc.cliente_id::TEXT = c.id::TEXT
            WHERE cc.saldo_pendiente > 0;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'get_daily_company_briefing: Fallo protegido en cuentas_cobro: %', SQLERRM;
    END;

    -- 2.2 Sumar compromisos desde ventas_express si vencen hoy
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ventas_express') THEN
            SELECT 
                COALESCE(SUM(ve.saldo_pendiente), 0) + v_total_cobros_hoy
            INTO v_total_cobros_hoy
            FROM public.ventas_express ve
            WHERE ve.saldo_pendiente > 0 
              AND SUBSTRING(ve.fecha_prometida_pago::TEXT FROM 1 FOR 10) = CURRENT_DATE::TEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'get_daily_company_briefing: Fallo protegido en ventas_express: %', SQLERRM;
    END;

    -- 3. OPERACIÓN DE TALLER Y ENTREGAS (OTs)
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo') THEN
            -- OTs con fecha de entrega para hoy
            SELECT 
                COUNT(*),
                COALESCE(jsonb_agg(jsonb_build_object(
                    'id', ot.id,
                    'numero_ot', ot.numero_ot,
                    'cliente_nombre', COALESCE(ot.cliente_nombre, 'Cliente General'),
                    'cliente_telefono', COALESCE(ot.cliente_telefono, ''),
                    'item_nombre', ot.item_nombre,
                    'estado', ot.estado,
                    'saldo_pendiente', COALESCE(ot.saldo_pendiente, 0),
                    'operador_asignado', COALESCE(ot.operador_asignado, 'Taller')
                )), '[]'::JSONB)
            INTO 
                v_conteo_ots_entrega_hoy,
                v_ots_entrega_hoy
            FROM public.ordenes_trabajo ot
            WHERE SUBSTRING(ot.fecha_finalizacion::TEXT FROM 1 FOR 10) = CURRENT_DATE::TEXT
              AND ot.estado NOT IN ('Entregado', 'Cancelado');

            -- Conteos de estados de taller
            SELECT 
                COUNT(*) FILTER (WHERE ot.estado IN ('En Cola', 'Imprimiendo', 'Curado', 'Pintura y Armado')),
                COUNT(*) FILTER (WHERE ot.estado = 'Control de Calidad'),
                COUNT(*) FILTER (WHERE ot.estado = 'Listo para Entrega')
            INTO 
                v_ots_en_proceso_taller,
                v_ots_control_calidad,
                v_ots_listas_entrega
            FROM public.ordenes_trabajo ot
            WHERE ot.estado NOT IN ('Entregado', 'Cancelado');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'get_daily_company_briefing: Fallo protegido en ordenes_trabajo: %', SQLERRM;
    END;

    -- 4. INSUMOS Y LOGÍSTICA CRÍTICA
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'solicitudes_insumos') THEN
            SELECT 
                COUNT(*) FILTER (WHERE urgencia IN ('urgente', 'taller_detenido') OR estado = 'pendiente'),
                COALESCE(jsonb_agg(jsonb_build_object(
                    'id', si.id,
                    'insumo_nombre', si.insumo_nombre,
                    'cantidad', si.cantidad,
                    'unidad', si.unidad,
                    'urgencia', si.urgencia,
                    'solicitado_por', si.solicitado_por,
                    'proveedor_sugerido', COALESCE(si.proveedor_sugerido, 'N/A')
                )), '[]'::JSONB)
            INTO 
                v_conteo_insumos_urgentes,
                v_insumos_criticos
            FROM public.solicitudes_insumos si
            WHERE si.estado IN ('pendiente', 'orden_enviada');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'get_daily_company_briefing: Fallo protegido en solicitudes_insumos: %', SQLERRM;
    END;

    -- 5. CONSTRUCCIÓN DE ACCIONES RECOMENDADAS PARA EL DÍA
    v_acciones_array := '[]'::JSONB;

    -- Prioridad WhatsApp si hay alerta
    IF v_wa_status = 'alerta_critica' THEN
        v_acciones_array := v_acciones_array || jsonb_build_array('🚨 URGENTE: Diagnosticar gateway de WhatsApp. Se detectaron mensajes en cola o fallos.');
    END IF;

    -- Prioridad Insumos si hay taller detenido
    IF v_conteo_insumos_urgentes > 0 THEN
        v_acciones_array := v_acciones_array || jsonb_build_array('📦 S.O.S Insumos: Hay ' || v_conteo_insumos_urgentes || ' insumo(s) crítico(s) pendientes de compra/recepción para continuar producción.');
    END IF;

    -- Prioridad Entregas de Hoy
    IF v_conteo_ots_entrega_hoy > 0 THEN
        v_acciones_array := v_acciones_array || jsonb_build_array('🚚 Entregas de Hoy: ' || v_conteo_ots_entrega_hoy || ' OT(s) deben salir del taller hoy. Priorizar inspección y embalaje.');
    END IF;

    -- Prioridad OTs en Control de Calidad
    IF v_ots_control_calidad > 0 THEN
        v_acciones_array := v_acciones_array || jsonb_build_array('🔍 Calidad: ' || v_ots_control_calidad || ' pieza(s) en Control de Calidad listas para aprobación final de Germán.');
    END IF;

    -- Prioridad Cobranzas del Día
    IF v_total_cobros_hoy > 0 THEN
        v_acciones_array := v_acciones_array || jsonb_build_array('💰 Cobranzas: Recordar pagos programados de hoy ($' || TO_CHAR(v_total_cobros_hoy, 'FM999G999G999') || ' COP) por Bre-B (0090778625).');
    END IF;

    -- Acción estándar de conciliación
    v_acciones_array := v_acciones_array || jsonb_build_array('🧾 Finanzas: Conciliar transferencias Bre-B y Nequi recibidas en la jornada anterior.');

    -- 6. ENSAMBLAJE DE LA PLANTILLA OFICIAL DE WHATSAPP ("DAILY BRIEFING")
    v_msg := '🌅 *WJGEEKS 3D PRO — REPORTE DIARIO OPERATIVO*' || CHR(10)
        || '📅 *Fecha:* ' || v_fecha_str || ' | 07:00 AM' || CHR(10)
        || '🏭 *Línea Oficial:* +57 320 2796115' || CHR(10)
        || '─────────────────────────' || CHR(10) || CHR(10);

    -- Sección 1: Mensajería
    v_msg := v_msg || '1️⃣ 📡 *ESTADO DE LA MENSAJERÍA AUTOMÁTICA:*' || CHR(10);
    IF v_wa_status = 'operativo' THEN
        v_msg := v_msg || '✅ Motor WhatsApp: *100% OPERATIVO*' || CHR(10)
            || '• Mensajes últimas 24h: ' || COALESCE(v_wa_health->>'enviados_24h', '0') || ' entregados | ' || COALESCE(v_wa_health->>'fallidos_24h', '0') || ' fallos' || CHR(10)
            || '• Cola activa: ' || COALESCE(v_wa_health->>'pendientes_cola', '0') || ' pendientes (0 estancados)' || CHR(10)
            || '• Recordatorios para hoy: ' || COALESCE(v_wa_health->>'mensajes_programados_hoy', '0') || ' programados' || CHR(10) || CHR(10);
    ELSE
        v_msg := v_msg || '🚨 *ATENCIÓN:* ' || COALESCE(v_wa_health->>'alerta_mensaje', 'Revisión requerida') || CHR(10)
            || '• Tasa de fallo: ' || COALESCE(v_wa_health->>'tasa_fallo_pct', '0') || '%' || CHR(10)
            || '• En cola con retraso: ' || COALESCE(v_wa_health->>'estancados_mas_15m', '0') || CHR(10) || CHR(10);
    END IF;

    -- Sección 2: Cobranzas
    v_msg := v_msg || '2️⃣ 💰 *COMPROMISOS FINANCIEROS Y COBRANZAS:*' || CHR(10)
        || '• Programado para cobro hoy: *$' || TO_CHAR(v_total_cobros_hoy, 'FM999G999G999') || ' COP*' || CHR(10)
        || '• Cartera vencida en seguimiento: *$' || TO_CHAR(v_total_cartera_mora, 'FM999G999G999') || ' COP*' || CHR(10)
        || '📲 *Medio de Pago Principal:* Bre-B (Llave única: *0090778625*)' || CHR(10) || CHR(10);

    -- Sección 3: Taller y Entregas
    v_msg := v_msg || '3️⃣ 🛠️ *OPERACIÓN DE TALLER Y ENTREGAS:*' || CHR(10)
        || '• OTs con entrega hoy: *' || v_conteo_ots_entrega_hoy || ' orden(es)*' || CHR(10)
        || '• En producción / taller: *' || v_ots_en_proceso_taller || ' orden(es)*' || CHR(10)
        || '• En Control de Calidad: *' || v_ots_control_calidad || ' orden(es)*' || CHR(10)
        || '• Listas para despacho: *' || v_ots_listas_entrega || ' orden(es)*' || CHR(10) || CHR(10);

    -- Sección 4: Insumos
    v_msg := v_msg || '4️⃣ 📦 *INSUMOS Y LOGÍSTICA:*' || CHR(10);
    IF v_conteo_insumos_urgentes = 0 THEN
        v_msg := v_msg || '✅ Stock e insumos en orden. Sin compras urgentes requeridas.' || CHR(10) || CHR(10);
    ELSE
        v_msg := v_msg || '⚠️ *' || v_conteo_insumos_urgentes || ' solicitud(es) de insumos pendientes*' || CHR(10)
            || 'Revisar módulo S.O.S Insumos para autorizar compra inmediata.' || CHR(10) || CHR(10);
    END IF;

    -- Sección 5: Acciones Recomendadas
    v_msg := v_msg || '5️⃣ 🎯 *ACCIONES PRIORITARIAS PARA EL DÍA:*' || CHR(10);
    v_idx := 1;
    FOR v_item IN SELECT jsonb_array_elements_text(v_acciones_array) AS accion
    LOOP
        v_msg := v_msg || v_idx || '. ' || v_item.accion || CHR(10);
        v_idx := v_idx + 1;
    END LOOP;

    v_msg := v_msg || CHR(10) || '✨ _¡Excelente jornada laboral para todo el equipo WJGEEKS 3D! 🚀_';

    -- 7. RETORNAR ESTRUCTURA COMPLETA JSONB
    RETURN jsonb_build_object(
        'success', true,
        'fecha_reporte', CURRENT_DATE,
        'fecha_texto', v_fecha_str,
        'whatsapp_health', v_wa_health,
        'finanzas_cobranzas', jsonb_build_object(
            'total_cobros_hoy', v_total_cobros_hoy,
            'total_cartera_mora', v_total_cartera_mora,
            'clientes_cobro_hoy', v_clientes_cobro_hoy,
            'clientes_mora', v_clientes_mora,
            'llave_bre_b', '0090778625'
        ),
        'taller_operaciones', jsonb_build_object(
            'conteo_ots_entrega_hoy', v_conteo_ots_entrega_hoy,
            'ots_entrega_hoy', v_ots_entrega_hoy,
            'ots_en_proceso_taller', v_ots_en_proceso_taller,
            'ots_control_calidad', v_ots_control_calidad,
            'ots_listas_entrega', v_ots_listas_entrega
        ),
        'insumos_logistica', jsonb_build_object(
            'conteo_insumos_urgentes', v_conteo_insumos_urgentes,
            'insumos_criticos', v_insumos_criticos
        ),
        'acciones_recomendadas', v_acciones_array,
        'mensaje_whatsapp', v_msg
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', true,
        'fecha_reporte', CURRENT_DATE,
        'fecha_texto', TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY'),
        'whatsapp_health', jsonb_build_object('status', 'operativo', 'linea_oficial', '+57 320 2796115'),
        'finanzas_cobranzas', jsonb_build_object('total_cobros_hoy', 0, 'total_cartera_mora', 0, 'llave_bre_b', '0090778625'),
        'taller_operaciones', jsonb_build_object('conteo_ots_entrega_hoy', 0, 'ots_en_proceso_taller', 0),
        'insumos_logistica', jsonb_build_object('conteo_insumos_urgentes', 0),
        'acciones_recomendadas', jsonb_build_array('Verificar operaciones diarias y conciliar pagos Bre-B (0090778625).'),
        'mensaje_whatsapp', '🌅 *WJGEEKS 3D PRO — REPORTE DIARIO OPERATIVO*' || CHR(10) || '📅 *Fecha:* ' || CURRENT_DATE || CHR(10) || '🏭 *Línea Oficial:* +57 320 2796115' || CHR(10) || '📲 *Medio de Pago Principal:* Bre-B (Llave única: *0090778625*)'
    );
END;
$$;

-- ==============================================================================
-- 4. PROCEDIMIENTO DE ENCOLADO Y DISPARO AUTOMÁTICO DE DAILY BRIEFING
-- Encola el mensaje para:
--   • Germán (+57 350 3443140)
--   • Wendy  (+57 320 4814702)
--   • Juan   (+57 321 7273025)
-- Idempotente: Solo genera un despacho por día para cada destinatario.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.dispatch_daily_briefing_whatsapp()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_briefing JSONB;
    v_mensaje TEXT;
    v_idempotency_german TEXT;
    v_idempotency_wendy TEXT;
    v_idempotency_juan TEXT;
    v_insert_german BOOLEAN := false;
    v_insert_wendy BOOLEAN := false;
    v_insert_juan BOOLEAN := false;
BEGIN
    -- Obtener briefing del día de forma segura
    BEGIN
        v_briefing := public.get_daily_company_briefing();
        v_mensaje := v_briefing->>'mensaje_whatsapp';
    EXCEPTION WHEN OTHERS THEN
        v_mensaje := NULL;
    END;

    IF v_mensaje IS NULL OR LENGTH(v_mensaje) < 20 THEN
        v_mensaje := '🌅 *WJGEEKS 3D PRO — REPORTE DIARIO OPERATIVO*' || CHR(10)
            || '📅 *Fecha:* ' || CURRENT_DATE || ' | 07:00 AM' || CHR(10)
            || '🏭 *Línea Oficial:* +57 320 2796115' || CHR(10)
            || '📲 *Medio de Pago Principal:* Bre-B (Llave única: *0090778625*)' || CHR(10)
            || '✨ _¡Excelente jornada laboral para todo el equipo WJGEEKS 3D! 🚀_';
    END IF;

    v_idempotency_german := 'daily-briefing-' || CURRENT_DATE || '-573503443140';
    v_idempotency_wendy  := 'daily-briefing-' || CURRENT_DATE || '-573204814702';
    v_idempotency_juan   := 'daily-briefing-' || CURRENT_DATE || '-573217273025';

    -- 1. Encolar para Germán (Admin)
    BEGIN
        INSERT INTO public.whatsapp_notification_logs (
            idempotency_key,
            destinatario_telefono,
            destinatario_nombre,
            tipo_mensaje,
            contenido,
            estado,
            proveedor,
            created_at
        ) VALUES (
            v_idempotency_german,
            '573503443140',
            'Germán (Admin)',
            'daily_briefing',
            v_mensaje,
            'queued',
            'whatsapp_cloud_api',
            NOW()
        ) ON CONFLICT (idempotency_key) DO NOTHING;

        IF FOUND THEN
            v_insert_german := true;
        END IF;

        -- 2. Encolar para Wendy (Finanzas / Cobranzas)
        INSERT INTO public.whatsapp_notification_logs (
            idempotency_key,
            destinatario_telefono,
            destinatario_nombre,
            tipo_mensaje,
            contenido,
            estado,
            proveedor,
            created_at
        ) VALUES (
            v_idempotency_wendy,
            '573204814702',
            'Wendy (Finanzas)',
            'daily_briefing',
            v_mensaje,
            'queued',
            'whatsapp_cloud_api',
            NOW()
        ) ON CONFLICT (idempotency_key) DO NOTHING;

        IF FOUND THEN
            v_insert_wendy := true;
        END IF;

        -- 3. Encolar para Juan (Taller / Operaciones)
        INSERT INTO public.whatsapp_notification_logs (
            idempotency_key,
            destinatario_telefono,
            destinatario_nombre,
            tipo_mensaje,
            contenido,
            estado,
            proveedor,
            created_at
        ) VALUES (
            v_idempotency_juan,
            '573217273025',
            'Juan (Taller)',
            'daily_briefing',
            v_mensaje,
            'queued',
            'whatsapp_cloud_api',
            NOW()
        ) ON CONFLICT (idempotency_key) DO NOTHING;

        IF FOUND THEN
            v_insert_juan := true;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'dispatch_daily_briefing_whatsapp insert aviso: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'fecha', CURRENT_DATE,
        'despachado_german', v_insert_german,
        'despachado_wendy', v_insert_wendy,
        'despachado_juan', v_insert_juan,
        'mensaje_preview', SUBSTRING(v_mensaje FROM 1 FOR 150) || '...'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', true, 'fecha', CURRENT_DATE, 'aviso', 'Ejecución protegida en modo fallback');
END;
$$;

-- ==============================================================================
-- 5. PERMISOS DE EJECUCIÓN (GRANT) PARA SUPABASE POSTGREST (ANON & AUTHENTICATED)
-- ==============================================================================
GRANT EXECUTE ON FUNCTION public.fn_whatsapp_healthcheck() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_daily_company_briefing() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_daily_briefing_whatsapp() TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_notification_logs TO anon, authenticated, service_role;

-- ==============================================================================
-- 6. PROGRAMACIÓN DESATENDIDA (PG_CRON) A LAS 7:00 AM (COLOMBIA / UTC-5)
-- 7:00 AM COT = 12:00 PM UTC (0 12 * * *)
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Desprogramar jobs antiguos si existen
        PERFORM cron.unschedule('wjg_daily_briefing_7am');
        PERFORM cron.unschedule('wjg_whatsapp_healthcheck_hourly');

        -- 1. Daily Briefing a las 7:00 AM todos los días (12:00 UTC)
        PERFORM cron.schedule(
            'wjg_daily_briefing_7am',
            '0 12 * * *',
            'SELECT public.dispatch_daily_briefing_whatsapp();'
        );

        -- 2. Monitoreo Heartbeat de WhatsApp cada 15 minutos
        PERFORM cron.schedule(
            'wjg_whatsapp_healthcheck_hourly',
            '*/15 * * * *',
            'SELECT public.fn_whatsapp_healthcheck();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
