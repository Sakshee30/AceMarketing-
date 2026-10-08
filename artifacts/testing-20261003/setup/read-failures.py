import xml.etree.ElementTree as E,pathlib,json
p=pathlib.Path('/home/aceqa/execution-20261003/artifacts/prelive/native.junit.xml')
r=E.parse(p)
for c in r.findall('.//testcase'):
 for tag in ('failure','error','skipped'):
  f=c.find(tag)
  if f is not None:print(c.attrib.get('name'),tag,(f.text or '')[:3500])
p=pathlib.Path('/home/aceqa/execution-20261003/artifacts/prelive/functional-volume.json')
if p.exists():print(p.read_text())