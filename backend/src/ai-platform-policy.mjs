import {modelRegistryItem,modelRegistrySnapshot} from './ai-registry.mjs'

const parseJson=()=>{
  const raw=String(process.env.AI_PLATFORM_POLICY_JSON||'').trim()
  if(!raw)return {}
  try{
    const value=JSON.parse(raw)
    return value&&typeof value==='object'&&!Array.isArray(value)?value:{}
  }catch{
    throw new Error('AI_PLATFORM_POLICY_JSON must be valid JSON object')
  }
}

const asLimit=(value,fallback,min,max)=>{
  const n=Number(value)
  return Number.isFinite(n)&&n>=min&&n<=max?n:fallback
}

export const aiPlatformPolicySnapshot=()=>{
  const configured=parseJson()
  const defaults=configured.defaults&&typeof configured.defaults==='object'?configured.defaults:{}
  const tasks=configured.tasks&&typeof configured.tasks==='object'?configured.tasks:{}
  return {
    version:String(configured.version||'platform-ai.v1'),
    source:process.env.AI_PLATFORM_POLICY_JSON?'environment':'safe-defaults',
    defaults:{
      enabled:defaults.enabled!==false,
      maxConcurrentJobs:Math.floor(asLimit(defaults.maxConcurrentJobs,20,1,1000)),
      monthlyUnitBudget:defaults.monthlyUnitBudget==null?null:asLimit(defaults.monthlyUnitBudget,null,0,Number.MAX_SAFE_INTEGER)
    },
    tasks:Object.fromEntries(modelRegistrySnapshot().map(route=>{
      const item=tasks[route.task]&&typeof tasks[route.task]==='object'?tasks[route.task]:{}
      return [route.task,{
        enabled:item.enabled!==false,
        allowedRequestedModel:String(item.allowedRequestedModel||route.requestedModel),
        maxConcurrentJobs:Math.floor(asLimit(item.maxConcurrentJobs,defaults.maxConcurrentJobs??20,1,1000)),
        monthlyUnitBudget:item.monthlyUnitBudget==null
          ?(defaults.monthlyUnitBudget==null?null:Number(defaults.monthlyUnitBudget))
          :asLimit(item.monthlyUnitBudget,null,0,Number.MAX_SAFE_INTEGER)
      }]
    }))
  }
}

export const platformTaskPolicy=task=>{
  const route=modelRegistryItem(task)
  if(!route)return null
  const snapshot=aiPlatformPolicySnapshot()
  return {version:snapshot.version,...snapshot.tasks[task]}
}

export const enforceTenantPolicyWithinPlatform=({task,enabled,approvedRequestedModel,maxConcurrentJobs,monthlyUnitBudget})=>{
  const platform=platformTaskPolicy(task)
  if(!platform)throw new Error('unknown AI task')
  if(enabled&&platform.enabled===false)throw new Error('task is disabled by platform policy')
  const requested=approvedRequestedModel||modelRegistryItem(task)?.requestedModel||null
  if(requested&&requested!==platform.allowedRequestedModel)throw new Error('requested model is not allowed by platform policy')
  if(Number(maxConcurrentJobs)>Number(platform.maxConcurrentJobs))throw new Error('tenant concurrency exceeds platform limit')
  if(platform.monthlyUnitBudget!=null&&monthlyUnitBudget!=null&&Number(monthlyUnitBudget)>Number(platform.monthlyUnitBudget)){
    throw new Error('tenant monthly unit budget exceeds platform limit')
  }
  return platform
}
