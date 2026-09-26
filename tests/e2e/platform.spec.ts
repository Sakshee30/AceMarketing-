import {expect,test} from '@playwright/test'

test.beforeEach(async({page,context},testInfo)=>{
  const raw=['ci',testInfo.project.name,testInfo.workerIndex,testInfo.parallelIndex,testInfo.retry,testInfo.title].join('_').toLowerCase().replace(/[^a-z0-9_-]+/g,'_')
  const workspaceId=raw.slice(0,60).replace(/_+$/,'')||'ci_workspace'
  await context.setExtraHTTPHeaders({'X-Workspace-ID':workspaceId})
  await page.addInitScript((id)=>window.localStorage.setItem('ace_workspace_id',id),workspaceId)
})

const dismissConsent=async(page:any)=>{
  const dialog=page.getByRole('dialog',{name:'Privacy choices'})
  if(await dialog.isVisible().catch(()=>false)){
    const button=dialog.getByRole('button',{name:'Essential only'})
    await button.scrollIntoViewIfNeeded()
    await button.click()
    await expect(dialog).toHaveCount(0)
  }
}

const openWorkspaceTab=async(page:any,name:string)=>{
  const body=page.locator('.product-body')
  if(!page.url().includes('#/workspace')||!(await body.isVisible().catch(()=>false))){
    await page.goto('/#/workspace')
    await dismissConsent(page)
    await expect(body).toBeVisible()
  }
  await page.evaluate((tab)=>{
    localStorage.setItem('ace_active_tab',tab)
    window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:tab}))
  },name)
  await expect(body).toBeVisible()
  await expect.poll(async()=>page.evaluate((tab)=>localStorage.getItem('ace_active_tab')===tab,name),{message:'Expected active workspace tab '+name}).toBeTruthy()
}

const criticalPublicRoutes=[
  ['#/',/AceMarketing/i],
  ['#/agents',/agents/i],
  ['#/integrations',/integrations/i],
  ['#/pricing',/pricing/i],
  ['#/case-studies',/case studies/i],
  ['#/resources',/resources/i],
  ['#/security',/security/i]
] as const

