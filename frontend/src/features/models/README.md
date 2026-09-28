Models owns the scoring model catalog, transparent custom model builder, validation evidence and scoring runs.

Current frontend contract:
- Existing `/models`, `/models/run` and `/models/validation` endpoints remain authoritative.
- Catalog and validation reads are cancellable and sequence-guarded so stale responses cannot overwrite newer workspace evidence.
- Initial loading, empty, read-error, mutation-conflict and outcome-unknown states are explicit.
- Model and run payloads are typed at the feature boundary instead of flowing through the page as `any`.
- Statistical qualification is not inferred from a successful scoring run. The UI distinguishes runtime readiness from evaluation evidence.
- Optional governance/readiness fields are rendered only when the backend supplies them; missing provider/model verification is never fabricated in the browser.
- Create/run actions use the shared mutation lifecycle and the custom-model draft remains navigation-protected.

Existing endpoints and workspace behavior are preserved; this feature does not introduce a parallel model runtime or bypass the current AceMarketing pipeline.
