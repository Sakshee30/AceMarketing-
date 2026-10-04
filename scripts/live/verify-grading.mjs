import assert from 'node:assert/strict'
import {loadEnvFile} from '../load-env.mjs'

const env=await loadEnvFile('.env.live.local')
const base='http://127.0.0.1:3001/api'
const headers={'content-type':'application/json','x-workspace-id':env.DEFAULT_WORKSPACE_ID||'ws_default'}
async function request(path,body){
  const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)})
  const result=await response.json()
  assert.ok(response.ok,`${path}: ${response.status} ${result.error||''}`)
  return result
}
const login=await request('/auth/login',{email:env.ADMIN_EMAIL||'owner@example.com',password:env.ACE_LOCAL_PASSWORD||env.ADMIN_PASSWORD||'demo123'})
headers.authorization=`Bearer ${login.token}`
const externalLeadId='live_grading_verification_'+Date.now()
const apply=patch=>request('/enrich/upsert',{externalLeadId,...patch})
let identity
for(const [patch,score,grade] of [
  [{name:'Live grading verification (test)',source:'google',campaign:'local_verification',journeyDepth:1},20,'D'],
  [{journeyDepth:6,pricingPageViews:2},50,'C'],
  [{whatsappEngaged:true,crmStage:'qualified'},74,'B'],
  [{callOutcome:'qualified'},88,'A'],
  [{name:'Live grading verification (test)'},88,'A'],
  [{fraudScore:90},58,'C'],
  [{callSummary:'Qualification confirmed; existing risk still applies.'},58,'C'],
  [{fraudScore:0},88,'A']
]){
  const item=await apply(patch)
  identity??=item.id
  assert.equal(item.id,identity,'A patch must update the same persisted lead')
  assert.equal(item.score,score)
  assert.equal(item.grade,grade)
}
await apply({whatsappEngaged:false,callOutcome:null})
await Promise.all([apply({whatsappEngaged:true}),apply({callOutcome:'qualified'})])
await request('/consent',{subjectType:'customer',subjectId:externalLeadId,analytics:true,marketing:true,personalization:true,source:'local_verification'})
await request('/track',{event:'page_view',eventId:externalLeadId+'_page',customerId:externalLeadId,source:'google',occurredAt:new Date().toISOString(),consentCategory:'analytics'})
const enriched=await request('/enrich')
const lead=enriched.items.find(item=>item.leadId===externalLeadId)
assert.ok(lead,'Persisted lead is readable through the UI API')
assert.equal(lead.score,88,'Concurrent channel patches and sparse tracking events must preserve scoring evidence')
assert.equal(lead.grade,'A')
assert.equal(lead.journey.pricingPageViews,2)
const {total,aGrade,abQuality,cGrade,dGrade}=enriched.stats
assert.equal(aGrade+(abQuality-aGrade)+cGrade+dGrade,total,'Distribution accounts for every active profile')
console.log(JSON.stringify({passed:true,leadId:externalLeadId,transitions:'D → C → B → A; risk A → C → A',score:lead.score,concurrentPatchesPreserved:true,distributionTotal:total},null,2))
