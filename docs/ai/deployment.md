# AI deployment

## Services

Base Compose services remain unchanged. Optional profiles isolate AI dependencies:
- `ai`: core ML service
- `ai-forecasting`: forecasting/Chronos profile
- `ai-causal`: causal profile
- `ai-mmm`: Meridian profile

Use `deploy/Dockerfile.ml-specialist` for specialist profiles. Training and serving capacity should be isolated in production.

## Required environment

See `backend/.env.example`. Provider keys are injected secrets; never commit them. `AI_LIVE_PROVIDER_CALLS` is off by default. Chronos requires a pinned `CHRONOS2_REVISION`.

## Health and safety

- Run migrations before workers.
- Durable database is required for AI jobs.
- Use internal authentication for ML service.
- Use production object storage for model artifacts.
- Do not download large checkpoints in interactive web requests.
- Bound worker batch size, lease duration, retries and provider timeout.
- Use graceful shutdown/drain for workers.
- GPU selection is capability-detected/configured; no GPU compatibility guarantee is implied.

## Verification commands

```bash
npm run check:backend
npm run test:ai-backend
npm run check:frontend
npm run build:frontend
```

Live provider/checkpoint tests remain opt-in with credentials and an authorized bounded budget.
