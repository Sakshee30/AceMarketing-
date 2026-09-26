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

The repository has progressed beyond the original API-contract phase: Postgres-backed persistence, RBAC/workspace boundaries, OAuth/token lifecycle, encrypted connector credentials, durable jobs, retries/DLQ, tracking ingestion, attribution storage, lead operations, audiences, agent operations, monitoring, privacy controls, billing foundations and real Meta/Google delivery adapters are now implemented.

The remaining production-launch work is primarily external-system verification and scale hardening:

1. Validate Meta CAPI end-to-end with a real production Business/Dataset configuration and test-event/live-event separation.
2. Validate Google ECL/OCI uploads against approved Google Ads developer-token/customer/conversion-action configuration.
3. Finish provider-specific contract tests for Google, Meta, CRM, WhatsApp and telephony failure modes.
4. Complete real inbound CRM synchronization and lifecycle-field mapping for every advertised CRM connector.
5. Complete production WhatsApp Cloud API ingestion/action flows and webhook verification.
6. Complete production telephony provider ingestion/action flows and signed callback verification.
7. Expand identity stitching across high-volume multi-device / multi-channel edge cases.
8. Run production-like load, queue saturation, retry-storm and database failover tests.
9. Complete deployment-environment secrets, observability, backup/restore and disaster-recovery drills.
10. Complete security review, dependency review, privacy/compliance evidence and external certification work where claimed.
11. Complete end-to-end browser/mobile regression coverage for every clickable product action.
12. Validate billing/webhook flows in the target production Stripe account and commercial plan configuration.

The UI should not represent an external connector as production-verified until that connector has been exercised against the real provider account and credentials used for launch.

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


### Browser OAuth callback completion

OAuth providers redirect to the backend using:
`GET /api/integrations/oauth/callback?code=...&state=...`

The backend validates the short-lived state, exchanges the authorization code, encrypts the returned provider token payload, updates connector lifecycle state, records an audit event, and redirects the browser to `CONNECTOR_OAUTH_SUCCESS_URL`.

Recommended production configuration:
- `CONNECTOR_OAUTH_REDIRECT_URI=https://api.yourdomain.com/api/integrations/oauth/callback`
- `CONNECTOR_OAUTH_SUCCESS_URL=https://app.yourdomain.com/#/workspace`

The POST callback remains available for controlled API/client integrations and automated testing.


## PostgreSQL persistence and workspace isolation pass

The runtime persistence boundary now supports PostgreSQL for production while preserving file-backed local development.

Implemented:
- `pg` production dependency and connection pooling;
- migration runner: `npm run migrate`;
- migration `backend/migrations/001_workspace_state.sql`;
- transactional PostgreSQL mutations using `SELECT ... FOR UPDATE`;
- per-workspace state rows keyed by validated `workspace_id`;
- request-scoped workspace isolation through `X-Workspace-ID`;
- AsyncLocalStorage context so existing feature code keeps using `getState/mutateState` without cross-request workspace leakage;
- frontend automatically sends the active workspace header;
- `/api/ready` now verifies persistence health and reports the active backend;
- graceful shutdown closes the PostgreSQL pool;
- production startup refuses file-only persistence unless `ALLOW_FILE_STORE_IN_PRODUCTION=true` is explicitly set;
- file persistence remains available for local development and stores non-default workspaces in separate files.

### Production database setup

```bash
export DATABASE_URL=postgresql://user:password@host:5432/acemarketing
npm install
npm run migrate
npm run dev:backend
```

Recommended production values:

```text
DATABASE_URL=<managed PostgreSQL connection string>
DB_SSL=require
DB_POOL_MAX=20
DEFAULT_WORKSPACE_ID=ws_default
ALLOW_FILE_STORE_IN_PRODUCTION=false
```

The current schema deliberately preserves the existing application state contract inside a PostgreSQL JSONB row per workspace. This gives multi-instance durability, transactions and workspace separation without breaking the existing product modules. High-volume event, journey and delivery tables can now be normalized incrementally behind the same storage boundary.


## Durable worker and provider delivery pass

The outbound activation runtime now has a PostgreSQL-backed job worker instead of relying on manual retry state alone.

Implemented:
- `backend/migrations/002_job_queue.sql` with durable job state, leasing, retry, dead-letter and idempotency fields;
- `backend/src/queue.mjs` with `FOR UPDATE SKIP LOCKED` worker leasing so multiple workers can process safely;
- exponential retry backoff and dead-letter transition after the configured maximum attempts;
- `backend/src/worker.mjs` background process started with `npm run worker`;
- signal dispatch now creates a durable `signal_delivery` job after the persisted delivery record;
- manual delivery retry also creates a new queued execution;
- connector-health API includes queue statistics;
- provider execution module for Meta Conversions API, Google Ads offline/enhanced conversion upload, and signed custom webhooks;
- provider access tokens are read from the encrypted connector credential vault at execution time;
- Meta customer identifiers are normalized/hashed when raw email/phone values are supplied;
- Google conversion delivery supports GCLID/GBRAID/WBRAID and hashed user identifiers;
- custom webhooks support HMAC-SHA256 signatures.

### Worker deployment

Run the API and worker as separate processes against the same PostgreSQL database:

```bash
npm run migrate
npm run dev:backend
npm run worker
```

Multiple worker replicas may run concurrently. PostgreSQL leases each job to one worker using `FOR UPDATE SKIP LOCKED`.

### Provider configuration

Meta:
- `META_GRAPH_VERSION=v26.0`
- `META_DATASET_ID=<dataset/pixel id>`

Google Ads:
- `GOOGLE_ADS_API_VERSION=v25`
- `GOOGLE_ADS_DEVELOPER_TOKEN=<developer token>`
- `GOOGLE_ADS_CUSTOMER_ID=<customer id>`
- `GOOGLE_ADS_CONVERSION_ACTION=customers/.../conversionActions/...`

Custom webhook:
- `CUSTOM_WEBHOOK_URL=https://...`
- `CUSTOM_WEBHOOK_SECRET=<secret>`

The OAuth connector vault supplies provider access tokens. Live provider delivery still requires valid advertiser accounts, provider approvals, and production credentials.

Google has restricted new adoption of legacy offline conversion upload flows since June 15, 2026; new deployments should confirm eligibility and plan migration to Google's Data Manager API where required.


## Workspace RBAC, invitations and session revocation pass

Authentication and workspace access are now governed by persisted membership state instead of issuing every login as a workspace owner.

Implemented:
- workspace-scoped member records with owner/admin/analyst/operator roles;
- login resolves the member from the active workspace and issues a token containing user, workspace, role and session IDs;
- active sessions are persisted and checked on every authenticated request;
- logout revokes the active session;
- changing a member role revokes that member's sessions so new permissions take effect immediately;
- deactivating a member revokes all of their sessions;
- request authorization maps API actions to explicit permissions;
- workspace mismatch between JWT and `X-Workspace-ID` is rejected;
- member invitation endpoint creates a one-time random token while storing only its SHA-256 hash;
- invitation activation creates a password using scrypt with a unique salt;
- Settings → Users & roles now loads real members, creates invitations, changes roles and deactivates users through the API;
- the login UI no longer claims that any arbitrary six-character password is accepted in production.

### Roles

- **Owner** — full workspace control.
- **Admin** — workspace/member management plus integration, agent, audience and developer writes.
- **Analyst** — read/analysis/reporting access.
- **Operator** — operational execution for approved workflows, calls, meetings, approvals and delivery.

The current bootstrap owner remains tied to `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH`. Additional members activate through the invitation flow.


## Public resource-center parity pass

The public Resources navigation now resolves to distinct product experiences instead of routing every resource item to one generic screen.

Implemented:
- dedicated resource tabs/routes for Guides, Use Cases, Blogs, Ebooks, Documentation, No Net Hash, ROAS Calculator and Voice Agent;
- `GET /api/public/resource-center` public API for resource metadata and implementation-oriented content;
- hash-based deep links such as `#/resources?tab=docs`, `#/resources?tab=hash` and `#/resources?tab=roas`;
- browser-only SHA-256 hashing that does not transmit the raw identifier to the backend;
- ROAS calculator with spend/revenue inputs;
- structured documentation groups for setup, activation, measurement and operations;
- implementation-style use cases for lead quality, call/WhatsApp attribution, CRM conversion sync and audience lifecycle activation;
- voice-agent capability page covering qualification, routing, scheduling, reminders and feedback.

This closes the public-navigation gap where EasyInsights exposes separate resource experiences while AceMarketing previously collapsed those links into one generic destination.


## Click identity persistence and assisted-conversion matchback pass

The attribution layer now persists real acquisition evidence instead of keeping `/api/track` only in process memory.

Implemented:
- normalized PostgreSQL tables for click sessions and assisted/offline events;
- persistence for GCLID, GBRAID, WBRAID, FBCLID and MSCLKID;
- UTM, landing URL, referrer, visitor/customer identity and timestamp retention;
- raw email/phone are normalized and SHA-256 hashed before attribution storage;
- configurable click-ID retention window;
- deterministic matching priority: customer ID → click IDs → hashed phone/email → visitor ID;
- assisted-event ingestion for call, WhatsApp, CRM, POS, billing and other offline sources;
- idempotency keys for assisted conversion records;
- unmatched-event reconciliation;
- live identity/match statistics exposed to Offline Attribution and Matchback UI;
- `POST /api/assisted-events`;
- `GET /api/attribution-identity/stats`;
- `POST /api/track` now captures click sessions and can create assisted events;
- Matchback reconciliation now processes normalized unmatched records rather than returning only a static success payload.

### Attribution retention configuration

```text
CLICK_ID_RETENTION_DAYS=90
CALL_MATCH_WINDOW_MINUTES=30
ATTRIBUTION_DB_POOL_MAX=10
```

Only deterministic identifiers are automatically accepted as matches. Records without sufficient identity evidence stay unmatched and are held from downstream signal return until reconciliation.


## CRM enrichment, lead grading and audience materialization pass

The conversion layer now persists the lead context used by Enrich, Lead Grading and Audience Builder instead of relying only on synthetic UI records.

Implemented:
- `backend/migrations/004_lead_ops.sql` for lead profiles, audience definitions and materialized audience members;
- `backend/src/lead-ops.mjs` for deterministic, explainable lead scoring and lifecycle segmentation;
- persisted lead enrichment fields for acquisition source, campaign, CRM stage, journey signals, call/WhatsApp summaries and arbitrary governed attributes;
- SHA-256 email/phone identity keys for matching without storing raw values in lead-profile tables;
- explainable score drivers and penalties for pricing intent, journey depth, WhatsApp/call engagement, meeting progression, CRM stage, propensity, invalid contacts, duplicates and fraud risk;
- persistent manual grade overrides;
- real audience preview queries against workspace lead profiles;
- audience materialization into stable hashed identity memberships;
- explicit `ready_for_sync` status so the UI does not falsely claim a provider upload has occurred before a destination adapter confirms it;
- Enrich, Lead Grading and Audiences UI now load persisted backend data when available.

New/updated APIs:
- `GET /api/enrich`
- `POST /api/enrich/upsert`
- `POST /api/lead-grading/score`
- `GET /api/lead-grading`
- `POST /api/lead-grading/override`
- `POST /api/lead-grading/activate`
- `POST /api/audiences/preview`
- `POST /api/audiences`
- `POST /api/audiences/materialize`
- `GET /api/audiences`

A production audience is first evaluated and materialized from first-party lead profiles. Actual upload to Google Customer Match, Meta Custom Audiences, LinkedIn Matched Audiences or another destination should only move from `ready_for_sync` to `active` after that provider-specific API confirms receipt.


## Audience provider sync and CRM writeback pass

Materialized first-party segments can now proceed through durable provider jobs instead of stopping at `ready_for_sync`.

Implemented:
- `backend/migrations/005_activation_receipts.sql` for provider state and activation/writeback receipts;
- `backend/src/activation-adapters.mjs`;
- one durable `audience_sync` job per Meta/Google destination;
- provider state persisted on each audience, including external IDs, received-member counts, success/retry/failure state and last error;
- Meta Custom Audience create/update using hashed email/phone membership;
- Google Customer Match legacy job flow for eligible projects using User Lists + OfflineUserDataJob;
- explicit Google Customer Match mode because new adopters are restricted from legacy Customer Match workflows after April 1, 2026 and should use the Data Manager API;
- durable `crm_writeback` jobs for HubSpot, Zoho CRM and Salesforce;
- CRM writeback uses OAuth credentials from the encrypted connector vault;
- activation receipts are queryable through `GET /api/activation-runs`;
- Audiences UI exposes `Sync now` only when a materialized audience is ready or needs retry;
- Enrich UI exposes CRM writeback actions for the persisted lead profile.

New endpoints:
- `POST /api/audiences/sync`
- `GET /api/activation-runs`
- `POST /api/enrich/writeback`

### Required provider configuration

Meta Custom Audiences:

```text
META_AD_ACCOUNT_ID=<ad account id>
```

Google Customer Match:

```text
GOOGLE_CUSTOMER_MATCH_MODE=legacy
GOOGLE_ADS_CUSTOMER_ID=<customer id>
GOOGLE_ADS_DEVELOPER_TOKEN=<developer token>
```

Google restricts legacy Customer Match API access for projects that had not previously used the feature by April 1, 2026. Such deployments must use Google's Data Manager API rather than setting `GOOGLE_CUSTOMER_MATCH_MODE=legacy`.

CRM writeback expects the destination record identifier to be available in the lead's governed attributes (for example `hubspotContactId`, `zohoLeadId`, or `salesforceLeadId`) or supplied explicitly by the caller.


## Durable agent orchestration pass

The conversion-agent surfaces now have a PostgreSQL-backed execution model instead of relying only on sample records and direct state mutations.

Implemented:
- `backend/migrations/006_agent_orchestration.sql`;
- `backend/src/agent-orchestrator.mjs`;
- durable agent runs with queued/running/retrying/succeeded/failed state;
- persisted routing decisions with destination, reason and SLA;
- persisted follow-up tasks with due time, priority, channel and completion state;
- persisted meetings and reminder history;
- persisted feedback responses and aggregate score;
- durable qualification-call, meeting-reminder and feedback-request jobs through the existing worker;
- signed outbound agent webhook transport for telephony/voice/calendar providers;
- retry/dead-letter state is reflected on agent runs rather than being hidden;
- existing Routing, Follow-ups, Calls, Meetings and Feedback screens load persisted backend data when available.

New/expanded APIs:
- `GET /api/agent-runs`
- `GET /api/routing`
- `POST /api/routing/test`
- `GET/POST /api/follow-ups`
- `POST /api/follow-ups/complete`
- `GET/POST /api/qualification-calls`
- `POST /api/qualification-calls/retry`
- `GET/POST /api/meetings`
- `POST /api/meetings/remind`
- `GET/POST /api/feedback`
- `POST /api/feedback/request`

### Agent transport configuration

AceMarketing hands voice qualification, meeting reminders and feedback requests to approved providers through signed server-to-server webhooks:

```text
VOICE_QUALIFICATION_WEBHOOK_URL=https://...
# Legacy fallback still supported:
VOICE_AGENT_WEBHOOK_URL=https://...
MEETING_REMINDER_WEBHOOK_URL=https://...
FEEDBACK_WEBHOOK_URL=https://...
AGENT_WEBHOOK_SECRET=<random signing secret>
```

Production actions now fail explicitly when the relevant transport is not configured. They are not marked successful merely because an orchestration record was created. HTTP transport URLs are rejected in production; development-only simulation requires `AGENT_TRANSPORT_ALLOW_INTERNAL=true` and is unavailable when `NODE_ENV=production`.

The production preflight check now verifies that all three agent transport routes plus the signing secret are present.


## Workspace-bound OAuth callback hardening pass

The browser OAuth callback is now safe for production multi-workspace deployments.

Implemented:
- the provider browser callback `GET /api/integrations/oauth/callback` is public only for the GET redirect path; the POST callback remains authenticated;
- OAuth state is cryptographically signed with HMAC-SHA256 and contains the originating workspace ID plus a random nonce and issued-at timestamp;
- the callback verifies the signature in constant time and rejects states older than 15 minutes;
- the callback restores the original workspace from the signed state rather than trusting `X-Workspace-ID`;
- pending OAuth state is stored as SHA-256 rather than storing the raw browser state token;
- the persisted pending state is also bound to the originating workspace;
- PKCE verifier/challenge remains in place;
- consumed OAuth state is deleted after token exchange;
- production validates that the OAuth state-signing secret is at least 32 characters.

Recommended production configuration:

```text
CONNECTOR_OAUTH_REDIRECT_URI=https://api.example.com/api/integrations/oauth/callback
CONNECTOR_OAUTH_SUCCESS_URL=https://app.example.com/#/workspace
CONNECTOR_OAUTH_STATE_SECRET=<random secret of at least 32 characters>
```

If `CONNECTOR_OAUTH_STATE_SECRET` is omitted, AceMarketing falls back to `JWT_SECRET`; a dedicated secret is recommended so connector state signing can be rotated independently.


## Secure custom integration runtime pass

The Custom Integration feature now performs real, guarded connection validation instead of returning a simulated success response.

Implemented:
- `backend/migrations/007_custom_integrations.sql`;
- `backend/src/custom-integrations.mjs`;
- persisted custom integration definitions and connection-test history;
- encrypted Bearer/API-key/Basic credentials using the existing AES-256-GCM connector vault;
- credentials are never returned by list APIs;
- HTTPS-only outbound tests by default;
- DNS resolution before every request;
- blocking for localhost, loopback, RFC1918 private networks, link-local ranges, carrier-grade NAT and reserved/multicast ranges;
- cross-origin redirects are blocked to avoid credential leakage and redirect-based SSRF bypass;
- outbound tests have a configurable timeout;
- health, HTTP status, latency, error and last-tested timestamp are persisted;
- the frontend no longer replaces a failed connection test with a fake `200 OK`;
- custom integrations are loaded from the backend and can be re-tested from the workspace UI.

New/expanded APIs:
- `GET /api/custom-integrations`
- `POST /api/custom-integrations`
- `POST /api/custom-integrations/test`

Configuration:

```text
CUSTOM_INTEGRATION_TIMEOUT_MS=5000
CUSTOM_INTEGRATION_DB_POOL_MAX=10
CUSTOM_INTEGRATION_ALLOW_HTTP=false
```

Production should leave `CUSTOM_INTEGRATION_ALLOW_HTTP=false`. The HTTP override exists only for controlled local development.


## Observability, alerts and usage metering pass

The Operations surfaces now use persisted telemetry instead of static monitoring numbers.

Implemented:
- `backend/migrations/008_observability_usage.sql`;
- `backend/src/observability.mjs`;
- per-request workspace telemetry for path, method, status code and latency;
- 15-minute and 24-hour API health summaries with 5xx error rate and p95 latency;
- daily usage meters rolled up by workspace;
- metered categories for API requests, tracked events, assisted events, signal dispatches, agent actions, audience syncs and custom integration tests;
- persisted monitoring rules;
- automatic incident creation and auto-resolution when thresholds recover;
- rules for API error rate, p95 latency, dead-letter jobs and audience provider errors;
- live Alert Center backed by persisted incidents;
- alert resolution persists in PostgreSQL;
- Monitoring UI now shows real telemetry, current-month usage and configured rules;
- configurable API metric retention.

New/expanded APIs:
- `GET /api/monitoring`
- `GET /api/alerts`
- `POST /api/alerts/resolve`
- `GET /api/monitoring-rules`
- `POST /api/monitoring-rules`

Configuration:

```text
OBSERVABILITY_DB_POOL_MAX=10
MONITORING_EVAL_INTERVAL_MS=60000
API_METRIC_RETENTION_DAYS=30
```

These usage counters are suitable as the internal source for usage-based packaging and billing calculations, but they do not yet charge a card or generate invoices. Payment-provider integration should consume finalized usage/entitlement records rather than inventing charges inside the telemetry layer.


