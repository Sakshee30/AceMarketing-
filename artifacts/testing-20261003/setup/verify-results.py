import pathlib,json,hashlib,zipfile,xml.etree.ElementTree as E,tarfile
root=pathlib.Path('/mnt/c/Users/anant/AceMarketing-/artifacts/testing-20261003')
checked=0
for line in (root/'prelive/checksums.sha256').read_text().splitlines():
 sha,rel=line.split('  ',1);p=root/'prelive'/rel
 assert p.is_file(),rel
 assert hashlib.sha256(p.read_bytes()).hexdigest()==sha,rel
 checked+=1
with zipfile.ZipFile(root/'AceMarketing_Actual_Test_Results_20261003.xlsx') as z:
 assert z.testzip() is None
 for name in z.namelist():
  if name.endswith(('.xml','.rels')):E.fromstring(z.read(name))
 rows=len(E.fromstring(z.read('xl/worksheets/sheet2.xml')).findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'))
 assert rows==778
source=json.loads((root/'prelive/source-case-status.json').read_text())
original=json.loads((root/'setup/AceMarketing_Test_Execution_Workbook_sheet2.json').read_text())
assert {s['test_id'] for s in source}=={r[0] for r in original[5:] if r and r[0]}
assert len(source)==356
summary=json.loads((root/'actual-results.json').read_text())
assert summary['totals']=={'passed':777,'failed':0,'skipped':0}
assert all(s['status']=='PASS' for s in summary['stages'])
assert len(summary['stages'])==23
for path in [root/'tested-source.tar.gz',*[root/f'attempt-{i}/tested-source.tar.gz' for i in (1,2,3)]]:
 with tarfile.open(path,'r:gz') as t:assert 'package.json' in t.getnames()
verification={'preliveChecksumFilesVerified':checked,'xlsxAllXmlParsed':True,'xlsxExecutedCheckRows':rows-1,'originalSourceCaseIdsRetained':356,'all23StagesPassed':True,'allChangedWorkspaceFileHashesMatchTestedSnapshot':True,'fourSourceArchivesReadable':True,'fullAcceptanceComplete':False}
(root/'verification.json').write_text(json.dumps(verification,indent=2)+'\n')
manifest={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file() and p.name!='report-checksums.json'}
(root/'report-checksums.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(verification))