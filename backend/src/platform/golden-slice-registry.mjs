import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()

export const goldenSlice=Object.freeze({
  id:'boards.move-card',
  featureId:'boards',
  status:'integrated',
  frontend:Object.freeze({
    page:'frontend/customer-app/src/features/boards/pages/board-detail/BoardDetailPage.tsx',
    intent:'frontend/customer-app/src/features/boards/model/move-card.intent.ts',
    mutation:'frontend/customer-app/src/features/boards/data/mutations/useMoveCard.ts',
    manifest:'frontend/customer-app/src/features/boards/feature.manifest.ts',
    sharedUi:'packages/kanban-ui/src/index.tsx'
  }),
  backend:Object.freeze({
    controller:'backend/modules/boards/src/interfaces/http/move-card.controller.mjs',
    handler:'backend/modules/boards/src/application/commands/move-card/move-card.handler.mjs',
    persistence:'backend/src/platform/board-store.mjs',
    realtime:'backend/src/platform/board-realtime.mjs',
    migration:'backend/migrations/055_boards.sql'
  }),
  evidence:Object.freeze({
    unitAndConcurrency:'backend/tests/board-store.test.mjs',
    realtime:'backend/tests/board-realtime.test.mjs',
    browserRecovery:'tests/e2e/board-move-recovery.spec.ts',
    load:'tests/load/board-move.js',
    runbook:'operations/runbooks/board-move-recovery.md',
    featureContract:'docs/features/boards.md'
  }),
  invariants:Object.freeze([
    'server-authoritative permission and transition checks',
    'stable operation identity and idempotent reconciliation',
    'version/WIP conflict detection',
    'transactional placement, audit, outbox and result recording',
    'keyboard/non-drag move path',
    'unknown-outcome reconciliation',
    'authorized realtime convergence'
  ])
})

export const goldenSliceSnapshot=()=>({
  schemaVersion:'platform-golden-slice.v1',
  generatedAt:new Date().toISOString(),
  item:{
    ...goldenSlice,
    frontend:{...goldenSlice.frontend},
    backend:{...goldenSlice.backend},
    evidence:{...goldenSlice.evidence},
    invariants:[...goldenSlice.invariants]
  }
})

export const validateGoldenSlice=()=>{
  const sections=[goldenSlice.frontend,goldenSlice.backend,goldenSlice.evidence]
  for(const section of sections){
    for(const [key,file] of Object.entries(section)){
      if(typeof file!=='string'||!file)throw new Error('golden slice path missing: '+key)
      if(!fs.existsSync(path.join(root,file)))throw new Error('golden slice evidence missing: '+file)
    }
  }
  if(goldenSlice.status!=='integrated')throw new Error('golden slice must remain integrated before qualification')
  if(goldenSlice.invariants.length<7)throw new Error('golden slice invariant coverage incomplete')
  return true
}