## Subscription entitlements and quota enforcement pass

Usage metering is now connected to workspace subscription state and enforceable entitlements.

Implemented:
- `backend/migrations/009_entitlements.sql`;
- `backend/src/entitlements.mjs`;
- persisted workspace subscription state with plan code, status, period boundaries and entitlement JSON;
- configurable monthly limits for tracked events, assisted events, signal dispatches, agent actions, audience syncs and custom integration tests;
- configurable resource limits for members and custom integrations;
- quota reservations use a workspace subscription row lock so concurrent requests cannot freely overrun the same entitlement;
- successful metered operations remain counted by the observability usage ledger;
- failed reservations are released;
- suspended/cancelled workspaces cannot consume metered write operations;
- `429` responses include the metric and usage context when a quota is exhausted;
- Settings → Billing & usage now loads real subscription and current-month usage data;
- payment state is explicit: metering/entitlements can operate before a billing provider is configured.

New APIs:
- `GET /api/billing/usage`
- `GET /api/billing/subscription`
- `POST /api/billing/entitlements` (workspace owner only)

Default limits are deployment configuration, not claimed EasyInsights price tiers:

```text
PLAN_LIMIT_TRACKED_EVENTS=1000000
PLAN_LIMIT_ASSISTED_EVENTS=250000
PLAN_LIMIT_SIGNAL_DISPATCHES=250000
PLAN_LIMIT_AGENT_ACTIONS=50000
PLAN_LIMIT_AUDIENCE_SYNCS=500
PLAN_LIMIT_CUSTOM_INTEGRATION_TESTS=1000
PLAN_LIMIT_MEMBERS=25
PLAN_LIMIT_CUSTOM_INTEGRATIONS=25
```

Set any limit to `0` for unlimited usage. AceMarketing does not charge cards or create invoices until a real payment/billing provider is connected; the entitlement layer is deliberately provider-independent.


## Billing provider synchronization pass

The provider-independent entitlement layer can now be synchronized from a real Stripe subscription without hard-coding public plan prices.

Implemented:
- `backend/migrations/010_billing_provider.sql`;
- `backend/src/billing-provider.mjs`;
- Stripe Checkout Session creation for deployment-configured plan codes;
- Stripe Billing Portal Session creation for linked customers;
- public `POST /api/billing/webhook` with raw-body HMAC-SHA256 signature verification and timestamp tolerance;
- idempotent provider-event storage using Stripe event IDs;
- workspace mapping from Checkout/Subscription metadata and existing customer/subscription IDs;
- subscription status synchronization for trialing, active, past-due, paused and cancelled states;
- payment failure/success status updates;
- external customer/subscription/price IDs and cancel-at-period-end state persisted on workspace subscriptions;
- configured price IDs map to AceMarketing plan codes and entitlement JSON from deployment configuration;
- Settings → Billing & usage exposes checkout or billing-portal actions only when the provider is actually configured.

New APIs:
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/billing/webhook`
- expanded `GET /api/billing/subscription` with provider readiness and recent event receipts.

### Billing catalog configuration

AceMarketing deliberately does not invent EasyInsights public price tiers. Configure sellable plans in deployment:

```text
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
BILLING_CHECKOUT_SUCCESS_URL=https://app.example.com/#/workspace
BILLING_CHECKOUT_CANCEL_URL=https://app.example.com/#/workspace
BILLING_PORTAL_RETURN_URL=https://app.example.com/#/workspace
BILLING_PLAN_CATALOG_JSON={"usage":{"priceId":"price_...","entitlements":{"tracked_events":1000000,"assisted_events":250000,"signal_dispatches":250000,"agent_actions":50000,"audience_syncs":500,"custom_integration_tests":1000,"members":25,"custom_integrations":25}}}
```

The Checkout and Portal endpoints are owner-only. The webhook endpoint is unauthenticated by design but rejects requests unless the Stripe signature verifies against the raw request body and falls within the configured timestamp tolerance.


## Production deployment, smoke testing and disaster recovery pass

AceMarketing now ships with a reproducible production runtime rather than relying on local Node/Vite processes.

Implemented:
- `deploy/Dockerfile.api` for the API/worker runtime;
- `deploy/Dockerfile.frontend` for an immutable frontend image;
- `deploy/nginx.conf` for SPA delivery and `/api` reverse proxying;
- `docker-compose.yml` with PostgreSQL, one-shot migrations, API, worker and web services;
- health checks for PostgreSQL, API and frontend;
- `.dockerignore` preventing secrets/local state from entering images;
- `backend/scripts/preflight.mjs` for required production environment and secret checks;
- `backend/scripts/smoke.mjs` for health/readiness/public-resource smoke validation plus optional authenticated monitoring validation;
- `backend/scripts/backup.mjs` using `pg_dump` custom format;
- guarded `backend/scripts/restore.mjs` using `pg_restore`;
- `docs/PRODUCTION_RUNBOOK.md` covering deployment, rollback, backup/restore, incident triage and release gates;
- CI now starts PostgreSQL, applies all migrations, boots the API, runs smoke tests and builds both production containers;
- `.github/workflows/release.yml` builds and publishes API/web images to GHCR for tags or manual releases.

Commands:

```bash
npm run preflight
docker compose up -d --build
npm run smoke
npm run backup
RESTORE_CONFIRM=YES npm run restore -- backups/<file>.dump
```

The production release gate is therefore stricter than TypeScript compilation: migrations, a real PostgreSQL boot, runtime smoke tests and Docker image builds must also succeed.


## Security and runtime load release-gate pass

The CI release gate now validates several production security invariants and basic concurrent runtime behavior against a live PostgreSQL-backed API.

Added:
- `backend/scripts/security-smoke.mjs`;
- `backend/scripts/load-smoke.mjs`;
- `npm run security:smoke`;
- `npm run load:smoke`.

Security smoke checks:
- malformed/traversal-style workspace IDs are rejected;
- billing webhooks with invalid Stripe signatures are rejected;
- custom integration tests cannot target localhost/private SSRF destinations;
- normal tracking ingestion still succeeds after those controls are exercised.

Load smoke:
- sends configurable concurrent requests against the live health endpoint;
- fails on any request error;
- calculates average and p95 latency;
- fails when p95 exceeds `LOAD_MAX_P95_MS`.

Defaults:

```text
LOAD_REQUESTS=100
LOAD_CONCURRENCY=20
LOAD_MAX_P95_MS=2000
SECURITY_TIMEOUT_MS=5000
```

This is a release smoke/load gate, not a replacement for dedicated soak testing at production traffic volumes. Large-scale capacity testing should run in a staging environment with production-like PostgreSQL, network, worker concurrency, provider mocks and observability.


## Browser E2E and accessibility regression pass

The release gate now exercises AceMarketing through a real Chromium browser in desktop and mobile viewports.

Implemented:
- `playwright.config.ts`;
- `tests/e2e/platform.spec.ts`;
- Playwright Chromium installation in CI;
- public-route coverage for home, agents, integrations, pricing, case studies, resources and security;
- public-navigation interaction checks;
- workspace navigation checks across journeys, attribution, lead grading, agents, integrations, audiences, monitoring and alerts;
- Settings → Billing & usage rendering against the live PostgreSQL-backed API;
- workspace-switcher behavior;
- browser page-error detection;
- basic accessible-name checks for visible buttons;
- visible primary-heading regression checks;
- desktop Chrome and Pixel-class mobile browser projects.

Commands:

```bash
npm run e2e
npm run e2e:desktop
npm run e2e:mobile
```

CI starts PostgreSQL and the API first, then Playwright starts the Vite frontend and exercises the application through the same `/api` proxy path used during development. Browser traces, screenshots and video are retained on failures locally; CI uses the Playwright line and HTML reporters.


## Consent and privacy enforcement pass

Privacy/governance is now enforced at runtime rather than represented only by workspace settings copy.

Implemented:
- `backend/migrations/011_consent.sql` and `backend/src/consent.mjs`;
- persisted visitor/customer consent records and consent audit snapshots;
- public `GET/POST /api/consent`;
- default-deny analytics, marketing and personalization while essential functionality remains enabled;
- GCLID/FBCLID are not persisted before marketing consent;
- automatic page-view analytics do not run before analytics consent;
- server-side `POST /api/track` independently verifies consent so browser controls cannot be bypassed;
- signal delivery verifies marketing consent when a visitor/customer identity is present;
- Settings → Governance shows real consent statistics and recent audit activity;
- the public UI exposes Essential only, Analytics and Allow all privacy choices.

Configuration:

```text
CONSENT_POLICY_VERSION=v1
CONSENT_DB_POOL_MAX=10
```

This provides enforceable product privacy controls but is not a legal certification. GDPR, CPRA, HIPAA, India DPDP and other obligations still require deployment-specific notices, contracts, retention/deletion workflows, lawful-basis review and data-subject processes.


## Data-subject export, erasure and retention pass

AceMarketing now has authenticated privacy operations in addition to consent capture/enforcement.

Implemented:
- `backend/migrations/012_privacy_ops.sql`;
- `backend/src/privacy-ops.mjs`;
- owner/admin-only export by visitor ID, customer ID, email, phone, or external lead ID;
- owner/admin-only erasure across click sessions, assisted/offline events, lead profiles, audience memberships and consent records;
- privacy request receipts store only a hashed selector rather than the raw lookup value;
- Settings → Governance exposes export/delete tooling, request receipts and retention policy state;
- `backend/scripts/privacy-retention.mjs` for cron/scheduled retention enforcement;
- expired click sessions can be purged independently of optional dataset retention windows;
- retention windows default to disabled (`0`) rather than inventing jurisdiction-specific legal periods;
- dry-run retention preview is available before destructive purging.

New APIs:
- `GET /api/privacy/requests`
- `POST /api/privacy/export`
- `POST /api/privacy/delete`
- `POST /api/privacy/retention/purge`

Retention configuration:

```text
PRIVACY_RETENTION_CLICK_DAYS=0
PRIVACY_RETENTION_ASSISTED_DAYS=0
PRIVACY_RETENTION_LEAD_DAYS=0
PRIVACY_RETENTION_CONSENT_DAYS=0
PRIVACY_RETENTION_DRY_RUN=true
```

A value of `0` means no age-based purge policy is applied for that dataset. Production operators should set retention periods only after legal/security review for their jurisdiction and contracts.


## Continuous audience refresh and activation pass

Audience cadences are now executable worker schedules rather than display-only labels.

Implemented:
- `backend/migrations/013_audience_scheduler.sql`;
- `backend/src/audience-scheduler.mjs`;
- persisted per-audience cadence, maximum staleness, next/last run, membership hash, delta counts and error state;
- PostgreSQL `FOR UPDATE SKIP LOCKED` leasing so multiple workers do not refresh the same due audience simultaneously;
- scheduled re-materialization from current lead profiles;
- deterministic membership hashing and added/removed identity counts;
- provider sync is queued only when membership changes or the provider copy exceeds the configured staleness window;
- automatic refreshes reuse the existing durable `audience_sync` queue/provider adapters rather than creating a parallel delivery path;
- refresh history is persisted in `ace_audience_refresh_runs`;
- the Audiences UI can switch each persisted audience between Manual, Real time, Every 5 min, Every 15 min, Hourly, Every 6 hours and Daily;
- the UI surfaces the last membership delta.

New APIs:
- `GET /api/audience-schedules`
- `POST /api/audience-schedules`

Worker configuration:

```text
AUDIENCE_SCHEDULER_DB_POOL_MAX=5
AUDIENCE_SCHEDULER_BATCH_SIZE=5
AUDIENCE_SCHEDULER_POLL_MS=15000
```

“Real time” currently means a one-minute audience evaluation cadence. This avoids falsely claiming per-event provider updates while still keeping first-party activation continuously refreshed. Provider APIs and account-specific upload latency determine final delivery time.


## Live cohort analytics pass

The cohort section in Reports is now calculated from persisted acquisition sessions and matched/offline conversion events instead of fixed example months and rates.

Implemented:
- `backend/src/cohort-analytics.mjs`;
- `GET /api/cohorts?months=6`;
- cohort assignment from first-seen click session month;
- acquisition-source breakdown from persisted UTM source;
- distinct acquired subjects, qualified subjects, consultation subjects and converted subjects;
- attributed conversion revenue from matched assisted/offline events;
- qualified, consultation and conversion rates;
- revenue per acquired subject and revenue per converter;
- configurable event contracts so deployments explicitly define which downstream event names represent each stage;
- Reports now renders live cohort rows, source quality and stage definitions.

Configuration:

```text
COHORT_DB_POOL_MAX=5
COHORT_QUALIFIED_EVENTS=lead.qualified,qualified_lead,mql,sql
COHORT_CONSULTATION_EVENTS=consultation,consultation_booked,appointment,meeting_booked
COHORT_CONVERSION_EVENTS=purchase,enrolment,enrollment,booking,revenue.closed,closed_won,sale
```

This avoids inventing business-stage semantics. Production deployments should align these event names with the real CRM/funnel contract for each workspace.


## Business event rule engine pass

The Conversion Event Manager is now backed by persisted business rules instead of static event examples.

Implemented:
- `backend/migrations/014_event_rules.sql`;
- `backend/src/event-rules.mjs`;
- safe whitelisted condition operators: equals, not_equals, gt, gte, lt, lte, contains, exists and in;
- no arbitrary JavaScript/`eval` execution in rule conditions;
- persisted source event → condition → derived event → destination contracts;
- derived business events are written through the existing assisted-event / attribution store;
- rule-run idempotency and audit history in `ace_event_rule_runs`;
- optional Google Ads / Meta Ads activation reuses the existing durable signal queue, retries, DLQ and provider adapters;
- marketing destinations are queued only when marketing consent is present;
- real rule statistics and recent matches in Activation → Events;
- creation, pause and enable controls in the workspace UI;
- templates for pricing-page lead, high-value purchase, prepaid order, fulfilled order and returned order patterns.

New APIs:
- `GET /api/events`
- `POST /api/events/rules`
- `POST /api/events/rules/toggle`

Configuration:

```text
EVENT_RULE_DB_POOL_MAX=5
```

The engine intentionally supports a constrained rules language. More complex transformations should be implemented through versioned custom integrations rather than executing untrusted expressions inside the ingestion process.


## Automated email reports pass

The Reports workspace now supports real scheduled cohort email delivery rather than display-only cadence labels.

Implemented:
- `backend/migrations/015_report_scheduler.sql`;
- `backend/src/report-scheduler.mjs`;
- persisted daily, weekly, and monthly report schedules;
- PostgreSQL due-schedule leasing with `FOR UPDATE SKIP LOCKED`;
- durable `report_delivery` jobs through the existing queue/retry/dead-letter pipeline;
- live cohort snapshot generation at send time;
- HTML email summary plus CSV cohort attachment;
- SMTP delivery via Nodemailer only when deployment credentials are configured;
- delivery receipts with queued/sending/sent/retrying/failed states and provider message IDs;
- Reports UI for recipients, cadence, lookback period, manual send-now, SMTP readiness, and recent delivery history.

New APIs:
- `GET /api/report-schedules`
- `POST /api/report-schedules`
- `POST /api/report-schedules/run-now`

Configuration:

```text
REPORT_DB_POOL_MAX=5
REPORT_SCHEDULER_BATCH_SIZE=5
REPORT_SCHEDULER_POLL_MS=30000
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

No email is reported as delivered unless the SMTP provider accepts it. Provider/account credentials remain deployment secrets and are intentionally not committed.


## OAuth token lifecycle pass

Connected OAuth integrations now refresh short-lived access tokens proactively instead of depending on manual reconnection after expiry.

Implemented:
- `backend/src/connector-auth.mjs`;
- encrypted refresh-token reuse for Google Ads, GA4, HubSpot, Salesforce and Zoho CRM;
- refresh starts before expiry using a configurable safety window;
- rotated refresh tokens replace the prior encrypted token when the provider returns one;
- provider access-token expiry and last refresh state are persisted with the connector;
- refresh failures put the connector into an explicit attention state rather than silently using an expired access token;
- activation and CRM writeback adapters obtain credentials through the refresh-aware credential service;
- `POST /api/integrations/refresh` supports an operator-triggered refresh;
- the Integrations UI exposes refresh state for connected providers;
- HubSpot token exchange uses the current date-versioned OAuth endpoint;
- Zoho supports deployment-specific Accounts datacenters through `ZOHO_ACCOUNTS_URL`.

Configuration:

```text
OAUTH_REFRESH_SKEW_SECONDS=300
HUBSPOT_OAUTH_TOKEN_URL=https://api.hubapi.com/oauth/2026-03/token
SALESFORCE_OAUTH_TOKEN_URL=https://login.salesforce.com/services/oauth2/token
ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
```

Provider refresh tokens and access tokens remain encrypted by the connector vault. If a provider does not issue a refresh token, the workspace reports that reconnection is required instead of fabricating continuity.


## Ask Ace grounded analytics

Ask Ace now answers from current workspace data instead of fixed demo values. It uses lead profiles, attribution statistics, connector state, audience state, activation runs, and monitoring context. Responses include confidence, evidence-source labels, and follow-up questions. When data is insufficient, the assistant reports the limitation instead of inventing metrics.


## Production signal-delivery hardening pass

This pass converts the Delivery Center from a mostly demonstrative surface into a safer durable activation workflow:

- Manual signal dispatch now fails fast when the durable Postgres queue is unavailable instead of pretending that a delivery was queued.
- Google activation validates that a click identifier or supported user identifier is present before a job is created.
- Meta activation validates that a supported customer/browser/user identifier is present before a job is created.
- Retry-safe payloads are persisted with click identifiers, conversion metadata and **hashed** email/phone values so a failed delivery can be reproduced without retaining raw email/phone solely for retry.
- Manual retry now reuses the persisted delivery payload instead of re-queuing only the event name and destination.
- Dead-letter replay now actually creates new durable queue jobs; previously the state could change to queued without scheduling provider work.
- Meta delivery now accepts the persisted workspace/customer identity as external_id input when an explicit external ID was not separately supplied.
- Worker completion records now persist the resolved provider plus receipt metadata when returned by the provider.
- GET /api/signal-console now reflects persisted delivery/queue state rather than fixed demonstration counts.
- Delivery Center no longer shows fabricated fallback delivery rows when the API is unavailable; it displays real empty/error states and reports retry/replay outcomes.
- Test-signal dispatch now uses a synthetic external identifier rather than depending on a consented demo customer record.

### Delivery retry contract

A delivery record retains the provider-safe fields needed to replay the same business event:

    event + destination + idempotency key
    occurredAt + value + currency + orderId
    GCLID / GBRAID / WBRAID / FBC / FBP when present
    SHA-256 email / phone identifiers when present
    provider routing configuration

Raw email and phone values are converted to hashes for the replay record. Provider credentials remain in the encrypted connector vault and are never copied into delivery records.

This closes two important reliability gaps found during the production-readiness review: incomplete manual retries and state-only DLQ replay.


## Agent execution truthfulness hardening pass

This pass removes another demo-only behavior from the production path:

- Voice qualification, meeting reminders and feedback requests now resolve to separate provider webhook routes.
- A missing provider route is treated as a failed action instead of returning a synthetic internal success receipt.
- Production agent transports require HTTPS.
- Signed webhook delivery remains protected by `X-Ace-Timestamp` and `X-Ace-Signature`.
- Provider HTTP failures now retain structured status/body context for retry and operational diagnosis.
- Development-only internal simulation is opt-in and cannot be enabled in production.
- Production preflight fails when the voice, reminder, feedback or signing-secret configuration is incomplete.

This means the corresponding workspace buttons can no longer report successful execution when no real communication provider is configured.


## WhatsApp Cloud API production pipeline

This pass turns WhatsApp from a catalog/integration label into a provider-backed operational path.

### Inbound webhook

AceMarketing now exposes:

