-- ==============================================================================
-- Migración: Soporte para Claves Flexibles de Acceso del Personal (PIN o Alfanumérica)
-- Archivo: 20261023000003_allow_flexible_user_passwords_and_pins.sql
-- ==============================================================================

-- 1. Ampliar el campo pin_acceso en public.usuarios_taller a TEXT (sin límite de 10 caracteres)
ALTER TABLE public.usuarios_taller ALTER COLUMN pin_acceso TYPE TEXT;

-- 2. Asegurar columnas de hash tanto password_hash como pin_hash
ALTER TABLE public.usuarios_taller ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE public.usuarios_taller ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);

-- 3. Sincronizar hashes existentes si uno de los dos está vacío
UPDATE public.usuarios_taller 
SET password_hash = pin_hash 
WHERE password_hash IS NULL AND pin_hash IS NOT NULL;

UPDATE public.usuarios_taller 
SET pin_hash = password_hash 
WHERE pin_hash IS NULL AND password_hash IS NOT NULL;

-- 4. Extensión pgcrypto para hashing si no está activa
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 5. Procedimiento RPC Transaccional para Cambio y Recuperación de Clave/PIN
CREATE OR REPLACE FUNCTION public.fn_cambiar_pin_usuario(
    p_usuario_id UUID DEFAULT NULL,
    p_pin_actual TEXT DEFAULT NULL,
    p_pin_nuevo TEXT DEFAULT NULL,
    p_es_recuperacion BOOLEAN DEFAULT FALSE,
    p_cedula_verificacion TEXT DEFAULT NULL,
    p_telefono_verificacion TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
    v_new_hash TEXT;
    v_clean_phone TEXT;
BEGIN
    IF p_pin_nuevo IS NULL OR LENGTH(TRIM(p_pin_nuevo)) < 4 THEN
        RETURN jsonb_build_object('success', false, 'message', 'La nueva clave o PIN debe tener al menos 4 caracteres.');
    END IF;

    -- Calcular SHA-256 en Postgres
    v_new_hash := encode(digest(TRIM(p_pin_nuevo), 'sha256'), 'hex');

    IF p_es_recuperacion THEN
        v_clean_phone := regexp_replace(COALESCE(p_telefono_verificacion, ''), '\D', '', 'g');
        SELECT * INTO v_user
        FROM public.usuarios_taller
        WHERE cedula = TRIM(p_cedula_verificacion)
          AND (
            regexp_replace(telefono, '\D', '', 'g') LIKE '%' || v_clean_phone || '%'
            OR regexp_replace(COALESCE(telefono_notificaciones, ''), '\D', '', 'g') LIKE '%' || v_clean_phone || '%'
          )
        LIMIT 1;

        IF v_user IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'No se encontró ningún colaborador con esa cédula y teléfono.');
        END IF;

        UPDATE public.usuarios_taller
        SET pin_acceso = TRIM(p_pin_nuevo),
            password_hash = v_new_hash,
            pin_hash = v_new_hash,
            must_change_password = false,
            updated_at = NOW()
        WHERE id = v_user.id;

        RETURN jsonb_build_object('success', true, 'message', '¡Clave o PIN restablecido con éxito!');
    ELSE
        SELECT * INTO v_user
        FROM public.usuarios_taller
        WHERE id = p_usuario_id
        LIMIT 1;

        IF v_user IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Colaborador no encontrado.');
        END IF;

        -- Validar pin/clave actual si el usuario ya tenía uno configurado
        IF v_user.pin_acceso IS NOT NULL AND v_user.pin_acceso <> TRIM(p_pin_actual) THEN
            -- Chequear hash
            IF v_user.password_hash IS NOT NULL AND v_user.password_hash <> encode(digest(TRIM(p_pin_actual), 'sha256'), 'hex') THEN
                RETURN jsonb_build_object('success', false, 'message', 'La clave o PIN actual no coincide.');
            END IF;
        END IF;

        UPDATE public.usuarios_taller
        SET pin_acceso = TRIM(p_pin_nuevo),
            password_hash = v_new_hash,
            pin_hash = v_new_hash,
            must_change_password = false,
            updated_at = NOW()
        WHERE id = v_user.id;

        RETURN jsonb_build_object('success', true, 'message', '¡Clave de acceso actualizada exitosamente!');
    END IF;
END;
$$;
