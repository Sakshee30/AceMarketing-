# Multi-model intelligence implementation status

Status is intentionally split into implementation, provider-access verification, training, evaluation, approval and deployment.

| Capability | Implemented | Access verified | Trained | Evaluated | Approved | Deployed |
|---|---:|---:|---:|---:|---:|---:|
| central registry/governance | yes | n/a | n/a | n/a | n/a | code on main |
| durable AI job boundary | yes | n/a | n/a | n/a | n/a | code on main |
| OpenAI analyst adapter | yes | no | n/a | no | no | no |
| Anthropic reviewer adapter | yes | no | n/a | no | no | no |
| Google multimodal/image adapters | yes | no | n/a | no | no | no |
| Google transcription/live voice | transcription adapter + governed live session/WebSocket relay | no | n/a | no | no | no |
| Voyage embeddings/rerank | yes | no | n/a | no | no | no |
| CatBoost classification | yes | n/a | no tenant artifact | code-level only | no | no |
| CatBoost future value | yes | n/a | no tenant artifact | code-level only | no | no |
| probability calibration | yes | n/a | fitted with classifier only when run | code-level only | no | no |
| seasonal-naive forecast | yes | n/a | n/a | baseline backtest implemented | baseline | optional service |
| Chronos-2 | inference pipeline + pre-provisioned pinned checkpoint enforcement | no checkpoint access verification | n/a | qualification path implemented; no tenant evidence | no | no |
| Meridian | fit/sampling/artifact pipeline | n/a | no tenant artifact | diagnostics path implemented; no tenant evidence | no | no |
| CausalForestDML | causal fit/effect/interval pipeline | n/a | per-run fit | code-level evaluation only; no tenant evidence | no | no |
| IsolationForest | yes | n/a | per-run fit | code-level only | no | optional service |
| sklearn HDBSCAN | yes | n/a | per-run fit | code-level only | no | optional service |
| LightGBM Ranker | yes | n/a | no tenant artifact | code-level only | no | no |
| governed activation execution | yes; durable worker + allowlisted audience/CRM/Google Ads budget adapters | n/a | n/a | code-level/failure-path tests | requires separate human approval | default-off; no provider action activated |

## Current blocking prerequisites

Live providers require account credentials, explicit live-call enablement and task qualification. Reviewer activation remains blocked because the exact requested `claude-fable-5-1` identifier is not currently verified in official Anthropic documentation; live account access and task evaluation/approval remain separate later gates. Chronos, Meridian and EconML code paths are implemented behind isolated service profiles; production qualification still needs the provisioned Chronos checkpoint and task-specific tenant data/evaluation. Provider-side activation execution is implemented but disabled by default; consent-aware audience sync, CRM writeback and a bounded Google Ads campaign-budget adapter are allowlisted. The budget adapter re-reads the exact budget resource, rejects stale approved amounts, enforces configured percentage/absolute caps, and requires explicit acknowledgement for shared budgets. None of these missing prerequisites are reported as successful completion.

## Final code-level hardening

The activation boundary now includes a database-backed dispatch lease/fence, delayed durable-job publication, fence-guarded finalization, model-lifecycle mutation guards, credentialed redirect rejection, and strict shared-budget reference-count validation. Knowledge retrieval validates provider vectors before pgvector/application-cosine use and degrades malformed vectors to authorized lexical retrieval instead of fabricating or failing semantic results. These controls do not turn external credentials, tenant evaluation evidence or production deployment into completed states.

## Final review hardening

The final safety review gaps are implemented in code:

- Analyst experiment evidence is projected through a fixed aggregate allowlist so arbitrary persisted fields are not exposed to the hosted analyst.
- Knowledge semantic retrieval requires query/stored embedding dimension compatibility; incompatible vectors fall back to authorized lexical retrieval rather than being mixed.
- Expired activation dispatch leases are atomically converted to an explicit unknown external outcome, their stale fence is invalidated, and model lifecycle changes remain blocked while that unknown outcome exists.
- The worker runs bounded stale-dispatch reconciliation before leasing new work.
- Migration `032_ai_activation_unknown_outcome.sql` persists the unknown-outcome state without pretending provider completion.

These controls still do not qualify providers, train tenant artifacts, approve models, or deploy production infrastructure without the required external evidence.

## Specialist model evaluation hardening

The specialist ML service now records additional task-specific evidence required by the implementation specification:

- IsolationForest deduplicates repeated entity IDs, enforces a configurable minimum-volume gate, and reports its decision threshold, flagged rate, and false-positive feedback capability.
- HDBSCAN reports cluster/noise counts, membership strength when available, and a deterministic small-perturbation adjusted-Rand stability diagnostic. Cluster IDs remain explicitly version-specific.
- LightGBM ranking trains only on exposed candidates and evaluates NDCG on held-out groups. When group timestamps are supplied, the holdout is time ordered; otherwise the input group order is preserved and reported. Position-context coverage is also reported.
- These evaluation signals remain evidence for qualification and do not automatically promote or deploy an artifact.



## Deployment traffic and operational qualification closure

The code now includes persisted per-tenant `off` / `shadow` / `canary` / `active` deployment controls, deterministic canary allocation, an explicit governed shadow-run endpoint, worker-recorded success/failure/unknown/cancelled observations, p95/error-rate health summaries, and an opt-in health guard that halts candidate traffic after configured threshold breaches. The audited model rollback operation remains separate from traffic halting.

Dedicated live-provider and real-Chronos smoke commands are implemented and intentionally require explicit environment opt-in. Their output is access/runtime evidence only and is not recorded as tenant qualification, approval or production deployment.


## AI monitoring closure

Tenant-scoped AI operations monitoring is now implemented through `backend/src/ai-monitoring.mjs` and `GET /api/ai/monitoring`. The snapshot reports queue state/age, cancellations and unknown outcomes, recent provider failures and latency, usage reservations, per-task result freshness, recorded evaluation/calibration/drift evidence, forecast interval coverage, anomaly false-positive feedback, and shadow/canary deployment health.

The monitoring contract does not fabricate missing quality evidence. Feature drift, calibration, delayed-label performance and measured forecast coverage are reported only when their task evaluation/backtest actually records those measurements. Monetary provider cost remains explicitly `not_configured` until a governed pricing/cost ledger exists.


## Feature-off and resilience closure

Worker execution now rechecks tenant task policy, platform policy, exact requested model identity, and the current deployment traffic mode immediately before hosted or ML execution. A task disabled after queue admission is cancelled before the provider/model call; shadow-only and narrowed canary changes are also enforced at execution time.

The resilience test suite verifies this fail-closed execution gate and asserts that durable AI queue state does not depend on Redis. Database-backed jobs remain authoritative; optional acceleration loss cannot silently create synthetic predictions. Queue/database unavailability continues to block durable AI work instead of reporting fake success.
