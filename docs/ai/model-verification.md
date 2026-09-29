# Model verification

Documentation verification, credential/account access verification, evaluation qualification, approval and deployment are independent states.

| Task | Requested implementation | Documentation state |
|---|---|---|
| analyst | OpenAI gpt-6-astra | recorded in registry; access separately verified |
| recommendation_reviewer | Anthropic claude-fable-5-1 | official Anthropic material documents the API identifier; live account access and qualification remain separate |
| multimodal_extraction | Google gemini-3.8-flash | adapter implemented |
| embedding | Voyage voyage-4-large | adapter implemented |
| reranking | Voyage rerank-2.5 | adapter implemented |
| call_transcription | Google gemini-3.5-transcribe | adapter implemented |
| live_voice | Google gemini-3.8-live-extended-thinking | dedicated streaming relay implemented |
| creative_image | Google gemini-3-pro-image | adapter implemented |
| lead_qualification | CatBoostClassifier | fitted tenant artifact required |
| paid_conversion | CatBoostClassifier | fitted tenant artifact required |
| customer_churn | CatBoostClassifier | fitted tenant artifact required |
| future_customer_value | CatBoostRegressor | horizon-specific fitted artifact required |
| forecast_primary | amazon/chronos-2 | pinned revision required before inference |
| forecast_challenger | CatBoostRegressor | fitted lag/covariate artifact required |
| forecast_baseline | seasonal-naive | deterministic baseline |
| marketing_mix | Meridian | fitted diagnostics/evaluation required |
| incrementality | CausalForestDML | causal prerequisites/evaluation required |
| anomaly_detection | IsolationForest | fitted/evaluated artifact required |
| behavioral_segments | sklearn HDBSCAN | fitted/versioned membership snapshot required |
| offer_ranking | LGBMRanker | grouped/exposure-aware evaluation required |
| probability_calibration | CalibratedClassifierCV | fitted calibration component |

Documentation verification sources checked 2026-09-29: OpenAI GPT-6 Astra model reference, Anthropic Claude Fable 5.1 product/API page, Google Gemini 3.8 Flash / 3.5 Transcribe / 3.8 Live Extended Thinking / 3 Pro Image model references, and Voyage embedding/reranker references. Documentation presence is not account access.\n\nProvider verification endpoint: `POST /api/ai/providers/:task/verify`. It is intended for explicitly authorized bounded tests only and does not qualify or deploy a route.
