import json
import re

# Load initial data
with open('src/data/initialData.ts', 'r', encoding='utf-8') as f:
    ts_code = f.read()

def extract_json_var(name):
    pattern = rf'export const {name}[^=]*=\s*(\[.*?\]|\{{.*?\}});'
    match = re.search(pattern, ts_code, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return None

resinas = extract_json_var('RESINAS_INICIALES')
insumos = extract_json_var('INSUMOS_INICIALES')
maquinas = extract_json_var('MAQUINAS_INICIALES')
personal = extract_json_var('PERSONAL_INICIAL')
clientes = extract_json_var('CLIENTES_INICIALES')
configuracion = extract_json_var('CONFIGURACION_INICIAL')

# Load cotizaciones
with open('src/data/initialCotizaciones.ts', 'r', encoding='utf-8') as f:
    cot_code = f.read()
cot_start = cot_code.find('COTIZACIONES_INICIALES: Cotizacion[] = ') + len('COTIZACIONES_INICIALES: Cotizacion[] = ')
cot_json = cot_code[cot_start:].strip().rstrip(';')
cotizaciones = json.loads(cot_json)

def escape_sql(val):
    if val is None:
        return "NULL"
    s = str(val).replace("'", "''")
    return f"'{s}'"

sql_lines = [
"""-- ========================================================
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
"""
]

# INSERTS: Configuracion
cfg = configuracion
sql_lines.append(f"""
-- ========================================================
-- DATOS MAESTROS: CONFIGURACIÓN
-- ========================================================
INSERT INTO configuracion_taller (tarifa_kwh, margen_merma_resina, telefono_contacto, telefono_contacto2, instagram, nequi, daviplata, bancolombia, titular_cuenta)
VALUES ({cfg['tarifa_kwh']}, {cfg['margen_merma_resina']}, {escape_sql(cfg['telefono_contacto'])}, {escape_sql(cfg['telefono_contacto2'])}, {escape_sql(cfg['instagram'])}, {escape_sql(cfg['nequi'])}, {escape_sql(cfg['daviplata'])}, {escape_sql(cfg['bancolombia'])}, {escape_sql(cfg['titular_cuenta'])});
""")

# INSERTS: Resinas
sql_lines.append("""-- DATOS MAESTROS: RESINAS
INSERT INTO resinas (tipo, marca, color, volumen_l, densidad_g_cm3, peso_g, precio_compra, costo_gramo, velocidad_impresion_mm_h) VALUES""")
res_values = []
for r in resinas:
    res_values.append(f"({escape_sql(r['tipo'])}, {escape_sql(r['marca'])}, {escape_sql(r['color'])}, {r['volumen_l']}, {r['densidad_g_cm3']}, {r['peso_g']}, {r['precio_compra']}, {r['costo_gramo']}, {r['velocidad_impresion_mm_h']})")
sql_lines.append(",\n".join(res_values) + ";\n")

# INSERTS: Maquinas
sql_lines.append("""-- DATOS MAESTROS: MAQUINARIA
INSERT INTO maquinas (nombre, tipo, consumo_kwh, costo_minuto, estado) VALUES""")
maq_values = []
for m in maquinas:
    maq_values.append(f"({escape_sql(m['nombre'])}, {escape_sql(m['tipo'])}, {m['consumo_kwh']}, {m['costo_minuto']}, {escape_sql(m['estado'])})")
sql_lines.append(",\n".join(maq_values) + ";\n")

# INSERTS: Insumos
sql_lines.append("""-- DATOS MAESTROS: INSUMOS DE TALLER
INSERT INTO insumos (codigo_item, nombre, marca, categoria, cantidad_presentacion, costo_total, costo_unitario, enlace_compra) VALUES""")
ins_values = []
for i in insumos:
    ins_values.append(f"({i['codigo']}, {escape_sql(i['nombre'])}, {escape_sql(i['marca'])}, {escape_sql(i['categoria'])}, {i['presentacion']}, {i['costo_total']}, {i['costo_unitario']}, {escape_sql(i.get('enlace_compra'))})")
sql_lines.append(",\n".join(ins_values) + ";\n")

# INSERTS: Tarifas Personal
sql_lines.append("""-- DATOS MAESTROS: TARIFAS DE PERSONAL
INSERT INTO tarifas_personal (rol, costo_hora, costo_minuto) VALUES""")
per_values = []
for p in personal:
    per_values.append(f"({escape_sql(p['rol'])}, {p['costo_hora']}, {p['costo_minuto']})")
sql_lines.append(",\n".join(per_values) + ";\n")

# INSERTS: Clientes
sql_lines.append("""-- DATOS MAESTROS: CLIENTES HISTÓRICOS
INSERT INTO clientes (codigo, nombre, nit_cc, telefono, correo) VALUES""")
cli_values = []
for c in clientes:
    cli_values.append(f"({c['codigo']}, {escape_sql(c['nombre'])}, {escape_sql(c['nit_cc'])}, {escape_sql(c['telefono'])}, {escape_sql(c['correo'])})")
sql_lines.append(",\n".join(cli_values) + " ON CONFLICT (codigo) DO NOTHING;\n")

# INSERTS: Cotizaciones e Items
sql_lines.append("""-- ========================================================
-- HISTORIAL DE COTIZACIONES Y PIEZAS (72 Cotizaciones del Excel)
-- ========================================================
DO $$
DECLARE
  v_cli_id UUID;
  v_cot_id UUID;
BEGIN
""")

for cot in cotizaciones:
    cli = cot['cliente']
    cli_code = cli.get('codigo', 1)
    num_cot = cot['numero_cot']
    subt = cot['subtotal']
    tot = cot['total']
    estado = cot['estado']
    t_est = cot['tiempo_entrega_estimado']
    
    sql_lines.append(f"""
  -- Cotización {num_cot}
  SELECT id INTO v_cli_id FROM clientes WHERE codigo = {cli_code} LIMIT 1;
  INSERT INTO cotizaciones (numero_cot, cliente_id, vendedor_nombre, fecha, estado, subtotal, total, tiempo_entrega_estimado, notas)
  VALUES ({escape_sql(num_cot)}, v_cli_id, 'Equipo WJGEEKS', '2025-02-01', {escape_sql(estado)}, {subt}, {tot}, {escape_sql(t_est)}, 'Migrado desde WJGEEKS.xlsx')
  ON CONFLICT (numero_cot) DO UPDATE SET total = EXCLUDED.total
  RETURNING id INTO v_cot_id;
""")
    
    if cot['items']:
        sql_lines.append("  INSERT INTO cotizacion_items (cotizacion_id, nombre_item, cantidad, alto_mm, ancho_mm, profundidad_mm, volumen_cm3, peso_estimado_g, tiempo_impresion_min, tiempo_desarrollo_min, tiempo_armado_min, tiempo_pintura_min, costo_energia, costo_resina, costo_curado, costo_insumos, costo_mano_obra, costo_modelo_comprado, costo_base_produccion, margen_ganancia, precio_unitario, precio_total, descripcion_tecnica) VALUES")
        item_vals = []
        for it in cot['items']:
            item_vals.append(f"""    (v_cot_id, {escape_sql(it['nombre_item'])}, {it['cantidad']}, {it['alto_mm']}, {it['ancho_mm']}, {it['profundidad_mm']}, {it['volumen_cm3']}, {it['peso_estimado_g']}, {it['tiempo_impresion_min']}, {it['tiempo_desarrollo_min']}, {it['tiempo_armado_min']}, {it['tiempo_pintura_min']}, {it['costo_energia']}, {it['costo_resina']}, {it['costo_curado']}, {it['costo_insumos']}, {it['costo_mano_obra']}, {it['costo_modelo_comprado']}, {it['costo_base_produccion']}, {it['margen_ganancia']}, {it['precio_unitario']}, {it['precio_total']}, {escape_sql(it['descripcion_tecnica'])})""")
        sql_lines.append(",\n".join(item_vals) + ";\n")

sql_lines.append("END $$;\n")

final_sql = "\n".join(sql_lines)

with open('supabase_schema.sql', 'w', encoding='utf-8') as f:
    f.write(final_sql)

print(f"Generated supabase_schema.sql successfully! Total size: {len(final_sql):,} chars")
