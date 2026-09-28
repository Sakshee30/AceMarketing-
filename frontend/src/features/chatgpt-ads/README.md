# ChatGPT Ads frontend feature

This feature owns the customer-facing ChatGPT Ads conversion measurement workspace.

## Ownership

- `pages/ChatGPTAdsPage.tsx` owns provider readiness, conversion payload editing, validation, live submission, matching evidence and delivery history.
- `data/chatgpt-ads.api.ts` owns browser access to ChatGPT Ads status, validation and submission commands.
- `feature.manifest.ts` owns stable route, permission, dirty-work and release-boundary metadata.
- `public.ts` is the supported application-composition entry.

The extraction preserves the current ChatGPT Ads APIs, visual classes, delivery workflow and cross-feature navigation. Draft payloads participate in dirty-work protection, load failures preserve already-visible evidence, and timeout/network loss during live conversion submission is shown as an unknown outcome until authoritative delivery state is refreshed.
