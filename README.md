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


## Parity pass: full-context lead routing and follow-up recovery

This pass operationalizes two conversion workflows described by EasyInsights' current public homepage and supplied brochure: routing with full context, and follow-up at handoff points.

### Lead Routing
New **Routing** workspace includes:
- rule-based routing using intent, program, CRM state and journey evidence;
- specialist queues such as senior counsellor and financing-trained counsellor;
- route-time SLA;
- fallback queue;
- existing-owner preservation;
- queue-load visibility;
- rule testing.

### Follow-up Operations
New **Follow-ups** workspace includes:
- prioritized stalled-lead queue;
- qualified-without-booking trigger;
- no-show recovery;
- pricing-objection follow-up;
- high-intent revisit trigger;
- call-no-answer retry;
- stale CRM-stage trigger;
- recommended WhatsApp / voice sequence;
- completion and recovery-outcome tracking.

New API endpoints:
- `GET /api/routing`
- `POST /api/routing/test`
- `GET /api/follow-ups`
- `POST /api/follow-ups/complete`

EasyInsights' public homepage says its conversion system grades and enriches leads on arrival, calls and qualifies them, and then routes them with full context; the brochure also lists routing and follow-up among the jobs handled by its agents. AceMarketing now provides dedicated operational workspaces for both.


## Parity pass: closure matchback and revenue reconciliation

This pass adds a dedicated **Matchback** workspace for the closure / revenue feedback loop described in the supplied brochure.

The module includes:
- CRM / Billing / POS revenue as the authoritative close event;
- closed-won and enrolment matchback rules;
- deterministic identity + click-ID reconciliation;
- matched revenue and closed-outcome metrics;
- unmatched revenue review queue;
- refund / cancellation restatement;
- duplicate-close deduplication;
- late-arriving revenue rebuild;
- audit history;
- server-side return of verified close signals to ad platforms.

New API endpoints:
- `GET /api/matchback`
- `POST /api/matchback/reconcile`

The brochure describes agents handling **closure match-back** and **signal return** after qualification, routing and follow-up. AceMarketing now has a concrete operational workspace for that final closed-loop step instead of representing it only indirectly through attribution and AdSync.


## Parity pass: dedicated lead grading operations

This pass operationalizes the **Lead Grading** agent from the supplied EasyInsights brochure as its own workspace instead of leaving it only as an agent-library card.

The new **Lead Grading** module includes:
- real-time lead score and A/B/C/D grade;
- score-driver explanation;
- acquisition, CRM, identity and model-version context;
- grade distribution across the lead pool;
- manual override with audit ID;
- downstream grade actions for routing, CRM, nurture and ad-signal activation;
- suppression of low-quality grades from optimization until reviewed.

New API endpoints:
- `GET /api/lead-grading`
- `POST /api/lead-grading/override`
- `POST /api/lead-grading/activate`

The supplied brochure lists **Lead Grading** as one of the prebuilt agents alongside CRM Enrichment, Voice Lead Qualification, Scheduler, Reminder, Feedback and Ask EI. AceMarketing now has a dedicated operational surface for this agent as well.


## Parity pass: operational first-party Audience Builder

This pass upgrades **Audiences** from a static segment list into an interactive audience-building workflow.

The Audience Builder now supports:
- segment creation from lead grade, propensity, CRM stage, pricing-page activity, LTV tier or recency;
- condition / operator / value logic;
- destination selection for Google Ads, Meta Ads and LinkedIn Ads;
- Activate, Suppress, Retarget and Lookalike Seed modes;
- pre-save audience-size preview;
- workspace-coverage estimate;
- first-party signal catalog;
- destination-policy guidance;
- creation and initial sync state.

New API endpoints:
- `POST /api/audiences/preview`
- `POST /api/audiences`

The supplied brochure describes syncing offline lists, LTV, lifecycle and propensity segments, suppressing low-value users, activating high-value users and creating lookalike audiences. AceMarketing now provides an actual builder for those audience workflows rather than only showing predefined segments.


## Parity pass: Custom Integration Builder

This pass operationalizes the brochure's **Custom Integration** agent and the "no engineering/custom pipelines" connectivity promise into a guided builder.

