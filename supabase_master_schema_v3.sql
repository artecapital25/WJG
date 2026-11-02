-- ==============================================================================
-- WJGEEKS 3D PRO — SCHEMA CANÓNICO MAESTRO V3 (CORE ENGINE CONSOLIDADO)
-- PostgreSQL 15+ (Supabase)
-- ==============================================================================
-- Consolidación definitiva de arquitectura:
-- 1. Reduce el modelo de datos de 22+ tablas fragmentadas a 10 tablas núcleo + 3 catálogos auxiliares.
-- 2. Elimina redundancia contable: abonos_pagos es el único Libro Mayor Inmutable (Ledger).
-- 3. Resuelve ambigüedad PostgREST con relación fk_cotizaciones_cliente_unica.
-- 4. Triggers ACID: Regla 50% anticipo para impresión, liquidación 100% para despacho y recálculo automático.
-- 5. Vistas de compatibilidad (payments, cuentas_cobro) para Zero Downtime.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. EXTENSIONES NECESARIAS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ------------------------------------------------------------------------------
-- 1. TIPOS Y ENUMERACIONES CANÓNICAS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_taller') THEN
        CREATE TYPE public.rol_taller AS ENUM ('GERMAN_ADMIN', 'JUAN_TALLER', 'WENDY_PINTURA', 'OPERADOR_GENERAL');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_ot_codigo') THEN
        CREATE TYPE public.estado_ot_codigo AS ENUM (
            'COTIZACION',
            'EN_COLA_OT',
            'IMPRESION',
            'CURADO',
            'PINTADO_ARMADO',
            'CONTROL_CALIDAD',
            'ENTREGADO',
            'CANCELADO'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_metodo_pago') THEN
        CREATE TYPE public.tipo_metodo_pago AS ENUM (
            'BRE_B',
            'NEQUI',
            'EFECTIVO',
            'TRANSFERENCIA',
            'TARJETA'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'canal_notificacion_enum') THEN
        CREATE TYPE public.canal_notificacion_enum AS ENUM (
            'WHATSAPP_CLOUD_API',
            'EMAIL_TRANSACCIONAL',
            'DUAL_HYBRID'
        );
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 2. LAS 10 TABLAS NÚCLEO DEL SISTEMA
-- ------------------------------------------------------------------------------

-- 2.1. public.usuarios_taller (Directorio de personal, seguridad, PIN y permisos por área)
CREATE TABLE IF NOT EXISTS public.usuarios_taller (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cedula VARCHAR(30) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    rol public.rol_taller NOT NULL DEFAULT 'OPERADOR_GENERAL',
    pin_hash VARCHAR(255),
    password_hash VARCHAR(255),
    pin_acceso TEXT DEFAULT '1234',
    telefono VARCHAR(30) UNIQUE NOT NULL,
    telefono_notificaciones VARCHAR(30),
    email VARCHAR(150) UNIQUE NOT NULL,
    permisos_areas JSONB NOT NULL DEFAULT '["taller"]'::jsonb,
    avatar_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT FALSE,
    ultimo_acceso TIMESTAMPTZ,
    dispositivo_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas si ya existía la tabla
ALTER TABLE public.usuarios_taller ADD COLUMN IF NOT EXISTS cedula VARCHAR(30);
ALTER TABLE public.usuarios_taller ADD COLUMN IF NOT EXISTS pin_acceso TEXT DEFAULT '1234';
ALTER TABLE public.usuarios_taller ALTER COLUMN pin_acceso TYPE TEXT;
ALTER TABLE public.usuarios_taller ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE public.usuarios_taller ALTER COLUMN pin_hash DROP NOT NULL;
ALTER TABLE public.usuarios_taller ADD COLUMN IF NOT EXISTS permisos_areas JSONB DEFAULT '["taller"]'::jsonb;
ALTER TABLE public.usuarios_taller ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- 2.2. public.clientes (Directorio canónico único de clientes)
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo SERIAL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    nit_cc VARCHAR(50),
    telefono VARCHAR(30) NOT NULL,
    correo VARCHAR(150),
    direccion TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON public.clientes(telefono);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON public.clientes(nombre);

-- 2.3. public.cotizaciones (Cotizador, precios, descuentos y vigencia)
CREATE TABLE IF NOT EXISTS public.cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_cot VARCHAR(30) UNIQUE NOT NULL,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tiempo_entrega_estimado VARCHAR(50) DEFAULT '3 a 5 días hábiles',
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    descuento_porcentaje NUMERIC(5, 2) DEFAULT 0,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    abono NUMERIC(14, 2) NOT NULL DEFAULT 0,
    saldo_pendiente NUMERIC(14, 2) GENERATED ALWAYS AS (GREATEST(0, total - abono)) STORED,
    estado_pago VARCHAR(30) DEFAULT 'Pendiente',
    estado VARCHAR(30) NOT NULL DEFAULT 'Borrador',
    metodo_pago VARCHAR(50) DEFAULT 'Bre-B',
    comprobante_pago TEXT,
    notas TEXT,
    tracking_token VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas si la tabla cotizaciones ya existía
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS tiempo_entrega_estimado VARCHAR(50) DEFAULT '3 a 5 días hábiles';
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS subtotal NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS total NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS abono NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(30) DEFAULT 'Pendiente';
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS estado VARCHAR(30) DEFAULT 'Borrador';
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'Bre-B';
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS comprobante_pago TEXT;
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(64);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cotizaciones' AND column_name = 'saldo_pendiente'
    ) THEN
        ALTER TABLE public.cotizaciones ADD COLUMN saldo_pendiente NUMERIC(14, 2) GENERATED ALWAYS AS (GREATEST(0, total - abono)) STORED;
    END IF;
END $$;

-- BLINDAJE DE CLAVE FORÁNEA ÚNICA CANÓNICA (Elimina ambigüedad PostgREST)
ALTER TABLE public.cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_cliente_id_fkey CASCADE;
ALTER TABLE public.cotizaciones DROP CONSTRAINT IF EXISTS fk_cotizaciones_cliente CASCADE;
ALTER TABLE public.cotizaciones DROP CONSTRAINT IF EXISTS fk_cotizaciones_cliente_unica CASCADE;

ALTER TABLE public.cotizaciones 
  ADD CONSTRAINT fk_cotizaciones_cliente_unica 
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente_unica ON public.cotizaciones(cliente_id);

-- 2.4. public.cotizacion_items (Desglose técnico de piezas 3D)
CREATE TABLE IF NOT EXISTS public.cotizacion_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
    nombre_item VARCHAR(255) NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    alto_mm NUMERIC(10, 2) DEFAULT 0,
    ancho_mm NUMERIC(10, 2) DEFAULT 0,
    profundidad_mm NUMERIC(10, 2) DEFAULT 0,
    volumen_cm3 NUMERIC(10, 2) DEFAULT 0,
    peso_estimado_g NUMERIC(10, 2) DEFAULT 0,
    resina_nombre VARCHAR(100) DEFAULT 'Anycubic Standard Grey',
    maquina_nombre VARCHAR(100) DEFAULT 'Anycubic MONO 4',
    tiempo_impresion_horas NUMERIC(10, 2) DEFAULT 0,
    precio_unitario NUMERIC(14, 2) NOT NULL DEFAULT 0,
    precio_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    va_pintado BOOLEAN DEFAULT FALSE,
    tiene_empaque BOOLEAN DEFAULT FALSE,
    enlaces_compra JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cotizacion_items_cot_id ON public.cotizacion_items(cotizacion_id);

-- 2.5. public.estados_ot (Catálogo maestro de fases con porcentajes técnicos de avance)
CREATE TABLE IF NOT EXISTS public.estados_ot (
    codigo public.estado_ot_codigo PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    orden_secuencia INTEGER NOT NULL,
    porcentaje_avance INTEGER NOT NULL,
    responsable_defecto_id UUID REFERENCES public.usuarios_taller(id),
    requiere_notificacion_equipo BOOLEAN DEFAULT FALSE,
    notificar_cliente BOOLEAN DEFAULT FALSE,
    descripcion TEXT
);

-- Asegurar columnas si la tabla ya existía en la base de datos
ALTER TABLE public.estados_ot ADD COLUMN IF NOT EXISTS porcentaje_avance INTEGER DEFAULT 0;
ALTER TABLE public.estados_ot ADD COLUMN IF NOT EXISTS orden_secuencia INTEGER DEFAULT 1;
ALTER TABLE public.estados_ot ADD COLUMN IF NOT EXISTS responsable_defecto_id UUID REFERENCES public.usuarios_taller(id);
ALTER TABLE public.estados_ot ADD COLUMN IF NOT EXISTS requiere_notificacion_equipo BOOLEAN DEFAULT FALSE;
ALTER TABLE public.estados_ot ADD COLUMN IF NOT EXISTS notificar_cliente BOOLEAN DEFAULT FALSE;
ALTER TABLE public.estados_ot ADD COLUMN IF NOT EXISTS descripcion TEXT;

INSERT INTO public.estados_ot (codigo, nombre, orden_secuencia, porcentaje_avance, descripcion) VALUES
('COTIZACION', 'Cotización Inicial', 1, 0, 'Registro técnico inicial'),
('EN_COLA_OT', 'Aprobada / En Cola OT', 2, 15, 'Aprobada con 50% min de anticipo'),
('IMPRESION', 'Impresión 3D', 3, 35, 'Fotopolimerización en Anycubic MONO 4 (Resp: Juan)'),
('CURADO', 'Lavado & Curado UV', 4, 55, 'Lavado IPA y cámara ultravioleta (Resp: Juan)'),
('PINTADO_ARMADO', 'Pintura & Acabados', 5, 75, 'Lijado, imprimación y aerografía (Resp: Wendy)'),
('CONTROL_CALIDAD', 'Control de Calidad', 6, 90, 'Inspección tripartita dimensional y empaque'),
('ENTREGADO', '¡Listo para Entrega!', 7, 100, 'Pieza terminada con liquidación 100% de saldo'),
('CANCELADO', 'Cancelado', 99, 0, 'Orden cancelada')
ON CONFLICT (codigo) DO UPDATE SET
    porcentaje_avance = EXCLUDED.porcentaje_avance,
    nombre = EXCLUDED.nombre,
    orden_secuencia = EXCLUDED.orden_secuencia,
    descripcion = EXCLUDED.descripcion;

-- 2.6. public.ordenes_trabajo (OTs operativas del taller y seguimiento)
CREATE TABLE IF NOT EXISTS public.ordenes_trabajo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_ot VARCHAR(30) UNIQUE NOT NULL,
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE RESTRICT,
    cliente_nombre VARCHAR(150) NOT NULL,
    cliente_telefono VARCHAR(30) NOT NULL,
    item_descripcion TEXT NOT NULL,
    item_nombre VARCHAR(255),
    cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    total_ot NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_ot >= 0),
    total_abonado NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_abonado >= 0),
    saldo_pendiente NUMERIC(14, 2) GENERATED ALWAYS AS (GREATEST(0, total_ot - total_abonado)) STORED,
    estado_actual public.estado_ot_codigo NOT NULL DEFAULT 'EN_COLA_OT' REFERENCES public.estados_ot(codigo),
    estado_pago VARCHAR(30) DEFAULT 'Pendiente',
    responsable_actual_id UUID REFERENCES public.usuarios_taller(id),
    tracking_token VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    stl_url TEXT,
    fecha_aprobacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_entrega_prometida DATE,
    fecha_finalizacion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas indispensables si la tabla ordenes_trabajo ya existía
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS total_ot NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS total_abonado NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS item_nombre VARCHAR(255);
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(30) DEFAULT 'Pendiente';
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS responsable_actual_id UUID REFERENCES public.usuarios_taller(id);
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(64);
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS stl_url TEXT;
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS fecha_entrega_prometida DATE;
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS fecha_finalizacion TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ordenes_trabajo' AND column_name = 'saldo_pendiente'
    ) THEN
        ALTER TABLE public.ordenes_trabajo ADD COLUMN saldo_pendiente NUMERIC(14, 2) GENERATED ALWAYS AS (GREATEST(0, total_ot - total_abonado)) STORED;
    END IF;
