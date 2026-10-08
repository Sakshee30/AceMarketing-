set -uo pipefail
cd /home/aceqa/execution-20261003
export PATH=/home/aceqa/ml-venv/bin:$PATH
mkdir -p artifacts/ml
ruff check ml-service/src ml-service/tests >artifacts/ml/lint.log 2>&1; echo lint:$?
ruff format --check ml-service/src ml-service/tests >artifacts/ml/format.log 2>&1; echo format:$?
mypy --config-file ml-service/pyproject.toml ml-service/src/acemarketing_ml >artifacts/ml/types.log 2>&1; echo types:$?
python -m compileall -q ml-service/src; echo compile:$?
uid=$(id -u); gid=$(id -g)
sudo env -i PATH="$PATH" HOME="$HOME" QA_UID="$uid" QA_GID="$gid" unshare --net bash -c 'ip link set lo up; exec setpriv --reuid="$QA_UID" --regid="$QA_GID" --init-groups env -i PATH="$PATH" HOME="$HOME" CI=true pytest -q -rs ml-service/tests --junitxml=artifacts/ml/tests.junit.xml' >artifacts/ml/pytest.log 2>&1
echo pytest:$?