The Integrations workspace now includes:
- exact brochure-aligned connector categories and additional ad destinations such as Bing/Microsoft Ads, X and Pinterest;
- a Custom Integration Builder for proprietary or unsupported systems;
- REST API, webhook, CSV/SFTP and database-read patterns;
- Bearer token, API key, Basic Auth, OAuth 2.0 and signed-webhook configuration options;
- inbound, outbound or bidirectional data direction;
- identity, lifecycle-stage and revenue field mapping;
- event-id deduplication, click-ID passthrough, timezone normalization, schema quarantine and audit-history safeguards;
- pre-activation connection test;
- sample-record validation;
- create-and-enable sync workflow;
- workspace list of connected custom adapters.

New API endpoints:
- `POST /api/custom-integrations/test`
- `POST /api/custom-integrations`

These endpoints are demo/local operational scaffolding. They do not store production credentials or perform real third-party OAuth until provider-specific adapters and secret storage are added.


## Parity pass: unified Data Hub and lineage

This pass adds a dedicated **Data Hub** workspace to represent the "one shared truth" layer behind journey stitching, attribution, activation and agents.

The module includes:
- source registry across ad platforms, CRM, WhatsApp, calling and POS / billing;
- source freshness and record volume;
- canonical customer, acquisition, click-identity, lifecycle, interaction and revenue schemas;
- data lineage from raw source → normalization → identity → journey → revenue truth → downstream consumers;
- schema validation;
- deterministic duplicate handling;
- unknown-field quarantine;
- late-arriving data reprocessing;
- PII hashing before activation;
- audit/source lineage;
- recent synchronization history;
- canonical-view rebuild workflow.

New API endpoints:
- `GET /api/data-hub`
- `POST /api/data-hub/rebuild`

This directly addresses the brochure's problem statement that teams often operate across multiple platforms without a shared truth, and its product architecture that stitches sources and tools into one journey before agents act on it.


## Production hardening pass: authentication, persistence and API perimeter

This pass starts converting AceMarketing from a UI-complete demo into a deployable application foundation.

Implemented:
- HMAC-SHA256 signed bearer sessions with expiry and constant-time signature validation;
- scrypt-based production password verification using `ADMIN_PASSWORD_HASH`;
- production startup validation for JWT secret, admin credentials and CORS allowlist;
- environment-gated API authentication for workspace endpoints;
- browser token persistence and automatic Authorization header injection;
- CORS allowlist instead of unconditional wildcard CORS in production;
- security headers including nosniff, frame denial, referrer policy and permissions policy;
- per-IP request rate limiting with `Retry-After`;
- request IDs returned through `X-Request-ID`;
- `/api/ready` readiness endpoint;
- request / keep-alive timeouts and graceful SIGTERM / SIGINT shutdown;
- file-backed atomic persistence for demo requests, custom integrations, custom audiences and audit events;
- CI syntax validation for all server modules.

### Production environment

Required in production:

```bash
NODE_ENV=production
JWT_SECRET=<32+ random characters>
ADMIN_EMAIL=<workspace owner email>
ADMIN_PASSWORD_HASH=<salt:scrypt-hex>
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com,https://www.yourdomain.com
AUTH_REQUIRED=true
DATA_FILE=/var/lib/acemarketing/ace-state.json
RATE_LIMIT_PER_MINUTE=240
TOKEN_TTL_SECONDS=3600
```

The current file-backed state layer is durable for a single API instance and is intentionally isolated behind `server/store.mjs`. Before multi-instance scale, replace it with PostgreSQL/managed relational storage and a distributed rate limiter/queue. Real provider OAuth, secret-vault storage and outbound conversion delivery are still required before claiming full production parity with a live EasyInsights deployment.


## UI parity pass: public navbar, mega menus and hero alignment

The public marketing shell was rebuilt to closely match the supplied EasyInsights reference screenshots while retaining AceMarketing branding and original assets.

Implemented:
- full-width purple performance banner;
- white 74px navigation shell with centered navigation;
- navigation order: Industries, Agents, Case Studies, Integrations, Pricing, Resources;
- Voice Agent pill and rounded Book a demo CTA;
- Industries mega menu with two-column layout, icon blocks, descriptions and divider;
- Agents mega menu grouped by Lead Quality, Conversion and Visibility;
- Resources mega menu;
- active-menu underline behavior;
- responsive mobile navigation;
- large rounded off-white hero card directly below the navbar;
- screenshot-matched headline scale, spacing, gradient emphasis, dark CTA and right-side visual panel;
- adjusted trust row spacing beneath the hero.

