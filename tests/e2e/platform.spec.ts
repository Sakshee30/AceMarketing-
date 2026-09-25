import {expect,test} from '@playwright/test'

const dismissConsent=async(page:any)=>{
  const dialog=page.getByRole('dialog',{name:'Privacy choices'})
  if(await dialog.isVisible().catch(()=>false)) await page.getByRole('button',{name:'Essential only'}).click()
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
    await page.getByRole('button',{name:'Audiences',exact:true}).click()
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
      await page.getByRole('button',{name:tab,exact:true}).click()
      await expect(page.locator('.product-body')).toContainText(copy)
    }
  })

  test('launchpad identity and models render backend-backed state',async({page})=>{
    await page.getByRole('button',{name:'Launchpad',exact:true}).click()
    await expect(page.locator('.product-body h1')).toContainText(/Launchpad/i)
    await expect(page.locator('.launchpad-progress')).toContainText(/Workspace readiness/i)

    await page.getByRole('button',{name:'Identity',exact:true}).click()
    await expect(page.locator('.product-body h1')).toContainText(/Identity resolution/i)
    await expect(page.locator('.product-body')).toContainText(/Known identities/i)

    await page.getByRole('button',{name:'Models',exact:true}).click()
    await expect(page.locator('.product-body h1')).toContainText(/Custom models/i)
    await expect(page.locator('.product-body')).toContainText(/Lead quality scoring|Journey propensity features/i)
  })

  test('conversion operations expose real creation and empty-state flows',async({page})=>{
    await page.getByRole('button',{name:'Follow-ups',exact:true}).click()
    await expect(page.locator('.product-body h1')).toContainText(/Follow-up operations/i)
    await expect(page.getByRole('button',{name:/Create follow-up/i})).toBeVisible()

    await page.getByRole('button',{name:'Feedback',exact:true}).click()
    await expect(page.locator('.product-body h1')).toContainText(/Feedback agent/i)
    await expect(page.getByRole('button',{name:/Record feedback/i})).toBeVisible()

    await page.getByRole('button',{name:'Approvals',exact:true}).click()
    await expect(page.locator('.product-body h1')).toContainText(/Human approval center/i)

    await page.getByRole('button',{name:'Routing',exact:true}).click()
    await expect(page.locator('.product-body h1')).toContainText(/Lead routing/i)
    await expect(page.locator('.product-body')).toContainText(/Routed today|No routing load yet/i)
  })

  test('notification and approval settings are editable',async({page})=>{
    await page.getByRole('button',{name:'Settings',exact:true}).click()
    await page.getByRole('button',{name:'Notifications',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Notifications'})).toBeVisible()
    await expect(page.getByRole('button',{name:/Save notifications/i})).toBeVisible()

    await page.getByRole('button',{name:'Agent approvals',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Agent approval boundaries'})).toBeVisible()
    await expect(page.getByRole('button',{name:/Save approval policy/i})).toBeVisible()
  })

  test('billing usage settings render live entitlement surface',async({page})=>{
    await page.getByRole('button',{name:'Settings',exact:true}).click()
    await page.getByRole('button',{name:'Billing & usage',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Billing & usage'})).toBeVisible()
    await expect(page.locator('.settings-detail')).toContainText(/Tracked events/i)
    await expect(page.locator('.settings-detail')).toContainText(/Current period/i)
  })

  test('workspace switcher remains usable',async({page})=>{
    await page.locator('.workspace').click()
    await expect(page.getByText('Ace Healthcare',{exact:true})).toBeVisible()
    await page.getByText('Ace Healthcare',{exact:true}).click()
    await expect(page.locator('.workspace')).toContainText('Ace Healthcare')
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
    await page.getByRole('button',{name:'Monitoring',exact:true}).click()
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

    await page.getByRole('button',{name:'Allow analytics'}).click()
    await expect(page.getByRole('dialog',{name:'Privacy choices'})).toHaveCount(0)
    await page.reload()
    await page.waitForTimeout(300)
    expect(tracked.some(x=>x.includes('"event":"page_view"'))).toBeTruthy()
  })

  test('essential-only choice keeps marketing click IDs out of storage',async({page})=>{
    await page.goto('/?gclid=test-gclid&fbclid=test-fbclid#/')
    await page.getByRole('button',{name:'Essential only'}).click()
    const stored=await page.evaluate(()=>({gclid:localStorage.getItem('ace:gclid'),fbclid:localStorage.getItem('ace:fbclid')}))
    expect(stored).toEqual({gclid:null,fbclid:null})
  })
})


test('dashboard navigator opens primary operating sections', async ({ page }) => {
  await page.goto('/#/workspace')
  await expect(page.getByRole('button', { name: 'Open dashboard section navigator' })).toBeVisible()
  await page.getByRole('button', { name: 'Open dashboard section navigator' }).click()
  await expect(page.getByRole('dialog', { name: 'Dashboard section navigator' })).toBeVisible()
  await page.getByRole('button', { name: /Attribution/ }).click()
  await expect(page.getByText('Attribution', { exact: false }).first()).toBeVisible()
})


test('live dashboard section strip navigates between operating areas', async ({ page }) => {
  await page.goto('/#/workspace')
  await expect(page.getByLabel('Dashboard sections')).toBeVisible()
  await page.getByLabel('Dashboard sections').getByRole('button', { name: /Measurement & Intelligence/ }).click()
  await expect(page.getByText('Journeys', { exact: true }).first()).toBeVisible()
})


test('dashboard keeps section navigation visible on workspace', async ({ page }) => {
  await page.goto('/#/workspace')
  await expect(page.getByLabel('Dashboard sections')).toBeVisible()
  await expect(page.getByRole('button', { name: /Tracking & Data/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Activation & Integrations/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Operations & Developer/ })).toBeVisible()
})


test('manual integration cards open the custom adapter builder', async ({ page }) => {
  await page.goto('/#/workspace')
  await page.getByRole('button', { name: /Activation & Integrations/ }).click()
  await page.getByRole('button', { name: 'Integrations', exact: true }).first().click()
  const meritto = page.locator('article').filter({ hasText: 'Meritto' })
  await expect(meritto).toContainText('Configurable adapter')
  await meritto.getByRole('button', { name: 'Configure' }).click()
  await expect(page.getByText('Custom Integration Builder')).toBeVisible()
  await expect(page.getByDisplayValue('Meritto')).toBeVisible()
})


test('built-in agent opens its live operational module', async ({ page }) => {
  await page.goto('/#/workspace')
  await page.getByRole('button', { name: /Lead & Conversion/ }).click()
  await page.getByRole('button', { name: 'Agents', exact: true }).first().click()
  await page.getByRole('button', { name: /Lead Grading/ }).first().click()
  await expect(page.getByText('Operational prerequisites')).toBeVisible()
  await page.getByRole('button', { name: /Open lead grading/ }).click()
  await expect(page.getByRole('heading', { name: 'Lead grading' })).toBeVisible()
})


test('funnel period control updates backend-filtered workspace', async ({ page }) => {
  await page.goto('/#/workspace')
  await page.getByRole('button', { name: /Tracking & Data/ }).click()
  await page.getByRole('button', { name: 'Funnel', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Channel & campaign funnel' })).toBeVisible()
  await page.getByRole('button', { name: /Last 30 days/ }).click()
  await expect(page.getByText('90 day window')).toBeVisible()
})
