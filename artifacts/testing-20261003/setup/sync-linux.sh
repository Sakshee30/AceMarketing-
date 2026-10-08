set -euo pipefail
cp -a /root/.local/share/uv/python/cpython-3.13-linux-x86_64-gnu /opt/ace-qa-python
ln -sf /opt/ace-qa-python/bin/python3.13 /home/aceqa/ml-venv/bin/python
cd /home/aceqa/execution-20261003
for f in frontend/src/customer-app/CustomerWorkspace.tsx qa/browser/identity.spec.ts qa/materialize-functional.py backend/tests/functional-volume.test.mjs; do cp /mnt/c/Users/anant/AceMarketing-/$f $f; done
chown -R aceqa:aceqa .