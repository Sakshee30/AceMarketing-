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
