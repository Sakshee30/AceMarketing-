# Launchpad frontend feature

This feature owns the customer-facing workspace onboarding and readiness surface.

## Ownership

- `pages/LaunchpadPage.tsx` owns readiness presentation, step navigation, test-event feedback and recovery states.
- `data/launchpad.api.ts` owns browser access to launchpad evidence and the synthetic readiness event.
- `feature.manifest.ts` owns stable route, permission and release-boundary metadata.
- `public.ts` is the supported application-composition entry.

The extraction preserves the existing Launchpad endpoint behavior, CSS classes, direct workspace route and cross-feature navigation. Backend failures remain visible and retryable; the UI does not present a failed test event as successful.