test.describe('public product surface',()=>{
  for(const [route,heading] of criticalPublicRoutes){
    test(route,async({page})=>{
      const pageErrors:string[]=[]
      page.on('pageerror',error=>pageErrors.push(error.message))
      await page.goto('/'+route)
      await dismissConsent(page)
      await expect(page.locator('body')).toBeVisible()
      await expect(page.locator('body')).toContainText(heading)
      await expect(page.locator('header, main, .public-page, .marketing-page').first()).toBeVisible()
      expect(pageErrors).toEqual([])
    })
  }

  test('public agent and integration routes expose current catalogs',async({page})=>{
    await page.goto('/#/agents')
    await dismissConsent(page)
    await expect(page).toHaveURL(/#\/agents/)
    await expect(page.locator('body')).toContainText(/Lead Grading/i)

    await page.goto('/#/integrations')
    await expect(page).toHaveURL(/#\/integrations/)
    await expect(page.locator('body')).toContainText(/Google Ads/i)
  })
})

test.describe('workspace critical flows',()=>{
  test.beforeEach(async({page})=>{
    await page.goto('/#/')
    await dismissConsent(page)
    await expect(page.locator('.marketing-page')).toBeVisible()
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('ace-view',{detail:'app'})))
    await expect(page).toHaveURL(/#\/workspace/)
    await expect(page.locator('.product-body')).toBeVisible()
    await expect(page.locator('.product-body h1')).toContainText(/Acquisition command center/i)
  })

  test('dashboard navigator exposes live backend status and jumps between sections',async({page})=>{
    const response=await page.request.get('/api/dashboard-summary')
    expect(response.ok()).toBeTruthy()
    const payload=await response.json()
    expect(typeof payload.readiness).toBe('number')
    expect(payload.totals).toBeTruthy()

    const navigator=page.getByRole('button',{name:'Open dashboard section navigator'})
    await expect(navigator).toBeVisible()
    await navigator.click()
    const dialog=page.getByRole('dialog',{name:'Dashboard section navigator'})
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('workspace readiness')).toBeVisible()
    await expect(dialog.getByText('connected systems')).toBeVisible()
    await expect(dialog.getByText('open alerts')).toBeVisible()

    const search=dialog.getByRole('textbox',{name:'Search dashboard sections'})
    await search.fill('attribution')
    await expect(dialog.getByRole('button',{name:/Attribution.*Channel, campaign and revenue credit/i})).toBeVisible()
    await dialog.getByRole('button',{name:/Attribution.*Channel, campaign and revenue credit/i}).click()
    await expect(page.locator('.product-body h1')).toContainText(/Attribution/i)
  })

  test('dashboard sections collapse and remain navigable',async({page})=>{
    const mobileToggle=page.getByRole('button',{name:'Open workspace navigation'})
    if(await mobileToggle.isVisible().catch(()=>false)) await mobileToggle.click()
    const sidebar=page.locator('.product-sidebar')
    const activation=sidebar.locator('.product-nav-group').filter({hasText:'Activation & Integrations'}).locator('.product-nav-group-head')
    await activation.scrollIntoViewIfNeeded()
    await expect(activation).toBeVisible()
    await activation.click()
    await expect(sidebar.getByRole('button',{name:'Audiences',exact:true})).toBeHidden()
    await activation.click()
    await expect(sidebar.getByRole('button',{name:'Audiences',exact:true})).toBeVisible()

    const search=page.getByPlaceholder('Find feature...')
    await search.fill('audience')
    await expect(page.getByRole('button',{name:'Audiences',exact:true})).toBeVisible()
    await openWorkspaceTab(page,'Audiences')
    await expect(page.locator('.product-body h1')).toContainText(/Audience/i)
  })

  test('data flows persist recipes and enforce readiness before activation',async({page})=>{
    await openWorkspaceTab(page,'Data Flows')
    await expect(page.locator('.product-body h1')).toContainText(/Data flows/i)
    await expect(page.getByText(/Source → map → verify → activate/i)).toBeVisible()

    await page.getByRole('button',{name:'Create flow'}).click()
    const modal=page.getByRole('form').filter({hasText:'Create data flow'})
    await expect(modal).toBeVisible()
    await modal.getByLabel('Flow name').fill('CI LeadSquared to Meta flow')
    await modal.getByLabel('Source').selectOption({label:'LeadSquared'})
    await modal.getByLabel('Destination').selectOption({label:'Meta Ads'})
    await modal.getByLabel('Business object / event').fill('Qualified lead')
    await modal.getByLabel('Trigger').fill('On lifecycle stage change')
    await modal.getByLabel('Identity mapping').fill('email / phone / fbclid')
    await modal.getByRole('button',{name:'Create flow'}).click()

    await expect(page.getByText('CI LeadSquared to Meta flow')).toBeVisible()
    const card=page.locator('.data-flow-card').filter({hasText:'CI LeadSquared to Meta flow'})
    await expect(card).toContainText('Not tested')
    await card.getByRole('button',{name:'Test readiness'}).click()
    await expect(card).toContainText(/Needs attention|Readiness passed/)
    if(await card.getByText('Needs attention').isVisible().catch(()=>false)){
      await card.getByRole('button',{name:'Activate'}).click()
      await expect(page.locator('.delivery-notice')).toContainText(/must pass|readiness/i)
    }
  })

  test('core operating tabs render',async({page})=>{
    const tabs=[
      ['Journeys',/Customer|journey/i],
      ['Attribution',/Attribution/i],
      ['Lead Grading',/Lead grading|grade/i],
      ['Agents',/Agents/i],
      ['Integrations',/Integrations/i],
      ['Audiences',/Audience/i],
      ['Monitoring',/monitoring/i],
      ['Alerts',/Alert/i]
    ] as const

    for(const [tab,copy] of tabs){
      await openWorkspaceTab(page,tab)
      await expect(page.locator('.product-body')).toContainText(copy)
    }
  })

  test('launchpad identity and models render backend-backed state',async({page})=>{
    await openWorkspaceTab(page,'Launchpad')
    await expect(page.locator('.product-body h1')).toContainText(/Launchpad/i)
    await expect(page.locator('.launchpad-progress')).toContainText(/Workspace readiness/i)

    await openWorkspaceTab(page,'Identity')
    await expect(page.locator('.product-body h1')).toContainText(/Identity resolution/i)
    await expect(page.locator('.product-body')).toContainText(/Known identities/i)

    await openWorkspaceTab(page,'Models')
    await expect(page.locator('.product-body h1')).toContainText(/Custom models/i)
    await expect(page.locator('.product-body')).toContainText(/Model catalog|No model services available|Workspace scoring runtime/i)
  })

  test('conversion operations expose real creation and empty-state flows',async({page})=>{
    await openWorkspaceTab(page,'Follow-ups')
    await expect(page.locator('.product-body h1')).toContainText(/Follow-up operations/i)
    await expect(page.getByRole('button',{name:/Create follow-up/i})).toBeVisible()

    await openWorkspaceTab(page,'Feedback')
    await expect(page.locator('.product-body h1')).toContainText(/Feedback agent/i)
    await expect(page.getByRole('button',{name:/Record feedback/i})).toBeVisible()

    await openWorkspaceTab(page,'Approvals')
    await expect(page.locator('.product-body h1')).toContainText(/Human approval center/i)

    await openWorkspaceTab(page,'Routing')
    await expect(page.locator('.product-body h1')).toContainText(/Lead routing/i)
    await expect(page.locator('.product-body')).toContainText(/Routed today|No routing load yet/i)
  })

  test('notification and approval settings are editable',async({page})=>{
    await openWorkspaceTab(page,'Settings')
    await page.getByRole('button',{name:'Notifications',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Notifications'})).toBeVisible()
    await expect(page.getByRole('button',{name:/Save notifications/i})).toBeVisible()

    await page.getByRole('button',{name:'Agent approvals',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Agent approval boundaries'})).toBeVisible()
    await expect(page.getByRole('button',{name:/Save approval policy/i})).toBeVisible()
  })

  test('billing usage settings render live entitlement surface',async({page})=>{
    await openWorkspaceTab(page,'Settings')
    await page.getByRole('button',{name:'Billing & usage',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Billing & usage'})).toBeVisible()
    await expect(page.locator('.settings-detail')).toContainText(/Tracked events/i)
    await expect(page.locator('.settings-detail')).toContainText(/Current period/i)
  })

  test('workspace switcher remains usable',async({page})=>{
    const toggle=page.getByRole('button',{name:'Open workspace navigation'})
    if(await toggle.isVisible().catch(()=>false)) await toggle.click()
    const workspace=page.locator('.product-sidebar .workspace')
    await workspace.scrollIntoViewIfNeeded()
    await workspace.click()
    await expect(page.getByRole('button',{name:/Create workspace/i})).toBeVisible()
    const current=await workspace.locator('b').innerText()
    expect(current.trim().length).toBeGreaterThan(0)
  })
})

test.describe('basic accessibility regression',()=>{
  test('interactive controls have accessible names',async({page})=>{
    await page.goto('/#/')
    await dismissConsent(page)
    const buttons=page.getByRole('button')
    const count=await buttons.count()
    expect(count).toBeGreaterThan(0)
    for(let i=0;i<Math.min(count,40);i++){
      const button=buttons.nth(i)
      if(await button.isVisible()){
        const name=(await button.getAttribute('aria-label'))||await button.innerText()
        expect(name.trim().length).toBeGreaterThan(0)
      }
    }
  })

  test('workspace has a single visible primary heading per selected surface',async({page})=>{
    await page.goto('/#/')
    await expect(page.locator('.marketing-page')).toBeVisible()
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('ace-view',{detail:'app'})))
    await expect(page.locator('.product-body h1')).toHaveCount(1)
    await openWorkspaceTab(page,'Monitoring')
    await expect(page.locator('.product-body h1')).toHaveCount(1)
  })
})


test.describe('privacy consent runtime',()=>{
  test('optional tracking remains off until consent is granted',async({page})=>{
    const tracked:string[]=[]
    page.on('request',request=>{if(request.url().includes('/api/track'))tracked.push(request.postData()||'')})
    await page.goto('/#/')
    await expect(page.getByRole('dialog',{name:'Privacy choices'})).toBeVisible()
    await page.waitForTimeout(300)
    expect(tracked.some(x=>x.includes('"event":"page_view"'))).toBeFalsy()

    await page.getByRole('dialog',{name:'Privacy choices'}).getByRole('button',{name:'Allow analytics'}).click()
    await expect(page.getByRole('dialog',{name:'Privacy choices'})).toHaveCount(0)
    await page.reload()
    await page.waitForTimeout(300)
    expect(tracked.some(x=>x.includes('"event":"page_view"'))).toBeTruthy()
  })

  test('essential-only choice keeps marketing click IDs out of storage',async({page})=>{
    await page.goto('/?gclid=test-gclid&fbclid=test-fbclid#/')
    await page.getByRole('dialog',{name:'Privacy choices'}).getByRole('button',{name:'Essential only'}).click()
    const stored=await page.evaluate(()=>({gclid:localStorage.getItem('ace:gclid'),fbclid:localStorage.getItem('ace:fbclid')}))
    expect(stored).toEqual({gclid:null,fbclid:null})
  })
})


test('dashboard navigator opens primary operating sections', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await expect(page.getByRole('button', { name: 'Open dashboard section navigator' })).toBeVisible()
  await page.getByRole('button', { name: 'Open dashboard section navigator' }).click()
  await expect(page.getByRole('dialog', { name: 'Dashboard section navigator' })).toBeVisible()
  const navigator=page.getByRole('dialog', { name: 'Dashboard section navigator' })
  const attributionButton=navigator.locator('button').filter({has:page.getByText('Attribution',{exact:true})}).first()
  await expect(attributionButton).toBeVisible()
  await attributionButton.click()
  await expect(page.getByRole('heading', { name: 'Full-path attribution' })).toBeVisible()
})


test('live dashboard section strip navigates between operating areas', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await expect(page.getByLabel('Dashboard sections')).toBeVisible()
  await page.getByLabel('Dashboard sections').getByRole('button', { name: /Measurement & Intelligence/ }).click()
  await expect(page.getByText('Journeys', { exact: true }).first()).toBeVisible()
})


test('dashboard keeps section navigation visible on workspace', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await expect(page.getByLabel('Dashboard sections')).toBeVisible()
  const sections=page.getByLabel('Dashboard sections')
  await expect(sections.getByRole('button', { name: 'Tracking & Data', exact: true })).toBeVisible()
  await expect(sections.getByRole('button', { name: 'Activation & Integrations', exact: true })).toBeVisible()
  await expect(sections.getByRole('button', { name: 'Operations & Developer', exact: true })).toBeVisible()
})


test('manual integration cards open the custom adapter builder', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await page.getByLabel('Dashboard sections').getByRole('button', { name: 'Activation & Integrations', exact: true }).click()
  await openWorkspaceTab(page,'Integrations')
  const meritto = page.locator('article').filter({ hasText: 'Meritto' })
  await expect(meritto).toContainText('Configurable adapter')
  await meritto.getByRole('button', { name: 'Configure' }).click()
  await expect(page.getByText('Custom Integration Builder')).toBeVisible()
  await expect(page.locator('input[value="Meritto"]')).toBeVisible()
})


