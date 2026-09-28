import {expect,test} from '@playwright/test'

const dismissConsent=async(page:any)=>{
  const dialog=page.getByRole('dialog',{name:'Privacy choices'})
  if(await dialog.isVisible().catch(()=>false)){
    await dialog.getByRole('button',{name:'Essential only'}).click()
  }
}

test('public core journey renders across declared browser matrix',async({page})=>{
  await page.goto('/#/pricing')
  await dismissConsent(page)
  await expect(page.getByRole('heading').first()).toBeVisible()
  await page.goto('/#/integrations')
  await expect(page.getByText('INTEGRATIONS',{exact:true}).first()).toBeVisible()
})

test('customer core journey renders across declared browser matrix',async({page})=>{
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  await expect(page.getByRole('navigation',{name:'Workspace navigation'})).toBeVisible()
})

test('keyboard-only login controls remain reachable',async({page})=>{
  await page.goto('/#/login')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:'Log in to your workspace'})).toBeVisible()
  await page.keyboard.press('Tab')
  const focused=page.locator(':focus')
  await expect(focused).toBeVisible()
})
