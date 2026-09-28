# Overview frontend feature

This feature owns the customer-facing acquisition command center.

## Ownership

- `pages/OverviewPage.tsx` owns readiness, workspace-health, quick-action, funnel and recent-activity presentation.
- `data/overview.api.ts` owns browser access to dashboard summary, live-sync and funnel evidence.
- `feature.manifest.ts` owns stable route, permission and release-boundary metadata.
- `public.ts` is the supported application-composition entry.

The extraction preserves current routes, CSS classes, backend endpoints and cross-feature navigation. Polling pauses while the browser tab is hidden, failures are explicit and retryable, and previously loaded evidence is preserved during transient refresh failures.
