# Frontend support and evidence matrix

This annex defines the browser/device/network scope used for frontend qualification. It intentionally separates automated evidence from production field evidence.

## Browser policy

AceMarketing supports the current stable and immediately previous stable release of Chrome/Edge (Chromium), Firefox and Safari at the time of each production release. The release record captures the exact browser versions tested by Playwright. Unsupported or materially older engines receive best-effort behavior rather than an unverified compatibility claim.

## Device and input policy

Automated core journeys cover:
- desktop keyboard + pointer;
- Pixel 7 mobile/touch profile;
- responsive layouts at customer/public/control boundaries;
- focus-managed dialogs and Escape close behavior;
- reduced-motion preference where CSS/animation is present.

Manual release evidence remains required for:
- VoiceOver on macOS/iOS;
- NVDA on Windows;
- 200% zoom and reflow review;
- high-contrast/forced-colors review;
- representative slow-4G/high-latency network profile.

## Performance policy

Field target at p75:
- LCP <= 2.5s;
- INP <= 200ms;
- CLS <= 0.1.

The browser instrumentation records LCP, CLS, FCP, TTFB, observed interaction latency, long tasks and resource count into a bounded in-memory buffer. It emits no customer identifiers, tokens, secrets or business payloads.

Lab checks may use the 4.0s LCP / 0.25 CLS review thresholds to catch severe regressions, but they do not prove field Core Web Vitals.

## Long-session policy

The scheduled Chromium soak exercises repeated customer-workspace navigation for up to 120 minutes and samples JS heap, DOM node count and event listeners through the DevTools performance domain. It is a regression signal, not proof of absence of every leak.

Production qualification remains pending until field telemetry, assistive-technology review and real-deployment evidence are attached to the release.
