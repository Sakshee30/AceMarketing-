# Requirement coverage matrix

| Capability | Backend/service | UI | Tests/evidence | Remaining prerequisite |
|---|---|---|---|---|
| Registry/governance | ai-registry.mjs, ai-registry-store.mjs | Models, AI Intelligence | registry/evaluation lifecycle code | tenant evaluation evidence |
| Durable jobs | queue.mjs, worker.mjs | AI Intelligence job state | lease/idempotency lifecycle | production queue/database |
| Analyst | ai-runtime.mjs, ai-providers.mjs | AI Intelligence / Analyst | hosted input validation | provider access + qualification |
| Reviewer | ai-providers.mjs | governed generic task API | hosted input validation | exact model verification/access |
| Embedding/rerank | ai-providers.mjs, knowledge.mjs | AI Intelligence / Knowledge | offline contract paths | provider access/index backend |
| Transcription/live voice | ai-providers.mjs, live-voice.mjs | Calls | bounded session logic | provider access + qualification |
| Creative image | ai-providers.mjs | governed generic task API | hosted input validation | provider access + draft-review UX expansion |
| Point-in-time datasets | ai-datasets.mjs | AI Intelligence / Datasets | dataset validation logic | tenant data |
| Classification/value | ML service pipelines | AI Intelligence + Models | Python pipeline tests | fitted/evaluated artifacts |
| Forecasting | ML service pipelines | AI Intelligence / Forecasts | baseline/contract tests | Chronos revision + evaluation |
| MMM/incrementality | ML service pipelines | API + result history | Python pipeline tests | real causal/MMM data/diagnostics |
| Anomaly/segments/ranking | ML service pipelines | API + result history | Python pipeline tests | tenant evaluation evidence |
| Metrics | metric-catalog.mjs | Analyst contract panel | metric-catalog tests | source freshness |
| Deployment | Compose specialist profiles | Models status | configuration | production infrastructure |

| Job event stream | index.mjs SSE route | AI Intelligence live status | CI canonical check | production proxy timeout tuning |
| Prediction scoring | ML score endpoint + artifact verification | AI Intelligence / Predictions | result contract tests | trained approved artifact |
| Specialist UI | ML task routes | AI Intelligence / Specialists | service contract tests | task-specific tenant evidence |
| Multimodal/transcription | hosted task adapters | AI Intelligence / Media | hosted input validation | provider access + authorized media |
| Creative draft | creative_image hosted task | AI Intelligence / Creatives | hosted input validation | provider access + asset review persistence |
| OpenAPI | docs/ai/openapi.yaml | n/a | CI canonical check | publish/version in deployment |
| Operator lifecycle scripts | scripts/ai/* | n/a | check:ai-tools | operator token/workspace |
| Kubernetes | deploy/k8s/* | n/a | CI canonical check | cluster secrets/storage classes/network egress |

| Activation proposals | ai-activation-proposals.mjs + migration 028 | AI Intelligence / Administration | ai-activation-proposals.test.mjs | provider-specific execution adapter remains separate and must recheck consent/limits at execution |
