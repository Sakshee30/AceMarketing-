// Opens every workspace page in a real browser against the running local stack and
// records, per feature, render crashes, console errors and failed API calls.
//   node scripts/live/ui-sweep.mjs --out=.tmp-tools/live/verification
import {chromium} from '@playwright/test'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {loadEnvFile} from '../load-env.mjs'

process.chdir(resolve(import.meta.dirname,'../..'))
const env=await loadEnvFile('.env.live.local')
const options=Object.fromEntries(process.argv.slice(2).map(arg=>{const [key,...rest]=arg.replace(/^--/,'').split('=');return [key,rest.join('=')||'true']}))
const out=options.out||'.tmp-tools/live/verification'
// 127.0.0.1, not localhost: another local project can own the IPv6 localhost:5173 listener.
const app=options.app||'http://127.0.0.1:5173'
const tabs=['Overview','Launchpad','Boards','AdSync','ChatGPT Ads','Funnel','Leak Monitor','Events','Adjustments','Diagnostics','Match Quality','Reconciliation','Fraud','Deep Links','Sites','Fingerprinting','Live Sync','Data Hub','Customer 360','Offline Attribution','Matchback','POS & Stores',
  'Journeys','Identity','Models','AI Intelligence','Attribution','Planner','Reports','Grouped Performance','Executive Briefs',
  'Enrich','Lead Grading','Behavior','Feed','Agents','Routing','Follow-ups','Calls','Meetings','Feedback','Approvals','Ask Ace',
  'Integrations','Data Flows','Real-Time Activation','Personalization','Exclusions','Audiences','Delivery','Monitoring','Alerts','Compliance','Developers','Settings']
