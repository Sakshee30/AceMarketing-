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


## Parity pass: Launchpad onboarding and deep workspace settings

This pass adds the missing configuration layer between sign-in and day-to-day workspace operations.

### Launchpad
The product now opens on a six-step Launchpad:
1. Workspace profile
2. Connect data
3. Map funnel stages
4. Install tracking
5. Test signal delivery
6. Activate agents

Launchpad includes readiness progress, connector status, funnel-stage mapping, tracking installation guidance, synthetic signal testing and agent activation.

### Workspace settings
The previous settings card grid is now a working settings console with:
- Workspace profile
- Users & roles
- Tracking configuration
- Governance + audit history
- API keys & outbound webhooks
- Agent approval boundaries
- Notifications
- Billing & usage

New API endpoints:
- `GET /api/launchpad`
- `POST /api/launchpad`
- `GET /api/settings`
- `GET /api/audit-log`
- `POST /api/api-keys`

This implements the product setup path required to make the brochure's one-click integrations, stitched journey, signal return and agent activation usable as one coherent workspace flow.


## Parity pass: identity resolution, journey detail, deeper Enrich and custom agent builder

This pass fills additional core product gaps around the brochure's "stitch the journey" and agent-customization model.

- New **Identity** workspace:
  - customer-level identity graph;
  - customer ID, CRM ID, GCLID, FBCLID, hashed email/phone and device identifiers;
  - deterministic matching rules;
  - identity-confidence and merge-review surfaces.
- **Journeys** now has a selectable journey-detail view with chronological cross-source events and identity keys.
- **Attribution** now compares first-touch, last-touch, linear and full-path credit on the same closed-revenue journey.
- **Enrich** now includes call-transcript and WhatsApp context so CRM enrichment reflects the brochure's point that sales should not qualify with only a name and phone number.
- **Agents** now includes a Custom Agent Builder for trigger, action and approval-policy configuration.

New API endpoints:
- `GET /api/identity`
- `POST /api/agents/custom`

### CI correction

The first GitHub Actions run failed before install because `actions/setup-node` was configured with npm caching but the repository does not contain a dependency lock file. The CI workflow has been corrected to remove the lockfile-dependent cache setting; it still runs install, type-check and production build on `main`.


## Parity pass: human approval inbox and multi-workspace operations

This pass strengthens the human-in-the-loop operating model and agency / multi-brand workflow.

### Human approval inbox
A new **Approvals** workspace module now provides:
- pending agent-action queue;
- risk category and impact level;
- evidence available to the reviewer;
- explicit approve / reject decisions;
- decision state retained in the UI;
- support for customer-contact, audience-suppression, CRM-write and ad-platform-write approvals.

This connects the Agent Operations approval policies to an actual review workflow instead of leaving approval as a settings-only concept.

### Multi-workspace switching
The product sidebar now includes a functional workspace switcher with:
- production and sandbox workspaces;
- active-workspace state;
- workspace environment labels;
- create-workspace entry point.

New API endpoints:
- `GET /api/approvals`
- `POST /api/approvals/decision`
- `GET /api/workspaces`

The latest CI run on `main` passed before this implementation pass. New commits will trigger CI again automatically.


## Parity pass: cohort reporting and automated email reports

This pass adds reporting capabilities supported by EasyInsights' current public Company page and attribution positioning.

### Reports workspace
A new **Reports** module now includes:
- scheduled reports;
- automated email / stakeholder delivery;
- cohort performance analysis;
- quality-adjusted media-planning recommendations;
- report preview and summary metrics;
- CSV export surface;
- delivery cadence, recipient, lookback and failure-alert configuration.

The first report templates are:
- Executive MBA Cohort;
- Paid Funnel Performance;
- Attribution Summary;
- Lead Quality by Campaign.

### Connector catalog cleanup
Integration labels were aligned to the supplied brochure where the previous implementation had drifted:
- added **Meritto** to CRM platforms;
- corrected **Bitespeed**;
- added **AiSensy**;
- removed the non-brochure Gallabox placeholder from that catalog section.

New API endpoints:
- `GET /api/reports`
- `POST /api/reports/send-test`

EasyInsights' current Company page publicly describes Cohort Reports for strategic media planning and Automated Email Reports as custom/data services. AceMarketing now represents equivalent product workflows directly in the workspace.


## Parity pass: tracking and data-quality diagnostics

This pass adds a dedicated **Diagnostics** workspace for the tracking/data-quality problems emphasized on EasyInsights' current public site.

