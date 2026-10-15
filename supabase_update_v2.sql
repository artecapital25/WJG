-- ==============================================================================
-- ACTUALIZACIÓN SUPABASE V2: WJGEEKS 3D PRO (SCRIPT 100% IDEMPOTENTE)
-- Nuevos Módulos: POS Express, Tarifario 5-12cm, Tareas de Equipo,
-- S.O.S Insumos de Taller y Trazabilidad de Archivos STL (Germán ➔ Juan)
-- ==============================================================================

-- 1. TABLA DE VENTAS EXPRESS (POS CON FOTO Y ALERTAS DE COBRO)
CREATE TABLE IF NOT EXISTS ventas_express (
    id TEXT PRIMARY KEY,
    numero_venta VARCHAR(30) UNIQUE NOT NULL,
    foto_url TEXT,
    nombre_producto VARCHAR(200) NOT NULL,
    cliente_nombre VARCHAR(150) NOT NULL,
    cliente_telefono VARCHAR(30),
    total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    abono NUMERIC(14, 2) NOT NULL DEFAULT 0,
    saldo_pendiente NUMERIC(14, 2) NOT NULL DEFAULT 0,
    estado_pago VARCHAR(40) NOT NULL DEFAULT 'Pendiente',
    fecha_venta DATE DEFAULT CURRENT_DATE,
    fecha_prometida_pago DATE,
    notas TEXT,
    metodo_pago VARCHAR(50) DEFAULT 'Nequi',
    creado_por VARCHAR(100) DEFAULT 'Equipo WJGEEKS',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Columnas añadidas para validación de diseño y generación de OT desde POS
ALTER TABLE ventas_express ADD COLUMN IF NOT EXISTS requiere_ot BOOLEAN DEFAULT false;
ALTER TABLE ventas_express ADD COLUMN IF NOT EXISTS estado_diseno VARCHAR(30);
ALTER TABLE ventas_express ADD COLUMN IF NOT EXISTS ot_numero VARCHAR(30);
ALTER TABLE ventas_express ADD COLUMN IF NOT EXISTS ot_id TEXT;
ALTER TABLE ventas_express ADD COLUMN IF NOT EXISTS enlace_diseno TEXT;
ALTER TABLE ventas_express ADD COLUMN IF NOT EXISTS notas_diseno TEXT;

-- Trazabilidad en órdenes de trabajo vinculadas a POS
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS pos_venta_id TEXT;

ALTER TABLE ventas_express ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir anon y auth en ventas_express" ON ventas_express;
CREATE POLICY "Permitir anon y auth en ventas_express" ON ventas_express FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. TABLA DE TARIFARIO DE TAMAÑOS (5cm a 12cm)
CREATE TABLE IF NOT EXISTS tarifas_tamanos (
    id VARCHAR(30) PRIMARY KEY,
    altura_cm INTEGER NOT NULL UNIQUE,
    precio_sugerido NUMERIC(14, 2) NOT NULL,
    descripcion TEXT,
    tiempo_estimado VARCHAR(50) DEFAULT '(3) Días hábiles',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tarifas_tamanos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir anon y auth en tarifas_tamanos" ON tarifas_tamanos;
CREATE POLICY "Permitir anon y auth en tarifas_tamanos" ON tarifas_tamanos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Insertar o actualizar los nuevos precios oficiales ($10.000 / cm)
INSERT INTO tarifas_tamanos (id, altura_cm, precio_sugerido, descripcion, tiempo_estimado)
VALUES
  ('tt-5', 5, 50000, 'Figura pequeña / Miniatura estándar (5 cm)', '(3) Días hábiles'),
  ('tt-6', 6, 60000, 'Figura coleccionable estándar (6 cm)', '(3) Días hábiles'),
  ('tt-7', 7, 70000, 'Figura de colección mediana (7 cm)', '(3) Días hábiles'),
  ('tt-8', 8, 80000, 'Figura de colección mediana-alta (8 cm)', '(3) Días hábiles'),
  ('tt-9', 9, 90000, 'Estatua / Figura detallada (9 cm)', '(5) Días hábiles'),
  ('tt-10', 10, 100000, 'Estatua / Figura detallada (10 cm)', '(5) Días hábiles'),
  ('tt-11', 11, 110000, 'Estatua gran escala (11 cm)', '(7) Días hábiles'),
  ('tt-12', 12, 120000, 'Estatua gran escala (12 cm)', '(7) Días hábiles')
ON CONFLICT (altura_cm) DO UPDATE SET 
  precio_sugerido = EXCLUDED.precio_sugerido,
  descripcion = EXCLUDED.descripcion;

-- 3. TABLA DE TAREAS DEL EQUIPO (GERMÁN, WENDY, JUAN)
CREATE TABLE IF NOT EXISTS tareas_equipo (
    id TEXT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    asignado_a VARCHAR(100) NOT NULL, -- Germán, Wendy, Juan
    tipo_tarea VARCHAR(50) DEFAULT 'puntual', -- puntual, recurrente
    frecuencia VARCHAR(50), -- diaria, semanal, quincenal, mensual
    prioridad VARCHAR(30) DEFAULT 'media', -- baja, media, alta, urgente
    estado VARCHAR(30) DEFAULT 'pendiente', -- pendiente, en_proceso, completada
    fecha_limite DATE,
    creado_por VARCHAR(100) DEFAULT 'Equipo WJGEEKS',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tareas_equipo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir anon y auth en tareas_equipo" ON tareas_equipo;
CREATE POLICY "Permitir anon y auth en tareas_equipo" ON tareas_equipo FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. TABLA DE SOLICITUDES DE INSUMOS (S.O.S TALLER / ÓRDENES DE COMPRA INTERNAS)
CREATE TABLE IF NOT EXISTS solicitudes_insumos (
    id TEXT PRIMARY KEY,
    insumo_nombre VARCHAR(150) NOT NULL,
    cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unidad VARCHAR(30) DEFAULT 'und',
    urgencia VARCHAR(30) DEFAULT 'normal', -- normal, urgente, taller_detenido
    solicitado_por VARCHAR(100) NOT NULL, -- Juan, Germán, Pintor
    estado VARCHAR(30) DEFAULT 'pendiente', -- pendiente, orden_enviada, comprado, recibido
    enlace_compra TEXT,
    proveedor_sugerido VARCHAR(150),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE solicitudes_insumos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir anon y auth en solicitudes_insumos" ON solicitudes_insumos;
CREATE POLICY "Permitir anon y auth en solicitudes_insumos" ON solicitudes_insumos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. TABLA DE TRAZABILIDAD DE MODELOS STL (GERMÁN ➔ JUAN)
CREATE TABLE IF NOT EXISTS archivos_stl (
    id TEXT PRIMARY KEY,
    orden_numero VARCHAR(50),
    nombre_archivo VARCHAR(200) NOT NULL,
    version VARCHAR(50) DEFAULT 'v1.0',
    estado VARCHAR(50) DEFAULT 'Modelado Listo', -- Modelando, Modelado Listo, Laminado, En Impresora, Impreso
    modelador VARCHAR(100) DEFAULT 'Germán',
    operador_impresion VARCHAR(100) DEFAULT 'Juan',
    enlace_descarga TEXT,
    dimensiones_xyz VARCHAR(100),
    peso_estimado_g NUMERIC(8, 2),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE archivos_stl ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir anon y auth en archivos_stl" ON archivos_stl;
CREATE POLICY "Permitir anon y auth en archivos_stl" ON archivos_stl FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. HABILITAR PUBLICACIÓN REALTIME PARA MULTI-DISPOSITIVO EN VIVO
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ventas_express') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ventas_express;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tarifas_tamanos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tarifas_tamanos;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tareas_equipo') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tareas_equipo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'solicitudes_insumos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE solicitudes_insumos;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'archivos_stl') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE archivos_stl;
  END IF;
END $$;
