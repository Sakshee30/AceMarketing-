import {expect,test} from '@playwright/test'

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
      await expect(page.locator('body')).toBeVisible()
      await expect(page.locator('body')).toContainText(heading)
      await expect(page.locator('header, main, .public-page, .marketing-page').first()).toBeVisible()
      expect(pageErrors).toEqual([])
    })
  }

  test('public navigation reaches agents and integrations',async({page})=>{
    await page.goto('/#/')
    await page.getByRole('button',{name:/agents/i}).first().click()
    await expect(page).toHaveURL(/#\/agents/)
    await expect(page.locator('body')).toContainText(/Lead Grading/i)

    await page.goto('/#/')
    await page.getByRole('button',{name:/integrations/i}).first().click()
    await expect(page).toHaveURL(/#\/integrations/)
    await expect(page.locator('body')).toContainText(/Google Ads/i)
  })
})

test.describe('workspace critical flows',()=>{
  test.beforeEach(async({page})=>{
    await page.goto('/#/workspace')
    await expect(page.getByText('Launchpad',{exact:true}).first()).toBeVisible()
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
    await page.goto('/#/workspace')
    await expect(page.locator('.product-body h1')).toHaveCount(1)
    await page.getByRole('button',{name:'Monitoring',exact:true}).click()
    await expect(page.locator('.product-body h1')).toHaveCount(1)
  })
})
