import zipfile
import xml.etree.ElementTree as ET
import json

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
        
        headers = {}
        for c in rows[0].findall('s:c', ns):
            t = c.attrib.get('t')
            v = c.find('s:v', ns)
            val = v.text if v is not None else ''
            if t == 's' and val: val = sst[int(val)]
            ref = ''.join([ch for ch in c.attrib.get('r') if ch.isalpha()])
            headers[ref] = val
            
        all_data = []
        for r in rows[1:]:
            row_data = {}
            for c in r.findall('s:c', ns):
                t = c.attrib.get('t')
                v = c.find('s:v', ns)
                val = v.text if v is not None else ''
                if t == 's' and val: val = sst[int(val)]
                ref = ''.join([ch for ch in c.attrib.get('r') if ch.isalpha()])
                row_data[headers.get(ref, ref)] = val
            if row_data.get('Numero de cot', '').strip() and row_data.get('Numero de cot', '').strip() != '-':
                all_data.append(row_data)
                
        print(f"Loaded {len(all_data)} valid rows.")
        if all_data:
            print("First row keys & sample:")
            sample = all_data[0]
            for k, v in list(sample.items())[:20]:
                print(f"  {k}: {v}")
