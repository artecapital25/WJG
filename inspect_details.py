import zipfile
import xml.etree.ElementTree as ET

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

    def dump_sheet(sheet_name, max_rows=30, max_cols=25):
        for s in wb.findall('.//s:sheet', ns):
            if s.attrib['name'] == sheet_name:
                rId = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
                sheet_xml = ET.fromstring(z.read('xl/' + rel_map[rId]))
                print(f"\n================ SHEET: {sheet_name} ================")
                rows = sheet_xml.findall('.//s:row', ns)
                for r in rows[:max_rows]:
                    r_num = r.attrib.get('r')
                    cells = []
                    for c in r.findall('s:c', ns):
                        t = c.attrib.get('t')
                        v = c.find('s:v', ns)
                        f = c.find('s:f', ns)
                        val = v.text if v is not None else ''
                        if t == 's' and val:
                            val = shared_strings[int(val)]
                        f_text = f" [={f.text}]" if f is not None and f.text else ""
                        ref = c.attrib.get('r')
                        if val or f_text:
                            cells.append(f"{ref}: {val}{f_text}")
                    if cells:
                        print(f"Row {r_num}: " + " | ".join(cells[:max_cols]))

    dump_sheet('MAQUINARIA')
    dump_sheet('COTIZACIONES', max_rows=10)
    dump_sheet('FORMATO DE COT', max_rows=25)
    dump_sheet('FORMATO CC', max_rows=25)
    dump_sheet('MODULO COTIZACIONES', max_rows=25)
