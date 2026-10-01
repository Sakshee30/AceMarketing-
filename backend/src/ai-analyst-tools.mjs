import {attributionStats} from './attribution-store.mjs'
import {listAiResults} from './ai-runtime.mjs'
import {listAnomalyItems,listForecastRecords} from './ai-domain-results.mjs'
import {leadOpsStats,listLeadProfiles} from './lead-ops.mjs'
import {searchKnowledge} from './knowledge.mjs'
import {getState,withWorkspace} from './store.mjs'\nimport {listConnectorCampaignFacts} from './connector-ingestion.mjs'

const TOOL_NAMES=new Set([
  'campaign_performance',
  'funnel_comparison',
  'customer_aggregates',
  'attribution_summary',
  'forecasts',
  'prediction_explanations',
  'anomalies',
  'experiment_results',
  'knowledge_retrieval'
])

const boundedLimit=value=>Math.max(1,Math.min(Number(value||20),100))
const objectArg=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{}

export const analystToolNames=()=>[...TOOL_NAMES]

export const validateAnalystToolRequest=(name,args={})=>{
  const tool=String(name||'').trim()
  if(!TOOL_NAMES.has(tool))throw new Error('unsupported analyst tool')
  const input=objectArg(args)
  if(tool==='knowledge_retrieval'){
    const query=String(input.query||'').trim()
    if(!query)throw new Error('knowledge_retrieval requires query')
    if(query.length>1000)throw new Error('knowledge_retrieval query exceeds 1000 characters')
    return {tool,args:{query,limit:boundedLimit(input.limit)}}
  }
  if(tool==='prediction_explanations'){
    const task=String(input.task||'').trim()
    if(task&&!['lead_qualification','paid_conversion','customer_churn','future_customer_value'].includes(task)){
      throw new Error('unsupported prediction task')
    }
    return {tool,args:{task:task||null,limit:boundedLimit(input.limit)}}
  }
  return {tool,args:{limit:boundedLimit(input.limit)}}
}

const workspaceState=workspaceId=>withWorkspace(workspaceId,()=>getState())

const campaignPerformance=async(workspaceId,args)=>{
  const state=await workspaceState(workspaceId)
  const workspaceCampaigns=Array.isArray(state.campaigns)?state.campaigns:Array.isArray(state.campaignFacts)?state.campaignFacts:[]
  const connectorFacts=await listConnectorCampaignFacts({workspaceId,limit:args.limit,days:90}).catch(()=>[])
  const campaigns=connectorFacts.length?connectorFacts:workspaceCampaigns
  const deliveries=Array.isArray(state.signalDeliveries)?state.signalDeliveries:[]
  return {
    kind:'observed',
    evidenceId:'campaign_performance:'+workspaceId,
    campaigns:campaigns.slice(0,args.limit).map(item=>({
      id:item.id||item.campaignId||null,
      name:item.name||item.campaignName||null,
      status:item.status||null,
      spend:item.spend??null,
      impressions:item.impressions??null,
      clicks:item.clicks??null,
      leads:item.leads??null,
      customers:item.customers??null,
      revenue:item.revenue??null,
      currency:item.currency||null,\n      connector:item.connector||null,\n      conversions:item.conversions??null,\n      sessions:item.sessions??null,\n      users:item.users??null
    })),
    deliverySummary:{
      total:deliveries.length,
      succeeded:deliveries.filter(x=>['sent','succeeded','delivered'].includes(String(x.status||'').toLowerCase())).length,
      failed:deliveries.filter(x=>['failed','dead_letter'].includes(String(x.status||'').toLowerCase())).length
    },
    limitation:campaigns.length?'Campaign records are returned as persisted workspace facts.':'No persisted campaign-fact collection is available for this workspace.'
  }
}

const funnelComparison=async(workspaceId,args)=>{
  const profiles=await listLeadProfiles(workspaceId,Math.min(args.limit,100))
  const stages={}
  for(const profile of profiles){
    const stage=String(profile.crm_stage||'unknown')
    stages[stage]=(stages[stage]||0)+1
  }
  return {
    kind:'observed',
    evidenceId:'funnel:'+workspaceId,
    sampledProfiles:profiles.length,
    stages,
    limitation:profiles.length===args.limit?'Stage counts are based on the bounded returned profile window, not claimed as a full-population funnel.':null
  }
}

const customerAggregates=async(workspaceId,args)=>{
  const [stats,profiles]=await Promise.all([
    leadOpsStats(workspaceId),
    listLeadProfiles(workspaceId,Math.min(args.limit,100))
  ])
  return {
    kind:'observed',
    evidenceId:'customer_aggregates:'+workspaceId,
    stats,
    recentProfileSummary:{
      sampled:profiles.length,
      byGrade:profiles.reduce((acc,profile)=>{const key=String(profile.grade||'unknown');acc[key]=(acc[key]||0)+1;return acc},{}),
      byStage:profiles.reduce((acc,profile)=>{const key=String(profile.crm_stage||'unknown');acc[key]=(acc[key]||0)+1;return acc},{}),
      averageScore:profiles.length?profiles.reduce((sum,profile)=>sum+Number(profile.score||0),0)/profiles.length:null
    }
  }
}

