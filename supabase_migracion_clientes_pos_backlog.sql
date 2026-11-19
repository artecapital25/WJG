-- =========================================================================
-- MIGRACIÓN IDEMPOTENTE: UNIFICACIÓN DE CLIENTES, POS EXPRESS Y BITÁCORA
-- WJGEEKS 3D PRO
-- =========================================================================

-- 1. Hacer seguras las FKs hacia clientes para permitir eliminación limpia sincronizada (ON DELETE SET NULL)
ALTER TABLE public.cotizaciones
  DROP CONSTRAINT IF EXISTS fk_cotizaciones_cliente_unica,
  ADD CONSTRAINT fk_cotizaciones_cliente_unica
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

ALTER TABLE public.ordenes_trabajo
  DROP CONSTRAINT IF EXISTS ordenes_trabajo_cliente_id_fkey,
  ADD CONSTRAINT ordenes_trabajo_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

ALTER TABLE public.abonos_pagos
  DROP CONSTRAINT IF EXISTS abonos_pagos_cliente_id_fkey,
  ADD CONSTRAINT abonos_pagos_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

-- 2. Agregar columnas relacionales de cliente en ventas_express (POS)
ALTER TABLE public.ventas_express
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente_nit_cc text,
  ADD COLUMN IF NOT EXISTS cliente_correo text;

CREATE INDEX IF NOT EXISTS idx_ventas_express_cliente_id ON public.ventas_express(cliente_id);

-- 3. Crear tabla de Bitácora / Futuras Validaciones de la Empresa
CREATE TABLE IF NOT EXISTS public.backlog_mejoras_empresa (
  id text PRIMARY KEY,
  titulo text NOT NULL,
  modulo text DEFAULT 'General',
  prioridad text DEFAULT 'media',
  estado text DEFAULT 'pendiente',
  descripcion text DEFAULT '',
  autor text DEFAULT 'Equipo WJGEEKS',
  fecha_creacion text DEFAULT to_char(now(), 'YYYY-MM-DD'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.backlog_mejoras_empresa ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'backlog_mejoras_empresa'
      AND policyname = 'Permitir anon y auth en backlog_mejoras_empresa'
  ) THEN
    CREATE POLICY "Permitir anon y auth en backlog_mejoras_empresa"
      ON public.backlog_mejoras_empresa
      FOR ALL
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'backlog_mejoras_empresa'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.backlog_mejoras_empresa;
  END IF;
END $$;

-- 4. Limpieza de formato en clientes (notación científica de Excel, placeholder 222222222222)
UPDATE public.clientes
SET nit_cc = (nit_cc::numeric)::bigint::text
WHERE nit_cc ~ '^[0-9]+(\.[0-9]+)?[eE][+-]?[0-9]+$';

UPDATE public.clientes
SET nit_cc = ''
WHERE trim(coalesce(nit_cc, '')) = '222222222222';

-- 5. Eliminar los 6 registros duplicados ya desvinculados (sus cotizaciones, OTs, abonos y POS ya apuntan al maestro)
DELETE FROM public.clientes
WHERE id IN (
  '3de944ee-5ea2-407d-bb8b-dc1770c3817a',
  'a0051b46-0a99-443b-ba2d-e53741f0bea5',
  'c947e6da-cc42-4363-b7c9-da457216565f',
  '0240f537-b629-42a3-9d64-789a3ad7f599',
  '0a445b4b-a065-4c87-8f5d-ae8f7d607c98',
  '2ad30c73-c78e-4148-b9ff-d82b27880e9c'
);

