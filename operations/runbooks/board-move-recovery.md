# Board move recovery runbook

## Scope

Use this runbook when a customer card move has an unknown outcome, repeated version conflicts, WIP-limit conflicts, or an elevated failure rate. A move is never considered successful from UI intent alone; the canonical server result and operation ledger are authoritative.

## Customer-visible states

- Confirmed — the move endpoint returned the canonical committed result.
- Conflict — the server rejected stale item/policy state, invalid neighbors, WIP limits, or a reused operation ID.
- Unknown outcome — the client lost acknowledgement. Do not create a replacement operation ID.
- Disabled/degraded — runtime configuration is intentionally rejecting new board mutations.

## Unknown outcome procedure

1. Capture workspaceId, boardId, operationId, request ID, and approximate time. Do not request customer credentials.
2. Query GET /api/boards/:boardId/operations/:operationId in the same authorized workspace scope.
3. If status is completed, reconcile the UI from result and refresh the board snapshot.
4. If status is pending, wait for the bounded retry interval and query again. Do not resubmit with a different operation ID.
5. If status is failed, surface the stored error code and refresh the canonical board.
6. If no operation exists, confirm the original request reached the API before permitting a user-initiated retry.

## Conflict procedure

For BOARD_ITEM_VERSION_CONFLICT, BOARD_POLICY_VERSION_CONFLICT, BOARD_NEIGHBOR_MOVED, BOARD_NEIGHBOR_ORDER_CHANGED, or BOARD_WIP_LIMIT_REACHED, refresh GET /api/boards/:boardId. Preserve the customer's uncommitted local context and ask them to choose a valid destination again. Never overwrite newer server state.

## Feature-off and containment

Board mutations are governed by runtime feature ID boards. When disabled or read-only containment is active, new moves are rejected before domain execution. Existing committed moves and audit/outbox evidence are preserved.

## Evidence to collect

Review API request telemetry for board routes, PostgreSQL board operation rows, board.item.move audit records, board.item.moved outbox events, runtime configuration version, and relevant deployment/database incidents.

## Qualification

Run tests/load/board-move.js against a seeded non-production board. A concurrency scenario is expected to produce a canonical success and safe 409 conflicts for stale contenders. Production qualification additionally requires real infrastructure, representative data, security review, and recovery evidence.

## Rollback / repair

Application rollback must not delete board rows or operation history. If a code rollback is required, preserve migration 055_boards.sql. Repair is forward-only unless a reviewed migration explicitly proves data-safe reversal.
