const feature=({id,owner,locked=false,dependsOn=[],permissions=[],dataClassification='internal',supportedStates=['enabled','read_only','draining','disabled','degraded'],offBehaviour})=>Object.freeze({
  id,owner,locked,dependsOn,permissions,dataClassification,supportedStates,
  offBehaviour:offBehaviour||(
    locked
      ?{newWork:'fail_closed',existingReads:'policy_controlled',committedWork:'preserve'}
      :{newWork:'reject',existingReads:'policy_controlled',committedWork:'drain'}
  )
})

export const platformFeatureCatalog=Object.freeze([
  feature({id:'identity',owner:'platform-security',locked:true,dependsOn:['persistence','audit'],permissions:['identity.session.read','identity.session.manage'],dataClassification:'restricted'}),
  feature({id:'workspaces',owner:'platform-core',locked:true,dependsOn:['identity','persistence','audit'],permissions:['workspace.read','workspace.manage'],dataClassification:'confidential'}),
  feature({id:'memberships',owner:'platform-security',locked:true,dependsOn:['identity','workspaces','audit'],permissions:['membership.read','membership.manage'],dataClassification:'confidential'}),
  feature({id:'access',owner:'platform-security',locked:true,dependsOn:['identity','memberships','audit'],permissions:['access.evaluate','access.manage'],dataClassification:'restricted'}),
  feature({id:'entitlements',owner:'platform-billing',dependsOn:['workspaces','persistence'],permissions:['entitlement.read','entitlement.manage'],dataClassification:'confidential'}),
  feature({id:'integrations',owner:'platform-integrations',dependsOn:['workspaces','secrets','jobs','audit'],permissions:['integration.read','integration.manage'],dataClassification:'restricted',offBehaviour:{newWork:'reject_external_side_effects',existingReads:'policy_controlled',committedWork:'reconcile'}}),
  feature({id:'webhooks',owner:'platform-integrations',dependsOn:['workspaces','jobs','audit'],permissions:['webhook.read','webhook.manage'],dataClassification:'restricted',offBehaviour:{newWork:'reject_or_queue_by_contract',existingReads:'policy_controlled',committedWork:'drain'}}),
  feature({id:'jobs',owner:'platform-runtime',locked:true,dependsOn:['persistence','audit'],permissions:['job.read','job.manage'],dataClassification:'confidential'}),
  feature({id:'observability',owner:'platform-operations',locked:true,dependsOn:['workspaces'],permissions:['observability.read'],dataClassification:'confidential'}),
  feature({id:'privacy',owner:'platform-security',locked:true,dependsOn:['workspaces','audit'],permissions:['privacy.read','privacy.manage'],dataClassification:'restricted'}),
  feature({id:'billing',owner:'platform-billing',dependsOn:['workspaces','entitlements','audit'],permissions:['billing.read','billing.manage'],dataClassification:'restricted',offBehaviour:{newWork:'reject_optional_customer_actions',existingReads:'policy_controlled',committedWork:'continue_required_reconciliation'}}),
  feature({id:'forms',owner:'platform-forms',dependsOn:['workspaces','persistence','audit'],permissions:['forms.read','forms.manage','forms.submit'],dataClassification:'confidential'}),
  feature({id:'rules',owner:'platform-policy',dependsOn:['workspaces','persistence','audit'],permissions:['rules.read','rules.manage','rules.evaluate'],dataClassification:'confidential'}),
  feature({id:'workflows',owner:'platform-workflows',dependsOn:['workspaces','jobs','audit'],permissions:['workflows.read','workflows.manage','workflows.execute'],dataClassification:'confidential',offBehaviour:{newWork:'reject',existingReads:'policy_controlled',committedWork:'pause_or_drain_by_definition'}}),
  feature({id:'files',owner:'platform-files',dependsOn:['workspaces','persistence','audit'],permissions:['files.read','files.upload','files.manage'],dataClassification:'restricted',offBehaviour:{newWork:'stop_new_uploads',existingReads:'policy_controlled',committedWork:'finish_scan_and_reconciliation'}}),
  feature({id:'ai',owner:'platform-ai',dependsOn:['jobs','audit'],permissions:['ai.read','ai.execute','ai.manage'],dataClassification:'restricted',offBehaviour:{newWork:'suspend_admission',existingReads:'policy_controlled',committedWork:'drain_or_cancel_by_policy'}})
])

const byId=new Map(platformFeatureCatalog.map(item=>[item.id,item]))

export const featureCatalogItem=id=>byId.get(String(id))||null

export const validateFeatureCatalog=()=>{
  const ids=new Set()
  for(const item of platformFeatureCatalog){
    if(ids.has(item.id))throw new Error('duplicate feature catalog id: '+item.id)
    ids.add(item.id)
    if(!item.owner)throw new Error('feature catalog owner missing: '+item.id)
    if(!Array.isArray(item.permissions))throw new Error('feature catalog permissions missing: '+item.id)
    if(!item.dataClassification)throw new Error('feature data classification missing: '+item.id)
    if(!item.offBehaviour||!item.offBehaviour.newWork)throw new Error('feature off behaviour missing: '+item.id)
    if(!Array.isArray(item.supportedStates)||!item.supportedStates.includes('enabled'))throw new Error('feature supported states missing: '+item.id)
  }
  for(const item of platformFeatureCatalog){
    for(const dependency of item.dependsOn||[]){
      if(['persistence','audit','secrets'].includes(dependency))continue
      if(!ids.has(dependency))throw new Error('unknown dependency '+dependency+' for '+item.id)
    }
  }
  return true
}
