-- Migración: Crear tabla herramientas_links con RLS, Realtime y seed curado (18 herramientas)
CREATE TABLE IF NOT EXISTS public.herramientas_links (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'utilidades',
  descripcion TEXT,
  etiqueta TEXT,
  icono TEXT,
  es_frecuente BOOLEAN NOT NULL DEFAULT false,
  creado_el TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_herramientas_links_categoria
  ON public.herramientas_links (categoria);

CREATE INDEX IF NOT EXISTS idx_herramientas_links_frecuente
  ON public.herramientas_links (es_frecuente DESC, created_at DESC);

ALTER TABLE public.herramientas_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir anon y auth en herramientas_links" ON public.herramientas_links;
CREATE POLICY "Permitir anon y auth en herramientas_links"
  ON public.herramientas_links
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.herramientas_links;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.herramientas_links (id, nombre, url, categoria, descripcion, etiqueta, es_frecuente, creado_el)
VALUES
  ('tool-hunyuan', '腾讯混元3D (Tencent Hunyuan 3D)', 'https://3d.hunyuan.tencent.com/studio/creation/geo', 'ia_3d', 'Generador y modelador 3D con Inteligencia Artificial de Tencent para mallas de alta precisión.', 'IA Oficial', true, '2026-10-14'),
  ('tool-tripo', 'Tripo 3D', 'https://www.tripo3d.ai/', 'ia_3d', 'Generación instantánea de modelos 3D y geometrías en segundos desde texto o imagen.', 'Generador IA', true, '2026-10-14'),
  ('tool-rodin', 'Rodin Gen-2 (Deemos)', 'https://hyperhuman.deemos.com/rodin', 'ia_3d', 'Escultura digital con IA para personajes, bustos y figuras de colección con hiperdetalle.', 'Escultura IA', true, '2026-10-14'),
  ('tool-csm', 'CSM (Common Sense Machines)', 'https://3d.csm.ai/', 'ia_3d', 'Conversión de fotos e imágenes conceptuales 2D a mallas 3D para impresión.', '2D a 3D', false, '2026-10-14'),
  ('tool-makerlab', 'MakerWorld MakerLab (Llavero, Litofanía, Relieve)', 'https://makerworld.com/en/makerlab', 'generadores', 'Suite oficial de Bambu Lab con Image to Keychain, Make My Lithophane, Relief Sculpture y Make My Sign.', 'Generador Pro', true, '2026-11-26'),
  ('tool-itslitho', 'ItsLitho (Litofanías Avanzadas)', 'https://tool.itslitho.com/', 'generadores', 'Generador profesional de litofanías planas, curvas, lámparas y esferas con marcos y difusores.', 'Litofanía', true, '2026-11-26'),
  ('tool-lithophanemaker', 'Lithophane Maker', 'https://lithophanemaker.com/', 'generadores', 'Herramienta especializada para litofanías nocturnas, lámparas de mesa, corazones y llaveros.', 'Litofanía', false, '2026-11-26'),
  ('tool-cookiecad', 'CookieCAD (Cortadores & Sellos)', 'https://app.cookiecad.com/', 'generadores', 'Convierte imágenes y siluetas en cortadores de galletas y sellos 3D listos para imprimir.', 'Cortadores', false, '2026-11-26'),
  ('tool-imagetostl', 'ImageToSTL (Imagen/SVG a 3D)', 'https://imagetostl.com/', 'generadores', 'Conversor rápido online de imágenes PNG/JPG o SVG a relieves y archivos STL imprimibles.', 'SVG / Relieve', false, '2026-11-26'),
  ('tool-cults', 'Cults 3D', 'https://cults3d.com/es', 'stl_repos', 'Plataforma líder en archivos STL para impresión 3D, figuras de anime, videojuegos y cine.', 'Catálogo STL', true, '2026-10-14'),
  ('tool-cgtrader', 'CGTrader', 'https://www.cgtrader.com/', 'stl_repos', 'Repositorio profesional de modelos 3D y estatuas premium para impresión SLA de alta gama.', 'Estatuas Premium', true, '2026-10-14'),
  ('tool-makerworld-repos', 'MakerWorld (Bambu Lab STL/3MF)', 'https://makerworld.com/es', 'stl_repos', 'Repositorio global con millones de perfiles 3MF multicolor y modelos optimizados para FDM.', 'Catálogo 3MF', true, '2026-11-26'),
  ('tool-printables', 'Printables (Prusa)', 'https://www.printables.com/', 'stl_repos', 'Comunidad abierta con miles de modelos libres, accesorios y repuestos para taller.', 'Modelos Libres', false, '2026-10-14'),
  ('tool-thingiverse', 'Thingiverse', 'https://www.thingiverse.com/', 'stl_repos', 'Biblioteca global de archivos 3D de código abierto para modificaciones y prototipos rápidos.', 'Biblioteca Abierta', false, '2026-10-14'),
  ('tool-chitubox', 'Chitubox Slicer', 'https://www.chitubox.com/', 'slicers', 'Software laminador oficial para impresoras de resina LCD/SLA. Calibración de soportes.', 'Laminador SLA', true, '2026-10-14'),
  ('tool-lychee', 'Lychee Slicer', 'https://mango3d.io/lychee-slicer-for-sla-3d-printers/', 'slicers', 'Laminador avanzado con auto-soportes dinámicos, ahuecado y detección automática de islas.', 'Slicer Avanzado', true, '2026-10-14'),
  ('tool-heroforge', 'Hero Forge Miniaturas', 'https://www.heroforge.com/', 'pintura', 'Creador de personajes y miniaturas para juegos de rol, coleccionismo y pintura a mano.', 'Miniaturas', false, '2026-10-14'),
  ('tool-meta', 'Meta Commerce Manager', 'https://business.facebook.com/commerce', 'utilidades', 'Panel para vincular el catálogo de figuras con Instagram Shopping y WhatsApp Business.', 'Catálogo Redes', true, '2026-10-14')
ON CONFLICT (id) DO NOTHING;
