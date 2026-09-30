# Database failover runbook

## Scope
Use for loss or severe degradation of the authoritative PostgreSQL service. Authorization uncertainty or write ownership uncertainty is fail-closed.

## Initial actions
1. Declare the incident and identify commander, technical lead, communications owner and recorder.
2. Stop nonessential write admission before connection exhaustion causes wider failure.
3. Record release, configuration version, region/cell, database state and the incident timestamp.
4. Confirm whether the provider is failing over, unavailable, or accepting writes with degraded latency.

## Integrity controls
Do not create a substitute database or fabricated records to keep success responses green. Confirm the authoritative writer before allowing writes. After failover, reconcile unknown-outcome writes, idempotency records, outbox/inbox progress, billing reconciliation and workflow leases.

## Verification
Verify tenant predicates/RLS, recent writes, connection pool health, queue processing, audit persistence and representative customer reads/writes. Measure actual RPO and RTO from incident declaration to usable service and record the result in recovery evidence.

## Stop conditions
Escalate to manual recovery when writer ownership is ambiguous, corruption is suspected, encryption access is unavailable, or reconciliation cannot account for acknowledged work.
