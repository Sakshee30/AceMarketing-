#!/usr/bin/env python3
"""One-time reviewed application repair. Workflow restoration uses the repository connector, not CI credentials."""
import hashlib,os,subprocess
from pathlib import Path
BRANCH='qa/prelive-qualification-20261003'
BEFORE={'backend/src/connector-ingestion.mjs': 'c48fb680130153fc6807ed1d7bd4c1e990f7e4156c30d30ddedcf655240acba8', 'qa/run.py': '15fdced6ea38838d692cc95ad5bd688734a620fe06fb09721b4c80356ba86fa2', 'qa/write_case_status.py': '6b59d5af5ee8a6a5e969ee0ab0f8fc251a473b74932290b77221ada0112d82d5'}
AFTER={'backend/src/connector-ingestion.mjs': '4374d2f42e7ed3c4d1e460af44910a27a469de57a7b2d59a216dc4d184513f5a', 'qa/run.py': '91c122eb6c0a97ef0fc6d2618044171969e6272da83320fa47ea71e7093d6d70', 'qa/write_case_status.py': '06a03160d2399844553f5cf64a71d5e1572881a9639824f8ed33198e4d4ef312'}
PATCH_SHA='79261af6ebb2e3f1d6184677ee457aa7a13e2726ff4150704142dcd8b70331ca'
def run(*args):subprocess.run(args,check=True)
def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def main():
    if os.environ.get('GITHUB_REF_NAME')!=BRANCH:raise RuntimeError('Refusing non-QA branch')
    run('git','diff','--exit-code');run('git','diff','--cached','--exit-code')
    if all(digest(path)==expected for path,expected in AFTER.items()):
        print('Reviewed source repairs already present.');return
    if digest('qa/reviewed-changes.patch')!=PATCH_SHA:raise RuntimeError('Patch integrity mismatch')
    for path,expected in BEFORE.items():
        if digest(path)!=expected:raise RuntimeError('Unexpected base content: '+path)
    run('git','apply','--check','qa/reviewed-changes.patch');run('git','apply','qa/reviewed-changes.patch')
    for path,expected in AFTER.items():
        if digest(path)!=expected:raise RuntimeError('Unexpected patched content: '+path)
    run('git','rm','qa/reviewed-changes.patch')
    run('git','add',*AFTER.keys());run('git','diff','--cached','--check')
    run('git','-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','fix: bound connector reads and execute full functional data integration')
    run('git','push','origin','HEAD:refs/heads/'+BRANCH)
if __name__=='__main__':main()
