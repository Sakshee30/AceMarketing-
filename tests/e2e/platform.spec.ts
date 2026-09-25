import {expect,test} from '@playwright/test'

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
  const toggle=page.getByRole('button',{name:'Open workspace navigation'})
  if(await toggle.isVisible().catch(()=>false)) await toggle.click()
  await page.locator('.product-sidebar').getByRole('button',{name,exact:true}).click()
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

  test('public navigation reaches agents and integrations',async({page,isMobile})=>{
    await page.goto('/#/')
    await dismissConsent(page)
    if(isMobile) await page.locator('.menu-toggle').click()
    await page.getByRole('button',{name:/^agents/i}).first().click()
    await expect(page.locator('.agents-menu')).toBeVisible()
    await page.locator('.agents-menu').getByRole('button',{name:/Lead Grading agent/i}).click()
    await expect(page).toHaveURL(/#\/agents/)
    await expect(page.locator('body')).toContainText(/Lead Grading/i)

    await page.goto('/#/')
    if(isMobile) await page.locator('.menu-toggle').click()
    await page.getByRole('button',{name:/integrations/i}).first().click()
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

  test('dashboard sections collapse and remain navigable',async({page})=>{
    const tracking=page.getByRole('button',{name:/Tracking & Data/i}).first()
    await expect(tracking).toBeVisible()
    await tracking.click()
    await expect(page.getByRole('button',{name:'Diagnostics',exact:true})).toHaveCount(0)
    await tracking.click()
    await expect(page.getByRole('button',{name:'Diagnostics',exact:true})).toBeVisible()

    const search=page.getByPlaceholder('Find feature...')
    await search.fill('audience')
    await expect(page.getByRole('button',{name:'Audiences',exact:true})).toBeVisible()
    await openWorkspaceTab(page,'Audiences')
    await expect(page.locator('.product-body h1')).toContainText(/Audience/i)
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
    await page.locator('.workspace').click()
    await expect(page.getByRole('button',{name:/Create workspace/i})).toBeVisible()
    const current=await page.locator('.workspace b').innerText()
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
  await page.getByRole('dialog', { name: 'Dashboard section navigator' }).getByRole('button', { name: 'Attribution', exact: true }).click()
  await expect(page.getByText('Attribution', { exact: false }).first()).toBeVisible()
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
  await page.getByRole('button', { name: /Lead Grading/ }).first().click()
  await expect(page.getByText('Operational prerequisites')).toBeVisible()
  await page.locator('.agent-config').getByRole('button', { name: /Open lead grading/ }).click()
  await expect(page.getByRole('heading', { name: 'Lead grading' })).toBeVisible()
})


test('funnel period control updates backend-filtered workspace', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await page.getByLabel('Dashboard sections').getByRole('button', { name: 'Tracking & Data', exact: true }).click()
  await openWorkspaceTab(page,'Funnel')
  await expect(page.getByRole('heading', { name: 'Channel & campaign funnel' })).toBeVisible()
  await page.getByRole('button', { name: /Last 30 days/ }).click()
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


test('AdSync creates and operates a persisted conversion pipeline', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'AdSync')
  await expect(page.getByRole('heading', { name: 'Server-side signal activation' })).toBeVisible()
  await page.getByRole('button', { name: 'Add pipeline' }).click()
  const modal=page.getByText('New conversion pipeline').locator('..').locator('..')
  await page.getByLabel('Pipeline name').fill('CI Qualified Lead to Meta')
  await page.getByLabel('Source event').fill('lead.qualified')
  await page.getByLabel('Output event').fill('qualified_lead_ci')
  await page.getByLabel('Destination').selectOption('Meta Ads')
  await page.getByRole('button', { name: 'Create pipeline' }).click()
  await expect(page.locator('.agent-selector').getByText('CI Qualified Lead to Meta', { exact: true }).first()).toBeVisible()
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


test('meetings can be scheduled directly from the meetings workspace', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Meetings')
  await expect(page.getByRole('heading', { name: 'Scheduler & meeting reminders' })).toBeVisible()
  await page.locator('.page-head').getByRole('button', { name: 'Schedule meeting' }).click()
  await page.getByLabel('Lead reference').fill('ci_meeting_lead')
  const dt=new Date(Date.now()+24*60*60*1000)
  const local=dt.toISOString().slice(0,16)
  await page.getByLabel('Start time').fill(local)
  await page.getByLabel('Owner').fill('CI Counsellor')
  await page.getByLabel('Attendee email').fill('ci-meeting@example.com')
  await page.getByLabel('Calendar sync').selectOption('no')
  await page.locator('.connector-card').getByRole('button', { name: 'Schedule meeting' }).click()
  await expect(page.locator('.meeting-list').getByText('ci_meeting_lead', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send reminder now' })).toBeVisible()
})


test('matchback rules persist without seeded performance claims', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Matchback')
  await expect(page.getByRole('heading', { name: 'Closure matchback & revenue reconciliation' })).toBeVisible()
  await expect(page.getByText('₹84.0L', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'New matchback rule' }).click()
  await page.getByLabel('Rule name').fill('CI Closed Won')
  await page.getByLabel('Source').fill('ci_crm')
  await page.getByLabel('Event type').fill('closed_won')
  await page.getByLabel('Destination').fill('Google Ads')
  await page.getByLabel('Identity method').fill('customer_id + gclid')
  await page.getByRole('button', { name: 'Create matchback rule' }).click()
  await expect(page.locator('.matchback-list').getByText('CI Closed Won', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run reconciliation' })).toBeVisible()
})


test('journey explorer renders stitched chronology', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await page.request.post('/api/enrich/upsert',{data:{externalLeadId:'ci_journey_lead',name:'CI Journey Lead',source:'Google Ads',campaign:'CI Search',crmStage:'qualified',journeyDepth:2,lastActivity:new Date().toISOString()}})
  await page.request.post('/api/follow-ups',{data:{leadRef:'ci_journey_lead',reason:'CI chronology follow-up',channel:'Email',priority:'medium',delayMinutes:30,owner:'CI Owner'}})
  await openWorkspaceTab(page,'Journeys')
  await expect(page.getByRole('heading', { name: 'Customer journey explorer' })).toBeVisible()
  await expect(page.getByText('CI Journey Lead', { exact: true }).first()).toBeVisible()
  const detail=page.locator('.journey-detail')
  await expect(detail.getByText('Stitched chronology')).toBeVisible()
  await expect(detail.getByText(/CI chronology follow-up/)).toBeVisible()
  await expect(detail.getByText(/Journey timeline source/)).toHaveCount(0)
})


test('offline attribution rules persist and test through the attribution store', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'Offline Attribution')
  await expect(page.getByRole('heading', { name: 'Calls, WhatsApp & offline revenue' })).toBeVisible()
  await page.getByRole('button', { name: 'New offline rule' }).click()
  await page.getByLabel('Conversion').fill('CI Offline Sale')
  await page.getByLabel('Source').fill('CI POS')
  await page.getByLabel('Matching method').fill('customer_id + click history')
  await page.getByLabel('Identifier').fill('Customer ID / GCLID')
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


test('POS import computes match coverage from transaction rows', async ({ page }) => {
  await page.goto('/#/workspace')
  await dismissConsent(page)
  await openWorkspaceTab(page,'POS & Stores')
  await expect(page.getByRole('heading', { name: 'POS, walk-in & store-sale attribution' })).toBeVisible()
  await page.getByRole('button', { name: 'Import POS batch' }).click()
  await expect(page.getByLabel('Matched records')).toHaveCount(0)
  await page.getByLabel('Store ID').fill('CI-STORE')
  await page.getByLabel('Store name').fill('CI Store')
  await page.getByLabel('CSV transactions').fill('transaction_id,customer_id,email,phone,net_revenue,currency,occurred_at,gclid,fbclid\nCI-TXN-1,ci_pos_customer,,,12500,INR,2026-09-26T10:00:00Z,,')
  await page.getByRole('button', { name: 'Process transaction batch' }).click()
  await expect(page.getByText(/POS batch processed:/)).toBeVisible()
  await expect(page.locator('.pos-list').getByText('CI Store', { exact: true }).first()).toBeVisible()
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
