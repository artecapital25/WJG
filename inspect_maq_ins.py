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

    def print_non_empty(sheet_name, max_r=50):
        for s in wb.findall('.//s:sheet', ns):
            if s.attrib['name'] == sheet_name:
                rId = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
                sheet_xml = ET.fromstring(z.read('xl/' + rel_map[rId]))
                print(f"\n================ SHEET: {sheet_name} ================")
                for r in sheet_xml.findall('.//s:row', ns)[:max_r]:
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
                        if (val and val.strip()) or f_text:
                            cells.append(f"{ref}: {val.strip()}{f_text}")
                    if cells:
                        print(f"R{r_num}: " + " | ".join(cells))

    print_non_empty('MAQUINARIA')
    print_non_empty('INSUMOS', 30)
