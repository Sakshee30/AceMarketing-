set -euo pipefail
cd /home/aceqa/execution-20261003
mkdir -p artifacts/attempt-1
cp -a artifacts/prelive artifacts/qualification-console.log artifacts/attempt-1/
for f in .gitignore frontend/src/customer-app/CustomerWorkspace.tsx backend/src/connector-ingestion.mjs backend/tests/connector-pagination.test.mjs backend/tests/functional-volume.test.mjs qa/browser/identity.spec.ts qa/materialize-functional.py qa/summarize-local.py qa/IMPLEMENTATION.md; do cp /mnt/c/Users/anant/AceMarketing-/$f $f; done
git add .gitignore frontend/src/customer-app/CustomerWorkspace.tsx backend/src/connector-ingestion.mjs backend/tests/connector-pagination.test.mjs backend/tests/functional-volume.test.mjs qa/browser/identity.spec.ts qa/materialize-functional.py qa/summarize-local.py qa/IMPLEMENTATION.md
git commit -qm 'Qualify authenticated workspace metadata and full D2 connector data with strict envelopes'
git archive HEAD | gzip >artifacts/tested-source.tar.gz
bash qa/run-isolated.sh >artifacts/qualification-console.log 2>&1