# Production Operations Runbook

## Deploy

1. Copy `backend/.env.example` to `.env` and replace every placeholder/secret.
2. Set a strong `POSTGRES_PASSWORD`.
3. Run `npm run preflight`.
4. Start the stack with `docker compose up -d --build`.
5. Confirm `docker compose ps` shows PostgreSQL, API, worker and web healthy.
6. Run `SMOKE_BASE_URL=http://127.0.0.1:${ACE_HTTP_PORT:-8080} npm run smoke`.

The `migrate` service runs all SQL migrations before API and worker start.

## Rollback

Application rollback is image-based. Deploy the previous known-good API/web image SHA. Database migrations are forward-only by default; do not automatically reverse a migration after production data has been written. For destructive incidents, restore from a verified backup into an isolated database first, validate, then switch traffic.

## Backup

Create a PostgreSQL custom-format backup:

```bash
DATABASE_URL=... npm run backup
```

Backups are written under `BACKUP_DIR` (default: `backups/`). Store production backups in encrypted object storage outside the application host. Test restores regularly.

## Restore

Restore is intentionally guarded:

```bash
RESTORE_CONFIRM=YES DATABASE_URL=... npm run restore -- backups/acemarketing-....dump
```

Run restores against a non-production database first. Verify migrations, `/api/ready`, authenticated smoke tests, job queues, connector state and billing subscription state before traffic cutover.

## Incident triage

1. Check `/api/health` and `/api/ready`.
2. Inspect Operations → Monitoring and Alerts.
3. Inspect worker dead-letter jobs and provider errors.
4. Check PostgreSQL saturation/connections and disk.
5. Disable unsafe external provider actions before disabling ingestion.
6. Preserve audit/billing/event evidence before remediation.

## Release gate

A release is eligible when:
- frontend TypeScript and backend syntax checks pass;
- PostgreSQL migrations succeed in CI;
- API boots against PostgreSQL;
- smoke tests pass;
- production frontend builds;
- both Docker images build;
- required production configuration passes `npm run preflight`.