The implementation follows the visual structure, spacing and interaction model from the supplied screenshots without copying EasyInsights trademarks, customer artwork or proprietary source code.


## UI parity pass: tabbed problem section, system layout and footer

The EasyInsights-style public marketing parity work now extends beyond the navbar and hero.

Implemented:
- tabbed Lead Quality / Conversion / Attribution section using the current EasyInsights public information architecture;
- screenshot-aligned typography scale, borders, spacing and rounded solution panel;
- two-capability section matching the "stitched journey + agents" structure;
- responsive full-width layout refinements;
- multi-column public footer with Platform, Solution and Resources groupings;
- footer legal row and product CTA styling.

AceMarketing keeps its own brand identity and original assets, while matching the public layout rhythm, information architecture, spacing, interaction patterns and typography hierarchy closely.


## UI precision pass: screenshot-level navbar measurements

A second public-header refinement pass was applied from the supplied desktop screenshot.

Desktop measurements were tightened around the reference proportions:
- 47px announcement bar;
- 66px white navigation row;
- 77px horizontal page inset at large desktop widths;
- navigation spacing and text scale adjusted to the screenshot;
- Voice Agent and Book a demo controls resized and repositioned;
- active dropdown underline and chevron rotation refined;
- Industries mega menu fixed to an ~858px desktop width and ~456px reference-height footprint;
- two-column industry spacing and center divider refined;
- sector-specific line icons added for Edtech, Fintech, Healthcare, Retail, Home Improvement, Travel and Consumer Goods;
- industry description line-height and row height tuned to the supplied reference;
- hero top offset, radius, typography and desktop proportions refined to align directly beneath the navigation.

AceMarketing branding remains original while the layout measurements, hierarchy and interactions closely follow the provided reference.


## Navigation completeness pass: live public menu structure

The public navigation was updated again against the current EasyInsights homepage information architecture.

Changes:
- Agents dropdown now exposes all 11 public agent categories as individual menu entries with descriptions and icons;
- Resources dropdown now mirrors the current public structure with About Us, Blogs, Ebooks, No Net Hash, ROAS Calculator and Documentation;
- Resources includes a separate Latest from Blogs column;
- dropdown widths, two-column density and menu card spacing were refined;
- all menu actions stay inside AceMarketing routes/views rather than linking to EasyInsights;
- AceMarketing branding and original artwork remain unchanged.

Current EasyInsights public navigation was rechecked before this pass and currently exposes Industries, Agents, Case Studies, Integrations, Pricing and Resources, with the 11-agent list and the listed resource categories.


## Homepage parity pass: agents, proof, data diagnosis and security

The public homepage now follows the current EasyInsights information flow more closely beyond the navbar, hero and problem tabs.

Added/refined:
- 11-agent section grouped into Lead Quality, Conversion and Visibility;
- agent cards with reference impact metrics, descriptions and action links;
- custom-agent callout;
- "Proof, not promises" style case-study result grid using clearly labeled external/reference results;
- campaign/data root-cause banner before diagnostics;
- "Your data stays yours" style security/data-ownership section;
- certification-style items remain explicitly presented as roadmap/control targets until independently verified;
- responsive layouts for all new sections.

The current EasyInsights public homepage was rechecked before this pass. The UI structure and content hierarchy were used as a reference, while AceMarketing retains its own branding, original visual assets and independent code.


## Build repair after navigation parity work

The marketing-header source was normalized after a malformed text replacement corrupted the Brand/Header boundary. The repair restores valid JSX around:
- `Brand`;
- `Header`;
- Industries mega menu;
- Agents mega menu;
- Resources mega menu.

No public navigation features from the parity work were removed.


## Public homepage order cleanup

The public marketing page was simplified to match the current EasyInsights homepage sequence more closely.

