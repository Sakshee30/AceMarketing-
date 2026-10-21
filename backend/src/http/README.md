# HTTP boundary

The HTTP server is composed in `../index.mjs`, while domain-specific request handling lives under `routes/`.

Each route module follows the same contract:

```js
const handled = await handleDomainRoutes({
  req,
  res,
  url,
  workspaceId,
  readBody,
  send
})
```

Route handlers return `true` after writing a response and `false` when the path does not belong to the module. This keeps transport concerns in one place while allowing domain routes to depend on their own application services.

Composition modules keep related subdomains behind the stable server-facing contract:

- `ai-routes.mjs` composes AI governance, knowledge, and analyst/runtime routes.
- `data-quality-routes.mjs` composes event quality, trust quality, and diagnostics routes.
- `attribution-routes.mjs` composes attribution engagement and reporting routes.
- `platform-routes.mjs` composes platform route groups.

Domain route groups:

- `mcp-routes.mjs` - MCP access, token, policy, activity, and diagnostics APIs.
- `workflow-routes.mjs` - workflow authoring, execution, and approval APIs.
- `engagement-routes.mjs` - routing, reactivation, follow-ups, meetings, feedback, approvals, and custom agents.
- `admin-routes.mjs` - workspace settings, workspace switching/listing, audit export, and API-key lifecycle APIs.
- `public-routes.mjs` - public content, public intake, webhook-facing workspace events, and pricing capture APIs.
- `identity-routes.mjs` - login, OAuth, password recovery, sessions, invitations, and membership lifecycle APIs.
- `integration-routes.mjs` - connector catalog, synchronization, integration flows, custom integrations, webhooks, and OAuth lifecycle APIs.
- `ask-ace-routes.mjs` - grounded workspace assistant aggregation and journey answers.
- `event-quality-routes.mjs` - event rules, adjustments, fingerprinting, sites, and match quality APIs.
- `trust-quality-routes.mjs` - fraud, deep links, and reconciliation APIs.
- `diagnostics-routes.mjs` - diagnostics, leak monitoring, funnel reporting, and QA fixture APIs.
- `data-operations-routes.mjs` - data hub, live sync, matchback, POS imports, and offline attribution APIs.
- `lead-operations-routes.mjs` - agents, enrichment, lead grading, and lead activation APIs.
- `audience-routes.mjs` - behavior, feed mappings, audiences, exclusions, schedules, activation runs, and alerts.
- `delivery-routes.mjs` - ChatGPT Ads, signal delivery, connector health, and webhook delivery APIs.
- `compliance-routes.mjs` - compliance, consent, privacy, monitoring, and billing APIs.
- `console-routes.mjs` - signal console, public content catalogs, consent preferences, monitoring rules, and security posture APIs.
- `workspace-operations-routes.mjs` - launchpad and identity overview APIs.
- `model-routes.mjs` - workspace model definitions, runs, and validation APIs.
- `object-routes.mjs` - object lifecycle, document worker callbacks, and search.
- `form-routes.mjs` - form definitions, publishing, and submissions.
- `custom-object-routes.mjs` - custom object definitions, versions, publishing, and records.
- `policy-routes.mjs` - policy rule definitions, simulation, versions, evaluation, and archival.
- `board-routes.mjs` - board reads, creation, moves, and operation lookup.

`npm run check:maintainability` enforces the entrypoint and route-module size limits, verifies handler contracts, and prevents route modules from owning process listeners.

New domains should be extracted using this boundary before adding more branches to `index.mjs`.
