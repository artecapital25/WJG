-- ============================================================================
-- Migración: Integración Personal <-> Tarifas, 5º Hub Herramientas y Órdenes de Insumos con Rastreo
-- Fecha: 2026-11-24
-- Idempotente y compatible con ejecución repetida
-- ============================================================================

-- 1. Ampliar public.usuarios_taller para integrar áreas de responsabilidad y tarifas de mano de obra
ALTER TABLE public.usuarios_taller
  ADD COLUMN IF NOT EXISTS area_responsabilidad text,
  ADD COLUMN IF NOT EXISTS aplica_mano_obra boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS costo_hora numeric DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS costo_minuto numeric DEFAULT 166.67;

-- Asegurar valores por defecto de tarifas (10.000 COP/h) cuando falten o sean <= 0
UPDATE public.usuarios_taller
SET
  costo_hora = COALESCE(NULLIF(costo_hora, 0), 10000),
  costo_minuto = CASE
    WHEN COALESCE(costo_minuto, 0) <= 0 THEN ROUND(COALESCE(NULLIF(costo_hora, 0), 10000) / 60.0, 2)
    ELSE costo_minuto
  END,
  aplica_mano_obra = COALESCE(aplica_mano_obra, true);

-- Asignar área de responsabilidad por integrante solo si aún está vacía
UPDATE public.usuarios_taller
SET area_responsabilidad = 'Aplicación, Backoffice, Ventas y Redes'
WHERE (area_responsabilidad IS NULL OR btrim(area_responsabilidad) = '')
  AND (nombre ILIKE '%germ%' OR nombre ILIKE '%germán%');

UPDATE public.usuarios_taller
SET area_responsabilidad = 'Encargado del Taller (Impresión 3D y Mantenimiento)'
WHERE (area_responsabilidad IS NULL OR btrim(area_responsabilidad) = '')
  AND nombre ILIKE '%juan%';

UPDATE public.usuarios_taller
SET area_responsabilidad = 'Pintura, Acabados y Redes'
WHERE (area_responsabilidad IS NULL OR btrim(area_responsabilidad) = '')
  AND nombre ILIKE '%wendy%';

-- Garantizar acceso al 5º Hub 'herramientas' para todos los administradores activos
UPDATE public.usuarios_taller
SET permisos_areas = '["ventas","taller","finanzas","gestion","herramientas"]'::jsonb
WHERE activo IS DISTINCT FROM false
  AND (
    permisos_areas IS NULL
    OR NOT (permisos_areas ? 'herramientas')
  );

-- 2. Ampliar public.solicitudes_insumos para gestión logística, rastreo en línea y auto-reabastecimiento
ALTER TABLE public.solicitudes_insumos
  ADD COLUMN IF NOT EXISTS encargado_compra text DEFAULT 'Wendy',
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS tipo_compra text DEFAULT 'internet',
  ADD COLUMN IF NOT EXISTS plataforma_tienda text,
  ADD COLUMN IF NOT EXISTS numero_pedido text,
  ADD COLUMN IF NOT EXISTS transportadora text,
  ADD COLUMN IF NOT EXISTS numero_guia text,
  ADD COLUMN IF NOT EXISTS enlace_rastreo text,
  ADD COLUMN IF NOT EXISTS fecha_estimada_llegada date,
  ADD COLUMN IF NOT EXISTS costo_estimado numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_real numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_atendida date,
  ADD COLUMN IF NOT EXISTS origen_tipo text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS catalogo_tipo text,
  ADD COLUMN IF NOT EXISTS catalogo_item_id text,
  ADD COLUMN IF NOT EXISTS stock_reabastecido boolean DEFAULT false;
