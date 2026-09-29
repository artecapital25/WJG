-- ========================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS SUPABASE / POSTGRESQL
-- PLATAFORMA DE COTIZACIÓN Y PRODUCCIÓN 3D: WJGEEKS
-- ========================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE CONFIGURACIÓN DEL TALLER
CREATE TABLE IF NOT EXISTS configuracion_taller (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tarifa_kwh NUMERIC(10, 2) NOT NULL DEFAULT 834.0,
    margen_merma_resina NUMERIC(5, 2) NOT NULL DEFAULT 1.4, -- 40% desperdicio y soportes
    telefono_contacto VARCHAR(20) DEFAULT '3217273025',
    telefono_contacto2 VARCHAR(20) DEFAULT '3202796115',
    instagram VARCHAR(50) DEFAULT '@WJGEEKS3D',
    nequi VARCHAR(20) DEFAULT '3217273025',
    daviplata VARCHAR(20) DEFAULT '3217273025',
    bancolombia VARCHAR(50) DEFAULT 'Ahorros 245-000123-98',
    titular_cuenta VARCHAR(100) DEFAULT 'WJGEEKS 3D',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo SERIAL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    nit_cc VARCHAR(30),
    telefono VARCHAR(30) NOT NULL,
    correo VARCHAR(100),
    direccion TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE PROVEEDORES
CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(30),
    rubro VARCHAR(50), -- Resinas, Insumos, Ferretería, Empaque
    enlace_web TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE RESINAS
CREATE TABLE IF NOT EXISTS resinas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(100) NOT NULL, -- Resina Standar, High Speed, ABS-like, etc.
    marca VARCHAR(80) NOT NULL DEFAULT 'Anycubic',
    color VARCHAR(50) NOT NULL,
    volumen_l NUMERIC(8, 2) NOT NULL DEFAULT 1.0,
    densidad_g_cm3 NUMERIC(6, 3) NOT NULL DEFAULT 1.13,
    peso_g NUMERIC(8, 2) NOT NULL DEFAULT 1130.0,
    precio_compra NUMERIC(12, 2) NOT NULL,
    costo_gramo NUMERIC(10, 4) NOT NULL,
    velocidad_impresion_mm_h NUMERIC(6, 2) NOT NULL DEFAULT 20.0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE MAQUINARIA
CREATE TABLE IF NOT EXISTS maquinas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- Impresora 3D, Wash & Cure, Aerógrafo/Compresor
    consumo_kwh NUMERIC(8, 3) NOT NULL,
    costo_minuto NUMERIC(10, 4) NOT NULL,
    estado VARCHAR(30) DEFAULT 'Disponible', -- Disponible, En Impresión, Mantenimiento
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA DE INSUMOS DE TALLER
CREATE TABLE IF NOT EXISTS insumos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_item INTEGER UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    marca VARCHAR(80) DEFAULT 'Genérico',
    categoria VARCHAR(50) NOT NULL, -- Pintura, Químicos, Bisutería, Ferretería, Empaque, Electrónica
    cantidad_presentacion NUMERIC(10, 2) NOT NULL,
    unidad_medida VARCHAR(20) DEFAULT 'und', -- ml, g, und
    costo_total NUMERIC(12, 2) NOT NULL,
    costo_unitario NUMERIC(10, 4) NOT NULL,
    enlace_compra TEXT,
    stock_actual NUMERIC(10, 2) DEFAULT 0,
    stock_minimo NUMERIC(10, 2) DEFAULT 5,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA DE PERSONAL Y TARIFAS DE MANO DE OBRA
CREATE TABLE IF NOT EXISTS tarifas_personal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rol VARCHAR(50) NOT NULL UNIQUE, -- Desarrollador, Comercial, Pintor, Operador
    costo_hora NUMERIC(12, 2) NOT NULL DEFAULT 10000.0,
    costo_minuto NUMERIC(10, 4) NOT NULL DEFAULT 166.67,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA DE COTIZACIONES
CREATE TABLE IF NOT EXISTS cotizaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_cot VARCHAR(20) UNIQUE NOT NULL, -- Ej: 25-074
    cliente_id UUID REFERENCES clientes(id) ON DELETE RESTRICT,
    vendedor_nombre VARCHAR(100) DEFAULT 'Equipo WJGEEKS',
    fecha DATE DEFAULT CURRENT_DATE,
    estado VARCHAR(30) DEFAULT 'Borrador', -- Borrador, Enviada, Aceptada, Rechazada, Facturada
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    iva_porcentaje NUMERIC(5, 2) DEFAULT 0,
    descuento_porcentaje NUMERIC(5, 2) DEFAULT 0,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tiempo_entrega_estimado VARCHAR(50) DEFAULT '(3) Días hábiles',
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLA DE ÍTEMS / PIEZAS DE LA COTIZACIÓN
CREATE TABLE IF NOT EXISTS cotizacion_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE CASCADE,
    nombre_item VARCHAR(150) NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    alto_mm NUMERIC(8, 2) NOT NULL,
    ancho_mm NUMERIC(8, 2) NOT NULL,
    profundidad_mm NUMERIC(8, 2) NOT NULL,
    volumen_cm3 NUMERIC(10, 3) NOT NULL,
    peso_estimado_g NUMERIC(10, 2) NOT NULL,
    resina_id UUID REFERENCES resinas(id),
    maquina_impresion_id UUID REFERENCES maquinas(id),
    maquina_curado_id UUID REFERENCES maquinas(id),
    tiempo_impresion_min NUMERIC(8, 2) NOT NULL DEFAULT 0,
    tiempo_desarrollo_min NUMERIC(8, 2) NOT NULL DEFAULT 0,
    tiempo_armado_min NUMERIC(8, 2) NOT NULL DEFAULT 0,
    tiempo_pintura_min NUMERIC(8, 2) NOT NULL DEFAULT 0,
    costo_energia NUMERIC(12, 2) NOT NULL DEFAULT 0,
    costo_resina NUMERIC(12, 2) NOT NULL DEFAULT 0,
    costo_curado NUMERIC(12, 2) NOT NULL DEFAULT 0,
    costo_insumos NUMERIC(12, 2) NOT NULL DEFAULT 0,
    costo_mano_obra NUMERIC(12, 2) NOT NULL DEFAULT 0,
    costo_modelo_comprado NUMERIC(12, 2) DEFAULT 0,
    costo_base_produccion NUMERIC(12, 2) NOT NULL,
    margen_ganancia NUMERIC(5, 2) NOT NULL DEFAULT 0.40,
    precio_unitario NUMERIC(12, 2) NOT NULL,
    precio_total NUMERIC(14, 2) NOT NULL,
    descripcion_tecnica TEXT,
    imagen_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABLA DE ÓRDENES DE TRABAJO (OT)
CREATE TABLE IF NOT EXISTS ordenes_trabajo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_ot VARCHAR(20) UNIQUE NOT NULL, -- Ej: OT-0045
    cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE CASCADE,
    item_id UUID REFERENCES cotizacion_items(id) ON DELETE CASCADE,
    cliente_nombre VARCHAR(150) NOT NULL,
    item_nombre VARCHAR(150) NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    estado VARCHAR(40) DEFAULT 'En Cola', -- En Cola, Imprimiendo, Curado, Post-Proceso/Pintura, Control Calidad, Terminado
    operador_asignado VARCHAR(100),
    fecha_inicio TIMESTAMPTZ,
    fecha_finalizacion TIMESTAMPTZ,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABLA DE CUENTAS DE COBRO
CREATE TABLE IF NOT EXISTS cuentas_cobro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_cc VARCHAR(20) UNIQUE NOT NULL, -- Ej: CC-0012
    cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE RESTRICT,
    fecha_emision DATE DEFAULT CURRENT_DATE,
    total NUMERIC(14, 2) NOT NULL,
    abono NUMERIC(14, 2) DEFAULT 0,
    saldo_pendiente NUMERIC(14, 2) NOT NULL,
    estado_pago VARCHAR(30) DEFAULT 'Pendiente', -- Pendiente, Abono Parcial, Pagado Total
    comprobante_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Realtime para Órdenes de Trabajo y Cotizaciones
ALTER PUBLICATION supabase_realtime ADD TABLE cotizaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE ordenes_trabajo;
ALTER PUBLICATION supabase_realtime ADD TABLE cuentas_cobro;
