# AdSync frontend feature

This feature owns the customer-facing server-side signal activation workspace.

## Ownership

- `pages/AdSyncPage.tsx` owns conversion-pipeline presentation, quick installs, enable/pause, test-event workflows, delivery evidence and recovery states.
- `data/adsync.api.ts` owns browser access to event rules, delivery evidence and tracking commands.
- `feature.manifest.ts` owns stable route, permission, unsaved-work and release-boundary metadata.
- `public.ts` is the supported application-composition entry.

The extraction preserves the existing event-rule, tracking and delivery endpoints, CSS classes and cross-feature navigation. Pipeline creation and state changes distinguish confirmed success from network/timeout uncertainty, and the builder now uses the shared accessible dialog plus dirty-work protection.
