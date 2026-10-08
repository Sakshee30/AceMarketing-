set -euo pipefail
curl -LsSf https://astral.sh/uv/install.sh | sh
/root/.local/bin/uv python install 3.13
/root/.local/bin/uv venv --python 3.13 /home/aceqa/ml-venv
/root/.local/bin/uv pip install --python /home/aceqa/ml-venv/bin/python -e '/home/aceqa/execution-20261003/ml-service[test]'
chown -R aceqa:aceqa /home/aceqa/ml-venv /root/.local/share/uv/python