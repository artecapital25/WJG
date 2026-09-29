import zipfile
import xml.etree.ElementTree as ET
import json
import re

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

def parse_cotizaciones():
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
                
            print(f"Total valid cotizaciones grouped: {len(cot_groups)}")
            for num, items in list(sorted(cot_groups.items()))[:10]:
                cli = items[0].get('Cliente', '')
                tot = sum(float(it.get('Valor total', 0) or 0) for it in items)
                print(f"  Cot {num}: {len(items)} items | Cliente: {cli} | Total: ${tot:,.0f}")

parse_cotizaciones()
