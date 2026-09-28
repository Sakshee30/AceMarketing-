# Approvals frontend feature

This directory is the first customer-workspace feature extracted from the legacy `AcePlatform.tsx` composition.

## Ownership

- `pages/ApprovalPage.tsx` owns approval-page presentation and customer-visible decision/recovery states.
- `data/approvals.api.ts` owns the feature's browser transport calls.
- `feature.manifest.ts` owns stable feature identity and route metadata.
- `public.ts` is the supported feature entry point used by application composition.

The existing backend approval endpoints and product behavior are unchanged. The page is lazy-loaded by the current workspace composition so extraction reduces the monolith without introducing a second active implementation.
