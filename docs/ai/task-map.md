# AI task implementation map

This map separates code implementation from live/provider qualification. A row marked implemented does not imply trained, evaluated, approved or deployed.

| Task | Assignment | Adapter/service | Main routes | UI | Persistence/artifact | Tests/evidence | Remaining prerequisite |
|---|---|---|---|---|---|---|---|
| analyst | OpenAI `gpt-6-astra` | `backend/src/ai-providers.mjs`, `ai-runtime.mjs` | `POST /api/ai/analysis`, generic hosted task route | AI Intelligence / Analyst | `ace_ai_results`, provider request tracking | hosted input, registry, result-contract tests | provider access, qualified evaluation, approval, deployment |
| recommendation_reviewer | Anthropic `claude-fable-5-1` | `ai-providers.mjs` | `POST /api/ai/tasks/recommendation_reviewer/submit` | governed task API / administration | `ace_ai_results` | registry verifies exact requested identifier stays blocked | official identifier/capability verification plus provider access |
| multimodal_extraction | Google `gemini-3.8-flash` | `ai-providers.mjs` | generic hosted task route | AI Intelligence / Media | typed result + object references where applicable | hosted input validation | provider access, evaluation, approval, deployment |
| embedding | Voyage `voyage-4-large` | `ai-providers.mjs`, `knowledge.mjs` | knowledge ingestion/search + hosted task route | Knowledge | knowledge source/chunk/index metadata | governance/object-store/knowledge contract paths | provider access + deployed compatible vector/index backend |
| reranking | Voyage `rerank-2.5` | `ai-providers.mjs`, `knowledge.mjs` | knowledge search + hosted task route | Knowledge | retrieval result lineage | hosted validation | provider access + retrieval evaluation |
| call_transcription | Google `gemini-3.5-transcribe` | `ai-providers.mjs`, `ai-governance-store.mjs` | hosted task route, transcript listing | AI Intelligence / Media, Calls | `ace_ai_transcripts`, object store | hosted input/object-store tests | authorized media + provider access + transcription evaluation |
| live_voice | Google `gemini-3.8-live-extended-thinking` | `live-voice.mjs` | live voice session create/status/terminate + WS relay | Calls | `ace_ai_live_voice_sessions` | bounded session implementation | provider access, explicit live-voice flag, evaluation/approval/deployment |
| creative_image | Google `gemini-3-pro-image` | `ai-providers.mjs`, `ai-governance-store.mjs` | hosted task + creative asset review | AI Intelligence / Creatives | `ace_ai_creative_assets`, object store | hosted validation, object-store tests | provider access + authorized review; remains draft until approved |
| lead_qualification | CatBoostClassifier | Python ML service | dataset training, artifact scoring | Predictions, Models | tenant artifact + calibrated result | ML pipeline + shared contracts | tenant mature data, evaluation, promotion/deployment |
| paid_conversion | CatBoostClassifier | Python ML service | dataset training, artifact scoring | Predictions, Models | separate tenant artifact + calibrated result | ML tests | tenant mature conversion labels + evaluation |
| customer_churn | CatBoostClassifier | Python ML service | dataset training, artifact scoring | Predictions, Models | separate tenant artifact + calibrated result | ML tests | horizon/business definition + mature labels |
| future_customer_value | CatBoostRegressor | Python ML service | dataset training, artifact scoring | Predictions, Models | horizon-specific artifact + regression result | ML tests | 90d/180d target data + evaluation |
| forecast_primary | `amazon/chronos-2` | Python forecasting profile | `/api/ai/ml/forecast/chronos-2` | Forecasts | typed forecast record, pinned revision/hash | forecast contract tests | `CHRONOS2_REVISION`, checkpoint availability, evaluation |
| forecast_challenger | CatBoostRegressor | Python forecasting profile | CatBoost challenger route | Forecasts | typed forecast record + fitted artifact | incomplete future-covariate failure test | sufficient history + backtest/evaluation |
| forecast_baseline | seasonal-naive | Python core ML | seasonal-naive route | Forecasts | typed baseline forecast record | deterministic baseline tests | valid series/history only |
| marketing_mix | Meridian | Python MMM profile | `/api/ai/ml/marketing-mix` | Specialists / MMM evidence | `ace_ai_marketing_mix_records`, inference artifact | diagnostics contract path | real media/outcome/control data + healthy diagnostics |
| incrementality | CausalForestDML | Python causal profile | `/api/ai/ml/incrementality` | Specialists / causal evidence | `ace_ai_causal_records` | overlap/assumption pipeline paths | documented treatment/outcome/covariates + sufficient overlap |
| anomaly_detection | IsolationForest | Python ML service | anomaly run + triage routes | Specialists / anomaly triage | `ace_ai_anomaly_items` | domain-result persistence | tenant feature data + threshold/usefulness evaluation |
| behavioral_segments | sklearn HDBSCAN | Python ML service | segmentation run + snapshot/member routes | Specialists / segment snapshots | snapshot + membership tables | domain persistence | cohort data + stability review |
| offer_ranking | LGBMRanker | Python ML service | ranking train/score + ranking read | Specialists / ranked offers | ranking items + artifact | exposure-aware pipeline tests | grouped exposure/relevance data + evaluation |
| probability_calibration | CalibratedClassifierCV | fitted component inside classifiers | classifier training/scoring | Models/Predictions | calibration artifact/reference | classification pipeline tests | separate calibration split and sufficient classes |

## Cross-cutting controls

All task execution is subject to tenant authorization, task policy enablement, concurrency limits, monthly usage reservation, exact model identity, lifecycle state and durable-job semantics. High-risk activation is a separate immutable proposal/approval workflow and is not performed by the reviewer or model result itself.
