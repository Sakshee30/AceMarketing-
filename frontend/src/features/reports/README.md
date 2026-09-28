# Reports frontend feature

This feature owns the customer-facing cohort analytics and automated report scheduling surface.

## Ownership

- `pages/ReportsPage.tsx` owns report presentation, schedule creation, send-now feedback and recovery states.
- `data/reports.api.ts` owns browser access to cohorts, report schedules and delivery commands.
- `feature.manifest.ts` owns stable feature identity and route metadata.
- `public.ts` is the supported application-composition entry.

The extraction preserves the existing cohort/report endpoints, CSS classes and direct workspace route. Report delivery now uses the shared mutation lifecycle so timeout/network loss is treated as an unknown outcome until delivery history is refreshed.
