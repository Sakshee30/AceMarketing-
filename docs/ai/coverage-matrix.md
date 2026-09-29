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

## Specialist evaluation closure

| Requirement | Implementation | Evidence |
|---|---|---|
| anomaly minimum-volume / dedup / threshold evidence | `AnomalyRequest.minimum_volume` + IsolationForest post-processing | ML tests cover insufficient volume and duplicate suppression |
| segmentation stability / noise handling | deterministic perturbation ARI, noise fraction and membership-strength diagnostics | ML test asserts stability output |
| exposure-aware ranking evaluation | LightGBM trains on exposed candidates and evaluates on held-out groups, time ordered when timestamps exist | ML test verifies time-ordered train/holdout split and artifact creation |



## Deployment qualification controls

| Requirement | Implementation | Evidence / remaining prerequisite |
|---|---|---|
| shadow deployment | `ai-deployment-controls.mjs` + `POST /api/ai/tasks/{task}/shadow` | explicit shadow jobs are tagged and normal traffic is blocked in shadow mode |
| canary traffic limit | deterministic tenant/task/request bucket with persisted canary percentage | `ai-deployment-controls.test.mjs`; real tenant rollout evidence still required |
| operational health | worker writes deployment observations; API returns error rate, p95 and sample count | production traffic required for representative evidence |
| rollback support | threshold guard can halt candidate traffic; registry rollback remains explicit and audited | real rollback exercise remains a deployment prerequisite |
| live provider smoke | `scripts/ai/live-provider-smoke.mjs` | requires explicit credentials, live-call enablement and bounded budget |
| real Chronos smoke | `scripts/ai/checkpoint-smoke.mjs` | requires provisioned pinned checkpoint and isolated forecasting service |


## AI quality and operations monitoring

| Requirement | Implementation | Evidence / limitation |
|---|---|---|
| freshness / queue age / cancellations | `ai-monitoring.mjs` reads tenant-scoped AI jobs and latest results | `ai-monitoring.test.mjs` verifies queue age and freshness semantics |
| provider errors / latency / uncertain outcomes | provider-request outcomes and observed request duration | unknown/submitted requests are surfaced for reconciliation, not treated as success |
| usage / cost | usage reservations and reconciled units | units are reported; monetary cost is null until pricing/cost accounting is configured |
| calibration / drift / delayed labels | latest evaluation metrics when actually persisted | unavailable metrics remain null; no fabricated quality score |
| interval coverage | persisted forecast nominal/measured coverage and gap | appears only after evaluated backtests produce measured coverage |
| anomaly false positives | investigator triage feedback summarized as reviewed false-positive rate | requires human triage evidence |
| canary health | deployment observations + `ai-deployment-controls.mjs` health | representative production evidence remains an external prerequisite |
| admin surface | AI Intelligence / Administration monitoring panel | loading/error state uses the existing page-level state model |


## Failure and recovery controls

| Requirement | Implementation | Evidence |
|---|---|---|
| feature-off blocks new work | tenant/platform policy admission gate | governance tests |
| feature-off stops already queued/leased work | policy disable marks queued work cancelled and worker rechecks policy before provider/model execution | `ai-resilience.test.mjs` |
| shadow/canary changes after admission | worker execution gate rechecks current deployment mode/allocation | `ai-resilience.test.mjs` |
| Redis loss | durable AI job, usage and result state remains database-backed with no Redis dependency in queue/worker execution | source-level resilience assertion |
| database/queue unavailable | durable submission/worker startup fails closed rather than fabricating completion | existing queue/runtime guards + resilience coverage |
| provider unknown outcome | explicit `unknown_outcome` state and reconciliation path | durable-job and activation execution tests |


## ML verification evidence

| Requirement | Implementation | Evidence |
|---|---|---|
| Python formatting check | `ruff format --check ml-service/src ml-service/tests` | ML CI |
| Python type check | bounded `mypy ml-service/src/acemarketing_ml` with untyped-body checking | ML CI |
| Python lint | `ruff check` | ML CI |
| skipped-test reasons | `pytest -q -rs` | ML CI reports skip reasons separately from pass count |
| specialist dependency-profile changes | `deploy/Dockerfile.ml-specialist` included in ML CI path trigger | workflow trigger |
| model integration tests | existing small-fit and contract tests remain in `ml-service/tests` | pytest stage; no test gates weakened |
