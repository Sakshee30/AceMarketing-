import pathlib,zipfile,xml.etree.ElementTree as E,json
root=pathlib.Path('/mnt/c/Users/anant/Downloads')
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
for p in sorted(root.glob('AceMarketing_*')):
 if p.suffix not in ('.docx','.xlsx'):continue
 with zipfile.ZipFile(p) as z:
  print('\nFILE:',p.name)
  if p.suffix=='.docx':
   doc=E.fromstring(z.read('word/document.xml'))
   lines=[''.join(x.itertext()) for x in doc.findall('.//w:t',ns)]
   text='\n'.join(lines)
   pathlib.Path('/mnt/c/Users/anant/AceMarketing-/artifacts/'+p.stem+'.txt').write_text(text)
   print(text[:16000])
  else:
   strings=[]
   if 'xl/sharedStrings.xml' in z.namelist():strings=[''.join(si.itertext()) for si in E.fromstring(z.read('xl/sharedStrings.xml'))]
   print(z.read('xl/workbook.xml').decode()[:4000])
   for name in z.namelist():
    if name.startswith('xl/worksheets/sheet') and name.endswith('.xml'):
     rows=[]
     for r in E.fromstring(z.read(name)).findall('.//s:row',ns):
      cells=[]
      for c in r:
       v=c.find('s:v',ns)
       val=v.text if v is not None else ''.join(c.itertext())
       if c.attrib.get('t')=='s':val=strings[int(val)]
       cells.append(val)
      rows.append(cells)
     pathlib.Path('/mnt/c/Users/anant/AceMarketing-/artifacts/'+p.stem+'_'+pathlib.Path(name).stem+'.json').write_text(json.dumps(rows,indent=2))
     print(name,'rows',len(rows),'sample',rows[:2])