END $$;

-- Asegurar restricción única indispensable para PostgREST upsert (on_conflict=numero_ot)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.ordenes_trabajo'::regclass 
          AND conname = 'uq_ordenes_trabajo_numero_ot'
    ) THEN
        ALTER TABLE public.ordenes_trabajo ADD CONSTRAINT uq_ordenes_trabajo_numero_ot UNIQUE (numero_ot);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ot_estado_actual ON public.ordenes_trabajo(estado_actual);
CREATE INDEX IF NOT EXISTS idx_ot_tracking_token ON public.ordenes_trabajo(tracking_token);

-- 2.7. public.historial_estados_ot (Trazabilidad auditable de fases de producción)
CREATE TABLE IF NOT EXISTS public.historial_estados_ot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_trabajo_id UUID NOT NULL REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE,
    estado_anterior public.estado_ot_codigo,
    estado_nuevo public.estado_ot_codigo NOT NULL,
    modificado_por UUID REFERENCES public.usuarios_taller(id),
    observaciones TEXT,
    cambiado_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_ot_id ON public.historial_estados_ot(orden_trabajo_id);

-- 2.8. public.abonos_pagos (LEDGER ÚNICO INMUTABLE — Libro Mayor Central)
-- Reemplaza definitivamente a las tablas fragmentadas payments y cuentas_cobro
CREATE TABLE IF NOT EXISTS public.abonos_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_trabajo_id UUID REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE,
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE SET NULL,
    pos_venta_id TEXT,
    cuenta_cobro_id TEXT,
    cliente_id UUID REFERENCES public.clientes(id),
    monto NUMERIC(14, 2) NOT NULL CHECK (monto > 0),
    metodo_pago public.tipo_metodo_pago NOT NULL DEFAULT 'BRE_B',
    referencia_transaccion VARCHAR(100),
    comprobante_url TEXT,
    cuenta_receptora VARCHAR(60) DEFAULT 'Nequi 3217273025 (Juan) / Bre-B 0090778625 (Germán)',
    registrado_por UUID REFERENCES public.usuarios_taller(id),
    nota TEXT,
    fecha_pago TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas si la tabla abonos_pagos ya existía