- `GET /api/webhooks/whatsapp` for Meta webhook verification.
- `POST /api/webhooks/whatsapp` for signed WhatsApp Cloud API events.
- HMAC verification through `X-Hub-Signature-256`.
- Workspace routing by WhatsApp phone-number ID.
- Duplicate-resistant persistence of inbound messages and delivery-status events.
- Automatic lead-profile upsert using the WhatsApp sender identity.
- WhatsApp engagement/context written into the lead profile.
- Assisted attribution records created for inbound WhatsApp messages.

Required production settings:

```text
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<random verify token>
WHATSAPP_APP_SECRET=<Meta app secret>
WHATSAPP_PHONE_NUMBER_ID=<Cloud API phone number ID>

# Single-workspace setup:
WHATSAPP_WEBHOOK_WORKSPACE_ID=ws_default

# Or multi-workspace phone routing:
WHATSAPP_PHONE_WORKSPACE_MAP={"1234567890":"ws_brand_a","9876543210":"ws_brand_b"}
```

### Outbound messaging

Authenticated workspace users can use:

- `GET /api/whatsapp/messages`
- `POST /api/whatsapp/messages`

Outbound messages use the stored WhatsApp connector credential and Meta Graph API. Text and approved template messages are supported. Provider message IDs and latency are persisted in the workspace event history.

The Integrations workspace now includes a **WhatsApp Cloud API operations** panel with:

- recipient + message composer;
- provider-backed send action;
- explicit error/success feedback;
- inbound messages;
- outbound message records;
- delivery-status webhook records;
- manual refresh.

Marketing-purpose sends pass through the platform consent check. Transactional messaging can be sent independently when legally/contractually permitted by the workspace's messaging policy.

### Production safety

- Webhook signatures are mandatory.
- Production webhook/message configuration is validated by `npm run preflight`.
- The backend syntax check and CI canonical-structure check include `backend/src/whatsapp-cloud.mjs`.
- The UI does not fabricate WhatsApp events when none exist.
- A provider credential or phone-number configuration failure is surfaced as an error instead of being represented as a successful send.

The remaining WhatsApp work is account-specific launch verification: configure the real Meta app, approved phone number, templates, webhook subscription, business verification and live delivery tests for the target production account.


## Call Tracking Events production pipeline

The Call Tracking Events agent now has a signed ingestion contract instead of relying on fixed UI metrics.

### Signed telephony webhook

AceMarketing exposes:

- `POST /api/webhooks/calls`
- HMAC SHA-256 validation through `X-Ace-Timestamp` + `X-Ace-Signature`
- five-minute replay protection
- destination-number → workspace routing for multi-brand deployments
- duplicate call-event protection by provider event/call ID
- normalized provider fields for caller, destination, timing, status, campaign, click IDs, disposition and recording reference
- lead-profile enrichment from real call outcomes
- assisted attribution creation for each accepted call event
- audit history for every accepted or duplicate provider callback

Production settings:

```text
CALL_WEBHOOK_SECRET=<random signing secret>

# Single workspace
CALL_WEBHOOK_WORKSPACE_ID=ws_default

# Or map tracked/virtual numbers to workspaces
CALL_NUMBER_WORKSPACE_MAP={"911140001111":"ws_brand_a","911140002222":"ws_brand_b"}
```

A normalized provider payload can include:

```json
{
  "eventId": "call_123",
  "provider": "exotel",
  "direction": "inbound",
  "from": "919876543210",
  "to": "911140001111",
  "status": "completed",
  "startedAt": "2026-09-25T10:00:00Z",
  "endedAt": "2026-09-25T10:04:12Z",
  "campaign": "Executive MBA Search",
  "gclid": "optional-click-id",
  "disposition": "qualified"
}
```

### Workspace behavior

The Calls workspace now combines:

- durable Voice Lead Qualification agent runs;
- signed tracked-call events;
- real provider/outcome context;
- explicit retry state for failed qualification runs;
- a working consultation scheduler that creates persisted meeting records from a selected call.

The previous fixed call totals, example transcript and synthetic call activity have been removed from this operational surface.

### Offline attribution

`GET /api/offline-attribution` now reads persisted call events, WhatsApp events and the real attribution store. It no longer returns the earlier fixed demonstration counters for call matches, WhatsApp matches or unmatched outcomes.

Production preflight and CI checks include the call-tracking module. Provider-specific adapter mappings can normalize Exotel, Knowlarity, Tata Tele, MyOperator or custom telephony payloads into this signed canonical contract.


## Interactive marketing animation and motion pass

The public website and product workspace now include a restrained animation system designed to make the interface feel more polished without turning operational screens into decorative motion.

Implemented:

- The landing hero's previous decorative next-arrow is now a **functional three-slide carousel**.
- Hero slides cover:
  - stitched customer journey;
  - server-side signal return;
  - agent-driven funnel execution.
- Users can move through hero slides using:
  - the circular next control;
  - direct slide-indicator dots.
- Hero transitions use short fade/translate motion rather than auto-advancing, so visitors remain in control.
- Unified-journey cards float subtly and the LIVE state uses a low-intensity pulse.
- Hero background glows move slowly to add depth without blocking content.
- Journey rows animate in sequence when a hero slide changes.
- Agent, capability, proof, AI-action, resource, case-study and solution cards now have consistent hover elevation.
- KPI/stat cards and operational panels have restrained interaction feedback.
- Progress/health indicators use a subtle flowing highlight.
- Buttons and arrow icons have lightweight hover/press feedback.
- Connector dialogs, login/demo cards, cookie controls and delivery notifications enter with short transition motion.
- The motion system is shared across public pages and workspace UI instead of adding one-off animation libraries.

### Accessibility

The motion layer includes a global `prefers-reduced-motion: reduce` override. Visitors who request reduced motion receive effectively static transitions while preserving all content and controls.

No autoplaying hero carousel was introduced. This keeps the experience user-controlled and avoids distracting motion while reading or reviewing marketing data.

### Implementation files

- `frontend/src/AcePlatform.tsx` — interactive hero-carousel state and controls.
- `frontend/src/ace-platform.css` — shared keyframes, hover interactions, hero motion, operational feedback motion, and reduced-motion behavior.

The animation system uses CSS and the existing React application only; no new client-side animation dependency or recurring third-party cost was added.


## Voice Scheduler + Google Calendar production pipeline

EasyInsights publicly describes its Voice Scheduler as booking meetings and synchronizing them to team calendars in real time, while its Meeting Reminder agent follows scheduled leads before appointments. AceMarketing now backs that workflow with a real calendar integration instead of a static meeting screen.

### Google Calendar OAuth

A new `Google Calendar` connector is available through the existing workspace OAuth framework.

Required Google OAuth scope:

```text
https://www.googleapis.com/auth/calendar.events
```

The connector uses the same PKCE, signed workspace state, encrypted credential vault, token refresh and reconnect handling already used by the other OAuth connectors.

### Calendar-backed meeting creation

`POST /api/meetings` now:

1. validates the lead and meeting start time;
2. obtains the workspace Google Calendar credential;
3. creates the Calendar event through the Google Calendar API;
4. optionally creates a Google Meet conference link;
5. persists the external Calendar event ID;
6. persists the Calendar event link / meeting link;
7. stores attendee phone/email needed for downstream reminder execution;
8. returns both the persisted meeting and provider response metadata.

The default target calendar is `primary`; set `GOOGLE_CALENDAR_ID` to use another calendar.

### Rescheduling

`POST /api/meetings/reschedule` now updates both:

- the Google Calendar event; and
- the persisted AceMarketing meeting record.

If the meeting did not yet have an external calendar ID, the endpoint can create the Calendar event during rescheduling.

### Reminder execution context

Meeting reminder jobs no longer contain only a meeting ID. The worker/provider receives:

```text
meetingId
leadRef
startsAt
owner
attendeePhone
attendeeEmail
meetingLink
calendarHtmlLink
```

A manual reminder is rejected when the meeting has no usable attendee contact instead of pretending the reminder was sent.

### Workspace UI

The Meetings page now uses persisted data only:

- no seeded/fake meetings;
- no hard-coded booking/show-rate statistics;
- real upcoming meeting count;
- real Google Calendar synchronization count;
- persisted reminder count;
- real no-show-risk count;
- working Google Calendar connect action;
- working meeting reschedule control;
- working provider-backed reminder action;
- explicit empty/error states.

The Calls page now forwards a tracked caller phone into meeting creation when that context exists, allowing reminder providers to receive a usable recipient.

### Database migration

`backend/migrations/016_meeting_calendar.sql` adds:

- attendee email;
- attendee phone;
- Google Meet / meeting link;
- Calendar HTML link;
- indexed external Calendar event IDs.

### Production verification

Production preflight now requires Google OAuth client configuration and the shared OAuth callback URL because calendar scheduling is part of the production feature set.

CI/backend validation includes:

- `backend/src/calendar-provider.mjs`
- `backend/migrations/016_meeting_calendar.sql`

Real launch still requires the production Google Cloud project to have Google Calendar API enabled, the OAuth consent screen configured, the callback URL allow-listed and the target workspace account authorized.


## Functional-control hardening pass: developer console, settings and workspace operations

This pass focuses specifically on the requirement that visible controls must perform real work instead of acting as decorative SaaS UI.

### Developer console

The developer surface now reads and writes persisted workspace state rather than fixed demonstration deliveries.

Implemented:

- persisted outbound webhook endpoints;
- HTTPS validation for production webhook URLs;
- persisted webhook delivery history;
- retry state written back to delivery records;
- webhook retry audit entries;
- signing-secret rotation with one-time secret return;
- only the SHA-256 signing-secret fingerprint is persisted;
- working cURL / Node.js / Python quick-start tabs;
- working clipboard copy;
- working event-catalog → endpoint-builder flow;
- real endpoint creation modal;
- explicit empty states when no endpoint/delivery exists.

New API surface:

```text
GET  /api/webhooks/endpoints
POST /api/webhooks/endpoints
GET  /api/webhooks/deliveries
POST /api/webhooks/retry
POST /api/webhooks/secret/rotate
```

### Workspace settings

Workspace and tracking settings are now persisted through:

```text
GET  /api/settings
POST /api/settings
```

Supported settings include:

- organization;
- timezone;
- currency;
- reporting week;
- default attribution model;
- environment;
- primary domain;
- cross-domain tracking;
- GCLID persistence duration;
- FBCLID persistence duration.

The previous non-functional **Save workspace** and tracking **Edit** controls have been replaced by editable, persisted forms with success/error feedback.

### Workspace creation and switching

Workspace creation is now backed by:

```text
GET  /api/workspaces
POST /api/workspaces
```

The sidebar **Create workspace** action now opens a real creation dialog, writes the workspace to backend state, switches to the new workspace and persists its workspace ID locally for API routing.

### Global product search

The product header search is now an actual input. It searches the workspace navigation surface and opens the selected module. The former decorative search placeholder has been removed.

The header Support and Region/Language controls are also actionable:

- Support routes the user into workspace Settings.
- Region/Language shows the current workspace locale and provides a direct Settings action.

### Utility controls

Additional visible controls converted from decorative to functional:

- Deep Links → **Copy test URL** copies a generated test link.
- POS & Stores → **Download import template** downloads a CSV import template.
- Identity → **Export review queue** downloads the current review list as CSV.

### UI truthfulness

The developer console no longer injects fake webhook delivery records when no real records exist. Empty delivery history is shown as an empty operational state.

This continues the production-hardening rule used across signal delivery, WhatsApp, call tracking, calendar scheduling and Ask Ace: **missing data is represented as missing data, not replaced with invented production metrics.**


## Diagnostics, review tooling and authentication hardening

This pass continues the rule that visible controls must reflect real workspace operations rather than decorative SaaS states.

### Live diagnostics

`GET /api/diagnostics` is now derived from workspace state, including:

- signal-delivery success/dead-letter state;
- queue health;
- connector health;
- click-ID coverage from the attribution store;
- quarantine state;
- duplicate evidence from the workspace audit trail.

`POST /api/diagnostics/scan` performs and persists an explicit workspace scan. The Diagnostics **Run full scan** button now calls this endpoint and reports the measured results.

Diagnostic replay requests are persisted and audited instead of returning a throwaway synthetic ID.

### Conversion adjustment preview

Adjustment records are now persisted workspace state. New endpoint:

```text
POST /api/adjustments/preview
```

The **Preview payload** control renders the actual correction payload and deterministic idempotency key before the adjustment is applied. Applying the correction updates the persisted adjustment and audit trail.

### Site event debugger

New endpoint:

```text
GET /api/sites/debug?domain=<domain>
```

The Sites **Open event debugger** action now displays real recently tracked events associated with the selected domain. When no matching event exists, the UI shows an explicit empty state instead of seeded events.

### Matchback unmatched review

New endpoint:

```text
GET /api/matchback/unmatched
```

The Matchback **View unmatched records** action now reads recent unmatched assisted-attribution records from the attribution store rather than opening a fixed example queue.

### Google workspace login

The former decorative **Continue with Google** action now uses a dedicated workspace-authentication flow:

```text
GET  /api/auth/google/start
GET  /api/auth/google/callback
POST /api/auth/google/exchange
```

Security controls:

- OAuth state is HMAC signed and time limited;
- PKCE is mandatory;
- Google email must be verified;
- the email must already belong to an active workspace member;
- the callback produces a short-lived, single-use exchange code instead of putting the session JWT into the redirect URL;
- the one-time code is SHA-256 hashed in persisted state;
- normal workspace JWT/session issuance happens only after the exchange.

Required production settings:

```text
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
AUTH_GOOGLE_REDIRECT_URI=https://api.example.com/api/auth/google/callback
AUTH_GOOGLE_SUCCESS_URL=https://app.example.com/
```

### Password recovery

The former decorative **Forgot password?** action now uses:

```text
POST /api/auth/password/forgot
POST /api/auth/password/reset
```

Reset security behavior:

- reset tokens are random and expire after 30 minutes;
- only SHA-256 token hashes are persisted;
- the forgot-password response remains generic to avoid account enumeration;
- reset mail is delivered with the existing SMTP provider;
- a successful password reset revokes the user's existing sessions;
- development mode can return the reset token only when mail is not configured, for local testing;
- production does not expose the reset token.

Required production mail settings:

```text
AUTH_PUBLIC_APP_URL=https://app.example.com
SMTP_HOST=...
SMTP_PORT=587
SMTP_FROM=...
SMTP_USER=...
SMTP_PASS=...
```

Production preflight now checks the Google-login redirect/success URLs, public application URL and SMTP requirements. Backend syntax and CI structure checks include `backend/src/auth-mailer.mjs`.


## Functional-control completion pass

This pass converts the remaining visible no-op buttons identified by the workspace scan into real actions.

Implemented in this pass:

- **Diagnostics**
  - live score derived from delivery, queue, connector and attribution state;
  - persisted full-scan records;
  - persisted replay requests;
  - configuration guidance dialog.
- **Conversion Adjustments**
  - persisted adjustment state;
  - real payload preview;
  - deterministic idempotency key;
  - audited application state.
- **Sites**
  - real event-debugger endpoint and dialog;
  - no synthetic events injected into an empty debugger.
- **Matchback**
  - real unmatched-attribution review from the attribution store.
- **Fraud**
  - human-review queue action is persisted and audited.
- **Cross-domain continuity**
  - match-log view reads persisted matched attribution events.
- **Journeys**
  - backend journey list;
  - working source filter;
  - working stage filter;
  - working search;
  - explicit empty state.
- **Models**
  - validation view backed by persisted model-run and lead-population evidence;
  - explicit notice that this is operational evidence, not offline statistical validation.
- **Overview**
  - live customer event list reads the live-sync endpoint;
  - View All toggles the real event list;
  - fixed health percentages were removed from the operational summary.
- **Funnel**
  - campaign/funnel view switch;
  - backend funnel data;
  - channel/disposition/period controls;
  - CSV export.
- **AdSync**
  - Add Pipeline opens a real event-rule builder and persists the rule.
- **Attribution**
  - summary is grounded in the persisted attribution store;
  - period control is interactive.
- **Planner**
  - prior-month comparison toggle is functional and explicitly labeled advisory where historical data is not loaded.
- **Feed**
  - Schema Settings opens the active guardrail configuration.
- **Agents**
  - Edit Trigger now edits the selected trigger instead of acting as a decorative control.
- **Routing**
  - View Recent Matches reads persisted routing decisions.
- **Follow-ups / Feedback**
  - Open Journey loads the matching backend journey record when one exists.
- **Audiences**
  - Export produces a CSV of the current workspace audience state.

### Visible-button scan

A static scan of `frontend/src/AcePlatform.tsx` was rerun after this pass. No remaining visible button without a handler was found. The only scanner matches were the public navigation buttons for Industries, Agents and Resources; each already has an `onClick` handler and was a false positive caused by the scanner matching nested JSX.

This does **not** mean every external provider is live-verified. Provider-backed features still require the real production accounts, credentials, approvals and callback configuration described elsewhere in this README. It means the visible product controls no longer intentionally present no-op buttons.


## Build and dependency hardening: TypeScript duplicate fix + Nodemailer 10

This pass fixes two release blockers found during continued production hardening.

### TypeScript duplicate API declaration

`frontend/src/lib/api.ts` contained two `settings` properties in the exported API object. The duplicate declaration was removed so the client now exposes exactly one:

```text
settings()
saveSettings(payload)
```

alongside the workspace APIs.

### Nodemailer security upgrade

`nodemailer` was upgraded from the unsupported 6.x line to:

```text
nodemailer 10.0.10
```

The project already uses Node.js 20 in CI and both production Docker build paths, which satisfies the Nodemailer 10 runtime requirement.

The repository now declares:

```json
"engines": {
  "node": ">=20"
}
```

No `@types/nodemailer` package is installed, avoiding conflicting declarations because Nodemailer 10 includes its own TypeScript definitions.

The existing mail code continues to use the supported ESM/default import, `createTransport(...)` and `sendMail(...)` APIs in the report scheduler and password-reset mailer.

A production dependency audit command was added:

```bash
npm run security:audit
```

and CI now runs this immediately after dependency installation. High-severity production dependency advisories therefore fail the build instead of being silently ignored.


## Reference outcome card interaction fix

The four marketing outcome cards shown under **“See what stronger signals and connected journeys can unlock”** are now fully interactive.

Fixed cards:

- Leverage Edu
- India IVF
- Blue Tokai
- Jaro Education

Behavior now:

- the whole card surface is clickable;
- Enter/Space keyboard activation is supported;
- each card deep-links to `#/case-studies?case=<name>`;
- the case-study page opens the matching reference detail automatically;
- hover/focus arrow motion and visible keyboard focus are included;
- the public case-study API now includes matching detail records for all four cards so the deep link remains correct after backend content loads.

These remain clearly labeled external EasyInsights reference benchmarks and are not represented as AceMarketing customer results.


## First-party device identity and audience suppression hardening

EasyInsights publicly describes dynamic first-party audience activation, suppression, device-ID exclusion and real-time audience refresh as core use cases. AceMarketing now backs those surfaces with persisted first-party identity instead of fixed UI counts.

### Device-aware first-party identity

`POST /api/track` now accepts:

```text
deviceId / device_id
devicePlatform / device_platform
appId / app_id
```

When a tracked event contains customer/contact/device identity, AceMarketing now upserts that identity into the lead/audience profile store. This closes the previous gap where tracked events could appear in the event stream without becoming usable first-party audience identity.

Tracked profile metadata also records the consent subject type and subject ID used during ingestion.

Database migration:

```text
backend/migrations/017_device_audience_identity.sql
```

adds:

- device ID;
- device platform;
- mobile application ID;
- indexed workspace/device lookup;
- audience identity mode: `contact`, `device`, or `auto`.

### Audience builder identity modes

Audience definitions can now choose:

- **Auto** — hashed contact identity first; device identity fallback.
- **Contact** — SHA-256 email / phone.
- **Device** — first-party mobile advertising ID.

New audience conditions include:

- Device ID present
- Device platform
- App ID

### Provider activation

Meta audience delivery can now use a device-ID schema when the audience is device based.

