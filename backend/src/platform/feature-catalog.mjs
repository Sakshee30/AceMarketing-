export const platformFeatureCatalog=Object.freeze([
  {id:'identity',owner:'platform-security',locked:true,dependsOn:['persistence','audit']},
  {id:'workspaces',owner:'platform-core',locked:true,dependsOn:['identity','persistence','audit']},
  {id:'memberships',owner:'platform-security',locked:true,dependsOn:['identity','workspaces','audit']},
  {id:'access',owner:'platform-security',locked:true,dependsOn:['identity','memberships','audit']},
  {id:'entitlements',owner:'platform-billing',locked:false,dependsOn:['workspaces','persistence']},
  {id:'integrations',owner:'platform-integrations',locked:false,dependsOn:['workspaces','secrets','jobs','audit']},
  {id:'webhooks',owner:'platform-integrations',locked:false,dependsOn:['workspaces','jobs','audit']},
  {id:'jobs',owner:'platform-runtime',locked:true,dependsOn:['persistence','audit']},
  {id:'observability',owner:'platform-operations',locked:true,dependsOn:['workspaces']},
  {id:'privacy',owner:'platform-security',locked:true,dependsOn:['workspaces','audit']},
  {id:'billing',owner:'platform-billing',locked:false,dependsOn:['workspaces','entitlements','audit']},
  {id:'ai',owner:'platform-ai',locked:false,dependsOn:['jobs','audit']}
])

const byId=new Map(platformFeatureCatalog.map(item=>[item.id,item]))

export const featureCatalogItem=id=>byId.get(String(id))||null

export const validateFeatureCatalog=()=>{
  const ids=new Set()
  for(const item of platformFeatureCatalog){
    if(ids.has(item.id))throw new Error('duplicate feature catalog id: '+item.id)
    ids.add(item.id)
    if(!item.owner)throw new Error('feature catalog owner missing: '+item.id)
  }
  for(const item of platformFeatureCatalog){
    for(const dependency of item.dependsOn||[]){
      if(['persistence','audit','secrets'].includes(dependency))continue
      if(!ids.has(dependency))throw new Error('unknown dependency '+dependency+' for '+item.id)
    }
  }
  return true
}
