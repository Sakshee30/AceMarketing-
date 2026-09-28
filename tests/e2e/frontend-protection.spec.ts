import {expect,test} from '@playwright/test'

test.beforeEach(async({page,context},testInfo)=>{
  const raw=['frontend_guard',testInfo.project.name,testInfo.workerIndex,testInfo.parallelIndex].join('_').toLowerCase().replace(/[^a-z0-9_-]+/g,'_')
  const workspaceId=raw.slice(0,60)
  await context.setExtraHTTPHeaders({'X-Workspace-ID':workspaceId})
  await page.addInitScript((id)=>window.localStorage.setItem('ace_workspace_id',id),workspaceId)
})

const dismissConsent=async(page:any)=>{
  const dialog=page.getByRole('dialog',{name:'Privacy choices'})
  if(await dialog.isVisible().catch(()=>false)){
    await dialog.getByRole('button',{name:'Essential only'}).click()
    await expect(dialog).toHaveCount(0)
  }
}

test('workspace tab route is direct-linkable and dirty settings require explicit discard',async({page})=>{
  await page.goto('/#/workspace?tab=Settings')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Settings/)
  await expect(page.getByRole('heading',{name:'Workspace settings'})).toBeVisible()

  const organization=page.getByLabel('Organization')
  const previous=await organization.inputValue()
  await organization.fill(previous+' CI unsaved')
  await expect(page.getByText(/unsaved setting/i)).toBeVisible()

  page.once('dialog',async dialog=>{
    expect(dialog.type()).toBe('confirm')
    expect(dialog.message()).toContain('unsaved work')
    await dialog.dismiss()
  })
  await page.getByRole('button',{name:'Open monitoring center'}).click()
  await expect(page.getByRole('heading',{name:'Workspace settings'})).toBeVisible()
  await expect(page).toHaveURL(/tab=Settings/)

  page.once('dialog',async dialog=>{
    expect(dialog.type()).toBe('confirm')
    await dialog.accept()
  })
  await page.getByRole('button',{name:'Open monitoring center'}).click()
  await expect(page.getByRole('heading',{name:/Monitoring/i})).toBeVisible()
  await expect(page).toHaveURL(/tab=Monitoring/)
})


test('audience builder traps focus, closes with Escape, and protects an open draft',async({page})=>{
  await page.goto('/#/workspace?tab=Audiences')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:'Audience management'})).toBeVisible()

  await page.getByRole('button',{name:/New audience/i}).click()
  const dialog=page.getByRole('dialog',{name:'Audience Builder'})
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Audience name')).toBeFocused()

  page.once('dialog',async confirm=>{
    expect(confirm.type()).toBe('confirm')
    expect(confirm.message()).toContain('unsaved work')
    await confirm.dismiss()
  })
  await page.getByRole('button',{name:'Open monitoring center'}).click()
  await expect(dialog).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button',{name:/New audience/i})).toBeFocused()
})


test('reports browser offline state without polling or hiding current UI',async({page,context})=>{
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  await context.setOffline(true)
  await page.evaluate(()=>window.dispatchEvent(new Event('offline')))
  const status=page.getByTestId('connection-status')
  await expect(status).toBeVisible()
  await expect(status).toContainText(/appear to be offline/i)
  await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  await context.setOffline(false)
})


test('shows controlled recovery for missing lazy chunks without automatic reload',async({page})=>{
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await page.evaluate(()=>window.dispatchEvent(new Event('vite:preloadError',{cancelable:true})))
  const notice=page.getByTestId('chunk-recovery')
  await expect(notice).toBeVisible()
  await expect(notice).toContainText(/controlled refresh/i)
  await expect(notice).toContainText(/will not reload automatically/i)
  await page.getByRole('button',{name:'Keep working'}).click()
  await expect(notice).toHaveCount(0)
  await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
})


test('loads extracted approvals feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Approvals')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Approvals/)
  await expect(page.getByRole('heading',{name:'Human approval center'})).toBeVisible()
  await expect(page.getByText(/Persisted agent and automation requests/i)).toBeVisible()
})


