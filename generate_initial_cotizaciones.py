import zipfile
import xml.etree.ElementTree as ET
import json
import re
import uuid

z = zipfile.ZipFile('WJGEEKS.xlsx')
sst = []
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
if 'xl/sharedStrings.xml' in z.namelist():
    root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in root.findall('s:si', ns):
        sst.append(''.join([t.text or '' for t in si.findall('.//s:t', ns)]))

wb_rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
rel_map = {r.attrib['Id']: r.attrib['Target'] for r in wb_rels}
wb = ET.fromstring(z.read('xl/workbook.xml'))

# Read initial data from initialData.ts
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

client_by_name = {c['nombre'].strip().lower(): c for c in clientes}
client_by_code = {c['codigo']: c for c in clientes}

# Parse COTIZACIONES sheet
for s in wb.findall('.//s:sheet', ns):
    if s.attrib['name'] == 'COTIZACIONES':
        rId = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        sheet_xml = ET.fromstring(z.read('xl/' + rel_map[rId]))
        rows = sheet_xml.findall('.//s:row', ns)
        
        headers = {}
        for c in rows[0].findall('s:c', ns):
            t = c.attrib.get('t')
            v = c.find('s:v', ns)
            val = v.text if v is not None else ''
            if t == 's' and val: val = sst[int(val)]
            ref = ''.join([ch for ch in c.attrib.get('r') if ch.isalpha()])
            headers[ref] = val
            
        cot_groups = {}
        
        for r in rows[1:]:
            row = {}
            for c in r.findall('s:c', ns):
                t = c.attrib.get('t')
                v = c.find('s:v', ns)
                val = v.text if v is not None else ''
                if t == 's' and val: val = sst[int(val)]
                ref = ''.join([ch for ch in c.attrib.get('r') if ch.isalpha()])
                row[headers.get(ref, ref)] = val
                
            num_cot = str(row.get('Numero de cot', '')).strip()
            if not num_cot or num_cot == '-' or not re.match(r'^\d{2}-\d{3}$', num_cot):
                continue
                
            if num_cot not in cot_groups:
                cot_groups[num_cot] = []
            cot_groups[num_cot].append(row)

print(f"Total Cotizaciones to migrate: {len(cot_groups)}")

# Map to Cotizacion objects
cotizaciones_list = []
item_count = 0

