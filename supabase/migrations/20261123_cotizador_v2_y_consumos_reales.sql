-- Migración idempotente: Cotizador 2.0 + Consumos Reales de Taller y Pintor
-- Proyecto: WJGEEKS 3D PRO

-- 1. Ampliar configuracion_taller
ALTER TABLE public.configuracion_taller
  ADD COLUMN IF NOT EXISTS tasa_fallo_sla_pct numeric DEFAULT 10,
  ADD COLUMN IF NOT EXISTS tasa_fallo_fdm_pct numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS gastos_fijos_mensuales numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_facturables_mes numeric DEFAULT 160,
  ADD COLUMN IF NOT EXISTS consumibles_sla_por_impresion numeric DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS precio_minimo_trabajo numeric DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS comision_pasarela_default_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS modo_margen_default text DEFAULT 'margen_bruto',
  ADD COLUMN IF NOT EXISTS piso_margen_alerta_pct numeric DEFAULT 20;

-- 2. Ampliar maquinas (persistir repuestos + amortización real)
ALTER TABLE public.maquinas
  ADD COLUMN IF NOT EXISTS repuestos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS precio_compra numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vida_util_horas numeric DEFAULT 4000,
  ADD COLUMN IF NOT EXISTS mantenimiento_mensual numeric DEFAULT 0;

-- 3. Rentabilidad interna en cotizaciones y control de costo real en ordenes_trabajo
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS costo_total_taller numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utilidad_neta_estimada numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS modo_margen text DEFAULT 'margen_bruto';

ALTER TABLE public.ordenes_trabajo
  ADD COLUMN IF NOT EXISTS inventario_descontado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS costo_real_acumulado numeric DEFAULT 0;

-- 4. Nueva tabla de consumos reales (Taller + Pintor) con retroalimentación al Cotizador
CREATE TABLE IF NOT EXISTS public.consumos_reales_produccion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_trabajo_id uuid REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE,
  cotizacion_id uuid REFERENCES public.cotizaciones(id) ON DELETE SET NULL,
  numero_referencia text NOT NULL,
  etapa text NOT NULL CHECK (etapa IN ('TALLER_IMPRESION', 'PINTURA_ACABADOS', 'POST_PROCESADO', 'EMPAQUE_ENVIO')),
  tecnologia text NOT NULL DEFAULT 'SLA_RESINA',
  altura_referencia_mm numeric DEFAULT 0,
  cantidad_piezas integer NOT NULL DEFAULT 1,
  registrado_por_id uuid REFERENCES public.usuarios_taller(id) ON DELETE SET NULL,
  registrado_por_nombre text NOT NULL,
  material_id text,
  material_nombre text,
  material_estimado_g numeric DEFAULT 0,
  material_real_g numeric DEFAULT 0,
  tiempo_real_impresion_min integer DEFAULT 0,
  tiempo_real_mano_obra_min integer DEFAULT 0,
  hubo_fallo boolean DEFAULT false,
  piezas_fallidas integer DEFAULT 0,
  insumos_consumidos jsonb NOT NULL DEFAULT '[]'::jsonb,
  costo_material_real numeric DEFAULT 0,
  costo_insumos_reales numeric DEFAULT 0,
  costo_mano_obra_real numeric DEFAULT 0,
  costo_total_real numeric DEFAULT 0,
  descontado_de_inventario boolean DEFAULT false,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consumos_reales_ot ON public.consumos_reales_produccion (orden_trabajo_id);
CREATE INDEX IF NOT EXISTS idx_consumos_reales_cot ON public.consumos_reales_produccion (cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_consumos_reales_stats ON public.consumos_reales_produccion (tecnologia, etapa, created_at DESC);

ALTER TABLE public.consumos_reales_produccion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso Taller consumos_reales_produccion" ON public.consumos_reales_produccion;
CREATE POLICY "Acceso Taller consumos_reales_produccion"
  ON public.consumos_reales_produccion
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 5. Vista analítica de promedios reales (alimenta futuras cotizaciones)
CREATE OR REPLACE VIEW public.vista_promedios_consumo_real AS
SELECT
  tecnologia,
  etapa,
  CASE
    WHEN altura_referencia_mm <= 80 THEN 'PEQUENA_HASTA_8CM'
    WHEN altura_referencia_mm <= 180 THEN 'MEDIANA_8_18CM'
    ELSE 'GRANDE_MAS_18CM'
  END AS rango_altura,
  COUNT(*) AS total_registros,
  ROUND(AVG(CASE WHEN material_estimado_g > 0 THEN ((material_real_g - material_estimado_g) / material_estimado_g) * 100 ELSE NULL END), 1) AS desviacion_material_pct,
  ROUND(AVG(NULLIF(material_real_g, 0) / GREATEST(cantidad_piezas, 1)), 1) AS promedio_material_real_g,
  ROUND(AVG(costo_insumos_reales / GREATEST(cantidad_piezas, 1)), 0) AS promedio_insumos_extras_por_pieza,
  ROUND(AVG(tiempo_real_mano_obra_min / GREATEST(cantidad_piezas, 1)), 0) AS promedio_mano_obra_min_por_pieza,
  ROUND(100.0 * AVG(CASE WHEN hubo_fallo THEN 1 ELSE 0 END), 1) AS tasa_fallo_real_pct
FROM public.consumos_reales_produccion
GROUP BY 1, 2, 3;