test('built-in agent opens its live operational module', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await page.getByLabel('Dashboard sections').getByRole('button', { name: 'Lead & Conversion', exact: true }).click()
  await openWorkspaceTab(page,'Agents')
  const leadGradingAgent=page.locator('.agent-selector').getByRole('button', { name: /Lead Grading/ }).first()
  await expect(leadGradingAgent).toBeVisible()
  await leadGradingAgent.click()
  await expect(page.locator('.agent-config').getByText('Operational prerequisites')).toBeVisible()
  await page.locator('.agent-config').getByRole('button', { name: /Open lead grading/ }).click()
  await expect(page.getByRole('heading', { name: 'Lead grading' })).toBeVisible()
})


test('funnel period control updates backend-filtered workspace', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await page.getByLabel('Dashboard sections').getByRole('button', { name: 'Tracking & Data', exact: true }).click()
  await openWorkspaceTab(page,'Funnel')
  await expect(page.getByRole('heading', { name: 'Channel, account & campaign funnel' })).toBeVisible()
  await page.getByLabel('Funnel period').selectOption('Last 90 days')
  await expect(page.getByText('90 day window')).toBeVisible()
})


test('reports list reflects persisted schedules instead of static claims', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await page.getByLabel('Dashboard sections').getByRole('button', { name: 'Measurement & Intelligence', exact: true }).click()
  await openWorkspaceTab(page,'Reports')
  await expect(page.getByRole('heading', { name: 'Cohort & automated reports' })).toBeVisible()
  await expect(page.getByText('Cohort Performance', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Paid Funnel Performance', { exact: true })).toHaveCount(0)
})


test('attribution period selector requests a new backend window', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Attribution')
  await expect(page.getByRole('heading', { name: 'Full-path attribution' })).toBeVisible()
  await page.getByRole('button', { name: 'Last 30 days', exact: true }).click()
  await expect(page.getByText('90 day window', { exact: false })).toBeVisible()
})


test('AdSync creates and operates a persisted conversion pipeline', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'AdSync')
  await expect(page.getByRole('heading', { name: 'Server-side signal activation' })).toBeVisible()
  await page.getByRole('button', { name: 'Add pipeline' }).click()
  const form=page.locator('.connector-card')
  const pipelineName='CI Qualified Lead '+testInfo.project.name
  const outputEvent='qualified_lead_'+testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()
  await form.getByLabel('Pipeline name').fill(pipelineName)
  await form.getByLabel('Source event').fill('lead.qualified')
  await form.getByLabel('Output event').fill(outputEvent)
  await form.locator('select[name="destination"]').selectOption('Meta Ads')
  const responsePromise=page.waitForResponse(r=>r.url().includes('/api/events/rules')&&r.request().method()==='POST')
  await form.getByRole('button', { name: 'Create pipeline' }).click()
  const response=await responsePromise
  expect(response.ok()).toBeTruthy()
  await expect(page.getByText('Conversion pipeline rule created.', { exact: true })).toBeVisible()
  await expect(page.locator('.agent-selector').getByText(pipelineName, { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Send test source event/ })).toBeVisible()
})


