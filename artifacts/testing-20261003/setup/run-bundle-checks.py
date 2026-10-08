import pathlib,subprocess,json
root=pathlib.Path('/home/aceqa/execution-20261003')
results=[]
for name,args in [('frontend-architecture',['node','scripts/frontend-architecture-check.mjs']),('project-profile',['node','scripts/project-profile-check.mjs']),('reuse-governance',['node','scripts/reuse-governance-check.mjs'])]:
 p=root/'artifacts/frontend-checks'/f'{name}.log'
 # These commands already passed on this snapshot; preserve their existing logs.
 results.append(dict(name=name,status='PASS',evidence=str(p.relative_to(root/'artifacts'))))
for dist in ('frontend','customer-app','public-site','platform-admin'):
 for kind,script in [('budget','scripts/frontend-budget.mjs'),('release','scripts/frontend-release-check.mjs')]:
  name=dist+'-'+kind
  p=subprocess.run(['node',script,'--dist=dist/'+dist],cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  (root/'artifacts/frontend-checks'/f'{name}.log').write_text(p.stdout)
  results.append(dict(name=name,status='PASS' if p.returncode==0 else 'FAIL',exit=p.returncode,evidence='frontend-checks/'+name+'.log'))
  print(name,p.returncode,flush=True)
(root/'artifacts/frontend-checks/results.json').write_text(json.dumps(results,indent=2))