test('loads extracted monitoring feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Monitoring')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Monitoring/)
  await expect(page.getByRole('heading',{name:'Platform monitoring'})).toBeVisible()
  await expect(page.getByText(/24-hour API health/i)).toBeVisible()
})


test('loads extracted alerts feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Alerts')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Alerts/)
  await expect(page.getByRole('heading',{name:'Alert Center'})).toBeVisible()
  await expect(page.getByText(/Operational incidents/i)).toBeVisible()
})


test('loads extracted reports feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Reports')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Reports/)
  await expect(page.getByRole('heading',{name:'Cohort & automated reports'})).toBeVisible()
  await expect(page.getByText(/Automated email reports/i)).toBeVisible()
})


test('loads extracted executive briefs feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Executive%20Briefs')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Executive%20Briefs/)
  await expect(page.getByRole('heading',{name:'Executive data snippets'})).toBeVisible()
  await expect(page.getByText(/Schedule executive brief/i)).toBeVisible()
})


test('loads extracted integrations feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Integrations')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Integrations/)
  await expect(page.getByRole('heading',{name:'Platform-agnostic connectivity'})).toBeVisible()
  await expect(page.getByText(/Integration catalog/i)).toBeVisible()
})


test('loads extracted data flows feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Data%20Flows')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Data%20Flows/)
  await expect(page.getByRole('heading',{name:'Data flows'})).toBeVisible()
  await expect(page.getByText(/Source → map → verify → activate/i)).toBeVisible()
})

test('loads extracted audiences feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Audiences')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Audiences/)
  await expect(page.getByRole('heading',{name:'Audience management'})).toBeVisible()
  await expect(page.getByText(/Active segments/i)).toBeVisible()
})


test('loads extracted planner feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Planner')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Planner/)
  await expect(page.getByRole('heading',{name:'Strategic media planner'})).toBeVisible()
  await expect(page.getByText(/Evidence-based allocation/i)).toBeVisible()
})

test('loads extracted models feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Models')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Models/)
  await expect(page.getByRole('heading',{name:'Custom models'})).toBeVisible()
  await expect(page.getByText(/Model catalog/i)).toBeVisible()
})


test('loads extracted settings feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Settings')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Settings/)
  await expect(page.getByRole('heading',{name:'Workspace settings'})).toBeVisible()
  await expect(page.getByText(/Workspace profile/i)).toBeVisible()
})


test('loads extracted compliance feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Compliance')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Compliance/)
  await expect(page.getByRole('heading',{name:'Privacy, consent & compliance center'})).toBeVisible()
  await expect(page.getByText(/Subject rights operations/i)).toBeVisible()
})


test('loads extracted developers feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Developers')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Developers/)
  await expect(page.getByRole('heading',{name:'Developer & webhook console'})).toBeVisible()
  await expect(page.getByText(/API keys/i)).toBeVisible()
})

test('loads extracted delivery feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Delivery')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Delivery/)
  await expect(page.getByRole('heading',{name:'Signal delivery center'})).toBeVisible()
  await expect(page.getByText(/Outbound delivery queue/i)).toBeVisible()
})


test('loads extracted real-time activation feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Real-Time%20Activation')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Real-Time%20Activation/)
  await expect(page.getByRole('heading',{name:'Real-time activation'})).toBeVisible()
  await expect(page.getByText(/Event-driven automation/i)).toBeVisible()
})

test('loads extracted personalization feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Personalization')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Personalization/)
  await expect(page.getByRole('heading',{name:'Personalization studio'})).toBeVisible()
  await expect(page.getByText(/Consent-aware decisioning/i)).toBeVisible()
})

test('loads extracted exclusions feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Exclusions')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Exclusions/)
  await expect(page.getByRole('heading',{name:'Audience suppression & exclusions'})).toBeVisible()
  await expect(page.getByText(/Materialized exclusions/i)).toBeVisible()
})


