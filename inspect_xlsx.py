import zipfile
import xml.etree.ElementTree as ET

ns = {
    's': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
}

with zipfile.ZipFile('WJGEEKS.xlsx', 'r') as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        sst_xml = z.read('xl/sharedStrings.xml')
        sst_root = ET.fromstring(sst_xml)
        for si in sst_root.findall('s:si', ns):
            text = ''.join([t.text or '' for t in si.findall('.//s:t', ns)])
            shared_strings.append(text)
    
    wb_rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rel_map = {r.attrib['Id']: r.attrib['Target'] for r in wb_rels}
    
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    for sheet in wb.findall('.//s:sheet', ns):
        name = sheet.attrib['name']
        rId = sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        target = 'xl/' + rel_map[rId]
        sheet_xml = ET.fromstring(z.read(target))
        
        rows = sheet_xml.findall('.//s:row', ns)
        print(f"\n================ Sheet: {name} (Rows: {len(rows)}) ================")
        for row in rows[:6]:
            row_vals = []
            for c in row.findall('s:c', ns):
                t = c.attrib.get('t')
                v = c.find('s:v', ns)
                val = v.text if v is not None else ''
                if t == 's' and val:
                    val = shared_strings[int(val)]
                cell_ref = c.attrib.get('r', '')
                if val:
                    row_vals.append(f"{cell_ref}: {val}")
            if row_vals:
                print("  " + " | ".join(row_vals[:10]))
