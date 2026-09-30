# Boards backend module

## Ownership

The boards module owns board state, columns, card/item placement, move concurrency, WIP enforcement and board operation identity. It does not own HTTP server bootstrapping, customer session storage, Redis, SQS or AWS provider clients.

## Public use cases

- Create/list/read tenant-scoped boards.
- Move a board item with expected item/policy versions and stable operation identity.
- Reconcile a possibly completed move through the board operation ledger.

## Move contract

The move handler authorizes the action before commit, validates destination and WIP policy, enforces item/policy versions, assigns server-owned rank and commits placement, audit record, outbox event and idempotency result transactionally.

The transport controller at `src/interfaces/http/move-card.controller.mjs` adapts already-authenticated request context into the application handler. It does not update persistence directly.

## Persistence

Migration `backend/migrations/055_boards.sql` owns the current board tables and RLS policies. The compatibility repository implementation remains in `backend/src/platform/board-store.mjs` while the existing product is migrated incrementally.

## Events

- `board.created`
- `board.item.moved`

Durable outbox events are projected into the realtime event store by workers. Realtime delivery requires an authorized workspace-bound subscription.

## Permissions

- `boards.read`
- `boards.create`
- `boards.move`
- `boards.configure`

## Failure behavior

Expected conflicts are explicit and non-destructive: stale item version, stale policy, moved neighbors, invalid destination, WIP exhaustion and operation-ID reuse. Unknown client acknowledgement is reconciled from the operation ledger; it is not converted into an automatic second logical move.

## Tests and operations

- `backend/tests/board-store.test.mjs`
- `backend/tests/board-realtime.test.mjs`
- `backend/tests/realtime-event-store.test.mjs`
- `tests/load/board-move.js`
- `operations/runbooks/board-move-recovery.md`
