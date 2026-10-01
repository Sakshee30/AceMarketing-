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
  defineOperation({moduleId:'workspaces',id:'update-workspace',permission:'workspace.write',contract:'workspace',handlerPath:'backend/modules/workspaces/src/application/commands/update-workspace/update-workspace.handler.mjs',testPath:'backend/tests/canonical-lifecycle-handlers.test.mjs',status:'canonical',audit:'required'}),
  defineOperation({moduleId:'memberships',id:'remove-member',permission:'members.write',contract:'membership',handlerPath:'backend/modules/memberships/src/application/commands/remove-member/remove-member.handler.mjs',testPath:'backend/tests/canonical-lifecycle-handlers.test.mjs',status:'canonical',audit:'security'}),
  defineOperation({moduleId:'authorization',id:'evaluate-access',permission:'access.evaluate',contract:'permission-evaluation',handlerPath:'backend/modules/authorization/src/application/queries/evaluate-access/evaluate-access.handler.mjs',testPath:'backend/tests/canonical-operation-handlers.test.mjs',status:'canonical',audit:'security'}),
  legacy('authorization','publish-policy','access.manage','access-policy','backend/src/platform/policy-engine.mjs','backend/tests/policy-workflow.test.mjs',{audit:'security'}),

  defineOperation({moduleId:'entitlements',id:'evaluate-entitlement',permission:'entitlement.read',contract:'entitlement',handlerPath:'backend/modules/entitlements/src/application/queries/evaluate-entitlement/evaluate-entitlement.handler.mjs',testPath:'backend/tests/canonical-data-foundation-handlers.test.mjs',status:'canonical'}),
  defineOperation({moduleId:'forms',id:'publish-form',permission:'forms.manage',contract:'form-definition',handlerPath:'backend/modules/forms/src/application/commands/publish-form/publish-form.handler.mjs',testPath:'backend/tests/canonical-operation-handlers.test.mjs',status:'canonical'}),
  defineOperation({moduleId:'forms',id:'submit-form',permission:'forms.submit',contract:'form-submission',handlerPath:'backend/modules/forms/src/application/commands/submit-form/submit-form.handler.mjs',testPath:'backend/tests/canonical-operation-handlers.test.mjs',status:'canonical'}),
  defineOperation({moduleId:'custom-objects',id:'define-object',permission:'objects.schema.manage',contract:'custom-object-definition',handlerPath:'backend/modules/custom-objects/src/application/commands/define-object/define-object.handler.mjs',testPath:'backend/tests/canonical-data-foundation-handlers.test.mjs',status:'canonical'}),
  defineOperation({moduleId:'rules',id:'simulate-rule',permission:'rules.evaluate',contract:'rule-evaluation',handlerPath:'backend/modules/rules/src/application/queries/simulate-rule/simulate-rule.handler.mjs',testPath:'backend/tests/canonical-operation-handlers.test.mjs',status:'canonical'}),
  defineOperation({moduleId:'rules',id:'publish-rule',permission:'workspace.write',contract:'rule-definition',handlerPath:'backend/modules/rules/src/application/commands/publish-rule/publish-rule.handler.mjs',testPath:'backend/tests/canonical-lifecycle-handlers.test.mjs',status:'canonical',audit:'required'}),

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

  defineOperation({moduleId:'workflows',id:'publish-workflow',permission:'approvals.write',contract:'workflow-definition',handlerPath:'backend/modules/workflows/src/application/commands/publish-workflow/publish-workflow.handler.mjs',testPath:'backend/tests/canonical-lifecycle-handlers.test.mjs',status:'canonical',audit:'required'}),
  defineOperation({moduleId:'workflows',id:'retry-step',permission:'approvals.write',contract:'workflow-execution',handlerPath:'backend/modules/workflows/src/application/commands/retry-step/retry-step.handler.mjs',testPath:'backend/tests/canonical-lifecycle-handlers.test.mjs',status:'canonical',durability:'durable-job',audit:'required'}),
  defineOperation({moduleId:'approvals',id:'decide-approval',permission:'approvals.write',contract:'workflow-approval',handlerPath:'backend/modules/approvals/src/application/commands/decide-approval/decide-approval.handler.mjs',testPath:'backend/tests/canonical-lifecycle-handlers.test.mjs',status:'canonical',audit:'security'}),

  defineOperation({moduleId:'integrations',id:'connect-provider',permission:'integration.manage',contract:'connector-account',handlerPath:'backend/modules/integrations/src/application/commands/connect-provider/connect-provider.handler.mjs',testPath:'backend/tests/canonical-integration-handlers.test.mjs',status:'canonical',audit:'security'}),
  defineOperation({moduleId:'integrations',id:'reconcile-sync',permission:'integration.manage',contract:'provider-callback',handlerPath:'backend/modules/integrations/src/application/commands/reconcile-sync/reconcile-sync.handler.mjs',testPath:'backend/tests/canonical-integration-handlers.test.mjs',status:'canonical',durability:'durable-job'}),
  defineOperation({moduleId:'webhooks',id:'deliver-webhook',permission:'webhook.manage',contract:'webhook-delivery',handlerPath:'backend/modules/webhooks/src/application/commands/deliver-webhook/deliver-webhook.handler.mjs',testPath:'backend/tests/canonical-integration-handlers.test.mjs',status:'canonical',durability:'durable-job'}),
  defineOperation({moduleId:'webhooks',id:'replay-delivery',permission:'webhook.manage',contract:'webhook-delivery',handlerPath:'backend/modules/webhooks/src/application/commands/replay-delivery/replay-delivery.handler.mjs',testPath:'backend/tests/canonical-integration-handlers.test.mjs',status:'canonical',durability:'durable-job',audit:'security'}),

  legacy('jobs','submit-job','job.manage','job','backend/src/queue.mjs','backend/tests/platform-reliability.test.mjs',{durability:'durable-job'}),
  legacy('jobs','replay-dead-letter','job.manage','job','backend/src/platform/outbox-relay.mjs','backend/tests/outbox-relay.test.mjs',{durability:'durable-job',audit:'security'}),
  legacy('scheduling','evaluate-due-schedule','schedule.manage','scheduled-job','backend/src/scheduler.mjs','backend/tests/platform-reliability.test.mjs',{durability:'durable-job'}),
  legacy('notifications','send-notification','notifications.manage','notification-delivery','backend/src/auth-mailer.mjs','backend/tests/platform-foundation.test.mjs',{durability:'durable-job'}),
  legacy('reporting','run-report','reports.manage','report-schedule','backend/src/report-scheduler.mjs','backend/tests/platform-foundation.test.mjs',{durability:'durable-job'}),

  legacy('usage','record-usage','usage.manage','usage-event','backend/src/platform/usage-ledger.mjs','backend/tests/usage-ledger.test.mjs'),
  legacy('usage','reserve-quota','usage.manage','usage-reservation','backend/src/platform/usage-ledger.mjs','backend/tests/usage-ledger.test.mjs'),
  legacy('billing','change-subscription','billing.manage','subscription','backend/src/platform/billing-lifecycle.mjs','backend/tests/billing-lifecycle.test.mjs',{audit:'financial'}),
  legacy('billing','reconcile-payment','billing.manage','subscription','backend/src/platform/billing-lifecycle.mjs','backend/tests/billing-lifecycle.test.mjs',{audit:'financial'}),

  defineOperation({moduleId:'documents',id:'authorize-upload',permission:'files.upload',contract:'file-object',handlerPath:'backend/modules/documents/src/application/commands/authorize-upload/authorize-upload.handler.mjs',testPath:'backend/tests/canonical-data-foundation-handlers.test.mjs',status:'canonical',audit:'security'}),
  legacy('documents','approve-file','files.manage','file-object','backend/src/platform/object-lifecycle.mjs','backend/tests/object-lifecycle.test.mjs',{durability:'durable-job',audit:'security'}),
  defineOperation({moduleId:'search',id:'query-search',permission:'search.read',contract:'search-query',handlerPath:'backend/modules/search/src/application/queries/query-search/query-search.handler.mjs',testPath:'backend/tests/canonical-data-foundation-handlers.test.mjs',status:'canonical'}),
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
