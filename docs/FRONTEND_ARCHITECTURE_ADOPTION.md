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

### Route contract and direct-link hardening
- Workspace features now declare stable route IDs, canonical hashes, titles, breadcrumbs, telemetry IDs, workspace/auth requirements, error-boundary policy and unsaved-work policy.
- Direct links such as `#/workspace?tab=Settings` now resolve the requested workspace feature instead of relying only on browser-local active-tab state.
- Workspace navigation writes canonical route state so links are shareable and browser history can reconcile feature selection.
- The manifest remains lightweight and does not eagerly import the monolithic feature implementation.

### Dirty-work and draft-loss protection
- A shared dirty-work registry now protects route changes, workspace switches and browser/tab closure.
- Workspace Settings tracks server-confirmed values separately from current edits and warns only when confirmed values differ from unsaved edits.
- The media Planner marks changed scenario budgets as unsaved until the scenario is confirmed by the backend.
- The custom model builder registers an in-progress draft while its creation surface is open.
- The protection is additive: existing forms, endpoints and feature behavior remain in place.

### Accessible dialog and builder protection
- A shared focus-managed dialog primitive now owns dialog semantics, initial focus, Escape handling, backdrop dismissal, focus trapping and focus restoration.
- Data Flow creation, Audience Builder, custom-model creation/validation and workspace creation now use the shared dialog primitive without removing their existing workflows.
- Data Flow and Audience Builder surfaces now register in-progress drafts with the shared dirty-work guard, so workspace/route changes cannot silently discard work.
- Playwright coverage verifies Audience Builder dialog semantics, initial focus, explicit discard protection and focus restoration after Escape.

### Frontend dependency boundary enforcement
- CI now scans frontend source for backend/server imports, Node-only modules, PostgreSQL imports and server-secret patterns.
- The current monolithic `AcePlatform.tsx` has a temporary migration ceiling so new work cannot grow the legacy composition indefinitely.
- The check warns above the current 500 KB extraction threshold and fails if the temporary 600 KB ceiling is crossed.
- This is a migration control, not a claim that feature extraction is complete.

### Runtime transport integration
- The shared browser transport now consumes the already-validated runtime API base path and bounded read/write deadlines.
- Existing endpoint semantics and request cancellation behavior are preserved.

### New frontend verification
- Playwright now verifies a direct workspace feature URL and confirms that unsaved Settings edits block accidental navigation until the operator explicitly accepts discard.
- `npm run frontend:architecture` provides a fast dependency-boundary check.
- `npm run frontend:verify` composes architecture, TypeScript, production build and bundle-budget evidence.

### Passive connectivity truth
- The shared transport now publishes health transitions from real application requests instead of adding a dedicated polling loop.
- Browser offline state is shown explicitly while preserving the current page and unsaved work.
- Network failure or timeout is shown as degraded connectivity rather than falsely claiming confirmed backend failure.
- A later successful application request clears the degraded state; HTTP validation/auth/conflict responses still prove the transport itself is reachable.
- Playwright coverage verifies that going offline surfaces the warning without destroying the active workspace view.

### Startup and polling pressure reduction
- The optional dashboard navigator is now a lazy-loaded chunk rather than mandatory startup JavaScript.
- Its failure is contained in a widget-level boundary, so a chunk/widget problem does not remove the application shell.
- Dashboard readiness polling now pauses while the browser tab is hidden and resumes on visibility return.
- The ~30-second refresh cadence is staggered with jitter to reduce synchronized browser refresh spikes.
- Overlapping dashboard-summary refreshes are prevented inside the navigator.
- This keeps the existing navigator feature and backend endpoint intact while reducing startup and background request pressure.

### Chunk and release recovery
- AceMarketing now listens for Vite preload/chunk failures and surfaces a bounded recovery notice instead of automatically reloading.
- The recovery path explicitly preserves dirty-work protection; reload occurs only after the operator accepts leaving unsaved work.
- There is no automatic reload loop.
- CI now verifies that every Vite manifest asset exists and that emitted JavaScript/CSS assets use content-hashed names.
- Nginx now serves the entry document with no-store/revalidation semantics while Vite's hashed /assets/ files receive a one-year immutable cache policy and missing asset requests return 404 rather than application HTML.
- Old-asset retention across deployments still depends on deployment strategy and is not claimed complete until release infrastructure preserves the declared open-tab compatibility window.

### First feature extraction from the legacy composition
- Human Approvals is now the first complete workspace feature moved out of `AcePlatform.tsx` into an owned feature directory.
- The feature has its own manifest, public entry point, page implementation, browser data adapter and ownership README.
- `AcePlatform.tsx` no longer contains a second Approvals implementation; it lazy-loads the feature through its public entry point.
- Existing route identity, CSS classes, backend endpoints, approval semantics and customer-visible recovery behavior remain unchanged.
- Workspace route metadata now reports Approvals as a `feature-chunk` while all not-yet-extracted surfaces remain explicitly marked `current-composition`.
- CI now fails if the legacy Approvals function is reintroduced into the monolith and verifies the extracted files exist.
- Playwright verifies `#/workspace?tab=Approvals` still resolves to the extracted feature.

