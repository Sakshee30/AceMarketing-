set -euo pipefail
mkdir -p /opt/ace-qa-node
cd /opt/ace-qa-node
curl -fsSLO https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz
curl -fsSLO https://nodejs.org/dist/v24.21.0/SHASUMS256.txt
sha256sum --check --ignore-missing SHASUMS256.txt
tar -xf node-v24.21.0-linux-x64.tar.xz --strip-components=1
ln -sf /opt/ace-qa-node/bin/node /usr/local/bin/node
ln -sf /opt/ace-qa-node/bin/npm /usr/local/bin/npm
ln -sf /opt/ace-qa-node/bin/npx /usr/local/bin/npx