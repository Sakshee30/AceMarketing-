set -euo pipefail
id aceqa >/dev/null 2>&1 || useradd -m -s /bin/bash aceqa
printf 'aceqa ALL=(root) NOPASSWD: ALL\n' >/etc/sudoers.d/aceqa
chmod 440 /etc/sudoers.d/aceqa
mkdir -p /home/aceqa/execution-20261003
cd /mnt/c/Users/anant/AceMarketing-
git -c safe.directory=/mnt/c/Users/anant/AceMarketing- archive HEAD | tar -x -C /home/aceqa/execution-20261003
cp frontend/src/customer-app/CustomerWorkspace.tsx /home/aceqa/execution-20261003/frontend/src/customer-app/CustomerWorkspace.tsx
cd /home/aceqa/execution-20261003
git init -q
git config user.email qa@example.test
git config user.name 'AceMarketing Local QA'
git add .
git commit -qm 'Local isolated qualification snapshot with workspace repairs'
git rev-parse HEAD >source-snapshot.txt
chown -R aceqa:aceqa /home/aceqa/execution-20261003
su - aceqa -c 'cd /home/aceqa/execution-20261003 && npm ci && npx playwright install --with-deps chromium firefox webkit' >/mnt/c/Users/anant/AceMarketing-/artifacts/linux-dependencies.log 2>&1