Google Customer Match device audiences use the mobile advertising ID upload-key type and require an application ID. A profile-level `appId` is used first; `GOOGLE_CUSTOMER_MATCH_APP_ID` can provide a deployment fallback.

Contact and device modes are kept distinct so a provider audience is not silently populated with incompatible identifier types.

### Consent enforcement

Provider sync now re-checks **marketing consent for every materialized member** before any identity is sent to Meta or Google.

An audience with no marketing-consented members fails explicitly instead of being reported as successfully synchronized.

This is intentionally stricter than merely checking consent when the browser event was originally collected.

### Live audience metrics

The Audiences workspace no longer displays the previous fixed:

- activated identity count;
- suppressed identity count;
- device-ID exclusion count;
- lifecycle counts;
- sync-latency value.

These now come from persisted audience and lead-profile state.

The waste-control panel is labeled **eligible pool** rather than pretending every candidate is already suppressed. Actual suppression occurs only after a persisted suppression audience is created and provider sync succeeds.

### Production requirement

Mobile advertising identifiers must be first-party data collected with the appropriate user permission and platform policy compliance. Google mobile-ID Customer Match additionally needs a valid app ID associated with the source application.

CI now validates that migration 017 is present.


## Live first-party data parity hardening: audiences, Live Sync, Data Hub, Funnel, Journeys and Planner

This pass removes several remaining fixed operational metrics and extends first-party identity activation.

### Device identity + first-party audience suppression

AceMarketing now supports first-party device identity in the tracking/audience pipeline:

- `deviceId / device_id`
- `devicePlatform / device_platform`
- `appId / app_id`

Tracked customer/contact/device identities are promoted into the persisted lead/audience profile store.

Migration:

```text
backend/migrations/017_device_audience_identity.sql
```

Audience definitions can use:

- contact identity;
- device identity;
- automatic contact-first/device-fallback identity.

Audience conditions now include:

- Device ID present
- Device platform
- App ID

Provider sync re-checks marketing consent for every member before any identifier leaves AceMarketing.

Meta audience delivery supports a device-advertising-ID schema for device-mode audiences.

Google Customer Match device audiences use the mobile advertising ID upload-key type and require an application ID from the profile or `GOOGLE_CUSTOMER_MATCH_APP_ID`.

The Audiences page no longer displays fixed activated/suppressed/device/lifecycle counts. All those boxes now read persisted audience/profile state.

### Live Sync

`GET /api/live-sync` now derives:

- accepted events per minute;
- provider delivery rate;
- median observed delivery latency;
- recent ingestion/delivery activity;
- destination-level delivery history.

The previous fixed values such as `42s`, `8,412/min` and `99.82%` were removed.

The **Create alert** action now persists a real monitoring rule.

### Data Hub

`GET /api/data-hub` now builds its source registry from:

- first-party tracked events;
- lead/customer profiles;
- WhatsApp webhook activity;
- call events;
- attribution sessions/events;
- provider delivery state;
- connector-health records.

The previous fixed source volumes, freshness values, unified-record count and schema-health value were removed.

`POST /api/data-hub/rebuild` now performs and persists a canonical-state snapshot instead of returning a random queued job ID.

**Add data source** now routes directly to the Integrations workspace.

### Funnel

`GET /api/funnel` now derives funnel stages and campaign/source rows from:

- persisted lead profiles;
- lead grade / CRM stage;
- persisted meetings.

The previous fixed MBA/Meta campaign sample counts were removed.

### Journeys

`GET /api/journeys` now returns persisted lead-profile journey evidence:

- source;
- campaign;
- CRM stage / grade;
- score;
- touchpoint count;
- observed journey duration;
- last activity;
- device platform.

The previous hard-coded example people were removed.

### Planner

The strategic media planner no longer presents invented channel shares, CAC, quality scores or projected outcomes.

`GET /api/planner` now derives source allocation weights from persisted cohort analytics:

1. attributed revenue contribution when matched revenue exists;
2. acquisition-volume contribution only when revenue evidence is unavailable.

`POST /api/planner/scenarios` persists a human-approved planning scenario.

The planner explicitly states when evidence is insufficient and does not infer spend/CAC without connected spend data.

### Truthfulness rule

Operational boxes must now follow the same rule used elsewhere in the product:

> no workspace evidence → show an empty/unavailable state, not a fabricated production metric.

The UI may still contain marketing/reference examples where clearly labeled, but operational dashboards must be backed by current workspace state.


## Operational parity pass: fingerprinting, fraud, deep links, POS, behavior, feed, lead context and agents

This continuation removes another set of demo-backed workspace surfaces and wires the remaining page-header actions.

### Fingerprinting / continuity

- Continuity metrics now use persisted attribution matches/unmatched events.
- WhatsApp, call and device continuity scenarios expose real evidence counts.
- Continuity tests persist their result and report `evidence_available` or `no_evidence` instead of always returning a synthetic pass.
- Match-log view continues to read persisted attribution records.

### Sites

- Site inventory is now derived from the configured primary domain plus domains observed in tracked first-party events.
- Site installation tests report observed events, consent readiness and cross-domain identity evidence instead of always returning every check as true.
- Event debugger remains grounded in actual tracked events.

### Fraud / noise

- Fraud patterns are now generated from persisted lead scoring evidence and recent first-party event velocity.
- Block rules are persisted and audited.
- Human-review requests remain persisted in the review queue.
- Fixed affected-volume examples were removed from the operational API and UI.

### Deep links

- Deep-link definitions are persisted in workspace state.
- Create, activate and event-recording APIs are available.
- Click, app-open and conversion counts are calculated from persisted deep-link events.
- The public `#/deep/<slug>` resolver now records a click and lets the user continue to the app destination or web fallback.
- The Deep Links workspace no longer shows fixed click/app-open/conversion percentages.

### POS / stores

- POS import batches are persisted.
- Location transaction, revenue, match and import totals are aggregated from those persisted batches.
- The POS UI no longer displays fixed stores, revenue or match-rate examples.
- A batch-import dialog now captures location, record count, matched records and revenue.
- When usable identity/click evidence is supplied by an import, the backend can also record an assisted POS event.

### Reports / attribution API

- `GET /api/reports` now exposes the persisted cohort analytics and report schedule/delivery state.
- `GET /api/attribution` now returns the real attribution store instead of fixed revenue/channel percentages.

### Behavior

- Website/app behavior counts are now aggregated from the actual `/api/track` stream.
- Known-identity rate, high-intent event count and recent sequence use observed events.
- Fixed session/event counts and the synthetic journey sequence were removed.

### Feed / payload enhancement

- Feed attributes are derived from persisted lead profile fields, journey fields and custom mappings.
- Destination enrichment coverage is calculated from actual delivery payloads.
- Custom feed attributes can be persisted from the UI.
- Fixed enrichment percentages and fixed attribute counts were removed.

### Lead enrichment and grading

- Enrichment no longer fabricates a lead profile when the store is empty.
- Call and WhatsApp context show persisted summaries only.
- Lead Grading no longer seeds example people, scores, grade counts or score drivers.
- Distribution is derived from current lead-ops statistics.

### Agents

- Built-in agent status is now based on current workspace prerequisites such as connected ad platforms, lead profiles, call activity and configured transport URLs.
- Custom agents are persisted through `POST /api/agents/custom`.
- Recent runs come from the persisted agent-run store.
- The fixed “7 active” status and synthetic recent-run rows were removed.

### Workspace header actions

Every `PageHead` with an action now has a handler.

Examples:

- New Event opens the real event-rule builder.
- Offline Attribution routes to event-rule creation.
- Identity review routes to Fingerprinting.
- Reports scrolls to the persisted report schedule form.
- Routing opens recent persisted decisions.
- Call / Feedback configuration routes to Agents.
- Monitoring and Alerts route between live rules and incidents.

A static scan of `frontend/src/AcePlatform.tsx` now returns zero `PageHead` actions without an `onAction` handler.

### Product identity note

AceMarketing may reproduce comparable public workflows, information architecture and feature behavior, but proprietary EasyInsights source code, copyrighted copy/assets, logos, screenshots and private implementation details are not copied into this repository. External case-study metrics remain clearly labeled as reference benchmarks rather than AceMarketing customer results.


## Navigation dropdown and dashboard visibility fix

This pass fixes the two UI failures shown in the supplied screenshots.

### Public navigation mega menus

The **Industries**, **Agents**, and **Resources** navigation items now behave as actual dropdown triggers instead of immediately navigating away.

Implemented behavior:

- click toggles the matching mega menu;
- hover opens the matching menu on desktop;
- keyboard focus opens it;
- `Escape` closes it;
- clicking outside the header closes it;
- `aria-haspopup` and `aria-expanded` are present;
- selecting an item performs the final navigation;
- dropdowns animate into view;
- responsive layouts below 980px no longer forcibly hide the Agents / Resources mega menus.

The previous responsive CSS contained:

```css
.agents-menu,.resources-menu{display:none}
```

inside the sub-980px breakpoint. That hard-disable has been removed and replaced with a responsive full-width mega-menu layout.

### Workspace dashboard visibility

The workspace sidebar previously contained more navigation items than a single viewport could display while the sidebar itself was fixed to `100vh`.

Because the overflowing navigation was not given its own scroll region, it extended below the sidebar background and made the entire document scroll. At those lower scroll positions the dashboard main content had already ended, which created the blank white dashboard shown in the screenshot.

The workspace now uses:

- `height: 100vh` + `overflow: hidden` on the product shell;
- an independently scrollable `.product-nav`;
- a fixed-height `.product-sidebar`;
- an independently scrollable `.product-main`;
- sticky dashboard header inside the main workspace;
- section labels inside the long sidebar for easier navigation;
- persisted active dashboard tab;
- **Overview** as the default first dashboard view.

This keeps the selected feature content visible beside the sidebar instead of allowing the sidebar overflow to push the user into a blank document region.

### Dashboard feature access

All existing workspace modules remain available in the sidebar and clicking a module changes the active dashboard view in the visible main panel. The sidebar itself now scrolls independently so every module remains reachable without moving the main content off-screen.


## Dashboard architecture and navigation upgrade

This pass turns the workspace into a structured operating console instead of a flat 41-item navigation list.

### Six collapsible dashboard sections

All 41 workspace modules are now grouped into:

1. **Workspace**
   - Overview
   - Launchpad

2. **Tracking & Data**
   - AdSync
   - Funnel
   - Events
   - Adjustments
   - Diagnostics
   - Fraud
   - Deep Links
   - Sites
   - Fingerprinting
   - Live Sync
   - Data Hub
   - Offline Attribution
   - Matchback
   - POS & Stores

3. **Measurement & Intelligence**
   - Journeys
   - Identity
   - Models
   - Attribution
   - Planner
   - Reports

4. **Lead & Conversion**
   - Enrich
   - Lead Grading
   - Behavior
   - Feed
   - Agents
   - Routing
   - Follow-ups
   - Calls
   - Meetings
   - Feedback
   - Approvals
   - Ask Ace

5. **Activation & Integrations**
   - Integrations
   - Audiences
   - Delivery

6. **Operations & Developer**
   - Monitoring
   - Alerts
   - Developers
   - Settings

Every module appears exactly once. A repository-level validation confirms 41 dashboard tabs and 41 grouped section entries with no missing or duplicated module.

### Sidebar usability

The sidebar now supports:

- collapsible sections;
- persistent open/closed section state;
- automatic expansion of the active section;
- feature search using **Find feature...**;
- active-tab persistence;
- active-module indicator;
- independent sidebar scrolling;
- compact mobile rendering.

### Live dashboard command center

A new authenticated backend endpoint:

```text
GET /api/dashboard-summary
```

aggregates workspace evidence from:

- lead/profile state;
- first-party tracked events;
- attribution;
- event rules;
- audiences;
- durable queue statistics;
- signal delivery state;
- integrations;
- meetings;
- follow-ups;
- agent runs;
- monitoring.

The endpoint returns:

- workspace readiness percentage;
- readiness by operating area;
- known profiles;
- connected systems;
- matched attribution events;
- active audiences;
- meetings and follow-ups;
- agent runs;
- delivery success/failures;
- dead-letter count;
- recent cross-module activity.

### Overview redesign

The Overview now acts as the main workspace operating page with:

- workspace-readiness hero;
- live KPI cards;
- six operating-area readiness cards;
- quick actions;
- funnel summary;
- operational health links;
- recent event/delivery/agent activity;
- direct navigation into the relevant module.

No fixed provider-success percentages are introduced by the command center. Values come from the workspace summary API.

### Dashboard visual system

The workspace received a visual polish pass:

- gradient sidebar shell;
- grouped navigation;
- soft active-module gradients;
- readiness cards;
- quick-action tiles;
- activity-type indicators;
- subtle hover/entrance motion;
- reduced-motion accessibility support;
- improved responsive layouts.

### Regression coverage

Playwright coverage was updated to verify:

- public Agents mega menu opens before navigation;
- workspace opens on the Overview command center;
- dashboard sections collapse and expand;
- feature search can locate a module;
- a searched module remains navigable;
- existing critical operating pages remain reachable.

The dashboard-navigation tests are part of the existing `tests/e2e/platform.spec.ts` suite.


## Dashboard truthfulness and conversion-workflow completion pass

This continuation removes the remaining high-visibility demo state from core workspace configuration and conversion operations.

### Launchpad

Launchpad readiness is now computed from actual workspace evidence instead of local preset checkmarks.

The backend evaluates:

- workspace/settings configuration;
- connected integrations;
- persisted lead profiles;
- first-party tracking activity;
- event rules;
- signal-delivery records;
- audience state;
- agent activity.

The UI shows the live readiness percentage and lets the operator jump directly into the module that needs work.

### Identity

The Identity page no longer displays fixed profile totals, deterministic-match percentages, example people or fake identifier values.

It now derives:

- known profile count;
- profiles containing multiple first-party identifiers;
- observed customer/contact/device identifier coverage;
- click-ID evidence;
- recent persisted identity profiles;
- deterministic/supporting match-rule definitions.

### Models

The Models endpoint no longer advertises fabricated AUC, precision or model-validation numbers.

The current model catalog only shows scoring services implemented by the workspace runtime:

- lead-quality scoring;
- journey-propensity feature set.

Running a model creates a persisted scoring snapshot with the actual profile population and current average score. Validation remains explicitly labeled as operational evidence rather than offline statistical validation.

### Settings

Notification preferences are now editable and persisted:

- critical delivery failure notifications;
- connector-token expiry notifications;
- stale-audience notifications;
- daily performance summary;
- notification email;
- Slack notification enablement.

Agent approval boundaries are also persisted for:

- signal return;
- CRM enrichment;
- qualification calls;
- audience suppression;
- custom integration writes.

### Legacy workspace overview

The legacy `GET /api/workspace/overview` endpoint no longer returns fixed revenue, lead, signal-coverage or active-agent values. It now derives its values from lead, attribution, agent-run and delivery state.

### Routing

Routing metrics now come from persisted routing decisions:

- routed today;
- retained decision history;
- observed destinations;
- matched rule names;
- destination load.

The rule catalog matches the implemented routing engine instead of a separate UI-only rule list.

### Follow-ups

The Follow-ups page no longer initializes fictional lead records or fixed recovery totals.

It now:

- starts from the persisted follow-up table;
- calculates open/completed/overdue counts in the backend;
- provides a real **Create follow-up** form;
- persists manually created tasks;
- completes persisted tasks;
- opens matching journey context when available.

### Feedback

The Feedback page no longer seeds fictional responses or fixed satisfaction/objection totals.

It now:

- reads persisted feedback only;
- calculates response count and average score;
- calculates low-satisfaction count;
- groups actual response themes;
- provides a real **Record feedback** form.

### Approvals

The approval center no longer seeds fictional approval requests.

It reads the persisted approval queue and reports:

- pending;
- approved;
- rejected;
- total retained requests.

Approval and rejection actions continue to persist through the backend.

### Regression coverage

Playwright now covers:

- live Launchpad;
- live Identity;
- implemented model catalog;
- editable notifications;
- editable approval boundaries;
- follow-up creation entry point;
- feedback recording entry point;
- approval center;
- live routing surface.

The guiding dashboard rule remains:

> Operational data must come from workspace evidence. If evidence does not exist, the UI shows an explicit empty/unavailable state rather than a fabricated success metric.


## Dashboard navigation enhancement (2026-09-26)

The production workspace now includes a persistent **Dashboard Navigator** in addition to the complete grouped sidebar. It gives operators one-click access to the highest-frequency operating areas without flattening or removing any existing feature.

### Quick sections

- **Command Center** — overall KPIs, operating health, revenue and signal summary.
- **Data Hub** — unified customer, event, identity and revenue truth.
- **Journeys** — stitched online/offline customer paths.
- **Attribution** — campaign, channel and revenue credit analysis.
- **Audiences** — first-party audience building, preview, scheduling and activation.
- **Agents** — lead grading, qualification, routing, follow-up and automation.
- **Integrations** — advertising, CRM, analytics, calling, messaging and commerce connections.
- **Monitoring** — reliability, delivery health, usage and alert operations.
- **Settings** — workspace, access, tracking, governance and developer controls.

### UX behavior

- Navigator only appears inside `#/workspace`.
- It dispatches through the existing `ace-app-tab` event contract, so it does not bypass or duplicate current page state.
- Compact mode preference is saved in local storage.
- Mobile layout collapses to a single-column selector.
- Motion respects `prefers-reduced-motion`.
- Existing grouped sidebar remains the source of truth for the full feature catalogue.

### EasyInsights capability parity direction

AceMarketing continues to implement the same broad operating categories commonly required for first-party marketing data activation: stitched journeys, server-side signal return, attribution, audience activation, lead operations and funnel automation. Product copy, branding and implementation remain AceMarketing-owned rather than reproducing third-party proprietary assets verbatim.


### Live dashboard section strip (2026-09-26)

The workspace header now exposes the six primary operating sections as a persistent, backend-aware section strip: **Workspace**, **Tracking & Data**, **Measurement & Intelligence**, **Lead & Conversion**, **Activation & Integrations**, and **Operations & Developer**.

Each section:

- opens its primary workspace tab immediately;
- reads readiness from the existing `/api/dashboard-summary` backend evidence;
- shows **Ready**, **Needs setup**, or **Checking…** state rather than a decorative/static badge;
- refreshes automatically every 30 seconds;
- remains horizontally scrollable on small screens;
- keeps the original grouped sidebar and floating Dashboard Navigator intact;
- uses reduced-motion-safe transitions and entrance animation.

This improves navigation without deleting or flattening the existing feature hierarchy.


### Shared API reliability hardening

The frontend API client now preserves backend validation/provider errors instead of collapsing every failure into a generic HTTP status. `AceApiError` carries the HTTP status, backend payload, and `X-Request-ID` when available, while network failures are identified separately. This improves every dashboard action that depends on the shared client, including integrations, event rules, audiences, calls, meetings, approvals, signal delivery, billing, privacy and settings.


### Integration reliability and full-card actionability

The Integrations workspace now treats every visible connector as an actionable path instead of presenting unsupported cards as if they were native OAuth integrations.

- Native OAuth connectors use provider authorization and encrypted connector credentials.
- Manual/non-native connectors open the Custom Integration Builder with the selected provider prefilled.
- The backend connector catalog is aligned with the full dashboard catalog.
- Connector token health is returned by `GET /api/integrations`.
- OAuth credentials now expose expiry/refresh-required state to the frontend.
- `POST /api/integrations/refresh` now has an implemented refresh-token flow instead of referencing an undefined helper.
- Refresh writes updated encrypted credentials, connection expiry, status and an audit event.
- The dashboard reports the actual built-in connector count rather than an unsupported marketing count.

Native OAuth support currently exists for the providers explicitly configured in `CONNECTOR_PROVIDERS` (including Google Ads/GA4/Calendar, Meta/WhatsApp, LinkedIn, HubSpot, Salesforce and Zoho). Other displayed systems remain fully actionable through the configurable REST/webhook/SFTP/database adapter path until a dedicated native connector is implemented.


