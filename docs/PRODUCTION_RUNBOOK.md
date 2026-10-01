# Production Operations Runbook

## 1. Choose a deployment footprint

AceMarketing uses the same application code for `core`, `standard`, and `full` deployments. See `docs/DEPLOYMENT_MODES.md`.

For most first production deployments, start with:

```env
ACE_DEPLOYMENT_MODE=core
```

and enable optional features only when their credentials and operational dependencies are ready.

## 2. Configure

Copy:

```bash
cp backend/.env.example .env
```

Replace all base secrets and set:
- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `CORS_ALLOWED_ORIGINS`
- `CONNECTOR_ENCRYPTION_KEY`
- `CONNECTOR_OAUTH_STATE_SECRET`

Run:

```bash
npm run preflight
```

Preflight is deployment-mode aware. It fails only for base requirements plus capabilities that are actually enabled.

## 3. Docker deployment

Core:

```bash
npm run stack:core
```

Standard:

```bash
npm run stack:standard
```

Full:

```bash
npm run stack:full
```

Status:

```bash
npm run stack:ps
```

Logs:

```bash
node scripts/stack.mjs logs --mode=core
```

Stop:

```bash
npm run stack:down
```

The migration container completes before API/worker admission.

## 4. Non-Docker deployment

Requirements:
- Node.js 20+
- PostgreSQL 16-compatible database
- npm dependencies installed
- Python 3.11-3.13 only when local AI is enabled

Core:

```bash
npm ci
npm run start:core
```

The launcher:
1. loads `.env`,
2. runs migrations,
3. runs deployment-aware preflight,
4. builds the frontend unless `ACE_SKIP_BUILD=true`,
5. starts API,
6. starts worker,
7. serves the built SPA with the dependency-free static server.

Standard/full use `npm run start:standard` and `npm run start:full`.

For host production, install `deploy/systemd/acemarketing.service.example` as a systemd service and put TLS/reverse proxy in front of it. An nginx example is at `deploy/nginx.host.conf.example`.

## 5. Health verification

Check:
- API liveness: `/healthz`
- API startup: `/startupz`
- API readiness: `/readyz`
- application API health: `/api/health`
- web health: `/healthz`

Then run:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3001 npm run smoke
```

Do not route production traffic until readiness and smoke verification succeed.

## 6. Backup

Create a PostgreSQL custom-format backup:

```bash
DATABASE_URL=... npm run backup
```

Store production backups in encrypted storage outside the application host.

Before major migrations/releases, create a verified backup and record:
- release SHA,
- configuration version,
- database migration head,
- image digests,
- backup object identifier.

## 7. Restore

Restore is guarded:

```bash
RESTORE_CONFIRM=YES DATABASE_URL=... npm run restore -- backups/acemarketing-....dump
```

Restore into an isolated database first. Verify migrations, tenant isolation, `/readyz`, queue state, connector state, and billing state before traffic cutover.

## 8. Immutable release images

Release workflows publish digest-addressed images and a `release-manifest.json`.

Compose supports source builds and pinned images. For a pinned deployment, populate:
- `ACE_API_IMAGE`
- `ACE_WORKER_IMAGE`
- `ACE_WEB_IMAGE`
- optional control/ML image variables

and run:

```bash
node scripts/stack.mjs up --mode=core --no-build
```

## 9. Application downgrade / rollback

Rollback to a previous release manifest:

```bash
npm run rollback -- ./release-manifest.previous.json core
```

This repoints application services to previous immutable image digests and starts Compose without rebuilding.

**Database migrations are not automatically reversed.** Production migrations are forward-only by default. A release intended for rollback must remain compatible with the forward schema.

For a destructive database incident:
1. preserve the current database,
2. restore a verified backup into an isolated database,
3. validate the previous release against that database,
4. switch traffic only after smoke/reconciliation checks.

## 10. Capability downgrade

You may reduce infrastructure without changing source code. For example:

```env
ACE_DEPLOYMENT_MODE=full
ACE_ENABLE_AI=false
ACE_ENABLE_FILES=false
ACE_ENABLE_CONTROL_PLANE=false
```

Runtime admission blocks disabled optional capabilities while keeping core reads/security operational.

## 11. Connector operations

Provider sync is durable and tenant scoped.

Inspect:
- `GET /api/integrations/sync-runs`
- `GET /api/integrations/sync-schedules`
- `GET /api/integrations/data-summary`

The Data Flow generic executor supports provider → Ace Data Hub synchronization. Cross-provider conversions/audiences/CRM writeback use their dedicated governed activation paths.

## 12. Incident triage

1. Check liveness/readiness.
2. Inspect queue/dead-letter state.
3. Inspect connector sync runs and checkpoints.
4. Inspect provider errors/rate limits.
5. Pause unsafe external side effects through runtime configuration.
6. Preserve audit, billing, event, and connector evidence.
7. Check PostgreSQL connection/disk saturation.
8. Downgrade optional capabilities before taking core ingestion/reads offline.

## 13. Release gate

A release is eligible only when:
- dependency/security audit passes;
- backend architecture checks pass;
- tenant/RLS tests pass;
- migrations succeed;
- backend foundation tests pass;
- AI unit checks pass when affected;
- frontend TypeScript/build/budget checks pass;
- API boots against PostgreSQL;
- smoke/E2E tests pass;
- production images build;
- preflight passes for the target deployment mode.

A feature is not production-qualified merely because its code exists. External providers require real staging/production credential qualification and reconciliation evidence.
