# AI APIs

All routes use existing AceMarketing authentication/workspace scoping.

## Registry and results
- `GET /api/ai/registry`
- `GET /api/ai/results?task=<task>&limit=<n>`
- `GET /api/ai/jobs/:id`
- `POST /api/ai/jobs/:id/cancel`

## Hosted analysis
- `POST /api/ai/analysis` -> `202` plus stable job ID when the analyst route is active.
- If documentation, credentials, evaluation, approval or deployment prerequisites are missing, the request is blocked with explicit readiness/prerequisites.

## Specialist ML jobs
- `GET /api/ai/ml/capabilities`
- `POST /api/ai/ml/train/classification`
- `POST /api/ai/ml/train/regression`
- `POST /api/ai/ml/forecast/seasonal-naive`
- `POST /api/ai/ml/anomalies`
- `POST /api/ai/ml/segments`
- `POST /api/ai/ml/rank`

Long work is queued. The worker calls the internal Python service with `X-Internal-Token`. The browser does not call it directly.
