# Release downgrade and rollback runbook

AceMarketing supports two application rollback paths: immutable Docker images and atomic Docker-free release directories.

## Principle

Application rollback and database rollback are separate operations.

Normal application rollback is **code-only** and expects migrations to be forward compatible. Production schema migrations are not automatically reversed because destructive down migrations can remove data needed by the newer release and make incident recovery worse.

## Before every production release

Record and retain:

- release commit SHA,
- release manifest,
- image digests when using containers,
- database migration head,
- runtime configuration version,
- encrypted database backup identifier,
- provider configuration/version registry,
- smoke and reconciliation evidence.

Create and verify a PostgreSQL backup before migrations that materially change persisted data.

## Docker rollback

Use the immutable release manifest created by the release workflow:

```bash
DATABASE_URL=... npm run rollback -- ./release-manifest.previous.json core
```

The rollback script refuses a known newer database schema unless:

```bash
ROLLBACK_ALLOW_NEWER_SCHEMA=YES
```

is set after compatibility review.

## Docker-free rollback

Host layout:

```text
/opt/acemarketing/current  -> releases/current-release
/opt/acemarketing/previous -> releases/previous-release
```

Rollback:

```bash
DATABASE_URL=... node scripts/local-release.mjs rollback \
  --root=/opt/acemarketing \
  --restart=true \
  --target=acemarketing-core.target
```

The switch is an atomic symlink replacement. The old active release becomes `previous`, allowing a controlled re-forward if needed.

## Capability downgrade instead of release rollback

Prefer disabling optional capabilities when the incident is isolated:

```env
ACE_ENABLE_AI=false
ACE_ENABLE_AI_FORECASTING=false
ACE_ENABLE_AI_CAUSAL=false
ACE_ENABLE_AI_MMM=false
ACE_ENABLE_FILES=false
ACE_ENABLE_AGENT_TRANSPORTS=false
ACE_ENABLE_WHATSAPP=false
```

This retains the core API, durable event ingestion, PostgreSQL job queue and tenant/security controls.

Runtime emergency controls can also temporarily suspend AI, integrations, uploads or writes without deploying a different build.

## Database incident

If an older application cannot safely use the current forward schema:

1. stop external side effects;
2. preserve the current database;
3. restore the pre-release backup into an isolated database;
4. run the old release against that isolated database;
5. run migrations/checks appropriate to that release;
6. validate tenant isolation, billing, connector checkpoints, durable jobs, tracked events and attribution;
7. reconcile provider writes that may have happened after the backup;
8. cut over only after smoke tests and explicit operator approval.

Never run destructive restore directly over the only production database copy.

## Verification after rollback

Verify:

- `/healthz`, `/startupz`, `/readyz`;
- API smoke suite;
- queue has no unexpected stale leases;
- connector checkpoints did not regress;
- event counts and attribution totals reconcile;
- billing webhook processing is not duplicated;
- provider side effects remain fenced/idempotent;
- frontend release assets match the rollback release.

Record the rollback reason, timestamps, release versions and follow-up action in operational evidence.
