import zipfile
import xml.etree.ElementTree as ET

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

def peek_sheet(name, n=10):
    for s in wb.findall('.//s:sheet', ns):
        if s.attrib['name'] == name:
            rId = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            sheet_xml = ET.fromstring(z.read('xl/' + rel_map[rId]))
            rows = []
            for r in sheet_xml.findall('.//s:row', ns)[:n]:
                cells = []
                for c in r.findall('s:c', ns):
                    t = c.attrib.get('t')
                    v = c.find('s:v', ns)
                    val = v.text if v is not None else ''
                    if t == 's' and val:
                        val = sst[int(val)]
                    cells.append(f"{c.attrib.get('r')}: {val}")
                rows.append(', '.join(cells[:8]))
            print(f"=== {name} ({len(sheet_xml.findall('.//s:row', ns))} rows total) ===")
            for row in rows:
                print(row)

peek_sheet('COTIZACIONES', 6)
peek_sheet('Ventas', 6)
peek_sheet('Detalle_Ventas', 6)
peek_sheet('FORMATO DE COT', 15)
