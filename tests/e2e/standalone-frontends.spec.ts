import {expect,test} from '@playwright/test'

const dismissConsent=async(page:any)=>{
  const dialog=page.getByRole('dialog',{name:'Privacy choices'})
  if(await dialog.isVisible().catch(()=>false)){
    await dialog.getByRole('button',{name:'Essential only'}).click()
    await expect(dialog).toHaveCount(0)
  }
}

test('standalone public deployment preserves discoverability, SEO and privacy boundaries',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('public-'),'public deployment project only')
  await page.goto('/pricing')
  await dismissConsent(page)
  await expect(page.getByRole('heading').first()).toBeVisible()
  await expect(page).toHaveTitle(/Pricing.*AceMarketing/i)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','index,follow')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',/\/pricing$/)

  const requestHeaders:string[]=[]
  page.on('request',request=>{
    if(request.url().includes('/api/'))requestHeaders.push(String(request.headers()['authorization']||''))
  })
  await page.goto('/industries')
  await dismissConsent(page)
  await expect(page.getByText('INDUSTRIES',{exact:true}).first()).toBeVisible()
  expect(requestHeaders.filter(Boolean)).toEqual([])
})

test('standalone public navigation remains usable on approved desktop and mobile profiles',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('public-'),'public deployment project only')
  await page.goto('/')
  await dismissConsent(page)
  await expect(page.getByRole('heading').first()).toBeVisible()
  await page.goto('/integrations')
  await expect(page.getByText('INTEGRATIONS',{exact:true}).first()).toBeVisible()
})

test('standalone customer deployment remains private and direct-linkable',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('customer-'),'customer deployment project only')
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow,noarchive')
  await expect(page.getByRole('navigation',{name:'Workspace navigation'})).toBeVisible()
})

test('standalone customer login stays available without loading public-site composition',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('customer-'),'customer deployment project only')
  await page.goto('/#/login')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:'Log in to your workspace'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible()
})


test('standalone platform control deployment is isolated and fails honestly without a control API',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('control-'),'platform control project only')
  await page.goto('/#/overview')
  await expect(page.getByRole('heading',{name:'Overview'})).toBeVisible()
  await expect(page.getByRole('navigation',{name:'Platform control navigation'})).toBeVisible()
  await expect(page.getByText('Separate trust boundary',{exact:true})).toBeVisible()
  await expect(page.getByText('Read-only frontend phase',{exact:true})).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow,noarchive')
  await expect(page.getByText(/Control plane unavailable|Access denied/i)).toBeVisible()
})

test('platform control exposes required operational page ownership without write controls',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('control-'),'platform control project only')
  await page.goto('/#/changes')
  await expect(page.getByRole('heading',{name:'Changes'})).toBeVisible()
  await expect(page.getByText(/Operational change requests, validation, approvals, execution and verification/i)).toBeVisible()
  await expect(page.getByText(/Write controls remain intentionally absent/i)).toBeVisible()
  await expect(page.getByRole('button',{name:/Apply|Execute|Delete|Rollback/i})).toHaveCount(0)
})


const metrics=async(page:any)=>page.evaluate(()=>((window as any).__ACE_FRONTEND_METRICS__||[]))

test('public-site lab metrics stay within declared good thresholds where measurable',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('public-'),'public deployment only')
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('heading').first().click().catch(()=>{})
  await page.waitForTimeout(300)
  const values:any[]=await metrics(page)
  const latest=(name:string)=>[...values].reverse().find(item=>item.name===name)
  const lcp=latest('LCP')
  const cls=latest('CLS')
  if(lcp)expect(lcp.value).toBeLessThanOrEqual(4000)
  if(cls)expect(cls.value).toBeLessThanOrEqual(0.25)
  expect(values.length).toBeGreaterThan(0)
})

