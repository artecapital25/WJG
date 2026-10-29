-- ============================================================================
-- MIGRACIÓN: AGREGAR SOPORTE FOTOGRÁFICO A CATÁLOGOS AUXILIARES E INSUMOS
-- WJGEEKS 3D PRO v3.1
-- ============================================================================

-- 1. Resinas 3D
ALTER TABLE IF EXISTS public.resinas ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- 2. Insumos de Taller (Pescadores, tornillería, imanes, bisutería, empaque, etc.)
ALTER TABLE IF EXISTS public.insumos ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- 3. Maquinaria & Equipos de Taller (Impresoras 3D, Curadoras, Lavadoras)
ALTER TABLE IF EXISTS public.maquinas ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- 4. Asegurar columna imagen_url en productos_stock si no existiera
ALTER TABLE IF EXISTS public.productos_stock ADD COLUMN IF NOT EXISTS imagen_url TEXT;

COMMENT ON COLUMN public.resinas.imagen_url IS 'URL o Base64 optimizado de la fotografía del bote o muestra de resina';
COMMENT ON COLUMN public.insumos.imagen_url IS 'URL o Base64 optimizado de la fotografía del insumo físico (pescadores, tornillos, imanes)';
COMMENT ON COLUMN public.maquinas.imagen_url IS 'URL o Base64 optimizado de la fotografía de la máquina o impresora 3D';