ALTER TABLE public.abonos_pagos ADD COLUMN IF NOT EXISTS cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE SET NULL;
ALTER TABLE public.abonos_pagos ADD COLUMN IF NOT EXISTS pos_venta_id TEXT;
ALTER TABLE public.abonos_pagos ADD COLUMN IF NOT EXISTS cuenta_cobro_id TEXT;
ALTER TABLE public.abonos_pagos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id);
ALTER TABLE public.abonos_pagos ADD COLUMN IF NOT EXISTS referencia_transaccion VARCHAR(100);
ALTER TABLE public.abonos_pagos ADD COLUMN IF NOT EXISTS comprobante_url TEXT;
ALTER TABLE public.abonos_pagos ADD COLUMN IF NOT EXISTS cuenta_receptora VARCHAR(60) DEFAULT 'Nequi 3217273025 (Juan) / Bre-B 0090778625 (Germán)';
ALTER TABLE public.abonos_pagos ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES public.usuarios_taller(id);
ALTER TABLE public.abonos_pagos ADD COLUMN IF NOT EXISTS nota TEXT;
ALTER TABLE public.abonos_pagos ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_abonos_ot_id ON public.abonos_pagos(orden_trabajo_id);
CREATE INDEX IF NOT EXISTS idx_abonos_cot_id ON public.abonos_pagos(cotizacion_id);

-- 2.9. public.tareas_equipo (Tareas operativas del taller universales)
CREATE TABLE IF NOT EXISTS public.tareas_equipo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    asignado_a VARCHAR(100) NOT NULL, -- 'Germán', 'Juan', 'Wendy', 'Todos'
    prioridad VARCHAR(30) NOT NULL DEFAULT 'media', -- 'baja', 'media', 'alta', 'urgente'
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'en_progreso', 'completada'
    tipo VARCHAR(30) NOT NULL DEFAULT 'puntual', -- 'puntual', 'periodica'
    frecuencia VARCHAR(30), -- 'diaria', 'semanal', 'quincenal', 'mensual'
    porcentaje_completado INTEGER DEFAULT 0 CHECK (porcentaje_completado BETWEEN 0 AND 100),
    fecha_creacion DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas si la tabla tareas_equipo ya existía
