# Executive Briefs frontend feature

This feature owns the customer-facing executive metric brief surface.

## Ownership

- `pages/ExecutiveBriefsPage.tsx` owns preview, scheduling, send-now feedback and recovery states.
- `data/executive-briefs.api.ts` owns browser access to cohorts and report scheduling/delivery commands.
- `feature.manifest.ts` owns stable feature identity and route metadata.
- `public.ts` is the supported application-composition entry.

The extraction preserves existing report endpoints, CSS classes, metric definitions, direct route, email transport status and delivery history. Draft changes are protected from accidental navigation, and uncertain send/schedule outcomes are not presented as confirmed failures.
