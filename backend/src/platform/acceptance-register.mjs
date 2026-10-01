const STATUS=Object.freeze(['not-started','designed','implemented','integrated','verified','production-qualified'])

const controls=Object.freeze([
['G-01','Approved project scope, capacity and failure envelope','product+sre'],
['G-02','Source conflicts and deviations explicitly resolved','architecture'],
['G-03','Customer, website and platform-admin trust boundaries separated','security'],
['G-04','Canonical paths and ownership enforced','architecture'],
['G-05','Each page and feature has a separate owned entry','frontend'],
['G-06','No frontend database/cloud-secret dependencies','security'],
['G-07','Domain/application code imports no provider SDKs','backend'],
['G-08','Startup distinguishes outage from logout','frontend'],
['G-09','Workspace/account changes do not leak prior data','security+frontend'],
['G-10','All protected operations authorize server-side','security+backend'],
['G-11','Tenant isolation spans DB, cache, objects, search, events and AI','security'],
['G-12','Pooled database context does not leak','data'],
['G-13','No long-lived browser credential persistence','security'],
['G-14','Cookie sessions have tested CSRF controls','identity'],
['G-15','UI state and server data have one owner','frontend'],
['G-16','API/event/config boundaries validate runtime data','service-owners'],
['G-17','Cancellation reaches transport; late scope results are rejected','frontend'],
['G-18','Mutations handle unknown outcome and duplicates','backend+frontend'],
['G-19','Autosave preserves newer work and handles conflict','frontend'],
['G-20','Draft storage has ownership, expiry and failure policy','frontend+security'],
['G-21','Every drag action has a non-drag and keyboard route','ux'],
['G-22','Dragging cannot approve/pay/destroy without domain checks','security+backend'],
['G-23','Board ranking and WIP checks are concurrency-safe','boards'],
['G-24','Optimistic rollback does not overwrite another user','frontend'],
['G-25','Large boards and tables are bounded','frontend'],
['G-26','Builder schemas are constrained and versioned','builders'],
['G-27','Realtime is scoped, deduplicated and backpressured','realtime'],
['G-28','Reconnect/renewal capacity is independently proven','realtime+sre'],
['G-29','Public/private cache policies cannot mix tenants','edge+security'],
['G-30','Custom domains are verified and safely retired','platform'],
['G-31','Durable writes, audit and outbox are coordinated','backend+data'],
['G-32','Worker retries, leases and DLQ are bounded','workers'],
['G-33','Production queue/storage fallback remains durable','platform'],
['G-34','Cache-off mode respects database capacity','sre+data'],
['G-35','Required security controls cannot be switched off','security'],
['G-36','Desired-state changes require valid plans and approvals','platform'],
['G-37','Disable, stop and destroy are separate','infrastructure'],
['G-38','Provider migration preserves required semantics','capabilities'],
['G-39','Upload quarantine and parser isolation work','security+documents'],
['G-40','Search/vector retrieval enforces authorization before use','search+ai'],
['G-41','AI fallback respects data destination policy','ai+security'],
['G-42','Billing/metering deduplicates and reconciles','billing'],
['G-43','Integration webhook signature/replay/tenant binding works','integrations'],
['G-44','Outbound URL handling resists SSRF','security'],
['G-45','Database migrations and rollbacks are compatible','data'],
['G-46','Production network/IAM/secrets are least-privileged','infrastructure+security'],
['G-47','Approved provider quotas exceed the planned envelope','sre'],
['G-48','Containers, probes and graceful drain are tested','platform'],
['G-49','Tenant cells and hot-tenant limits isolate impact','sre'],
['G-50','Core 50,000-RPS profile is qualified','performance'],
['G-51','Required 700,000-concurrent profile is qualified','sre'],
['G-52','Overload sheds safely instead of cascading','sre'],
['G-53','Zone failure meets the declared envelope','sre+data'],
['G-54','Regional recovery fences writers and measures RPO/RTO','dr'],
['G-55','Backups restore complete customer functionality','dr'],
['G-56','ASVS/threat-model/security findings are resolved','security'],
['G-57','Supply-chain provenance, scans and signing work','release+security'],
['G-58','Privacy, retention and deletion propagation are defined','privacy'],
['G-59','Essential audit is durable and telemetry redacted','security+operations'],
['G-60','SLOs, alerts, owners and runbooks are actionable','sre'],
['G-61','Browser performance and accessibility gates pass','frontend+ux'],
['G-62','Old tabs and retained chunks survive release','frontend+release'],
['G-63','Canary/rollback/forward-repair paths are rehearsed','release+data'],
['G-64','Critical tests are not silently skipped','qa'],
['G-65','Second-product reuse is proven','architecture'],
['G-66','Production completion claims match evidence','accountable-owners']
])

