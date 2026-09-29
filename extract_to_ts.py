import zipfile
import xml.etree.ElementTree as ET
import json
import os

ns = {
    's': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
}

with zipfile.ZipFile('WJGEEKS.xlsx', 'r') as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        sst_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in sst_root.findall('s:si', ns):
            text = ''.join([t.text or '' for t in si.findall('.//s:t', ns)])
            shared_strings.append(text)
    
    wb_rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rel_map = {r.attrib['Id']: r.attrib['Target'] for r in wb_rels}
    wb = ET.fromstring(z.read('xl/workbook.xml'))

    def get_sheet_table(sheet_name):
        for s in wb.findall('.//s:sheet', ns):
            if s.attrib['name'] == sheet_name:
                rId = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
                sheet_xml = ET.fromstring(z.read('xl/' + rel_map[rId]))
                rows = []
                for r in sheet_xml.findall('.//s:row', ns):
                    cells = {}
                    for c in r.findall('s:c', ns):
                        t = c.attrib.get('t')
                        v = c.find('s:v', ns)
                        val = v.text if v is not None else ''
                        if t == 's' and val:
                            val = shared_strings[int(val)]
                        ref = c.attrib.get('r')
                        # strip digits to get col letters
                        col = ''.join([ch for ch in ref if ch.isalpha()])
                        cells[col] = val
                    rows.append(cells)
                return rows
        return []

    # 1. RESINAS
    resinas_raw = get_sheet_table('RESINAS')
    resinas = []
    for r in resinas_raw[1:]:
        tipo = r.get('A', '').strip()
        if not tipo or tipo == '0':
            continue
        marca = r.get('B', 'Anycubic').strip()
        color = r.get('C', '').strip()
        vol = float(r.get('D', '1.0') or 1.0)
        densidad = float(r.get('E', '1.13') or 1.13)
        peso = float(r.get('F', '1130') or 1130)
        valor = float(r.get('G', '89000') or 89000)
        valor_gramo = float(r.get('H', '78.76') or 78.76)
        velocidad = float(r.get('I', '20.0') or 20.0)
        resumen = r.get('J', f"{tipo} Color {color}").strip()
        
        resinas.append({
            "id": f"res-{len(resinas)+1}",
            "tipo": tipo,
            "marca": marca,
            "color": color,
            "volumen_l": vol,
            "densidad_g_cm3": densidad,
            "peso_g": peso,
            "precio_compra": valor,
            "costo_gramo": valor_gramo,
            "velocidad_impresion_mm_h": velocidad,
            "resumen": resumen
        })

    # 2. INSUMOS
    insumos_raw = get_sheet_table('INSUMOS')
    insumos = []
    for r in insumos_raw[1:]:
        item = r.get('B', '').strip()
        if not item or item == 'N/A':
            continue
        codigo = int(float(r.get('A', '0') or 0))
        marca = r.get('C', 'Genérico').strip()
        cat = r.get('D', 'General').strip()
        vol = float(r.get('E', '1') or 1)
        valor = float(r.get('F', '0') or 0)
        valor_und = float(r.get('G', '0') or 0)
        link = r.get('H', '').strip()
        desc = r.get('I', '').strip()

        insumos.append({
            "id": f"ins-{codigo}",
            "codigo": codigo,
            "nombre": item,
            "marca": marca,
            "categoria": cat,
            "presentacion": vol,
            "costo_total": valor,
            "costo_unitario": valor_und if valor_und > 0 else (valor/vol if vol>0 else 0),
            "enlace_compra": link,
            "descripcion": desc
        })

    # 3. MAQUINARIA
    maquinas = [
        {
            "id": "maq-1",
            "nombre": "Anycubic MONO 4",
            "tipo": "Impresora 3D Resina",
            "consumo_kwh": 0.45,
            "costo_minuto": 6.255,
            "estado": "Disponible"
        },
        {
            "id": "maq-2",
            "nombre": "Anycubic Wash y cure 3",
            "tipo": "Estación de Curado",
            "consumo_kwh": 0.36,
            "costo_minuto": 5.004,
            "estado": "Disponible"
        },
        {
            "id": "maq-3",
            "nombre": "Compresor Paasche S220R",
            "tipo": "Aerógrafo / Pintura",
            "consumo_kwh": 0.36,
            "costo_minuto": 5.004,
            "estado": "Disponible"
        }
    ]

    # 4. PERSONAL
    personal = [
        {"id": "per-1", "rol": "Desarrollador", "costo_hora": 10000, "costo_minuto": 166.67},
        {"id": "per-2", "rol": "Comercial", "costo_hora": 10000, "costo_minuto": 166.67},
        {"id": "per-3", "rol": "Pintor", "costo_hora": 10000, "costo_minuto": 166.67}
    ]

    # 5. CLIENTES (first 30 real clients + total count)
    clientes_raw = get_sheet_table('CLIENTE')
    clientes = []
    for r in clientes_raw[1:]:
        nombre = r.get('B', '').strip()
        if not nombre:
            continue
        try:
            codigo = int(float(r.get('A', '0') or 0))
        except:
            codigo = len(clientes) + 1
        nit = r.get('C', '').strip()
        tel = r.get('D', '').strip()
        # format tel cleanly
        if 'E9' in tel or 'e+' in tel.lower():
            try:
                tel = str(int(float(tel)))
            except:
                pass
        correo = r.get('E', '').strip()

        clientes.append({
            "id": f"cli-{codigo}",
            "codigo": codigo,
            "nombre": nombre,
            "nit_cc": nit,
            "telefono": tel,
            "correo": correo
        })

    # 6. CONFIGURACION
    configuracion = {
        "tarifa_kwh": 834.0,
        "margen_merma_resina": 1.4,
        "telefono_contacto": "3217273025",
        "telefono_contacto2": "3202796115",
        "instagram": "@WJGEEKS3D",
        "nequi": "3217273025",
        "daviplata": "3217273025",
        "bancolombia": "Ahorros 245-000123-98",
        "titular_cuenta": "WJGEEKS 3D"
    }

