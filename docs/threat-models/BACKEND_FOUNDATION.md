# Backend foundation threat model

This threat model covers the reusable backend trust boundaries and must be reviewed whenever identity, authorization, tenant isolation, privileged control, webhook ingress/egress, AI data-policy enforcement, secrets, or security-sensitive infrastructure changes.

## Trust boundaries

1. **Public/tenant ingress → API** — all caller-controlled identity, tenant/workspace scope, forwarded headers, payloads and correlation metadata are untrusted until normalized and verified.
2. **API → application handlers** — transport authentication is insufficient; handlers retain resource/field authorization, entitlement, quota and invariant checks.
3. **Tenant workloads → persistence/cache/search/object storage** — tenant identity is carried from verified execution context; caller-supplied tenant IDs never create authority.
4. **Provider ingress → integration runtime** — signatures, replay windows, content limits and durable intake are verified before business processing.
5. **Application → outbound providers** — egress policy, SSRF controls, destination allow rules, secret isolation and tenant/provider binding apply.
6. **Customer plane → platform control plane** — privileged control authentication, audience and deployment boundaries remain separate from customer sessions.
7. **Application → AI/model providers** — approved data-destination policy, budgets, immutable evidence snapshots and activation approval rules apply before execution.
8. **Runtime → secrets/configuration** — secrets are resolved by server-side adapters; browsers, logs and public catalogue/evidence views expose metadata only.

## Protected assets

Tenant records, identities and memberships; authorization policy; billing/usage state; durable jobs and accepted work; documents and search projections; audit evidence; provider credentials; runtime configuration; control-plane desired state; AI evidence and activation state.

## Primary abuse cases and controls

- Cross-tenant object access → verified workspace context, resource ownership checks, RLS/tenant query constraints and negative isolation tests.
- Privilege escalation → server-side permission evaluation and high-risk authoritative re-checks.
- Replay/duplicate writes → request/job idempotency, inbox/outbox deduplication and provider replay protection.
- SSRF and unsafe provider callbacks → bounded egress policy, raw-body signature verification and destination validation.
- Secret leakage → no browser provider credentials, redacted telemetry, secret stores and build/repository scans.
- Confused-deputy control changes → separate control audience, governance workflow, audit and optimistic versions.
- AI data exfiltration → destination/data policy, authorized retrieval, immutable source snapshots and explicit activation.
- Durable-work loss → transactional intent/outbox, durable queue state, leases/fencing, bounded retries and dead-letter recovery.
- Unsafe fallback → security/tenant controls remain locked; degraded modes may reject admission rather than bypass authority.

## Verification evidence

Primary evidence lives in backend/tests, tests/security, architecture checks, scheduled security review artifacts, the acceptance/evidence registries, and recovery/qualification workflows. Repository evidence is implementation evidence only; penetration, failure and production capacity qualification remain environment-specific.

## Review rule

Changes to identity, authorization, tenant isolation, control-plane privilege, ingress/egress trust boundaries, AI data-policy enforcement, secrets or security infrastructure must update this document when the threat model or compensating controls change. CI enforces an explicit review acknowledgement through scripts/architecture-change-impact.mjs.
