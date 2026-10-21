import { randomUUID } from 'node:crypto'
import { getState, mutateState } from '../../store.mjs'
import { consentStats, listConsentAudit } from '../../consent.mjs'
import { deleteSubject, exportSubject, listPrivacyRequests, purgeRetention, retentionPolicy } from '../../privacy-ops.mjs'
import { monitoringSnapshot, listMonitoringRules as listLiveMonitoringRules, saveMonitoringRule } from '../../observability.mjs'
import { billingConfigured, billingEventHistory, billingReconciliationHistory, createCheckoutSession, createPortalSession } from '../../billing-provider.mjs'
import { handleEvaluateEntitlement } from '../../../modules/entitlements/src/application/queries/evaluate-entitlement/evaluate-entitlement.handler.mjs'
import { handleChangeSubscription } from '../../../modules/billing/src/application/commands/change-subscription/change-subscription.handler.mjs'

export async function handleComplianceRoutes({req,res,url,workspaceId,readBody,send:writeResponse}) {
  const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'GET' && url.pathname === '/api/compliance-center') {
      const [consent,consentAudit,privacyRequests,state]=await Promise.all([
        consentStats(workspaceId),
        listConsentAudit(workspaceId,100),
        listPrivacyRequests(workspaceId,100),
        getState()
      ])
      const policy=retentionPolicy()
      const total=Number(consent?.total||0)
      const pct=value=>total?Number((Number(value||0)/total*100).toFixed(1)):0
      const recentPrivacy=privacyRequests.slice(0,20)
      const deletionRequests=privacyRequests.filter(x=>x.request_type==='delete').length
      const exportRequests=privacyRequests.filter(x=>x.request_type==='export').length
      const retentionRuns=privacyRequests.filter(x=>x.request_type==='retention_purge').length
      const blockedPersonalization=(state.personalizationDecisions||[]).filter(x=>x.status==='consent_blocked').length
      const skippedActivation=(state.activationRuleRuns||[]).filter(x=>x.status==='skipped'&&String(x.detail||'').toLowerCase().includes('consent')).length
      const marketingGuarded=(state.signalDeliveries||[]).length
      const retentionConfigured=Object.values(policy).some(days=>Number(days)>0)
      const readinessChecks=[
        {key:'consent_store',label:'Consent records',ready:total>0,detail:total+' subjects recorded'},
        {key:'audit_trail',label:'Consent audit trail',ready:consentAudit.length>0,detail:consentAudit.length+' recent audit entries'},
        {key:'privacy_ops',label:'Subject request operations',ready:true,detail:'Export and delete workflows enabled for owners/admins'},
        {key:'retention',label:'Retention policy',ready:retentionConfigured,detail:retentionConfigured?'Retention windows configured':'Set PRIVACY_RETENTION_*_DAYS in production'},
        {key:'activation_guard',label:'Activation consent guard',ready:true,detail:skippedActivation+' activation actions blocked by consent'},
        {key:'personalization_guard',label:'Personalization consent guard',ready:true,detail:blockedPersonalization+' personalization decisions blocked'}
      ]
      const readiness=Math.round(readinessChecks.filter(x=>x.ready).length/readinessChecks.length*100)
      return send(req,res,200,{
        readiness,
        consent:{
          total,
          analytics:Number(consent?.analytics||0),
          marketing:Number(consent?.marketing||0),
          personalization:Number(consent?.personalization||0),
          revoked:Number(consent?.revoked||0),
          analyticsRate:pct(consent?.analytics),
          marketingRate:pct(consent?.marketing),
          personalizationRate:pct(consent?.personalization)
        },
        policy,
        privacy:{
          totalRequests:privacyRequests.length,
          exports:exportRequests,
          deletions:deletionRequests,
          retentionRuns,
          recent:recentPrivacy
        },
        guards:{
          skippedActivation,
          blockedPersonalization,
          signalDeliveries:marketingGuarded
        },
        checks:readinessChecks,
        consentAudit:consentAudit.slice(0,50),
        generatedAt:new Date().toISOString()
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/consent/stats') return send(req,res,200,{stats:await consentStats(workspaceId),audit:await listConsentAudit(workspaceId,50)})
    if (req.method === 'GET' && url.pathname === '/api/privacy/requests') {
      if(!['owner','admin'].includes(req.user?.role||'')) return send(req,res,403,{error:'owner or admin role required'})
      return send(req,res,200,{policy:retentionPolicy(),items:await listPrivacyRequests(workspaceId,100)})
    }
    if (req.method === 'POST' && url.pathname === '/api/privacy/export') {
      if(!['owner','admin'].includes(req.user?.role||'')) return send(req,res,403,{error:'owner or admin role required'})
      const body=await readBody(req)
      try{return send(req,res,200,await exportSubject(workspaceId,body,req.user?.email||req.user?.userId||null))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'privacy export failed'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/privacy/delete') {
      if(!['owner','admin'].includes(req.user?.role||'')) return send(req,res,403,{error:'owner or admin role required'})
      const body=await readBody(req)
      try{return send(req,res,200,await deleteSubject(workspaceId,body,req.user?.email||req.user?.userId||null))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'privacy deletion failed'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/privacy/retention/purge') {
      if(!['owner','admin'].includes(req.user?.role||'')) return send(req,res,403,{error:'owner or admin role required'})
      const body=await readBody(req)
      try{return send(req,res,200,await purgeRetention(workspaceId,{dryRun:body.dryRun!==false,requestedBy:req.user?.email||req.user?.userId||null}))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'retention purge failed'})}
    }
    if (req.method === 'GET' && url.pathname === '/api/monitoring') return send(req,res,200,await monitoringSnapshot(workspaceId))
    if (req.method === 'GET' && url.pathname === '/api/billing/usage') return send(req,res,200,await handleEvaluateEntitlement({workspaceId}))
    if (req.method === 'GET' && url.pathname === '/api/billing/subscription') {
      const summary=await handleEvaluateEntitlement({workspaceId})
      return send(req,res,200,{...summary,providerConfigured:billingConfigured(),events:await billingEventHistory(workspaceId,20),reconciliation:await billingReconciliationHistory(workspaceId,20)})
    }
    if (req.method === 'POST' && url.pathname === '/api/billing/checkout') {
      if(req.user?.role!=='owner') return send(req,res,403,{error:'owner role required'})
      const body=await readBody(req)
      if(!body.planCode) return send(req,res,400,{error:'planCode required'})
      try{return send(req,res,201,await createCheckoutSession(workspaceId,body))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'checkout creation failed'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/billing/portal') {
      if(req.user?.role!=='owner') return send(req,res,403,{error:'owner role required'})
      try{return send(req,res,201,await createPortalSession(workspaceId))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'billing portal unavailable'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/billing/entitlements') {
      if(req.user?.role!=='owner') return send(req,res,403,{error:'owner role required'})
      const body=await readBody(req)
      try{
        await handleChangeSubscription({workspaceId,input:body})
        return send(req,res,200,await subscriptionSummary(workspaceId))
      }catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'invalid entitlements'})}
    }

  return false
}