### Built-in agent operational routing

The 11 built-in agents are no longer status-only cards. The backend now returns category, description, prerequisites, operational action and destination tab for every built-in agent. The frontend renders those prerequisites and provides a direct action into the real operating module.

Operational routing:

- Meta Advanced CAPI → Delivery
- Google ECL / OCI → AdSync
- Call Tracking Events → Calls
- Custom Integration → Integrations
- Lead Grading → Lead Grading
- CRM Enrichment → Enrich
- Voice Lead Qualification → Calls
- Voice Scheduler → Meetings
- Meeting Reminder → Meetings
- Feedback Agent → Feedback
- Ask Ace → Ask Ace

This keeps the agent library aligned with the public EasyInsights 11-agent structure while ensuring AceMarketing cards route to implemented AceMarketing workflows rather than static detail panels.


### CI interaction hardening — consent banner

The consent surface is intentionally non-blocking: optional analytics/marketing remain disabled until the visitor chooses a preference, but the banner does not prevent public navigation or workspace interaction. The full-screen consent wrapper now uses `pointer-events: none` while the banner itself remains interactive, and the banner is exposed as an accessible region instead of a modal dialog. This fixes mobile Playwright failures where the consent overlay intercepted clicks on its own controls and unrelated dashboard/public navigation.


### Backend-driven funnel controls

The Funnel workspace filters are now operational instead of cosmetic.

- Channel, disposition and date window are sent to `GET /api/funnel`.
- Supported server-side date windows are 7, 30 and 90 days.
- Lead/profile timestamps and meeting timestamps are filtered on the backend before aggregation.
- Channel filtering is applied before funnel-stage totals and campaign aggregation.
- Disposition filtering restricts campaign rows to campaigns with the selected downstream stage.
- The backend returns available channel values for the active date window so the UI does not infer them from an already-filtered result.
- Funnel statistics, campaign rows and CSV export now reflect the same active filter state.
- CSV exports include filter metadata and the selected date-window suffix in the file name.


### Reports truthfulness and persisted schedules

The Reports workspace no longer renders hard-coded scheduled-report rows that imply delivery channels or active schedules which do not exist.

- The report list always includes the live Cohort Performance view.
- Every additional row is loaded from persisted `ace_report_schedules` records.
- Selecting a persisted schedule shows its real cadence, recipients, lookback window, next run, last run and last status.
- `Send report now` queues the selected persisted schedule through the existing durable report worker.
- Creating a schedule persists it first, refreshes the list, and selects the newly created schedule.
- The UI no longer claims Slack delivery; the implemented delivery path is SMTP email with CSV attachment.
- Recent delivery history remains sourced from persisted `ace_report_deliveries` records.


### Backend-filtered attribution windows

The Full-path Attribution period selector is now operational.

- 7, 30 and 90 day windows are sent to `GET /api/attribution-identity/stats`.
- The attribution store filters click sessions by `first_seen_at` and assisted events by `occurred_at` before calculating totals.
- Match methods, matched/unmatched counts, match rate, matched value and recent evidence all use the selected backend time window.
- Active click-session coverage is calculated from the same selected window.
- The UI refreshes automatically when the period changes and exposes an explicit refresh action.


### Responsive workspace drawer

The product workspace now uses a real mobile navigation drawer instead of compressing the full 40+ feature sidebar into a narrow rail.

- Below 720px the main workspace becomes full width.
- An explicit **Open workspace navigation** control opens the drawer.
- The full feature search and grouped navigation remain available inside the drawer.
- Selecting a feature closes the drawer and returns focus to the operating surface.
- A backdrop provides a predictable close target.
- The drawer respects reduced-motion preferences.
- The floating Dashboard Navigator moves above the privacy banner when consent choices are visible so both controls remain usable.
- Sidebar group, section-strip and header controls now have distinct accessible names to avoid ambiguous navigation targets.


### AdSync signal pipeline operations

AdSync is now an operational signal-pipeline control center rather than a funnel-only surface.

- The page loads persisted event rules and keeps only rules targeting Google Ads or Meta Ads.
- Pipeline cards show the persisted source event, normalized output event, destination and enabled/paused state.
- The selected pipeline shows observed rule-run count and persisted delivery outcomes.
- A pipeline can be paused or enabled through the existing event-rule backend.
- **Send test source event** uses the first-party ingestion endpoint, so enabled rules are evaluated through the same production path used by real events.
- The resulting outbound signals are inspected in the existing durable Delivery center, including receipts, retries and dead-letter state.
- The page provides direct navigation to Event Rules and Delivery rather than duplicating their controls.
- Creating a pipeline persists a real event rule and refreshes the operational list.


### Conversion adjustments without demo seed data

Conversion Adjustments now uses production-truthful state only.

- Empty workspaces remain empty; the backend no longer seeds example adjustments automatically.
- `POST /api/adjustments` creates a validated pending adjustment with event, source, destination, original value, adjusted value, currency and reason.
- Adjustment creation records an audit event.
- Existing preview/apply flows remain unchanged and operate on the newly persisted adjustment.
- The UI exposes **New adjustment**, shows a truthful empty state, and selects the newly created adjustment after persistence.
- Values accept either numeric corrections or bounded text outcomes such as `lead → excluded`.


### Persisted lead-routing rules

Lead Routing is now an operational workspace rule system instead of a read-only list of hard-coded cards.

- Built-in routing templates remain visible as safe defaults.
- `POST /api/routing/rules` creates persisted workspace routing rules.
- Custom rules can be paused and enabled through `POST /api/routing/rules/toggle`.
- The frontend displays built-in versus workspace rule type and current status.
- **Test selected rule** now passes the selected rule to the routing engine and persists the resulting routing decision.
- Routing decisions continue to populate destination load, routed-today metrics and recent routing history.
- Existing default routing behavior remains available when no configured rule is forced.


### Self-service meeting scheduling

The Meetings workspace is now self-contained instead of depending on Calls or another module to create the first meeting.

- **Schedule meeting** creates a persisted consultation through the existing `POST /api/meetings` backend.
- Users can provide lead reference, start time, owner, attendee email/phone and no-show risk.
- Calendar sync can be requested per meeting; when Google Calendar is connected, the backend creates the external calendar event and stores the returned event/meeting links.
- Users can still connect Google Calendar directly from the Meetings list header.
- Existing reschedule and provider-backed reminder operations continue to work on the same persisted meeting record.
- Attendee contact is collected during scheduling so manual reminder actions have a real destination.


### Real-data closure matchback

Closure Matchback no longer displays seeded revenue totals, invented outcome counts, or fabricated per-rule match percentages.

- Empty workspaces start with zero persisted matchback rules.
- `POST /api/matchback/rules` creates a real matchback configuration with source, event type, destination and identity method.
- Rules can be paused/enabled through `POST /api/matchback/rules/toggle`.
- Reconciliation requires a persisted active rule ID.
- Each reconciliation stores last-run time, status, matched count and unmatched count on the selected rule and creates an audit record.
- Workspace-level matched value, matched/unmatched outcomes and match rate remain sourced from the live attribution store.
- Suggested templates are explicitly configuration examples only and carry no fake performance metrics.


### Stitched customer journey chronology

The Journey Explorer now renders a real cross-system chronology instead of a summary-only card.

- `GET /api/journeys` assembles lead-linked activity from persisted lead profiles, first-party tracked events, routing decisions, follow-ups, meetings, reminders, feedback, call context, WhatsApp context and CRM stage updates.
- Only records that can be linked to the selected lead are included.
- Journey duration and touchpoint totals are derived from the assembled chronology.
- The frontend shows source, campaign, stage, score/grade and a timestamped event timeline.
- The previous placeholder notice about chronology being unavailable has been removed.
- Timeline motion is subtle and honors `prefers-reduced-motion`.


### Persisted offline attribution rules

Offline Attribution is now self-contained instead of redirecting users to Event Rules.

- Empty workspaces start with no persisted offline rules.
- `POST /api/offline-attribution/rules` creates a source-to-identity-to-destination rule.
- Rules can be paused/enabled through `POST /api/offline-attribution/rules/toggle`.
- Suggested call, WhatsApp, partial-payment and walk-in templates are configuration examples only.
- `POST /api/offline-attribution/test` records a real assisted event through the attribution store using customer ID, email, phone, GCLID and/or FBCLID evidence.
- The selected rule stores last test time, match status and match method.
- Call and WhatsApp counters remain sourced from verified webhook state; matched/unmatched totals remain sourced from the attribution store.


### Self-service site and pixel operations

Site & Pixel Operations is now self-contained and reports real installation evidence.

- `POST /api/sites` persists a tracked domain and environment.
- Empty workspaces can add their first property directly from the Sites workspace.
- Installation testing no longer assumes success after the request returns.
- The backend test result explicitly reports browser-event evidence, server reachability, consent readiness, cross-domain identity evidence and observed event count.
- The UI changes to **Evidence verified** only when browser events are actually observed; otherwise it offers **Retest installation**.
- The event debugger continues to show only real tracked/persisted events and never injects synthetic activity.


### Transaction-level POS attribution

POS & Stores now calculates identity match rate from actual transaction rows instead of accepting a user-declared matched-record count.

- POS imports accept transaction-level rows with transaction ID, revenue, timestamp and optional customer/contact/click identifiers.
- Each row is recorded as a `store_sale` assisted event and reconciled by the attribution store.
- Batch `matched`, `unmatched` and `matchRate` are computed from returned reconciliation state.
- Offline revenue is summed from the imported transaction rows.
- The manual **Matched records** field has been removed from the dashboard.
- Import history now displays computed matched/unmatched outcomes per batch.
- A downloadable CSV template documents the supported identity fields.


### Workspace-defined custom scoring models

The Models workspace now supports persisted customer-defined scoring models in addition to the built-in runtime scorers.

- `POST /api/models` creates an explainable weighted scoring model.
- Supported first-party features are lead score, journey depth, pricing-page views, WhatsApp engagement and meeting presence.
- Feature weights are visible in the UI and bounded to avoid opaque/unbounded formulas.
- `POST /api/models/run` scores real persisted profiles, stores rows scored, average score and score range, and updates the selected custom model's latest run state.
- Custom models are clearly labelled as workspace-defined weighted scoring; AceMarketing does not claim predictive accuracy without customer outcome validation.
- Validation history continues to use persisted model runs and lead population.


### Destination-aware feed enhancement

Feed & Payload Enhancement now manages explicit source-field → destination-field contracts instead of only registering attribute names.

- `POST /api/feed/mappings` persists a mapping with source attribute, destination, target field and transform.
- Mappings can be paused/enabled through `POST /api/feed/mappings/toggle`.
- `POST /api/feed/preview` builds an enhanced payload preview from the latest persisted profile plus custom attribute samples.
- The preview is destination-specific and shows the exact generated payload, mapping count and source profile boundary.
- Delivery-history enrichment rates remain based on persisted outbound delivery payloads.
- Feed previews do not claim provider acceptance; they validate only the mapping contract before live dispatch.


### Searchable integration catalog and connector requests

The Integrations workspace now exposes a broader connector catalog while keeping capability status truthful.

- Native OAuth connectors remain explicitly labelled as native.
- Non-native catalog entries are labelled **Configurable adapter** and route through the existing tested custom-integration builder instead of pretending OAuth support exists.
- The catalog now covers CRM, messaging, calling, commerce/forms, warehouses/databases/storage, advertising/analytics and sales-intelligence categories.
- Users can search the full catalog by connector or category.
- `POST /api/integration-requests` persists a connector request with connector name, business need, direction and priority.
- Requested connectors are visible in the workspace and counted separately from connected/native integrations.


The public Integrations route mirrors the same expanded catalog and includes search across CRM, messaging, calling, commerce/forms, warehouse/database/storage, advertising/analytics, and sales-intelligence categories. Public catalog entries describe discoverability only; actual native OAuth versus configurable-adapter capability remains explicit inside the authenticated workspace.


## Full workspace navigation and dashboard polish pass

The authenticated workspace now has a faster navigation layer on top of the existing grouped sidebar and section-status strip.

Implemented:
- searchable floating dashboard navigator covering the complete workspace feature set;
- direct navigation across Launchpad, signal quality, stitched data, attribution, conversion agents, audiences, delivery, monitoring, developer tooling and settings;
- grouped navigation into Start & Measure, Unify & Attribute, Convert with Agents, and Activate & Operate;
- `Ctrl/Cmd + K` keyboard access while inside `#/workspace`;
- responsive two-column/one-column navigator layout;
- compact-mode preference persisted in local storage;
- reduced-motion support and focus/hover interaction polish;
- existing sidebar navigation, API-backed pages and hash routing remain unchanged.

The navigator dispatches the existing `ace-app-tab` workspace event, so it reuses the same page components and backend-connected functionality instead of creating duplicate screens.


## Actionable business-event template pass

The Conversion Event Manager now turns backend-provided event templates into real, editable workspace workflows instead of static reference rows.

Implemented:
- backend template metadata for category, description, business use case, destinations, value mode and currency;
- reusable lead-quality, commerce and attribution event templates;
- Pricing-page Lead, New Customer Purchase, High-value Purchase, Prepaid Order, Fulfilled Order, Returned Order, First-touch Attribution and Last-touch Attribution templates;
- category filters in the dashboard;
- `Use template` action for every template card;
- editable rule name, source event, output event, condition field/operator/value, currency and activation destinations;
- live human-readable rule preview before persistence;
- measurement-only support for attribution/negative-quality events that should not automatically be sent to ad platforms;
- persisted creation through the existing `POST /api/events/rules` endpoint;
- enabled/paused state remains enforced by the event-rule backend;
- clickable recent rule matches now return the operator to the matching persisted rule;
- Playwright coverage for selecting a template, verifying its prefilled logic and persisting the rule.

This closes a usability gap where template rows were visible but not actionable. The template system now produces the same persisted event rules used by ingestion, attribution and provider activation.


## Full-path attribution analysis pass

The Attribution workspace now goes beyond match-method counts and exposes persisted source, campaign, outcome and match evidence from the attribution store.

Implemented:
- backend joins between assisted outcomes and their matched click sessions;
- source/channel contribution ranking;
- campaign contribution ranking;
- attributed event-value totals and share calculations;
- average deterministic match confidence;
- outcome-type ranking;
- recent matched/unmatched outcome evidence with source, campaign, match method and currency;
- source/campaign evidence counts from persisted UTM, landing-page and referrer fields;
- channel, campaign, outcome and match-evidence tabs in the dashboard;
- direct navigation from attribution into Journeys and Matchback;
- explicit unmatched-state handling instead of forcing unknown conversions into a channel;
- responsive and animated attribution UI with reduced-motion support;
- Playwright coverage that creates a real tracked click session + assisted closed-won outcome and verifies the source/campaign attribution appears in the UI.

The attribution engine remains deterministic: customer ID, click IDs, hashed phone/email and visitor identity are used in priority order. Unmatched events remain unmatched until sufficient evidence exists.


## Governed custom-agent execution pass

Custom agents now have an operational test path instead of stopping at configuration storage.

Implemented:
- `POST /api/agents/custom/test`;
- approval gating: pending or rejected agents cannot execute tests;
- persisted custom-agent test runs through the existing agent orchestration store;
- successful test runs complete with explicit output evidence;
- safe `Route to sales queue` actions execute a real persisted routing decision;
- external mutation actions (CRM write, conversion signal return, audience suppression) remain behind their dedicated governed integration workflows instead of being simulated;
- Agents UI now links pending custom agents to the Approval Center;
- active custom agents expose a Test Agent workflow with lead/entity context, score, source and routing destination;
- last test result is displayed with persisted operation evidence;
- recent runs are filtered to the selected custom agent;
- Playwright coverage creates an auto-run routing agent, executes it, and verifies the resulting routing decision appears in the Routing workspace.

This preserves the platform's human-approval boundary while making custom agents demonstrably executable where the action is safe and fully supported.


## Actionable lifecycle and suppression audiences

The Audience workspace now turns lifecycle and waste-control cards into real audience operations rather than informational counters.

Implemented:
- safe multi-value audience matching with the `is one of` operator;
- comma-separated text values are normalized and passed to PostgreSQL as a bounded text array;
- lifecycle presets for Acquisition, Nurture, Decision and Post-purchase stages;
- waste-control presets for converted customers, device-ID identities and low-quality C/D leads;
- each preset opens the real Audience Builder with its rule, identity mode, activation mode and destination prefilled;
- the backend calculates a live preview from persisted lead profiles before creation;
- operators can review/edit a preset before persistence;
- created presets use the same `POST /api/audiences` materialization path as custom audiences;
- suppression presets materialize persisted audience members and remain eligible for the existing consent-checked provider sync workflow;
- responsive hover/transition polish and reduced-motion support;
- Playwright coverage creates persisted C- and D-grade leads, opens the Low-quality Lead suppression preset, verifies multi-value matching, materializes the audience and confirms the Suppress segment appears in the dashboard.

This closes the gap between audience analytics and audience activation: the lifecycle/waste-control cards now execute the workflows they describe.


## Persisted behavior intelligence pass

The Behavior workspace now analyzes persisted first-party tracking evidence instead of relying only on a flat in-memory event counter.

Implemented:
- consented `/api/track` events are additionally persisted into the workspace state with a 5,000-event bounded window;
- raw email and phone values are removed before persistence, while existing or derived SHA-256 contact identifiers are retained;
- behavior analytics now expose event, source, campaign and device distributions;
- known-identity rate includes customer, visitor, device and hashed-contact evidence;
- high-intent and device-identity rates are calculated from the persisted stream;
- Behavior dashboard tabs for Events, Sources, Campaigns and Devices;
- ranked contribution rows with recent matching evidence;
- latest first-party sequence now includes source/campaign/device context;
- the UI identifies whether it is reading the persisted workspace store or a process-only fallback window;
- responsive analysis layout, transitions and reduced-motion support;
- Playwright coverage sends real consent-safe first-party events and verifies source, campaign, device and event analysis in the dashboard.

This makes website/app behavior useful as journey and activation evidence across server restarts while keeping raw contact PII out of the persisted behavior record.


## Workspace event isolation and CI reliability pass

The first-party event buffer is now isolated by workspace instead of being process-global.

Implemented:
- in-memory tracked-event windows are stored in a workspace-keyed map;
- every authenticated/API request receives only the current workspace event buffer inside the existing `withWorkspace` context;
- persisted behavior evidence remains workspace-scoped in the durable store;
- Playwright now assigns a unique workspace tenant to every test/retry/project and sends the same `X-Workspace-ID` through browser and direct API requests;
- workspace navigation helper now recovers the workspace surface before dispatching tab changes;
- active navigation-group collapse test no longer asserts against a group that React intentionally keeps open;
- ambiguous Attribution/Monitoring and duplicate text locators were tightened.

This removes cross-tenant in-memory behavior leakage and substantially reduces state races in the desktop/mobile end-to-end suite.


## CRM enrichment operational pass

CRM Enrichment is now fully wired through the frontend API client and exposes an operational lead-selection/writeback workflow.

Implemented:
- added missing frontend API client methods for `/api/enrich`, `/api/enrich/writeback`, `/api/lead-grading`, `/api/lead-grading/override`, and `/api/lead-grading/activate`;
- audited every `api.*` call used by `AcePlatform.tsx` and confirmed there are no remaining undefined client methods;
- searchable enriched-lead list by name, lead ID, source, campaign, stage, or grade;
- per-lead acquisition, campaign, CRM stage, journey depth, pricing-page, intent, call, WhatsApp, and scoring evidence;
- explainable score-driver display;
- governed CRM writeback actions for HubSpot, Zoho CRM, and Salesforce;
- visible writeback run history with queued/running/succeeded/failed state and error evidence;
- writeback requests continue through the existing durable job queue and worker `crm_writeback` handler rather than simulating immediate provider success;
- responsive dashboard layout and reduced-motion-safe interactions;
- Playwright coverage creates a persisted lead, finds it in CRM Enrichment, queues a HubSpot writeback, verifies the HTTP 202 response, and confirms the persisted writeback run appears in the UI.

