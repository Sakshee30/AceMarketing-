# AceMarketing

AceMarketing is a first-party marketing intelligence, activation, enrichment and attribution platform being implemented from the workflow and product concepts documented in the EasyInsights material supplied for this project.

The implementation stays on the **main** branch. No parallel implementation branch is required for the current build.

## Current implementation status

### Marketing website
- Responsive enterprise SaaS landing page
- Lead-quality, conversion-leakage and attribution problem framing
- Journey-stitching + agent operating model
- AdSync, Enrich and Klarity-style core modules
- 11-agent catalogue
- Integration ecosystem
- Industry/use-case sections
- Case-study presentation for EdTech, healthcare, high-AOV commerce and home services
- Diagnostic section for business, tracking/data quality and ad optimization
- Demo-request form
- Login experience

### Product workspace
The interactive workspace currently includes:
- Overview / acquisition command center
- AdSync
- Conversion Event Manager
- Customer Journeys
- Full-path Attribution
- Enrich / lead grading
- Agent Library
- Integrations
- Audience Management
- Monitoring
- Workspace Settings

### API foundation
A local zero-dependency Node API is included at `server/index.mjs`.

Available demo endpoints:
- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/demo-requests`
- `GET /api/workspace/overview`
- `GET /api/integrations`
- `GET /api/events`
- `GET /api/journeys`
- `GET /api/attribution`
- `GET /api/agents`
- `GET /api/audiences`
- `GET /api/monitoring`

The Vite development server proxies `/api` to `http://127.0.0.1:3001`.

## Run locally

Install packages:

```bash
npm install
```

Terminal 1 — API:

```bash
npm run api
```

Terminal 2 — frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The API health endpoint is:

```text
http://localhost:3001/api/health
```

## Build and type-check

```bash
npm run check
npm run build
```

## Functional architecture

```text
Paid click / organic / direct / offline source
                 ↓
     GCLID / FBCLID / first-party IDs
                 ↓
      Web / App / WhatsApp / Calls
                 ↓
          Identity stitching
                 ↓
              CRM Lead
                 ↓
      Enrichment + lead grading
                 ↓
       Funnel-agent automation
                 ↓
 Qualification / consultation / booking
                 ↓
              Revenue
                 ↓
       Full-path attribution
                 ↓
   Conversion adjustment / signal return
                 ↓
 Google / Meta / LinkedIn optimization
                 ↓
  Audience activation and suppression
```

## EasyInsights parity areas represented

The supplied product material describes:
- stitching online and offline customer journeys;
- server-side conversion activation;
- Google offline/enhanced conversions;
- Meta CAPI-style conversion delivery;
- CRM-context enrichment;
- call and WhatsApp attribution;
- audience activation and suppression;
- continuous event synchronization;
- full-path attribution;
- prebuilt funnel agents.

Those capabilities are represented in the current AceMarketing product UI and API foundation.

## Production work still required

This repository now has the front-end product experience and API contract foundation, but the following are still required before calling it production-ready:

1. Persistent database and migrations
2. Real user authentication and RBAC
3. Workspace and tenant isolation
4. OAuth for Google, Meta, LinkedIn, CRM and messaging connectors
5. Secure credential vault / secret management
6. Tracking SDK and server-side event ingestion
7. Identity graph / deterministic stitching
8. GCLID and FBCLID persistence
9. Real Google ECL/OCI delivery
10. Real Meta Conversions API delivery
11. Retry queues, dead-letter handling and idempotency
12. CRM ingestion and stage mapping
13. WhatsApp and telephony ingestion
14. Attribution computation engine
15. Audience synchronization workers
16. Agent runtime and approval workflow
17. Audit logs and compliance controls
18. Monitoring/alerting and operational dashboards
19. Billing and usage metering
20. Automated tests, CI/CD and production deployment

## Brand and IP note

AceMarketing reproduces comparable product workflows, capabilities, navigation patterns and visual direction under its own identity. Third-party proprietary source code, logos, screenshots, customer marks and copyrighted assets are not bundled into this repository unless separately licensed or provided with permission.


## Latest parity implementation

This pass adds brochure-driven parity for AdSync operations:

- **Channel / campaign funnel mapping** with stage-level counts from lead through booking.
- **24×7 live sync view** for CRM, calling, WhatsApp and advertising-platform signal transfer.
- **Brochure expected-impact section** covering the five AdSync improvement levers and the supplied 45% compounded-impact model.
- **Browser tracking SDK foundation** that persists GCLID/FBCLID and sends page/event payloads to the local API without blocking UX.
- **`POST /api/track`** ingestion endpoint.
- **`GET /api/funnel`** and **`GET /api/live-sync`** API endpoints.

### Tracking example

```ts
import { track } from './src/lib/tracker'

track({
  event: 'qualified_lead',
  customerId: 'crm-123',
  value: 0,
  currency: 'INR',
  properties: { stage: 'Qualified' }
})
```

Click identifiers are captured from the landing-page query string and persisted in browser storage for subsequent events. This is an implementation foundation; production use still requires consent handling, server-side identity storage, secure hashing, idempotency, queueing, retries, and real destination APIs.


