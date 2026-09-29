# AI architecture

AceMarketing keeps the existing web/API architecture and adds governed AI/ML execution without placing provider calls or training inside request transactions.

## Runtime boundaries

Browser -> authenticated AceMarketing API -> durable PostgreSQL job/outbox boundary -> worker -> hosted provider or authenticated ML service -> persisted typed result.

Large artifacts belong in the configured artifact/object-store adapter. Credentials never cross into the browser. Live voice uses an authenticated WebSocket relay and dedicated session records.

## Core modules

- `backend/src/ai-registry.mjs`: requested task/model assignments and static documentation verification.
- `backend/src/ai-registry-store.mjs`: tenant lifecycle, evaluation, promotion/deployment and ML execution/result records.
- `backend/src/ai-runtime.mjs`: governed hosted task admission/execution and provider-request reconciliation.
- `backend/src/queue.mjs`: durable leases, fencing, idempotency, usage reservation/outbox, cancellation and dead-letter handling.
- `backend/src/worker.mjs`: model/provider execution outside request transactions.
- `backend/src/knowledge.mjs`: tenant-scoped knowledge ingestion/retrieval.
- `backend/src/live-voice.mjs`: bounded live voice relay.
- `ml-service/src/acemarketing_ml/`: specialist numerical model service.
- `frontend/src/features/intelligence/`: customer-facing governed intelligence workspace.
- `frontend/src/features/models/`: model governance and administration.

## Failure semantics

Queue receipt is not completion. External provider outcomes can be confirmed, failed or unknown. Unknown outcomes are reconciled rather than blindly retried. Numerical model unavailability never falls back to LLM-generated numbers.

## Data flow

Authorized event/connector data -> persisted canonical workspace evidence -> metric/feature/label snapshots -> governed task admission -> specialist/provider execution -> typed results/evaluations -> UI -> explicit approval boundaries for any side effect.