The module now covers:
- duplicate conversions;
- missing GCLID / FBCLID coverage;
- cross-domain continuity breaks;
- late CRM outcomes;
- schema mismatches and quarantined events;
- Event Match Quality / identifier coverage;
- validate → deduplicate → match → send → confirm delivery health;
- root-cause recommendations;
- replay queue for corrected events.

New API endpoints:
- `GET /api/diagnostics`
- `POST /api/diagnostics/replay`

The EasyInsights public site specifically calls out misfiring conversions, duplicate events, broken cross-domain/chatbot event flow, and lack of a single source of truth under "Tracking & Data Quality Issues." AceMarketing now provides an operational workspace for diagnosing those failure modes rather than only describing them on the marketing site.


## Parity pass: Alert Center and developer / webhook operations

This pass extends the real-time sync and custom integration capabilities into operational developer tooling.

### Alert Center
New **Alerts** workspace module includes:
- active critical/warning/info queue;
- alert detail and source;
- acknowledge/resolve flow;
- alert timeline;
- routing metadata;
- automated retry / runbook context.

### Developer & webhook console
New **Developers** workspace module includes:
- server-to-server API quick-start example;
- outbound webhook signing configuration;
- HMAC-SHA256 signing model;
- delivery logs with HTTP status and latency;
- failed-delivery retry;
- event catalog;
- idempotency, retry, dead-letter and schema-versioning reliability rules.

New API endpoints:
- `GET /api/alerts`
- `POST /api/alerts/resolve`
- `GET /api/webhooks/deliveries`
- `POST /api/webhooks/retry`
- `POST /api/webhooks/secret/rotate`

This expands the brochure/public-site real-time synchronization and custom-integration concepts into concrete operational surfaces. The public EasyInsights Company page describes Server-to-Server Integration as a custom data service, while the brochure describes live 24×7 transfer; AceMarketing now has workspace tooling around those patterns.


## Parity pass: voice qualification, scheduling, reminders and feedback operations

This pass operationalizes four brochure-listed conversion agents that were previously represented only in the generic agent library:

- **Voice Lead Qualification**
  - live qualification call queue;
  - intent score;
  - transcript context;
  - structured next action;
  - retry / follow-up queue.
- **Voice Scheduler**
  - upcoming consultation list;
  - owner/calendar context;
  - scheduling state.
- **Meeting Reminder**
  - T−24h, T−3h, T−30m and no-show recovery workflow;
  - no-show risk;
  - manual reminder trigger.
- **Feedback Agent**
  - post-call / post-meeting / WhatsApp feedback;
  - satisfaction score;
  - objection themes;
  - routing into sales, recovery and campaign insight workflows.

New workspace tabs:
- `Calls`
- `Meetings`
- `Feedback`

New API endpoints:
- `GET /api/qualification-calls`
- `POST /api/qualification-calls/retry`
- `GET /api/meetings`
- `POST /api/meetings/remind`
- `GET /api/feedback`

The supplied EasyInsights brochure lists Voice Lead Qualification, Voice Scheduler, Meeting Reminder and Feedback as distinct agents. AceMarketing now provides dedicated operational surfaces for each of those workflows instead of leaving them as cards only.

This pass also corrects missing icon imports used by prior workspace additions (Alerts, Developers, Approvals and workspace creation), reducing the risk of runtime reference errors.


## Parity pass: site/pixel operations and custom models

This pass adds two more EasyInsights-style capabilities that were still only implicit in the platform.

### Site & pixel operations
A new **Sites** workspace now includes:
- tracked production and sandbox domains;
- first-party pixel status;
- server-side connection status;
- event coverage;
- consent enforcement;
- GCLID / FBCLID persistence;
- installation snippet;
- event receipt checks;
- cross-domain continuity map;
- installation test workflow;
- bot filtering, deduplication, schema quarantine and PII-hashing guardrails.

EasyInsights' public first-party-data material describes simple pixel installation, server-side tracking and fresh event delivery into ad platforms. AceMarketing now has a dedicated operational surface for that collection layer.

### Custom models
A new **Models** workspace now includes:
- lead conversion propensity;
- customer LTV tier;
- no-show risk;
- return / cancellation risk;
- top model signals;
- sample real-time prediction;
- activation destinations;
- model-version, approval and drift-monitoring governance.

EasyInsights' first-party activation use-case material also states that custom models can be built on first-party user data. AceMarketing now represents this as a governed workspace capability instead of leaving it as a service-only concept.

