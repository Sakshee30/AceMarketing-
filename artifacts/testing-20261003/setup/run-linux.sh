set -euo pipefail
cd /home/aceqa/execution-20261003
git add frontend/src/customer-app/CustomerWorkspace.tsx qa/browser/identity.spec.ts qa/materialize-functional.py backend/tests/functional-volume.test.mjs
git commit -qm 'Repair workspace metadata and expand isolated supplied-data qualification'
git rev-parse HEAD >source-snapshot.txt
bash qa/run-isolated.sh >artifacts/qualification-console.log 2>&1