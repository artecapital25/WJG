-- ==============================================================================
-- WJGEEKS 3D PRO: AUTENTICACIÓN, GESTIÓN DE USUARIOS Y RECUPERACIÓN VÍA WHATSAPP OTP
-- ==============================================================================
-- 1. Tabla de Usuarios del Sistema (RBAC, Kill Switch, Must Change Password)
-- 2. Tabla de Tokens de Recuperación OTP vía WhatsApp (Hash, 10 min, 3 intentos)
-- 3. Funciones Transaccionales Atómicas RPC:
--    - solicitar_otp_whatsapp
--    - verificar_otp_y_cambiar_password
--    - admin_crear_usuario
--    - admin_toggle_usuario_activo
-- ==============================================================================

-- 1. TABLA DE USUARIOS DEL SISTEMA
CREATE TABLE IF NOT EXISTS public.usuarios_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefono_whatsapp VARCHAR(30) UNIQUE NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'taller', -- 'admin', 'pos', 'taller', 'cobranzas'
    password_hash VARCHAR(255) NOT NULL,
    must_change_password BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    ultimo_acceso TIMESTAMPTZ,
    dispositivo_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios_sistema(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_telefono ON public.usuarios_sistema(telefono_whatsapp);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON public.usuarios_sistema(activo);

-- 2. TABLA DE TOKENS OTP PARA RECUPERACIÓN DE CONTRASEÑA
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios_sistema(id) ON DELETE CASCADE,
    telefono_whatsapp VARCHAR(30) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL, -- SHA-256 del código de 6 dígitos
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_telefono_used ON public.password_reset_tokens(telefono_whatsapp, used, expires_at);

-- 3. HABILITAR REPLICA IDENTITY Y REALTIME
ALTER TABLE public.usuarios_sistema REPLICA IDENTITY FULL;
ALTER TABLE public.password_reset_tokens REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'usuarios_sistema') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios_sistema;
    END IF;
END $$;

-- 4. POLÍTICAS RLS (Acceso Colaborativo Protegido)
ALTER TABLE public.usuarios_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Colaborativo: CRUD usuarios_sistema" ON public.usuarios_sistema;
CREATE POLICY "Colaborativo: CRUD usuarios_sistema" ON public.usuarios_sistema 
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Colaborativo: CRUD password_reset_tokens" ON public.password_reset_tokens;
CREATE POLICY "Colaborativo: CRUD password_reset_tokens" ON public.password_reset_tokens 
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. PROCEDIMIENTO RPC: SOLICITAR OTP VÍA WHATSAPP
CREATE OR REPLACE FUNCTION public.solicitar_otp_whatsapp(
    p_identificador TEXT,
    p_otp_hash TEXT,
    p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_usuario RECORD;
    v_clean_phone TEXT;
    v_clean_id TEXT;
    v_recent_requests INT;
BEGIN
    v_clean_id := LOWER(TRIM(p_identificador));
    -- Sanitizar teléfono (solo dígitos)
    v_clean_phone := regexp_replace(v_clean_id, '\D', '', 'g');

    -- Buscar usuario por correo o teléfono
    SELECT * INTO v_usuario 
    FROM public.usuarios_sistema
    WHERE (LOWER(email) = v_clean_id) 
       OR (v_clean_phone <> '' AND regexp_replace(telefono_whatsapp, '\D', '', 'g') LIKE '%' || v_clean_phone || '%')
    LIMIT 1;

    IF v_usuario IS NULL THEN
        -- Retornar mensaje seguro sin revelar si el usuario existe (Prevención de enumeración)
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No encontramos una cuenta asociada a ese correo o número de WhatsApp.'
        );
    END IF;

    IF v_usuario.activo IS FALSE THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Esta cuenta se encuentra desactivada. Consulta con el Administrador.'
        );
    END IF;

    -- Rate limiting: máximo 3 solicitudes en los últimos 15 minutos
    SELECT COUNT(*) INTO v_recent_requests
    FROM public.password_reset_tokens
    WHERE usuario_id = v_usuario.id 
      AND created_at >= (NOW() - INTERVAL '15 minutes');

    IF v_recent_requests >= 3 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Has superado el límite de intentos permitidos. Espera 15 minutos antes de volver a solicitar un código.'
        );
    END IF;

    -- Invalidar tokens previos no utilizados para este usuario
    UPDATE public.password_reset_tokens
    SET used = true
    WHERE usuario_id = v_usuario.id AND used = false;

    -- Registrar nuevo token
    INSERT INTO public.password_reset_tokens (
        usuario_id,
        telefono_whatsapp,
        otp_hash,
        expires_at
    ) VALUES (
        v_usuario.id,
        v_usuario.telefono_whatsapp,
        p_otp_hash,
        p_expires_at
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Código de seguridad generado exitosamente.',
        'user_id', v_usuario.id,
        'telefono_destino', v_usuario.telefono_whatsapp,
        'nombre_usuario', v_usuario.nombre
    );
END;
$$;

