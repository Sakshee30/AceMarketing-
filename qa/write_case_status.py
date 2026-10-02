#!/usr/bin/env python3
"""Retain all source acceptance cases; do not convert partial checks to acceptance PASS."""
import gzip,hashlib,json,pathlib,sys
from release_gate import evaluate
root=pathlib.Path(sys.argv[1]).resolve();candidate=sys.argv[2]
plan=json.loads(gzip.decompress(pathlib.Path('qa/fixtures/plan.json.gz').read_bytes()))
by_prefix={'BASE':['syntax.json','typecheck.log','production-bundle.log'],'AUTH':['api.junit.xml','browser.junit.xml','oracles.junit.xml'],'TEN':['api.junit.xml','oracles.junit.xml'],'WEB':['browser.junit.xml'],'UI':['browser.junit.xml'],'TRACK':['api.junit.xml','oracles.junit.xml'],'IDENT':['native.junit.xml'],'MET':['oracles.junit.xml','api.junit.xml'],'LEAD':['api.junit.xml','business-observations.json'],'FORM':['api.junit.xml'],'FLOW':['api.junit.xml'],'BOARD':['api.junit.xml'],'AI':['native.junit.xml','oracles.junit.xml'],'BILL':['native.junit.xml'],'COMMS':['native.junit.xml'],'JOBS':['api.junit.xml'],'CTRL':['native.junit.xml'],'SEC':['api.junit.xml','oracles.junit.xml'],'PRIV':['api.junit.xml'],'A11Y':['browser.junit.xml'],'DEP':['systemd.log'],'DR':['restore-reconciliation.json','restored-api.json']}
cases=[]
for source in plan:
    files=[]
    for name in by_prefix.get(source['test_id'].split('-')[0],[]):
        p=root/name
        if p.is_file():files.append({'path':name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    cases.append({**source,'candidate':candidate,'status':'NOT RUN','scope_complete':False,'evidence':files,'evidence_type':'supporting only; inspect report status and exact assertions','reason':'Complete source acceptance criteria have not been signed off. Supporting checks are not a full-scenario PASS.'})
(root/'source-case-status.json').write_text(json.dumps(cases,indent=2)+'\n')
(root/'release-evidence-gate.json').write_text(json.dumps(evaluate(plan,cases,root,candidate),indent=2)+'\n')
print(f'{len(cases)} source scenarios retained; no blanket acceptance pass granted.')
