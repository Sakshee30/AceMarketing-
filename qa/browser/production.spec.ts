import {test,expect} from '../browser-guard'
import {readFileSync} from 'node:fs'
const actor=JSON.parse(readFileSync(process.env.QA_ACTORS_FILE!,'utf8')).find((a:any)=>a.id.endsWith('000001'))
test.beforeEach(async({page,context})=>{
 await context.setExtraHTTPHeaders({'X-Workspace-ID':actor.workspaceId})
 await page.addInitScript((id:string)=>localStorage.setItem('ace_workspace_id',id),actor.workspaceId)
 await page.goto('/#/login')
 const consent=page.getByRole('dialog',{name:'Privacy choices'})
 if(await consent.isVisible())await consent.getByRole('button',{name:'Essential only',exact:true}).click()
})
test('Production UI login establishes real session and survives refresh',async({page})=>{
 await page.getByLabel('Email',{exact:true}).fill(actor.email)
 await page.locator('.login-card input[type=password]').fill(actor.password)
 const login=page.waitForResponse(r=>r.url().endsWith('/api/auth/login')&&r.request().method()==='POST')
 await page.locator('.login-submit').click();expect((await login).status()).toBe(200)
 await expect(page.locator('.product-body')).toBeVisible()
 await page.reload();await expect(page.locator('.product-body')).toBeVisible()
 const result=await page.evaluate(async()=>{const token=sessionStorage.getItem('ace_session_token');const r=await fetch('/api/auth/me',{headers:{Authorization:'Bearer '+token,'X-Workspace-ID':localStorage.getItem('ace_workspace_id')||''}});return {status:r.status,body:await r.json(),persistentToken:localStorage.getItem('ace_token')}})
 expect(result.status).toBe(200);expect(result.body.user.email).toBe(actor.email);expect(result.persistentToken).toBeNull()
})
test('Production UI invalid login displays error without entering application',async({page})=>{
 await page.getByLabel('Email',{exact:true}).fill(actor.email)
 await page.locator('.login-card input[type=password]').fill('InvalidPassword123!')
 await page.locator('.login-submit').click()
 await expect(page.locator('.login-error')).toBeVisible();await expect(page.locator('.product-body')).toHaveCount(0)
})
test('Password visibility control changes input type without losing content',async({page})=>{
 const input=page.locator('.password-field input');await input.fill('Synthetic-Unsubmitted-Text')
 await page.getByRole('button',{name:'Show',exact:true}).click();await expect(input).toHaveAttribute('type','text')
 await page.getByRole('button',{name:'Hide',exact:true}).click();await expect(input).toHaveAttribute('type','password')
})
