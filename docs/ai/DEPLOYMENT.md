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
