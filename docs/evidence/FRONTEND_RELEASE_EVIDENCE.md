# Frontend release evidence register

This register follows the SaaS Architecture Standard frontend release rules. It separates implemented controls from measured evidence and avoids treating architecture review as production qualification.

## Declared browser and device matrix

| Surface | Desktop | Mobile | Input / accessibility | Main CI |
| --- | --- | --- | --- | --- |
| Public website | Chromium | Pixel 7 / Chromium | keyboard smoke, semantic headings, consent dialog | Yes |
| Customer app | Chromium | Pixel 7 / Chromium | keyboard smoke, focus-managed dialogs, dirty-work protection | Yes |
| Compatibility shell | Chromium, Firefox, WebKit | Pixel 7 / Chromium | keyboard core-journey smoke | Scheduled matrix |

The scheduled matrix is the cross-engine compatibility signal. It does not replace manual assistive-technology verification.

## Performance evidence

The build pipeline records gzip bundle evidence for the compatibility shell, standalone customer app and standalone public site. Engineering targets are 250 KiB initial JavaScript, a 350 KiB review gate and 60 KiB initial CSS. Bundle size does not prove Core Web Vitals.

Required runtime evidence before a production qualification claim:
- LCP p75 <= 2.5 seconds on approved device/network segments.
- INP p75 <= 200 ms on approved device/network segments.
- CLS p75 <= 0.1.
- Multi-hour session memory evidence with representative navigation and realtime updates.
- Controlled chunk/preload failure recovery.
- Public-site canonical, robots, sitemap and broken-link evidence.

## Failure and recovery evidence already automated

- Offline/degraded connection status does not remove the active workspace.
- Missing lazy chunks use controlled recovery and never auto-loop refresh.
- Dirty customer drafts require explicit discard.
- Extracted feature mutation dialogs preserve keyboard focus and Escape behavior.
- Public-site requests use a public client boundary without customer Authorization or workspace headers.
- Customer standalone output is noindex/nofollow.

## Qualification status

Architecture and automated build/browser evidence are improving, but production qualification remains pending until field/lab performance, long-session memory, assistive-technology review and real deployment evidence are attached. This file must not be used to claim measured production capacity or certification.
