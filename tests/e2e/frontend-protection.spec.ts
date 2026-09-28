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