Changes:
- hero now uses the same three-line headline rhythm as the current public EasyInsights homepage;
- customer/reference strip sits directly below the hero;
- removed the brochure-only "case for change" block from the public homepage;
- removed the older duplicate Two Capabilities section;
- removed internal/product-detail marketing blocks that interrupted the public sequence between Two Capabilities, Agents and Proof;
- retained all those underlying capabilities inside the application workspace;
- public flow is now: promo/header → hero → trust strip → three problems → two capabilities → 11 agents → proof → data diagnosis → AI in action → data ownership/security → final CTA → demo/footer;
- Integrations navigation opens the product workspace rather than pointing to a removed public anchor;
- added a final lead-quality CTA patterned on the current EasyInsights closing section.

No core product functionality was deleted.


## Routed public navigation + original-copy pass

The public navigation now behaves as a real multi-page product website rather than a set of homepage-only anchors.

Implemented:
- clicking **Industries** opens a dedicated Industries page;
- clicking **Agents** opens a dedicated 11-agent page;
- clicking **Integrations** opens a dedicated Integrations page;
- Case Studies, Pricing, Resources and existing public routes continue to open their dedicated views;
- dropdown items use the same route targets rather than jumping to homepage anchors;
- routed pages reuse the same promo bar, navbar, typography system and footer styling;
- brand click returns to the homepage;
- public pages fetch their catalog data from unauthenticated backend endpoints with local UI fallbacks;
- production authentication still protects workspace/private APIs while the new public catalog routes remain intentionally public.

New public API routes:
- `GET /api/public/industries`
- `GET /api/public/agents`
- `GET /api/public/integrations`

### Content policy for this implementation

Visual structure, alignment, spacing, information architecture and interaction patterns are modeled closely on the current EasyInsights public site. AceMarketing does **not** reuse EasyInsights taglines, long-form marketing copy, logos, customer artwork or proprietary source code. Headlines, descriptions and CTAs on the new routed pages are original AceMarketing copy.


## Public navigation production pass: one shared chrome, real routes, original copy

This pass makes the public website behave like a real multi-page SaaS site while preserving the EasyInsights-like visual rhythm.

Implemented:
- hash routes for homepage, Industries, Agents, Integrations, Case Studies, Pricing, Resources, Company, Solutions, Demo, Privacy, Terms and Security;
- browser back/forward navigation now updates the visible page;
- every public route uses the same announcement bar, navbar, typography system and footer;
- duplicate standalone top bars are hidden when a page is rendered inside the shared public chrome;
- footer legal actions are now handled by the root router;
- navbar menu actions open dedicated routes instead of homepage-only anchors;
- the product workspace remains a separate authenticated-style route;
- key public headings and marketing text were rewritten so AceMarketing keeps original copy rather than reusing EasyInsights taglines.

The design goal remains close visual parity in spacing, hierarchy, menu behavior, typography scale and layout while keeping AceMarketing branding, wording, artwork and code independent.


## Canonical frontend/backend project structure

AceMarketing now uses an explicit two-application layout while keeping the root repository as the orchestration layer:

```text
AceMarketing-/
├─ frontend/
│  ├─ index.html
│  └─ src/
│     ├─ AcePlatform.tsx
│     ├─ ace-platform.css
│     ├─ main.tsx
│     └─ lib/
│        ├─ api.ts
│        └─ tracker.ts
├─ backend/
│  └─ src/
│     ├─ index.mjs
│     ├─ security.mjs
│     └─ store.mjs
├─ .github/workflows/ci.yml
├─ package.json
├─ tsconfig.app.json
└─ vite.config.ts
```

The root scripts now treat `frontend/` and `backend/` as the canonical runtime paths:

```bash
npm run dev:frontend
npm run dev:backend
npm run check:all
npm run build
```

The production frontend build is emitted to `dist/frontend`. CI verifies both application trees, type-checks the frontend, syntax-checks all backend modules, builds the production frontend, and asserts that the canonical frontend/backend files exist.

The migration safety copies have now been removed after the canonical frontend/backend pipeline passed CI. `frontend/` and `backend/` are the only application source trees.


## Repository cleanup after migration

After the canonical frontend/backend build passed CI, the duplicate root-level `src/`, `server/`, and root `index.html` migration copies were removed. This leaves one authoritative frontend tree and one authoritative backend tree, reducing drift risk and making local development, CI, deployment, and code ownership easier to reason about.


## Backend-owned public navigation content

The public navigation and marketing catalog data are now isolated in `backend/src/public-content.mjs` instead of being embedded directly inside the HTTP server.

