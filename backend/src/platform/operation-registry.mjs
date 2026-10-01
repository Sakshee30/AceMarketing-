import {platformModule,platformModuleRegistry} from './module-registry.mjs'

const freezeList=value=>Object.freeze([...(value||[])])

const defineOperation=({
  id,moduleId,permission,contract,handlerPath,testPath,
  owner=null,status='legacy-mapped',durability='transactional',
  audit='required',profiles=null,notes='',requestSchemaId=null
})=>{
  const module=platformModule(moduleId)
  if(!module)throw new Error('operation references unknown module: '+moduleId+':'+id)
  const normalizedId=String(id)
  const normalizedModuleId=String(moduleId)
  const normalizedContract=String(contract)
  return Object.freeze({
    id:normalizedId,
    operationId:normalizedModuleId+'.'+normalizedId,
    requestSchemaId:String(requestSchemaId||normalizedContract+'.request'),
    moduleId:normalizedModuleId,
    owner:owner||module.owner,
    permission:String(permission),
    contract:normalizedContract,
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
  defineOperation({moduleId:'identity',id:'start-login',permission:'identity.session.manage',contract:'session',handlerPath:'backend/modules/identity/src/application/commands/start-login/start-login.handler.mjs',testPath:'backend/tests/canonical-security-document-handlers.test.mjs',status:'canonical',audit:'security'}),
  defineOperation({moduleId:'identity',id:'recover-account',permission:'identity.session.manage',contract:'account-recovery',handlerPath:'backend/modules/identity/src/application/commands/recover-account/recover-account.handler.mjs',testPath:'backend/tests/canonical-security-document-handlers.test.mjs',status:'canonical',audit:'security'}),

  defineOperation({moduleId:'organizations',id:'update-organization',permission:'organization.manage',contract:'organization',handlerPath:'backend/modules/organizations/src/application/commands/update-organization/update-organization.handler.mjs',testPath:'backend/tests/canonical-governance-ai-handlers.test.mjs',status:'canonical'}),
  defineOperation({moduleId:'workspaces',id:'update-workspace',permission:'workspace.write',contract:'workspace',handlerPath:'backend/modules/workspaces/src/application/commands/update-workspace/update-workspace.handler.mjs',testPath:'backend/tests/canonical-lifecycle-handlers.test.mjs',status:'canonical',audit:'required'}),
  defineOperation({moduleId:'memberships',id:'remove-member',permission:'members.write',contract:'membership',handlerPath:'backend/modules/memberships/src/application/commands/remove-member/remove-member.handler.mjs',testPath:'backend/tests/canonical-lifecycle-handlers.test.mjs',status:'canonical',audit:'security'}),
  defineOperation({moduleId:'authorization',id:'evaluate-access',permission:'access.evaluate',contract:'permission-evaluation',handlerPath:'backend/modules/authorization/src/application/queries/evaluate-access/evaluate-access.handler.mjs',testPath:'backend/tests/canonical-operation-handlers.test.mjs',status:'canonical',audit:'security'}),
  defineOperation({moduleId:'authorization',id:'publish-policy',permission:'access.manage',contract:'access-policy',handlerPath:'backend/modules/authorization/src/application/commands/publish-policy/publish-policy.handler.mjs',testPath:'backend/tests/canonical-governance-ai-handlers.test.mjs',status:'canonical',audit:'security'}),

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

  defineOperation({moduleId:'jobs',id:'submit-job',permission:'job.manage',contract:'job',handlerPath:'backend/modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs',testPath:'backend/tests/canonical-runtime-handlers.test.mjs',status:'canonical',durability:'durable-job'}),
  defineOperation({moduleId:'jobs',id:'replay-dead-letter',permission:'job.manage',contract:'job',handlerPath:'backend/modules/jobs/src/application/commands/replay-dead-letter/replay-dead-letter.handler.mjs',testPath:'backend/tests/canonical-audit-replay-handlers.test.mjs',status:'canonical',durability:'durable-job',audit:'security'}),
  defineOperation({moduleId:'scheduling',id:'evaluate-due-schedule',permission:'schedule.manage',contract:'scheduled-job',handlerPath:'backend/modules/scheduling/src/application/commands/evaluate-due-schedule/evaluate-due-schedule.handler.mjs',testPath:'backend/tests/canonical-runtime-handlers.test.mjs',status:'canonical',durability:'durable-job'}),
  defineOperation({moduleId:'notifications',id:'send-notification',permission:'notifications.manage',contract:'notification-delivery',handlerPath:'backend/modules/notifications/src/application/commands/send-notification/send-notification.handler.mjs',testPath:'backend/tests/canonical-runtime-handlers.test.mjs',status:'canonical',durability:'durable-job'}),
  defineOperation({moduleId:'reporting',id:'run-report',permission:'reports.manage',contract:'report-schedule',handlerPath:'backend/modules/reporting/src/application/commands/run-report/run-report.handler.mjs',testPath:'backend/tests/canonical-runtime-handlers.test.mjs',status:'canonical',durability:'durable-job'}),

  defineOperation({moduleId:'usage',id:'record-usage',permission:'usage.manage',contract:'usage-event',handlerPath:'backend/modules/usage/src/application/commands/record-usage/record-usage.handler.mjs',testPath:'backend/tests/canonical-billing-usage-handlers.test.mjs',status:'canonical'}),
  defineOperation({moduleId:'usage',id:'reserve-quota',permission:'usage.manage',contract:'usage-reservation',handlerPath:'backend/modules/usage/src/application/commands/reserve-quota/reserve-quota.handler.mjs',testPath:'backend/tests/canonical-billing-usage-handlers.test.mjs',status:'canonical'}),
  defineOperation({moduleId:'billing',id:'change-subscription',permission:'billing.manage',contract:'subscription',handlerPath:'backend/modules/billing/src/application/commands/change-subscription/change-subscription.handler.mjs',testPath:'backend/tests/canonical-billing-usage-handlers.test.mjs',status:'canonical',audit:'financial'}),
  defineOperation({moduleId:'billing',id:'reconcile-payment',permission:'billing.manage',contract:'subscription',handlerPath:'backend/modules/billing/src/application/commands/reconcile-payment/reconcile-payment.handler.mjs',testPath:'backend/tests/canonical-billing-usage-handlers.test.mjs',status:'canonical',audit:'financial'}),

  defineOperation({moduleId:'documents',id:'authorize-upload',permission:'files.upload',contract:'file-object',handlerPath:'backend/modules/documents/src/application/commands/authorize-upload/authorize-upload.handler.mjs',testPath:'backend/tests/canonical-data-foundation-handlers.test.mjs',status:'canonical',audit:'security'}),
  defineOperation({moduleId:'documents',id:'approve-file',permission:'files.manage',contract:'file-object',handlerPath:'backend/modules/documents/src/application/commands/approve-file/approve-file.handler.mjs',testPath:'backend/tests/canonical-security-document-handlers.test.mjs',status:'canonical',durability:'durable-job',audit:'security'}),
  defineOperation({moduleId:'search',id:'query-search',permission:'search.read',contract:'search-query',handlerPath:'backend/modules/search/src/application/queries/query-search/query-search.handler.mjs',testPath:'backend/tests/canonical-data-foundation-handlers.test.mjs',status:'canonical'}),
  defineOperation({moduleId:'search',id:'rebuild-index',permission:'search.manage',contract:'search-projection',handlerPath:'backend/modules/search/src/application/commands/rebuild-index/rebuild-index.handler.mjs',testPath:'backend/tests/canonical-security-document-handlers.test.mjs',status:'canonical',durability:'durable-job'}),

  defineOperation({moduleId:'audit',id:'search-audit',permission:'audit.read',contract:'audit-event',handlerPath:'backend/modules/audit/src/application/queries/search-audit/search-audit.handler.mjs',testPath:'backend/tests/canonical-audit-replay-handlers.test.mjs',status:'canonical',audit:'locked'}),
  defineOperation({moduleId:'audit',id:'export-audit',permission:'audit.export',contract:'audit-event',handlerPath:'backend/modules/audit/src/application/commands/export-audit/export-audit.handler.mjs',testPath:'backend/tests/canonical-audit-replay-handlers.test.mjs',status:'canonical',durability:'durable-job',audit:'locked'}),

  defineOperation({moduleId:'capabilities',id:'activate-config',permission:'platform.capabilities.change',contract:'runtime-configuration',handlerPath:'backend/modules/capabilities/src/application/commands/activate-config/activate-config.handler.mjs',testPath:'backend/tests/canonical-control-plane-handlers.test.mjs',status:'canonical',audit:'security'}),
  defineOperation({moduleId:'capabilities',id:'migrate-provider',permission:'platform.capabilities.change',contract:'provider-migration',handlerPath:'backend/modules/capabilities/src/application/commands/migrate-provider/migrate-provider.handler.mjs',testPath:'backend/tests/canonical-control-plane-handlers.test.mjs',status:'canonical',durability:'durable-job',audit:'security'}),
  defineOperation({moduleId:'cells',id:'move-tenant',permission:'platform.placement.change',contract:'tenant-placement',handlerPath:'backend/modules/cells/src/application/commands/move-tenant/move-tenant.handler.mjs',testPath:'backend/tests/canonical-control-plane-handlers.test.mjs',status:'canonical',audit:'security',profiles:['high-scale']}),
  defineOperation({moduleId:'ai',id:'request-inference',permission:'ai.execute',contract:'ai-request',handlerPath:'backend/modules/ai/src/application/commands/request-inference/request-inference.handler.mjs',testPath:'backend/tests/canonical-governance-ai-handlers.test.mjs',status:'canonical',profiles:['ai-enabled'],audit:'data-policy'}),
  defineOperation({moduleId:'ai',id:'activate-model-result',permission:'ai.manage',contract:'ai-activation',handlerPath:'backend/modules/ai/src/application/commands/activate-model-result/activate-model-result.handler.mjs',testPath:'backend/tests/canonical-governance-ai-handlers.test.mjs',status:'canonical',profiles:['ai-enabled'],durability:'durable-job',audit:'security'})
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
    operationId:item.operationId,
    requestSchemaId:item.requestSchemaId,
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
    if(!item.operationId||!item.requestSchemaId)throw new Error('operation traceability metadata missing: '+key)
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
