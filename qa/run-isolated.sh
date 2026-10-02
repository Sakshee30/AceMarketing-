#!/usr/bin/env bash
# Only the network namespace contains the application, its database, and its tests.
# Dependency/browser installation happens beforehand, without application secrets.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "${1:-}" == '--inside' ]]; then
  [[ "${QA_ISOLATED:-}" == 1 ]] || { echo 'Missing isolation marker' >&2; exit 2; }
  exec python3 qa/run.py
fi
command -v node >/dev/null
command -v sudo >/dev/null
command -v unshare >/dev/null
command -v setpriv >/dev/null
[[ -d node_modules ]] || { echo 'Run npm ci before isolated execution' >&2; exit 2; }
uid=$(id -u); gid=$(id -g)
[[ "$uid" != 0 ]] || { echo 'Run as an unprivileged dedicated QA user' >&2; exit 2; }
# No caller application/provider/database credentials are inherited.
exec sudo env -i PATH="$PATH" HOME="$HOME" QA_UID="$uid" QA_GID="$gid" \
  unshare --net bash -c '
    set -euo pipefail
    ip link set lo up
    exec setpriv --reuid="$QA_UID" --regid="$QA_GID" --init-groups \
      env -i PATH="$PATH" HOME="$HOME" QA_ISOLATED=1 CI=true \
      bash qa/run-isolated.sh --inside
  '