This closes a runtime gap where the Enrich and Lead Grading screens referenced API client methods that did not exist even though the backend routes were implemented.


## Executable lead-grade activation pass

Lead Grading now creates persisted downstream operations instead of returning only a recommendation payload.

Implemented:
- Grade A creates a priority sales-routing decision with a 2-minute SLA;
- Grade B creates a standard sales-routing decision with a 5-minute SLA;
- Grade C creates a persisted nurture follow-up task;
- Grade D creates a governed suppression-review follow-up and points the operator to Audiences;
- every activation writes an audit record with grade, operation type, operation ID and next workspace tab;
- the Lead Grading UI shows the created operation, destination/status and a direct link into Routing, Follow-ups or Audiences;
- dashboard copy now matches the actual backend behavior instead of implying signal return/retargeting happens automatically;
- animated activation-result feedback respects reduced-motion preferences;
- Playwright coverage creates a persisted lead, forces Grade A, executes the activation, opens Routing and verifies the resulting priority routing decision.

This makes "Use grade in activation" a real workflow rather than a presentation-only action.


## Dashboard reliability and accessibility follow-up

A CI-driven reliability pass removed several false negatives and one real public-surface accessibility defect.

Implemented:
- CI raises `RATE_LIMIT_PER_MINUTE` only inside GitHub Actions so the combined smoke/load/Playwright suite does not throttle itself; the production default remains unchanged;
- sidebar collapse assertions now verify visual collapse instead of DOM removal;
- Behavior E2E selectors are scoped to the Behavior tab strip and analysis rows;
- public header brand, mobile navigation toggle and footer brand now expose explicit accessible names;
- the latest public-surface accessibility regression therefore tests real named controls instead of silently tolerating icon-only buttons.

The previous CI run improved to 83/94 Playwright tests passing after the rate-limit correction; the current head includes the additional API wiring, selector, accessibility and runtime fixes that address several of the remaining failures.


## Actionable feedback-agent routing pass

The Feedback agent now supports the full operating loop from outreach through recovery work instead of stopping at passive feedback display.

Implemented:
- provider-backed feedback requests can be queued from the Feedback dashboard through the existing agent worker;
- recorded responses remain persisted in the feedback store;
- each feedback card now exposes `Route insight`;
- low-satisfaction responses create high-priority customer-recovery call tasks;
- pricing/fee objections create high-priority sales-manager follow-ups;
- product/program mismatch creates a sales-operations disposition-review task;
- high-scoring promoter feedback creates a low-priority marketing/testimonial review task;
- each routed response writes an audit record linking the feedback item to the created follow-up;
- the dashboard displays the created owner, priority, channel and action with direct navigation into Follow-ups;
- feedback routing policy cards now document the real backend behavior rather than a suggestion-only mapping;
- responsive animation and reduced-motion handling were added for routing results;
- Playwright coverage records low-satisfaction pricing feedback, routes it, opens Follow-ups and verifies the persisted recovery task.

This completes the feedback loop: request → collect → understand → route → follow up.


## Voice qualification initiation pass

The Calls workspace can now initiate Voice Lead Qualification instead of only observing/retrying existing runs.

Implemented:
- `Start qualification` action in Calls;
- qualification builder for lead reference, phone number, source, initial intent score and trigger;
- frontend submission through the existing `POST /api/qualification-calls` endpoint;
- persisted `voice_qualification` agent run created before external execution;
- durable `agent_action` job queued for the worker;
- call activity refreshes immediately and selects the newly queued run;
- provider execution remains honest: the worker needs a configured voice-qualification transport to complete the call, otherwise retry/failure evidence is preserved;
- existing call-tracking webhook events, retries, consultation scheduling and agent configuration remain intact;
- Playwright coverage creates a qualification run from the Calls UI, verifies HTTP 202 and confirms the persisted run appears in recent call activity.

This closes the UI gap for the Voice Lead Qualification agent: operators can now start, observe, retry and schedule from the same conversion workspace.


## Ask Ace funnel handoff monitoring pass

Ask Ace now covers the step-by-step funnel-monitoring use case with persisted workspace evidence rather than only campaign/attribution summaries.

Implemented:
- new grounded `funnel_monitoring` intent for natural-language questions about funnel drops, handoffs and stage coverage;
- evidence is assembled from persisted lead profiles, routing decisions, voice-qualification agent runs, meetings, feedback and follow-ups;
- the response reports observed coverage for Lead profiles, Routed leads, Voice-qualified/attempted, Meetings scheduled and Feedback captured;
- the thinnest observed handoff is identified from actual workspace coverage instead of a hard-coded funnel;
- confidence becomes low when no lead population exists rather than fabricating funnel percentages;
- Ask Ace starter prompts now include `Where is the funnel dropping between lead and revenue?`;
- the grounded-analysis context explicitly exposes funnel-handoff evidence;
- Playwright coverage creates a real lead profile, verifies the API returns `funnel_monitoring` with grounded evidence, then asks the same question in the UI and confirms the handoff cards render.

This closes the step-by-step monitoring gap for the Journey & Attribution assistant while keeping all answers evidence-backed.


## Repeat-purchase and abandoned-checkout event parity

The business-event catalog now includes two additional commerce patterns documented by EasyInsights-style event workflows.

Implemented:
- `Repeat Purchase`: derives `repeat_purchase` from a purchase event when `properties.purchaseCount >= 2`;
- `Abandoned Checkout`: derives `abandoned_checkout` from an explicit `checkout_abandoned` event emitted by the commerce backend/webhook after its inactivity window;
- the abandoned-checkout template deliberately does not pretend a stateless browser rule can measure 30 minutes of elapsed time by itself;
- both templates use the existing safe event-rule engine, PostgreSQL persistence, assisted-event creation, consent-gated Google Ads / Meta Ads activation, rule-run audit trail and enable/pause controls;
- both templates are editable before persistence, including source event, output event, conditions, value mode, currency and destinations;
- Playwright coverage verifies the Repeat Purchase condition and creates a real persisted rule, and verifies the Abandoned Checkout webhook/backend semantics and rule-builder fields.

This brings the commerce event template catalog closer to the documented business signals while preserving truthful execution boundaries.


## Signal-return agent quick-start pass

The AdSync workspace now exposes the four core signal-return operating paths as distinct, functional quick starts rather than requiring users to infer everything from a generic pipeline builder.

Implemented:
- `Meta Advanced CAPI` quick start creates a persisted `lead.qualified → qualified_lead` rule targeting Meta Ads;
- `Google ECL / OCI` quick start creates the equivalent persisted rule targeting Google Ads;
- `Call Tracking Events` opens the live Calls workspace, where signed telephony events and voice-qualification runs are already operational;
- `Custom Integration` opens the real Integrations workspace and custom-adapter builder;
- installed Meta/Google pipelines are detected from persisted event rules, so the UI switches from `Install pipeline` to `Open pipeline` instead of blindly duplicating configuration;
- created pipelines continue through the existing event-rule engine, consent checks, durable delivery queue, provider adapters, retries, receipts and DLQ;
- the provider layer remains explicit: Meta requires connected Meta Ads credentials + dataset ID, while Google requires Ads OAuth credentials, developer token, customer ID and conversion action;
- polished responsive quick-start cards include installed-state styling, hover elevation and reduced-motion handling;
- Playwright coverage installs the Meta CAPI pipeline, verifies the persisted rule/destination, then opens the Call Tracking module.

This gives operators clear agent-level entry points while preserving one shared production signal-return architecture underneath.


## Multi-account channel/campaign funnel parity

The Funnel workspace now matches the brochure requirement for stage-level narrowing across channels, ad accounts and campaigns using persisted CRM/meeting evidence.

Implemented:
- backend account extraction from persisted lead attributes such as `adAccountName`, `adAccount`, `accountName` or `account`;
- account filter support in `GET /api/funnel`;
- campaign identity now includes channel + account + campaign so same-named campaigns in different accounts do not collapse into one row;
- stage counts for Leads, Qualified, Appointments, Consultations and Bookings;
- conversion rates for Lead → Qualified, Qualified → Appointment, Appointment → Consultation, Consultation → Booking and Lead → Booking;
- responsive stage-flow cards that make funnel narrowing visually obvious;
- channel, account, disposition and time-window filters;
- campaign drill-down panel with counts and rates for the selected campaign;
- CSV export now includes account and all stage-conversion rates;
- the UI explicitly reports that missing CRM evidence is not replaced with media-platform totals;
- Playwright coverage creates two leads in different ad accounts, creates a meeting for one lead, verifies the account-filtered API response, then confirms Account Alpha / Campaign Alpha drill-down in the dashboard.

This brings AdSync funnel mapping substantially closer to the supplied EasyInsights EdTech brochure requirement for multi-channel, multi-account, stage-level campaign analysis.


## Final dashboard E2E stabilization follow-up

The dashboard E2E suite has been tightened around real UI semantics after the feature-parity expansion.

Implemented:
- fixed the Calls production UI so the `Start qualification` action actually renders the qualification builder modal;
- Behavior E2E keeps exact backend assertions for persisted source/campaign evidence, while UI assertions now verify that each analysis view renders populated rows without racing React state;
- Repeat Purchase and Abandoned Checkout tests now locate template cards by exact visible titles, avoiding false matches inside descriptive copy;
- mobile navigation tests open the responsive workspace drawer before interacting with sidebar groups;
- the suite had reached 102 passing tests before these final assertion fixes, with the remaining failures limited to the Behavior and event-card selector categories now addressed.

These changes preserve strict backend correctness checks while making the browser suite reflect the actual responsive UI contract.


## Call-tracking campaign/keyword/creative attribution pass

The Call Tracking Events path now carries the full attribution context advertised by the EasyInsights-style call-tracking workflow instead of stopping at campaign-only metadata.

Implemented:
- signed call webhook normalization accepts campaign, keyword/search term, creative/ad name and ad-group/ad-set metadata;
- normalized aliases include `keyword`, `searchKeyword`, `searchTerm`, `creative`, `creativeName`, `adCreative`, `adName`, `adGroup`, `adGroupName`, `adset` and `adSet`;
- call keyword, creative and ad-group evidence is persisted into the enriched lead profile attributes;
- assisted `call.completed` attribution events now also retain campaign, keyword, creative and ad-group evidence alongside click IDs;
- the Calls detail panel displays Campaign, Keyword, Creative and Ad group / ad set for tracked calls;
- the Calls dashboard reports Campaign coverage, Keyword coverage, Creative coverage and Click-ID coverage across persisted tracked calls;
- click-ID coverage recognizes GCLID, FBCLID and MSCLKID;
- backend smoke coverage validates the attribution normalizer without weakening the signed-webhook security boundary;
- responsive attribution cards include hover polish and reduced-motion handling.

The operating path is now: signed telephony webhook → normalized campaign/keyword/creative evidence → lead enrichment → assisted attribution event → Calls visibility.


## Operational alert runbook pass

The monitoring and alerting layer now includes brochure-aligned operational context instead of stopping at threshold badges.

Implemented:
- new default `tracking_inactivity_minutes` rule detects when first-party tracking goes quiet after prior tracked-event activity;
- new default `signal_delivery_backlog_minutes` rule detects an aging pending/retry/leased signal-delivery queue;
- existing API error-rate, p95 latency, dead-letter job and audience-sync error monitoring remains unchanged;
- alert payloads are enriched with a deterministic operational owner, affected monitoring window and metric-specific investigation guidance;
- Alert Center detail now shows Owner and Affected period next to metric, threshold, observed value and status;
- each alert includes a Recommended investigation runbook;
- incidents can route directly into Delivery, Audiences or Diagnostics depending on the breached metric;
- tracking-inactivity guidance covers site/app installation, release changes, consent and controlled test-event verification;
- delivery-backlog guidance covers worker health, queue age, connector credentials and replay boundaries;
- Playwright coverage creates a real tracking-inactivity rule, verifies enriched API evidence, opens the Alert Center, validates owner/runbook context, resolves the incident and restores the production threshold.

This closes the operational-context gap described in the supplied EasyInsights workflow notes: alert source, affected period, impact context, owner, status and recommended investigation steps.


## Lead Reactivation agent pass

The current EasyInsights Agents surface includes a Lead Reactivation capability for detecting renewed intent from dormant leads. AceMarketing now implements that workflow with persisted evidence instead of a static agent card.

Implemented:
- new built-in `Lead Reactivation` agent in the workspace agent catalog;
- dormant-lead detection uses the persisted lead profile's last activity and configurable dormancy window;
- renewed intent must come from a recent first-party event such as pricing, checkout, booking, consultation, purchase, demo, revenue or sales-contact behavior;
- candidate identity must match through the persisted customer ID or device ID;
- leads with an existing open reactivation task are excluded to avoid duplicate recovery work;
- `GET /api/lead-reactivation` returns evidence-backed candidates and window stats;
- `POST /api/lead-reactivation/run` revalidates eligibility and creates a real persisted follow-up rather than trusting stale UI state;
- default reactivation execution creates a high-priority WhatsApp follow-up due in five minutes and owned by the Reactivation queue;
- every reactivation action writes an audit entry with the renewed event and evidence timestamp;
- Follow-ups now includes a dedicated Lead Reactivation panel with dormancy/recent-intent windows, candidate evidence, grade/score context and a one-click governed follow-up action;
- the public agent catalog now exposes Lead Reactivation;
- the built-in agent count is derived dynamically rather than hard-coded;
- Playwright coverage creates a 45-day dormant lead, records a fresh pricing intent event, verifies candidacy, creates the reactivation follow-up from the UI and confirms persistence through the Follow-ups API.

This completes the recovery loop: dormant lead → renewed intent → eligibility evidence → governed follow-up → auditable re-engagement.


## Specialist agent catalog parity pass

AceMarketing's Agent Library now exposes specialist operational modules that are already implemented elsewhere in the workspace, aligning the agent surface with the broader current EasyInsights-style catalog instead of hiding those capabilities in navigation.

Added built-in specialist agents:
- `Attribution Agent` → Full-path Attribution;
- `Deep Linking Agent` → Deep Links;
- `Fraud Detection Agent` → Fraud;
- `Customer Journey Agent` → Journeys;
- `Audiences Agent` → Audience Management;
- `Event Agent` → Conversion Event Manager.

Configuration state is grounded in the relevant backing store:
- Attribution Agent uses persisted click/matched attribution evidence;
- Event Agent uses persisted event rules;
- Audiences Agent uses persisted audiences;
- Customer Journey Agent uses lead/profile evidence;
- Deep Linking and Fraud agents use their workspace operational evidence when present.

The public agent catalog now includes these specialist capabilities as well as Lead Reactivation. The Agent Library built-in count remains dynamic, so future capabilities do not require another hard-coded UI count.

Playwright coverage opens Customer Journey Agent and Event Agent from the Agent Library and verifies navigation to their actual operational workspaces.


## Live dashboard navigator and workspace-status pass

The workspace navigator now acts as a live operating surface rather than a static shortcut menu.

Implemented:
- four clear navigation groups covering setup/measurement, journey/attribution, conversion agents, and activation/operations;
- searchable direct navigation across the complete dashboard with `Ctrl/Cmd + K`;
- live workspace readiness sourced from `GET /api/dashboard-summary`;
- connected-system, open-alert, and failed-delivery counters inside the navigator;
- 30-second background status refresh while the workspace is open;
- responsive status cards for desktop, tablet, and mobile;
- failure messaging when the live workspace-status API is unavailable;
- reduced-motion support retained for users who disable animation;
- Playwright coverage that verifies the backend summary contract, live status rendering, search, and direct navigation into Attribution.

This pass keeps the existing grouped sidebar intact while making a large EasyInsights-style workspace substantially faster to navigate and easier to understand operationally.


## Source-to-destination Data Flows pass

This pass closes the gap between merely connecting tools and defining how business data should actually move between them.

Implemented:
- new **Data Flows** workspace under Activation & Integrations;
- persisted flow recipes with source, destination, business object/event, trigger, identity mapping and cadence;
- backend endpoints:
  - `GET /api/integration-flows`
  - `POST /api/integration-flows`
  - `POST /api/integration-flows/test`
  - `POST /api/integration-flows/toggle`;
- readiness tests evaluate the real workspace connector state at both ends of the flow;
- activation guardrail: a flow cannot be enabled until its readiness test passes;
- active / paused status is persisted and audited;
- dashboard readiness now includes active integration-flow evidence;
- live Data Flows statistics for configured, active, healthy and attention-needed recipes;
- responsive animated flow cards with clear Source → Destination visibility;
- dedicated flow builder and direct access through the sidebar and dashboard navigator;
- Playwright coverage for creation, persistence, readiness testing and activation blocking.

The operating workflow is now:

```text
Connect source + destination
          ↓
Create data flow
          ↓
Map business object / event
          ↓
Map identity field
          ↓
Choose real-time or scheduled cadence
          ↓
Run backend readiness test
          ↓
Both connectors ready?
      ↙          ↘
     No          Yes
     ↓            ↓
Needs attention  Activate
     ↓            ↓
Fix connector    Persist active flow
```

The readiness test is intentionally truthful: it verifies configured connector state and does not claim that an unsupported or disconnected provider is live. Provider-specific transport execution still uses the existing native/custom connector and delivery architecture.


## Dashboard navigation live-status hardening

The dashboard navigator now uses the existing backend-backed `GET /api/dashboard-summary` contract instead of rendering stale placeholder status.

Implemented on `main`:

- Fetches workspace readiness when the user enters the workspace.
- Refreshes readiness, connected systems, open alerts and failed-delivery counts every 30 seconds.
- Provides a manual **Refresh status** action for operators.
- Shows the last successful refresh time.
- Preserves graceful error feedback when the summary API is unavailable.
- Adds loading/disabled feedback and reduced-motion-safe refresh animation.
- Keeps the dashboard grouped into **Start & measure**, **Unify & attribute**, **Convert with agents**, and **Activate & operate** so the growing product remains navigable.

This is part of the dashboard production-polish pass. The live counters are sourced from backend state and must not be presented as provider-verified external status unless the connected provider account has also been verified in the target deployment environment.


## Dashboard section-health navigation

This implementation pass extends the workspace navigator from a searchable menu into an operational section-health surface.

### Backend-backed section state

`GET /api/dashboard-summary` now returns a `sections` map for core workspace areas. Each section reports:

- `state`: `live`, `attention`, or `setup`
- `count`: a real workspace count relevant to that section
- `detail`: a concise explanation of the current backend state

Examples include Attribution matched conversions, qualification-call runs, scheduled meetings, feedback responses, connected integrations, active data flows, audiences, signal deliveries and open monitoring alerts.

### Navigator behavior

The dashboard navigator now displays the backend-derived state beside supported sections:

- **Live** — the section has usable persisted workspace data or an active operational path.
- **Needs setup** — a prerequisite exists but the workflow still needs configuration or data.
- **Setup** — the section is available but has not yet been configured for this workspace.

The status is refreshed automatically with the existing dashboard-summary refresh cycle and is also updated by the manual **Refresh status** control.

### Integrations UX hardening

Connector authorization/configuration and credential-refresh failures no longer rely on browser `alert()` dialogs. They now render as inline success/error feedback inside the Integrations workspace so operators retain context and can continue working without modal browser interruptions.

### Regression coverage

The end-to-end dashboard navigation test now validates the `sections` payload and visible section state badges. The complete workspace render sweep also includes **Data Flows** so every current dashboard tab is exercised by the frontend regression suite.


## Customer 360 implementation

This pass adds a dedicated **Customer 360** workspace on `main`, built from AceMarketing's persisted first-party records rather than sample customer cards.

### Backend

New endpoint:

- `GET /api/customer-360`
- `GET /api/customer-360?id=<profile-or-lead-id>`

