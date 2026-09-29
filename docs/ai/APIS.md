# AI APIs

All routes use existing AceMarketing authentication/workspace scoping. Long-running provider and specialist-model work is queued and returns stable job IDs.

## Registry, governance and results
- `GET /api/ai/registry` — static capability registry plus tenant-persisted lifecycle state when PostgreSQL is available.
- `GET /api/ai/results?task=<task>&limit=<n>`
- `GET /api/ai/jobs/:id`
- `POST /api/ai/jobs/:id/cancel`
- `GET /api/ai/evaluations?task=<task>&limit=<n>`
- `GET /api/ai/evaluation-policy?task=<task>`
- `POST /api/ai/evaluation-policy` — owner/admin; predeclares task-specific qualification thresholds.
- `POST /api/ai/evaluations/:id/qualify` — owner/admin; evaluates recorded metrics against the active predeclared policy.
- `POST /api/ai/models/:task/promote` — owner/admin; requires a qualified evaluation ID.
- `POST /api/ai/models/:task/rollback` — owner/admin; requires a recorded rollback predecessor.

Policy definition, qualification, approval and deployment remain separate lifecycle states. A saved settings object never implies model qualification.

## Hosted analysis
- `POST /api/ai/analysis` -> `202` plus stable job ID when the analyst route is active.
- If documentation, credentials, evaluation, approval or deployment prerequisites are missing, the request is blocked with explicit readiness/prerequisites.

## Knowledge
- `GET /api/ai/knowledge`
- `POST /api/ai/knowledge`
- `POST /api/ai/knowledge/:id/revoke`
- `POST /api/ai/knowledge/search` -> queued search job.

Knowledge retrieval uses workspace/role filtering before rendering. Voyage embedding/reranking is used only when those exact routes are active; otherwise PostgreSQL full-text retrieval is explicitly labelled.

## Specialist ML jobs
- `GET /api/ai/ml/capabilities`
- `POST /api/ai/ml/train/classification`
- `POST /api/ai/ml/train/regression`
- `POST /api/ai/ml/forecast/seasonal-naive`
- `POST /api/ai/ml/forecast/chronos-2`
- `POST /api/ai/ml/incrementality`
- `POST /api/ai/ml/marketing-mix`
- `POST /api/ai/ml/anomalies`
- `POST /api/ai/ml/segments`
- `POST /api/ai/ml/rank`

The worker calls the authenticated internal Python service with `X-Internal-Token`. The browser never calls the ML service directly. ML execution records versioned results and evaluation evidence, but evidence is not automatically promoted.

## Provider-specific media
The requested Google transcription and live-voice identifiers are documented, but media upload and WebSocket session transport are separate capabilities from generic `generateContent`. They remain blocked until the provider-specific transport, storage/retention, and account-access prerequisites are satisfied.
