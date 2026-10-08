# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: identity.spec.ts >> Workspace switch updates verified identity and survives refresh
- Location: qa/browser/identity.spec.ts:45:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('button.workspace b')
Expected: "QA Workspace 002"
Received: "QA Workspace 001"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" locator('button.workspace b') with timeout 15000ms
  - waiting for locator('button.workspace b')
    33 × locator resolved to <b>QA Workspace 001</b>
       - unexpected value "QA Workspace 001"

```

```yaml
- text: QA Workspace 001
```

# Test source

```ts
  1  | import {test,expect} from '../browser-guard'
  2  | import {readFileSync} from 'node:fs'
  3  | 
  4  | const actors=JSON.parse(readFileSync(process.env.QA_ACTORS_FILE!,'utf8'))
  5  | 
  6  | for(const actor of actors){
  7  |  test(`Verified workspace identity: ${actor.workspaceId} / ${actor.role} / ${actor.id}`,async({page,context})=>{
  8  |   const errors:string[]=[]
  9  |   page.on('pageerror',error=>errors.push(error.message))
  10 |   await context.setExtraHTTPHeaders({'X-Workspace-ID':actor.workspaceId})
  11 |   const login=await page.request.post('/api/auth/login',{data:{email:actor.email,password:actor.password}})
  12 |   expect(login.status()).toBe(200)
  13 |   const {token}=await login.json()
  14 |   const headers={Authorization:'Bearer '+token,'X-Workspace-ID':actor.workspaceId}
  15 |   const me=await page.request.get('/api/auth/me',{headers})
  16 |   const settings=await page.request.get('/api/settings',{headers})
  17 |   const workspaces=await page.request.get('/api/workspaces',{headers})
  18 |   expect(me.status()).toBe(200)
  19 |   expect(settings.status()).toBe(200)
  20 |   expect(workspaces.status()).toBe(200)
  21 |   const user=(await me.json()).user
  22 |   const locale=await settings.json()
  23 |   const selected=(await workspaces.json()).items.find((w:any)=>w.id===actor.workspaceId)
  24 |   expect(selected).toBeTruthy()
  25 |   await page.addInitScript(({token,workspace})=>{
  26 |    sessionStorage.setItem('ace_session_token',token)
  27 |    localStorage.setItem('ace_workspace_id',workspace)
  28 |   },{token,workspace:actor.workspaceId})
  29 |   await page.goto('/#/workspace?tab=Overview')
  30 |   const consent=page.getByRole('dialog',{name:'Privacy choices'})
  31 |   if(await consent.isVisible())await consent.getByRole('button',{name:'Essential only',exact:true}).click()
  32 |   await expect(page.locator('.profile-mini')).toContainText(user.email)
  33 |   await expect(page.locator('.profile-mini')).toContainText(user.role.replace(/_/g,' '))
  34 |   await expect(page.locator('button.workspace b')).toHaveText(selected.name)
  35 |   await page.getByRole('button',{name:'Region and language'}).click()
  36 |   await expect(page.locator('.region-popover')).toContainText(locale.timezone||'Not configured')
  37 |   await expect(page.locator('.region-popover')).toContainText(locale.currency||'Not configured')
  38 |   await page.reload()
  39 |   await expect(page.locator('.profile-mini')).toContainText(user.email)
  40 |   await expect(page.locator('button.workspace b')).toHaveText(selected.name)
  41 |   expect(errors).toEqual([])
  42 |  })
  43 | }
  44 | 
  45 | test('Workspace switch updates verified identity and survives refresh',async({page,context})=>{
  46 |  const actor=actors.find((a:any)=>a.workspaceId.endsWith('000001')&&a.role==='owner')
  47 |  const target=actors.find((a:any)=>a.id===actor.id&&a.workspaceId!==actor.workspaceId)
  48 |  expect(target).toBeTruthy()
  49 |  await context.setExtraHTTPHeaders({'X-Workspace-ID':actor.workspaceId})
  50 |  const login=await page.request.post('/api/auth/login',{data:{email:actor.email,password:actor.password}})
  51 |  expect(login.status()).toBe(200)
  52 |  const {token}=await login.json()
  53 |  const registry=await page.request.get('/api/workspaces',{headers:{Authorization:'Bearer '+token}})
  54 |  expect(registry.status()).toBe(200)
  55 |  const selected=(await registry.json()).items.find((w:any)=>w.id===target.workspaceId)
  56 |  expect(selected).toBeTruthy()
  57 |  await page.addInitScript(({token,workspace})=>{
  58 |   // Initialize once so a refresh preserves the switched session and scope.
  59 |   if(!sessionStorage.getItem('ace_session_token'))sessionStorage.setItem('ace_session_token',token)
  60 |   if(!localStorage.getItem('ace_workspace_id'))localStorage.setItem('ace_workspace_id',workspace)
  61 |  },{token,workspace:actor.workspaceId})
  62 |  await page.goto('/#/workspace?tab=Overview')
  63 |  const consent=page.getByRole('dialog',{name:'Privacy choices'})
  64 |  if(await consent.isVisible())await consent.getByRole('button',{name:'Essential only',exact:true}).click()
  65 |  await expect(page.locator('.profile-mini')).toContainText(actor.email)
  66 |  await page.locator('button.workspace').click()
  67 |  const switched=page.waitForResponse(r=>r.url().endsWith('/api/auth/workspace/switch')&&r.request().method()==='POST')
  68 |  await page.locator('.workspace-menu').getByRole('button').filter({hasText:selected.name}).click()
  69 |  expect((await switched).status()).toBe(200)
> 70 |  await expect(page.locator('button.workspace b')).toHaveText(selected.name)
     |                                                   ^ Error: expect(locator).toHaveText(expected) failed
  71 |  await expect(page.locator('.profile-mini')).toContainText(actor.email)
  72 |  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('ace_workspace_id'))).toBe(target.workspaceId)
  73 |  await page.reload()
  74 |  await expect(page.locator('button.workspace b')).toHaveText(selected.name)
  75 |  await expect(page.locator('.profile-mini')).toContainText(actor.email)
  76 |  const verified=await page.evaluate(async()=>{
  77 |   const token=sessionStorage.getItem('ace_session_token')
  78 |   const r=await fetch('/api/auth/me',{headers:{Authorization:'Bearer '+token,'X-Workspace-ID':localStorage.getItem('ace_workspace_id')||''}})
  79 |   return {status:r.status,body:await r.json()}
  80 |  })
  81 |  expect(verified.status).toBe(200);expect(verified.body.workspaceId).toBe(target.workspaceId)
  82 | })
  83 | 
```