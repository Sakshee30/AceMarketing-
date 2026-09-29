# AI deployment

Default deployment does not require AI services.

Hosted execution is disabled unless `AI_LIVE_PROVIDER_CALLS=true` and the exact route is qualified. Provider secrets are injected through environment/secret management and never committed.

The specialist ML service is available through Docker Compose profile `ai`:
`docker compose --profile ai up --build`.

Production requires:
- `DATABASE_URL`
- strong `ML_SERVICE_AUTH_TOKEN`
- production object storage via `ML_ARTIFACT_S3_BUCKET` and related region/endpoint settings
- bounded worker and ML timeouts/deadlines
- task-specific training/evaluation evidence before promotion.

The ML container runs non-root and exposes only the internal network. Training remains isolated from the Node API request process.

## Chronos-2 checkpoint provisioning

Production forecasting does not download Chronos weights during an interactive request. Provision the pinned `amazon/chronos-2` revision before serving, mount it read-only into the forecast ML profile, set `CHRONOS2_SNAPSHOT_DIR`, set the exact `CHRONOS2_REVISION`, and set `CHRONOS2_EXPECTED_SHA256` to the verified repository snapshot hash. Keep `CHRONOS2_ALLOW_DOWNLOAD=false` in production. A missing directory, missing revision, or hash mismatch blocks inference rather than silently downloading or substituting a checkpoint.


## Knowledge vector retrieval

Production semantic retrieval supports an explicit PostgreSQL pgvector adapter. Provision the pgvector extension in the database before setting `KNOWLEDGE_VECTOR_BACKEND=postgres_pgvector`. The application does not attempt privileged extension installation at runtime.

When the backend is not configured, production retrieval remains lexical (plus an approved reranker when available) and reports that semantic vector search is inactive. The embedded development database uses bounded application-side cosine similarity only as a local fallback; that fallback is not represented as a production vector index.


## Activation dispatch fencing

Provider-side activation remains disabled by default. When explicitly enabled, configure AI_ACTIVATION_DISPATCH_LEASE_MS for the bounded external-dispatch window and AI_ACTIVATION_QUEUE_PUBLISH_DELAY_MS for proposal-state publication before worker eligibility. The database migration 031_ai_activation_dispatch_lease.sql must be applied before enabling execution. Credential-bearing provider redirects are rejected. Model lifecycle changes are refused while a dispatch lease is active; ambiguous outcomes remain blocked for reconciliation rather than automatic replay.


## Shadow, canary and rollback controls

Migration `033_ai_deployment_controls.sql` adds tenant-scoped deployment traffic controls and bounded execution observations.

Supported modes are:

- `off`: candidate traffic is blocked.
- `shadow`: normal user-serving requests are blocked; only the explicit governed shadow endpoint may execute the candidate.
- `canary`: a deterministic hash bucket limits candidate traffic to the configured percentage. Requests outside the allocation are not silently routed to the candidate.
- `active`: candidate traffic is fully eligible, subject to the normal model/task governance gates.

Per-task controls also record maximum error-rate and p95-latency thresholds plus a minimum observation count. When the optional rollback guard is enabled and a threshold is breached, the worker conservatively switches candidate traffic to `off`. It does not silently swap model artifacts; the existing governed rollback operation remains the authoritative artifact rollback path.

### Opt-in live verification

Live checks remain off by default.

Provider account/model smoke:
`AI_LIVE_PROVIDER_SMOKE=true AI_LIVE_PROVIDER_MAX_CALLS=1 npm run ai:live-provider-smoke -- --task=<task>`

Real Chronos checkpoint smoke:
`AI_REAL_CHECKPOINT_SMOKE=true npm run ai:checkpoint-smoke`

The first command verifies configured provider access only. The second submits one bounded durable `amazon/chronos-2` smoke job and waits for completion. Neither command qualifies, approves or deploys a model, and neither replaces tenant-specific evaluation.
