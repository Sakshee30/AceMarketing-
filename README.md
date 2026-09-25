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
