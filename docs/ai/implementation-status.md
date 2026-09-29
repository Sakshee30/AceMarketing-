# Multi-model intelligence implementation status

Last updated: 2026-09-29

This document records implementation state separately from provider access, training, evaluation, approval and deployment. A configured route or passing mock is not evidence of production qualification.

## Implemented foundations

- Central typed model assignment registry with hosted, pretrained, fitted, calibration and deterministic-baseline categories.
- Durable AI job submission through PostgreSQL-backed jobs, usage reservation and outbox records.
- Hosted-provider execution outside request/database transaction callbacks.
- Provider-request tracking including confirmed, failed and unknown external outcomes.
- Tenant-scoped model lifecycle store with evaluation, promotion, deployment, rollback and provider-access verification gates.
- Point-in-time dataset creation and immutable training submission.
- Metric catalog with exact event mappings, date-window semantics, zero-denominator handling and mixed-currency blocking.
- Specialist Python ML service contracts for CatBoost classification/regression, calibration, seasonal-naive forecasting, Chronos-2, CausalForestDML, Meridian, IsolationForest, HDBSCAN and LGBMRanker.
- Knowledge ingestion/retrieval path using Voyage embeddings/reranking when the configured deployment supports it.
- Governed live-voice session lifecycle.
- Governed hosted-task submission endpoint for analyst, recommendation reviewer, multimodal extraction, embeddings, reranking, transcription and creative image generation.
- Frontend API clients for AI jobs, results, datasets, knowledge and governed hosted-task submission.
- Customer-facing AI Intelligence workspace for grounded analyst jobs, forecast candidates, point-in-time datasets, knowledge management, persisted result history and registry state.
- Complete docs/ai runbook set covering architecture, verification, features/labels, APIs, evaluation, deployment, security and requirement coverage.

## Hosted task endpoint

POST `/api/ai/tasks/:task/submit`

Supported task names:
- analyst
- recommendation_reviewer
- multimodal_extraction
- embedding
- reranking
- call_transcription
- creative_image

`live_voice` intentionally uses the dedicated live-voice session endpoint.

Every hosted submission is gated by:
1. documented identifier/capability verification,
2. live provider access verification,
3. qualified evaluation,
4. approval,
5. deployment.

Missing prerequisites return a blocked response instead of silently substituting a model.

## Qualification state

The repository implementation must not be described as fully production-qualified until the following evidence exists per task:

| Area | Implementation | Provider access | Trained | Evaluated | Approved | Deployed |
|---|---|---|---|---|---|---|
| Analyst / OpenAI | implemented | environment-dependent | n/a | required | required | required |
| Recommendation reviewer / Anthropic | adapter implemented; requested identifier remains blocked until verified | not verified | n/a | required | required | required |
| Google multimodal | implemented | environment-dependent | n/a | required | required | required |
| Voyage embedding/reranking | implemented | environment-dependent | n/a | required | required | required |
| Google transcription | implemented | environment-dependent | n/a | required | required | required |
| Google live voice | implemented | environment-dependent | n/a | required | required | required |
| Google creative image | implemented | environment-dependent | n/a | required | required | required |
| Tenant ML estimators | implemented pipelines | n/a | tenant-data dependent | required | required | required |
| Seasonal-naive baseline | implemented | n/a | n/a | baseline evidence required | baseline | available |

## Required production prerequisites

- Real provider credentials and explicit `AI_LIVE_PROVIDER_CALLS=true` only in authorized environments.
- Successful bounded provider verification per configured account/project/region.
- Tenant datasets meeting maturity and class/sample requirements.
- Versioned evaluation evidence that passes predeclared task thresholds.
- Human/authorized promotion and deployment decisions.
- Production object storage, secrets, database, queue and service networking.
- Opt-in live-provider/checkpoint smoke tests.
- CI evidence for lint/typecheck/build/unit/integration/browser tests.

## Verification commands

Run in a checked-out branch:

```bash
npm run check:backend
npm run test:ai-backend
npm run check:frontend
npm run build:frontend
```

For Python service checks use the commands documented in `ml-service/pyproject.toml` and the deployment runbook. Live provider tests must remain opt-in and budget-bounded.

## Safety boundary

No code path should treat missing ML output as permission to invent a numerical prediction with an LLM. Reviewer output is not action authorization. Generated creatives remain drafts until approved. Activation side effects continue to require the existing deterministic approval and consent boundary.
