import {randomUUID} from 'node:crypto'
import {pool} from './database.mjs'
import {executeHostedTask} from './ai-providers.mjs'
import {modelRegistryItem} from './ai-registry.mjs'
import {syncTenantRegistry} from './ai-registry-store.mjs'

// A fixed evidence snapshot with known figures. Each case has an objective pass condition,
// so the evaluation measures grounding behaviour rather than opinion.
const evidence={
  schemaVersion:'grounding-evaluation.v1',
  evidenceIds:['eval_lead_ops','eval_attribution','eval_channels'],
  leadOps:{evidenceId:'eval_lead_ops',totalLeads:1840,aGrade:276,bGrade:412,cGrade:598,dGrade:554,averageScore:58.4},
  attribution:{evidenceId:'eval_attribution',assistedEvents:930,matchedEvents:893,unmatchedEvents:37},
  channels:{evidenceId:'eval_channels',items:[
    {source:'google',leads:720,conversions:118,revenue:2360000},
    {source:'meta',leads:640,conversions:71,revenue:1136000},
    {source:'email',leads:480,conversions:62,revenue:868000}
  ]}
}
const cases=[
  {id:'fact_grade_count',question:'How many A-grade leads are there, and what is the total number of leads?',expects:['276','1840']},
  {id:'fact_unmatched',question:'How many assisted events could not be matched to an acquisition source?',expects:['37']},
  {id:'fact_top_channel',question:'Which source produced the most conversions and how many?',expects:['google','118']},
  {id:'abstain_spend',question:'What was the advertising spend and ROAS for Google last quarter?',abstain:true},
  {id:'abstain_forecast',question:'How many leads will we get next month?',abstain:true}
]
const instructions='Use only the supplied immutable workspace snapshot. Every numerical statement must be traceable to an evidence ID. If the snapshot does not contain what is asked, say so and do not estimate.'
const abstained=text=>/\b(not|no|cannot|can't|unable|insufficient|unavailable|missing|lacks?|without)\b[^.]{0,120}\b(available|provided|included|present|contain|data|evidence|information|snapshot|determine|forecast|estimate|spend|roas)\b/i.test(text)
const digits=text=>String(text).replace(/(\d)[,  ](?=\d{3}\b)/g,'$1')

export const hostedEvaluationSupported=task=>task==='analyst'

export const runHostedGroundingEvaluation=async({workspaceId,task,actor=null})=>{
  if(!pool)throw new Error('DATABASE_URL is required for evaluation')
  if(!hostedEvaluationSupported(task))throw Object.assign(new Error('grounding evaluation is implemented for the analyst task only'),{status:400})
  const route=modelRegistryItem(task)
  const outcomes=await Promise.all(cases.map(async item=>{
    try{
      const execution=await executeHostedTask({task,input:{question:item.question,evidence,instructions}})
      const text=String(execution.text||'')
      const normalized=digits(text).toLowerCase()
      return {
        id:item.id,answered:Boolean(text.trim()),
        cited:evidence.evidenceIds.some(id=>text.includes(id)),
        correct:item.abstain?null:item.expects.every(value=>normalized.includes(String(value).toLowerCase())),
        abstained:item.abstain?abstained(text):null,
        resolvedModel:execution.resolvedModel||null
      }
    }catch(error){
      return {id:item.id,answered:false,cited:false,correct:item.abstain?null:false,abstained:item.abstain?false:null,error:error instanceof Error?error.message:String(error)}
    }
  }))
  const rate=(rows,key)=>rows.length?Number((rows.filter(row=>row[key]===true).length/rows.length).toFixed(3)):null
  const factual=outcomes.filter(row=>row.correct!==null),refusals=outcomes.filter(row=>row.abstained!==null)
  const metrics={
    sampleSize:outcomes.length,testRows:outcomes.length,
    responseRate:rate(outcomes,'answered'),
    evidenceCitationRate:rate(factual,'cited'),
    expectedFactRate:rate(factual,'correct'),
    abstentionRate:rate(refusals,'abstained'),
    cases:outcomes
  }
  const id='eval_'+randomUUID()
  await syncTenantRegistry(workspaceId)
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO ace_ai_evaluations
        (id,workspace_id,task,model_ref,dataset_ref,split_definition,metrics,thresholds,sample_size,qualified,status,warnings,created_by,completed_at)
       VALUES ($1,$2,$3,$4,NULL,$5::jsonb,$6::jsonb,'{}'::jsonb,$7,false,'evidence_recorded',$8::jsonb,$9,now())`,
      [id,workspaceId,task,route?.requestedModel||task,
       JSON.stringify({source:'grounding-evaluation.v1',promotionGate:'not_evaluated_against_predeclared_thresholds'}),
       JSON.stringify(metrics),outcomes.length,
       JSON.stringify(['Fixed grounding cases measure citation, factual recall and abstention only; they do not measure analysis quality on live workspace data.']),
       actor?.userId||null]
    )
    await client.query(
      `UPDATE ace_ai_model_registry SET evaluation_status='evidence_recorded',evaluation_reference=$3,updated_at=now()
       WHERE workspace_id=$1 AND task=$2`,[workspaceId,task,id])
    await client.query('COMMIT')
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
  return {id,task,model:route?.requestedModel||null,metrics}
}
