import {test as base,expect} from '@playwright/test'
// Third-party resources are aborted; real localhost app/API requests are unchanged.
export const test=base.extend<{offlineGuard:void}>({
 offlineGuard:[async({context},use)=>{
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url())
   if(url.hostname==='127.0.0.1'&&['4173','3001'].includes(url.port))await route.continue()
   else await route.abort('blockedbyclient')
  })
  await use()
 },{auto:true}]
})
export {expect}
