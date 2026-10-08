set -euo pipefail
cd /home/aceqa/execution-20261003
mkdir -p artifacts/attempt-3
cp -a artifacts/prelive artifacts/qualification-console.log artifacts/tested-source.tar.gz artifacts/attempt-3/
for f in ml-service/pyproject.toml qa/summarize-local.py qa/restore-api.mjs qa/tests/full-ingress.test.mjs; do cp /mnt/c/Users/anant/AceMarketing-/$f $f; done
git add ml-service/pyproject.toml qa/summarize-local.py qa/restore-api.mjs qa/tests/full-ingress.test.mjs
git commit -qm 'Patch vulnerable pytest dependency and reconcile restored full-volume bounded lead reads'
git archive HEAD | gzip >artifacts/tested-source.tar.gz
bash qa/run-isolated.sh >artifacts/qualification-console.log 2>&1