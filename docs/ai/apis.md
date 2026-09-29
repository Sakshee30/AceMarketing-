# AI APIs

All routes use existing authentication/workspace scope and structured error behavior.

## Registry and governance
- GET `/api/ai/registry`
- POST `/api/ai/providers/:task/verify`
- GET/POST `/api/ai/evaluation-policy`
- GET `/api/ai/evaluations`
- POST `/api/ai/evaluations/:id/qualify`
- POST `/api/ai/models/:task/promote`
- POST `/api/ai/models/:task/deploy`
- POST `/api/ai/models/:task/undeploy`
- POST `/api/ai/models/:task/rollback`

## Hosted execution
- POST `/api/ai/analysis`
- POST `/api/ai/tasks/:task/submit`
- GET `/api/ai/jobs/:id`
- POST `/api/ai/jobs/:id/cancel`
- GET `/api/ai/results`

Long work returns HTTP 202 plus durable job ID.

## Data/training
- GET/POST `/api/ai/datasets`
- GET `/api/ai/datasets/:id`
- POST `/api/ai/datasets/:id/train`
- POST `/api/ai/datasets/:id/retire`

## Specialist ML
- GET `/api/ai/ml/capabilities`
- POST `/api/ai/ml/train/classification`
- POST `/api/ai/ml/train/regression`
- POST `/api/ai/ml/score`
- POST `/api/ai/ml/forecast/seasonal-naive`
- POST `/api/ai/ml/forecast/chronos-2`
- POST `/api/ai/ml/forecast/catboost-challenger`
- POST `/api/ai/ml/incrementality`
- POST `/api/ai/ml/marketing-mix`
- POST `/api/ai/ml/anomalies`
- POST `/api/ai/ml/segments`
- POST `/api/ai/ml/rank`
- POST `/api/ai/ml/rank/score`

## Knowledge
- GET/POST `/api/ai/knowledge`
- POST `/api/ai/knowledge/search`
- POST `/api/ai/knowledge/:id/revoke`

## Voice
- POST `/api/ai/live-voice/sessions`
- GET `/api/ai/live-voice/sessions/:id`
- POST `/api/ai/live-voice/sessions/:id/terminate`
- WebSocket `/api/ai/live-voice/ws?session=:id`

Browser callers must never receive provider secrets.
