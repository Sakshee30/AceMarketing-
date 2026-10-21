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

Route handlers return `true` after writing a response and `false` when the path does not belong to the module. This keeps the transport concerns in one place while allowing domain routes to depend on their own application services.

Current route modules:

- `routes/mcp-routes.mjs` — MCP access, token, policy, activity, and diagnostics APIs
- `routes/workflow-routes.mjs` — workflow authoring, execution, and approval APIs

Additional route groups:

- `routes/platform-routes.mjs` composes the platform route groups.
- `routes/ai-routes.mjs` owns AI datasets, governance, providers, jobs, analyst tools, and inference APIs.
- `routes/engagement-routes.mjs` owns routing, reactivation, follow-ups, meetings, feedback, approvals, and custom agents.
- `routes/admin-routes.mjs` owns workspace settings, workspace switching/listing, audit export, and API-key lifecycle APIs.
- `routes/public-routes.mjs` owns public content, public intake, webhook-facing workspace events, and pricing capture APIs.
- `routes/identity-routes.mjs` owns login, OAuth, password recovery, sessions, workspace switching, invitations, and membership lifecycle APIs.
- `routes/integration-routes.mjs` owns connector catalog, synchronization, integration flows, custom integrations, webhooks, and OAuth lifecycle APIs.
- `routes/ask-ace-routes.mjs` owns grounded workspace assistant aggregation and journey answers.
- `routes/data-quality-routes.mjs` owns event rules, adjustments, fingerprinting, sites, match quality, fraud, deep links, reconciliation, diagnostics, leak monitoring, and funnel reporting.
- `routes/data-operations-routes.mjs` owns data hub, live sync, matchback, POS imports, and offline attribution APIs.
- `routes/attribution-routes.mjs` owns personalization, activation rules, tracking, journeys, customer 360, planning, reporting, and attribution APIs.
- `routes/lead-operations-routes.mjs` owns agents, enrichment, lead grading, and lead activation APIs.
- `routes/audience-routes.mjs` owns behavior, feed mappings, audiences, exclusions, schedules, activation runs, and alerts.
- `routes/delivery-routes.mjs` owns ChatGPT Ads, signal delivery, connector health, and webhook delivery APIs.
- `routes/compliance-routes.mjs` owns compliance, consent, privacy, monitoring, and billing APIs.
- `routes/console-routes.mjs` owns signal console, public content catalogs, consent preferences, monitoring rules, and security posture APIs.
- `routes/workspace-operations-routes.mjs` owns launchpad and identity overview APIs.
- `routes/model-routes.mjs` owns workspace model definitions, runs, and validation APIs.
- `routes/object-routes.mjs` owns object lifecycle, document worker callbacks, and search.
- `routes/form-routes.mjs` owns form definitions, publishing, and submissions.
- `routes/custom-object-routes.mjs` owns custom object definitions, versions, publishing, and records.
- `routes/policy-routes.mjs` owns policy rule definitions, simulation, versions, evaluation, and archival.
- `routes/board-routes.mjs` owns board reads, creation, moves, and operation lookup.

New domains should be extracted using this boundary before adding more branches to `index.mjs`.