New public endpoint:

```text
GET /api/public/navigation
```

The frontend header requests this configuration and uses it for Industries, Agents and Resources menu copy, while keeping icons and route actions inside the frontend. Local fallback content remains in place so the navigation still renders if the public API is temporarily unavailable.

This keeps the EasyInsights-inspired visual structure configurable from the backend while preserving original AceMarketing wording. Residual EasyInsights-like public phrases such as the exact "three problems" and "plug the leaks" wording were also rewritten in AceMarketing's own language.


## Screenshot parity pass: global typography and footer

This pass uses the latest supplied reference screenshots as the visual target.

Changes:
- corrected a runtime fallback-order bug in the backend-driven Agents/Resources mega-menu content;
- refined desktop navbar height, spacing, menu font size, CTA sizing and mega-menu density;
- expanded the Agents dropdown to the same two-column, compact-row visual rhythm shown in the reference;
- standardized public typography on Inter/system sans with consistent weight, line-height and letter spacing;
- rebuilt the footer proportions to match the supplied dark-footer reference more closely: wider four-column spacing, larger brand, smaller muted body text, compact headings/links, and a shallow legal row;
- footer links and legal items are functional and route to the appropriate AceMarketing views;
- public agent cards now use a tighter three-column desktop grid closer to the pricing/reference card density.

AceMarketing keeps original copy and brand assets while using the supplied screenshots for layout, typography scale, spacing and interaction alignment.


## Footer + functional-box parity pass

This pass addresses the latest screenshot feedback directly.

Implemented:
- footer information architecture is now backend-owned through `GET /api/public/navigation`;
- Platform, Solutions, and Resources footer items are rendered from backend configuration;
- every footer item routes to a working AceMarketing view/workspace;
- Privacy, Terms, and Security links are functional;
- Pricing "Talk to sales" now opens the demo/sales route instead of navigating backward;
- footer spacing, brand size, column widths, link typography, muted text, and legal area were retuned from the supplied reference screenshots;
- navbar and Agents mega-menu desktop dimensions were tightened again;
- public typography is standardized on Inter/system sans;
- pricing/agent card density was refined to the supplied reference proportions.

AceMarketing keeps its own wording and brand assets while the public layout, typography scale, spacing, and interaction model track the supplied EasyInsights references closely.


## End-to-end pricing configurator pass

The public Pricing page now has real backend behavior rather than frontend-only selection state.

New public backend endpoints:
- `POST /api/pricing/recommend` — derives recommended agents from the selected growth challenges;
- `POST /api/pricing/quote` — validates and persists the selected lead volume, data homes, challenges, channels and agents.

Quote requests are written to the durable state store under `quoteRequests` and an audit event is recorded. The Pricing UI refreshes recommendations from the backend, lets the user override the recommended stack, captures the configuration, shows success/error state, and keeps a separate Talk to sales action that routes to the demo form.

This moves another major public box from visual parity into an end-to-end functional workflow.


## Homepage parity + backend-driven challenge explorer

This pass aligns the lower half of the public homepage more closely with the current EasyInsights structure while keeping original AceMarketing copy.

Implemented:
- new backend-owned six-category challenge catalog in `backend/src/public-content.mjs`;
- new public endpoint `GET /api/public/challenges`;
- interactive homepage challenge explorer for operations, tracking/data quality, ad-platform optimization, attribution, audiences, and privacy/consent;
- each challenge panel is functional and routes into AceMarketing Solutions;
- removed duplicate public data-ownership/security sections so the homepage uses one security/data-ownership presentation instead of repeated variants;
- replaced the older homepage-only footer with the same shared backend-driven footer used by all public routes.

This reduces visual duplication, improves public-page consistency, and moves another major homepage section under backend configuration.


## Functional public Case Studies + Resources pass

This pass converts two more public sections from static marketing content into backend-driven, interactive experiences.

New public backend endpoints:
- `GET /api/public/case-studies`
- `GET /api/public/resources`

Case Studies:
- backend-owned implementation-pattern catalog;
- selectable case-study cards;
- active challenge / implementation / metrics detail panel;
- demo CTA remains routed and functional;
- external brands are explicitly presented as reference patterns, not AceMarketing customers.

