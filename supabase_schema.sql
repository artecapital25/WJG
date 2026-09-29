-- ========================================================
-- ESQUEMA COMPLETO Y DATOS INICIALES DE SUPABASE / POSTGRESQL
-- PLATAFORMA DE COTIZACIÓN Y PRODUCCIÓN 3D: WJGEEKS
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE CONFIGURACIÓN DEL TALLER
CREATE TABLE IF NOT EXISTS configuracion_taller (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tarifa_kwh NUMERIC(10, 2) NOT NULL DEFAULT 834.0,
    margen_merma_resina NUMERIC(5, 2) NOT NULL DEFAULT 1.4,
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
    codigo INTEGER UNIQUE,
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
    rubro VARCHAR(50),
    enlace_web TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE RESINAS
CREATE TABLE IF NOT EXISTS resinas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(100) NOT NULL,
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
    tipo VARCHAR(50) NOT NULL,
    consumo_kwh NUMERIC(8, 3) NOT NULL,
    costo_minuto NUMERIC(10, 4) NOT NULL,
    estado VARCHAR(30) DEFAULT 'Disponible',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA DE INSUMOS DE TALLER
CREATE TABLE IF NOT EXISTS insumos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_item INTEGER UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    marca VARCHAR(80) DEFAULT 'Genérico',
    categoria VARCHAR(50) NOT NULL,
    cantidad_presentacion NUMERIC(10, 2) NOT NULL,
    unidad_medida VARCHAR(20) DEFAULT 'und',
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
    rol VARCHAR(50) NOT NULL UNIQUE,
    costo_hora NUMERIC(12, 2) NOT NULL DEFAULT 10000.0,
    costo_minuto NUMERIC(10, 4) NOT NULL DEFAULT 166.67,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA DE COTIZACIONES
CREATE TABLE IF NOT EXISTS cotizaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_cot VARCHAR(20) UNIQUE NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    vendedor_nombre VARCHAR(100) DEFAULT 'Equipo WJGEEKS',
    fecha DATE DEFAULT CURRENT_DATE,
    estado VARCHAR(30) DEFAULT 'Borrador',
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
    numero_ot VARCHAR(20) UNIQUE NOT NULL,
    cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE SET NULL,
    cliente_nombre VARCHAR(150) NOT NULL,
    item_nombre VARCHAR(150) NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    estado VARCHAR(40) DEFAULT 'En Cola',
    operador_asignado VARCHAR(100),
    fecha_inicio TIMESTAMPTZ,
    fecha_finalizacion TIMESTAMPTZ,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABLA DE CUENTAS DE COBRO
CREATE TABLE IF NOT EXISTS cuentas_cobro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_cc VARCHAR(20) UNIQUE NOT NULL,
    cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    fecha_emision DATE DEFAULT CURRENT_DATE,
    total NUMERIC(14, 2) NOT NULL,
    abono NUMERIC(14, 2) DEFAULT 0,
    saldo_pendiente NUMERIC(14, 2) NOT NULL,
    estado_pago VARCHAR(30) DEFAULT 'Pendiente',
    comprobante_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS y Políticas Permisivas para Acceso Anon y Autenticado
ALTER TABLE configuracion_taller ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir anon y auth en configuracion_taller" ON configuracion_taller FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir anon y auth en clientes" ON clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir anon y auth en proveedores" ON proveedores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE resinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir anon y auth en resinas" ON resinas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir anon y auth en maquinas" ON maquinas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir anon y auth en insumos" ON insumos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE tarifas_personal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir anon y auth en tarifas_personal" ON tarifas_personal FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir anon y auth en cotizaciones" ON cotizaciones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE cotizacion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir anon y auth en cotizacion_items" ON cotizacion_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE ordenes_trabajo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir anon y auth en ordenes_trabajo" ON ordenes_trabajo FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE cuentas_cobro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir anon y auth en cuentas_cobro" ON cuentas_cobro FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Habilitar Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'cotizaciones') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cotizaciones;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ordenes_trabajo') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ordenes_trabajo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'cuentas_cobro') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cuentas_cobro;
  END IF;
END $$;


-- ========================================================
-- DATOS MAESTROS: CONFIGURACIÓN
-- ========================================================
INSERT INTO configuracion_taller (tarifa_kwh, margen_merma_resina, telefono_contacto, telefono_contacto2, instagram, nequi, daviplata, bancolombia, titular_cuenta)
VALUES (834.0, 1.4, '3217273025', '3202796115', '@WJGEEKS3D', '3217273025', '3217273025', 'Ahorros 245-000123-98', 'WJGEEKS 3D');

-- DATOS MAESTROS: RESINAS
INSERT INTO resinas (tipo, marca, color, volumen_l, densidad_g_cm3, peso_g, precio_compra, costo_gramo, velocidad_impresion_mm_h) VALUES
('Resina Standar', 'Anycubic', 'Negro', 1.0, 1.13, 1130.0, 89000.0, 78.76106195, 20.0),
('Resina High speed', 'Anycubic', 'Negro', 1.0, 1.14, 1140.0, 153000.0, 135.3982301, 50.0),
('Resina Standar', 'Anycubic', 'traslucida', 1.0, 1.13, 1130.0, 90000.0, 79.6460177, 20.0),
('Resina Standar', 'Anycubic', 'Gris', 1.0, 1.13, 1130.0, 90000.0, 79.6460177, 20.0),
('Resina Standar', 'Anycubic', 'Blanca', 1.0, 1.13, 1130.0, 45000.0, 39.82300885, 20.0),
('Resina Standar +', 'Anycubic', 'Blanca', 1.0, 1.13, 1000.0, 76130.0, 67.37168142, 20.0),
('Resina Standar HD', 'Anycubic', 'Gris', 1.0, 1.13, 1000.0, 56085.0, 49.63274336, 20.0),
('Resina Standar +', 'Anycubic', 'Negro', 1.0, 1.13, 1000.0, 64103.0, 56.72831858, 20.0),
('Resina Standar ABS', 'Anycubic', 'Gris', 1.0, 1.13, 1130.0, 86000.0, 76.10619469, 30.0),
('Resina Standar ABS', 'Anycubic', 'Negra', 1.0, 1.13, 1130.0, 86000.0, 76.10619469, 30.0);

-- DATOS MAESTROS: MAQUINARIA
INSERT INTO maquinas (nombre, tipo, consumo_kwh, costo_minuto, estado) VALUES
('Anycubic MONO 4', 'Impresora 3D Resina', 0.45, 6.255, 'Disponible'),
('Anycubic Wash y cure 3', 'Estación de Curado', 0.36, 5.004, 'Disponible'),
('Compresor Paasche S220R', 'Aerógrafo / Pintura', 0.36, 5.004, 'Disponible');

-- DATOS MAESTROS: INSUMOS DE TALLER
INSERT INTO insumos (codigo_item, nombre, marca, categoria, cantidad_presentacion, costo_total, costo_unitario, enlace_compra) VALUES
(1, 'Pintura acrilica Azul', 'Play Art', 'Pintura', 60.0, 6000.0, 100.0, ''),
(2, 'Argolla Ø 26mm', 'Generico', 'Bisuteria', 1.0, 900.0, 900.0, ''),
(3, 'Pintura acrilica cafe', 'Play Art', 'Pintura', 60.0, 6000.0, 100.0, ''),
(4, 'Alcohol isopropilico', 'Generico', 'Quimicos', 4000.0, 42000.0, 10.5, ''),
(5, 'Etanol 96%', 'Generico', 'Quimicos', 3700.0, 38000.0, 10.27027027, ''),
(6, 'Primer', 'Generico', 'Pintura', 250.0, 16500.0, 66.0, ''),
(7, 'Caja 10cm x 80cm x 80cm', 'Generico', 'Empaque', 10.0, 18000.0, 1800.0, ''),
(8, 'Caja 9cm x 6cm x 6cm', 'Generico', 'Empaque', 1.0, 2000.0, 2000.0, ''),
(9, 'Tuercas autoblocantes m3 para plastico', 'Generico', 'Ferreteria', 1.0, 350.0, 350.0, ''),
(10, 'Tornillo M3', 'Generico', 'Ferreteria', 1.0, 350.0, 350.0, ''),
(11, 'Iman neodinio 4.064mm diametro x 0.9906mm de espesor', 'Generico', 'Ferreteria', 200.0, 28162.0, 140.81, 'https://www.amazon.com/peque%C3%B1os-tierras-pulgadas-redondos-manualidades/dp/B0BW971948/ref=sr_1_1_sspa?__mk_es_US=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=14ZS884NKD6O4&dib=eyJ2IjoiMSJ9.ASIH-r0W7SX2KsrSmAOBGQjM3veb3dWoxlIq1DbPBjwZp5N4oE0EoIO3rqsRP6TvqOOv7ruuFJRJWYQZ_UEjCe-hyuGdUwfwSzbfhi3Ao3Z2W_XXb9mmQDx1z5roVxjMC-iXLhwzXMXWBtp1vO9UaNndKz87LcqjsF6HJO0JVNPaJLCnDBPpWi1zcPmhtmb6qznqPXfUGDIppqr8z6ot-opW91ScExiKw_fbiqvxMXQ.rywKy9zaf3KPqEy1QHrSuycVuOtdO0BUXyvZIVNHBZ4&dib_tag=se&keywords=imanes%2Bpara%2Bimpresi%C3%B3n%2B3d&qid=1752186026&sprefix=imanes%2Bpara%2Bimpresion%2B3d%2Caps%2C165&sr=8-1-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&th=1'),
(12, 'Argolla Ø4mm roscada', 'Generico', 'Bisuteria', 1.0, 500.0, 500.0, ''),
(13, 'Velcro redondo', 'Generico', 'Ferreteria', 1.0, 1500.0, 1500.0, ''),
(14, 'Vase adhesiva casco curva', 'Generico', 'Ferreteria', 1.0, 7900.0, 7900.0, 'https://articulo.mercadolibre.com.co/MCO-451558533-base-adhesiva-3m-gopro-curva-casco-moto-gopro--_JM#origin%3Dshare%26sid%3Dshare'),
(15, 'J hook go pro', 'Generico', 'Ferreteria', 1.0, 10000.0, 10000.0, 'https://articulo.mercadolibre.com.co/MCO-550225906-hebilla-extension-j-hook-gopro-8-_JM#origin%3Dshare%26sid%3Dshare'),
(16, 'Tira de velcro 2" x 4"', 'Generico', 'Ferreteria', 1.0, 5000.0, 5000.0, ''),
(17, 'Barniz acrilico SPRAY', 'PRO SPRAY IT LIKE A PRO', 'Pintura', 400.0, 46000.0, 115.0, ''),
(18, 'Alfiler Bisuteria', 'Generico', 'Bisuteria', 100.0, 9000.0, 90.0, ''),
(19, 'Pescador Bisuteria', 'Generico', 'Bisuteria', 200.0, 34000.0, 170.0, ''),
(20, 'Cartones Arete Bisuteria', 'Generico', 'Bisuteria', 40.0, 8000.0, 200.0, ''),
(21, 'Bolsa polipropileno 8x12', 'Generico', 'Empaque', 50.0, 4500.0, 90.0, ''),
(22, 'Sticker WJG', 'Generico', 'Empaque', 200.0, 40000.0, 200.0, ''),
(23, 'Pin y Broche', 'Generico', 'Bisuteria', 100.0, 26000.0, 260.0, ''),
(24, 'Primer acrilico Aero create', 'Aero create', 'Pintura', 30.0, 12000.0, 400.0, ''),
(25, 'Barniz acrilico mate', 'Generico', 'Pintura', 80.0, 8500.0, 106.25, ''),
(26, 'Tarjetas WJGEEKS', 'Generico', 'Empaque', 1000.0, 83000.0, 83.0, ''),
(27, 'tarjeta Controladora ESP32', 'Generico', 'Electronico', 1.0, 40000.0, 40000.0, ''),
(28, 'Motor paso a paso con Driver', 'Generico', 'Electronico', 1.0, 25000.0, 25000.0, ''),
(29, 'Lampara para figuras', 'Generico', 'Electronico', 1.0, 13000.0, 13000.0, 'Kit De Lámpara Led Diy, Luz Brillante Y Eficiente | Cuotas sin interés'),
(30, 'Botes de pintura', 'Generico', 'Pintura', 1.0, 130.0, 130.0, '100 Tiras De Pintura, 300 Botes Vacíos, 2 Ml, 0.07 Oz | Cuotas sin interés'),
(31, 'pinceles', 'Generico', 'Pintura', 1.0, 500.0, 500.0, 'Set De 30 Pinceles Planos Y Redondos Para Pintura Artística | Cuotas sin interés');

-- DATOS MAESTROS: TARIFAS DE PERSONAL
INSERT INTO tarifas_personal (rol, costo_hora, costo_minuto) VALUES
('Desarrollador', 10000, 166.67),
('Comercial', 10000, 166.67),
('Pintor', 10000, 166.67);

-- DATOS MAESTROS: CLIENTES HISTÓRICOS
INSERT INTO clientes (codigo, nombre, nit_cc, telefono, correo) VALUES
(1, 'Juan David Guzman Orjuela', '1.032473891E9', '3217273025', 'davidguz0812@gmail.com'),
(2, 'German Eduardo Reyes Vasquez', '1.018480904E9', '3503443140', 'german.951026@gmail.com'),
(3, 'Wendy Samanta Castro Salgado', '1.033796709E9', '3204814702', 'Wendysami97gmail.com'),
(4, 'Fernando Gutierrez', '', '3014136522', ''),
(5, 'Harold Ibarra', '1.077033878E9', '3054600613', 'haroldib70@gmail.com'),
(6, 'Nicolas Suarez Valbuena', '1.03246471E9', '3105704614', 'nicolasbcd2@gmail.com'),
(7, 'Sebastián Rey', '1.02236618E9', '3166249515', 'Tkfdron@gmail.com'),
(8, 'Andres Molano', '1.070921033E9', '3208433860', 'afmolano.psy@gmail.com'),
(9, 'Vanesa Amaya', '1.014240456E9', '3138624998', 'vaneamaya93@gmail.com'),
(10, 'Juan Pablo Alvira', '1.083880877E9', '3114925363', 'elmichudeyuno@gmail.com'),
(11, 'Snehider Bejarano', '1.0136018E7', '3046474970', 'snehider1214@gmail.com'),
(12, 'Felipe Tamayo Beltrán', '1.019418383E9', '3057152903', 'felipetamayo031@gmail.com'),
(13, 'lizeth viviana castro salgado', '1.033740166E9', '304 2113751', 'lizth1291@gmail.com'),
(14, 'Sebastian Torres', '', '3208569175', 'sebastianpkforlige@gmail.com'),
(15, 'Alejandro', '', '3157354626', ''),
(16, 'María Paula Mejia', '1.014198116E9', '3002885090', 'mariapmejia.b@gmail.com'),
(17, 'Olga ledesma', '', '3125319667', ''),
(18, 'brayan Camacho', '', '', ''),
(19, 'Cristian Telles', '', '3023427084', ''),
(20, 'Joseph Rubiano', '1.075320322E9', '3023542051', 'toterubiano@gmail.com'),
(21, 'Glori', '', '', ''),
(22, 'Willmer Castro', '', '', ''),
(23, 'Anderson', '', '3008886288', ''),
(24, 'Karen Gómez', '', '', ''),
(25, 'Jarol (Incolmat)', '', '3108561350', ''),
(26, 'Maria Teresa Garcia', '5.2701382E7', '3102022141', 'gammatere@yahoo.com'),
(27, 'Cristina Sierra', '', '3212483144', 'cristina.sierra@electroequipos.com'),
(28, 'Dayerly Perez', '', '3123747745', ''),
(29, 'Sebastian Aran', '', '', ''),
(30, 'J.B Trader institucional', '', '', ''),
(31, 'angela bernal', '', '', '') ON CONFLICT (codigo) DO NOTHING;

-- ========================================================
-- HISTORIAL DE COTIZACIONES Y PIEZAS (72 Cotizaciones del Excel)
-- ========================================================
DO $$
DECLARE
  v_cli_id UUID;
  v_cot_id UUID;
BEGIN


  -- Cotización 25-001
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-001', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 1465800.0, 1465800.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Muñeco', 2, 60.0, 60.0, 60.0, 216.0, 244.08, 180.0, 60.0, 30.0, 120.0, 1125.9, 26913.6, 50.04, 19366.77, 35000.0, 0.0, 82456.31, 0.4, 115400.0, 230800.0, 'Medidas
60mm x 60mm x 60mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Imagen', 10, 100.0, 50.0, 60.0, 300.0, 339.0, 300.0, 60.0, 0.0, 60.0, 1876.5, 37380.0, 75.06, 8461.62, 20000.0, 0.0, 67793.18, 0.35, 91500.0, 915000.0, 'Medidas
100mm x 50mm x 60mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Figura', 10, 20.0, 30.0, 20.0, 12.0, 13.56, 60.0, 10.0, 0.0, 90.0, 375.3, 1495.2, 25.02, 5119.26, 16666.67, 0.0, 23681.45, 0.35, 32000.0, 320000.0, 'Medidas
20mm x 30mm x 20mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-002
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 1 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-002', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 642000.0, 642000.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Figura', 20, 20.0, 20.0, 15.0, 6.0, 6.78, 60.0, 20.0, 30.0, 60.0, 375.3, 747.6, 25.02, 4289.63, 18333.33, 0.0, 23770.89, 0.35, 32100.0, 642000.0, 'Medidas
20mm x 20mm x 15mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-003
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 2 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-003', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 219600.0, 219600.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Itachi', 1, 20.0, 20.0, 18.0, 7.2, 8.136, 60.0, 30.0, 30.0, 120.0, 375.3, 897.12, 25.02, 16403.56, 30000.0, 0.0, 47701.0, 0.35, 64400.0, 64400.0, 'Medidas
20mm x 20mm x 18mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Imagen', 2, 50.0, 30.0, 40.0, 60.0, 67.8, 150.0, 40.0, 30.0, 180.0, 938.25, 7476.0, 50.04, 7356.32, 41666.67, 0.0, 57487.28, 0.35, 77600.0, 155200.0, 'Medidas
50mm x 30mm x 40mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-004
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 4 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-004', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 783700.0, 783700.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Inosuke', 1, 200.0, 50.0, 50.0, 500.0, 565.0, 600.0, 30.0, 60.0, 240.0, 3753.0, 62300.0, 75.06, 15122.7, 55000.0, 0.0, 136250.76, 0.55, 211200.0, 211200.0, 'Medidas
200mm x 50mm x 50mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Luffy', 1, 100.0, 60.0, 60.0, 360.0, 406.8, 300.0, 30.0, 20.0, 180.0, 1876.5, 44856.0, 75.06, 9497.95, 38333.33, 0.0, 94638.84, 0.55, 146700.0, 146700.0, 'Medidas
100mm x 60mm x 60mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Nezuko', 1, 100.0, 45.0, 50.0, 225.0, 254.25, 300.0, 30.0, 20.0, 240.0, 1876.5, 28035.0, 75.06, 10931.22, 48333.33, 0.0, 89251.11, 0.55, 138300.0, 138300.0, 'Medidas
100mm x 45mm x 50mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Zenitsu', 1, 100.0, 50.0, 50.0, 250.0, 282.5, 300.0, 30.0, 20.0, 200.0, 1876.5, 31150.0, 75.06, 11221.35, 41666.67, 0.0, 85989.58, 0.55, 133300.0, 133300.0, 'Medidas
100mm x 50mm x 50mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Tanjiro', 1, 100.0, 60.0, 50.0, 300.0, 339.0, 300.0, 30.0, 20.0, 240.0, 1876.5, 37380.0, 75.06, 11801.62, 48333.33, 0.0, 99466.51, 0.55, 154200.0, 154200.0, 'Medidas
100mm x 60mm x 50mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-005
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 4 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-005', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 439600.0, 439600.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Inosuke - sin pintura', 1, 200.0, 50.0, 50.0, 500.0, 565.0, 600.0, 30.0, 60.0, 0.0, 3753.0, 63000.0, 75.06, 5802.7, 15000.0, 0.0, 87630.76, 0.5, 131400.0, 131400.0, 'Medidas
200mm x 50mm x 50mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Luffy - sin pintura', 1, 100.0, 60.0, 60.0, 360.0, 406.8, 300.0, 30.0, 20.0, 0.0, 1876.5, 45360.0, 75.06, 4177.95, 8333.33, 0.0, 59822.84, 0.5, 89700.0, 89700.0, 'Medidas
100mm x 60mm x 60mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Nezuko - sin pintura', 1, 100.0, 45.0, 50.0, 225.0, 254.25, 300.0, 30.0, 20.0, 0.0, 1876.5, 28350.0, 75.06, 2611.22, 8333.33, 0.0, 41246.11, 0.8, 74200.0, 74200.0, 'Medidas
100mm x 45mm x 50mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Zenitsu - sin pintura', 1, 100.0, 50.0, 50.0, 250.0, 282.5, 300.0, 30.0, 20.0, 0.0, 1876.5, 31500.0, 75.06, 2901.35, 8333.33, 0.0, 44686.24, 0.5, 67000.0, 67000.0, 'Medidas
100mm x 50mm x 50mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Tanjiro - sin pintura', 1, 100.0, 60.0, 50.0, 300.0, 339.0, 300.0, 30.0, 20.0, 0.0, 1876.5, 37800.0, 75.06, 3481.62, 8333.33, 0.0, 51566.51, 0.5, 77300.0, 77300.0, 'Medidas
100mm x 60mm x 50mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-006
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 5 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-006', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 47000.0, 47000.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Base soporte varita
Harry Potter', 1, 117.0, 152.0, 82.0, 1458.288, 200.0, 351.0, 30.0, 0.0, 0.0, 2195.51, 22053.1, 50.04, 2054.05, 5000.0, 0.0, 31352.7, 0.5, 47000.0, 47000.0, 'Medidas
117mm x 152mm x 82mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-007
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 6 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-007', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 57000.0, 57000.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Perro', 1, 80.0, 60.0, 60.0, 288.0, 325.44, 240.0, 10.0, 0.0, 50.0, 1501.2, 35884.8, 75.06, 4342.36, 10000.0, 0.0, 51803.42, 0.1, 57000.0, 57000.0, 'Medidas
80mm x 60mm x 60mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-008
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-008', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 30800.0, 30800.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Frida Kahlo', 1, 75.0, 35.0, 70.0, 183.75, 207.6375, 225.0, 0.0, 0.0, 0.0, 1407.38, 23152.5, 50.04, 2180.19, 0.0, 0.0, 26790.11, 0.15, 30800.0, 30800.0, 'Medidas
75mm x 35mm x 70mm
Impresión en Resina Standar 
Color traslucida
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-009
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 1 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-009', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 18800.0, 18800.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Chimuelo llavero', 1, 45.0, 45.0, 30.0, 60.75, 68.6475, 135.0, 5.0, 5.0, 10.0, 844.42, 7654.5, 50.04, 1820.8, 3333.33, 0.0, 13703.1, 0.37, 18800.0, 18800.0, 'Medidas
45mm x 45mm x 30mm
Impresión en Resina Standar 
Color traslucida
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-010
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 4 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-010', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 110600.0, 110600.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Calcifer', 1, 80.0, 60.0, 60.0, 288.0, 325.44, 240.0, 30.0, 10.0, 100.0, 1501.2, 36288.0, 75.06, 10737.12, 23333.33, 10000.0, 81934.71, 0.35, 110600.0, 110600.0, 'Medidas
80mm x 60mm x 60mm
Impresión en Resina Standar 
Color traslucida
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-011
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 8 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-011', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 316600.0, 316600.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Trofeo en resina traslusida
con mensaje personalizado 
base en color negro', 5, 100.0, 35.0, 35.0, 122.5, 36.0, 300.0, 30.0, 30.0, 60.0, 1876.5, 4014.16, 25.02, 1199.73, 20000.0, 0.0, 27115.41, 0.35, 36600.0, 183000.0, 'Medidas
100mm x 35mm x 35mm
Impresión en Resina Standar 
Color traslucida
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Figura de mujer con su perro
pintura y acabado.', 1, 110.0, 40.0, 50.0, 220.0, 120.0, 330.0, 60.0, 30.0, 300.0, 2064.15, 13380.53, 50.04, 8552.43, 65000.0, 0.0, 89047.15, 0.5, 133600.0, 133600.0, 'Medidas
110mm x 40mm x 50mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-012
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 7 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-012', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 294300.0, 294300.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Pavo 20 case Versión Estándar', 1, 140.0, 140.0, 100.0, 1960.0, 600.0, 840.0, 20.0, 90.0, 0.0, 5254.2, 66902.65, 75.06, 11762.16, 18333.33, 0.0, 102327.41, 0.8, 184200.0, 184200.0, 'Medidas
140mm x 140mm x 100mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'DJI Avata2 Patas de apoyo inferiores', 4, 35.0, 35.0, 25.0, 30.625, 34.60625, 105.0, 20.0, 0.0, 0.0, 656.77, 3858.75, 25.02, 355.42, 3333.33, 0.0, 8229.29, 0.5, 12300.0, 49200.0, 'Medidas
35mm x 35mm x 25mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Soporrte FPV RACER', 1, 22.0, 100.0, 60.0, 132.0, 149.16, 66.0, 20.0, 0.0, 0.0, 412.83, 16447.2, 50.04, 1531.91, 3333.33, 0.0, 21775.32, 0.5, 32700.0, 32700.0, 'Medidas
22mm x 100mm x 60mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Soporte de pared para Dji FPV', 1, 50.0, 35.0, 150.0, 262.5, 120.0, 150.0, 20.0, 0.0, 0.0, 938.25, 13231.86, 50.04, 1232.43, 3333.33, 0.0, 18785.91, 0.5, 28200.0, 28200.0, 'Medidas
50mm x 35mm x 150mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-013
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 9 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-013', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 102200.0, 102200.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Furia nocturna', 1, 100.0, 80.0, 100.0, 800.0, 190.0, 300.0, 20.0, 0.0, 30.0, 1876.5, 20950.44, 50.04, 2781.35, 8333.33, 9000.0, 42991.67, 0.4, 60200.0, 60200.0, 'Medidas
100mm x 80mm x 100mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Furia luminosa', 1, 100.0, 65.0, 90.0, 585.0, 150.0, 300.0, 20.0, 0.0, 30.0, 1876.5, 8362.83, 50.04, 2370.54, 8333.33, 9000.0, 29993.25, 0.4, 42000.0, 42000.0, 'Medidas
100mm x 65mm x 90mm
Impresión en Resina Standar 
Color Blanca
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-014
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 2 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-014', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 660000.0, 660000.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Catan', 20, 12.0, 70.0, 70.0, 58.8, 66.444, 36.0, 10.0, 0.0, 60.0, 225.18, 7408.8, 50.04, 2653.21, 11666.67, 0.0, 22003.89, 0.5, 33000.0, 660000.0, 'Medidas
12mm x 70mm x 70mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-015
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 10 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-015', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 59500.0, 59500.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Rosemon', 1, 50.0, 50.0, 20.0, 50.0, 56.5, 150.0, 30.0, 0.0, 150.0, 938.25, 6300.0, 50.04, 2410.27, 30000.0, 0.0, 39698.56, 0.5, 59500.0, 59500.0, 'Medidas
50mm x 50mm x 20mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-016
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 5 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-016', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 236200.0, 236200.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Torre de dados 
mas bandeja', 1, 156.4, 126.2, 109.5, 1207.218, 1364.15634, 469.2, 30.0, 15.0, 0.0, 2934.85, 150419.36, 75.06, 14010.25, 7500.0, 0.0, 174939.52, 0.35, 236200.0, 236200.0, 'Medidas
156.4mm x 126.2mm x 109.5mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-017
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 11 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-017', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 110600.0, 110600.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Calcifer', 1, 80.0, 60.0, 60.0, 288.0, 325.44, 240.0, 30.0, 10.0, 100.0, 1501.2, 36288.0, 75.06, 10737.12, 23333.33, 10000.0, 81934.71, 0.35, 110600.0, 110600.0, 'Medidas
80mm x 60mm x 60mm
Impresión en Resina Standar 
Color traslucida
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-018
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 12 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-018', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 26900.0, 26900.0, '(15) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'agua coffee rush', 1, 20.0, 15.0, 15.0, 4.5, 3.0, 1.944444444, 5.0, 0.0, 0.0, 12.16, 334.51, 25.02, 30.81, 833.33, 0.0, 1235.84, 0.3, 1600.0, 1600.0, 'Medidas
20mm x 15mm x 15mm
Impresión en Resina Standar 
Color traslucida
Tiempo de entrega
(15) Dias habiles'),
    (v_cot_id, 'caramelo coffee rush', 1, 11.0, 18.0, 18.0, 3.564, 3.7, 1.25, 5.0, 0.0, 0.0, 7.82, 412.57, 25.02, 38.0, 833.33, 0.0, 1316.74, 0.3, 1700.0, 1700.0, 'Medidas
11mm x 18mm x 18mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(15) Dias habiles'),
    (v_cot_id, 'chocolate coffee rush', 1, 6.0, 15.0, 21.0, 1.89, 1.6, 1.111111111, 5.0, 0.0, 0.0, 6.95, 178.41, 25.02, 16.43, 833.33, 0.0, 1060.14, 0.3, 1400.0, 1400.0, 'Medidas
6mm x 15mm x 21mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(15) Dias habiles'),
    (v_cot_id, 'grano de cafe coffee rush', 1, 6.0, 20.0, 15.0, 1.8, 2.0, 1.296296296, 5.0, 0.0, 0.0, 8.11, 223.01, 25.02, 20.54, 833.33, 0.0, 1110.01, 0.3, 1400.0, 1400.0, 'Medidas
6mm x 20mm x 15mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(15) Dias habiles'),
    (v_cot_id, 'hielo coffee rush', 1, 13.0, 13.0, 13.0, 2.197, 3.0, 1.111111111, 5.0, 0.0, 0.0, 6.95, 334.51, 25.02, 30.81, 833.33, 0.0, 1230.63, 0.3, 1600.0, 1600.0, 'Medidas
13mm x 13mm x 13mm
Impresión en Resina Standar 
Color traslucida
Tiempo de entrega
(15) Dias habiles'),
    (v_cot_id, 'hoja de tee 2 coffee rush', 1, 8.0, 28.0, 15.0, 3.36, 1.0, 0.8888888889, 5.0, 0.0, 0.0, 5.56, 111.5, 25.02, 10.27, 833.33, 0.0, 985.69, 0.3, 1300.0, 1300.0, 'Medidas
8mm x 28mm x 15mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(15) Dias habiles'),
    (v_cot_id, 'leche coffee rush', 1, 23.0, 18.0, 18.0, 7.452, 4.0, 2.083333333, 5.0, 0.0, 0.0, 13.03, 223.01, 25.02, 41.08, 833.33, 0.0, 1135.47, 0.3, 1500.0, 1500.0, 'Medidas
23mm x 18mm x 18mm
Impresión en Resina Standar 
Color Blanca
Tiempo de entrega
(15) Dias habiles'),
    (v_cot_id, 'taza coffee rush', 2, 32.0, 50.0, 40.0, 64.0, 16.7, 12.33333333, 5.0, 0.0, 0.0, 77.14, 1862.12, 25.02, 171.51, 833.33, 0.0, 2969.14, 0.3, 3900.0, 7800.0, 'Medidas
32mm x 50mm x 40mm
Impresión en Resina Standar 
Color traslucida
Tiempo de entrega
(15) Dias habiles'),
    (v_cot_id, 'vapor coffee rush', 1, 25.0, 18.0, 18.0, 8.1, 4.0, 4.5, 5.0, 0.0, 0.0, 28.15, 223.01, 25.02, 41.08, 833.33, 0.0, 1150.59, 0.3, 1500.0, 1500.0, 'Medidas
25mm x 18mm x 18mm
Impresión en Resina Standar 
Color Blanca
Tiempo de entrega
(15) Dias habiles'),
    (v_cot_id, 'llavero SF
Pintado de azul y blanco', 1, 5.0, 60.0, 40.0, 12.0, 13.56, 20.0, 5.0, 5.0, 5.0, 125.1, 1512.0, 25.02, 1337.26, 2500.0, 0.0, 5499.38, 0.3, 7100.0, 7100.0, 'Medidas
5mm x 60mm x 40mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-019
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 1 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-019', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 8000.0, 8000.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Calcifer llavero', 1, 45.0, 36.0, 24.0, 38.88, 19.0, 135.0, 10.0, 5.0, 1.0, 844.42, 2118.58, 25.02, 2393.14, 2666.67, 0.0, 8047.83, 0.0, 8000.0, 8000.0, 'Medidas
45mm x 36mm x 24mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-020
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-020', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 38900.0, 38900.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Taiser', 1, 50.0, 50.0, 45.0, 112.5, 50.0, 150.0, 15.0, 0.0, 90.0, 938.25, 5575.22, 25.02, 1911.51, 17500.0, 0.0, 25950.0, 0.5, 38900.0, 38900.0, 'Medidas
50mm x 50mm x 45mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-021
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 13 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-021', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 172300.0, 172300.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Homer
Acabado pintura', 1, 100.0, 60.0, 40.0, 240.0, 271.2, 300.0, 15.0, 10.0, 90.0, 1876.5, 30240.0, 75.06, 4183.3, 19166.67, 0.0, 55541.52, 0.35, 75000.0, 75000.0, 'Medidas
100mm x 60mm x 40mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Kykio - Inuyasha
Acabado pintura', 1, 100.0, 60.0, 60.0, 360.0, 406.8, 300.0, 15.0, 10.0, 90.0, 1876.5, 45360.0, 75.06, 5575.95, 19166.67, 0.0, 72054.17, 0.35, 97300.0, 97300.0, 'Medidas
100mm x 60mm x 60mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-022
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 7 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-022', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 327700.0, 327700.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Diseño y desarrollo de soporte inferior
horizontal para iphone 16 pro max 
para drone
Obsequio por publicidad a WJGEEKS', 1, 160.0, 70.0, 50.0, 560.0, 300.0, 320.0, 60.0, 60.0, 0.0, 2001.6, 22831.86, 75.06, 10081.08, 20000.0, 0.0, 54989.6, 0.45, 79700.0, 79700.0, 'Medidas
160mm x 70mm x 50mm
Impresión en Resina Standar ABS  
Color Gris
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Diseño y desarrollo de soporte superior
inclinado para iphone 16 pro max 
Para Drone', 1, 160.0, 70.0, 50.0, 560.0, 300.0, 320.0, 90.0, 60.0, 0.0, 2001.6, 31964.6, 75.06, 10081.08, 25000.0, 0.0, 69122.34, 0.45, 100200.0, 100200.0, 'Medidas
160mm x 70mm x 50mm
Impresión en Resina Standar ABS  
Color Gris
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Caja porta baterías 550 
Capacidad 12 puestos.
Con tapa y logo personalizado', 1, 130.0, 50.0, 135.0, 877.5, 200.0, 390.0, 90.0, 60.0, 0.0, 2439.45, 22300.88, 50.04, 5554.05, 25000.0, 0.0, 55344.43, 0.45, 80200.0, 80200.0, 'Medidas
130mm x 50mm x 135mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Soporte inferior de mano para drone', 1, 50.0, 60.0, 50.0, 150.0, 169.5, 150.0, 60.0, 30.0, 0.0, 938.25, 18900.0, 50.04, 5240.81, 15000.0, 0.0, 40129.1, 0.45, 58200.0, 58200.0, 'Medidas
50mm x 60mm x 50mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Tapa bateria XT60', 2, 12.0, 18.0, 20.0, 4.32, 4.8816, 36.0, 15.0, 0.0, 0.0, 225.18, 544.32, 25.02, 50.14, 2500.0, 0.0, 3344.66, 0.4, 4700.0, 9400.0, 'Medidas
12mm x 18mm x 20mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-023
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 15 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-023', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 96900.0, 96900.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Funko ozzy osbourne
Pintado', 1, 100.0, 70.0, 80.0, 200.0, 226.0, 300.0, 20.0, 0.0, 100.0, 1876.5, 25200.0, 50.04, 6717.08, 20000.0, 0.0, 53843.62, 0.8, 96900.0, 96900.0, 'Medidas
100mm x 70mm x 80mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-024
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 14 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-024', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 149300.0, 149300.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Tanjiro
Pintado', 1, 200.0, 140.0, 140.0, 400.0, 452.0, 600.0, 40.0, 20.0, 200.0, 3753.0, 50400.0, 150.12, 9038.16, 43333.33, 0.0, 106674.62, 0.4, 149300.0, 149300.0, 'Medidas
200mm x 140mm x 140mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-025
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 6 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-025', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 123400.0, 123400.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Soporte AirTag', 1, 18.0, 40.0, 40.0, 28.8, 32.544, 54.0, 15.0, 10.0, 0.0, 337.77, 3588.48, 25.02, 334.24, 4166.67, 0.0, 8452.17, 0.616, 13700.0, 13700.0, 'Medidas
18mm x 40mm x 40mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Soporte AirTag', 1, 15.0, 80.0, 40.0, 48.0, 54.24, 45.0, 15.0, 10.0, 0.0, 281.48, 5980.8, 50.04, 557.06, 4166.67, 0.0, 11036.04, 0.616, 17800.0, 17800.0, 'Medidas
15mm x 80mm x 40mm
Impresión en Resina Standar 
Color Negro
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Virgen de guadalupe - Pintada
Soporte en porcelanicron', 1, 130.0, 40.0, 80.0, 250.0, 282.5, 390.0, 15.0, 10.0, 120.0, 2439.45, 31500.0, 75.06, 5231.35, 24166.67, 0.0, 63412.53, 0.45, 91900.0, 91900.0, 'Medidas
130mm x 40mm x 80mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-026
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 1 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-026', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 205100.0, 205100.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Calcifer 5 cm', 1, 50.0, 50.0, 25.0, 26.0, 29.38, 150.0, 0.0, 5.0, 60.0, 938.25, 3276.0, 25.02, 1099.74, 10833.33, 0.0, 16172.34, 0.315, 21300.0, 21300.0, 'Medidas
50mm x 50mm x 25mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Calcifer 3.6 cm Llavero', 1, 36.0, 36.0, 1.7, 10.0, 11.3, 108.0, 10.0, 15.0, 50.0, 675.54, 1260.0, 25.02, 1898.05, 12500.0, 0.0, 16358.61, 0.3, 21300.0, 21300.0, 'Medidas
36mm x 36mm x 1.7mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Calcifer 1.5 cm Arete', 1, 15.0, 15.0, 10.0, 2.0, 2.26, 45.0, 10.0, 15.0, 40.0, 281.48, 252.0, 25.02, 1139.21, 10833.33, 0.0, 12531.04, 0.3, 16300.0, 16300.0, 'Medidas
15mm x 15mm x 10mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Patin Agresivo', 1, 50.0, 50.0, 10.0, 8.0, 9.04, 150.0, 5.0, 5.0, 20.0, 938.25, 1008.0, 25.02, 1258.84, 5000.0, 0.0, 8230.11, 1.5, 20600.0, 20600.0, 'Medidas
50mm x 50mm x 10mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Patin Hockey', 1, 50.0, 50.0, 10.0, 8.0, 9.04, 150.0, 5.0, 5.0, 20.0, 938.25, 1008.0, 25.02, 1258.84, 5000.0, 0.0, 8230.11, 1.5, 20600.0, 20600.0, 'Medidas
50mm x 50mm x 10mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Patin Quat A', 1, 50.0, 50.0, 10.0, 12.0, 13.56, 150.0, 5.0, 5.0, 20.0, 938.25, 1512.0, 25.02, 1305.26, 5000.0, 0.0, 8780.53, 1.5, 22000.0, 22000.0, 'Medidas
50mm x 50mm x 10mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Patin Quat B', 1, 50.0, 50.0, 10.0, 11.0, 12.43, 150.0, 5.0, 5.0, 20.0, 938.25, 1386.0, 25.02, 1293.66, 5000.0, 0.0, 8642.93, 1.5, 21600.0, 21600.0, 'Medidas
50mm x 50mm x 10mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Patin ruta rueda pequeña', 1, 50.0, 50.0, 10.0, 10.0, 11.3, 150.0, 5.0, 5.0, 20.0, 938.25, 1260.0, 25.02, 1282.05, 5000.0, 0.0, 8505.32, 1.5, 21300.0, 21300.0, 'Medidas
50mm x 50mm x 10mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Patin ruta', 1, 50.0, 50.0, 10.0, 7.0, 7.91, 150.0, 5.0, 5.0, 20.0, 938.25, 882.0, 25.02, 1247.24, 5000.0, 0.0, 8092.51, 1.5, 20200.0, 20200.0, 'Medidas
50mm x 50mm x 10mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Patin velocidad', 1, 50.0, 50.0, 10.0, 6.0, 6.78, 150.0, 5.0, 5.0, 20.0, 938.25, 756.0, 25.02, 1235.63, 5000.0, 0.0, 7954.9, 1.5, 19900.0, 19900.0, 'Medidas
50mm x 50mm x 10mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-027
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 5 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-027', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 44800.0, 44800.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Torre de dados 
Para dados de 1.5 cm', 1, 125.0, 80.0, 90.0, 150.0, 169.5, 375.0, 10.0, 10.0, 0.0, 2345.62, 18900.0, 50.04, 1740.81, 3333.33, 0.0, 26369.81, 0.7, 44800.0, 44800.0, 'Medidas
125mm x 80mm x 90mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-028
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 16 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-028', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 22200.0, 22200.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Cachos diabla para casco
Color Morado
Con Velcro', 2, 40.0, 40.0, 40.0, 25.0, 28.25, 120.0, 0.0, 6.0, 10.0, 750.6, 3150.0, 25.02, 1956.14, 2666.67, 0.0, 8548.42, 0.3, 11100.0, 22200.0, 'Medidas
40mm x 40mm x 40mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-029
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 7 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-029', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 180500.0, 180500.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Caja porta baterías 550 
Capacidad 12 puestos.
Con tapa y logo personalizado', 1, 130.0, 50.0, 135.0, 877.5, 200.0, 390.0, 90.0, 60.0, 0.0, 2439.45, 15929.2, 50.04, 5554.05, 25000.0, 0.0, 48972.75, 0.45, 71000.0, 71000.0, 'Medidas
130mm x 50mm x 135mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Soporte inferior de mano para drone', 1, 50.0, 60.0, 50.0, 150.0, 169.5, 150.0, 60.0, 30.0, 0.0, 938.25, 13500.0, 50.04, 5240.81, 15000.0, 0.0, 34729.1, 0.45, 50400.0, 50400.0, 'Medidas
50mm x 60mm x 50mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Tapa bateria XT60', 2, 12.0, 18.0, 20.0, 4.32, 4.8816, 36.0, 15.0, 0.0, 0.0, 225.18, 388.8, 25.02, 50.14, 2500.0, 0.0, 3189.14, 0.4, 4500.0, 9000.0, 'Medidas
12mm x 18mm x 20mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Calcifer 5 cm', 1, 50.0, 50.0, 25.0, 26.0, 29.38, 150.0, 0.0, 5.0, 60.0, 938.25, 2340.0, 25.02, 1099.74, 10833.33, 0.0, 15236.34, 0.315, 20000.0, 20000.0, 'Medidas
50mm x 50mm x 25mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Figura Pikachu', 1, 54.0, 40.0, 28.0, 60.48, 68.3424, 162.0, 10.0, 0.0, 40.0, 1013.31, 7620.48, 50.04, 1533.89, 8333.33, 0.0, 18551.06, 0.62, 30100.0, 30100.0, 'Medidas
54mm x 40mm x 28mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-030
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 17 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-030', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 77200.0, 77200.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Perros', 2, 50.0, 20.0, 50.0, 50.0, 56.5, 150.0, 15.0, 0.0, 60.0, 938.25, 6300.0, 50.04, 2910.27, 12500.0, 0.0, 22698.56, 0.7, 38600.0, 77200.0, 'Medidas
50mm x 20mm x 50mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-031
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 18 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-031', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 73100.0, 73100.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'perro', 1, 80.0, 70.0, 120.0, 128.0, 144.64, 240.0, 15.0, 0.0, 120.0, 1501.2, 16128.0, 50.04, 2815.49, 22500.0, 0.0, 42994.73, 0.7, 73100.0, 73100.0, 'Medidas
80mm x 70mm x 120mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-032
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 19 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-032', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 153800.0, 153800.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Perro', 2, 100.0, 100.0, 60.0, 162.0, 183.06, 300.0, 15.0, 0.0, 120.0, 1876.5, 20412.0, 50.04, 3210.08, 22500.0, 0.0, 48048.62, 0.6, 76900.0, 153800.0, 'Medidas
100mm x 100mm x 60mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-033
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 20 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-033', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 95600.0, 95600.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Pikachu con soporte para casco tipo GO-pro', 1, 92.0, 100.0, 60.0, 90.0, 101.7, 184.0, 30.0, 20.0, 90.0, 1150.92, 10836.0, 50.04, 20874.49, 23333.33, 0.0, 56244.78, 0.7, 95600.0, 95600.0, 'Medidas
92mm x 100mm x 60mm
Impresión en Resina Standar ABS  
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-034
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-034', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 37800.0, 37800.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Cachos diabla para casco
Pintados
Con Velcro', 2, 40.0, 40.0, 40.0, 25.0, 28.25, 120.0, 0.0, 0.0, 30.0, 750.6, 3150.0, 25.02, 5622.14, 5000.0, 0.0, 14547.76, 0.3, 18900.0, 37800.0, 'Medidas
40mm x 40mm x 40mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-035
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 2 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-035', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 12800.0, 12800.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Miniatura', 1, 69.0, 38.0, 45.0, 11.0, 12.43, 207.0, 20.0, 0.0, 30.0, 1294.79, 987.19, 25.02, 459.66, 8333.33, 0.0, 11099.98, 0.15, 12800.0, 12800.0, 'Medidas
69mm x 38mm x 45mm
Impresión en Resina Standar + 
Color Negro
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-036
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 21 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-036', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 41200.0, 41200.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Patines', 1, 50.0, 50.0, 21.0, 8.0, 9.04, 150.0, 20.0, 0.0, 30.0, 938.25, 1008.0, 25.02, 490.84, 8333.33, 0.0, 10795.45, 0.91, 20600.0, 20600.0, 'Medidas
50mm x 50mm x 21mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Patines', 1, 50.0, 50.0, 21.0, 8.0, 9.04, 150.0, 20.0, 0.0, 30.0, 938.25, 1008.0, 25.02, 490.84, 8333.33, 0.0, 10795.45, 0.91, 20600.0, 20600.0, 'Medidas
50mm x 50mm x 21mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-037
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 22 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-037', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 79800.0, 79800.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'busto', 1, 100.0, 80.0, 60.0, 100.0, 113.0, 300.0, 30.0, 0.0, 120.0, 1876.5, 12600.0, 50.04, 2490.54, 25000.0, 0.0, 42017.08, 0.9, 79800.0, 79800.0, 'Medidas
100mm x 80mm x 60mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-038
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 8 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-038', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 76700.0, 76700.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Bom clyde', 1, 103.0, 62.0, 94.0, 100.0, 113.0, 309.0, 10.0, 0.0, 200.0, 1932.8, 12600.0, 50.04, 3320.54, 35000.0, 0.0, 52903.38, 0.45, 76700.0, 76700.0, 'Medidas
103mm x 62mm x 94mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-039
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 24 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-039', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 295800.0, 295800.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'perrito', 1, 100.0, 60.0, 140.0, 160.0, 180.8, 300.0, 20.0, 0.0, 120.0, 1876.5, 20160.0, 50.04, 4016.86, 23333.33, 0.0, 49436.74, 0.7, 84000.0, 84000.0, 'Medidas
100mm x 60mm x 140mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'perrito', 1, 200.0, 120.0, 280.0, 1085.0, 1226.05, 600.0, 20.0, 10.0, 120.0, 3753.0, 117180.0, 75.06, 16911.86, 25000.0, 0.0, 162919.92, 0.3, 211800.0, 211800.0, 'Medidas
200mm x 120mm x 280mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-040
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 23 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-040', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 106200.0, 106200.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'medalla', 6, 11.8, 80.0, 80.0, 30.6, 34.578, 35.4, 20.0, 0.0, 30.0, 221.43, 3855.6, 25.02, 1185.13, 8333.33, 0.0, 13620.51, 0.3, 17700.0, 106200.0, 'Medidas
11.8mm x 80mm x 80mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-041
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 10 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-041', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 92900.0, 92900.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'mempo', 1, 113.0, 200.0, 140.0, 250.0, 282.5, 339.0, 20.0, 10.0, 100.0, 2120.45, 31500.0, 75.06, 6561.35, 21666.67, 0.0, 61923.52, 0.5, 92900.0, 92900.0, 'Medidas
113mm x 200mm x 140mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-042
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-042', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 89100.0, 89100.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'perrito', 1, 100.0, 80.0, 80.0, 232.0, 262.16, 300.0, 20.0, 0.0, 120.0, 1876.5, 29232.0, 75.06, 4852.45, 23333.33, 0.0, 59369.35, 0.5, 89100.0, 89100.0, 'Medidas
100mm x 80mm x 80mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-043
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-043', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 50200.0, 50200.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Anillo personalizado', 2, 30.0, 25.0, 25.0, 12.0, 13.56, 90.0, 20.0, 0.0, 60.0, 562.95, 1512.0, 25.02, 969.26, 13333.33, 0.0, 16402.57, 0.53, 25100.0, 50200.0, 'Medidas
30mm x 25mm x 25mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-044
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 25 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-044', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 25000.0, 25000.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Soporte', 1, 62.0, 60.0, 40.0, 55.0, 62.15, 124.0, 20.0, 0.0, 0.0, 775.62, 6622.0, 50.04, 638.3, 3333.33, 0.0, 11419.29, 1.19, 25000.0, 25000.0, 'Medidas
62mm x 60mm x 40mm
Impresión en Resina Standar ABS  
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-045
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 20 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-045', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 36000.0, 36000.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Modelo Polea Ø120 mm', 1, 120.0, 120.0, 26.0, 130.0, 146.9, 240.0, 20.0, 0.0, 0.0, 1501.2, 15652.0, 50.04, 1508.7, 3333.33, 0.0, 22045.28, 0.635, 36000.0, 36000.0, 'Medidas
120mm x 120mm x 26mm
Impresión en Resina Standar ABS  
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-046
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 26 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-046', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 447900.0, 447900.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Matera personalizada tipo patin
Acabado color blanco detalles en las flores', 1, 156.0, 145.0, 60.0, 410.0, 463.3, 468.0, 60.0, 0.0, 20.0, 2927.34, 25830.0, 75.06, 5090.22, 13333.33, 0.0, 47255.95, 0.45, 68500.0, 68500.0, 'Medidas
156mm x 145mm x 60mm
Impresión en Resina Standar 
Color Blanca
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Matera personalizada tipo guitarrista
Acabado blanco
Sin pintura', 2, 100.0, 89.0, 80.0, 98.0, 110.74, 300.0, 60.0, 0.0, 0.0, 1876.5, 6174.0, 50.04, 1137.33, 10000.0, 0.0, 19237.87, 0.45, 27900.0, 55800.0, 'Medidas
100mm x 89mm x 80mm
Impresión en Resina Standar 
Color Blanca
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Matera personalizada tipo bajista
Acabado blanco
Sin pintura', 2, 100.0, 80.0, 100.0, 94.0, 106.22, 300.0, 60.0, 0.0, 0.0, 1876.5, 5922.0, 50.04, 1090.91, 10000.0, 0.0, 18939.45, 0.45, 27500.0, 55000.0, 'Medidas
100mm x 80mm x 100mm
Impresión en Resina Standar 
Color Blanca
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Matera personalizada tipo pianista
Acabado blanco', 1, 145.0, 82.0, 120.0, 200.0, 226.0, 435.0, 60.0, 0.0, 0.0, 2720.93, 12600.0, 50.04, 2321.08, 10000.0, 0.0, 27692.05, 0.45, 40200.0, 40200.0, 'Medidas
145mm x 82mm x 120mm
Impresión en Resina Standar 
Color Blanca
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Matera personalizada tipo patin en linea
Acabado color blanco
Sin pintura', 4, 174.0, 135.0, 60.0, 300.0, 339.0, 522.0, 60.0, 0.0, 20.0, 3265.11, 18900.0, 75.06, 3813.62, 13333.33, 0.0, 39387.12, 0.45, 57100.0, 228400.0, 'Medidas
174mm x 135mm x 60mm
Impresión en Resina Standar 
Color Blanca
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-047
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 21 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-047', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 25300.0, 25300.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Jabonera en forma de telaraña con base de 55mm', 1, 140.0, 140.0, 50.0, 96.0, 108.48, 280.0, 30.0, 0.0, 0.0, 1751.4, 11558.4, 50.04, 1114.12, 5000.0, 0.0, 19473.96, 0.3, 25300.0, 25300.0, 'Medidas
140mm x 140mm x 50mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-048
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 27 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-048', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 234000.0, 234000.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Placa sheriff
Acabado pintura plateada', 12, 70.0, 60.0, 10.0, 19.0, 21.47, 140.0, 30.0, 5.0, 15.0, 875.7, 2287.6, 25.02, 1072.5, 8333.33, 0.0, 12594.16, 0.55, 19500.0, 234000.0, 'Medidas
70mm x 60mm x 10mm
Impresión en Resina Standar ABS  
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-050
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-050', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 156800.0, 156800.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Matera casa', 1, 120.0, 85.0, 110.0, 273.0, 308.49, 360.0, 30.0, 0.0, 120.0, 2251.8, 17199.0, 75.06, 4300.28, 25000.0, 0.0, 48826.14, 0.55, 75700.0, 75700.0, 'Medidas
120mm x 85mm x 110mm
Impresión en Resina Standar 
Color Blanca
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Matera de principito', 1, 106.0, 85.0, 110.0, 190.0, 214.7, 318.0, 30.0, 0.0, 180.0, 1989.09, 11970.0, 50.04, 3337.03, 35000.0, 0.0, 52346.16, 0.55, 81100.0, 81100.0, 'Medidas
106mm x 85mm x 110mm
Impresión en Resina Standar 
Color Blanca
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-051
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 28 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-051', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 41800.0, 41800.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Pin de pollo', 1, 30.0, 25.0, 13.8, 5.0, 5.65, 60.0, 15.0, 10.0, 30.0, 375.3, 602.0, 25.02, 584.03, 9166.67, 0.0, 10753.01, 0.6, 17200.0, 17200.0, 'Medidas
30mm x 25mm x 13.8mm
Impresión en Resina Standar ABS  
Color Gris
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'figura de pollo en huevo', 1, 50.0, 40.0, 40.0, 50.0, 56.5, 150.0, 30.0, 0.0, 30.0, 938.25, 3150.0, 50.04, 1246.27, 10000.0, 0.0, 15384.56, 0.6, 24600.0, 24600.0, 'Medidas
50mm x 40mm x 40mm
Impresión en Resina Standar 
Color Blanca
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-052
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-052', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 90200.0, 90200.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Perro', 1, 100.0, 100.0, 60.0, 230.0, 259.9, 300.0, 15.0, 0.0, 120.0, 1876.5, 28980.0, 75.06, 3301.24, 22500.0, 0.0, 56732.8, 0.59, 90200.0, 90200.0, 'Medidas
100mm x 100mm x 60mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-053
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 7 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-053', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 88800.0, 88800.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Llavero LUMINA FEST', 12, 7.0, 56.0, 27.0, 10.0, 11.3, 21.0, 10.0, 5.0, 0.0, 131.35, 1260.0, 25.02, 1016.05, 2500.0, 0.0, 4932.43, 0.5, 7400.0, 88800.0, 'Medidas
7mm x 56mm x 27mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-054
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-054', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 59700.0, 59700.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'pochita', 1, 100.0, 80.0, 130.0, 168.0, 189.84, 300.0, 20.0, 0.0, 50.0, 1876.5, 21168.0, 50.04, 2581.71, 11666.67, 0.0, 37342.91, 0.6, 59700.0, 59700.0, 'Medidas
100mm x 80mm x 130mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-055
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 1 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-055', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 107700.0, 107700.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Renault 6', 1, 45.0, 48.0, 120.0, 114.9, 129.837, 135.0, 120.0, 60.0, 120.0, 844.42, 14477.4, 50.04, 1965.46, 50000.0, 0.0, 67337.33, 0.6, 107700.0, 107700.0, 'Medidas
45mm x 48mm x 120mm
Impresión en Resina Standar 
Color Gris
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-056
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 2 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-056', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 66200.0, 66200.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'figura 5CM', 1, 60.0, 42.67, 52.74, 17.0, 19.21, 120.0, 60.0, 0.0, 180.0, 750.6, 2046.8, 25.02, 1329.29, 40000.0, 0.0, 44151.71, 0.5, 66200.0, 66200.0, 'Medidas
60mm x 42.67mm x 52.74mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-057
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-057', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 42000.0, 42000.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'cabezas gemelas con penacho', 1, 110.0, 160.0, 30.0, 200.0, 226.0, 220.0, 25.0, 0.0, 0.0, 1376.1, 24080.0, 50.04, 2321.08, 4166.67, 0.0, 31993.89, 0.314, 42000.0, 42000.0, 'Medidas
110mm x 160mm x 30mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-058
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 9 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-058', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 61300.0, 61300.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'matera de gato', 1, 95.78, 85.08, 85.85, 174.0, 196.62, 191.56, 25.0, 0.0, 30.0, 1198.21, 20949.6, 50.04, 2683.34, 9166.67, 0.0, 34047.86, 0.8, 61300.0, 61300.0, 'Medidas
95.78mm x 85.08mm x 85.85mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-059
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-059', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 54800.0, 54800.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'figura de sirena cartoon', 1, 65.73, 80.0, 60.0, 37.0, 41.81, 131.46, 60.0, 0.0, 120.0, 822.28, 4454.8, 25.02, 1227.4, 30000.0, 0.0, 36529.5, 0.5, 54800.0, 54800.0, 'Medidas
65.73mm x 80mm x 60mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-060
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 1 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-060', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 114500.0, 114500.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Demon Lord Die Erlko Konig', 1, 228.0, 210.0, 40.0, 100.0, 113.0, 456.0, 180.0, 20.0, 100.0, 2852.28, 12040.0, 50.04, 2590.54, 50000.0, 4050.0, 71582.86, 0.6, 114500.0, 114500.0, 'Medidas
228mm x 210mm x 40mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-061
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-061', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 82200.0, 82200.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Perro 10 cm', 1, 80.0, 80.0, 60.0, 140.0, 158.2, 160.0, 30.0, 10.0, 120.0, 1000.8, 16856.0, 50.04, 3784.76, 26666.67, 0.0, 48358.26, 0.7, 82200.0, 82200.0, 'Medidas
80mm x 80mm x 60mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-062
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 29 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-062', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 428300.0, 428300.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Demon Lord Die Erlko Konig', 1, 300.0, 200.0, 170.0, 1250.0, 1412.5, 600.0, 480.0, 60.0, 0.0, 3753.0, 150500.0, 75.06, 14506.76, 90000.0, 0.0, 258834.82, 0.5, 388300.0, 388300.0, 'Medidas
300mm x 200mm x 170mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'HOLLOW KNIGHT', 2, 40.0, 10.0, 10.0, 5.0, 5.65, 80.0, 31.0, 40.0, 0.0, 500.4, 602.0, 25.02, 339.65, 11833.33, 0.0, 13300.4, 0.5, 20000.0, 40000.0, 'Medidas
40mm x 10mm x 10mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-063
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 1 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-063', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 70000.0, 70000.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'COLLAR 
CORDON COBRA
PINTADO PLATEADO CON NUMERO PERSONALIZADO', 5, 40.0, 30.0, 13.0, 6.0, 6.78, 80.0, 10.0, 15.0, 10.0, 500.4, 722.4, 25.02, 700.63, 5833.33, 0.0, 7781.79, 0.8, 14000.0, 70000.0, 'Medidas
40mm x 30mm x 13mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-064
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 30 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-064', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 150900.0, 150900.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'placa empresarial', 1, 150.0, 50.0, 110.0, 150.0, 169.5, 300.0, 470.0, 0.0, 0.0, 1876.5, 18060.0, 50.04, 2270.81, 78333.33, 0.0, 100590.68, 0.5, 150900.0, 150900.0, 'Medidas
150mm x 50mm x 110mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-065
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-065', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 38000.0, 38000.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Arete forma de ala', 2, 70.0, 55.0, 40.0, 5.0, 5.65, 140.0, 30.0, 20.0, 10.0, 875.7, 602.0, 25.02, 394.03, 10000.0, 0.0, 11896.75, 0.6, 19000.0, 38000.0, 'Medidas
70mm x 55mm x 40mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-066
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 31 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-066', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 189200.0, 189200.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Base-Base', 1, 100.0, 40.0, 150.0, 71.0, 80.23, 200.0, 20.0, 0.0, 0.0, 1251.0, 8548.4, 50.04, 823.98, 3333.33, 0.0, 14006.76, 0.5, 21000.0, 21000.0, 'Medidas
100mm x 40mm x 150mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Base-Support', 1, 150.0, 89.0, 50.0, 53.0, 59.89, 300.0, 20.0, 0.0, 0.0, 1876.5, 6381.2, 50.04, 615.09, 3333.33, 0.0, 12256.16, 0.5, 18400.0, 18400.0, 'Medidas
150mm x 89mm x 50mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Disc', 1, 117.0, 200.0, 110.0, 54.0, 61.02, 234.0, 20.0, 0.0, 0.0, 1463.67, 6501.6, 50.04, 626.69, 3333.33, 0.0, 11975.34, 0.5, 18000.0, 18000.0, 'Medidas
117mm x 200mm x 110mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Encoder Support', 1, 50.0, 40.0, 21.0, 5.0, 5.65, 100.0, 20.0, 0.0, 0.0, 625.5, 602.0, 25.02, 58.03, 3333.33, 0.0, 4643.88, 0.5, 7000.0, 7000.0, 'Medidas
50mm x 40mm x 21mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Encoder Wheel', 1, 25.0, 40.0, 20.0, 4.0, 4.52, 50.0, 20.0, 0.0, 0.0, 312.75, 481.6, 25.02, 46.42, 3333.33, 0.0, 4199.12, 0.5, 6300.0, 6300.0, 'Medidas
25mm x 40mm x 20mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Entry Tube', 1, 140.0, 116.0, 100.0, 55.0, 62.15, 280.0, 20.0, 0.0, 0.0, 1751.4, 6622.0, 50.04, 638.3, 3333.33, 0.0, 12395.07, 0.5, 18600.0, 18600.0, 'Medidas
140mm x 116mm x 100mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Motor Holder (Reservoir)', 1, 50.0, 42.0, 70.0, 10.0, 11.3, 100.0, 20.0, 0.0, 0.0, 625.5, 1204.0, 25.02, 116.05, 3333.33, 0.0, 5303.91, 0.5, 8000.0, 8000.0, 'Medidas
50mm x 42mm x 70mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Motor Holder', 1, 120.0, 94.0, 60.0, 33.0, 37.29, 240.0, 20.0, 0.0, 0.0, 1501.2, 3973.2, 25.02, 382.98, 3333.33, 0.0, 9215.73, 0.5, 13800.0, 13800.0, 'Medidas
120mm x 94mm x 60mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Motor Tube', 1, 120.0, 95.0, 80.0, 43.0, 48.59, 240.0, 20.0, 0.0, 0.0, 1501.2, 5177.2, 25.02, 499.03, 3333.33, 0.0, 10535.79, 0.5, 15800.0, 15800.0, 'Medidas
120mm x 95mm x 80mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Pin', 1, 50.0, 30.0, 40.0, 9.0, 10.17, 100.0, 20.0, 0.0, 0.0, 625.5, 1083.6, 25.02, 104.45, 3333.33, 0.0, 5171.9, 0.5, 7800.0, 7800.0, 'Medidas
50mm x 30mm x 40mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Reservoir Base', 1, 200.0, 164.0, 20.0, 129.0, 145.77, 400.0, 20.0, 0.0, 0.0, 2502.0, 15531.6, 50.04, 1497.1, 3333.33, 0.0, 22914.07, 0.5, 34400.0, 34400.0, 'Medidas
200mm x 164mm x 20mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Wall Holder', 1, 50.0, 40.0, 30.0, 6.0, 6.78, 100.0, 20.0, 0.0, 0.0, 625.5, 722.4, 25.02, 69.63, 3333.33, 0.0, 4775.89, 0.5, 7200.0, 7200.0, 'Medidas
50mm x 40mm x 30mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Wall Ring', 1, 200.0, 164.0, 20.0, 21.0, 23.73, 400.0, 20.0, 0.0, 0.0, 2502.0, 2528.4, 25.02, 243.71, 3333.33, 0.0, 8632.47, 0.5, 12900.0, 12900.0, 'Medidas
200mm x 164mm x 20mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-067
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 31 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-067', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 223300.0, 223300.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Ball stopper', 1, 40.0, 23.0, 20.0, 1.0, 1.13, 80.0, 20.0, 0.0, 0.0, 500.4, 120.4, 25.02, 11.61, 3333.33, 0.0, 3990.76, 0.5, 6000.0, 6000.0, 'Medidas
40mm x 23mm x 20mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Connecting rod', 1, 90.0, 65.0, 30.0, 6.0, 6.78, 180.0, 20.0, 0.0, 0.0, 1125.9, 722.4, 25.02, 69.63, 3333.33, 0.0, 5276.29, 0.5, 7900.0, 7900.0, 'Medidas
90mm x 65mm x 30mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Crank retaining pin', 1, 30.0, 30.0, 15.0, 1.0, 1.13, 60.0, 20.0, 0.0, 0.0, 375.3, 120.4, 25.02, 11.61, 3333.33, 0.0, 3865.66, 0.5, 5800.0, 5800.0, 'Medidas
30mm x 30mm x 15mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Crank', 1, 80.0, 70.0, 52.0, 20.0, 22.6, 160.0, 20.0, 0.0, 0.0, 1000.8, 2408.0, 25.02, 232.11, 3333.33, 0.0, 6999.26, 0.5, 10500.0, 10500.0, 'Medidas
80mm x 70mm x 52mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Housing 1', 1, 200.0, 160.0, 60.0, 208.0, 235.04, 400.0, 20.0, 0.0, 0.0, 2502.0, 25043.2, 50.04, 2413.92, 3333.33, 0.0, 33342.5, 0.5, 50000.0, 50000.0, 'Medidas
200mm x 160mm x 60mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Housing 2', 1, 200.0, 160.0, 60.0, 211.0, 238.43, 400.0, 20.0, 0.0, 0.0, 2502.0, 25404.4, 50.04, 2448.74, 3333.33, 0.0, 33738.51, 0.5, 50600.0, 50600.0, 'Medidas
200mm x 160mm x 60mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Parallax servo holder', 1, 120.0, 60.0, 60.0, 28.0, 31.64, 240.0, 20.0, 0.0, 0.0, 1501.2, 3371.2, 25.02, 324.95, 3333.33, 0.0, 8555.7, 0.5, 12800.0, 12800.0, 'Medidas
120mm x 60mm x 60mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Piston retaining pin', 1, 20.0, 20.0, 12.0, 2.0, 2.26, 40.0, 20.0, 0.0, 0.0, 250.2, 240.8, 25.02, 23.21, 3333.33, 0.0, 3872.56, 0.5, 5800.0, 5800.0, 'Medidas
20mm x 20mm x 12mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Piston', 1, 80.0, 51.0, 30.0, 10.0, 11.3, 160.0, 20.0, 0.0, 0.0, 1000.8, 1204.0, 25.02, 116.05, 3333.33, 0.0, 5679.21, 0.5, 8500.0, 8500.0, 'Medidas
80mm x 51mm x 30mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles'),
    (v_cot_id, 'Funnel', 1, 260.0, 220.0, 162.0, 280.0, 316.4, 520.0, 20.0, 0.0, 0.0, 3252.6, 33712.0, 75.06, 3249.51, 3333.33, 0.0, 43622.51, 0.5, 65400.0, 65400.0, 'Medidas
260mm x 220mm x 162mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-068
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 1 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-068', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 366500.0, 366500.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Endurens motorizado paarte 1', 1, 143.0, 143.0, 12.0, 150.0, 169.5, 286.0, 240.0, 240.0, 240.0, 1788.93, 18060.0, 50.04, 28070.81, 120000.0, 0.0, 167969.78, 0.5, 252000.0, 252000.0, 'Medidas
143mm x 143mm x 12mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Endurens motorizado parte 2', 1, 143.0, 143.0, 15.0, 150.0, 169.5, 286.0, 20.0, 60.0, 240.0, 1788.93, 18060.0, 50.04, 3070.81, 53333.33, 0.0, 76303.11, 0.5, 114500.0, 114500.0, 'Medidas
143mm x 143mm x 15mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-069
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-069', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Facturada', 65400.0, 65400.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'PERRO SALCHICHA', 1, 150.0, 90.0, 50.0, 210.0, 237.3, 300.0, 40.0, 0.0, 0.0, 1876.5, 25284.0, 50.04, 2437.14, 6666.67, 0.0, 36314.34, 0.8, 65400.0, 65400.0, 'Medidas
150mm x 90mm x 50mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-070
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 3 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-070', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Enviada', 55200.0, 55200.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Huevos', 8, 20.0, 15.0, 15.0, 20.0, 22.6, 40.0, 10.0, 0.0, 0.0, 250.2, 2408.0, 25.02, 232.11, 1666.67, 0.0, 4581.99, 0.5, 6900.0, 55200.0, 'Medidas
20mm x 15mm x 15mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles');


  -- Cotización 25-071
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 1 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-071', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Enviada', 118700.0, 118700.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Yamaha Fazer 150 blanca modelo 2013', 1, 110.0, 66.0, 60.0, 100.0, 113.0, 220.0, 60.0, 0.0, 240.0, 1376.1, 12040.0, 50.04, 2490.54, 50000.0, 0.0, 65956.68, 0.8, 118700.0, 118700.0, 'Medidas
110mm x 66mm x 60mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-072
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 1 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-072', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Enviada', 513000.0, 513000.0, '(7) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'alien con base', 1, 110.0, 92.0, 100.0, 200.0, 226.0, 220.0, 180.0, 60.0, 360.0, 1376.1, 24080.0, 50.04, 4481.08, 100000.0, 10000.0, 139987.22, 0.8, 252000.0, 252000.0, 'Medidas
110mm x 92mm x 100mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles'),
    (v_cot_id, 'Predador con base', 1, 110.0, 100.0, 100.0, 200.0, 226.0, 220.0, 180.0, 90.0, 360.0, 1376.1, 24080.0, 50.04, 4481.08, 105000.0, 10000.0, 144987.22, 0.8, 261000.0, 261000.0, 'Medidas
110mm x 100mm x 100mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(7) Dias habiles');


  -- Cotización 25-073
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = 1 LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ('25-073', v_cli_id, 'Equipo WJGEEKS', '2025-02-01', 'Enviada', 35000.0, 35000.0, '(3) Dias habiles', 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;

  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES
    (v_cot_id, 'Kit de pintura y miniatura', 1, 50.0, 70.0, 70.0, 20.0, 22.6, 100.0, 20.0, 20.0, 5.0, 625.5, 2408.0, 25.02, 8080.11, 7500.0, 0.0, 18638.63, 0.88, 35000.0, 35000.0, 'Medidas
50mm x 70mm x 70mm
Impresión en Resina Standar ABS  
Color Negra
Tiempo de entrega
(3) Dias habiles');

END $$;
