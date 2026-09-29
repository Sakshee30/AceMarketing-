const base=process.env.ACE_LOCAL_API||'http://127.0.0.1:3001/api'
const workspaceId=process.env.DEFAULT_WORKSPACE_ID||'ws_default'
const login=await fetch(base+'/auth/login',{
  method:'POST',
  headers:{'content-type':'application/json','x-workspace-id':workspaceId},
  body:JSON.stringify({email:process.env.ADMIN_EMAIL||'owner@example.com',password:process.env.ACE_LOCAL_PASSWORD||'demo123'})
})
if(!login.ok)throw new Error(`Local login failed: ${login.status} ${await login.text()}`)
const {token}=await login.json()
const headers={authorization:`Bearer ${token}`,'x-workspace-id':workspaceId}
const endpoints=[
  '/auth/me','/dashboard-summary','/launchpad','/workspace/overview','/integrations','/integration-flows','/custom-integrations',
  '/events','/adjustments','/diagnostics','/match-quality','/reconciliation','/fraud','/deep-links','/sites','/fingerprinting',
  '/fingerprinting/matches','/funnel','/leak-monitor','/live-sync','/data-hub','/offline-attribution','/ctwa-attribution',
  '/call-events','/matchback','/matchback/unmatched','/attribution-identity/stats','/pos-stores','/journeys','/customer-360',
  '/identity','/models','/attribution','/reports','/cohorts?months=6','/grouped-performance?dimension=category&months=6',
  '/report-schedules','/planner','/enrich','/lead-grading','/agents','/routing','/follow-ups',
  '/lead-reactivation?dormantDays=30&recentDays=7','/voice-scheduler','/qualification-calls','/meetings','/feedback',
  '/agent-runs','/approvals','/personalization-rules','/activation-rules','/exclusions','/audiences','/audience-schedules',
  '/activation-runs','/behavior','/feed','/solutions','/chatgpt-ads','/signal-deliveries','/whatsapp/messages',
  '/connector-health','/monitoring','/compliance-center','/consent/stats','/privacy/requests','/billing/usage',
  '/billing/subscription','/alerts','/signal-console','/security-posture','/resources','/case-studies','/ai-action',
  '/source-notes','/event-templates','/monitoring-rules','/members','/settings','/workspaces','/webhooks/deliveries',
  '/webhooks/endpoints','/audit-log','/api-keys'
]
const failures=[]
for(const endpoint of endpoints){
  const started=performance.now()
  const response=await fetch(base+endpoint,{headers})
  const elapsed=Math.round(performance.now()-started)
  if(!response.ok){
    failures.push({endpoint,status:response.status,body:(await response.text()).slice(0,500),elapsed})
  }
}
if(failures.length){
  console.error(JSON.stringify(failures,null,2))
  process.exitCode=1
}else{
  console.log(`[local-feature-smoke] ${endpoints.length} authenticated feature reads passed.`)
}
