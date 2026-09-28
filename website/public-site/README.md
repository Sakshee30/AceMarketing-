# Public website composition

Canonical owner for AceMarketing public product discovery, pricing presentation, resources, legal content, case studies, industry/agent/integration discovery, consent-aware lead capture and demo flows.

This migration preserves the existing customer-visible public behavior while separating it from the authenticated customer application. The compatibility root in `frontend/src/AcePlatform.tsx` lazy-loads this application until the public website receives its own standalone build entry.

Frontend completion gates still include:
- standalone public build output and deployment identity;
- explicit route cache/render policy;
- canonical/robots/sitemap/metadata policy;
- public-form abuse/rate-limit evidence;
- accessibility and Core Web Vitals evidence;
- independent failure behavior when customer-app chunks or optional customer features fail.