// Pages that must show generated records, and the visible text that proves it.
const mustShowData={'Enrich':/Leads enriched\s*[1-9]/,'Lead Grading':/Profiles scored\s*[1-9]/,'Follow-ups':/Open follow-ups\s*[1-9]/,'Meetings':/\d{4}/}
await mkdir(out+'/screens',{recursive:true})
const browser=await chromium.launch({channel:'chrome',headless:true}).catch(()=>chromium.launch({headless:true}))
const page=await browser.newPage({viewport:{width:1440,height:1000}})
page.setDefaultTimeout(4000)
let current=null,inflight=0,lastActivity=Date.now()
const bucket=()=>current||(current={pageErrors:[],consoleErrors:[],apiErrors:[],apiCalls:0})
page.on('pageerror',error=>bucket().pageErrors.push(error.message.slice(0,300)))
page.on('console',message=>{if(message.type()==='error'){const text=message.text();if(!/Failed to load resource|ERR_ABORTED|net::ERR_/.test(text))bucket().consoleErrors.push(text.slice(0,300))}})
page.on('request',request=>{if(request.url().includes('/api/')){inflight++;lastActivity=Date.now()}})
const settle=request=>{if(request.url().includes('/api/')){inflight=Math.max(0,inflight-1);lastActivity=Date.now()}}
page.on('requestfinished',settle)
page.on('requestfailed',request=>{settle(request);const reason=request.failure()?.errorText||'';if(request.url().includes('/api/')&&!/ABORTED|aborted/.test(reason))bucket().apiErrors.push(request.method()+' '+new URL(request.url()).pathname+' '+reason)})
page.on('response',response=>{const url=new URL(response.url());if(!url.pathname.startsWith('/api/'))return;bucket().apiCalls++;if(response.status()>=400)bucket().apiErrors.push(response.request().method()+' '+url.pathname+url.search+' HTTP '+response.status())})
const quiet=async(max=12000)=>{inflight=0;const deadline=Date.now()+max;await page.waitForTimeout(700);while(Date.now()<deadline&&(inflight>0||Date.now()-lastActivity<900))await page.waitForTimeout(150)}
const only=options.tabs?options.tabs.split(',').map(name=>name.trim()):null
const previous=only?await readFile(out+'/ui-results.json','utf8').then(JSON.parse).catch(()=>null):null
const results={generatedAt:new Date().toISOString(),app,features:previous?.features||{}}
const finish=async(name,extra={})=>{
  const seen=current||{pageErrors:[],consoleErrors:[],apiErrors:[],apiCalls:0};current=null
  const crashed=await page.locator('.workspace-section-error').count()
  const crashText=crashed?(await page.locator('.workspace-section-error').first().innerText()).slice(0,300):''
  const text=(await page.locator(extra.scope||'.product-body').first().innerText().catch(()=>'')).trim()
  const heading=(await page.locator((extra.scope||'.product-body')+' h1,'+(extra.scope||'.product-body')+' h2,'+(extra.scope||'.product-body')+' h3').first().innerText().catch(()=>'')).trim()
  const problems=[]
  if(crashed)problems.push('render crash: '+crashText)
  if(seen.pageErrors.length)problems.push('page errors: '+[...new Set(seen.pageErrors)].join(' | '))
  if(seen.apiErrors.length)problems.push('failed API calls: '+[...new Set(seen.apiErrors)].slice(0,6).join(', '))
  if(seen.consoleErrors.length)problems.push('console errors: '+[...new Set(seen.consoleErrors)].slice(0,3).join(' | '))
  if(text.length<40)problems.push('page rendered almost no content ('+text.length+' characters)')
  if(extra.problem)problems.push(extra.problem)
  const file='screens/'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png'
  await page.screenshot({path:out+'/'+file}).catch(()=>{})
  results.features[name]={ok:problems.length===0,detail:problems.length?problems.join('; ').slice(0,900):`Rendered "${heading.slice(0,60)}" · ${seen.apiCalls} API calls OK · ${text.length} characters`,heading,apiCalls:seen.apiCalls,textLength:text.length,screenshot:file}
  console.log((problems.length?'FAIL ':'ok   ')+name+(problems.length?' — '+problems.join('; ').slice(0,400):''))
}
try{
  bucket()
  await page.goto(app+'/',{waitUntil:'domcontentloaded'});await quiet()
  if(!only)await finish('Public website',{scope:'body'})
  bucket()
  await page.goto(app+'/#/login');await page.locator('input[type=email]').fill(env.ADMIN_EMAIL||'owner@example.com')
  await page.locator('input[type=password]').fill(env.ACE_LOCAL_PASSWORD||env.ADMIN_PASSWORD||'demo123')
  await page.locator('.login-submit').click()
  await page.locator('.product-nav').waitFor({timeout:60000});await quiet()
  if(!only)await finish('Authentication & security')
  for(const tab of only||tabs){
    bucket()
    await page.evaluate(name=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:name})),tab)
    await quiet()
    // A page that is still on its loading placeholder has not rendered yet; give it time, then report it.
    const loading=async()=>{const text=await page.locator('.product-body').first().innerText().catch(()=>'');return text.length<600&&/Loading/.test(text)||await page.locator('.product-body [aria-busy=true]').count()>0}
    for(let waited=0;waited<15000&&await loading();waited+=500)await page.waitForTimeout(500)
    let problem=await loading()?'page was still loading after 25 seconds':''
    const active=(await page.locator('.product-nav button.active, .product-nav [aria-current=page]').first().innerText().catch(()=>'')).trim()
    if(!problem&&active&&!active.includes(tab))problem='navigation did not open the page (active: '+active.slice(0,40)+')'
    if(!problem&&mustShowData[tab]&&!mustShowData[tab].test(await page.locator('.product-body').first().innerText().catch(()=>'')))problem='no generated records are displayed'
    await finish(tab,{problem})
  }
}finally{
  await writeFile(out+'/ui-results.json',JSON.stringify(results,null,1))
  await browser.close()
}
const failed=Object.entries(results.features).filter(([,value])=>!value.ok)
console.log(`[ui sweep] ${Object.keys(results.features).length-failed.length}/${Object.keys(results.features).length} pages clean → ${out}/ui-results.json`)
if(failed.length)process.exitCode=1