for num_cot in sorted(cot_groups.keys()):
    raw_items = cot_groups[num_cot]
    first_item = raw_items[0]
    
    # Resolve client
    cli_name = str(first_item.get('Cliente', '')).strip()
    cli_code_raw = first_item.get('Codigo cliente', '')
    try:
        cli_code = int(float(cli_code_raw))
    except:
        cli_code = 0
        
    client_obj = client_by_code.get(cli_code) or client_by_name.get(cli_name.lower())
    if not client_obj:
        client_obj = {
            'id': f"cli-{len(clientes)+1}",
            'codigo': cli_code if cli_code > 0 else len(clientes)+1,
            'nombre': cli_name if cli_name else 'Cliente General',
            'nit_cc': '',
            'telefono': '3217273025',
            'correo': 'ventas@wjgeeks.com'
        }
        clientes.append(client_obj)
        client_by_name[client_obj['nombre'].strip().lower()] = client_obj
        client_by_code[client_obj['codigo']] = client_obj
        
    parsed_items = []
    subtotal = 0.0
    
    for idx, raw in enumerate(raw_items):
        item_count += 1
        item_name = str(raw.get('item', '')).strip() or f"Pieza {idx+1}"
        cant = int(float(raw.get('Cantidad de piezas', 1) or 1))
        alto = float(raw.get('Alto de la pieza (mm)', 50) or 50)
        ancho = float(raw.get('Ancho de la pieza (mm)', 50) or 50)
        prof = float(raw.get('profundidad de la pieza (mm)', 50) or 50)
        vol = float(raw.get('Volumen de la pieza (cm3)', 0) or 0)
        peso = float(raw.get('Peso (g)', 0) or 0)
        
        t_imp = float(raw.get('Tiempo de impresion (min)', 0) or 0)
        t_des = float(raw.get('Tiempo de desarrollo (min)', 0) or 0)
        t_arm = float(raw.get('Tiempo de armado (min)', 0) or 0)
        t_pin = float(raw.get('Tiempo de pintura (min)', 0) or 0)
        
        cost_ene = float(raw.get('Costo aprox energia', 0) or 0)
        cost_res = float(raw.get('Valor aprox Resina', 0) or 0)
        cost_cur = float(raw.get('Valor curado', 0) or 0)
        
        # Insumos total
        cost_ins = (float(raw.get('Valor insumos curado', 0) or 0) + 
                    float(raw.get('Valor insumos Joyas', 0) or 0) + 
                    float(raw.get('Valor insumo Pintura', 0) or 0))
                    
        # Mano de obra total
        cost_mo = (float(raw.get('Valor Desarrollo', 0) or 0) + 
                   float(raw.get('Valor Armado', 0) or 0) + 
                   float(raw.get('Valor pintor', 0) or 0))
                   
        cost_mod = float(raw.get('Valor modelo Comprado', 0) or 0)
        cost_base = float(raw.get('Valor pieza', 0) or 0)
        margen = float(raw.get('Porcentaje de ganancia', 0.4) or 0.4)
        precio_u = float(raw.get('Valor unidad', 0) or 0)
        precio_t = float(raw.get('Valor total', 0) or 0)
        
        if precio_t == 0 and precio_u > 0:
            precio_t = precio_u * cant
        subtotal += precio_t
        
        resina_str = str(raw.get('Tipo de resina', '')).replace('\n', ' ').strip() or 'Resina Standar Negro'
        maquina_str = str(raw.get('Maquina', '')).strip() or 'Anycubic MONO 4'
        t_entrega = str(raw.get('Tiempo de entrega ', '')).strip() or '(3) a (7) Dias habiles'
        desc = str(raw.get('Descripcion', '')).strip()
        
        parsed_items.append({
            'id': f"item-{num_cot}-{idx+1}",
            'nombre_item': item_name,
            'cantidad': cant,
            'alto_mm': alto,
            'ancho_mm': ancho,
            'profundidad_mm': prof,
            'volumen_cm3': vol,
            'peso_estimado_g': peso,
            'resina_id': 'res-1',
            'resina_nombre': resina_str,
            'maquina_id': 'maq-1',
            'maquina_nombre': maquina_str,
            'tiempo_impresion_min': t_imp,
            'tiempo_desarrollo_min': t_des,
            'tiempo_armado_min': t_arm,
            'tiempo_pintura_min': t_pin,
            'costo_energia': round(cost_ene, 2),
            'costo_resina': round(cost_res, 2),
            'costo_curado': round(cost_cur, 2),
            'costo_insumos': round(cost_ins, 2),
            'costo_mano_obra': round(cost_mo, 2),
            'costo_modelo_comprado': round(cost_mod, 2),
            'costo_base_produccion': round(cost_base, 2),
            'margen_ganancia': margen,
            'precio_unitario': round(precio_u, 2),
            'precio_total': round(precio_t, 2),
            'tiempo_entrega': t_entrega,
            'descripcion_tecnica': desc
        })
        
    cotizaciones_list.append({
        'id': f"cot-{num_cot}",
        'numero_cot': num_cot,
        'cliente': client_obj,
        'vendedor': 'Equipo WJGEEKS',
        'fecha': '2025-02-01', # Base historical date
        'estado': 'Facturada' if int(num_cot.split('-')[1]) < 70 else 'Enviada',
        'items': parsed_items,
        'subtotal': round(subtotal, 2),
        'iva_porcentaje': 0,
        'descuento_porcentaje': 0,
        'total': round(subtotal, 2),
        'tiempo_entrega_estimado': parsed_items[0]['tiempo_entrega'] if parsed_items else '(3) Días hábiles',
        'notas': 'Cotización registrada desde libro contable y de producción WJGEEKS.xlsx'
    })

print(f"Generated {len(cotizaciones_list)} Cotizaciones with {item_count} items total.")

# 1. Output src/data/initialCotizaciones.ts
ts_cotizaciones = f'''import {{ Cotizacion }} from '../types';

export const COTIZACIONES_INICIALES: Cotizacion[] = {json.dumps(cotizaciones_list, indent=2, ensure_ascii=False)};
'''

with open('src/data/initialCotizaciones.ts', 'w', encoding='utf-8') as f:
    f.write(ts_cotizaciones)

print("Saved src/data/initialCotizaciones.ts successfully!")