## Offline attribution and connectivity parity

The current implementation now also covers the brochure's offline-conversion patterns:

- **Call attribution** using telephony timestamps matched against active website sessions and persisted click identifiers.
- **WhatsApp attribution** using persisted GCLID/FBCLID plus lead phone association.
- **Partial-payment conversion adjustment** for high-consideration journeys.
- **Platform-agnostic integration grouping** across CRM, WhatsApp/marketing, calling, website/app, advertising and analytics categories.
- New workspace tab: **Offline Attribution**.
- New endpoint: **`GET /api/offline-attribution`**.

The integration UI is now grouped to match the supplied brochure's connectivity structure instead of presenting one flat connector list.

### Current workspace navigation

```text
Overview
AdSync
Funnel
Events
Live Sync
Offline Attribution
Journeys
Attribution
Enrich
Agents
Integrations
Audiences
Monitoring
Settings
```


## Current public-site parity pass

This pass was aligned against the current EasyInsights public homepage and pricing flow (checked September 2026), while preserving AceMarketing branding.

Implemented:
- Top benchmark/reference banner matching the public site's current 45% uplift positioning, clearly labeled as an external parity reference.
- Agent impact labels updated to mirror the metrics currently published on the EasyInsights public site.
- Agent category filters: **Lead Quality**, **Conversion**, and **Visibility**.
- Public proof-reference cards for Leverage Edu, India IVF and Blue Tokai, clearly labeled so the outcomes are not represented as AceMarketing customer results.
- Dedicated **Pricing / Stack Builder** page:
  - monthly lead-volume selector;
  - data-location selection;
  - data-challenge selection;
  - advertising-channel selection;
  - recommended-agent selection;
  - selected stack summary;
  - custom-quote state instead of invented prices.

The public pricing source exposes the configurator structure but not stable numeric agent prices in the crawled HTML, so AceMarketing intentionally shows **Custom quote** rather than fabricating pricing values.

### IP / claims handling

UI structure, information architecture and workflows are being reproduced for functional parity. EasyInsights trademarks, copyrighted screenshots, proprietary source code and customer logos are not copied into the repository. Third-party performance figures are labeled as public reference metrics rather than AceMarketing performance claims.


## Brochure parity pass: case-for-change, signal consoles, security targets

This pass implements additional brochure sections that were not yet represented in the product:

- **Case for Change** section with six lead-generation market/funnel problems from the supplied proposal, paraphrased into AceMarketing language.
- **Trusted EdTech reference strip** using text-only brand names from the brochure; no third-party logo artwork is copied.
- **AdSync platform signal consoles** for Google Ads, Meta CAPI and WhatsApp event visibility using original/synthetic UI rather than copied screenshots.
- **Conversion adjustment explanation** showing how low-value or partial events can be reclassified before being used for optimization.
- **Security & compliance parity targets** for ISO 27001, SHA-256, GDPR, HIPAA and India DPDP. These are explicitly labeled roadmap/implementation targets unless independently verified.
- New API endpoints:
  - `GET /api/signal-console`
  - `GET /api/security-posture`

### Why the compliance badges are labeled as targets

The supplied brochure visually presents certification/compliance badges on its closing page. AceMarketing does not claim those certifications merely because the reference product shows them. The UI now represents them as parity targets so the product stays accurate while the actual controls, audits and certifications are built and verified.


## Public website parity pass: demo, company and resources

This pass expands AceMarketing beyond the landing page and workspace into the public-site information architecture currently visible on EasyInsights:

- Dedicated **Book a Demo** page with:
  - monthly digital marketing budget;
  - burning pain point;
  - company/work-email capture;
  - local date/time scheduling UI ready for Calendly or another scheduling API.
- Dedicated **Company** page with operating principles and a custom-services section.
- Dedicated **Resources** page with implementation-guide surfaces for custom events, server-side activation, attribution, CRM enrichment, offline conversion tracking and audience operations.
- Marketing header/footer navigation now links to Company, Resources, Pricing, Demo, Login and the product.
- Added `GET /api/resources`.

The public EasyInsights demo page currently emphasizes junk-lead reduction, lead quality, CRM/ad-platform connectivity, intuitive UI, setup speed and usage-based/flexible pricing. AceMarketing mirrors that page structure and workflow without copying third-party images, addresses, logos, or proprietary text verbatim.


## Parity pass: detailed case studies, custom events and automated monitoring

This pass adds three brochure-driven areas that were still shallow:

- Dedicated **Case Studies** page with paraphrased implementation patterns for:
  - Apollo Ayurvaid — call attribution + WhatsApp conversions;
  - Jaro Education — high-volume OCI/ECL and LeadSquared stage mapping;
  - GemPundit — GCLID persistence through WhatsApp and partial-payment adjustments;
  - Berger Paints — server-side CAPI, CTWA custom events and automated monitoring.
