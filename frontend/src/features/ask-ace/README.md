# Ask Ace frontend feature

Owns the grounded journey and attribution assistant inside the authenticated customer workspace.

The feature preserves starter prompts, live workspace answers, journey timelines, follow-up questions and the existing `/ask-ace` backend route while strengthening the frontend evidence boundary.

Current frontend contract:
- Ask responses use typed answer, insight, journey, evidence, warning and engine fields instead of unbounded page-level `any`.
- In-flight analysis is cancellable when the feature unmounts so an abandoned route does not keep browser work alive.
- Conversation and journey history remain bounded for long-running browser sessions.
- Failed analysis requests remain explicit and never substitute sample metrics.
- Evidence IDs, analysis warnings and evidence type labels render only when the backend supplies them.
- Ask Ace is explicitly presented as the current grounded workspace-analysis baseline; hosted analyst/reviewer activation is not implied by the frontend.
- Provider/model readiness, access, evaluation and policy state must come from the future backend registry/governance pipeline before the UI may present those routes as active.

No duplicate assistant runtime is introduced by this feature. Existing workspace data sources and backend authorization remain authoritative.