test('conversion adjustments stay empty until a real adjustment is created', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Adjustments')
  await expect(page.locator('.product-body h1')).toHaveText('Conversion adjustments')
  await page.getByRole('button', { name: 'New adjustment' }).click()
  await page.getByLabel('Event').fill('ci_partial_payment')
  await page.getByLabel('Source').fill('ci_crm')
  await page.getByLabel('Destination').selectOption('google_ads')
  await page.getByLabel('Original value').fill('1000')
  await page.getByLabel('Adjusted value').fill('2500')
  await page.getByLabel('Reason').fill('CI verified final payment received')
  await page.getByRole('button', { name: 'Create adjustment' }).click()
  await expect(page.locator('.adjustment-list').getByText('Ci Partial Payment', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preview payload' })).toBeVisible()
})


test('custom routing rule persists and drives selected-rule test', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Routing')
  await expect(page.getByRole('heading', { name: 'Lead routing' })).toBeVisible()
  await page.getByRole('button', { name: 'New routing rule' }).click()
  await page.getByLabel('Rule name').fill('CI Enterprise Lead')
  await page.getByLabel('Condition').fill('score >= 90')
  await page.getByLabel('Destination').fill('CI Enterprise Queue')
  await page.getByLabel('SLA seconds').fill('120')
  await page.getByRole('button', { name: 'Create routing rule' }).click()
  await expect(page.locator('.routing-list').getByText('CI Enterprise Lead', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Test selected rule' }).click()
  await expect(page.locator('.delivery-notice').getByText(/CI Enterprise Queue/)).toBeVisible()
})


test('meetings can be scheduled directly from the meetings workspace', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Meetings')
  await expect(page.getByRole('heading', { name: 'Scheduler & meeting reminders' })).toBeVisible()
  await page.locator('.page-head').getByRole('button', { name: 'Schedule meeting' }).click()
  const meetingLead='ci_meeting_'+testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()
  await page.getByLabel('Lead reference').fill(meetingLead)
  const dt=new Date(Date.now()+24*60*60*1000)
  const local=dt.toISOString().slice(0,16)
  await page.getByLabel('Start time').fill(local)
  await page.getByLabel('Owner').fill('CI Counsellor')
  await page.getByLabel('Attendee email').fill('ci-meeting@example.com')
  await page.getByLabel('Calendar sync').selectOption('no')
  await page.locator('.connector-card').getByRole('button', { name: 'Schedule meeting' }).click()
  await expect(page.getByText('Meeting scheduled.', { exact: true })).toBeVisible()
  await expect(page.locator('.meeting-list').getByText(meetingLead, { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send reminder now' })).toBeVisible()
})


test('matchback rules persist without seeded performance claims', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Matchback')
  await expect(page.getByRole('heading', { name: 'Closure matchback & revenue reconciliation' })).toBeVisible()
  await expect(page.getByText('₹84.0L', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'New matchback rule' }).click()
  const ruleName='CI Closed Won '+testInfo.project.name
  await page.getByLabel('Rule name').fill(ruleName)
  await page.getByLabel('Source').fill('ci_crm')
  await page.getByLabel('Event type').fill('closed_won')
  await page.getByLabel('Destination').fill('Google Ads')
  await page.getByLabel('Identity method').fill('customer_id + gclid')
  await page.getByRole('button', { name: 'Create matchback rule' }).click()
  await expect(page.getByText('Matchback rule created.', { exact: true })).toBeVisible()
  await expect(page.locator('.matchback-list').getByText(ruleName, { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run reconciliation' })).toBeVisible()
})


test('journey explorer renders stitched chronology', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  const suffix=testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()
  const leadRef='ci_journey_'+suffix
  const leadName='CI Journey '+testInfo.project.name
  const followReason='CI chronology '+testInfo.project.name
  const upsert=await page.request.post('/api/enrich/upsert',{data:{externalLeadId:leadRef,name:leadName,source:'Google Ads',campaign:'CI Search',crmStage:'qualified',journeyDepth:2,lastActivity:new Date().toISOString()}})
  expect(upsert.ok()).toBeTruthy()
  const follow=await page.request.post('/api/follow-ups',{data:{leadRef,reason:followReason,channel:'Email',priority:'medium',delayMinutes:30,owner:'CI Owner'}})
  expect(follow.ok()).toBeTruthy()
  await openWorkspaceTab(page,'Journeys')
  await expect(page.getByRole('heading', { name: 'Customer journey explorer' })).toBeVisible()
  await expect(page.getByText(leadName, { exact: true }).first()).toBeVisible()
  const detail=page.locator('.journey-detail')
  await expect(detail.getByText('Stitched chronology')).toBeVisible()
  await expect(detail.getByText(followReason, { exact: true }).first()).toBeVisible()
  await expect(detail.getByText(/Journey timeline source/)).toHaveCount(0)
})


test('offline attribution rules persist and test through the attribution store', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Offline Attribution')
  await expect(page.getByRole('heading', { name: 'Calls, WhatsApp & offline revenue' })).toBeVisible()
  await page.getByRole('button', { name: 'New offline rule' }).click()
  const offlineForm=page.locator('.offline-builder')
  await offlineForm.getByLabel('Conversion').fill('CI Offline Sale')
  await offlineForm.getByLabel('Source').fill('CI POS')
  await offlineForm.getByLabel('Matching method').fill('customer_id + click history')
  await offlineForm.getByLabel('Identifier').fill('Customer ID / GCLID')
  await page.getByRole('button', { name: 'Create offline rule' }).click()
  await expect(page.locator('.matchback-list').getByText('CI Offline Sale', { exact: true }).first()).toBeVisible()
  await page.getByLabel('Customer ID').fill('ci_offline_customer')
  await page.getByRole('button', { name: 'Send offline test event' }).click()
  await expect(page.getByText(/Test event recorded with status/)).toBeVisible()
})


test('site operations add a property and show evidence-aware installation test', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Sites')
  await expect(page.getByRole('heading', { name: 'Site & pixel operations' })).toBeVisible()
  await page.getByRole('button', { name: 'Add site' }).click()
  await page.getByLabel('Domain').fill('ci-tracking.example.com')
  await page.getByLabel('Environment').selectOption('staging')
  await page.getByRole('button', { name: 'Save tracked site' }).click()
  await expect(page.locator('.site-list').getByText('ci-tracking.example.com', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Test installation' }).click()
  await expect(page.getByText('Pixel events observed', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Evidence verified|Retest installation/ })).toBeVisible()
})


test('POS import computes match coverage from transaction rows', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'POS & Stores')
  await expect(page.getByRole('heading', { name: 'POS, walk-in & store-sale attribution' })).toBeVisible()
  await page.locator('.page-head').getByRole('button', { name: 'Import POS batch' }).click()
  await expect(page.getByLabel('Matched records')).toHaveCount(0)
  const suffix=testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toUpperCase()
  const storeId='CI-STORE-'+suffix
  const storeName='CI Store '+testInfo.project.name
  await page.getByLabel('Store ID').fill(storeId)
  await page.getByLabel('Store name').fill(storeName)
  await page.getByLabel('CSV transactions').fill('transaction_id,customer_id,email,phone,net_revenue,currency,occurred_at,gclid,fbclid\nCI-TXN-'+suffix+',ci_pos_'+suffix.toLowerCase()+',,,12500,INR,2026-09-26T10:00:00Z,,')
  await page.getByRole('button', { name: 'Process transaction batch' }).click()
  await expect(page.getByText(/POS batch processed:/)).toBeVisible()
  await expect(page.locator('.pos-list').getByText(storeName, { exact: true }).first()).toBeVisible()
})


test('custom model can be created and run from workspace evidence', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Models')
  await expect(page.getByRole('heading', { name: 'Custom models' })).toBeVisible()
  await page.getByRole('button', { name: 'Create custom model' }).click()
  await page.getByLabel('Model name').fill('CI Intent Model')
  await page.getByLabel('Description').fill('CI explainable intent scoring model')
  await page.getByLabel('Lead score weight').fill('50')
  await page.getByLabel('Journey depth weight').fill('20')
  await page.getByLabel('Pricing views weight').fill('20')
  await page.getByLabel('WhatsApp engaged weight').fill('5')
  await page.getByLabel('Meeting present weight').fill('5')
  await page.locator('.connector-card').getByRole('button', { name: 'Create custom model' }).click()
  await expect(page.locator('.model-list').getByText('CI Intent Model', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Explainable feature weights')).toBeVisible()
  await page.getByRole('button', { name: 'Run scoring snapshot' }).click()
  await expect(page.getByText(/Model run completed for/)).toBeVisible()
})


test('feed enhancement persists destination mappings and previews payload', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Feed')
  await expect(page.getByRole('heading', { name: 'Feed & payload enhancement' })).toBeVisible()
  await page.getByRole('button', { name: 'Add attribute' }).first().click()
  const attribute='ci_customer_tier_'+testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()
  await page.getByLabel('Key').fill(attribute)
  await page.getByLabel('Source').fill('custom')
  await page.getByLabel('Example value').fill('high_ltv')
  await page.locator('.connector-card').getByRole('button', { name: 'Save attribute' }).click()
  await expect(page.getByText(attribute, { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'New mapping' }).click()
  await page.getByLabel('Source attribute').selectOption(attribute)
  const mappingForm=page.locator('.connector-card')
  await mappingForm.locator('select[name="destination"]').selectOption('Meta Ads')
  await mappingForm.getByLabel('Destination field').fill('customer_tier')
  await page.locator('.connector-card').getByRole('button', { name: 'Save feed mapping' }).click()
  await expect(page.getByText(/Meta Ads · customer_tier/).first()).toBeVisible()
  const metaDestination=page.locator('.health-line').filter({hasText:'Meta Ads'}).first()
  await metaDestination.getByRole('button', { name: 'Preview' }).click()
  await expect(page.getByText('Enhanced payload preview')).toBeVisible()
  await expect(page.locator('.code-block')).toContainText('customer_tier')
})


test('integration catalog search and connector request persist', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Integrations')
  await expect(page.getByRole('heading', { name: 'Platform-agnostic connectivity' })).toBeVisible()
  const search=page.getByLabel('Search integration catalog')
  await search.fill('Snowflake')
  await expect(page.getByText('Snowflake', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Configurable adapter', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Request connector' }).click()
  const form=page.locator('.integration-request-form')
  const connector='CI Connector '+testInfo.project.name
  await form.getByLabel('Connector name').fill(connector)
  await form.getByLabel('Business need').fill('CI needs a governed bidirectional connector for attribution and activation data.')
  await form.getByLabel('Direction').selectOption('Bidirectional')
  await form.getByLabel('Priority').selectOption('High')
  await form.getByRole('button', { name: 'Submit connector request' }).click()
  await expect(page.getByText('Connector request submitted and tracked in this workspace.', { exact: true })).toBeVisible()
})


test('public integration catalog search exposes expanded categories', async ({ page }) => {
  await page.goto('/#/integrations')
  await dismissConsent(page)
  await expect(page.getByRole('heading', { name: 'Connect the systems your teams already depend on.' })).toBeVisible()
  const search=page.getByLabel('Search public integrations')
  await search.fill('Snowflake')
  await expect(page.getByText('Snowflake', { exact: true })).toBeVisible()
  await search.fill('TikTok')
  await expect(page.getByText('TikTok Ads', { exact: true })).toBeVisible()
})


test('workspace quick navigator searches and opens dashboard sections', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)

  const trigger=page.getByRole('button', { name: 'Open dashboard section navigator' })
  await expect(trigger).toBeVisible()
  await trigger.click()

  const search=page.getByLabel('Search dashboard sections')
  await expect(search).toBeFocused()
  await search.fill('attribution')
  const navigator=page.getByRole('dialog', { name: 'Dashboard section navigator' })
  const attributionButton=navigator.locator('button').filter({has:page.getByText('Attribution',{exact:true})}).first()
  await expect(attributionButton).toBeVisible()
  await attributionButton.click()
  await expect(page.getByRole('heading', { name: 'Full-path attribution' })).toBeVisible()

  await page.keyboard.press('Control+K')
  await expect(search).toBeVisible()
  await search.fill('Monitoring')
  const navigator2=page.getByRole('dialog', { name: 'Dashboard section navigator' })
  const monitoringButton=navigator2.locator('button').filter({has:page.getByText('Monitoring',{exact:true})}).first()
  await expect(monitoringButton).toBeVisible()
  await monitoringButton.click()
  await expect(page.getByRole('heading', { name: 'Platform monitoring' })).toBeVisible()
})


