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
| governed activation execution | yes; durable worker + allowlisted existing adapters | n/a | n/a | code-level/failure-path tests | requires separate human approval | default-off; no provider action activated |

## Current blocking prerequisites

Live providers require account credentials, explicit live-call enablement and task qualification. Reviewer activation remains blocked because the exact requested `claude-fable-5-1` identifier is not currently verified in official Anthropic documentation; live account access and task evaluation/approval remain separate later gates. Chronos, Meridian and EconML code paths are implemented behind isolated service profiles; production qualification still needs the provisioned Chronos checkpoint and task-specific tenant data/evaluation. Provider-side activation execution is implemented but disabled by default; only existing consent-aware audience sync and CRM writeback adapters are allowlisted, while budget changes remain blocked pending a verified provider-specific adapter. None of these missing prerequisites are reported as successful completion.
