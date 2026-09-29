import {expect,test} from '@playwright/test'

const dismissConsent=async(page:any)=>{
  const dialog=page.getByRole('dialog',{name:'Privacy choices'})
  if(await dialog.isVisible().catch(()=>false)){
    await dialog.getByRole('button',{name:'Essential only'}).click()
  }
}

const authenticateWorkspace=async(page:any)=>{
  const response=await page.request.post('/api/auth/login',{
    headers:{'Content-Type':'application/json','X-Workspace-ID':'ws_default'},
    data:{email:'owner@example.com',password:'browser-matrix-password'}
  })
  expect(response.ok()).toBeTruthy()
  const payload=await response.json()
  expect(typeof payload?.token).toBe('string')
  await page.addInitScript(({token,workspaceId}:{token:string;workspaceId:string})=>{
    window.sessionStorage.setItem('ace_session_token',token)
    window.localStorage.setItem('ace_workspace_id',workspaceId)
  },{token:payload.token,workspaceId:payload.workspaceId||'ws_default'})
}

test('public core journey renders across declared browser matrix',async({page})=>{
  await page.goto('/#/pricing')
  await dismissConsent(page)
  await expect(page.getByRole('heading').first()).toBeVisible()
  await page.goto('/#/integrations')
  await expect(page.getByText('INTEGRATIONS',{exact:true}).first()).toBeVisible()
})

test('customer core journey renders across declared browser matrix',async({page})=>{
  await authenticateWorkspace(page)
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


test('skip link and visible focus are available across the compatibility shell',async({page})=>{
  await authenticateWorkspace(page)
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await page.evaluate(()=>{(document.activeElement as HTMLElement|null)?.blur()})
  await page.keyboard.press('Tab')
  const skip=page.getByRole('link',{name:'Skip to main content'})
  await expect(skip).toBeVisible()
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#ace-main-content')).toBeFocused()
})

test('reduced-motion preference preserves core customer navigation',async({page})=>{
  await authenticateWorkspace(page)
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/#/workspace?tab=Overview')
  await dismissConsent(page)
  await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()
  const duration=await page.locator('.ace-a11y-root').evaluate(el=>getComputedStyle(el.querySelector('button')||el).transitionDuration)
  expect(duration==='0s'||duration==='0.01ms'||duration==='0.001s').toBeTruthy()
})