New API endpoints:
- `GET /api/sites`
- `POST /api/sites/test`
- `GET /api/models`
- `POST /api/models/run`


## Parity pass: conversion adjustment operations

This pass turns the brochure's conversion-adjustment concept into a dedicated **Adjustments** workspace.

The new module supports:
- partial-payment value correction;
- returned-order revenue reversal;
- low-quality lead exclusion;
- duplicate-lead deduplication;
- qualified-lead signal upgrades;
- identity-confidence safeguards;
- event-ID and click-ID validation;
- audit records and replay protection.

New API endpoints:
- `GET /api/adjustments`
- `POST /api/adjustments/apply`

The supplied brochure explicitly describes Google Ads conversion adjustments used to reclassify low-value events and provides partial-payment patterns. AceMarketing now has a concrete review/apply workflow rather than only mentioning adjustments inside the event manager.


## Parity pass: fraud detection and deep linking

This pass adds two more capabilities currently exposed in EasyInsights' public agent/navigation surface.

### Fraud & noise detection
New **Fraud** workspace includes:
- duplicate-lead burst detection;
- bot form activity;
- invalid contact patterns;
- disposable-email clusters;
- click-spam / low-quality source patterns;
- source-level suspect-rate analysis;
- quality gates before events reach ad platforms;
- blocking suspect patterns from optimization signals.

### Deep linking
New **Deep Links** workspace includes:
- app-first destinations with web fallbacks;
- UTM passthrough;
- GCLID / FBCLID passthrough;
- deferred deep-linking concept;
- attribution-window configuration;
- cross-device/app routing logic;
- downstream conversion performance by link.

New API endpoints:
- `GET /api/fraud`
- `POST /api/fraud/block`
- `GET /api/deep-links`
- `POST /api/deep-links/activate`

EasyInsights' current public Attribution Model navigation exposes **Fraud Detection** and **Deep Linking** alongside Customer Journey, Attribution, Audience, Events, Lead Grading and Lead Qualification. AceMarketing now includes operational UI for the two capabilities that were previously missing.


## Parity pass: cross-domain fingerprinting continuity and strategic media planning

This pass adds two source-supported capabilities that were still missing as dedicated product surfaces.

### Cross-domain continuity / digital fingerprinting pattern
New **Fingerprinting** workspace includes:
- first-party journey continuity across website, application, checkout and confirmation pages;
- assisted handoff continuity for WhatsApp and calls;
- deterministic identifiers first, supporting click IDs and hashed first-party identifiers second;
- approved-domain controls;
- continuity testing;
- ambiguous-match review;
- referral/session inflation correction.

EasyInsights' Della Resorts case study publicly describes its Pixel and "Digital Fingerprinting" as a way to track the user across the website, checkout and confirmation journey. AceMarketing implements an original, privacy-aware equivalent centered on first-party identity/session continuity rather than copying proprietary implementation details.

### Strategic media planner
New **Planner** workspace turns attribution, cohort, quality and LTV evidence into an advisory media-allocation scenario:
- monthly budget scenario;
- channel allocation percentages;
- lead-quality score;
- CAC context;
- scale / hold / optimize / reduce recommendations;
- projected downstream outcomes;
- explainable decision log;
- human approval remains required before spend changes.

EasyInsights' Company page publicly describes Cohort Reports for strategic media planning. AceMarketing now connects cohort and attribution evidence to a dedicated planning surface.

New API endpoints:
- `GET /api/fingerprinting`
- `POST /api/fingerprinting/test`
- `GET /api/planner`


## Parity pass: POS, walk-in and store-sale attribution

This pass adds a dedicated **POS & Stores** workspace for offline conversions that happen after digital acquisition.

The module includes:
- multiple store / offline-source connections;
- location-level transaction and revenue visibility;
- phone, email and customer-ID matching;
- GCLID / FBCLID association where available;
- API ingestion plus CSV fallback workflow;
- walk-in consultation and completed-sale outcomes;
- cancelled / refunded conversion adjustments;
- duplicate receipt deduplication;
- unmatched-transaction review;
- verified offline conversion return to Google Ads and Meta.

New API endpoints:
- `GET /api/pos-stores`
- `POST /api/pos-stores/import`

EasyInsights' current first-party-data material lists POS systems as part of complex funnel conversion tracking, while its homepage describes returning closed outcomes such as store sales to advertising platforms. AceMarketing now has a dedicated operational surface for that offline revenue path.
