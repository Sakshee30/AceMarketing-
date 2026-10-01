# Docker-free production deployment with systemd

The committed systemd topology is the production-grade alternative to Docker Compose. It uses the same Node/Python entry points, migrations, preflight checks, deployment modes, health endpoints and environment variables.

## Host layout

Recommended layout:

```text
/opt/acemarketing/
  releases/
    <release-a>/
    <release-b>/
  current -> /opt/acemarketing/releases/<active>
  previous -> /opt/acemarketing/releases/<previous>
  venv/                         # only when local ML is enabled
  backups/

/etc/acemarketing/
  acemarketing.env
```

Create a dedicated account:

```bash
sudo useradd --system --home /opt/acemarketing --shell /usr/sbin/nologin acemarketing
sudo install -d -o acemarketing -g acemarketing /opt/acemarketing/releases /opt/acemarketing/backups
sudo install -d -o acemarketing -g acemarketing /var/lib/acemarketing /var/lib/acemarketing/ml-artifacts
sudo install -d -m 0750 /etc/acemarketing
```

Do not put production secrets in the release directory. Store them in `/etc/acemarketing/acemarketing.env` with mode `0600`.

## Install units

```bash
sudo cp deploy/systemd/acemarketing-*.service /etc/systemd/system/
sudo cp deploy/systemd/acemarketing-*.target /etc/systemd/system/
sudo systemctl daemon-reload
```

## Prepare a release

Each release directory must be immutable after activation.

```bash
cd /opt/acemarketing/releases/<release>
npm ci --omit=dev
npm ci
npm run build:frontend
npm run build:platform-admin   # standard/full only
```

For a full local-ML deployment, set the internal endpoints in `/etc/acemarketing/acemarketing.env`:

```env
ACE_DEPLOYMENT_MODE=full
ML_SERVICE_URL=http://127.0.0.1:8000
ML_FORECAST_SERVICE_URL=http://127.0.0.1:8000
ML_CAUSAL_SERVICE_URL=http://127.0.0.1:8000
ML_MMM_SERVICE_URL=http://127.0.0.1:8000
ML_ARTIFACT_DIR=/var/lib/acemarketing/ml-artifacts
```

Then install the Python environment:

```bash
python3 -m venv /opt/acemarketing/venv
/opt/acemarketing/venv/bin/pip install -e "ml-service[forecasting,causal,mmm,objectstore]"
```

Run the repository doctor before activation:

```bash
ACE_DEPLOYMENT_MODE=core node scripts/doctor.mjs
```

## Atomic activation

From any checked-out AceMarketing release:

```bash
DATABASE_URL=... node scripts/local-release.mjs activate /opt/acemarketing/releases/<release> \
  --root=/opt/acemarketing
```

The command:

1. validates the release layout,
2. compares the release migration head with the live database,
3. records the old `current` target as `previous`,
4. atomically switches the `current` symlink.

Then start/restart the appropriate target:

```bash
sudo systemctl restart acemarketing-core.target
# or
sudo systemctl restart acemarketing-standard.target
# or
sudo systemctl restart acemarketing-full.target
```

Use `--restart=true --target=acemarketing-core.target` when the operator invoking the script has permission to restart systemd.

## Targets

- `acemarketing-core.target`: migrations, preflight, API, durable worker, main web.
- `acemarketing-standard.target`: core plus control API and control UI.
- `acemarketing-full.target`: standard plus local ML service.

The environment variable `ACE_DEPLOYMENT_MODE` must match the target used.

## Health

```bash
curl -fsS http://127.0.0.1:3001/healthz
curl -fsS http://127.0.0.1:3001/readyz
curl -fsS http://127.0.0.1:8080/healthz
```

Use an external reverse proxy/load balancer for TLS.

## Rollback

```bash
DATABASE_URL=... node scripts/local-release.mjs rollback \
  --root=/opt/acemarketing \
  --restart=true \
  --target=acemarketing-core.target
```

Rollback changes the application version only. Database migrations are forward-only by default. If the current database migration head is newer than the selected application release, the command refuses the switch unless an operator has verified forward-schema compatibility and explicitly sets `ROLLBACK_ALLOW_NEWER_SCHEMA=YES`.

## Service hardening

The units use:

- a dedicated non-login user,
- `NoNewPrivileges=true`,
- private `/tmp`,
- protected home/system paths,
- bounded stop time,
- restart-on-failure,
- elevated file-descriptor limits.

Do not weaken these settings merely to enable an optional feature; give that feature an explicit writable path instead.
