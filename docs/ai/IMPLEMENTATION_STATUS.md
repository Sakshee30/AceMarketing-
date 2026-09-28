# Multi-model intelligence implementation status

Status is intentionally split into implementation, provider-access verification, training, evaluation, approval and deployment.

| Capability | Implemented | Access verified | Trained | Evaluated | Approved | Deployed |
|---|---:|---:|---:|---:|---:|---:|
| central registry/governance | yes | n/a | n/a | n/a | n/a | code on main |
| durable AI job boundary | yes | n/a | n/a | n/a | n/a | code on main |
| OpenAI analyst adapter | yes | no | n/a | no | no | no |
| Anthropic reviewer adapter gate | yes | no | n/a | no | no | no |
| Google multimodal/image adapters | yes | no | n/a | no | no | no |
| Google transcription/live voice | transport gate only | no | n/a | no | no | no |
| Voyage embeddings/rerank | yes | no | n/a | no | no | no |
| CatBoost classification | yes | n/a | no tenant artifact | code-level only | no | no |
| CatBoost future value | yes | n/a | no tenant artifact | code-level only | no | no |
| probability calibration | yes | n/a | fitted with classifier only when run | code-level only | no | no |
| seasonal-naive forecast | yes | n/a | n/a | baseline backtest implemented | baseline | optional service |
| Chronos-2 | dependency/registry boundary | no checkpoint verification | no | no | no | no |
| Meridian | dependency/registry boundary | n/a | no | no | no | no |
| CausalForestDML | dependency/registry boundary | n/a | no | no | no | no |
| IsolationForest | yes | n/a | per-run fit | code-level only | no | optional service |
| sklearn HDBSCAN | yes | n/a | per-run fit | code-level only | no | optional service |
| LightGBM Ranker | yes | n/a | no tenant artifact | code-level only | no | no |

## Current blocking prerequisites

Live providers require account credentials, explicit live-call enablement and task qualification. Reviewer activation additionally requires the exact requested Anthropic identifier to be verified. Chronos, Meridian and EconML need their optional service profiles plus task-specific data/evaluation. None of these missing prerequisites are reported as successful completion.
