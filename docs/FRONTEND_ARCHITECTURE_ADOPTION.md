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

### Accessible navigation
- Workspace exposes a keyboard-accessible skip link.
- Workspace tab changes update the document title.
- Active-page changes are announced through an ARIA live region.
- Focus moves to the active page heading after intentional section navigation.
- Page headings accept programmatic focus and retain visible focus styling.

### Existing integrity controls preserved
AceMarketing already contains backend-confirmed state handling for critical approvals, alerts, reporting, routing, billing, consent, meetings, integrations and activation workflows. Those controls remain intact.

## Next incremental frontend work

1. Extract lightweight route/feature manifests from the monolithic composition without moving feature behavior.
2. Add reusable design-system state primitives for loading, empty, error, degraded, forbidden and stale states.
3. Introduce an owned transport error model and request cancellation support without changing endpoint semantics.
4. Add feature-owned mutation-state helpers for IDLE / VALIDATING / SUBMITTING / CONFIRMED / REJECTED / CONFLICT / UNKNOWN.
5. Split expensive sections behind lazy feature loaders after bundle evidence identifies the highest-value chunks.
6. Introduce draft/dirty-work protection for long builders and forms before route/workspace changes.
7. Add automated accessibility coverage for keyboard flow, dialogs, focus recovery and mobile navigation.
8. Add bundle-budget reporting and long-session memory evidence to CI.

## Completion rule

A frontend feature is not considered complete because the screen renders. Completion requires the happy path, validation/denied path, failure path, recovery path, compatibility/migration behavior and release evidence appropriate to that feature.
