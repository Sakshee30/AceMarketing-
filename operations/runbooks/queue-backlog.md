# Queue backlog runbook

## Trigger
Use when queue age, retry volume or dead-letter growth breaches the job-class objective.

## Actions
1. Identify arrival rate, processing rate, oldest age, retry causes and downstream provider health.
2. Protect interactive/API capacity; do not allow worker scaling to exhaust database or provider budgets.
3. Pause or reject new optional work when drain capacity is negative.
4. Separate poison messages and permanent failures from transient retries.
5. Increase worker concurrency only inside measured database, provider and network budgets.

## Recovery
Drain backlog gradually after the dependency recovers to avoid a second outage. Reconcile accepted job records with queue state and dead letters. Preserve idempotency keys and do not replay external side effects blindly.

## Evidence
Record backlog peak, drain rate, user impact, retries/dead letters, remediation owner and the regression/fault test added afterward.
