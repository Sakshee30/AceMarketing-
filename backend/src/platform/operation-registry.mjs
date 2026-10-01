import {platformModule,platformModuleRegistry} from './module-registry.mjs'

const freezeList=value=>Object.freeze([...(value||[])])

const defineOperation=({
  id,moduleId,permission,contract,handlerPath,testPath,
  owner=null,status='legacy-mapped',durability='transactional',
  audit='required',profiles=null,notes=''
})=>{
  const module=platformModule(moduleId)
  if(!module)throw new Error('operation references unknown module: '+moduleId+':'+id)
  return Object.freeze({
    id:String(id),
    moduleId:String(moduleId),
    owner:owner||module.owner,
    permission:String(permission),
    contract:String(contract),
    handlerPath:String(handlerPath),
    testPath:String(testPath),
    status,
    durability,
    audit,
    profiles:freezeList(profiles||module.supportedProfiles),
    notes:String(notes||'')
  })
}

const legacy=(moduleId,id,permission,contract,handlerPath,testPath,extra={})=>
  defineOperation({moduleId,id,permission,contract,handlerPath,testPath,...extra})

export const platformOperationRegistry=Object.freeze([
  legacy('identity','start-login','identity.session.manage','session','backend/src/security.mjs','backend/tests/platform-foundation.test.mjs',{audit:'security'}),
  legacy('identity','recover-account','identity.session.manage','account-recovery','backend/src/security.mjs','backend/tests/platform-foundation.test.mjs',{audit:'security'}),

  legacy('organizations','update-organization','organization.manage','organization','backend/src/store.mjs','backend/tests/platform-foundation.test.mjs'),
  legacy('workspaces','update-workspace','workspace.manage','workspace','backend/src/platform/workspace-access.mjs','backend/tests/workspace-access.test.mjs'),
  legacy('memberships','remove-member','memberships.manage','membership','backend/src/security.mjs','backend/tests/workspace-access.test.mjs',{audit:'security'}),
  defineOperation({moduleId:'authorization',id:'evaluate-access',permission:'access.evaluate',contract:'permission-evaluation',handlerPath:'backend/modules/authorization/src/application/queries/evaluate-access/evaluate-access.handler.mjs',testPath:'backend/tests/canonical-operation-handlers.test.mjs',status:'canonical',audit:'security'}),
  legacy('authorization','publish-policy','access.manage','access-policy','backend/src/platform/policy-engine.mjs','backend/tests/policy-workflow.test.mjs',{audit:'security'}),

  legacy('entitlements','evaluate-entitlement','entitlement.read','entitlement','backend/src/entitlements.mjs','backend/tests/usage-ledger.test.mjs'),
  defineOperation({moduleId:'forms',id:'publish-form',permission:'forms.manage',contract:'form-definition',handlerPath:'backend/modules/forms/src/application/commands/publish-form/publish-form.handler.mjs',testPath:'backend/tests/canonical-operation-handlers.test.mjs',status:'canonical'}),
  defineOperation({moduleId:'forms',id:'submit-form',permission:'forms.submit',contract:'form-submission',handlerPath:'backend/modules/forms/src/application/commands/submit-form/submit-form.handler.mjs',testPath:'backend/tests/canonical-operation-handlers.test.mjs',status:'canonical'}),
  legacy('custom-objects','define-object','objects.schema.manage','custom-object-definition','backend/src/platform/custom-object-store.mjs','backend/tests/custom-object-store.test.mjs'),
  defineOperation({moduleId:'rules',id:'simulate-rule',permission:'rules.evaluate',contract:'rule-evaluation',handlerPath:'backend/modules/rules/src/application/queries/simulate-rule/simulate-rule.handler.mjs',testPath:'backend/tests/canonical-operation-handlers.test.mjs',status:'canonical'}),
  legacy('rules','publish-rule','rules.manage','rule-definition','backend/src/platform/policy-engine.mjs','backend/tests/policy-workflow.test.mjs'),

  defineOperation({
    moduleId:'boards',
    id:'move-card',
    permission:'boards.move',
    contract:'board-move',
    handlerPath:'backend/modules/boards/src/application/commands/move-card/move-card.handler.mjs',
    testPath:'backend/tests/board-store.test.mjs',
    status:'canonical',
    durability:'transactional-outbox',
    audit:'required',
    notes:'Golden vertical slice with idempotency, audit, outbox and realtime reconciliation.'
  }),

  legacy('workflows','publish-workflow','workflows.manage','workflow-definition','backend/src/platform/workflow-store.mjs','backend/tests/policy-workflow.test.mjs'),
  legacy('workflows','retry-step','workflows.execute','workflow-execution','backend/src/platform/workflow-store.mjs','backend/tests/policy-workflow.test.mjs',{durability:'durable-job'}),
  legacy('approvals','decide-approval','approvals.decide','workflow-approval','backend/src/platform/workflow-store.mjs','backend/tests/policy-workflow.test.mjs',{audit:'security'}),

  legacy('integrations','connect-provider','integration.manage','connector-account','backend/src/platform/connector-registry.mjs','backend/tests/connector-registry.test.mjs',{audit:'security'}),
  legacy('integrations','reconcile-sync','integration.manage','provider-callback','backend/src/custom-integrations.mjs','backend/tests/platform-foundation.test.mjs',{durability:'durable-job'}),
  legacy('webhooks','deliver-webhook','webhook.manage','webhook-delivery','backend/src/platform/webhook-delivery-worker.mjs','backend/tests/webhook-delivery.test.mjs',{durability:'durable-job'}),
  legacy('webhooks','replay-delivery','webhook.manage','webhook-delivery','backend/src/platform/webhook-delivery-store.mjs','backend/tests/webhook-delivery.test.mjs',{durability:'durable-job',audit:'security'}),

  legacy('jobs','submit-job','job.manage','job','backend/src/queue.mjs','backend/tests/platform-reliability.test.mjs',{durability:'durable-job'}),
  legacy('jobs','replay-dead-letter','job.manage','job','backend/src/platform/outbox-relay.mjs','backend/tests/outbox-relay.test.mjs',{durability:'durable-job',audit:'security'}),
  legacy('scheduling','evaluate-due-schedule','schedule.manage','scheduled-job','backend/src/scheduler.mjs','backend/tests/platform-reliability.test.mjs',{durability:'durable-job'}),
  legacy('notifications','send-notification','notifications.manage','notification-delivery','backend/src/auth-mailer.mjs','backend/tests/platform-foundation.test.mjs',{durability:'durable-job'}),
  legacy('reporting','run-report','reports.manage','report-schedule','backend/src/report-scheduler.mjs','backend/tests/platform-foundation.test.mjs',{durability:'durable-job'}),

  legacy('usage','record-usage','usage.manage','usage-event','backend/src/platform/usage-ledger.mjs','backend/tests/usage-ledger.test.mjs'),
  legacy('usage','reserve-quota','usage.manage','usage-reservation','backend/src/platform/usage-ledger.mjs','backend/tests/usage-ledger.test.mjs'),
  legacy('billing','change-subscription','billing.manage','subscription','backend/src/platform/billing-lifecycle.mjs','backend/tests/billing-lifecycle.test.mjs',{audit:'financial'}),
  legacy('billing','reconcile-payment','billing.manage','subscription','backend/src/platform/billing-lifecycle.mjs','backend/tests/billing-lifecycle.test.mjs',{audit:'financial'}),

  legacy('documents','authorize-upload','files.upload','file-object','backend/src/platform/object-storage.mjs','backend/tests/object-lifecycle.test.mjs',{audit:'security'}),
  legacy('documents','approve-file','files.manage','file-object','backend/src/platform/object-lifecycle.mjs','backend/tests/object-lifecycle.test.mjs',{durability:'durable-job',audit:'security'}),
  legacy('search','query-search','search.read','search-query','backend/src/platform/search-port.mjs','backend/tests/search-port.test.mjs'),
  legacy('search','rebuild-index','search.manage','search-projection','backend/src/platform/search-port.mjs','backend/tests/search-port.test.mjs',{durability:'durable-job'}),

  legacy('audit','search-audit','audit.read','audit-event','backend/src/platform/audit-store.mjs','backend/tests/platform-audit-catalog.test.mjs',{audit:'locked'}),
  legacy('audit','export-audit','audit.export','audit-event','backend/src/platform/audit-store.mjs','backend/tests/platform-audit-catalog.test.mjs',{durability:'durable-job',audit:'locked'}),

  legacy('capabilities','activate-config','platform.capabilities.change','runtime-configuration','backend/src/platform/runtime-configuration.mjs','backend/tests/runtime-configuration.test.mjs',{audit:'security'}),
  legacy('capabilities','migrate-provider','platform.capabilities.change','provider-migration','backend/src/platform/provider-migration-store.mjs','backend/tests/provider-migration.test.mjs',{durability:'durable-job',audit:'security'}),
  legacy('cells','move-tenant','platform.placement.change','tenant-placement','backend/src/platform/cell-placement.mjs','backend/tests/cell-placement.test.mjs',{audit:'security',profiles:['high-scale']}),
  legacy('ai','request-inference','ai.execute','ai-request','backend/src/ai-runtime.mjs','backend/tests/ai-provider-access.test.mjs',{profiles:['ai-enabled'],audit:'data-policy'}),
  legacy('ai','activate-model-result','ai.manage','ai-activation','backend/src/ai-activation-execution.mjs','backend/tests/ai-activation-execution.test.mjs',{profiles:['ai-enabled'],durability:'durable-job',audit:'security'})
])

