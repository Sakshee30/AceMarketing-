# Model verification

Verification has two independent dimensions: public documentation/capability verification and account/project access verification.

| Task | Requested assignment | Documentation state | Access state | Activation |
|---|---|---|---|---|
| analyst | OpenAI `gpt-6-astra` | identifier seen; exact capability verification incomplete | not verified | blocked |
| recommendation_reviewer | Anthropic `claude-fable-5-1` | exact identifier not verified | not verified | blocked; no substitute |
| multimodal_extraction | Google `gemini-3.8-flash` | verified | not verified | blocked until credentials/evaluation |
| embedding | Voyage `voyage-4-large` | verified | not verified | blocked until credentials/evaluation |
| reranking | Voyage `rerank-2.5` | verified | not verified | blocked until credentials/evaluation |
| call_transcription | Google `gemini-3.5-transcribe` | verified | not verified | provider-specific media path still required |
| live_voice | Google `gemini-3.8-live-extended-thinking` | verified | not verified | provider-specific streaming path still required |
| creative_image | Google `gemini-3-pro-image` | verified | not verified | blocked until credentials/evaluation |
| forecast_primary | `amazon/chronos-2` | assignment verified | local checkpoint access not verified | optional forecasting profile |
| specialist ML | requested CatBoost / sklearn / LightGBM / Meridian / EconML components | dependency contract implemented | runtime dependent | never auto-promoted |

No unavailable requested model is silently replaced.
