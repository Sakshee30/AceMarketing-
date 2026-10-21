import { randomUUID } from 'node:crypto'
import { getState, mutateState } from '../../store.mjs'
import { leadOpsStats, listLeadProfiles } from '../../lead-ops.mjs'
import { modelCatalogItems } from '../../ai-registry.mjs'

export async function handleModelRoutes({req,res,url,workspaceId,readBody,send:writeResponse}) {
  const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'GET' && url.pathname === '/api/models') {
      const state=await getState()
      const stats=await leadOpsStats(workspaceId).catch(()=>({available:false,total:0,averageScore:0}))
      const runs=(state.agentRuns||[]).filter(x=>x.kind==='model').slice(0,20)
      const builtIn=[
        {id:'builtin_lead_quality',name:'Lead quality scoring',version:'v2.0',status:Number(stats?.total||0)>0?'active':'ready',type:'Scoring',metric:'Average lead score',value:Number(stats?.averageScore||0),description:'Explainable scoring over persisted CRM, journey and interaction evidence.',builtIn:true},
        {id:'builtin_journey_features',name:'Journey propensity features',version:'workspace',status:Number(stats?.total||0)>0?'active':'ready',type:'Feature set',metric:'Profiles available',value:Number(stats?.total||0),description:'Uses persisted journey depth, pricing views, messaging, calls, meetings and CRM stage as model features.',builtIn:true}
      ]
      const custom=(state.customModels||[]).map(x=>({...x,builtIn:false,status:x.status||'ready',type:'Weighted scoring',metric:'Average custom score',value:x.lastAverageScore??'—'}))
      const registry=modelCatalogItems()
      return send(req,res,200,{items:[...builtIn,...custom,...registry],runs})
    }
    if (req.method === 'POST' && url.pathname === '/api/models') {
      const body=await readBody(req)
      const name=String(body.name||'').trim()
      if(!name)return send(req,res,400,{error:'name required'})
      const rawWeights=body.weights&&typeof body.weights==='object'?body.weights:{}
      const allowed=['lead_score','journey_depth','pricing_views','whatsapp_engaged','meeting_present']
      const weights={}
      for(const key of allowed){
        const value=Number(rawWeights[key]??0)
        if(Number.isFinite(value))weights[key]=Math.max(-100,Math.min(100,value))
      }
      const totalWeight=Object.values(weights).reduce((n,x)=>n+Math.abs(Number(x||0)),0)
      if(totalWeight<=0)return send(req,res,400,{error:'at least one non-zero feature weight required'})
      const now=new Date().toISOString()
      const item={id:'model_'+randomUUID(),name:name.slice(0,160),version:'workspace-1',description:String(body.description||'Workspace-defined explainable weighted scoring model.').slice(0,500),weights,status:'ready',createdAt:now,updatedAt:now}
      await mutateState(s=>{
        s.customModels=s.customModels||[]
        s.customModels.unshift(item)
        s.customModels=s.customModels.slice(0,100)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'model.created',entityId:item.id,name:item.name,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/models/run') {
      const body=await readBody(req)
      if(!body.name) return send(req,res,400,{error:'name required'})
      const registryModel=modelCatalogItems().find(x=>x.name===String(body.name)||x.id===String(body.id||''))
      if(registryModel){
        return send(req,res,409,{
          error:registryModel.blockedReason||'This registry model must use its task-specific endpoint.',
          readiness:registryModel.governance?.readiness||registryModel.status,
          task:registryModel.governance?.task||null
        })
      }
      const [profiles,state,stats]=await Promise.all([listLeadProfiles(workspaceId,500),getState(),leadOpsStats(workspaceId).catch(()=>({averageScore:0}))])
      const custom=(state.customModels||[]).find(x=>x.name===String(body.name)||x.id===String(body.id||''))
      const scoreProfile=lead=>{
        if(!custom)return Number(lead.score||0)
        const f={
          lead_score:Math.max(0,Math.min(1,Number(lead.score||0)/100)),
          journey_depth:Math.max(0,Math.min(1,Number(lead.journey?.journeyDepth||0)/10)),
          pricing_views:Math.max(0,Math.min(1,Number(lead.journey?.pricingPageViews||0)/5)),
          whatsapp_engaged:lead.journey?.whatsappEngaged?1:0,
          meeting_present:lead.journey?.meetingStatus?1:0
        }
        const entries=Object.entries(custom.weights||{})
        const denominator=entries.reduce((n,[,w])=>n+Math.abs(Number(w||0)),0)||1
        const weighted=entries.reduce((n,[key,w])=>n+Number(f[key]||0)*Number(w||0),0)
        return Number(Math.max(0,Math.min(100,weighted/denominator*100)).toFixed(1))
      }
      const scores=profiles.map(scoreProfile)
      const average=scores.length?Number((scores.reduce((n,x)=>n+x,0)/scores.length).toFixed(1)):0
      const startedAt=new Date().toISOString()
      const run={id:'modelrun_'+randomUUID(),kind:'model',name:String(body.name),modelId:custom?.id||null,status:profiles.length?'completed':'no_data',rowsScored:profiles.length,averageScore:custom?average:Number(stats?.averageScore||0),scoreMin:scores.length?Math.min(...scores):0,scoreMax:scores.length?Math.max(...scores):0,startedAt,completedAt:new Date().toISOString()}
      await mutateState(s=>{
        s.agentRuns=s.agentRuns||[]
        s.agentRuns.unshift(run)
        s.agentRuns=s.agentRuns.slice(0,500)
        if(custom){
          const model=(s.customModels||[]).find(x=>x.id===custom.id)
          if(model){model.lastRunAt=run.completedAt;model.lastAverageScore=run.averageScore;model.lastRowsScored=run.rowsScored;model.status=profiles.length?'active':'ready';model.updatedAt=run.completedAt}
        }
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'model.run',entityId:run.id,modelId:custom?.id||null,rowsScored:run.rowsScored,status:run.status,at:run.completedAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,202,run)
    }
    if (req.method === 'GET' && url.pathname === '/api/models/validation') {
      const name=String(url.searchParams.get('name')||'')
      const state=await getState()
      const runs=(state.agentRuns||[]).filter(x=>x.kind==='model'&&(!name||x.name===name)).slice(0,20)
      const leadStats=await leadOpsStats(workspaceId).catch(()=>({}))
      return send(req,res,200,{name:name||null,runs,leadPopulation:Number(leadStats?.total||0),averageLeadScore:Number(leadStats?.averageScore||0),generatedAt:new Date().toISOString(),notice:'Validation surface reflects persisted scoring runs and lead population; it is not a substitute for offline statistical validation.'})
    }

  return false
}