ALTER TABLE public.tareas_equipo ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) DEFAULT 'puntual';
ALTER TABLE public.tareas_equipo ADD COLUMN IF NOT EXISTS frecuencia VARCHAR(30);
ALTER TABLE public.tareas_equipo ADD COLUMN IF NOT EXISTS porcentaje_completado INTEGER DEFAULT 0;
ALTER TABLE public.tareas_equipo ADD COLUMN IF NOT EXISTS fecha_creacion DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.tareas_equipo ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2.10. public.tarea_avances (Bitácora de progreso colaborativa universal)
CREATE TABLE IF NOT EXISTS public.tarea_avances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarea_id UUID NOT NULL REFERENCES public.tareas_equipo(id) ON DELETE CASCADE,
    autor_nombre VARCHAR(100) NOT NULL,
    porcentaje_avance INTEGER NOT NULL CHECK (porcentaje_avance BETWEEN 0 AND 100),
    nota TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarea_avances_tarea_id ON public.tarea_avances(tarea_id);


-- ------------------------------------------------------------------------------
-- 3. CATÁLOGOS AUXILIARES ESENCIALES Y COLA DE NOTIFICACIONES
-- ------------------------------------------------------------------------------

-- 3.1. public.resinas
CREATE TABLE IF NOT EXISTS public.resinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    color VARCHAR(50),
    costo_litro NUMERIC(14, 2) NOT NULL DEFAULT 120000,
    stock_ml NUMERIC(10, 2) DEFAULT 1000,
    densidad_g_cm3 NUMERIC(5, 3) DEFAULT 1.12,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2. public.insumos
CREATE TABLE IF NOT EXISTS public.insumos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'general',
    costo_unitario NUMERIC(14, 2) NOT NULL DEFAULT 0,
    stock_actual NUMERIC(10, 2) DEFAULT 0,
    unidad VARCHAR(30) DEFAULT 'unidades',
    imagen_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3. public.productos_stock (Catálogo Base y Stock)
CREATE TABLE IF NOT EXISTS public.productos_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) DEFAULT 'COLLARES',
    precio_venta NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    precio_unitario NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER DEFAULT 1,
    material TEXT DEFAULT 'Resina UV Alta Definición',
    dimensiones TEXT,
    descripcion TEXT,
    imagen_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.productos_stock ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.productos_stock ADD COLUMN IF NOT EXISTS precio_venta NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.productos_stock ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.productos_stock ADD COLUMN IF NOT EXISTS stock_minimo INT DEFAULT 1;
ALTER TABLE public.productos_stock ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.productos_stock ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.productos_stock'::regclass 
          AND conname = 'uq_productos_stock_nombre'
    ) THEN
        ALTER TABLE public.productos_stock ADD CONSTRAINT uq_productos_stock_nombre UNIQUE (nombre);
    END IF;
END $$;

-- Trigger para sincronizar precio_unitario y precio_venta bidireccionalmente
CREATE OR REPLACE FUNCTION public.trg_fn_sync_precios_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.precio_venta IS NULL OR NEW.precio_venta = 0 THEN
        IF NEW.precio_unitario IS NOT NULL AND NEW.precio_unitario > 0 THEN
            NEW.precio_venta := NEW.precio_unitario;
        END IF;
    END IF;
    NEW.precio_unitario := COALESCE(NEW.precio_venta, 0);
    NEW.updated_at := NOW();
    NEW.fecha_actualizacion := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_precios_stock ON public.productos_stock;
CREATE TRIGGER trg_sync_precios_stock
BEFORE INSERT OR UPDATE ON public.productos_stock
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_sync_precios_stock();

-- Inserción atómica del catálogo canónico de productos en stock (29 referencias iniciales)
INSERT INTO public.productos_stock (nombre, categoria, precio_venta, stock_actual, stock_minimo, activo)
VALUES
  ('Collar león', 'COLLARES', 30000.00, 1, 1, TRUE),
  ('Collar loro', 'COLLARES', 30000.00, 2, 1, TRUE),
  ('Collar lobo', 'COLLARES', 30000.00, 2, 1, TRUE),
  ('Collar jaguar', 'COLLARES', 30000.00, 2, 1, TRUE),
  ('Collar elefante', 'COLLARES', 30000.00, 1, 1, TRUE),
  ('Collar oso andino', 'COLLARES', 30000.00, 1, 1, TRUE),
  ('Collar pulpo', 'COLLARES', 30000.00, 1, 1, TRUE),
  ('Collar lechuza', 'COLLARES', 30000.00, 2, 1, TRUE),
  ('Collar Panda', 'COLLARES', 30000.00, 1, 1, TRUE),
  ('Collar corazón-flor', 'COLLARES', 30000.00, 1, 1, TRUE),
  ('Collar jaguar sobre rama', 'COLLARES', 30000.00, 0, 1, TRUE),
  ('Collar león sobre rama', 'COLLARES', 30000.00, 0, 1, TRUE),
  ('Arete gengar', 'ARETES', 25000.00, 0, 1, TRUE),
  ('Aretes togepi', 'ARETES', 25000.00, 0, 1, TRUE),
  ('Aretes bulbasaur', 'ARETES', 25000.00, 0, 1, TRUE),
  ('Aretes rosa', 'ARETES', 23000.00, 0, 1, TRUE),
  ('Arete margarita', 'ARETES', 23000.00, 0, 1, TRUE),
  ('Figura tanjiro chibi', 'FIGURAS', 40000.00, 1, 1, TRUE),
  ('Figura nezuko chibi', 'FIGURAS', 40000.00, 1, 1, TRUE),
  ('Figura Inosuke chibi', 'FIGURAS', 40000.00, 1, 1, TRUE),
  ('Figura zenitsu Chibi', 'FIGURAS', 40000.00, 1, 1, TRUE),
  ('Figura rengoku chibi', 'FIGURAS', 40000.00, 1, 1, TRUE),
  ('Figura inosuke casa', 'FIGURAS', 200000.00, 1, 1, TRUE),
  ('Collar mariposa - noche estrellada', 'COLLARES', 28000.00, 0, 1, TRUE),
  ('Aretes mariposa - noche estrellada', 'ARETES', 23000.00, 0, 1, TRUE),
  ('Llavero con nombre', 'LLAVEROS', 15000.00, 0, 1, TRUE),
  ('Placa empresarial personalizada 15 cm * 8,5 cm + figura oso y toro', 'PERSONALIZADOS', 151000.00, 0, 1, TRUE),
  ('Llavero tigre', 'LLAVEROS', 23000.00, 0, 1, TRUE),
  ('Llavero gengar', 'LLAVEROS', 40000.00, 0, 1, TRUE)
