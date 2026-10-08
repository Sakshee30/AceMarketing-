import pathlib,json,subprocess,hashlib,platform,sys
root=pathlib.Path('/home/aceqa/execution-20261003')
p=root/'artifacts/frontend-checks/results.json'
r=json.loads(p.read_text())
for s in r:
 s['candidate']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
 if s['name']=='frontend-architecture':s['evidence']='frontend-checks/architecture.log'
 if s['name']=='reuse-governance':s['evidence']='frontend-checks/reuse.log'
 assert (root/'artifacts'/s['evidence']).is_file()
p.write_text(json.dumps(r,indent=2))
import importlib.metadata as meta
runtime={'candidate':r[0]['candidate'],'node':subprocess.check_output(['node','--version'],text=True).strip(),'postgresql':subprocess.check_output(['/usr/lib/postgresql/18/bin/postgres','--version'],text=True).strip(),'qaPython':sys.version,'mlPython':subprocess.check_output(['/home/aceqa/ml-venv/bin/python','--version'],text=True).strip(),'platform':platform.platform(),'nodeLockSha256':hashlib.sha256((root/'package-lock.json').read_bytes()).hexdigest(),'mlRequirementsNote':'Resolved version manifest retained; source dependency ranges are not a frozen ML lockfile.'}
(root/'artifacts/runtime.json').write_text(json.dumps(runtime,indent=2))
mlcode='import importlib.metadata as m,json; print(json.dumps(sorted([(d.metadata["Name"],d.version) for d in m.distributions()])))'
(root/'artifacts/ml/dependencies.json').write_text(subprocess.check_output(['/home/aceqa/ml-venv/bin/python','-c',mlcode],text=True))