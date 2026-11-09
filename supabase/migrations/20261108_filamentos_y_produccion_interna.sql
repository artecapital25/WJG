-- ==============================================================================
-- MIGRACIÓN SUPABASE: INTEGRACIÓN FILAMENTOS FDM, COSTOS Y PRODUCCIÓN INTERNA
-- Proyecto: WJGEEKS 3D PRO (brjzpbqxjakihpsbkqfh)
-- Fecha: 08 de Noviembre de 2026
-- ==============================================================================

-- 1. TABLA DE FILAMENTOS (Insumos FDM)
CREATE TABLE IF NOT EXISTS public.filamentos (
    id TEXT PRIMARY KEY,
    marca TEXT NOT NULL,
    tipo TEXT NOT NULL,
    color TEXT NOT NULL,
    color_hex TEXT,
    peso_bobina_g NUMERIC NOT NULL DEFAULT 1000,
    precio_compra NUMERIC NOT NULL DEFAULT 65000,
    costo_gramo NUMERIC NOT NULL DEFAULT 65,
    stock_actual_g NUMERIC NOT NULL DEFAULT 1000,
    temperatura_extrusor_c INTEGER DEFAULT 210,
    temperatura_cama_c INTEGER DEFAULT 60,
    enlace_compra TEXT,
    proveedor_id TEXT,
    proveedor_nombre TEXT,
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS y políticas
ALTER TABLE public.filamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total filamentos" ON public.filamentos;
CREATE POLICY "Acceso total filamentos" ON public.filamentos FOR ALL USING (true) WITH CHECK (true);

-- 2. TABLA DE PRODUCCIÓN INTERNA (Pruebas, Calibración, Exhibición y Desperdicio)
CREATE TABLE IF NOT EXISTS public.produccion_interna (
    id TEXT PRIMARY KEY,
    nombre_pieza TEXT NOT NULL,
    motivo TEXT NOT NULL, -- 'EXHIBICION', 'PRUEBA_CALIBRACION', 'MUESTRA_COMERCIAL', 'DESARROLLO_INTERNO', 'DESPERDICIO_FALLA'
    tecnologia TEXT NOT NULL DEFAULT 'FDM_FILAMENTO',
    material_id TEXT,
    material_nombre TEXT,
    peso_consumido_g NUMERIC NOT NULL DEFAULT 0,
    tiempo_minutos INTEGER NOT NULL DEFAULT 0,
    costo_total_estimado NUMERIC NOT NULL DEFAULT 0,
    maquina_id TEXT,
    maquina_nombre TEXT,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    responsable TEXT DEFAULT 'Germán',
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS y políticas
ALTER TABLE public.produccion_interna ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total produccion_interna" ON public.produccion_interna;
CREATE POLICY "Acceso total produccion_interna" ON public.produccion_interna FOR ALL USING (true) WITH CHECK (true);

-- 3. ACTUALIZACIÓN DE MAQUINARIA (Tecnología de Fabricación)
ALTER TABLE public.maquinas 
ADD COLUMN IF NOT EXISTS tecnologia TEXT DEFAULT 'SLA_RESINA';

-- Actualizar máquinas existentes según su nombre/tipo
UPDATE public.maquinas 
SET tecnologia = 'FDM_FILAMENTO' 
WHERE LOWER(nombre) LIKE '%bambu%' 
   OR LOWER(nombre) LIKE '%kobra%' 
   OR LOWER(tipo) LIKE '%filamento%' 
   OR LOWER(tipo) LIKE '%fdm%';

UPDATE public.maquinas 
SET tecnologia = 'SLA_RESINA' 
WHERE LOWER(nombre) LIKE '%mono%' 
   OR LOWER(tipo) LIKE '%resina%' 
   OR LOWER(tipo) LIKE '%sla%' 
   OR LOWER(tipo) LIKE '%msla%';

-- 4. ACTUALIZACIÓN DE CONFIGURACIÓN DEL TALLER (Margen de Merma FDM)
ALTER TABLE public.configuracion_taller 
ADD COLUMN IF NOT EXISTS margen_merma_fdm NUMERIC DEFAULT 5.0;

-- 5. ACTUALIZACIÓN DE DETALLE DE COTIZACIONES Y ÓRDENES DE TRABAJO
ALTER TABLE public.cotizacion_items 
ADD COLUMN IF NOT EXISTS tecnologia TEXT DEFAULT 'SLA_RESINA',
ADD COLUMN IF NOT EXISTS filamento_id TEXT,
ADD COLUMN IF NOT EXISTS filamento_nombre TEXT,
ADD COLUMN IF NOT EXISTS merma_porcentaje NUMERIC;

ALTER TABLE public.ordenes_trabajo 
ADD COLUMN IF NOT EXISTS tecnologia TEXT DEFAULT 'SLA_RESINA',
ADD COLUMN IF NOT EXISTS filamento_id TEXT,
ADD COLUMN IF NOT EXISTS filamento_nombre TEXT;

-- 6. PUBLICACIÓN REALTIME
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'filamentos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.filamentos;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'produccion_interna'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.produccion_interna;
    END IF;
END $$;

-- 7. CARGA DE FILAMENTOS INICIALES EN BODEGA
INSERT INTO public.filamentos (id, marca, tipo, color, color_hex, peso_bobina_g, precio_compra, costo_gramo, stock_actual_g, temperatura_extrusor_c, temperatura_cama_c, notas)
VALUES
('fil-esun-pla-negro', 'eSun', 'PLA+', 'Negro', '#1e293b', 1000, 65000, 65, 1000, 215, 60, 'Alta tenacidad y bajo warping. Excelente para figuras y piezas mecánicas.'),
('fil-esun-pla-blanco', 'eSun', 'PLA+', 'Blanco Frío', '#f8fafc', 1000, 65000, 65, 1000, 215, 60, 'Ideal para piezas que van a ser pintadas o litofanías.'),
('fil-bambu-pla-gris', 'Bambu Lab', 'PLA Basic', 'Gris Ceniza', '#64748b', 1000, 75000, 75, 1000, 220, 55, 'Bobina con chip RFID de alta velocidad para Bambulab P1S.'),
('fil-poly-petg-negro', 'Polymaker', 'PolyLite PETG', 'Negro', '#0f172a', 1000, 78000, 78, 1000, 235, 75, 'Resistencia química y a la intemperie/sol. Piezas de exterior.'),
('fil-sunlu-tpu-negro', 'Sunlu', 'TPU 95A', 'Negro Flexible', '#334155', 1000, 85000, 85, 1000, 220, 50, 'Filamento flexible para sellos, protectores y amortiguadores.'),
('fil-creality-hyper-rojo', 'Creality', 'Hyper PLA', 'Rojo Racing', '#ef4444', 1000, 72000, 72, 1000, 215, 60, 'Ultra alta fluidez para impresión rápida hasta 600 mm/s.')
ON CONFLICT (id) DO NOTHING;

