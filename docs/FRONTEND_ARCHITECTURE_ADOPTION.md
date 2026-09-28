# AceMarketing Frontend Architecture Adoption

This document records the incremental adoption of the uploaded **Unified SaaS Platform Architecture Standard v2.0** for the existing AceMarketing frontend.

## Non-destructive migration rule

AceMarketing keeps the current product pipeline and all existing product features. Architecture improvements are introduced incrementally around working behavior. We do not create a second active frontend tree for the same feature, and we do not perform a one-shot folder rewrite simply to resemble the target diagram.

## Current adoption

### Application and route failure containment
- Global application render boundary wraps the React product.
- Existing workspace-section boundary remains in place for feature containment.
- A failed workspace feature cannot remove sidebar navigation or the rest of the customer shell.
- Recovery UI provides retry and full-application reload paths without claiming backend data was changed.
- The pre-JavaScript HTML now contains a useful startup state so bundle/bootstrap failure does not leave a blank page.

### Public runtime configuration safety
- The browser validates public runtime configuration before mounting the customer application.
- Only same-origin relative API base paths are accepted by the public configuration helper.
- Release ID and environment are exposed as public root metadata for support/telemetry correlation.
- Request timeout values are bounded to prevent accidental zero/unbounded browser deadlines.

### Accessible navigation
- Workspace exposes a keyboard-accessible skip link.
- Workspace tab changes update the document title.
- Active-page changes are announced through an ARIA live region.
- Focus moves to the active page heading after intentional section navigation.
- Page headings accept programmatic focus and retain visible focus styling.

### Reusable customer-state primitives
- Shared loading, empty, error, forbidden, degraded and stale states now exist as owned frontend primitives.
- State primitives preserve honest language and expose a consistent accessible action affordance.
- Feature teams can adopt these incrementally without replacing existing feature behavior.

### Mutation lifecycle contract
- A reusable lifecycle helper now models IDLE, VALIDATING, SUBMITTING, CONFIRMED_SUCCESS, CONFIRMED_REJECTION, CONFLICT and OUTCOME_UNKNOWN.
- Operation IDs are generated independently from button state so feature mutations can reconcile lost acknowledgements without treating a timeout as confirmed failure.
- Existing critical mutations remain unchanged until each feature is migrated and verified.

### Workspace scope isolation
- Workspace switching now uses confirm-before-commit behavior.
- The target workspace ID is verified through the backend before its label becomes active.
- Previous workspace content is hidden during verification instead of being relabeled as the target workspace.
- Failed verification restores the prior workspace identity and provides explicit retry/stay actions.
- A successful workspace switch increments a scope generation and remounts the active feature so old feature state cannot be reused under the new workspace.
- Dashboard summary polling is generation-scoped and restarts after confirmed workspace changes.

### Shared transport and request budgets
- The shared browser transport now owns a bounded request deadline.
- Every request has a client correlation ID and an internal AbortController.
- Transport cancellation produces a normalized aborted state; deadline expiry produces a distinct timeout/unknown-confirmation state.
- Workspace switching cancels in-flight old-scope browser requests before resolving the new scope.
- Existing endpoint semantics are unchanged; the transport tightening is additive.

### Lightweight workspace feature manifest
- A canonical lightweight manifest now inventories every existing workspace surface without moving or deleting feature implementations.
- Stable feature IDs and route IDs are separated from labels so later route extraction can happen incrementally.
- The manifest marks long-form surfaces that require dirty-work protection before navigation behavior is migrated.
- Existing `AcePlatform.tsx` composition remains authoritative until each feature slice is extracted and verified.

### First critical mutation migration
- Human Approvals is the first critical write surface migrated to the explicit frontend mutation lifecycle.
- Confirmed backend decisions are distinct from rejection, conflict and outcome-unknown states.
- Network loss or request timeout no longer gets presented as a confirmed failure; the UI instructs the operator to refresh authoritative state before repeating the decision.
- Existing approval endpoint semantics remain unchanged; end-to-end idempotency will require the later backend contract phase and is not claimed as complete yet.

### Bundle-budget evidence
- Vite now emits a build manifest.
- CI calculates gzip size for each entry and all of its static dependencies.
- The architecture targets are recorded as <=250 KiB gzip initial JavaScript, 350 KiB review gate and <=60 KiB initial CSS.
- During the non-destructive migration the CI job is evidence/report mode so existing oversized composition is surfaced without blocking unrelated fixes.
- The gate will move to strict mode after high-value feature splitting/lazy loading reduces the startup graph below the review threshold.

## Frontend completion sequence before backend architecture changes

1. Extract lightweight route/feature manifests from the monolithic composition without moving feature behavior.
2. Adopt shared state primitives across the highest-traffic workspace surfaces.
3. Migrate critical writes to the explicit mutation lifecycle one feature at a time.
4. Add dirty-work/draft protection to long forms and builders.
5. Split expensive sections behind lazy feature loaders according to measured bundle evidence.
6. Add automated accessibility coverage for keyboard flow, dialogs, focus recovery and mobile navigation.
7. Add long-session memory evidence and convert bundle-budget CI from report to strict review-gate mode.
8. Only after the frontend acceptance evidence is green begin the backend architecture tightening phase.

## Completion rule

A frontend feature is not considered complete because the screen renders. Completion requires the happy path, validation/denied path, failure path, recovery path, compatibility/migration behavior and release evidence appropriate to that feature.