test('loads extracted adjustments feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Adjustments')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Adjustments/)
  await expect(page.getByRole('heading',{name:'Conversion adjustments'})).toBeVisible()
  await expect(page.getByText(/Conversion adjustments/i)).toBeVisible()
})

test('loads extracted diagnostics feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Diagnostics')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Diagnostics/)
  await expect(page.getByRole('heading',{name:'Tracking & data quality diagnostics'})).toBeVisible()
  await expect(page.getByText(/Detected issues/i)).toBeVisible()
})


test('loads extracted match quality feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Match%20Quality')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Match%20Quality/)
  await expect(page.getByRole('heading',{name:'Event match quality'})).toBeVisible()
  await expect(page.getByText(/Identifier coverage/i)).toBeVisible()
})

test('loads extracted reconciliation feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Reconciliation')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Reconciliation/)
  await expect(page.getByRole('heading',{name:'Conversion reconciliation center'})).toBeVisible()
  await expect(page.getByText(/Issue reconciliation/i)).toBeVisible()
})

test('loads extracted fraud feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Fraud')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Fraud/)
  await expect(page.getByRole('heading',{name:'Fraud & noise detection'})).toBeVisible()
  await expect(page.getByText(/Detected patterns/i)).toBeVisible()
})


test('loads extracted Customer 360 feature from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Customer%20360')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Customer%20360/)
  await expect(page.getByRole('heading',{name:'Customer 360'})).toBeVisible()
  await expect(page.getByText(/Customer directory/i)).toBeVisible()
})

test('loads extracted Offline Attribution feature and accessible rule builder',async({page})=>{
  await page.goto('/#/workspace?tab=Offline%20Attribution')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Offline%20Attribution/)
  await expect(page.getByRole('heading',{name:'Calls, WhatsApp & offline revenue'})).toBeVisible()
  await page.getByRole('button',{name:'New offline rule'}).click()
  const dialog=page.getByRole('dialog',{name:'New offline attribution rule'})
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})


