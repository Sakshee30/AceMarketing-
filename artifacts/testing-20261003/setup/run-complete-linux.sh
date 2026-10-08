set -euo pipefail
cd /home/aceqa/execution-20261003
mkdir -p artifacts/attempt-2
cp -a artifacts/prelive artifacts/qualification-console.log artifacts/attempt-2/
for f in qa/tests/full-ingress.test.mjs qa/run.py qa/write_case_status.py qa/browser/identity.spec.ts qa/summarize-local.py qa/IMPLEMENTATION.md; do cp /mnt/c/Users/anant/AceMarketing-/$f $f; done
git add qa/tests/full-ingress.test.mjs qa/run.py qa/write_case_status.py qa/browser/identity.spec.ts qa/summarize-local.py qa/IMPLEMENTATION.md
git commit -qm 'Verify full authenticated HTTP lead ingress and client-controlled workspace rotation'
git archive HEAD | gzip >artifacts/tested-source.tar.gz
bash qa/run-isolated.sh >artifacts/qualification-console.log 2>&1