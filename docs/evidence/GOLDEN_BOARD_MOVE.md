# Golden vertical slice — board move

This repository uses the board move as the reference end-to-end slice required by the unified SaaS architecture standard.

## Customer interaction

The authenticated customer board page is `frontend/customer-app/src/features/boards/pages/board-detail/BoardDetailPage.tsx`. A user can open a move affordance without drag-and-drop, select an allowed destination and receive an accessible live status announcement. The request uses a stable operation ID through `useMoveCard.ts`.

## Backend path

The request reaches the board transport adapter and canonical `move-card` application handler. The handler delegates to the board store, which remains the authoritative compatibility persistence adapter during incremental migration.

The move contract protects scope/permission checks, item and policy versions, WIP constraints, server-owned ranking, operation identity, audit/outbox intent and canonical result recording.

## Unknown outcome and realtime convergence

If the client loses the response after a possible commit, the browser reconciles the original operation rather than creating another move. Durable board move events are projected to authorized realtime subscribers and cause canonical board state to be refreshed.

## Evidence

- Backend concurrency/idempotency: `backend/tests/board-store.test.mjs`
- Realtime authorization/convergence: `backend/tests/board-realtime.test.mjs`
- Browser keyboard/non-drag and lost-ack recovery: `tests/e2e/board-move-recovery.spec.ts`
- Load/conflict scenario: `tests/load/board-move.js`
- Migration: `backend/migrations/055_boards.sql`
- Operational recovery: `operations/runbooks/board-move-recovery.md`
- Feature contract: `docs/features/boards.md`

## Completion state

The slice is **integrated** at repository level. It is not marked production-qualified until the selected deployment profile has environment-specific load, security, failover and recovery evidence.
