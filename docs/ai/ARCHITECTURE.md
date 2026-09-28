# Multi-model intelligence architecture

AceMarketing keeps its existing Vite/React frontend, Node API/worker, PostgreSQL authority, authorization primitives and durable job queue.

## Runtime boundaries

Browser -> authenticated Node API -> PostgreSQL durable job -> Node worker -> hosted provider adapter OR authenticated internal ML service -> versioned result/evaluation stores -> frontend.

Provider/model calls, training and heavy inference are never executed inside a web database transaction. The browser never receives provider credentials or direct ML-service access.

## Durable jobs

The existing `ace_jobs` queue is extended with immutable input snapshots, deadlines, cancellation, heartbeat timestamps, fencing tokens, provider request IDs and an `unknown_outcome` terminal/reconciliation state. External execution is not described as exactly-once.

## Model classes

The registry distinguishes hosted models, pretrained checkpoints, fitted estimators, calibration components and deterministic baselines. Configuration, implementation, training, evaluation, approval and deployment are separate dimensions.

## Optional AI

Core ingestion, authentication, attribution and deterministic reporting remain available with AI disabled. Hosted provider calls require `AI_LIVE_PROVIDER_CALLS=true`; the Python service is an optional Compose `ai` profile.
