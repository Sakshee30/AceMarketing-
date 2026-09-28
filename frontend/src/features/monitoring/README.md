# Monitoring frontend feature

This feature owns the customer-facing Monitoring workspace surface.

## Ownership

- `pages/MonitoringPage.tsx` owns presentation and read-only operational states.
- `data/monitoring.api.ts` owns browser data access for monitoring summary and rules.
- `feature.manifest.ts` owns stable feature identity and route metadata.
- `public.ts` is the supported application-composition entry.

The extraction preserves the existing monitoring endpoints, CSS classes, Alert Center navigation event and customer-visible behavior. The feature is lazy-loaded by the workspace composition.
