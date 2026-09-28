# Alerts frontend feature

This feature owns the customer-facing Alert Center.

## Ownership

- `pages/AlertsPage.tsx` owns incident triage, resolution feedback and recovery states.
- `data/alerts.api.ts` owns browser access to alert list and resolve operations.
- `feature.manifest.ts` owns stable feature identity and route metadata.
- `public.ts` is the supported application-composition entry.

The existing alert endpoints, CSS classes and cross-workspace navigation events are preserved. Resolution now uses the shared mutation lifecycle so timeout/network loss is treated as an unknown outcome until authoritative state is refreshed.
