from pathlib import Path
import xml.etree.ElementTree as E
root=Path('/home/aceqa/execution-20261003/artifacts')
for rel in ['prelive/native.junit.xml','prelive/oracles.junit.xml','prelive/api.junit.xml','ml/tests.junit.xml']:
 p=root/rel
 try:
  c=E.parse(p).findall('.//testcase');print(rel,len(c),sum(x.find('failure') is not None or x.find('error') is not None for x in c),sum(x.find('skipped') is not None for x in c))
 except E.ParseError:print(rel,'running')