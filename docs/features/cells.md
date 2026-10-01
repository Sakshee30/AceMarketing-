# cells feature contract

## Purpose

Owns tenant-placement, routing-epoch-fencing. This document is the operational feature README for the canonical `cells` backend module and complements `backend/modules/cells/README.md`.

## Caller and permissions

Owner: **platform-operations**

Required permissions: `platform.placement.read`, `platform.placement.change`.

Supported profiles: high-scale.

## Inputs, outputs and contracts

Published contracts: `tenant-placement`.

Canonical operations:
- `cells.move-tenant` — permission `platform.placement.change`, contract `tenant-placement`, handler `backend/modules/cells/src/application/commands/move-tenant/move-tenant.handler.mjs`, evidence `backend/tests/canonical-control-plane-handlers.test.mjs`.

Transport adapters validate request shape and authenticated execution context before calling the application handler. Application handlers remain the authority for resource/field permission checks, invariants, idempotency and owned transactions.

## Domain and transaction invariants

- Tenant/workspace authority comes from verified execution context, never from an untrusted body field.
- Success is returned only after the operation's durability contract is satisfied.
- Sensitive changes retain required audit evidence.
- Provider calls and slow external work do not hold database transactions open.
- Cross-module writes occur only through published application interfaces/events.

Migrations: `backend/migrations/054_cell_placement.sql`.

## Dependencies and off/degraded behaviour

Dependencies are declared in the canonical feature catalogue. New work when the feature is disabled follows `freeze_moves`; locked security/tenant controls are never bypassed by degradation.

## Idempotency, retries and unknown outcome

Commands with externally retried or durable effects use the operation identity/idempotency facilities declared by their handler/store. A timeout after possible commit is treated as unknown outcome until reconciled against authoritative durable state; it is not converted into a second logical mutation.

## Events and asynchronous work

Events: `tenant.placement.changed`.

Durable asynchronous effects use the existing job/outbox/retry/dead-letter contracts. Event consumers remain tenant scoped and idempotent.

## Data classification and retention

Classification: **restricted**. Retention and deletion behavior follow the project profile and owning data policy. No feature-local fallback may silently weaken those rules.

## Errors and customer-visible recovery

Expected denial, validation, conflict, quota and dependency failures use explicit error states. Recovery favors retry only when safe, operation reconciliation after unknown outcome, and forward repair when rollback is no longer valid.

## Telemetry

Minimum signals: request count, error count, duration, denial/conflict classes, durable-job backlog where applicable, and security/audit evidence for sensitive operations. High-cardinality tenant/user identifiers are not promoted to unbounded metrics labels.

## Evidence and recovery links

- Module implementation: `backend/modules/cells/`
- Engineering catalogue: `/control-api/catalog`
- Acceptance evidence: `/control-api/evidence`
- Runbook: `operations/runbooks/features/cells.md`
- Threat/migration reviews: `backend/src/platform/architecture-review-registry.mjs`