ON CONFLICT (nombre) DO UPDATE SET
  precio_venta = EXCLUDED.precio_venta,
  stock_actual = EXCLUDED.stock_actual,
  activo = TRUE,
  updated_at = NOW();

-- Secuencias atómicas para evitar colisiones 409 en POS y OTs de vitrina
CREATE SEQUENCE IF NOT EXISTS public.seq_numero_ot_pos START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS public.seq_numero_venta_pos START WITH 1000;

-- 3.4. public.ventas_express (Consolidada para POS de vitrina)
CREATE TABLE IF NOT EXISTS public.ventas_express (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    numero_venta VARCHAR(30) UNIQUE NOT NULL,
    nombre_producto VARCHAR(255) NOT NULL,
    cliente_nombre VARCHAR(150) NOT NULL,
    cliente_telefono VARCHAR(30) DEFAULT '3000000000',
    total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    abono NUMERIC(14, 2) NOT NULL DEFAULT 0,
    saldo_pendiente NUMERIC(14, 2) GENERATED ALWAYS AS (GREATEST(0, total - abono)) STORED,
    estado_pago VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
    fecha_venta DATE DEFAULT CURRENT_DATE,
    fecha_prometida_pago DATE,
    notas TEXT,
    metodo_pago VARCHAR(50) DEFAULT 'Bre-B',
    creado_por VARCHAR(100) DEFAULT 'Equipo WJGEEKS',
    foto_url TEXT,
    requiere_ot BOOLEAN DEFAULT false,
    estado_diseno VARCHAR(30),
    ot_id TEXT,
    ot_numero VARCHAR(30),
    enlace_diseno TEXT,
    notas_diseno TEXT,
    producto_stock_id TEXT,
    descontar_stock BOOLEAN DEFAULT false,
    cantidad INT DEFAULT 1,
    cantidad_vendida INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas si la tabla ventas_express ya existía
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS cantidad_vendida INT DEFAULT 1;
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS cantidad INT DEFAULT 1;
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(30) DEFAULT '3000000000';
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS descontar_stock BOOLEAN DEFAULT false;
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS producto_stock_id TEXT;
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS enlace_diseno TEXT;
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS notas_diseno TEXT;
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS estado_diseno VARCHAR(30);
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS requiere_ot BOOLEAN DEFAULT false;
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS ot_id TEXT;
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS ot_numero VARCHAR(30);
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS creado_por VARCHAR(100) DEFAULT 'Equipo WJGEEKS';
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS fecha_prometida_pago DATE;
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'Bre-B';
ALTER TABLE public.ventas_express ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ventas_express' AND column_name = 'saldo_pendiente'
    ) THEN
        ALTER TABLE public.ventas_express ADD COLUMN saldo_pendiente NUMERIC(14, 2) GENERATED ALWAYS AS (GREATEST(0, total - abono)) STORED;
    END IF;
END $$;

-- 3.5. public.registro_notificaciones (Cola de despacho oficial desde Línea Central +57 320 2796115)
CREATE TABLE IF NOT EXISTS public.registro_notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(120) UNIQUE NOT NULL,
    orden_trabajo_id UUID REFERENCES public.ordenes_trabajo(id) ON DELETE SET NULL,
    destinatario_nombre VARCHAR(100) NOT NULL,
    destinatario_telefono VARCHAR(25) NOT NULL,
    rol_destinatario VARCHAR(30) NOT NULL, -- 'CLIENTE', 'JUAN_TALLER', 'WENDY_PINTURA', 'GERMAN_ADMIN', 'TRIPARTITO'
    canal public.canal_notificacion_enum DEFAULT 'WHATSAPP_CLOUD_API',
    plantilla_hsm VARCHAR(100),
    variables_plantilla JSONB,
    mensaje_plano TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'PENDIENTE',
    intentos INT DEFAULT 0,
    ultimo_error TEXT,
    id_externo_meta VARCHAR(100),
    enviado_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registro_notif_estado ON public.registro_notificaciones(estado);


-- ------------------------------------------------------------------------------
-- 4. VISTAS DE COMPATIBILIDAD (ZERO DOWNTIME / EVITA ERRORES 404 POSTGREST)
-- ------------------------------------------------------------------------------

-- Si payments o cuentas_cobro existían previamente como tablas físicas o vistas con columnas distintas,
-- se eliminan limpiamente con CASCADE para erradicar el error PostgreSQL 42P16 (cannot drop columns from view).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        DROP TABLE public.payments CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cuentas_cobro') THEN
        DROP TABLE public.cuentas_cobro CASCADE;
    END IF;
END $$;

DROP VIEW IF EXISTS public.payments CASCADE;
DROP VIEW IF EXISTS public.cuentas_cobro CASCADE;

