#!/usr/bin/env python3
"""Supporting smoke tests never grant release authority."""
import argparse,gzip,hashlib,json,pathlib,re,sys

def evaluate(plan,cases,root,candidate):
    errors=[];root=pathlib.Path(root).resolve();expected={r['test_id'] for r in plan};seen=set()
    if not isinstance(candidate,str) or not re.fullmatch(r'[a-f0-9]{40}',candidate):errors.append('Exact 40-character candidate SHA required')
    for case in cases:
        ident=case.get('test_id')
        if ident in seen:errors.append(f'Duplicate case: {ident}')
        seen.add(ident)
        if ident not in expected:errors.append(f'Unknown case: {ident}')
        if case.get('candidate')!=candidate:errors.append(f'{ident}: candidate mismatch')
        status=case.get('status')
        if status=='NOT APPLICABLE':
            if not case.get('approved_by') or not case.get('reason'):errors.append(f'{ident}: unapproved exclusion')
        elif status!='PASS':errors.append(f'{ident}: {status or "missing status"}')
        if not case.get('scope_complete'):errors.append(f'{ident}: complete source acceptance criteria not verified')
        evidence=case.get('evidence',[])
        if not evidence:errors.append(f'{ident}: missing evidence')
        for item in evidence:
            try:
                path=(root/item['path']).resolve()
                if not path.is_relative_to(root):raise ValueError('evidence outside run root')
                if hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:raise ValueError('evidence checksum mismatch')
            except (KeyError,OSError,ValueError) as exc:errors.append(f'{ident}: invalid evidence: {exc}')
    for ident in sorted(expected-seen):errors.append(f'{ident}: missing execution record')
    return {'candidate':candidate,'sourceScenarios':len(expected),'completeEvidence':not errors,'offlineQualified':False,'productionQualified':False,'errors':errors,'note':'Separate security, performance, provider-tier, human UAT and release approvals remain required even when case evidence is complete.'}

def main():
    p=argparse.ArgumentParser();p.add_argument('--plan',default='qa/fixtures/plan.json.gz');p.add_argument('--cases',required=True);p.add_argument('--root',required=True);p.add_argument('--candidate',required=True);p.add_argument('--out',required=True);a=p.parse_args()
    plan=json.loads(gzip.decompress(pathlib.Path(a.plan).read_bytes()));cases=json.loads(pathlib.Path(a.cases).read_text());result=evaluate(plan,cases,a.root,a.candidate)
    pathlib.Path(a.out).write_text(json.dumps(result,indent=2)+'\n');print(f"Evidence gate: {'PASS' if result['completeEvidence'] else 'BLOCKED'}; {len(result['errors'])} issues")
    return 0 if result['completeEvidence'] else 2
if __name__=='__main__':sys.exit(main())