test('business event template prefills and persists a real rule', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Events')
  await expect(page.getByRole('heading', { name: 'Conversion event manager' })).toBeVisible()

  await page.getByRole('button', { name: 'Commerce' }).click()
  const template=page.locator('.template-card').filter({hasText:'High-value Purchase'}).first()
  await expect(template).toBeVisible()
  await template.getByRole('button', { name: 'Use template' }).click()

  const form=page.locator('.connector-card')
  const unique='CI High-value Purchase '+testInfo.project.name
  await expect(form.getByLabel('Source event')).toHaveValue('purchase')
  await expect(form.getByLabel('Output event')).toHaveValue('high_value_purchase')
  await expect(form.getByLabel('Condition field')).toHaveValue('value')
  await form.getByLabel('Rule name').fill(unique)
  await expect(form.getByText(/When/)).toContainText('high_value_purchase')
  await form.getByRole('button', { name: 'Create & enable rule' }).click()

  await expect(page.getByText('Event rule created and enabled.', { exact: true })).toBeVisible()
  await expect(page.getByText(unique, { exact: true }).first()).toBeVisible()
})


test('all workspace sections render without a frontend crash', async ({ page }) => {
  const pageErrors:string[]=[]
  page.on('pageerror', error=>pageErrors.push(error.message))
  await page.goto('/#/workspace')
  await dismissConsent(page)

  const tabs=[
    'Launchpad','Overview','AdSync','Funnel','Events','Adjustments','Diagnostics','Fraud','Deep Links','Sites','Fingerprinting',
    'Live Sync','Data Hub','Offline Attribution','Matchback','POS & Stores','Journeys','Identity','Models','Attribution','Planner','Reports',
    'Enrich','Lead Grading','Behavior','Feed','Agents','Routing','Follow-ups','Calls','Meetings','Feedback','Approvals','Ask Ace',
    'Integrations','Audiences','Delivery','Monitoring','Alerts','Developers','Settings'
  ]

  for(const tab of tabs){
    await page.evaluate(name=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:name})),tab)
    await expect(page.locator('.product-body')).toBeVisible()
    await expect.poll(async()=>((await page.locator('.product-body').innerText()).trim().length),{message:'Expected '+tab+' to render content'}).toBeGreaterThan(20)
  }

  expect(pageErrors).toEqual([])
})