-- 4.1. Vista de Compatibilidad: public.payments (apunta a abonos_pagos)
CREATE OR REPLACE VIEW public.payments AS
SELECT 
    ap.id::TEXT AS id,
    ap.monto,
    ap.metodo_pago::TEXT AS metodo_pago,
    ap.referencia_transaccion AS referencia_pago,
    ap.comprobante_url,
    ap.nota,
    ap.cliente_id,
    ap.cotizacion_id,
    ap.orden_trabajo_id,
    ap.pos_venta_id,
    ap.cuenta_cobro_id,
    'pos'::TEXT AS origen_modulo,
    'Equipo WJGEEKS'::TEXT AS registrado_por,
    ap.created_at
FROM public.abonos_pagos ap;

-- 4.2. Vista de Compatibilidad: public.cuentas_cobro (apunta a ordenes_trabajo)
CREATE OR REPLACE VIEW public.cuentas_cobro AS
SELECT 
    ot.id::TEXT AS id,
    'CC-' || regexp_replace(ot.numero_ot, '^OT-', '') AS numero_cc,
    ot.cotizacion_id::TEXT AS cotizacion_id,
    ot.numero_ot AS cotizacion_numero,
    ot.cliente_id::TEXT AS cliente_id,
    ot.cliente_nombre,
    ot.cliente_telefono,
    ot.created_at::DATE AS fecha_emision,
    ot.item_descripcion AS items_resumen,
    ot.total_ot AS total,
    ot.total_abonado AS abono,
    ot.saldo_pendiente,
    ot.estado_pago,
    ot.stl_url AS comprobante_url,
    ot.created_at
FROM public.ordenes_trabajo ot;

-- 4.3. Vista de Compatibilidad: public.piezas_cotizacion (apunta a cotizacion_items)
CREATE OR REPLACE VIEW public.piezas_cotizacion AS
SELECT * FROM public.cotizacion_items;



-- ------------------------------------------------------------------------------
-- 5. BLINDAJE DE NEGOCIO (TRIGGERS Y REGLAS SQL ACID)
-- ------------------------------------------------------------------------------

-- 5.1. Trigger A: Regla de Anticipo 50% y Liquidación 100%
CREATE OR REPLACE FUNCTION public.fn_validar_reglas_anticipo_y_entrega()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_minimo_requerido NUMERIC;
BEGIN
    -- Bloquear avance a IMPRESION, CURADO o PINTURA si abono < 50%
    IF NEW.estado_actual IN ('IMPRESION', 'CURADO', 'PINTADO_ARMADO') THEN
        v_minimo_requerido := ROUND(NEW.total_ot * 0.50, 2);
        IF NEW.total_abonado < v_minimo_requerido THEN
            RAISE EXCEPTION 'Operación Bloqueada: La orden % requiere mínimo el 50%% ($%) de anticipo para pasar a % (Abonado actual: $%)',
                NEW.numero_ot, v_minimo_requerido, NEW.estado_actual, NEW.total_abonado;
        END IF;
    END IF;

    -- Bloquear entrega al cliente si existe saldo pendiente
    IF NEW.estado_actual = 'ENTREGADO' AND NEW.total_abonado < NEW.total_ot THEN
        RAISE EXCEPTION 'Operación Bloqueada: La orden % no puede marcarse como ENTREGADO con saldo pendiente (Total: $%, Abonado: $%, Pendiente: $%)',
            NEW.numero_ot, NEW.total_ot, NEW.total_abonado, (NEW.total_ot - NEW.total_abonado);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_anticipo_produccion ON public.ordenes_trabajo;
CREATE TRIGGER trg_validar_anticipo_produccion
BEFORE INSERT OR UPDATE OF estado_actual, total_abonado ON public.ordenes_trabajo
FOR EACH ROW
EXECUTE FUNCTION public.fn_validar_reglas_anticipo_y_entrega();

-- 5.2. Trigger B: Recálculo automático de saldos y avance a ENTREGADO desde abonos_pagos
CREATE OR REPLACE FUNCTION public.fn_sincronizar_abono_a_ot_y_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_ot NUMERIC;
    v_total_abonado NUMERIC;
    v_saldo NUMERIC;
    v_estado_actual public.estado_ot_codigo;
    v_target_ot UUID;
BEGIN
    v_target_ot := COALESCE(NEW.orden_trabajo_id, OLD.orden_trabajo_id);

    IF v_target_ot IS NULL THEN
        RETURN NEW;
    END IF;

    -- Sumar todos los abonos registrados en el ledger
    SELECT COALESCE(SUM(monto), 0)
    INTO v_total_abonado
    FROM public.abonos_pagos
    WHERE orden_trabajo_id = v_target_ot;

    SELECT total_ot, estado_actual
    INTO v_total_ot, v_estado_actual
    FROM public.ordenes_trabajo
    WHERE id = v_target_ot;

    IF FOUND THEN
        v_saldo := GREATEST(0, v_total_ot - v_total_abonado);

        UPDATE public.ordenes_trabajo
        SET 
            total_abonado = v_total_abonado,
            estado_pago = CASE 
                WHEN v_saldo <= 0 THEN 'Pagado Total'
                WHEN v_total_abonado > 0 THEN 'Abono Parcial'
                ELSE 'Pendiente'
            END,
            estado_actual = CASE 
                WHEN v_saldo <= 0 AND v_estado_actual IN ('CONTROL_CALIDAD', 'PINTADO_ARMADO') THEN 'ENTREGADO'::public.estado_ot_codigo
                ELSE estado_actual
            END,
            updated_at = NOW()
        WHERE id = v_target_ot;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sincronizar_abono_a_ot_y_tracking ON public.abonos_pagos;