test('loads extracted Feed feature and accessible builders from its direct workspace route',async({page})=>{
  await page.goto('/#/workspace?tab=Feed')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Feed/)
  await expect(page.getByRole('heading',{name:'Feed & payload enhancement'})).toBeVisible()
  await expect(page.getByText('Destination field mappings',{exact:true})).toBeVisible()

  await page.getByRole('button',{name:'Add attribute'}).first().click()
  const attributeDialog=page.getByRole('dialog',{name:'Add feed attribute'})
  await expect(attributeDialog).toBeVisible()
  await expect(attributeDialog.getByLabel('Key')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(attributeDialog).toHaveCount(0)

  await page.getByRole('button',{name:'New mapping'}).click()
  const mappingDialog=page.getByRole('dialog',{name:'New feed mapping'})
  await expect(mappingDialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(mappingDialog).toHaveCount(0)
})


test('loads extracted Agents feature and protects accessible mutation surfaces',async({page})=>{
  await page.goto('/#/workspace?tab=Agents')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Agents/)
  await expect(page.getByRole('heading',{name:'Agent operations'})).toBeVisible()
  await expect(page.getByText('Agent library',{exact:true})).toBeVisible()

  await page.getByRole('button',{name:'Build custom agent'}).click()
  const builder=page.getByRole('dialog',{name:'Custom Agent Builder'})
  await expect(builder).toBeVisible()
  await expect(builder.getByLabel('Agent name')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(builder).toHaveCount(0)
})


test('loads extracted Routing feature and accessible rule builder',async({page})=>{
  await page.goto('/#/workspace?tab=Routing')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Routing/)
  await expect(page.getByRole('heading',{name:'Lead routing'})).toBeVisible()
  await expect(page.getByText('Routing rules',{exact:true})).toBeVisible()

  await page.getByRole('button',{name:/Add rule/}).click()
  const dialog=page.getByRole('dialog',{name:'New routing rule'})
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Rule name')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})


test('loads extracted Ask Ace feature with grounded assistant controls',async({page})=>{
  await page.goto('/#/workspace?tab=Ask%20Ace')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Ask%20Ace/)
  await expect(page.getByRole('heading',{name:'Journey & attribution assistant'})).toBeVisible()
  await expect(page.getByLabel('Ask Ace question')).toBeVisible()
  await expect(page.getByText('No fabricated metrics',{exact:true})).toBeVisible()
})


test('loads extracted Feedback feature with accessible mutation forms',async({page})=>{
  await page.goto('/#/workspace?tab=Feedback')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Feedback/)
  await expect(page.getByRole('heading',{name:'Feedback agent'})).toBeVisible()

  await page.getByRole('button',{name:'Record response'}).click()
  const recordDialog=page.getByRole('dialog',{name:'Record feedback'})
  await expect(recordDialog).toBeVisible()
  await expect(recordDialog.getByLabel('Lead')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(recordDialog).toHaveCount(0)

  await page.getByRole('button',{name:'Request feedback'}).click()
  const requestDialog=page.getByRole('dialog',{name:'Request feedback'})
  await expect(requestDialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(requestDialog).toHaveCount(0)
})


test('loads extracted Follow-ups feature with accessible builder',async({page})=>{
  await page.goto('/#/workspace?tab=Follow-ups')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:'Follow-up operations'})).toBeVisible()
  await page.getByRole('button',{name:'Create follow-up'}).click()
  const dialog=page.getByRole('dialog',{name:'Create follow-up'})
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Lead reference')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('loads extracted Calls feature with accessible qualification builder',async({page})=>{
  await page.goto('/#/workspace?tab=Calls')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:'Voice qualification & call tracking'})).toBeVisible()
  await page.getByRole('button',{name:/Start voice qualification/}).click()
  const dialog=page.getByRole('dialog',{name:'Start voice qualification'})
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('loads extracted Meetings feature with accessible schedulers',async({page})=>{
  await page.goto('/#/workspace?tab=Meetings')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:'Scheduler & meeting reminders'})).toBeVisible()
  await page.getByRole('button',{name:'Start voice scheduler'}).click()
  const scheduler=page.getByRole('dialog',{name:'Start Voice Scheduler'})
  await expect(scheduler).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(scheduler).toHaveCount(0)
})


test('customer workspace composition remains direct-linkable after app-shell extraction',async({page})=>{
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/workspace\?tab=Overview/)
  await expect(page.getByRole('heading',{name:'Acquisition command center'})).toBeVisible()
  await expect(page.getByRole('navigation',{name:'Workspace navigation'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Open monitoring center'})).toBeVisible()
})


test('public website routes remain direct-linkable after public-site extraction',async({page})=>{
  await page.goto('/#/pricing')
  await dismissConsent(page)
  await expect(page).toHaveURL(/#\/pricing/)
  await expect(page.getByRole('heading').first()).toBeVisible()

  await page.goto('/#/industries')
  await expect(page).toHaveURL(/#\/industries/)
  await expect(page.getByText('INDUSTRIES',{exact:true}).first()).toBeVisible()
})


test('auth and deep-link boundaries remain direct-linkable after root-shell slimming',async({page})=>{
  await page.goto('/#/login')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:'Log in to your workspace'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible()

  await page.goto('/#/deep/nonexistent-test-link')
  await expect(page.getByRole('heading',{name:'Continue your journey'})).toBeVisible()
})


test('auth migrates legacy persistent token into tab-scoped session authority',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('ace_token','legacy-test-token')})
  await page.goto('/#/login')
  await dismissConsent(page)
  await page.waitForFunction(()=>localStorage.getItem('ace_token')===null)
  const state=await page.evaluate(()=>({legacy:localStorage.getItem('ace_token'),scoped:sessionStorage.getItem('ace_session_token')}))
  expect(state.legacy).toBeNull()
  expect(state.scoped).toBe('legacy-test-token')
})

test('remember option persists email only and never creates a persistent auth token',async({page})=>{
  await page.goto('/#/login')
  await dismissConsent(page)
  await page.getByLabel('Email').fill('remember@example.com')
  await page.getByLabel('Remember email').check()
  await page.route('**/api/auth/login',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({token:'tab-token',user:{email:'remember@example.com',role:'member'},workspaceId:'ws_default',expiresIn:3600})}))
  await page.getByLabel('Password').fill('example-password')
  await page.getByRole('button',{name:/Log in/}).click()
  await page.waitForTimeout(100)
  const state=await page.evaluate(()=>({persistentToken:localStorage.getItem('ace_token'),rememberedEmail:localStorage.getItem('ace_remembered_email'),sessionToken:sessionStorage.getItem('ace_session_token')}))
  expect(state.persistentToken).toBeNull()
  expect(state.rememberedEmail).toBe('remember@example.com')
  expect(state.sessionToken).toBe('tab-token')
})