const localEvidence=Object.freeze({
  'G-45':['backend/scripts/migrate.mjs','scripts/rollback.mjs','.github/workflows/release.yml','docs/PRODUCTION_RUNBOOK.md'],
  'G-34':['backend/tests/capacity-budget.test.mjs','backend/adapters/redis/cache.redis.ts','config/profiles/production-standard.yaml'],
  'G-33':['backend/src/queue.mjs','backend/src/platform/deployment-mode.mjs','config/profiles/production-standard.yaml'],
  'G-09':['frontend/src/customer-app/workspace-lifecycle.ts','packages/client-core/src/query-scope.ts','tests/security/cross-tenant-platform-isolation.test.mjs'],
  'G-03':['frontend/customer-app','frontend/platform-admin','website/public-site'],
  'G-04':['.github/CODEOWNERS','scripts/frontend-architecture-check.mjs','scripts/backend-architecture-check.mjs'],
  'G-05':['frontend/customer-app/src/features/catalog.ts','frontend/src/features'],
  'G-06':['tests/architecture/dependency-boundaries.test.mjs'],
  'G-07':['tests/architecture/dependency-boundaries.test.mjs'],
  'G-10':['backend/src/platform/operation-registry.mjs','tests/security/tenant-isolation.test.mjs'],
  'G-11':['tests/security/cross-tenant-platform-isolation.test.mjs'],
  'G-12':['backend/tests/tenant-db.test.mjs'],
  'G-16':['scripts/contracts-check.mjs'],
  'G-18':['backend/modules/boards/src/application/commands/move-card/move-card.handler.mjs'],
  'G-21':['frontend/customer-app/src/features/boards'],
  'G-23':['backend/tests/board-store.test.mjs'],
  'G-27':['backend/tests/board-realtime.test.mjs'],
  'G-31':['backend/src/platform/outbox-relay.mjs','backend/src/platform/audit-store.mjs'],
  'G-32':['backend/src/queue.mjs','backend/tests/worker-leasing.test.mjs'],
  'G-35':['backend/src/platform/feature-catalog.mjs','backend/tests/control-capability.test.mjs'],
  'G-36':['backend/src/platform/control-change-store.mjs'],
  'G-38':['backend/src/platform/provider-migration-store.mjs','backend/tests/provider-migration.test.mjs'],
  'G-40':['backend/tests/search-port.test.mjs','backend/tests/ai-knowledge-authorization.test.mjs'],
  'G-41':['backend/tests/ai-provider-access.test.mjs'],
  'G-42':['backend/tests/billing-lifecycle.test.mjs','backend/tests/usage-ledger.test.mjs'],
  'G-43':['backend/tests/webhook-delivery.test.mjs'],
  'G-48':['backend/src/platform/drain-controller.mjs','backend/src/platform/process-health.mjs'],
  'G-59':['backend/src/platform/audit-store.mjs','backend/src/observability.mjs'],
  'G-64':['package.json']
})

const nonwaivable=new Set(['G-09','G-10','G-11','G-18','G-22','G-31','G-35'])

export const acceptanceControlRegistry=Object.freeze(controls.map(([id,control,owner])=>Object.freeze({
  id,control,owner,
  status:localEvidence[id]?'implemented':'designed',
  evidence:Object.freeze([...(localEvidence[id]||[])]),
  nonwaivable:nonwaivable.has(id)
})))

export const acceptanceRegisterSnapshot=()=>({
  schemaVersion:'platform-acceptance-register.v1',
  generatedAt:new Date().toISOString(),
  statuses:[...STATUS],
  summary:STATUS.reduce((acc,status)=>({...acc,[status]:acceptanceControlRegistry.filter(x=>x.status===status).length}),{}),
  items:acceptanceControlRegistry.map(item=>({...item,evidence:[...item.evidence]}))
})

export const validateAcceptanceRegister=()=>{
  if(acceptanceControlRegistry.length!==66)throw new Error('acceptance register must contain 66 controls')
  const ids=new Set()
  for(const item of acceptanceControlRegistry){
    if(ids.has(item.id))throw new Error('duplicate acceptance control: '+item.id)
    ids.add(item.id)
    if(!/^G-\d{2}$/.test(item.id))throw new Error('invalid acceptance control id: '+item.id)
    if(!STATUS.includes(item.status))throw new Error('invalid acceptance control status: '+item.id)
    if(!item.control||!item.owner)throw new Error('acceptance control metadata missing: '+item.id)
    if(['verified','production-qualified'].includes(item.status)&&item.evidence.length===0){
      throw new Error('verified acceptance control requires evidence: '+item.id)
    }
  }
  for(let i=1;i<=66;i++){
    const id='G-'+String(i).padStart(2,'0')
    if(!ids.has(id))throw new Error('acceptance control missing: '+id)
  }
  return true
}