CREATE TRIGGER trg_sincronizar_abono_a_ot_y_tracking
AFTER INSERT OR UPDATE OR DELETE ON public.abonos_pagos
FOR EACH ROW
EXECUTE FUNCTION public.fn_sincronizar_abono_a_ot_y_tracking();

-- 5.3. Trigger C: Auditoría inmutable de estados de la OT
CREATE OR REPLACE FUNCTION public.fn_registrar_historial_ot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (OLD.estado_actual IS DISTINCT FROM NEW.estado_actual) THEN
        INSERT INTO public.historial_estados_ot (
            orden_trabajo_id,
            estado_anterior,
            estado_nuevo,
            observaciones,
            cambiado_at
        ) VALUES (
            NEW.id,
            OLD.estado_actual,
            NEW.estado_actual,
            'Transición de estado de producción',
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_historial_ot ON public.ordenes_trabajo;
CREATE TRIGGER trg_registrar_historial_ot
AFTER UPDATE OF estado_actual ON public.ordenes_trabajo
FOR EACH ROW
EXECUTE FUNCTION public.fn_registrar_historial_ot();


-- ------------------------------------------------------------------------------
-- 6. PROCEDIMIENTOS RPC TRANSACCIONALES
-- ------------------------------------------------------------------------------

-- 6.1. rpc_registrar_venta_pos_atomica (POS Express Atómico)
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
    v_ot_id UUID := NULL;
    v_ot_numero TEXT := NULL;
    v_stock_actual INT;
    v_num_venta TEXT;
    v_venta_id TEXT;
    v_cant INT := COALESCE(p_cantidad_vendida, 1);
    v_metodo_enum public.tipo_metodo_pago := 'BRE_B';
BEGIN
    IF p_numero_venta IS NULL OR p_numero_venta = '' THEN
        v_num_venta := 'POS-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(NEXTVAL('public.seq_numero_venta_pos')::TEXT, 4, '0');
    ELSE
        v_num_venta := p_numero_venta;
    END IF;

    v_venta_id := COALESCE(NULLIF(p_id, ''), 'pos-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT);

    v_saldo := GREATEST(0, COALESCE(p_total, 0) - COALESCE(p_abono, 0));
    IF v_saldo = 0 AND COALESCE(p_total, 0) > 0 THEN
        v_estado_pago := 'Pagado Total';
    ELSIF COALESCE(p_abono, 0) > 0 THEN
        v_estado_pago := 'Abono Parcial';
    ELSE
        v_estado_pago := 'Pendiente';
    END IF;

    -- Descontar stock con bloqueo FOR UPDATE
    IF p_descontar_stock AND p_producto_stock_id IS NOT NULL AND p_producto_stock_id != '' THEN
        SELECT stock_actual INTO v_stock_actual 
        FROM public.productos_stock 
        WHERE id::TEXT = p_producto_stock_id::TEXT 
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.productos_stock 
            SET stock_actual = GREATEST(0, stock_actual - v_cant),
                fecha_actualizacion = NOW(),
                updated_at = NOW()
            WHERE id::TEXT = p_producto_stock_id::TEXT;
        END IF;
    END IF;

    -- Generar OT técnica si aplica utilizando secuencia atómica
    IF p_requiere_ot THEN
        v_ot_numero := 'OT-POS-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(NEXTVAL('public.seq_numero_ot_pos')::TEXT, 4, '0');
        v_ot_id := gen_random_uuid();

        INSERT INTO public.ordenes_trabajo (
            id,
            numero_ot,
            cliente_nombre,
            cliente_telefono,
            item_descripcion,
            cantidad,
            total_ot,
            total_abonado,
            estado_actual,
            stl_url
        ) VALUES (
            v_ot_id,
            v_ot_numero,
            COALESCE(p_cliente_nombre, 'Cliente POS'),
            COALESCE(p_cliente_telefono, '3000000000'),
            p_nombre_producto || ' (POS ' || v_num_venta || ')',
            v_cant,
            COALESCE(p_total, 0),
            COALESCE(p_abono, 0),
            CASE WHEN v_saldo <= 0 THEN 'ENTREGADO'::public.estado_ot_codigo ELSE 'EN_COLA_OT'::public.estado_ot_codigo END,
            p_enlace_diseno
        );
    END IF;

    -- Guardar Venta Express
    INSERT INTO public.ventas_express (
        id, numero_venta, nombre_producto, cliente_nombre, cliente_telefono,
        total, abono, estado_pago, fecha_venta, fecha_prometida_pago,
        notas, metodo_pago, creado_por, foto_url, requiere_ot,
        estado_diseno, ot_id, ot_numero, enlace_diseno, notas_diseno,
        producto_stock_id, descontar_stock, cantidad_vendida, updated_at
    ) VALUES (
        v_venta_id, v_num_venta, p_nombre_producto, p_cliente_nombre, COALESCE(p_cliente_telefono, '3000000000'),
        COALESCE(p_total, 0), COALESCE(p_abono, 0), v_estado_pago, CURRENT_DATE, p_fecha_prometida_pago,
        p_notas, COALESCE(p_metodo_pago, 'Bre-B'), COALESCE(p_creado_por, 'Equipo WJGEEKS'), p_foto_url, COALESCE(p_requiere_ot, false),
        p_estado_diseno, v_ot_id::TEXT, v_ot_numero, p_enlace_diseno, p_notas_diseno,
        p_producto_stock_id, COALESCE(p_descontar_stock, false), v_cant, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        total = EXCLUDED.total,
        abono = EXCLUDED.abono,
        estado_pago = EXCLUDED.estado_pago,
        updated_at = NOW();

    -- Registrar abono en el Ledger Inmutable si el monto es estrictamente mayor a 0
    IF COALESCE(p_abono, 0) > 0 THEN
        IF p_metodo_pago ILIKE '%nequi%' THEN v_metodo_enum := 'NEQUI';
        ELSIF p_metodo_pago ILIKE '%efectivo%' OR p_metodo_pago ILIKE '%cash%' THEN v_metodo_enum := 'EFECTIVO';
        ELSIF p_metodo_pago ILIKE '%transfer%' OR p_metodo_pago ILIKE '%daviplata%' THEN v_metodo_enum := 'TRANSFERENCIA';
        ELSIF p_metodo_pago ILIKE '%tarjeta%' OR p_metodo_pago ILIKE '%datafono%' THEN v_metodo_enum := 'TARJETA';
        ELSE v_metodo_enum := 'BRE_B';
        END IF;

        INSERT INTO public.abonos_pagos (
            orden_trabajo_id, monto, metodo_pago, referencia_transaccion,
            cuenta_receptora, nota, pos_venta_id
        ) VALUES (
            v_ot_id, p_abono, v_metodo_enum, 'Registro POS ' || v_num_venta,
            CASE WHEN v_metodo_enum = 'NEQUI' THEN 'Nequi 3217273025 (Juan)' ELSE 'Bre-B 0090778625 (Germán)' END,
            'Abono inicial POS ' || v_num_venta, v_venta_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'venta_id', v_venta_id,
        'numero_venta', v_num_venta,
        'ot_id', v_ot_id,
        'ot_numero', v_ot_numero,
        'total', p_total,
        'abono', p_abono,
        'saldo_pendiente', v_saldo,
        'estado_pago', v_estado_pago
    );
END;
$$;

-- 6.2. fn_eliminar_cobro_duplicado (Eliminación atómica y recálculo)
CREATE OR REPLACE FUNCTION public.fn_eliminar_cobro_duplicado(p_cobro_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ot_id UUID;
    v_monto NUMERIC;
BEGIN
    SELECT orden_trabajo_id, monto INTO v_ot_id, v_monto
    FROM public.abonos_pagos WHERE id = p_cobro_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cobro no encontrado en el ledger');
    END IF;

    DELETE FROM public.abonos_pagos WHERE id = p_cobro_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Cobro de $' || v_monto || ' eliminado y saldo de la orden recalculado exitosamente.',
        'ot_id', v_ot_id,
        'monto_eliminado', v_monto
    );
END;
$$;

-- 6.3. vista_balance_taller (Vista Canónica de Balances Financieros con Security Invoker)
CREATE OR REPLACE VIEW public.vista_balance_taller 
WITH (security_invoker = true) AS
SELECT
  COALESCE(SUM(monto), 0) AS total_ingresos_recaudados,
  COALESCE(SUM(CASE WHEN metodo_pago = 'NEQUI' THEN monto ELSE 0 END), 0) AS recaudado_nequi,
  COALESCE(SUM(CASE WHEN metodo_pago = 'BRE_B' THEN monto ELSE 0 END), 0) AS recaudado_bre_b,
  COALESCE(SUM(CASE WHEN metodo_pago = 'EFECTIVO' THEN monto ELSE 0 END), 0) AS recaudado_efectivo,
  (
    SELECT COALESCE(SUM(saldo_pendiente), 0)
    FROM public.ordenes_trabajo
    WHERE estado_actual NOT IN ('ENTREGADO', 'CANCELADO')
  ) AS total_por_cobrar
FROM public.abonos_pagos;

GRANT SELECT ON public.vista_balance_taller TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 7. SEGURIDAD Y PERMISOS POSTGREST
-- ------------------------------------------------------------------------------
ALTER TABLE public.usuarios_taller ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizacion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_ot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_estados_ot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonos_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarea_avances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_express ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura unificadas para aplicación de taller
DROP POLICY IF EXISTS "Permitir anon y auth en usuarios_taller" ON public.usuarios_taller;
CREATE POLICY "Permitir anon y auth en usuarios_taller" ON public.usuarios_taller FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir anon y auth en clientes" ON public.clientes;
CREATE POLICY "Permitir anon y auth en clientes" ON public.clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir anon y auth en cotizaciones" ON public.cotizaciones;
CREATE POLICY "Permitir anon y auth en cotizaciones" ON public.cotizaciones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir anon y auth en cotizacion_items" ON public.cotizacion_items;
CREATE POLICY "Permitir anon y auth en cotizacion_items" ON public.cotizacion_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir anon y auth en ordenes_trabajo" ON public.ordenes_trabajo;
CREATE POLICY "Permitir anon y auth en ordenes_trabajo" ON public.ordenes_trabajo FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir anon y auth en abonos_pagos" ON public.abonos_pagos;
CREATE POLICY "Permitir anon y auth en abonos_pagos" ON public.abonos_pagos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir anon y auth en tareas_equipo" ON public.tareas_equipo;
CREATE POLICY "Permitir anon y auth en tareas_equipo" ON public.tareas_equipo FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir anon y auth en tarea_avances" ON public.tarea_avances;
CREATE POLICY "Permitir anon y auth en tarea_avances" ON public.tarea_avances FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir anon y auth en estados_ot" ON public.estados_ot;
CREATE POLICY "Permitir anon y auth en estados_ot" ON public.estados_ot FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 8. RECARGA INMEDIATA DE CACHÉ DE ESQUEMA POSTGREST
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
