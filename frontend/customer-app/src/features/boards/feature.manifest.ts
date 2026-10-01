export const boardsFeatureManifest=Object.freeze({
  id:'boards',
  owner:'platform-work',
  sourceBoundary:'packages/kanban-ui',
  runtimeOwnership:'mapped-existing',
  status:'integrated',
  visibility:'customer-app',
  version:1,
  permissions:['boards.read','boards.move','boards.configure'],
  operationIds:['boards.move-card'],
  offBehaviour:{newWork:'reject',existingReads:'policy-controlled',committedEvents:'drain'},
  recovery:{unknownOutcome:'reconcile-operation',runbook:'operations/runbooks/board-move-recovery.md'},
  evidence:['tests/e2e/board-move-recovery.spec.ts','tests/load/board-move.js','backend/tests/board-store.test.mjs']
} as const)
export default boardsFeatureManifest
