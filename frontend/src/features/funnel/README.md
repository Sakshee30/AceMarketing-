# Funnel frontend feature

This feature owns the customer-facing channel, account and campaign funnel workspace.

## Ownership

- `pages/FunnelPage.tsx` owns funnel filters, stage flow, campaign drill-down, export and failure/loading presentation.
- `data/funnel.api.ts` owns browser access to the funnel read contract.
- `feature.manifest.ts` owns stable route, permission and release-boundary metadata.
- `public.ts` is the supported application-composition entry.

The extraction preserves the existing funnel endpoint, filter semantics, campaign selection, CSV export, CSS classes and route. Rapid filter changes are sequence-guarded so an older response cannot overwrite a newer selection, and refresh failures preserve already-visible evidence while exposing an explicit retry path.