The endpoint composes existing workspace stores into one customer record:

- canonical lead/customer profile;
- acquisition source and campaign;
- lifecycle stage, lead grade, score and intent;
- deterministic identity availability (hashed email/phone, device, app/platform);
- normalized profile and journey attributes;
- tracked first-party events;
- routing decisions;
- follow-up tasks;
- scheduled meetings and reminders;
- feedback records;
- agent runs;
- call and WhatsApp context;
- materialized audience memberships.

No synthetic activity is inserted when a customer has no linked events.

### Frontend

The new **Customer 360** section is available under **Tracking & Data** and through the global dashboard navigator.

Operators can:

1. Search customer profiles by name, lead ID, source, campaign, lifecycle stage or grade.
2. Open a single stitched customer record.
3. Inspect identity evidence and profile freshness.
4. Review lifecycle stage, lead score and grade.
5. See counts for tracked events, agent runs, routing, follow-ups, meetings and feedback.
6. Review normalized customer/journey attributes.
7. Inspect activation/suppression audience memberships.
8. Review a unified newest-first operational timeline.
9. Jump from Customer 360 into the dedicated Journey view.

The layout is responsive, uses the existing AceMarketing design system, includes subtle interaction motion, and respects `prefers-reduced-motion`.

### Dashboard health and tests

`GET /api/dashboard-summary` now exposes Customer 360 readiness from real profile availability, and the dashboard navigator displays the corresponding section status.

Playwright coverage now verifies:

- the Customer 360 API contract;
- the Customer 360 workspace renders;
- search is available;
- customer identity/timeline surfaces render when persisted profile data exists;
- Customer 360 is included in the complete dashboard-section render sweep.

### Product-parity note

EasyInsights publicly describes Customer 360 and personalization/audience use cases alongside stitched journeys and first-party activation. AceMarketing implements the comparable workflow using its own product identity, UI, code and data contracts rather than bundling third-party proprietary source code or branded assets.


## Real-time activation implementation

This pass adds a dedicated **Real-Time Activation** workflow to AceMarketing on `main`.

The goal is to close the gap between collecting first-party events and immediately acting on them. Active rules are evaluated during `POST /api/track` ingestion, after the existing consent gate, and can create governed downstream actions without requiring an operator to manually inspect each event.

### Backend contracts

New endpoints:

- `GET /api/activation-rules`
- `POST /api/activation-rules`
- `POST /api/activation-rules/toggle`
- `POST /api/activation-rules/test`

Rules support:

- trigger event matching;
- up to five field conditions;
- operators for equals, contains, greater-than, less-than, one-of, exists and not-exists;
- active/paused state;
- mandatory marketing-consent enforcement by default;
- persisted execution history.

Supported actions:

1. **Conversion signal** — queues a provider delivery using the existing signal-delivery worker and replay payload architecture.
2. **Follow-up** — creates a persisted follow-up task with channel, priority, owner and delay.
3. **Lead routing** — routes the matching lead/customer into a configured destination using the existing routing service.

Every matching execution is stored in `activationRuleRuns` with the source event, action type, status, detail and downstream operation identifier when available.

### Event-ingestion integration

`POST /api/track` now returns an `activationRuns` array alongside existing derived event-rule and attribution results.

The order is:

**Consent → Persist event → Update customer profile → Attribution/event-rule processing → Real-time activation evaluation → Persist execution result**

Rules configured to require marketing consent are recorded as `skipped` instead of executing when marketing consent is unavailable.

### Frontend workspace

New dashboard section:

**Activation & Integrations → Real-Time Activation**

Operators can:

- create event-driven rules;
- configure trigger event and optional condition;
- choose conversion-signal, routing or follow-up action;
- set destination, output event, channel, owner, priority and delay;
- dry-run a rule without executing an external action;
- pause or re-enable rules;
- inspect recent persisted executions;
- see whether each execution succeeded, failed or was skipped.

The section uses responsive layout, interaction animation and `prefers-reduced-motion` support.

### Dashboard and navigation health

Real-Time Activation is now included in:

- the main workspace sidebar;
- the searchable dashboard navigator;
- dashboard section health;
- activation readiness calculations.

The dashboard reports active rule count and persisted execution count.

### Regression coverage

Playwright coverage now creates a unique activation rule, records marketing consent, submits a matching tracked event, and verifies:

- the rule was persisted;
- the event was accepted;
- the returned `activationRuns` contains the matching successful rule execution;
- the execution history is persisted;
- the Real-Time Activation workspace renders the created rule.

Real-Time Activation is also included in the full workspace-section render sweep.

### Product-parity note

EasyInsights publicly describes trigger-based real-time activation, dynamic audience/suppression workflows, first-party custom-event activation and personalized marketing based on current behavior. AceMarketing implements the comparable event-to-action workflow with its own UI, code, data contracts and operational controls.


## Conversion reconciliation center

This pass adds a dedicated **Reconciliation** workspace on `main` to explain and repair conversion-count gaps using AceMarketing's own persisted evidence.

### Backend

New endpoints:

- `GET /api/reconciliation`
- `POST /api/reconciliation/action`

The reconciliation summary combines:

- tracked first-party events;
- assisted/offline attribution events;
- matched vs unmatched attribution;
- signal delivery status by destination;
- failed/dead-letter deliveries;
- duplicate evidence recorded by idempotency/audit controls;
- quarantined schema/field events;
- pending conversion adjustments;
- persisted reconciliation action history.

The endpoint also calculates a workspace reconciliation quality score from unmatched, failed, duplicate and quarantined evidence.

### Repair actions

Operators can run safe actions from the reconciliation center:

1. **Unmatched attribution** — re-runs the existing attribution reconciliation service.
2. **Failed deliveries** — re-queues failed/dead-letter provider signals through the existing durable signal-delivery queue.
3. **Duplicate evidence** — creates a persisted review action rather than destructively deleting records.
4. **Quarantined events** — creates a persisted schema-review action rather than silently accepting invalid events.

Every action creates a reconciliation audit record with status, detail, actor and timestamp.

### Frontend

New dashboard section:

**Tracking & Data → Reconciliation**

The workspace displays:

- overall reconciliation quality score;
- unmatched attribution count;
- failed delivery count;
- quarantined-event count;
- issue-by-issue repair controls;
- destination delivery comparison;
- tracked/assisted/matched/delivery evidence totals;
- duplicate and pending-adjustment evidence;
- recent reconciliation action history.

The destination comparison explicitly represents **AceMarketing-sent delivery records**, not external provider-reported conversion totals, so the UI does not fabricate Meta, Google or GA4 numbers that have not actually been retrieved.

### Navigation and health

Reconciliation is included in:

- the main workspace sidebar;
- the global dashboard navigator;
- dashboard section health;
- the complete workspace render regression sweep.

### Regression coverage

Playwright now verifies:

- the reconciliation API contract;
- quality score and issue data;
- a persisted duplicate-review action;
- the Reconciliation workspace renders its issue and destination-comparison surfaces.

### Product-parity note

EasyInsights publicly describes server-side forwarding, cross-channel stitching, cleansing/normalization, deduplication, enhanced matching and conversion discrepancy resolution across Meta, Google and analytics systems. AceMarketing implements the comparable operator workflow using its own UI, code and data contracts while keeping provider-reported metrics separate from internally observed delivery evidence.


## Personalization studio implementation

This pass adds a dedicated **Personalization** workspace and decision API to AceMarketing on `main`.

The implementation turns existing Customer 360, consent and first-party context into a reusable decision layer for website, app, CRM and messaging experiences.

### Backend contracts

New endpoints:

- `GET /api/personalization-rules`
- `POST /api/personalization-rules`
- `POST /api/personalization-rules/toggle`
- `POST /api/personalization/decide`
- `POST /api/personalization/feedback`

Rules support:

- experience surface (website, app, CRM, WhatsApp or email);
- priority ordering;
- named experience variant;
- message, CTA and destination;
- up to eight profile/context conditions;
- equals, contains, greater-than, less-than, one-of, exists and not-exists operators;
- active/paused state;
- personalization-consent enforcement by default.

### Decision flow

The personalization decision path is:

**Resolve customer → Load Customer 360 profile → Merge journey/profile context → Match highest-priority rule → Check personalization consent → Return variant → Persist decision**

Customer context may include persisted attributes such as:

- grade;
- score;
- lifecycle stage;
- acquisition source/campaign;
- device platform;
- LTV tier;
- conversion propensity;
- normalized Customer 360 attributes and journey fields.

When a matching rule requires personalization consent and consent is unavailable, the backend returns a `consent_blocked` decision and does not return personalized content.

### Measurement

`POST /api/personalization/feedback` records:

- impression;
- click;
- conversion.

The rules API calculates per-rule:

- decisions;
- impressions;
- clicks;
- conversions;
- CTR;
- conversion rate.

These metrics represent AceMarketing-recorded personalization feedback only and are not presented as external-channel provider metrics.

### Frontend workspace

New dashboard section:

**Activation & Integrations → Personalization**

Operators can:

1. Create priority-ordered personalization rules.
2. Select website/app/CRM/WhatsApp/email surfaces.
3. Define a variant, message, CTA and destination.
4. Target by Customer 360/profile conditions.
5. Pause or re-enable rules.
6. Test a real customer/profile/device identifier through the backend decision service.
7. See whether a variant was selected, blocked by consent or had no matching rule.
8. Record impression, click and conversion feedback for a returned decision.
9. Review rule-level CTR and conversion rate.

The UI uses the AceMarketing design system, responsive layouts, subtle animation and reduced-motion support.

### Dashboard and health integration

Personalization is included in:

- the main workspace sidebar;
- the global dashboard navigator;
- dashboard section health;
- the complete workspace render regression sweep.

Dashboard health reports active personalization rule count and persisted decision count.

### Regression coverage

Playwright now verifies:

- personalization consent can be recorded;
- a rule can be created;
- the decision API returns the expected variant;
- impression feedback can be persisted;
- rule performance reflects the recorded impression;
- the Personalization workspace renders the created rule.

### Product-parity note

EasyInsights publicly describes first-party audience segmentation, returning-user recognition, real-time activation, personalized marketing, behavioral segmentation and category-based recommendation events. AceMarketing implements the comparable decisioning workflow using its own UI, code, Customer 360 contracts and consent architecture rather than third-party proprietary source code or branded assets.


## Audience suppression and exclusions implementation

This pass adds a dedicated **Exclusions** workspace on `main` for first-party suppression audiences.

### Backend contracts

New endpoints:

- `GET /api/exclusions`
- `POST /api/exclusions/create`

The exclusions API uses the existing audience store and materialization pipeline rather than creating a separate audience system.

Built-in first-party presets:

1. **Converted customers**  
   Uses CRM stages `converted`, `enrolled`, `closed_won`, and `customer`.

2. **Low-quality leads**  
   Uses Lead Grades `C` and `D`.

3. **Known device IDs**  
   Uses profiles where a first-party device ID is present and materializes a device-identity audience.

Each preset is previewed against live workspace profiles before an exclusion is created.

### Suppression workflow

The workflow is:

**Profile evidence → Preview eligible identities → Create suppression audience → Materialize → Sync to Meta/Google → Use as acquisition exclusion**

Created exclusion audiences use `mode: Suppress` and reuse the existing:

- audience materialization store;
- deterministic identity logic;
- Meta/Google audience sync queue;
- provider-state tracking;
- activation-run history.

The create endpoint also detects an existing matching exclusion audience for the same name and destination and returns it as a duplicate instead of silently creating another segment.

### Frontend workspace

New dashboard section:

**Activation & Integrations → Exclusions**

Operators can:

- inspect live counts for converted profiles, low-quality leads and known devices;
- preview the estimated size of each recommended exclusion;
- create a Meta Ads exclusion;
- create a Google Ads exclusion;
- see existing materialized suppression audiences;
- inspect identity mode and provider destination;
- queue an exclusion sync through the existing audience pipeline.

The UI is responsive, animated, and respects reduced-motion preferences.

### Dashboard integration

Exclusions is included in:

- the main workspace sidebar;
- the global dashboard navigator;
- dashboard section health;
- the full workspace render regression sweep.

Dashboard health uses the real materialized suppressed-identity count and eligible converted/device evidence.

### Regression coverage

Playwright now verifies:

- `GET /api/exclusions`;
- converted-customer, low-quality-lead and known-device presets;
- the Exclusions workspace renders;
- the materialized-exclusions area is available;
- Exclusions is part of the complete workspace render sweep.

### Product-parity note

EasyInsights publicly describes dynamic audience creation/suppression and a device-ID exclusion workflow that uploads known first-party devices to Meta and Google so existing customers are not repeatedly targeted. AceMarketing implements the comparable suppression workflow using its own UI, audience contracts and provider queue rather than third-party proprietary source code or branded assets.


## Privacy, consent and compliance center

This pass adds a dedicated **Compliance** workspace on `main` for consent visibility, subject-rights operations, retention, and activation safeguards.

### Backend contract

New endpoint:

- `GET /api/compliance-center`

The compliance summary aggregates existing production privacy services into one operator contract:

- consent counts for analytics, marketing and personalization;
- consent coverage percentages;
- revocation count;
- recent consent audit entries;
- retention-policy windows;
- privacy request history;
- subject export/delete counts;
- retention purge history;
- real activation actions skipped because consent was unavailable;
- personalization decisions blocked because consent was unavailable;
- operational readiness checks.

The readiness score is an operational control score only. It is **not** presented as legal advice, regulatory certification, or a guarantee of GDPR/DPDP/CPRA/HIPAA compliance.

### Existing governed privacy actions exposed in the workspace

The Compliance Center uses the existing backend privacy contracts:

- `POST /api/privacy/export`
- `POST /api/privacy/delete`
- `POST /api/privacy/retention/purge`

Subject selectors support:

- customer ID;
- visitor ID;
- lead ID;
- email;
- phone.

Privacy export records an auditable export request and returns matched click sessions, assisted events, lead profiles, audience memberships, and consent records.

Deletion remains deliberately destructive and requires the operator to type `DELETE` in the UI before the frontend invokes the backend deletion contract.

### Retention operations

Retention windows remain deployment-controlled through:

- `PRIVACY_RETENTION_CLICK_DAYS`
- `PRIVACY_RETENTION_ASSISTED_DAYS`
- `PRIVACY_RETENTION_LEAD_DAYS`
- `PRIVACY_RETENTION_CONSENT_DAYS`

The UI supports:

1. a dry-run retention preview;
2. explicit application of the purge only after a preview exists;
3. audit history for retention operations.

### Frontend workspace

New dashboard section:

**Operations & Developer → Compliance**

Operators can:

- see compliance-readiness checks;
- inspect analytics/marketing/personalization consent coverage;
- see revoked-consent count;
- see how many activation actions were skipped for consent;
- see how many personalization decisions were blocked;
- generate a subject-data export;
- perform a confirmed subject deletion;
- preview and apply retention purges;
- inspect consent audit history;
- inspect privacy request history.

The layout is responsive and uses the existing AceMarketing dashboard design system.

### Dashboard integration

Compliance is included in:

- the main workspace sidebar;
- the global dashboard navigator;
- dashboard section health;
- the full workspace render regression sweep.

### Regression coverage

Playwright now verifies:

- `GET /api/compliance-center`;
- readiness, consent, policy, privacy and control-check contracts;
- the Compliance workspace renders;
- consent coverage, subject-rights and retention surfaces are visible;
- privacy selector and deletion-confirmation controls are present;
- Compliance is part of the complete workspace render sweep.

### Product-parity note

EasyInsights publicly identifies privacy, consent and compliance as a major first-party-data challenge, including the disconnect between consent management and ad-platform activation. AceMarketing implements the comparable operational control surface using its own consent, privacy, retention and activation architecture rather than copying third-party proprietary source code or assets.


## ChatGPT Ads conversion measurement

This pass adds a dedicated **ChatGPT Ads** conversion-measurement workflow to AceMarketing on `main`.

### Official provider contract

The integration follows the current OpenAI Ads measurement contract:

- server-side events are sent to the ChatGPT Ads Conversions API;
- the backend uses a Pixel ID plus a dedicated Conversions API key;
- `oppref` is preserved unchanged when it is captured from an ad click;
- `obref` can be forwarded as optional browser-reference matching data;
- stable event IDs are reused for retries/deduplication;
- web events require a source URL;
- monetary values are sent as integer minor units;
- provider credentials remain server-side.

Required backend environment variables:

- `OPENAI_CONVERSIONS_API_KEY`
- `OPENAI_ADS_PIXEL_ID`

Neither secret is returned by the dashboard API or exposed to browser code.

### Backend provider adapter

`backend/src/providers.mjs` now supports `ChatGPT Ads` as a signal-delivery destination.

The adapter maps AceMarketing events to supported ChatGPT Ads conversion event types, including:

- `lead_created`
- `appointment_scheduled`
- `checkout_started`
- `order_created`
- `registration_completed`
- `subscription_created`
- `trial_started`
- `page_viewed`
- `contents_viewed`
- `items_added`
- `app_installed`
- `app_opened`
- `custom`

It also supports event-scoped matching data such as:

- `oppref`
- `obref`
- hashed email
- hashed phone
- hashed external/customer ID
- country/city/region/postal code
- IP address/user agent when supplied
- Android advertising ID when supplied.

### Backend APIs

New endpoints:

- `GET /api/chatgpt-ads`
- `POST /api/chatgpt-ads/validate`
- `POST /api/chatgpt-ads/send`

`GET /api/chatgpt-ads` returns only configuration booleans and operational statistics. It never returns provider secrets.

`POST /api/chatgpt-ads/validate` performs local schema validation and returns the normalized replay payload without making a provider request.

`POST /api/chatgpt-ads/send`:

1. validates the event;
2. checks marketing consent when a customer/visitor subject is present;
3. derives a deterministic idempotency key;
4. prevents duplicate queue records;
5. persists the delivery;
6. queues it through the existing durable `signal_delivery` worker;
7. lets the provider adapter send the final server-side request.

### Tracking and replay payload

AceMarketing's signal replay contract now preserves ChatGPT Ads measurement fields including:

- `oppref`
- `obref`
- OpenAI event type/custom event name
- amount in minor units
- plan ID
- content items
- opt-out state
- source/matching metadata.

That means event-rule and real-time-activation pipelines can target `ChatGPT Ads` using the same durable signal architecture already used by Meta and Google.

### Frontend workspace

New dashboard section:

**Tracking & Data → ChatGPT Ads**

Operators can:

- see whether the Pixel ID and Conversions API key are configured;
- inspect recent `oppref` capture coverage;
- see ChatGPT Ads delivery totals, queue state, failures and terminal delivery rate;
- build a supported conversion payload;
- choose event type and action source;
- provide `oppref` and optional `obref`;
- validate the payload locally;
- queue a live conversion only when server-side credentials are configured;
- inspect recent ChatGPT Ads deliveries;
- jump to the full Delivery Center.

The integration also appears in:

- the public integration catalog;
- the dashboard integration catalog;
- the AdSync quick-start agent list;
- the global dashboard navigator;
- dashboard section-health reporting.

### Security and privacy

The implementation intentionally keeps provider credentials out of browser state.

When a conversion is associated with a customer or visitor, the dedicated send endpoint checks AceMarketing marketing consent before queuing the provider delivery.

The provider adapter only sends matching data supplied by the existing governed signal payload. Raw provider secrets are never returned in status responses or validation results.

### Regression coverage

Playwright now verifies:

- the ChatGPT Ads status contract;
- supported event types;
- local conversion-payload validation;
- `oppref` preservation;
- destination normalization to `ChatGPT Ads`;
- provider credentials are not exposed in the validation contract;
- the ChatGPT Ads workspace renders;
- conversion builder, readiness and delivery-history surfaces render;
- ChatGPT Ads is part of the complete workspace render sweep.

### Product-parity note

EasyInsights published a September 2026 guide describing ChatGPT Ads conversion measurement and `oppref`-based server-side tracking. AceMarketing implements the same category of capability using OpenAI's current public Ads measurement contract and its own UI, backend queue, consent controls and operational model.


