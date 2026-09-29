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

for s in wb.findall('.//s:sheet', ns):
    if s.attrib['name'] == 'COTIZACIONES':
        rId = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        sheet_xml = ET.fromstring(z.read('xl/' + rel_map[rId]))
        rows = sheet_xml.findall('.//s:row', ns)
        
        # Row 1 headers
        headers = {}
        for c in rows[0].findall('s:c', ns):
            t = c.attrib.get('t')
            v = c.find('s:v', ns)
            val = v.text if v is not None else ''
            if t == 's' and val: val = sst[int(val)]
            ref = ''.join([ch for ch in c.attrib.get('r') if ch.isalpha()])
            headers[ref] = val
        print("Headers in COTIZACIONES:")
        for k in sorted(headers.keys()):
            print(f"  {k}: {headers[k]}")
            
        print(f"\nTotal data rows: {len(rows)-1}")
        
        # Look at row 2 and 3
        for r_idx in [1, 2]:
            if r_idx < len(rows):
                r = rows[r_idx]
                data = {}
                for c in r.findall('s:c', ns):
                    t = c.attrib.get('t')
                    v = c.find('s:v', ns)
                    val = v.text if v is not None else ''
                    if t == 's' and val: val = sst[int(val)]
                    ref = ''.join([ch for ch in c.attrib.get('r') if ch.isalpha()])
                    data[ref] = val
                print(f"\nRow {r_idx+1}:")
                for k in sorted(data.keys()):
                    if data[k]:
                        print(f"  {headers.get(k, k)} ({k}): {data[k]}")
