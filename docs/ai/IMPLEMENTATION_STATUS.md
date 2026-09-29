# Multi-model intelligence implementation status

Status is intentionally split into implementation, provider-access verification, training, evaluation, approval and deployment.

| Capability | Implemented | Access verified | Trained | Evaluated | Approved | Deployed |
|---|---:|---:|---:|---:|---:|---:|
| central registry/governance | yes | n/a | n/a | n/a | n/a | code on main |
| durable AI job boundary | yes | n/a | n/a | n/a | n/a | code on main |
| OpenAI analyst adapter | yes | no | n/a | no | no | no |
| Anthropic reviewer adapter | yes | no | n/a | no | no | no |
| Google multimodal/image adapters | yes | no | n/a | no | no | no |
| Google transcription/live voice | transport gate only | no | n/a | no | no | no |
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

## Current blocking prerequisites

Live providers require account credentials, explicit live-call enablement and task qualification. Reviewer activation requires live account access plus task evaluation/approval; the exact requested Anthropic identifier is now documented. Chronos, Meridian and EconML need their optional service profiles plus task-specific data/evaluation. None of these missing prerequisites are reported as successful completion.