## Executive data snippets implementation

This pass extends AceMarketing's existing cohort-report scheduler with a second durable report type: **Executive Briefs**.

### Why this exists

EasyInsights publicly describes scheduled single-view data snippets and automated email reporting for leadership, alongside cohort reporting for strategic media planning. AceMarketing already had full cohort reports; this implementation adds the smaller leadership-snapshot workflow without replacing the existing reporting stack.

### Database migration

New migration:

- `backend/migrations/018_executive_briefs.sql`

It:

- expands `ace_report_schedules.report_type` from only `cohort` to `cohort | executive_brief`;
- adds a JSONB `config` field for persisted brief metrics/title/note;
- adds a workspace/report-type index.

### Scheduler changes

The existing durable report scheduler now supports:

- `cohort` — current full cohort report with CSV attachment;
- `executive_brief` — compact HTML leadership snippet without the cohort CSV attachment.

Executive briefs use the same:

- PostgreSQL schedule store;
- due-schedule locking;
- durable queue;
- retry/dead-letter behavior;
- SMTP transport;
- send-now workflow;
- delivery history.

### Executive metric configuration

Supported brief metrics are intentionally limited to values AceMarketing can derive from persisted cohort/attribution evidence:

- acquired;
- qualified rate;
- consultation rate;
- conversion rate;
- attributed revenue;
- revenue per acquired;
- top acquisition source;
- top-source conversion rate.

The report does **not** fabricate missing spend, CAC, ROAS, margin, or P&L values.

### Backend contract

No parallel reporting API was introduced.

The existing endpoints now support `reportType: "executive_brief"`:

- `GET /api/report-schedules`
- `POST /api/report-schedules`
- `POST /api/report-schedules/run-now`

A saved executive schedule persists:

- recipients;
- cadence;
- lookback months;
- title;
- optional leadership note;
- selected metrics.

Delivery snapshots also record the report type, configuration, totals and top-source evidence.

### Frontend workspace

New dashboard section:

**Measurement & Intelligence → Executive Briefs**

Operators can:

1. Preview the current brief from live persisted evidence.
2. Select which leadership metrics to include.
3. Configure report title and leadership note.
4. Configure recipients.
5. Choose daily, weekly or monthly cadence.
6. Choose the cohort lookback window.
7. Save a durable executive-brief schedule.
8. Queue any existing brief immediately with **Send now**.
9. Inspect recent executive delivery history.

### Dashboard integration

Executive Briefs is included in:

- the main sidebar;
- the global dashboard navigator;
- dashboard section health;
- the complete workspace render sweep.

The dashboard health status reflects persisted executive schedules and SMTP readiness.

### Regression coverage

Playwright now creates a real `executive_brief` schedule and verifies:

- the schedule is persisted as `report_type=executive_brief`;
- configured metrics persist in `config.metrics`;
- the schedule is returned by the report-schedules API;
- the Executive Briefs workspace renders;
- live preview and schedule-builder surfaces render;
- the created schedule is visible;
- Executive Briefs is part of the full workspace render sweep.

### Product-parity note

EasyInsights describes scheduled CMO data snippets and automated email reporting in its public customer-success material. AceMarketing implements the comparable workflow using its own reporting UI, PostgreSQL scheduler, durable worker and evidence contracts.


## Grouped performance implementation

This pass adds a dedicated **Grouped Performance** workspace to AceMarketing on `main`.

### Why this exists

EasyInsights publicly describes grouping user-level and business-performance data into product/category views, including leadership use cases such as product-level P&L analysis. AceMarketing implements the comparable grouping workflow using persisted first-party events and explicit evidence boundaries.

### Backend contract

New endpoints:

- `GET /api/grouped-performance?dimension=<dimension>&months=<n>`
- `POST /api/grouped-performance/costs`

Supported grouping dimensions:

- category;
- product category;
- product / SKU;
- brand;
- acquisition source;
- campaign.

The aggregation uses persisted workspace events from `recentEvents`.

### Conversion and revenue rules

Grouped Performance reuses the configured conversion-event contract from the cohort analytics engine.

That means:

- only configured conversion events count toward conversions;
- only values attached to those conversion events count toward attributed revenue;
- ordinary page views, clicks or non-conversion events do not inflate revenue.

### Optional cost basis

Operators can persist an explicit cost basis for any group.

When no cost is stored:

- cost is shown as unavailable;
- contribution is shown as unavailable;
- margin is shown as unavailable.

When a cost is supplied:

- `contribution = revenue - explicit cost`;
- `margin % = contribution / revenue` when revenue is greater than zero.

AceMarketing does not infer missing COGS, ad spend, gross margin, operating expense or P&L fields.

### Frontend workspace

New dashboard section:

**Measurement & Intelligence → Grouped Performance**

Operators can:

1. Switch between category, product category, product/SKU, brand, source and campaign.
2. Inspect unique subjects, event volume, conversions and conversion rate.
3. Inspect attributed revenue from configured conversion events.
4. Enter or clear cost basis per group.
5. See contribution and margin only after explicit cost entry.
6. Review the exact configured conversion-event contract.
7. See the evidence boundary for revenue and profitability calculations.

The grouped table is horizontally scrollable on smaller screens, and dimension controls use the existing AceMarketing interaction system with reduced-motion support.

### Dashboard integration

Grouped Performance is included in:

- the main workspace sidebar;
- the global dashboard navigator;
- dashboard section health;
- the complete workspace render regression sweep.

Dashboard health reflects the persisted first-party event inventory available for grouping.

### Regression coverage

Playwright now:

- creates a consented first-party conversion event with a unique category;
- verifies that the category appears in grouped performance;
- verifies the conversion count and revenue are derived from the persisted event;
- verifies contribution is unavailable before a cost basis exists;
- saves an explicit cost basis;
- verifies cost and contribution are then calculated;
- renders the Grouped Performance workspace and confirms the real category is visible;
- uses a unique category identifier so repeated test runs do not inherit stale cost state.

### Product-parity note

EasyInsights publicly describes grouping and product/category-level performance analysis in its customer-success material. AceMarketing implements the same category of workflow with its own UI, code, evidence model and profitability safeguards rather than copying proprietary source code, text or branded assets.


## Funnel leak monitor implementation

This pass adds a dedicated **Funnel Leak Monitor** to AceMarketing on `main`.

### Why this exists

EasyInsights' current product positioning emphasizes step-by-step funnel monitoring and agents that catch losses at each handoff between lead capture, CRM, calling, meetings and revenue. AceMarketing already had individual routing, follow-up, call and meeting workspaces; this implementation adds the missing cross-stage leak detector.

### Backend contracts

New endpoints:

- `GET /api/leak-monitor`
- `POST /api/leak-monitor/settings`
- `POST /api/leak-monitor/recover`

### Leak detection

The monitor evaluates persisted active lead profiles against:

- current CRM stage;
- last persisted activity time;
- stage-specific inactivity threshold;
- routing-decision evidence;
- open follow-up evidence;
- future meeting evidence.

Converted/customer stages are excluded from the leak queue.

Default inactivity thresholds are:

- new: 30 minutes;
- lead: 60 minutes;
- qualified: 60 minutes;
- routed: 120 minutes;
- contacted: 240 minutes;
- consultation: 720 minutes.

Operators can change these thresholds without mutating or deleting any lead records.

The monitor also detects missing handoffs even before a stage has exceeded its time threshold, including:

- qualified lead with no routing decision;
- routed lead with no open follow-up;
- contacted lead with no future meeting;
- consultation-stage lead with no recovery follow-up.

### Severity

Leak severity is derived from the evidence:

- **medium** — stalled or missing handoff;
- **high** — activity is at least twice the stage threshold;
- **critical** — missing handoff plus severe time overrun.

The queue is sorted by severity and time stalled.

### Recovery action

`POST /api/leak-monitor/recover` creates a real persisted follow-up task through the existing agent-orchestrator follow-up store.

The action supports:

- call / voice;
- WhatsApp;
- email;
- configurable priority;
- optional delay;
- recovery reason;
- assigned recovery queue/owner.

The backend protects against creating another open leak-recovery follow-up for the same lead.

Every recovery also creates:

- a persisted `leakRecoveries` record;
- an audit event;
- a real follow-up task visible in the existing Follow-ups workspace.

### Frontend workspace

New dashboard section:

**Tracking & Data → Leak Monitor**

Operators can:

1. See total, critical and high-priority leaks.
2. See how many recovery actions are already queued.
3. Inspect leak counts by funnel stage.
4. Inspect lead grade, score, source and campaign.
5. See inactivity duration vs stage threshold.
6. See routing, follow-up and meeting evidence.
7. Queue a recovery follow-up directly from the leak row.
8. Configure stage inactivity thresholds.
9. Review recent recovery actions.

The layout is responsive and uses the existing AceMarketing dashboard interaction system.

### Dashboard integration

Leak Monitor is included in:

- the main workspace sidebar;
- the global dashboard navigator;
- dashboard section health;
- the full workspace render regression sweep.

### Regression coverage

Playwright now:

- records consent for a unique test lead;
- tracks a real qualified lead;
- leaves that lead intentionally without a routing decision;
- verifies the Leak Monitor detects the missing routing handoff;
- queues a recovery;
- verifies a real follow-up task is persisted;
- opens the Leak Monitor workspace;
- verifies the lead and recovery state are visible;
- includes Leak Monitor in the complete workspace render sweep.

### Product-parity note

EasyInsights publicly describes full-funnel monitoring and agents that catch leaks at handoffs before they cost conversions. AceMarketing implements the comparable workflow using its own lead-profile, routing, follow-up, meeting and audit stores rather than copying proprietary source code, copy or branded assets.


## Event match quality implementation

This pass adds a dedicated **Match Quality** workspace to AceMarketing on `main`.

### Why this exists

EasyInsights publicly highlights high event match rate, full event coverage and first-party server-side activation as core capabilities. AceMarketing already captured the raw identifiers across Identity, Fingerprinting, Sites, ChatGPT Ads and Diagnostics, but operators did not have one place to measure how consistently those identifiers were actually present on persisted events.

### Backend contract

New endpoint:

- `GET /api/match-quality`

The endpoint scores up to the latest 5,000 persisted first-party events using AceMarketing's own internal identity-coverage model.

Signals considered include:

- customer ID;
- hashed email;
- hashed phone;
- device ID;
- visitor ID;
- GCLID;
- GBRAID;
- WBRAID;
- FBCLID;
- MSCLKID;
- ChatGPT Ads `oppref`;
- optional `obref`;
- IP address;
- user agent.

Deterministic first-party identifiers and hashed contact identifiers receive more weight than weaker browser/context signals.

### Important score boundary

The returned score is explicitly:

**AceMarketing internal identity-coverage score**

It is **not** presented as:

- Meta Event Match Quality;
- Google match rate;
- OpenAI provider match score;
- any other provider-reported metric.

Provider-reported scores must come from the corresponding provider integration.

### Match-quality output

The endpoint returns:

- average identity-coverage score;
- total events scored;
- strong-event count/rate;
- weak-event count/rate;
- identifier-by-identifier coverage;
- event-type quality averages;
- dominant source per event type;
- evidence-based recommendations.

Recommendations can point operators directly to the existing remediation surfaces, including:

- Data Hub;
- Identity;
- Sites;
- ChatGPT Ads;
- Fingerprinting.

### Frontend workspace

New dashboard section:

**Tracking & Data → Match Quality**

Operators can:

1. Inspect the overall identity-coverage score.
2. See strong vs weak event ratios.
3. Review identifier coverage percentages.
4. Compare average quality by event type.
5. See which traffic source dominates each event type.
6. Open the exact AceMarketing section that can fix a missing identifier.
7. See the provider-score boundary directly in the UI.

The workspace uses responsive layouts and the existing AceMarketing dashboard design system.

### Dashboard integration

Match Quality is included in:

- the main sidebar;
- the global dashboard navigator;
- dashboard section health;
- the complete workspace render regression sweep.

Dashboard health reflects the real persisted event inventory available for identity scoring.

### Regression coverage

Playwright now:

- records a consented event with rich identity evidence;
- records a lower-identity event;
- verifies the match-quality API contract;
- verifies total events, score, identifier coverage, event-type rows and recommendations;
- verifies the provider-score disclaimer;
- renders the Match Quality workspace;
- verifies Identifier Coverage, Event-Type Quality and Provider-Score Boundary surfaces;
- includes Match Quality in the full workspace render sweep.

### Product-parity note

EasyInsights publicly describes high event match rate and full coverage as part of its first-party data activation offering. AceMarketing implements the comparable operational visibility using its own scoring model, code and UI without claiming third-party provider scores that have not actually been retrieved.


## Dashboard navigation and section-health update — 2026-09-26

The workspace dashboard now exposes one searchable navigator for the full product surface and reports backend-derived status for every major operational section. The navigator can be opened with **Ctrl/Cmd + K**, searched by feature name/use case, and filtered by **Live**, **Needs attention**, and **Setup**.

The `GET /api/dashboard-summary` contract now covers the broader workspace surface, including governed adjustments, fraud review, deep links, tracked sites, identity/fingerprinting readiness, offline attribution and matchback, POS/store signals, attribution models, behavior/feed operations, approvals, developer API/webhook readiness, and the previously implemented data, activation, agent, reporting, compliance, and monitoring areas.

This keeps navigation functional instead of decorative: section badges are driven by persisted workspace state and backend metrics, and the frontend refreshes operational status automatically every 30 seconds. The implementation preserves reduced-motion accessibility and responsive mobile behavior.


## Developer API-key lifecycle hardening — 2026-09-26

The **Developers** workspace now provides a real credential lifecycle instead of only displaying integration snippets.

- `GET /api/api-keys` lists persisted credential metadata without returning stored secrets.
- `POST /api/api-keys` creates a named API key and reveals the complete secret once.
- `POST /api/api-keys/revoke` revokes a credential and records the action in the workspace audit trail.
- Only a SHA-256 fingerprint of each secret is persisted; the complete key is not stored.
- Server-to-server ingestion through `POST /api/track` validates supplied `ace_...` Bearer credentials and rejects invalid or revoked keys.
- Successful authenticated ingestion updates the credential's `lastUsedAt` timestamp.
- The dashboard exposes active/revoked credential counts, creation, one-time reveal/copy, last-used metadata, and revocation controls.
- Playwright coverage verifies create → authenticated ingest → revoke → rejected reuse as one end-to-end workflow.

This closes a frontend/backend parity gap in the developer console while preserving the browser/first-party tracking path for requests that do not present a server API credential.


## LinkedIn Conversions API AdSync — 2026-09-26

AceMarketing now includes a native LinkedIn server-side conversion path alongside Google, Meta and ChatGPT Ads signal delivery.

- The LinkedIn OAuth connector requests `rw_conversions` and `r_ads`.
- AdSync includes a **LinkedIn Conversions API** quick-start pipeline.
- Delivery uses LinkedIn's versioned `POST /rest/conversionEvents` contract.
- The adapter uses a configured conversion-rule URN, stable event ID, event timestamp, optional value/currency, and supported matching identifiers such as SHA-256 email or LinkedIn first-party tracking UUID.
- Provider credentials stay in the connector credential vault; the conversion-rule URN and Marketing API version are deployment configuration.
- `backend/.env.example` documents `LINKEDIN_CONVERSION_URN` and `LINKEDIN_MARKETING_VERSION`.
- E2E coverage verifies that the LinkedIn quick-start creates a real persisted AdSync pipeline targeting `LinkedIn Ads`.

This implementation addresses the brochure requirement for server-side LinkedIn conversion signaling while keeping delivery retry, audit and dashboard visibility inside AceMarketing's existing signal-delivery pipeline.


## Microsoft Ads + Pinterest server-side conversion delivery — 2026-09-26

AceMarketing AdSync now converts two previously catalog-only advertising integrations into native outbound signal destinations.

### Microsoft Advertising Conversions API
- Adds a native provider for `Microsoft Ads / Bing Ads`.
- Sends real-time custom conversion events to `https://capi.uet.microsoft.com/v1/{tagId}/events`.
- Uses a stable event ID for UET/CAPI deduplication.
- Supports Microsoft click ID (`msclkid`), SHA-256 email/phone, anonymous/external IDs, IP/user-agent and mobile advertising IDs when present.
- Enforces Microsoft's seven-day server-event timestamp window.
- Propagates consent as `adStorageConsent`.
- Sends conversion value, currency and transaction ID when available.
- Requires `MICROSOFT_UET_TAG_ID` and `MICROSOFT_CAPI_TOKEN`.

### Pinterest Conversions API
- Adds a native provider for the existing `Pinterest` connector entry.
- Sends server events to Pinterest v5 ad-account event ingestion.
- Supports deduplication with stable `event_id`.
- Maps AceMarketing business events to Pinterest event names such as `lead`, `schedule`, `checkout`, `signup`, `start_trial` and `subscribe`.
- Supports web/offline action sources, SHA-256 email/phone, external IDs, client IP/user-agent, conversion value, currency and order ID.
- Supports Pinterest test-event mode through `PINTEREST_TEST_EVENTS=true`.
- Requires `PINTEREST_AD_ACCOUNT_ID` and `PINTEREST_CONVERSION_TOKEN`.

The AdSync dashboard now exposes installable quick-start pipelines for Google, Meta, LinkedIn, Microsoft/Bing, Pinterest and ChatGPT Ads. All of them use the same persisted event-rule, durable delivery, retry, audit and monitoring pipeline instead of isolated UI-only actions.

E2E coverage verifies that Microsoft and Pinterest quick-start cards create persisted AdSync pipelines and select the correct real delivery destinations.


### AdSync destination persistence hardening

The event-rule engine's destination allowlist now includes every native server-side AdSync provider currently exposed by the dashboard: `Google Ads`, `Meta Ads`, `LinkedIn Ads`, `Microsoft Ads / Bing Ads`, `Pinterest`, and `ChatGPT Ads`. This prevents a frontend-created provider pipeline from being accepted while its destination is silently removed before persistence.

Pinterest matching has also been tightened to follow the provider contract: external IDs are SHA-256 hashed, and an event must carry hashed email, a hashed mobile advertising ID, or the client IP + user-agent pair before delivery.


## Dashboard and runtime reliability hardening — 2026-09-26

This pass fixes several cases where a surface could look complete in the UI but fail or lose state at runtime.

- **Dashboard navigator reset:** reopening the Ctrl/Cmd+K navigator now clears stale text and status filters, so a previous search cannot hide unrelated modules on the next open.
- **Follow-ups render repair:** the Follow-ups workspace now loads Lead Reactivation candidates through the existing `/api/lead-reactivation` backend API. The previous undefined refresh handler could crash that entire section at render time.
- **Cross-module navigation:** Feedback → Follow-ups now lands on a renderable Follow-up operations surface because the target module no longer crashes during initialization.
- **Reactivation baseline preservation:** when a dormant profile receives a new high-intent event, the lead profile retains its immediately previous activity timestamp before updating the latest activity. The reactivation engine can therefore evaluate “dormant → renewed intent” instead of losing the dormant baseline.
- **Durable provider identity:** queued/retried AdSync deliveries now retain Microsoft `msclkid`, Pinterest click identity, LinkedIn first-party tracking identifiers, anonymous/external IDs, mobile ad IDs, IP/user-agent and provider-specific configuration needed by downstream adapters.
- **Delivery validation parity:** signal validation now recognizes and validates Google, Meta, LinkedIn, Microsoft/Bing, Pinterest, ChatGPT Ads and custom-webhook destinations consistently with the provider router.
- **Provider destination persistence:** the event-rule store uses the same native destination set as the AdSync UI so a successful-looking pipeline cannot silently lose its provider destination before persistence.

These changes are covered by the existing desktop/mobile Playwright release suite together with provider quick-start and lead-reactivation regression tests. A deployment should only be promoted once the complete CI workflow is green.