const byKey=new Map(platformOperationRegistry.map(item=>[item.moduleId+':'+item.id,item]))

export const platformOperation=(moduleId,id)=>byKey.get(String(moduleId)+':'+String(id))||null

export const operationRegistryReadiness=()=>{
  const canonical=platformOperationRegistry.filter(item=>item.status==='canonical').length
  const legacyMapped=platformOperationRegistry.filter(item=>item.status==='legacy-mapped').length
  return Object.freeze({
    schemaVersion:'platform-operations.v1',
    total:platformOperationRegistry.length,
    canonical,
    legacyMapped,
    migrationComplete:legacyMapped===0
  })
}

export const operationRegistrySnapshot=()=>({
  schemaVersion:'platform-operations.v1',
  generatedAt:new Date().toISOString(),
  readiness:operationRegistryReadiness(),
  items:platformOperationRegistry.map(item=>({
    id:item.id,
    moduleId:item.moduleId,
    owner:item.owner,
    permission:item.permission,
    contract:item.contract,
    status:item.status,
    durability:item.durability,
    audit:item.audit,
    profiles:[...item.profiles]
  }))
})

export const validateOperationRegistry=()=>{
  const moduleIds=new Set(platformModuleRegistry.map(item=>item.id))
  const coveredModules=new Set()
  const seen=new Set()
  const allowedStatus=new Set(['canonical','legacy-mapped'])
  const allowedDurability=new Set(['transactional','transactional-outbox','durable-job'])
  for(const item of platformOperationRegistry){
    const key=item.moduleId+':'+item.id
    if(seen.has(key))throw new Error('duplicate platform operation id: '+key)
    seen.add(key)
    coveredModules.add(item.moduleId)
    if(!moduleIds.has(item.moduleId))throw new Error('operation module missing: '+key)
    if(!item.owner||!item.permission||!item.contract)throw new Error('operation ownership/contract metadata missing: '+key)
    if(!item.handlerPath||!item.testPath)throw new Error('operation implementation evidence missing: '+key)
    if(!allowedStatus.has(item.status))throw new Error('unsupported operation migration status: '+key)
    if(!allowedDurability.has(item.durability))throw new Error('unsupported operation durability: '+key)
    if(item.status==='canonical'&&!item.handlerPath.includes('/application/'))throw new Error('canonical operation must live in application boundary: '+key)
    if(!item.profiles.length)throw new Error('operation profile contract missing: '+key)
  }
  for(const module of platformModuleRegistry){
    if(!coveredModules.has(module.id))throw new Error('module has no mapped operations: '+module.id)
  }
  return true
}