- **Conversion Event Manager** now includes:
  - pricing-page lead;
  - high-value purchase;
  - prepaid order;
  - fulfilled order;
  - returned order;
  - partial payment;
  - conversion-adjustment mappings and deduplication patterns.
- **Monitoring** now includes configurable alert-rule surfaces for:
  - delivery-rate degradation;
  - GCLID coverage loss;
  - CRM sync latency;
  - stale audience syncs;
  - token expiry;
  - failed-event queue growth.

New API endpoints:
- `GET /api/case-studies`
- `GET /api/event-templates`
- `GET /api/monitoring-rules`

All case-study results are labeled/reference-framed so they are not represented as AceMarketing customer claims.


## Public-site parity pass: diagnostics, privacy controls and resource utilities

This pass adds current EasyInsights public-site structures that were not yet represented:

- Expanded root-cause diagnostics from three to six groups:
  - business & operations;
  - tracking & data quality;
  - ad-platform optimization;
  - attribution & measurement;
  - audience & personalization;
  - privacy, consent & compliance.
- Added a **data ownership / privacy control plane** section.
- Added an interactive **cookie-preferences banner** with Necessary, Analytics, Advertising and Functionality categories.
- Added **`POST /api/consent-preferences`**.
- Added resource utilities inspired by public EasyInsights resource categories:
  - interactive ROAS calculator;
  - local SHA-256 PII hashing utility that runs entirely in the browser.
- Added internal Privacy, Terms and Security page components for product/legal completion.

The current EasyInsights site publicly presents these diagnostic groups, a data-ownership/security section, resource tools including a ROAS calculator and no-cloud hashing concept, and granular cookie categories. AceMarketing implements equivalent functionality and information architecture without copying EasyInsights branding, third-party artwork or proprietary source code.


## Public-site parity pass: AI-in-action, fourth proof pattern, and source reconciliation

This pass adds additional elements from the current EasyInsights public site:

- Added the fourth public proof pattern:
  - **Jaro Education: +41% enrolment rate** (shown as an external reference metric, not an AceMarketing claim).
- Added an **AI in Action** section with original workflow visuals showing:
  - Lead Grading;
  - CRM Enrichment;
  - Voice Lead Qualification;
  - Voice Scheduler;
  - Meeting Reminder;
  - closure match-back and signal return.
- Updated the Company principles to align more closely with the current EasyInsights About Us framing:
  - try to solve hard data problems;
  - product thinking rooted in performance-marketing reality;
  - implementation should match the real customer funnel, not a demo template.
- Added a visible **source-conflict note** for Shopify support because the current EasyInsights demo page says Shopify ecommerce is unsupported while the supplied brochure lists Shopify as an available integration. AceMarketing preserves the connector as planned and records the discrepancy instead of silently overriding either source.

New API endpoints:
- `GET /api/ai-action`
- `GET /api/source-notes`


## Parity pass: solution categories, behavior tracking, feed enhancement and exclusion audiences

This pass adds product areas currently highlighted across the EasyInsights public site and first-party-data use cases:

- Dedicated **Solutions** page for:
  - Agency;
  - Lead Generation;
  - Enterprise;
  - Mid-Market Brand;
  - Attribution Model;
  - Alerts & Monitoring;
  - Server-to-Server Integration.
- New workspace **Behavior** module:
  - first-party page/session events;
  - pricing-page and form behavior;
  - WhatsApp/call CTA behavior;
  - journey sequence and intent enrichment.
- New workspace **Feed** module:
  - custom customer/product/event attributes;
  - destination payload coverage;
  - schema guardrails.
- **Audience** module expanded with lifecycle audiences and waste-control exclusions, including device-ID style suppression.
- New marketing section covering:
  - website behavior;
  - dynamic audience creation/suppression;
  - device/identity exclusion;
  - feed enhancement with custom attributes.

New API endpoints:
- `GET /api/behavior`
- `GET /api/feed`
- `GET /api/solutions`

These additions are based on the current EasyInsights public descriptions of first-party data activation, website behavior, dynamic audience creation/suppression, device-ID exclusion patterns, feed enhancement and solution categories. AceMarketing implements comparable workflows with its own code and UI.


## Parity pass: operational agents, Ask Ace and integration connection workflow

This pass converts several previously static surfaces into functional product workflows:

- **Agent Operations** replaces the static agent-card grid with:
  - 11-agent selector;
  - active/available state;
  - enable/disable control;
  - human-approval / low-risk auto-run / autonomous modes;
  - trigger configuration surface;
  - shared journey context;
  - recent agent-run history.
- New **Ask Ace** workspace module:
  - natural-language questions over funnel, revenue, attribution and audience context;
  - starter questions;
  - API-backed answers with structured insight cards.
- **Integrations** now includes a working three-step connection wizard:
  - authorize scopes;
  - map identity, click-ID, lifecycle and revenue fields;
  - enable sync;
  - connected-state updates in the UI.

New API endpoints:
- `POST /api/ask-ace`
- `POST /api/integrations/connect`

These workflows are grounded in the supplied brochure's 11-agent model and one-click/platform-agnostic connectivity framing.
