# Model verification

Verification has two independent dimensions: public documentation/capability verification and account/project access verification. Documentation verification never implies credential or quota access.

| Task | Requested assignment | Documentation state | Access state | Activation |
|---|---|---|---|---|
| analyst | OpenAI `gpt-6-astra` | exact identifier documented; Responses-based API path verified | not verified | blocked until credentials/evaluation/approval |
| recommendation_reviewer | Anthropic `claude-fable-5-1` | exact identifier not verified in official Anthropic documentation | not verified | blocked; no substitute |
| multimodal_extraction | Google `gemini-3.8-flash` | verified | not verified | blocked until credentials/evaluation |
| embedding | Voyage `voyage-4-large` | identifier and `POST /v1/embeddings` documented | not verified | blocked until credentials/evaluation |
| reranking | Voyage `rerank-2.5` | identifier and `POST /v1/rerank` documented | not verified | blocked until credentials/evaluation |
| call_transcription | Google `gemini-3.5-transcribe` | verified; Files API + Interactions API transport documented | not verified | blocked until provider-specific media path and credentials |
| live_voice | Google `gemini-3.8-live-extended-thinking` | verified; Live API/WebSocket capability documented | not verified | blocked until secure session transport and credentials |
| creative_image | Google `gemini-3-pro-image` | verified | not verified | blocked until credentials/evaluation |
| forecast_primary | `amazon/chronos-2` | assignment present in implementation; revision pin is mandatory | local checkpoint access not verified | optional forecasting profile |
| specialist ML | requested CatBoost / sklearn / LightGBM / Meridian / EconML components | dependency contracts and service implementations present | runtime dependent | never auto-promoted |

Official documentation checked on 2026-09-29:
- OpenAI API platform/pricing/model documentation for `gpt-6-astra`.
- Google Gemini model, transcription, Files, and Live API documentation.
- Voyage embeddings and reranker API documentation.
- Anthropic official documentation search did not establish the exact requested `claude-fable-5-1` identifier.

No unavailable requested model is silently replaced.
