import {test,expect} from '../browser-guard'
import {readFileSync} from 'node:fs'
import {workspaceFeatureManifest} from '../../frontend/src/features/workspace/manifest'
const actor=JSON.parse(readFileSync(process.env.QA_ACTORS_FILE!,'utf8')).find((a:any)=>a.id.endsWith('000001'))
for(const feature of workspaceFeatureManifest){
 test('Production render smoke: '+feature.label,async({page,context})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  await context.setExtraHTTPHeaders({'X-Workspace-ID':actor.workspaceId})
  const response=await page.request.post('/api/auth/login',{data:{email:actor.email,password:actor.password}})
  expect(response.status()).toBe(200);const data=await response.json()
  await page.addInitScript(({token,workspace})=>{sessionStorage.setItem('ace_session_token',token);localStorage.setItem('ace_workspace_id',workspace)}, {token:data.token,workspace:actor.workspaceId})
  await page.goto('/'+feature.canonicalHash)
  const consent=page.getByRole('dialog',{name:'Privacy choices'})
  if(await consent.isVisible())await consent.getByRole('button',{name:'Essential only',exact:true}).click()
  await expect(page.locator('.product-body')).toBeVisible()
  await expect(page.getByRole('navigation',{name:'Workspace navigation'})).toBeVisible()
  await expect(page.locator('.product-body .ace-state-loading')).toHaveCount(0)
  await expect(page.locator('.workspace-section-error,.product-body .ace-state-error')).toHaveCount(0)
  await expect(page.locator('.product-body h1,.product-body h2').first()).toBeVisible()
  expect(errors).toEqual([])
  expect(await page.evaluate(()=>localStorage.getItem('ace_active_tab'))).toBe(feature.label)
 })
}
for(const route of ['/', '/agents','/integrations','/pricing','/case-studies','/resources','/security']){
 test('Production public render smoke: '+route,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/#'+route);await expect(page.getByRole('heading').first()).toBeVisible()
  await expect(page.locator('.product-body .ace-state-loading')).toHaveCount(0);expect(errors).toEqual([])
 })
}
