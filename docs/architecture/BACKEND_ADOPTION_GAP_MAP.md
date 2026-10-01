# Architecture adoption gap map

This file records implementation status against the supplied SaaS architecture standards without claiming production qualification.

## Current boundary status

- Frontend canonical compositions, architecture checks, independent customer/public/control builds, budgets, browser evidence, shared client contracts and the board interaction slice are present on `main`.
- Backend Phase 0/1 foundations are present: module registry, capability/provider contracts, runtime roles, tenant/security boundaries, durable-work primitives, canonical deployment roles, architecture checks and the golden board move slice.
- The operation registry added here maps every reusable backend module to an owned operation contract, permission, implementation path and test evidence. It deliberately distinguishes `canonical` operations from `legacy-mapped` operations.
- A legacy-mapped operation is not architecture completion. It means existing behavior is preserved and traceable while it is migrated one use case at a time behind the canonical application boundary.

## Non-destructive migration rule

No working customer feature is deleted or replaced solely to match a target folder tree. Compatibility adapters remain in place while use cases move incrementally. Existing provider choices are retained until contract, isolation, recovery and migration evidence justify a switch.

## Next backend tightening sequence

1. Convert legacy-mapped operations into one-use-case application handlers, starting with security-sensitive and high-write paths.
2. Preserve route/API behavior with compatibility controllers and contract tests.
3. Add per-operation negative authorization, failure/recovery and migration evidence before changing the operation status to `canonical`.
4. Keep durable jobs, audit, outbox/idempotency and tenant isolation as locked behavior.
5. Run backend architecture, syntax, foundation, security and qualification gates before release claims.

The architecture documents define scale and release targets; they do not by themselves prove that this repository is production-qualified.
