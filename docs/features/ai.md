# ai feature contract

## Purpose

Owns model-registry, authorized-retrieval, governed-activation. This document is the operational feature README for the canonical `ai` backend module and complements `backend/modules/ai/README.md`.

## Caller and permissions

Owner: **platform-ai**

Required permissions: `ai.read`, `ai.execute`, `ai.manage`.

Supported profiles: ai-enabled.

## Inputs, outputs and contracts

Published contracts: `ai-request`, `ai-result`, `ai-activation`.

Canonical operations:
- `ai.request-inference` — permission `ai.execute`, contract `ai-request`, handler `backend/modules/ai/src/application/commands/request-inference/request-inference.handler.mjs`, evidence `backend/tests/canonical-governance-ai-handlers.test.mjs`.
- `ai.activate-model-result` — permission `ai.manage`, contract `ai-activation`, handler `backend/modules/ai/src/application/commands/activate-model-result/activate-model-result.handler.mjs`, evidence `backend/tests/canonical-governance-ai-handlers.test.mjs`.

Transport adapters validate request shape and authenticated execution context before calling the application handler. Application handlers remain the authority for resource/field permission checks, invariants, idempotency and owned transactions.

## Domain and transaction invariants

- Tenant/workspace authority comes from verified execution context, never from an untrusted body field.
- Success is returned only after the operation's durability contract is satisfied.
- Sensitive changes retain required audit evidence.
- Provider calls and slow external work do not hold database transactions open.
- Cross-module writes occur only through published application interfaces/events.

Migrations: none owned by this module.

## Dependencies and off/degraded behaviour

Dependencies are declared in the canonical feature catalogue. New work when the feature is disabled follows `suspend_admission`; locked security/tenant controls are never bypassed by degradation.

## Idempotency, retries and unknown outcome

Commands with externally retried or durable effects use the operation identity/idempotency facilities declared by their handler/store. A timeout after possible commit is treated as unknown outcome until reconciled against authoritative durable state; it is not converted into a second logical mutation.

## Events and asynchronous work

Events: `ai.execution.completed`.

Durable asynchronous effects use the existing job/outbox/retry/dead-letter contracts. Event consumers remain tenant scoped and idempotent.

## Data classification and retention

Classification: **restricted**. Retention and deletion behavior follow the project profile and owning data policy. No feature-local fallback may silently weaken those rules.

## Errors and customer-visible recovery

Expected denial, validation, conflict, quota and dependency failures use explicit error states. Recovery favors retry only when safe, operation reconciliation after unknown outcome, and forward repair when rollback is no longer valid.

## Telemetry

Minimum signals: request count, error count, duration, denial/conflict classes, durable-job backlog where applicable, and security/audit evidence for sensitive operations. High-cardinality tenant/user identifiers are not promoted to unbounded metrics labels.

## Evidence and recovery links

- Module implementation: `backend/modules/ai/`
- Engineering catalogue: `/control-api/catalog`
- Acceptance evidence: `/control-api/evidence`
- Runbook: `operations/runbooks/features/ai.md`
- Threat/migration reviews: `backend/src/platform/architecture-review-registry.mjs`

