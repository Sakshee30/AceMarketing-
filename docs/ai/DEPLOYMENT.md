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
