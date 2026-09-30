# Boards feature

## Purpose

The boards feature provides a tenant-scoped, versioned Kanban surface for customer work. It uses the shared interaction and Kanban packages for presentation while keeping authorization, WIP limits, ordering, idempotency, durability and policy decisions on the server.

## Customer entry points

- `pages/boards/BoardsPage.tsx` — workspace board collection and board creation.
- `pages/board-detail/BoardDetailPage.tsx` — board rendering and accessible move interaction.
- `model/move-card.intent.ts` — typed customer intent and stable operation identity.
- `data/mutations/useMoveCard.ts` — mutation, canonical reconciliation and unknown-outcome handling.

## Server contracts

- `GET /api/boards`
- `POST /api/boards`
- `GET /api/boards/:boardId`
- `POST /api/boards/:boardId/moves`
- `GET /api/boards/:boardId/operations/:operationId`
- Authorized realtime topics: `board.created` and `board.item.moved`.

A move is successful only after the backend returns the canonical committed result. A lost response is treated as an unknown outcome and reconciled through the operation endpoint before any retry with a new identity.

## Owned data

The backend boards module owns board, column, placement and operation-ledger persistence introduced by migration `055_boards.sql`. Realtime projection persistence is owned by the platform realtime event store.

## Permissions

- `boards.read`
- `boards.create`
- `boards.move`
- `boards.configure`

Realtime subscription requires `boards.read` and a token whose workspace matches the requested workspace.

## Dependencies

Frontend dependencies are limited to public contracts from `packages/client-core`, `packages/interaction-core`, `packages/kanban-ui`, React and TanStack Query. Backend domain logic does not depend on browser code, Redis, SQS or AWS SDKs.

## Disabled and degraded behavior

The runtime feature ID is `boards`. Disabled or read-only containment rejects new board mutations before domain execution. Existing committed data, audit records, outbox records and operation results remain authoritative. Read behavior is policy-controlled.

## Failure and recovery behavior

Expected conflicts include stale item versions, policy-version changes, moved neighbors, WIP-limit exhaustion and reused operation identities. The UI refreshes canonical state instead of overwriting a newer server version. Unknown outcomes must be reconciled with the original operation ID.

Operational recovery is documented in `operations/runbooks/board-move-recovery.md`.

## Performance and capacity

Board reads are bounded and server ordered. Move commands lock only the required board/item/neighbor state, assign server ranks and rebalance only when rank space is exhausted. Qualification workloads live in `tests/load/board-move.js`; architecture targets are not production benchmark claims.

## Tests

- `backend/tests/board-store.test.mjs`
- `backend/tests/board-realtime.test.mjs`
- `backend/tests/realtime-event-store.test.mjs`
- `tests/e2e/board-move-recovery.spec.ts`
- `tests/security/tenant-isolation.spec.ts`
- `tests/load/board-move.js`

## Operational owner

Platform work / boards ownership. Security owns authorization and tenant-isolation gates; platform operations owns realtime/runtime health and recovery evidence.
