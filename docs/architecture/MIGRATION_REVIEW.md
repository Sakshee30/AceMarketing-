# Persistence migration review

This record defines the review contract for backend schema migrations.

## Required review for every persistence change

A migration change must identify:

- owning module and tables/indexes affected,
- forward-compatibility with the currently deployed application,
- backward/rollback or forward-repair strategy,
- locking and long-transaction risk,
- tenant-isolation/RLS implications,
- backfill strategy and bounded batch size when applicable,
- read/write compatibility during rolling deployment,
- data-loss and unknown-outcome handling,
- restore/reconciliation impact,
- expected observability and operational verification.

## Current migration authority

backend/migrations is the canonical migration directory. backend/src/platform/persistence-catalog.mjs provides machine-readable migration-to-table traceability and backend/src/platform/module-registry.mjs maps migrations to owning modules.

Existing migrations are retained as historical schema authority. This review contract does not rewrite or squash them.

## Change rule

Any commit that adds or modifies a file under backend/migrations/ must also update this review record or add an explicitly referenced migration-specific review document. CI enforces the acknowledgement through scripts/architecture-change-impact.mjs.

Migration review is not a substitute for running migrations against representative data, restore testing or production rollout evidence.
