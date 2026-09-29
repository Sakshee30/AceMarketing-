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
