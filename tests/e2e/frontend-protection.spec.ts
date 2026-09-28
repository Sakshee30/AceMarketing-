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