test('customer app records bounded frontend performance telemetry',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('customer-'),'customer deployment only')
  await page.goto('/#/workspace?tab=Overview')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(300)
  const values:any[]=await metrics(page)
  expect(values.length).toBeGreaterThan(0)
  expect(values.length).toBeLessThanOrEqual(200)
  expect(values.every(item=>['customer-app'].includes(item.surface))).toBeTruthy()
})

test('platform control records performance telemetry without exposing secrets',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('control-'),'platform control deployment only')
  await page.goto('/#/overview')
  await page.waitForTimeout(300)
  const values:any[]=await metrics(page)
  expect(values.length).toBeGreaterThan(0)
  expect(JSON.stringify(values)).not.toMatch(/token|password|secret/i)
})


test('standalone surfaces expose a keyboard skip path to their owned content',async({page},testInfo)=>{
  const project=testInfo.project.name
  if(project.startsWith('public-'))await page.goto('/')
  else if(project.startsWith('customer-'))await page.goto('/#/workspace?tab=Overview')
  else if(project.startsWith('control-'))await page.goto('/#/overview')
  else test.skip(true,'standalone surface only')

  const consent=page.getByRole('dialog',{name:'Privacy choices'})
  if(await consent.isVisible().catch(()=>false))await consent.getByRole('button',{name:'Essential only'}).click()

  await page.keyboard.press('Tab')
  const skip=page.getByRole('link',{name:'Skip to main content'})
  await expect(skip).toBeVisible()
  await expect(skip).toBeFocused()
})


test('public connector request dialog is focus-managed and input-bounded',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('public-'),'public deployment project only')
  await page.goto('/integrations')
  const consent=page.getByRole('dialog',{name:'Privacy choices'})
  if(await consent.isVisible().catch(()=>false))await consent.getByRole('button',{name:'Essential only'}).click()
  await page.getByRole('button',{name:'Request a connector'}).last().click()
  const dialog=page.getByRole('dialog',{name:'Request a connector'})
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Connector name')).toBeFocused()
  await expect(dialog.getByLabel('Connector name')).toHaveAttribute('maxlength','120')
  await expect(dialog.getByLabel('Business email')).toHaveAttribute('maxlength','254')
  await expect(dialog.getByLabel('Company')).toHaveAttribute('maxlength','160')
  await expect(dialog.getByLabel('How should the data move?')).toHaveAttribute('maxlength','2000')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})


test('public demo submission distinguishes unknown outcome from confirmed failure',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('public-'),'public deployment project only')
  await page.route('**/api/demo-requests',route=>route.abort('failed'))
  await page.goto('/demo')
  const consent=page.getByRole('dialog',{name:'Privacy choices'})
  if(await consent.isVisible().catch(()=>false))await consent.getByRole('button',{name:'Essential only'}).click()
  await page.getByLabel('Work email').fill('qa@example.com')
  await page.getByLabel('Company').fill('QA Company')
  await page.getByLabel('Monthly digital marketing budget').selectOption({label:'₹5L – ₹25L'})
  await page.getByLabel('Burning pain point').selectOption({label:'Attribution'})
  await page.getByRole('button',{name:/Continue to scheduling/}).click()
  await expect(page.getByText(/submission outcome is unknown/i)).toBeVisible()
  await expect(page.getByRole('heading',{name:'Select a date & time'})).toHaveCount(0)
})

test('public quote submission keeps network ambiguity distinct from saved state',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('public-'),'public deployment project only')
  await page.route('**/api/pricing/quote',route=>route.abort('failed'))
  await page.goto('/pricing')
  const consent=page.getByRole('dialog',{name:'Privacy choices'})
  if(await consent.isVisible().catch(()=>false))await consent.getByRole('button',{name:'Essential only'}).click()
  await page.getByRole('button',{name:'Request quote'}).click()
  await expect(page.getByText(/quote-request outcome is unknown/i)).toBeVisible()
  await expect(page.getByText(/configuration was captured by the backend/i)).toHaveCount(0)
})
