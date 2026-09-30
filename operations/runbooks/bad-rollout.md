# Bad rollout runbook

## Detection
Use for elevated errors, latency, crash loops, contract incompatibility or customer-state regressions after deployment.

## Rules
The deployed artifact digest, configuration version and migration version are independent facts. Do not rebuild an old commit and call it a rollback. Prefer promotion of the last known-good compatible immutable artifact.

## Response
1. Freeze further promotion.
2. Compare desired versus observed release/configuration state.
3. Determine whether database/schema changes are backward compatible.
4. Roll traffic back only when data and side-effect semantics are safe.
5. If the point of no return has been crossed, use forward repair or restore and report manual recovery required when applicable.
6. Reconcile uncertain operations and external sends before completing the incident.

## Verification
Run health gates, migration compatibility, representative customer journeys, queue/outbox checks and security controls before stabilization is declared complete.
