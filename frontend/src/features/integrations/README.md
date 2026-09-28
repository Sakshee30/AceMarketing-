# Integrations frontend feature

This feature owns the customer-facing connector catalog, OAuth/server-secret setup, custom integration builder, WhatsApp operations and connector request workflow.

## Ownership

- `pages/IntegrationsPage.tsx` owns integration presentation and customer workflow state.
- `data/integrations.api.ts` owns browser access to connector, custom-integration and WhatsApp operations.
- `feature.manifest.ts` owns stable feature identity and route metadata.
- `public.ts` is the supported application-composition entry.

The extraction preserves existing endpoints, CSS classes, connector catalog behavior, provider authorization redirects, custom connector builder, WhatsApp operations and the existing direct workspace route. Open connector/configuration workflows register with the shared dirty-work protection so navigation cannot silently discard an in-progress setup.