Resources:
- backend-owned guide catalog;
- every “Read guide” button now opens a functional implementation guide;
- guide content is loaded from the backend with frontend fallbacks;
- ROAS calculator remains interactive;
- local SHA-256 utility remains browser-only and does not submit the source identifier to the backend.

This directly addresses the requirement that visible public boxes and actions should perform a meaningful workflow instead of acting as decorative UI.


## End-to-end API contract completion pass

This pass closes the remaining frontend/backend route mismatch discovered during the EasyInsights parity audit.

Implemented backend routes:
- `GET/POST /api/launchpad`
- `GET /api/identity`
- `GET /api/models` and `POST /api/models/run`
- `GET /api/routing` and `POST /api/routing/test`
- `GET /api/follow-ups` and `POST /api/follow-ups/complete`
- `GET /api/qualification-calls` and `POST /api/qualification-calls/retry`
- `GET /api/meetings` and `POST /api/meetings/remind`
- `GET /api/feedback`
- `GET /api/approvals` and `POST /api/approvals/decision`
- `POST /api/agents/custom`
- `GET /api/settings`
- `GET /api/workspaces`
- `GET /api/audit-log`
- `POST /api/api-keys`

Operational behavior added:
- custom agents are persisted and can require explicit human approval before activation;
- approval decisions update custom-agent lifecycle state;
- qualification retries, meeting reminders and follow-up completion mutate durable state;
- model runs and launchpad changes create audit entries;
- the agent listing now includes persisted custom agents alongside built-ins;
- API keys are returned only at creation time while only a SHA-256 fingerprint is stored;
- seeded operational records make the connected UI surfaces usable immediately in a fresh environment.

This pass resolves the previously observed 20-path frontend/backend contract gap without creating an implementation branch.


## Signal delivery reliability pass

The activation layer now has a persisted operational delivery queue instead of relying only on monitoring copy.

Implemented:
- new workspace **Delivery** screen between Audiences and Monitoring;
- `GET /api/signal-deliveries` for delivery history and queue summary;
- `POST /api/signal-deliveries/dispatch` with SHA-256 idempotency keys;
- duplicate dispatch protection that returns the existing delivery rather than creating another external write;
- `POST /api/signal-deliveries/retry` for targeted retry queuing;
- `POST /api/signal-deliveries/replay-dlq` for dead-letter replay;
- `GET /api/connector-health` for destination reliability and latency state;
- persisted seeded delivery records and connector-health state;
- audit entries for dispatch, retry and dead-letter replay operations;
- delivery-center UI for Meta Ads, Google Ads and custom-webhook style destinations.

This closes an important production-readiness gap between the existing AdSync/Monitoring UI and the backend: failed outbound signals now have explicit persisted lifecycle state, idempotency, retry controls and dead-letter visibility.

Provider credentials and vendor-specific OAuth/API payload delivery are still environment-dependent and must be configured before live external writes are enabled.


## Secure connector OAuth and credential-vault pass

The integration workspace no longer treats provider connection as a simple local toggle.

Implemented:
- AES-256-GCM connector credential vault in `backend/src/vault.mjs`;
- connector tokens are encrypted before persistence and are never returned by the integrations listing API;
- short-lived OAuth state records with 10-minute expiry;
- PKCE verifier/challenge generation for authorization requests;
- OAuth authorization initiation for Google Ads/GA4, Meta Ads/WhatsApp, LinkedIn Ads, HubSpot, Salesforce and Zoho CRM;
- provider-specific scopes and authorization/token endpoints;
- `POST /api/integrations/oauth/callback` token exchange and encrypted credential persistence;
- `POST /api/integrations/disconnect` credential removal and lifecycle update;
- `GET /api/integrations` now reports actual persisted connector lifecycle state and whether backend OAuth configuration exists;
- frontend integration state loads from the backend instead of assuming seed connectors are connected;
- the UI redirects to the provider authorization URL when OAuth is configured;
- connector connect/disconnect actions create audit entries;
- production environment variables for OAuth clients, redirect URI and connector encryption are documented.

Required production secret:
`CONNECTOR_ENCRYPTION_KEY` must be a high-entropy secret stored in your deployment secret manager, not committed to source control.

Provider client IDs/secrets must likewise be injected through the deployment environment. The repository intentionally does not contain live third-party credentials.
