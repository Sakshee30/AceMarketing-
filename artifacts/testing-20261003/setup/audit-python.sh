set -euo pipefail
/root/.local/bin/uv venv --python /opt/ace-qa-python-runtime/bin/python3.13 /opt/ace-qa-audit
/root/.local/bin/uv pip install --python /opt/ace-qa-audit/bin/python pip-audit
python3 -c 'import json,pathlib; p=pathlib.Path("/home/aceqa/execution-20261003/artifacts/ml"); d=json.loads((p/"dependencies.json").read_text()); (p/"audit-requirements.txt").write_text("\n".join(n+"=="+v for n,v in d if n.lower()!="acemarketing-ml-service")+"\n")'
/opt/ace-qa-audit/bin/pip-audit --disable-pip --no-deps --progress-spinner off -r /home/aceqa/execution-20261003/artifacts/ml/audit-requirements.txt -f json -o /home/aceqa/execution-20261003/artifacts/ml/dependency-audit.json