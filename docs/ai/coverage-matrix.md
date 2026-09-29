# Requirement coverage matrix

| Capability | Backend/service | UI | Tests/evidence | Remaining prerequisite |
|---|---|---|---|---|
| Registry/governance | ai-registry.mjs, ai-registry-store.mjs | Models, AI Intelligence | registry/evaluation lifecycle code | tenant evaluation evidence |
| Durable jobs | queue.mjs, worker.mjs | AI Intelligence job state | lease/idempotency lifecycle | production queue/database |
| Analyst | ai-runtime.mjs, ai-providers.mjs | AI Intelligence / Analyst | hosted input validation | provider access + qualification |
| Reviewer | ai-providers.mjs | governed generic task API | hosted input validation | exact model verification/access |
| Embedding/rerank | ai-providers.mjs, knowledge.mjs | AI Intelligence / Knowledge | authorization leakage + embedded retrieval tests | provider access; production semantic search requires provisioned pgvector when enabled |
| Transcription/live voice | ai-providers.mjs, live-voice.mjs | Calls | bounded session logic | provider access + qualification |
| Creative image | ai-providers.mjs + governed creative persistence | AI Intelligence / Creatives draft/review | hosted input validation + review lifecycle | provider access + tenant evaluation/approval policy |
| Point-in-time datasets | ai-datasets.mjs | AI Intelligence / Datasets | dataset validation logic | tenant data |
| Classification/value | ML service pipelines | AI Intelligence + Models | Python pipeline tests | fitted/evaluated artifacts |
| Forecasting | ML service pipelines + `/v1/evaluate/forecast-candidates` | AI Intelligence / Forecasts | baseline/contract/qualification tests | provisioned Chronos revision + tenant evaluation |
| MMM/incrementality | ML service pipelines | API + result history | Python pipeline tests | real causal/MMM data/diagnostics |
| Anomaly/segments/ranking | ML service pipelines | API + result history | Python pipeline tests | tenant evaluation evidence |
| Metrics | metric-catalog.mjs | Analyst contract panel | metric-catalog tests | source freshness |
| Deployment | Compose specialist profiles | Models status | configuration | production infrastructure |

| Job event stream | index.mjs SSE route | AI Intelligence live status | CI canonical check | production proxy timeout tuning |
| Prediction scoring | ML score endpoint + artifact verification | AI Intelligence / Predictions | result contract tests | trained approved artifact |
| Specialist UI | ML task routes | AI Intelligence / Specialists | service contract tests | task-specific tenant evidence |
| Multimodal/transcription | hosted task adapters | AI Intelligence / Media | hosted input validation | provider access + authorized media |
| Creative draft | creative_image hosted task + persisted review lifecycle | AI Intelligence / Creatives | hosted input validation + review state | provider access; generated assets remain drafts until authorized review |
| OpenAPI | docs/ai/openapi.yaml | n/a | CI canonical check | publish/version in deployment |
| Operator lifecycle scripts | scripts/ai/* | n/a | check:ai-tools | operator token/workspace |
| Kubernetes | deploy/k8s/* | n/a | CI canonical check | cluster secrets/storage classes/network egress |

| Activation proposals/execution | ai-activation-proposals.mjs + ai-activation-execution.mjs + activation-adapters.mjs + migrations 028-030 | AI Intelligence / Administration | proposal + execution boundary tests | execution default-off; Meta/Google audience and HubSpot/Zoho/Salesforce CRM adapters plus bounded Google Ads campaign-budget mutation; real provider credentials/approval remain required |


## Final hardening coverage

- Activation dispatch: migration 031 plus ai-activation-execution.mjs provide a bounded fence/lease; lifecycle mutations are blocked during an active dispatch and terminal writes require the owning fence.
- Provider egress: credential-bearing AI/activation requests reject redirects and activation URLs remain HTTPS/provider allowlisted.
- Google Ads budget safety: provider referenceCount must be a non-negative safe integer before shared-budget acknowledgement is evaluated.
- Knowledge degradation: malformed/non-finite embedding vectors are rejected from vector execution while authorized lexical retrieval remains available.

## Final review closure

| Requirement | Implementation | Evidence |
|---|---|---|
| analyst evidence minimization | `ai-analyst-tools.mjs` fixed experiment projection | `ai-analyst-tools.test.mjs` verifies arbitrary fields are stripped |
| vector compatibility | `knowledge.mjs` requires matching embedding dimensions for pgvector/application cosine | `ai-knowledge-authorization.test.mjs` dimension contract test |
| stale provider outcome reconciliation | migration 032 + `reconcileStaleActivationDispatches` + lifecycle guard | `ai-activation-execution.test.mjs` verifies expired dispatch becomes unknown and still blocks lifecycle changes |

