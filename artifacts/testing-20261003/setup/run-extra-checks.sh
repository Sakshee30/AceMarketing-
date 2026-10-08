set -uo pipefail
cd /home/aceqa/execution-20261003
mkdir -p artifacts/frontend-checks
node scripts/frontend-architecture-check.mjs >artifacts/frontend-checks/architecture.log 2>&1
echo architecture:$?
node scripts/project-profile-check.mjs >artifacts/frontend-checks/project-profile.log 2>&1
echo project-profile:$?
node scripts/reuse-governance-check.mjs >artifacts/frontend-checks/reuse.log 2>&1
echo reuse:$?