os.makedirs('src/data', exist_ok=True)

ts_content = f'''// Datos maestros extraídos directamente del libro de producción WJGEEKS.xlsx
// Contiene {len(clientes)} clientes, {len(resinas)} tipos de resina, {len(insumos)} insumos de taller y máquinas oficiales.

export interface Resina {{
  id: string;
  tipo: string;
  marca: string;
  color: string;
  volumen_l: number;
  densidad_g_cm3: number;
  peso_g: number;
  precio_compra: number;
  costo_gramo: number;
  velocidad_impresion_mm_h: number;
  resumen: string;
}}

export interface Insumo {{
  id: string;
  codigo: number;
  nombre: string;
  marca: string;
  categoria: string;
  presentacion: number;
  costo_total: number;
  costo_unitario: number;
  enlace_compra?: string;
  descripcion?: string;
}}

export interface Maquina {{
  id: string;
  nombre: string;
  tipo: string;
  consumo_kwh: number;
  costo_minuto: number;
  estado: string;
}}

export interface Personal {{
  id: string;
  rol: string;
  costo_hora: number;
  costo_minuto: number;
}}

export interface Cliente {{
  id: string;
  codigo: number;
  nombre: string;
  nit_cc: string;
  telefono: string;
  correo: string;
}}

export interface ConfiguracionTaller {{
  tarifa_kwh: number;
  margen_merma_resina: number;
  telefono_contacto: string;
  telefono_contacto2: string;
  instagram: string;
  nequi: string;
  daviplata: string;
  bancolombia: string;
  titular_cuenta: string;
}}

export const RESINAS_INICIALES: Resina[] = {json.dumps(resinas, indent=2, ensure_ascii=False)};

export const INSUMOS_INICIALES: Insumo[] = {json.dumps(insumos, indent=2, ensure_ascii=False)};

export const MAQUINAS_INICIALES: Maquina[] = {json.dumps(maquinas, indent=2, ensure_ascii=False)};

export const PERSONAL_INICIAL: Personal[] = {json.dumps(personal, indent=2, ensure_ascii=False)};

export const CLIENTES_INICIALES: Cliente[] = {json.dumps(clientes, indent=2, ensure_ascii=False)};

export const CONFIGURACION_INICIAL: ConfiguracionTaller = {json.dumps(configuracion, indent=2, ensure_ascii=False)};
'''

with open('src/data/initialData.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Extracted data successfully! {len(resinas)} resinas, {len(insumos)} insumos, {len(clientes)} clientes.")
