# search operational runbook

Owner: **platform-search**  
Feature: `search`

## Scope

Use this runbook for incidents or degraded operation involving authorized-search, search-projection, deletion-propagation.

## Detect

Check feature telemetry, application errors, dependency health, queue/backlog state where applicable, and the Control Center catalogue/evidence views. Correlate by request/trace/operation ID; do not expose secrets or private payloads in incident channels.

## Triage

1. Confirm tenant/workspace scope and blast radius.
2. Determine whether the issue is validation/authorization, persistence, durable work, provider dependency, configuration, or capacity.
3. Verify whether any customer-visible success may have an unknown outcome.
4. Check recent configuration/provider/migration changes and current runtime snapshot.
5. For security or tenant-isolation anomalies, stop unsafe admission rather than bypassing enforcement.

## Contain

The feature's declared new-work off behaviour is `reject_index_updates`. Use only governed capability/configuration controls. Preserve committed work and authoritative reads according to the feature contract. Never disable authentication, authorization, tenant isolation, audit, encryption or durable persistence to restore availability.

## Recover

- Reconcile unknown outcomes using authoritative durable state and operation/idempotency records.
- Resume/replay durable jobs only through supported replay paths.
- Roll back configuration/provider changes only while compatibility remains valid.
- Use forward repair for irreversible migrations or already-committed data transitions.
- Verify tenant scope, audit continuity and event/projection convergence before reopening full admission.

## Validate

Run the canonical operation tests for this module:
- `backend/tests/canonical-data-foundation-handlers.test.mjs` (search.query-search)
- `backend/tests/canonical-security-document-handlers.test.mjs` (search.rebuild-index)

Also verify relevant contract, security, migration and smoke tests before declaring recovery.

## Escalation and evidence

Record timeline, affected profiles/tenants, tested commit/artifact, root cause, actions, residual risk and follow-up owner. Production qualification claims require environment-specific evidence; a local recovery rehearsal is not sufficient.