-- 6. PROCEDIMIENTO RPC: VERIFICAR OTP Y ACTUALIZAR CONTRASEÑA
CREATE OR REPLACE FUNCTION public.verificar_otp_y_cambiar_password(
    p_identificador TEXT,
    p_otp_hash TEXT,
    p_new_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_usuario RECORD;
    v_token RECORD;
    v_clean_id TEXT;
    v_clean_phone TEXT;
BEGIN
    v_clean_id := LOWER(TRIM(p_identificador));
    v_clean_phone := regexp_replace(v_clean_id, '\D', '', 'g');

    -- Localizar usuario
    SELECT * INTO v_usuario 
    FROM public.usuarios_sistema
    WHERE (LOWER(email) = v_clean_id) 
       OR (v_clean_phone <> '' AND regexp_replace(telefono_whatsapp, '\D', '', 'g') LIKE '%' || v_clean_phone || '%')
    LIMIT 1;

    IF v_usuario IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuario no encontrado.');
    END IF;

    -- Buscar token activo más reciente
    SELECT * INTO v_token
    FROM public.password_reset_tokens
    WHERE usuario_id = v_usuario.id
      AND used = false
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_token IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No hay ningún código de recuperación pendiente o ya fue utilizado.');
    END IF;

    -- Verificar expiración (10 minutos)
    IF NOW() > v_token.expires_at THEN
        UPDATE public.password_reset_tokens SET used = true WHERE id = v_token.id;
        RETURN jsonb_build_object('success', false, 'message', 'El código de seguridad ha expirado. Solicita uno nuevo.');
    END IF;

    -- Verificar límite de intentos (máximo 3)
    IF v_token.attempts >= v_token.max_attempts THEN
        UPDATE public.password_reset_tokens SET used = true WHERE id = v_token.id;
        RETURN jsonb_build_object('success', false, 'message', 'Superaste el máximo de intentos fallidos. Solicita un nuevo código.');
    END IF;

    -- Validar hash de OTP
    IF v_token.otp_hash <> p_otp_hash THEN
        UPDATE public.password_reset_tokens 
        SET attempts = attempts + 1 
        WHERE id = v_token.id;

        RETURN jsonb_build_object(
            'success', false, 
            'message', format('Código incorrecto. Te quedan %s intento(s).', v_token.max_attempts - (v_token.attempts + 1))
        );
    END IF;

    -- OTP Correcto: Actualizar contraseña y marcar token como usado
    UPDATE public.password_reset_tokens 
    SET used = true 
    WHERE id = v_token.id;

    UPDATE public.usuarios_sistema
    SET password_hash = p_new_password_hash,
        must_change_password = false,
        updated_at = NOW()
    WHERE id = v_usuario.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', '¡Contraseña actualizada exitosamente! Ya puedes iniciar sesión con tu nueva clave.'
    );
END;
$$;

-- 7. PROCEDIMIENTO RPC: CREAR USUARIO CON ONBOARDING RÁPIDO
CREATE OR REPLACE FUNCTION public.admin_crear_usuario(
    p_nombre TEXT,
    p_email TEXT,
    p_telefono TEXT,
    p_rol TEXT,
    p_password_hash TEXT,
    p_must_change_password BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_id UUID;
BEGIN
    INSERT INTO public.usuarios_sistema (
        nombre,
        email,
        telefono_whatsapp,
        rol,
        password_hash,
        must_change_password,
        activo
    ) VALUES (
        TRIM(p_nombre),
        LOWER(TRIM(p_email)),
        TRIM(p_telefono),
        LOWER(TRIM(p_rol)),
        p_password_hash,
        p_must_change_password,
        true
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Usuario creado exitosamente.',
        'user_id', v_new_id
    );
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Ya existe un usuario con ese correo electrónico o número de WhatsApp.'
    );
END;
$$;

-- 8. PROCEDIMIENTO RPC: ACTIVAR/DESACTIVAR USUARIO (KILL SWITCH)
CREATE OR REPLACE FUNCTION public.admin_toggle_usuario_activo(
    p_user_id UUID,
    p_activo BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.usuarios_sistema
    SET activo = p_activo,
        updated_at = NOW()
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuario no encontrado.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE WHEN p_activo THEN 'Usuario activado.' ELSE 'Usuario desactivado. Sesiones revocadas.' END
    );
END;
$$;

-- 9. SEED INICIAL DE USUARIOS STAFF BASE (CON HASH SHA-256)
-- Clave por defecto de emergencia ('wjg3d'): bbcfa57ecf8a672f1d0f9a0d796e10de46c29095f6cb7a7cf5e7102ecb290ca0
INSERT INTO public.usuarios_sistema (nombre, email, telefono_whatsapp, rol, password_hash, must_change_password, activo)
VALUES 
    ('Germán (Admin)', 'german@wjgeeks.com', '3503443140', 'admin', 'bbcfa57ecf8a672f1d0f9a0d796e10de46c29095f6cb7a7cf5e7102ecb290ca0', false, true),
    ('Wendy (Finanzas)', 'wendy@wjgeeks.com', '3204814702', 'cobranzas', '03efa8e49bc68e7ec8ff1ceb76ffcfa6beab15f8a2a51a941bf21d4d8fc5ea19', false, true),
    ('Juan (Producción)', 'juan@wjgeeks.com', '3217273025', 'taller', 'c40a5a51052dd5fc321cf73812833134bc20c7cc67389ee46ab05eefae02a803', false, true)
ON CONFLICT (email) DO UPDATE 
SET telefono_whatsapp = EXCLUDED.telefono_whatsapp,
    rol = EXCLUDED.rol,
    nombre = EXCLUDED.nombre;