### Second feature extraction: Monitoring
- Monitoring is now the second workspace surface moved out of `AcePlatform.tsx` into a feature-owned lazy chunk.
- It has its own manifest, public entry point, page implementation, browser data adapter and ownership README.
- The existing monitoring summary/rules endpoints, CSS classes, usage meters and Alert Center navigation behavior are unchanged.
- The extraction is intentionally read-only first, which keeps operational observation separate from later write-control hardening.
- CI rejects reintroduction of a legacy `Monitoring` function in the monolith and verifies the extracted feature structure.
- Playwright verifies the existing direct route `#/workspace?tab=Monitoring` resolves to the extracted feature.

### Third feature extraction: Alerts
- Alert Center is now the third workspace surface extracted from `AcePlatform.tsx` into a feature-owned lazy chunk.
- It owns its manifest, public entry point, page implementation, browser data adapter and ownership README.
- Existing alert list/resolve endpoints, CSS classes and investigation navigation are preserved.
- Alert resolution now uses the shared mutation lifecycle so network loss or timeout becomes an explicit unknown outcome instead of a false confirmed failure.
- Conflict responses remain distinct from rejection, and the operator is instructed to refresh authoritative state before repeating an uncertain resolution.
- CI rejects reintroduction of the legacy `Alerts` function and Playwright verifies the existing direct route.

### Fourth feature extraction: Reports
- Reports is now the fourth workspace feature extracted from `AcePlatform.tsx` into a feature-owned lazy chunk.
- It owns its manifest, public entry point, page implementation, browser data adapter and ownership README.
- Existing cohort analytics, schedule creation, delivery history, source-quality presentation, CSS classes and direct route are preserved.
- "Send now" now uses the shared mutation lifecycle so timeout/network loss produces an explicit unknown outcome instead of claiming that durable delivery definitely failed.
- Schedule creation also distinguishes an uncertain network outcome from a confirmed rejection and instructs the operator to refresh before resubmitting.
- CI rejects reintroduction of the legacy `Reports` function and Playwright verifies the existing direct route.

### Fifth feature extraction: Executive Briefs
- Executive Briefs is now the fifth workspace feature extracted from `AcePlatform.tsx` into a feature-owned lazy chunk.
- It owns its manifest, public entry point, page implementation, browser data adapter and ownership README.
- Existing cohort/report endpoints, metric definitions, preview behavior, schedule history, email transport status and direct route are preserved.
- The executive schedule form now registers unsaved work with the shared dirty-work registry, so route/workspace changes and browser unload cannot silently discard an edited brief.
- Schedule creation and send-now delivery distinguish timeout/network uncertainty from confirmed rejection; an uncertain outcome requires authoritative refresh before repeat submission.
- CI rejects reintroduction of the legacy `ExecutiveBriefs` function and Playwright verifies the existing direct route.

### Bundle-budget evidence
- Vite now emits a build manifest.
- CI calculates gzip size for each entry and all of its static dependencies.
- The architecture targets are recorded as <=250 KiB gzip initial JavaScript, 350 KiB review gate and <=60 KiB initial CSS.
- During the non-destructive migration the CI job is evidence/report mode so existing oversized composition is surfaced without blocking unrelated fixes.
- The gate will move to strict mode after high-value feature splitting/lazy loading reduces the startup graph below the review threshold.

## Frontend completion sequence before backend architecture changes

1. Continue extracting feature-owned page/data/form boundaries from the monolithic composition without moving or deleting working behavior.
2. Adopt shared state primitives across the remaining high-traffic workspace surfaces.
3. Migrate the remaining critical writes to the explicit mutation lifecycle one feature at a time.
4. Extend dirty-work protection from Settings/Planner/model drafts to Data Flows, Audiences, Launchpad and other long-form builders.
5. Split expensive sections behind lazy feature loaders according to measured bundle evidence.
6. Add broader automated accessibility coverage for dialogs, keyboard alternatives, focus recovery, zoom/reflow and mobile navigation.
7. Add long-session memory/listener/subscription evidence and convert bundle-budget CI from report to strict review-gate mode.
8. Separate the public website into its own deployable composition without duplicating product behavior, preserving current URLs through compatibility routing during migration.
9. Only after the frontend acceptance evidence is green begin the backend architecture tightening phase.

## Completion rule

A frontend feature is not considered complete because the screen renders. Completion requires the happy path, validation/denied path, failure path, recovery path, compatibility/migration behavior and release evidence appropriate to that feature.
