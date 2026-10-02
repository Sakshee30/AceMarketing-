#!/usr/bin/env bash
# Verification on disposable CI agents; deployed unit files are never rewritten.
set -euo pipefail
node_path=$(command -v node)
test -x "$node_path"
if [[ ! -e /usr/bin/node ]]; then
  [[ "${CI:-}" == true ]] || { echo '/usr/bin/node missing: install approved runtime first' >&2; exit 2; }
  sudo ln -s "$node_path" /usr/bin/node
fi
systemd-analyze verify deploy/systemd/*.service deploy/systemd/*.target
