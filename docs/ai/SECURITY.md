# AI security boundaries

Tenant scope is derived from authenticated workspace context. Dedicated permissions cover analysis and training; owner remains the only wildcard role.

Provider credentials stay server-side. Internal ML calls require `X-Internal-Token`. Provider and ML URLs are configuration-owned, not user supplied.

Input snapshots and results are tenant scoped. Prompts, transcripts, embeddings, features and artifacts are treated as sensitive.

Production fitted artifacts require encrypted object storage. Generated artifacts are SHA-256 recorded and hash-verified before loading. S3-compatible storage uses server-side encryption and can use a configured endpoint/region.

Cross-tenant training is not implemented. External activation is separated into proposal, reviewer evidence, human approval and worker execution. Reviewer output is never authorization.

Provider-side activation execution is disabled by default with `AI_ACTIVATION_EXECUTION_ENABLED=false`. Enabling it does not bypass authorization: the execute endpoint requires the dedicated `ai.activation.execute` permission, queues a durable worker job, and the worker rechecks proposal hash, expiry, evaluation/model snapshot and deployment state immediately before dispatch. Audience execution reuses the existing consent-aware Meta/Google audience adapters; CRM execution reuses the existing workspace-scoped HubSpot/Zoho/Salesforce writeback adapters. Google Ads budget execution is allowlisted only for an exact campaign-budget resource, re-reads the provider's current amount before mutation, rejects stale snapshots, enforces bounded percentage/absolute limits, and requires explicit acknowledgement when a budget is shared across campaigns. Provider timeouts/network ambiguity are treated as unknown outcomes that require reconciliation instead of blind retry.