test('workspace switch never reveals previous scope while target query cache resolves',async({page})=>{
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  const persisted=page.locator('.workspace-menu button').filter({hasText:'Demo Sandbox'})
  await page.getByRole('button',{name:/Ace EdTech/}).first().click()
  if(await persisted.count()){
    await persisted.first().click()
    await expect(page.getByText(/SWITCHING WORKSPACE|WORKSPACE SWITCH BLOCKED/)).toBeVisible()
  }
})


test('workspace identity is represented in the route after an authorized switch',async({page})=>{
  await page.route('**/api/workspaces',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[
    {id:'ws_default',name:'Ace EdTech',environment:'Production',initials:'AM'},
    {id:'ws_demo',name:'Demo Sandbox',environment:'Sandbox',initials:'DS'}
  ]})}))
  await page.route('**/api/dashboard-summary',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({areas:[]})}))
  await page.goto('/#/workspace?tab=Overview&workspace=ws_default')
  await dismissConsent(page)
  await page.getByRole('button',{name:/Ace EdTech/}).first().click()
  await page.locator('.workspace-menu button').filter({hasText:'Demo Sandbox'}).click()
  await expect(page).toHaveURL(/workspace=ws_demo/)
  const scope=await page.evaluate(()=>localStorage.getItem('ace_workspace_id'))
  expect(scope).toBe('ws_demo')
})

test('logout session-state event clears private customer query cache boundary',async({page})=>{
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('ace-session-state',{detail:{state:'anonymous'}})))
  await expect(page.getByRole('navigation',{name:'Workspace navigation'})).toBeVisible()
})


test('customer bootstrap does not convert session network failure into logout',async({page})=>{
  await page.route('**/api/auth/me',route=>route.abort('failed'))
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:'Workspace access could not be verified'})).toBeVisible()
  await expect(page.getByText(/session has not been treated as signed out/i)).toBeVisible()
  await expect(page.getByRole('button',{name:/Retry verification/})).toBeVisible()
})

test('customer bootstrap shows confirmed signed-out state only after authoritative denial',async({page})=>{
  await page.route('**/api/auth/me',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'unauthorized'})}))
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:'Sign in required'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Go to login'})).toBeVisible()
})

test('customer bootstrap revalidates protected access after bfcache restoration',async({page})=>{
  let calls=0
  await page.route('**/api/auth/me',route=>{calls+=1;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'u1',email:'qa@example.com',role:'owner'})})})
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await expect(page.getByRole('navigation',{name:'Workspace navigation'})).toBeVisible()
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})))
  await expect.poll(()=>calls).toBeGreaterThan(1)
})


test('overview server state is query-backed and survives a transient live-activity failure',async({page})=>{
  await page.route('**/api/live-sync',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'live sync temporarily unavailable'})}))
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:'Acquisition command center'})).toBeVisible()
  await expect(page.getByText(/Live activity is temporarily unavailable/i)).toBeVisible()
  await expect(page.getByText('WORKSPACE READINESS')).toBeVisible()
})
