import pathlib,json,shutil,subprocess,gzip,hashlib,re
src=pathlib.Path('/home/aceqa/execution-20261003')
out=pathlib.Path('/mnt/c/Users/anant/AceMarketing-/artifacts/testing-20261003')
workspace=pathlib.Path('/mnt/c/Users/anant/AceMarketing-')
baseline=subprocess.check_output(['git','-c','safe.directory='+str(workspace),'rev-parse','HEAD'],cwd=workspace,text=True).strip()
summary=json.loads((src/'artifacts/prelive/execution-summary.json').read_text())
assert all(s['status']=='PASS' for s in summary['executedStages'])
for n in (1,2,3):
 attempt=src/'artifacts'/f'attempt-{n}'
 sha=json.loads((attempt/'prelive/execution-summary.json').read_text())['candidate']
 assert re.fullmatch('[a-f0-9]{40}',sha)
 with gzip.open(attempt/'tested-source.tar.gz','wb') as f:
  f.write(subprocess.check_output(['git','archive',sha],cwd=src))
for name in ('prelive','ml','frontend-checks','attempt-1','attempt-2','attempt-3'):
 
 for p in (src/'artifacts'/name).rglob('*'):
  target=out/name/p.relative_to(src/'artifacts'/name)
  if p.is_dir():target.mkdir(parents=True,exist_ok=True)
  else:
   target.parent.mkdir(parents=True,exist_ok=True)
   shutil.copyfile(p,target)
for name in ('tested-source.tar.gz','qualification-console.log','runtime.json'):
 shutil.copyfile(src/'artifacts'/name,out/name)
raw=(out/'setup/dependency-audit-20261003.json').read_bytes()
node=json.loads(raw.decode('utf-16' if raw[:2] in (b'\xff\xfe',b'\xfe\xff') else 'utf-8-sig'))
(out/'node-dependency-audit.json').write_text(json.dumps(node,indent=2)+'\n')
before=json.loads((out/'ml/dependency-audit-before.json').read_text())
after=json.loads((out/'ml/dependency-audit.json').read_text())
old=[(d['name'],v['id']) for d in before['dependencies'] for v in d.get('vulns',[])]
new=[(d['name'],v['id']) for d in after['dependencies'] for v in d.get('vulns',[])]
assert not new
assert node['metadata']['vulnerabilities']['total']==0
(out/'security-audit-summary.json').write_text(json.dumps({'nodeKnownVulnerabilities':0,'pythonKnownVulnerabilitiesAfter':len(set(new)),'pythonRawFindingsBefore':len(old),'pythonUniqueFindingsBefore':len(set(old)),'fixedIssue':'CVE-2025-71176 in test dependency pytest 8.4.2','resolvedPytestVersion':'9.1.1','sourceRequirement':'pytest>=9.0.3,<10','primarySource':'https://pytest.org/en/stable/changelog.html#pytest-9-0-3-2026-04-07','boundary':'Known vulnerability database checks on resolved dependencies; not complete application security/privacy approval. Local application distribution is not a public third-party package.'},indent=2)+'\n')
files=json.loads((out/'setup/changed-files.json').read_text())
hashes={}
for rel in files:
 a=hashlib.sha256((workspace/rel).read_bytes()).hexdigest()
 b=hashlib.sha256((src/rel).read_bytes()).hexdigest()
 assert a==b,rel+' differs from tested snapshot'
 hashes[rel]=a
sourcefiles={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in pathlib.Path('/mnt/c/Users/anant/Downloads').glob('AceMarketing_*') if p.suffix in ('.md','.docx','.xlsx') and '(1)' not in p.name}
(out/'source-provenance.json').write_text(json.dumps({'originalWorkspaceBaseline':baseline,'branch':'qa/prelive-qualification-20261003','testedLocalSnapshot':summary['candidate'],'allChangedWorkspaceFilesMatchTestedSnapshot':True,'changedFilesSha256':hashes,'suppliedDocumentsSha256':sourcefiles,'note':'Snapshot commit was created in the isolated local checkout. Original workspace changes remain uncommitted; supplied documents remain unchanged.'},indent=2)+'\n')
subprocess.run(['python3',str(src/'qa/summarize-local.py'),str(out),'--baseline',baseline],check=True)