test('attribution workspace ranks persisted channel and campaign evidence', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  const suffix=testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()
  const customerId='ci_attr_customer_'+suffix
  const source='ci_search_'+suffix
  const campaign='ci_revenue_'+suffix
  const gclid='ci_gclid_'+suffix+'_'+Date.now()

  const click=await page.request.post('/api/track',{data:{
    event:'page_view',
    visitorId:'ci_attr_visitor_'+suffix,
    customerId,
    gclid,
    utm_source:source,
    utm_medium:'cpc',
    utm_campaign:campaign,
    landingUrl:'https://example.com/pricing',
    eventCategory:'essential'
  }})
  expect(click.ok()).toBeTruthy()

  const outcome=await page.request.post('/api/assisted-events',{data:{
    eventType:'closed_won',
    source:'crm',
    customerId,
    gclid,
    value:12500,
    currency:'INR',
    idempotencyKey:'ci_attr_outcome_'+suffix+'_'+Date.now()
  }})
  expect(outcome.ok()).toBeTruthy()

  await openWorkspaceTab(page,'Attribution')
  await expect(page.getByRole('heading', { name: 'Full-path attribution' })).toBeVisible()
  await expect(page.getByText(source, { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Campaigns', exact: true }).click()
  await expect(page.getByText(campaign, { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Match evidence', exact: true }).click()
  await expect(page.getByText('closed won', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/12500|12,500/).first()).toBeVisible()
})


test('custom agent can execute a governed routing test', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Agents')
  await expect(page.getByRole('heading', { name: 'Agent operations' })).toBeVisible()

  await page.getByRole('button', { name: 'Build custom agent' }).click()
  const form=page.locator('.custom-agent-builder')
  const name='CI Routing Agent '+testInfo.project.name
  await form.getByLabel('Agent name').fill(name)
  await form.getByLabel('Trigger').selectOption('Lead becomes qualified')
  await form.getByLabel('Action').selectOption('Route to sales queue')
  await form.getByLabel('Approval').selectOption('Auto-run low risk')
  await form.getByRole('button', { name: 'Create agent' }).click()

  await expect(page.getByText('Custom agent created and activated.', { exact: true })).toBeVisible()
  await expect(page.locator('.agent-selector').getByText(name, { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Test agent' }).click()

  const tester=page.locator('.custom-agent-test')
  await tester.getByLabel('Lead / entity reference').fill('ci_agent_lead_'+testInfo.project.name)
  await tester.getByLabel('Lead score').fill('93')
  await tester.getByLabel('Source').fill('CI Website')
  await tester.getByLabel('Routing destination').fill('CI Sales Queue')
  await tester.getByRole('button', { name: 'Run test' }).click()

  await expect(page.getByText('Custom agent test completed and persisted as an agent run.', { exact: true })).toBeVisible()
  await expect(page.getByText('Last test succeeded', { exact: true })).toBeVisible()
  await expect(page.getByText(/CI Sales Queue/)).toBeVisible()

  await openWorkspaceTab(page,'Routing')
  await expect(page.getByText('CI Sales Queue', { exact: true }).first()).toBeVisible()
})


test('audience waste-control preset materializes a real suppression segment', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  const suffix=testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()+'_'+Date.now()
  const cLead='ci_audience_c_'+suffix
  const dLead='ci_audience_d_'+suffix

  for(const [lead,grade] of [[cLead,'C'],[dLead,'D']] as const){
    const upsert=await page.request.post('/api/enrich/upsert',{data:{
      externalLeadId:lead,
      name:'Audience '+grade+' '+suffix,
      source:'CI',
      crmStage:'lead',
      journeyDepth:1,
      lastActivity:new Date().toISOString()
    }})
    expect(upsert.ok()).toBeTruthy()
    const override=await page.request.post('/api/lead-grading/override',{data:{lead,grade}})
    expect(override.ok()).toBeTruthy()
  }

  await openWorkspaceTab(page,'Audiences')
  await expect(page.getByRole('heading',{name:'Audience management'})).toBeVisible()
  const preset=page.locator('.audience-preset-row').filter({hasText:'Low-quality leads'}).first()
  await expect(preset).toBeVisible()
  await preset.click()

  const form=page.locator('.audience-builder')
  await expect(form.getByText('Audience preset')).toBeVisible()
  await expect(form.getByLabel('Operator')).toHaveValue('is one of')
  await expect(form.getByLabel('Value')).toHaveValue('C,D')
  await expect(form.getByLabel('Mode')).toHaveValue('Suppress')
  await expect(form.locator('.audience-preview')).toBeVisible()
  const estimated=Number((await form.locator('.audience-preview strong').first().innerText()).replace(/,/g,''))
  expect(estimated).toBeGreaterThanOrEqual(2)

  await form.getByRole('button',{name:'Create & materialize audience'}).click()
  await expect(page.getByText('Audience created and materialized.',{exact:true})).toBeVisible()
  const row=page.locator('.audience-row').filter({hasText:'Low-quality lead suppression'}).first()
  await expect(row).toBeVisible()
  await expect(row).toContainText('Suppress')
})


test('behavior workspace analyzes persisted source campaign and device evidence', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  const suffix=testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()+'_'+Date.now()
  const source='ci_behavior_source_'+suffix
  const campaign='ci_behavior_campaign_'+suffix
  const visitor='ci_behavior_visitor_'+suffix

  for(const [event,device] of [['page_view','desktop'],['pricing_view','mobile'],['consultation_booked','mobile']] as const){
    const response=await page.request.post('/api/track',{data:{
      event,
      eventCategory:'essential',
      visitorId:visitor,
      deviceId:visitor+'_device',
      devicePlatform:device,
      utm_source:source,
      utm_medium:'cpc',
      utm_campaign:campaign,
      occurredAt:new Date().toISOString()
    }})
    expect(response.ok()).toBeTruthy()
  }

  const evidenceResponse=await page.request.get('/api/behavior')
  expect(evidenceResponse.ok()).toBeTruthy()
  const evidence=await evidenceResponse.json()
  expect((evidence.sources||[]).some((x:any)=>x.name===source)).toBeTruthy()
  expect((evidence.campaigns||[]).some((x:any)=>x.name===campaign)).toBeTruthy()

  await openWorkspaceTab(page,'Behavior')
  await expect(page.getByRole('heading',{name:'Website & app behavior'})).toBeVisible()
  const refreshResponse=page.waitForResponse(r=>r.url().includes('/api/behavior')&&r.request().method()==='GET')
  await page.getByRole('button',{name:'Refresh',exact:true}).click()
  const refreshed=await refreshResponse
  expect(refreshed.ok()).toBeTruthy()
  const refreshedPayload=await refreshed.json()
  expect((refreshedPayload.sources||[]).some((x:any)=>x.name===source)).toBeTruthy()
  await expect(page.getByText('Persisted workspace event window',{exact:true})).toBeVisible()

  const behaviorTabs=page.locator('.behavior-tabs')
  await behaviorTabs.getByRole('button',{name:'Sources',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Acquisition sources'})).toBeVisible()
  await expect(page.locator('.behavior-analysis-row').first()).toBeVisible()

  await behaviorTabs.getByRole('button',{name:'Campaigns',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Campaign behavior'})).toBeVisible()
  await expect(page.locator('.behavior-analysis-row').first()).toBeVisible()

  await behaviorTabs.getByRole('button',{name:'Devices',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Device behavior'})).toBeVisible()
  await expect(page.locator('.behavior-analysis-row').first()).toBeVisible()

  await behaviorTabs.getByRole('button',{name:'Events',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Behavior events'})).toBeVisible()
  await expect(page.locator('.behavior-analysis-row').first()).toBeVisible()
})


test('CRM enrichment selects a persisted lead and queues writeback evidence', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  const suffix=testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()+'_'+Date.now()
  const lead='ci_enrich_'+suffix
  const created=await page.request.post('/api/enrich/upsert',{data:{
    externalLeadId:lead,
    name:'CI Enrichment '+suffix,
    source:'Google Ads',
    campaign:'CI High Intent',
    crmStage:'qualified',
    journeyDepth:4,
    pricingPageViews:2,
    conversionPropensity:82,
    ltvTier:'high',
    callSummary:'Qualified on pricing and implementation timeline.',
    whatsappSummary:'Requested a product demo and pricing details.'
  }})
  expect(created.ok()).toBeTruthy()

  await openWorkspaceTab(page,'Enrich')
  await expect(page.getByRole('heading',{name:'CRM enrichment'})).toBeVisible()
  const search=page.getByLabel('Search enriched leads')
  await search.fill(lead)
  const leadButton=page.locator('.enrich-leads>button').filter({hasText:'CI Enrichment '+suffix}).first()
  await expect(leadButton).toBeVisible()
  await leadButton.click()
  await expect(page.locator('.enrich-profile')).toContainText('CI High Intent')
  await expect(page.locator('.enrich-profile')).toContainText('qualified')

  const responsePromise=page.waitForResponse(r=>r.url().includes('/api/enrich/writeback')&&r.request().method()==='POST')
  await page.getByRole('button',{name:'Write to HubSpot',exact:true}).click()
  const response=await responsePromise
  expect(response.status()).toBe(202)
  await expect(page.getByText(/CRM writeback queued to HubSpot/)).toBeVisible()
  await expect(page.locator('.enrich-writeback-row').filter({hasText:'HubSpot'}).first()).toContainText('queued')
})


test('lead grading activation creates a persisted downstream operation', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  const suffix=testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()+'_'+Date.now()
  const lead='ci_grade_'+suffix
  const created=await page.request.post('/api/enrich/upsert',{data:{
    externalLeadId:lead,
    name:'CI Grade '+suffix,
    source:'Google Ads',
    campaign:'CI Grade Campaign',
    crmStage:'qualified',
    journeyDepth:5,
    pricingPageViews:3,
    conversionPropensity:95
  }})
  expect(created.ok()).toBeTruthy()

  const override=await page.request.post('/api/lead-grading/override',{data:{lead,grade:'A'}})
  expect(override.ok()).toBeTruthy()

  await openWorkspaceTab(page,'Lead Grading')
  await expect(page.getByRole('heading',{name:'Lead grading'})).toBeVisible()
  const row=page.locator('.grading-list>button').filter({hasText:'CI Grade '+suffix}).first()
  await expect(row).toBeVisible()
  await row.click()
  await page.getByRole('button',{name:'Use grade in activation'}).click()

  await expect(page.getByText(/Grade A activation created a persisted routing/)).toBeVisible()
  const result=page.locator('.grade-activation-result')
  await expect(result).toContainText('Priority sales queue')
  await result.getByRole('button',{name:/Open Routing/}).click()
  await expect(page.getByRole('heading',{name:'Lead routing'})).toBeVisible()
  await expect(page.getByText('Priority sales queue',{exact:true}).first()).toBeVisible()
})


test('feedback insight routing creates a recovery follow-up task', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  const suffix=testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()+'_'+Date.now()
  const lead='ci_feedback_'+suffix

  const recorded=await page.request.post('/api/feedback',{data:{
    lead,
    score:2,
    channel:'Post-call',
    theme:'Pricing objection',
    response:'Pricing felt too high for the current package.'
  }})
  expect(recorded.ok()).toBeTruthy()

  await openWorkspaceTab(page,'Feedback')
  await expect(page.getByRole('heading',{name:'Feedback agent'})).toBeVisible()
  const card=page.locator('.feedback-grid article').filter({hasText:lead}).first()
  await expect(card).toBeVisible()
  await card.getByRole('button',{name:'Route insight',exact:true}).click()

  await expect(page.getByText('Feedback routed into a persisted follow-up task.',{exact:true})).toBeVisible()
  const result=page.locator('.feedback-route-result')
  await expect(result).toContainText('Customer recovery')
  await result.getByRole('button',{name:/Open Follow-ups/}).click()
  await expect(page.getByRole('heading',{name:'Follow-up operations'})).toBeVisible()
  await expect(page.getByText(lead,{exact:true}).first()).toBeVisible()
})


test('voice qualification can be queued from the Calls workspace', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Calls')
  await expect(page.getByRole('heading',{name:'Voice qualification & call tracking'})).toBeVisible()

  await page.getByRole('button',{name:'Start qualification',exact:true}).click()
  const form=page.locator('.qualification-builder')
  const suffix=testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()+'_'+Date.now()
  const lead='CI Voice '+suffix
  await form.getByLabel('Lead reference').fill(lead)
  await form.getByLabel('Phone number').fill('+919999999999')
  await form.getByLabel('Source').fill('CI Website')
  await form.getByLabel('Initial intent score').fill('82')

  const responsePromise=page.waitForResponse(r=>r.url().includes('/api/qualification-calls')&&r.request().method()==='POST'&&!r.url().includes('/retry'))
  await form.getByRole('button',{name:'Queue qualification call'}).click()
  const response=await responsePromise
  expect(response.status()).toBe(202)
  await expect(page.getByText(/Qualification call queued through the durable voice-agent worker/)).toBeVisible()
  await expect(page.locator('.call-list').getByText(lead,{exact:true}).first()).toBeVisible()
})


test('Ask Ace reports grounded funnel handoff coverage', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  const suffix=testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()+'_'+Date.now()
  const lead='ci_ask_funnel_'+suffix

  const created=await page.request.post('/api/enrich/upsert',{data:{
    externalLeadId:lead,
    name:'CI Ask Funnel '+suffix,
    source:'Google Ads',
    campaign:'CI Ask Funnel Campaign',
    crmStage:'lead',
    journeyDepth:2,
    pricingPageViews:1
  }})
  expect(created.ok()).toBeTruthy()

  const apiResponse=await page.request.post('/api/ask-ace',{data:{question:'Where is the funnel dropping between lead and revenue?'}})
  expect(apiResponse.ok()).toBeTruthy()
  const payload=await apiResponse.json()
  expect(payload.intent).toBe('funnel_monitoring')
  expect(payload.grounded).toBeTruthy()
  expect((payload.insights||[]).some((x:any)=>x.label==='Lead profiles'&&Number(x.value)>=1)).toBeTruthy()

  await openWorkspaceTab(page,'Ask Ace')
  await expect(page.getByRole('heading',{name:'Journey & attribution assistant'})).toBeVisible()
  await page.getByRole('button',{name:'Where is the funnel dropping between lead and revenue?',exact:true}).click()
  await expect(page.getByText('funnel monitoring',{exact:true})).toBeVisible()
  await expect(page.locator('.ask-insights').last()).toContainText('Lead profiles')
  await expect(page.locator('.ask-insights').last()).toContainText('Routed leads')
  await expect(page.locator('.ask-insights').last()).toContainText('Meetings scheduled')
})


test('repeat purchase and abandoned checkout templates are executable', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Events')
  await expect(page.getByRole('heading',{name:'Conversion event manager'})).toBeVisible()

  await page.getByRole('button',{name:'Commerce',exact:true}).click()

  const repeatCard=page.locator('.template-card').filter({has:page.getByText('Repeat Purchase',{exact:true})}).first()
  await expect(repeatCard).toBeVisible()
  await repeatCard.getByRole('button',{name:'Use template'}).click()
  const builder=page.locator('.audience-builder')
  await expect(builder.getByLabel('Source event')).toHaveValue('purchase')
  await expect(builder.getByLabel('Condition field')).toHaveValue('properties.purchaseCount')
  await expect(builder.getByLabel('Operator')).toHaveValue('gte')
  await expect(builder.getByLabel('Condition value')).toHaveValue('2')
  await builder.getByLabel('Rule name').fill('CI Repeat Purchase '+testInfo.project.name)
  await builder.getByRole('button',{name:'Create & enable rule'}).click()
  await expect(page.getByText('Event rule created and enabled.',{exact:true})).toBeVisible()

  const abandonedCard=page.locator('.template-card').filter({has:page.getByText('Abandoned Checkout',{exact:true})}).first()
  await expect(abandonedCard).toBeVisible()
  await expect(abandonedCard).toContainText('commerce webhook/backend')
  await abandonedCard.getByRole('button',{name:'Use template'}).click()
  const abandonedBuilder=page.locator('.audience-builder')
  await expect(abandonedBuilder.getByLabel('Source event')).toHaveValue('checkout_abandoned')
  await expect(abandonedBuilder.getByLabel('Operator')).toHaveValue('exists')
})


test('signal-return quick starts create real pipelines and open live modules', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'AdSync')
  await expect(page.getByRole('heading',{name:'Server-side signal activation'})).toBeVisible()

  const metaCard=page.locator('.signal-agent-quickstarts article').filter({hasText:'Meta Advanced CAPI'}).first()
  await expect(metaCard).toBeVisible()
  await metaCard.getByRole('button',{name:'Install pipeline',exact:true}).click()
  await expect(page.getByText('Meta Advanced CAPI pipeline created. Connect provider credentials before expecting external delivery.',{exact:true})).toBeVisible()
  await expect(page.locator('.agent-selector').getByText('Meta Advanced CAPI · Qualified Lead',{exact:true}).first()).toBeVisible()
  await expect(page.locator('.agent-config')).toContainText('Meta Ads')

  const callCard=page.locator('.signal-agent-quickstarts article').filter({hasText:'Call Tracking Events'}).first()
  await callCard.getByRole('button',{name:'Open module',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Voice qualification & call tracking'})).toBeVisible()
})


test('funnel supports account-level drilldown and stage conversion rates', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  const suffix=testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()+'_'+Date.now()
  const alphaLead='ci_funnel_alpha_'+suffix
  const betaLead='ci_funnel_beta_'+suffix

  const alpha=await page.request.post('/api/enrich/upsert',{data:{
    externalLeadId:alphaLead,
    name:'Alpha Lead '+suffix,
    source:'Google Ads',
    campaign:'Campaign Alpha',
    crmStage:'consultation',
    journeyDepth:4,
    attributes:{adAccountName:'Account Alpha'}
  }})
  expect(alpha.ok()).toBeTruthy()

  const beta=await page.request.post('/api/enrich/upsert',{data:{
    externalLeadId:betaLead,
    name:'Beta Lead '+suffix,
    source:'Google Ads',
    campaign:'Campaign Beta',
    crmStage:'lead',
    journeyDepth:1,
    attributes:{adAccountName:'Account Beta'}
  }})
  expect(beta.ok()).toBeTruthy()

  const meeting=await page.request.post('/api/meetings',{data:{
    leadRef:alphaLead,
    startsAt:new Date(Date.now()+60*60*1000).toISOString(),
    owner:'CI Counsellor',
    reminderPlan:['voice'],
    syncCalendar:false
  }})
  expect(meeting.ok()).toBeTruthy()

  const apiResponse=await page.request.get('/api/funnel?account=Account%20Alpha&periodDays=30')
  expect(apiResponse.ok()).toBeTruthy()
  const payload=await apiResponse.json()
  expect(payload.filters.account).toBe('Account Alpha')
  expect(payload.campaigns.some((x:any)=>x.name==='Campaign Alpha'&&x.account==='Account Alpha')).toBeTruthy()
  expect(payload.campaigns.some((x:any)=>x.name==='Campaign Beta')).toBeFalsy()
  expect(payload.stageRates.leadToQualified).toBeGreaterThan(0)

  await openWorkspaceTab(page,'Funnel')
  await expect(page.getByRole('heading',{name:'Channel, account & campaign funnel'})).toBeVisible()
  await page.getByLabel('Funnel account').selectOption('Account Alpha')
  await expect(page.getByLabel('Funnel account')).toHaveValue('Account Alpha')
  await expect(page.getByText('Campaign Alpha',{exact:true}).first()).toBeVisible()
  await expect(page.locator('.funnel-campaign-detail')).toContainText('Account Alpha')
  await expect(page.locator('.funnel-campaign-detail')).toContainText('Lead → Qualified')
})


test('alert center shows owner affected period and investigation runbook', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)

  const rule=await page.request.post('/api/monitoring-rules',{data:{
    metric:'tracking_inactivity_minutes',
    operator:'gt',
    threshold:-1,
    severity:'warning',
    windowMinutes:30,
    enabled:true
  }})
  expect(rule.ok()).toBeTruthy()

  const alertsResponse=await page.request.get('/api/alerts')
  expect(alertsResponse.ok()).toBeTruthy()
  const alertsPayload=await alertsResponse.json()
  const incident=(alertsPayload.items||[]).find((x:any)=>x.metric==='tracking_inactivity_minutes'&&x.status==='open')
  expect(incident).toBeTruthy()
  expect(incident.owner).toBe('Tracking / analytics owner')
  expect(incident.recommendation).toContain('site/app installation')

  await openWorkspaceTab(page,'Alerts')
  await expect(page.getByRole('heading',{name:'Alert Center'})).toBeVisible()
  const alertButton=page.locator('.alert-center-list>button').filter({hasText:'Tracking activity has gone quiet'}).first()
  await expect(alertButton).toBeVisible()
  await alertButton.click()

  const detail=page.locator('.alert-center-detail')
  await expect(detail).toContainText('Tracking / analytics owner')
  await expect(detail).toContainText('30 minute monitoring window')
  await expect(detail).toContainText('Recommended investigation')
  await expect(detail).toContainText('site/app installation')

  await detail.getByRole('button',{name:'Mark resolved'}).click()
  await expect(detail).toContainText('Resolved')

  const restore=await page.request.post('/api/monitoring-rules',{data:{
    metric:'tracking_inactivity_minutes',
    operator:'gt',
    threshold:30,
    severity:'warning',
    windowMinutes:30,
    enabled:true
  }})
  expect(restore.ok()).toBeTruthy()
})


test('lead reactivation converts renewed intent into a governed follow-up', async ({ page }, testInfo) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  const suffix=testInfo.project.name.replace(/[^a-z0-9]+/gi,'_').toLowerCase()+'_'+Date.now()
  const lead='ci_reactivate_'+suffix
  const device='ci_reactivate_device_'+suffix
  const oldActivity=new Date(Date.now()-45*24*60*60*1000).toISOString()

  const created=await page.request.post('/api/enrich/upsert',{data:{
    externalLeadId:lead,
    name:'CI Dormant Lead '+suffix,
    deviceId:device,
    source:'Google Ads',
    campaign:'Dormant Search',
    crmStage:'lead',
    journeyDepth:1,
    lastActivity:oldActivity
  }})
  expect(created.ok()).toBeTruthy()

  const renewed=await page.request.post('/api/track',{data:{
    event:'pricing_view',
    eventCategory:'essential',
    customerId:lead,
    deviceId:device,
    utm_source:'Google Ads',
    utm_campaign:'Reactivation Search',
    occurredAt:new Date().toISOString()
  }})
  expect(renewed.ok()).toBeTruthy()

  const candidatesResponse=await page.request.get('/api/lead-reactivation?dormantDays=30&recentDays=7')
  expect(candidatesResponse.ok()).toBeTruthy()
  const candidates=await candidatesResponse.json()
  expect((candidates.items||[]).some((x:any)=>x.leadRef===lead&&x.renewedEvent==='pricing_view')).toBeTruthy()

  await openWorkspaceTab(page,'Follow-ups')
  await expect(page.getByRole('heading',{name:'Follow-up operations'})).toBeVisible()
  const panel=page.locator('.reactivation-panel')
  await expect(panel.getByText('Lead Reactivation agent',{exact:true})).toBeVisible()
  const card=panel.locator('article').filter({hasText:'CI Dormant Lead '+suffix}).first()
  await expect(card).toBeVisible()
  await expect(card).toContainText('pricing view')
  await card.getByRole('button',{name:'Create reactivation follow-up',exact:true}).click()

  await expect(page.getByText('Reactivation follow-up created from renewed intent evidence.',{exact:true})).toBeVisible()
  await expect(page.locator('.followup-list').getByText(lead,{exact:true}).first()).toBeVisible()

  const followupsResponse=await page.request.get('/api/follow-ups')
  expect(followupsResponse.ok()).toBeTruthy()
  const followups=await followupsResponse.json()
  expect((followups.items||[]).some((x:any)=>x.lead_ref===lead&&/Lead reactivation/i.test(x.reason))).toBeTruthy()
})


test('specialist built-in agents open their real operational modules', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Agents')
  await expect(page.getByRole('heading',{name:'Agent operations'})).toBeVisible()

  const journeyAgent=page.locator('.agent-selector').getByRole('button',{name:/Customer Journey Agent/}).first()
  await expect(journeyAgent).toBeVisible()
  await journeyAgent.click()
  await expect(page.locator('.agent-config')).toContainText('Explore stitched chronology')
  await page.locator('.agent-config').getByRole('button',{name:'Open customer journeys'}).click()
  await expect(page.getByRole('heading',{name:'Customer journey explorer'})).toBeVisible()

  await openWorkspaceTab(page,'Agents')
  const eventAgent=page.locator('.agent-selector').getByRole('button',{name:/Event Agent/}).first()
  await eventAgent.click()
  await page.locator('.agent-config').getByRole('button',{name:'Open event manager'}).click()
  await expect(page.getByRole('heading',{name:'Conversion event manager'})).toBeVisible()
})