const attributionSummary=async workspaceId=>({
  kind:'descriptive',
  evidenceId:'attribution:'+workspaceId,
  ...(await attributionStats(workspaceId)),
  limitation:'Attribution is descriptive allocation and is not represented as causal incrementality.'
})

const forecasts=async(workspaceId,args)=>({
  kind:'prediction',
  evidenceId:'forecast_results:'+workspaceId,
  items:await listForecastRecords({workspaceId,limit:args.limit})
})

const predictionExplanations=async(workspaceId,args)=>{
  const allowed=args.task?[args.task]:['lead_qualification','paid_conversion','customer_churn','future_customer_value']
  const batches=await Promise.all(allowed.map(task=>listAiResults({workspaceId,task,limit:args.limit})))
  return {
    kind:'prediction',
    evidenceId:'prediction_results:'+workspaceId,
    items:batches.flat().slice(0,args.limit),
    limitation:'Model contributions or scores are associative predictions unless a separate causal result explicitly states otherwise.'
  }
}

const anomalies=async(workspaceId,args)=>({
  kind:'investigation_signal',
  evidenceId:'anomalies:'+workspaceId,
  items:await listAnomalyItems({workspaceId,limit:args.limit}),
  limitation:'Anomaly scores are investigation signals, not fraud probabilities.'
})

export const projectExperimentEvidence=item=>({
  id:item?.id||item?.experimentId||null,
  name:item?.name||item?.title||null,
  status:item?.status||null,
  hypothesis:item?.hypothesis||null,
  primaryMetric:item?.primaryMetric||item?.metric||null,
  control:item?.control||item?.controlVariant||null,
  treatment:item?.treatment||item?.treatmentVariant||null,
  sampleSize:item?.sampleSize??item?.population??null,
  effect:item?.effect??item?.lift??null,
  interval:item?.interval??item?.confidenceInterval??null,
  pValue:item?.pValue??null,
  startedAt:item?.startedAt||item?.startAt||null,
  endedAt:item?.endedAt||item?.endAt||null
})

const experimentResults=async(workspaceId,args)=>{
  const state=await workspaceState(workspaceId)
  const items=Array.isArray(state.experimentResults)?state.experimentResults:Array.isArray(state.experiments)?state.experiments:[]
  return {
    kind:'experiment',
    evidenceId:'experiments:'+workspaceId,
    items:items.slice(0,args.limit).map(projectExperimentEvidence),
    limitation:items.length?'Only approved aggregate experiment fields are exposed; assignment quality must be evaluated separately.':'No persisted experiment-result records are available.'
  }
}

const knowledgeRetrieval=async(workspaceId,args,principal)=>{
  const role=String(principal?.role||'viewer')
  const items=await searchKnowledge({workspaceId,query:args.query,role,limit:args.limit})
  return {
    kind:'retrieved_evidence',
    evidenceId:'knowledge_query:'+workspaceId,
    query:args.query,
    items:items.map(item=>({
      chunkId:item.id,
      sourceId:item.source_id,
      sourceName:item.source_name,
      sourceLocation:item.source_location,
      section:item.section,
      sourceOffset:item.source_offset,
      content:item.content
    }))
  }
}

export const executeAnalystTool=async({workspaceId,name,args={},principal=null})=>{
  if(!workspaceId)throw new Error('workspace scope required')
  const request=validateAnalystToolRequest(name,args)
  let result
  if(request.tool==='campaign_performance')result=await campaignPerformance(workspaceId,request.args)
  else if(request.tool==='funnel_comparison')result=await funnelComparison(workspaceId,request.args)
  else if(request.tool==='customer_aggregates')result=await customerAggregates(workspaceId,request.args)
  else if(request.tool==='attribution_summary')result=await attributionSummary(workspaceId)
  else if(request.tool==='forecasts')result=await forecasts(workspaceId,request.args)
  else if(request.tool==='prediction_explanations')result=await predictionExplanations(workspaceId,request.args)
  else if(request.tool==='anomalies')result=await anomalies(workspaceId,request.args)
  else if(request.tool==='experiment_results')result=await experimentResults(workspaceId,request.args)
  else result=await knowledgeRetrieval(workspaceId,request.args,principal)
  return {
    schemaVersion:'analyst-tool-result.v1',
    tool:request.tool,
    capturedAt:new Date().toISOString(),
    workspaceId,
    result
  }
}

export const executeAnalystToolSet=async({workspaceId,requests,principal=null})=>{
  const list=Array.isArray(requests)?requests.slice(0,9):[]
  const output=[]
  for(const request of list){
    output.push(await executeAnalystTool({
      workspaceId,
      name:request?.name,
      args:request?.args,
      principal
    }))
  }
  return output
}
