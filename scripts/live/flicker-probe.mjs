// Measures visible refresh churn on workspace pages: loading placeholders, "Refreshing…" labels,
// buttons flipping to disabled, and large DOM replacements during background polling.
//   node scripts/live/flicker-probe.mjs [--seconds=17] [--tabs=A,B]
import {chromium} from '@playwright/test'
const options=Object.fromEntries(process.argv.slice(2).map(arg=>{const [key,...rest]=arg.replace(/^--/,'').split('=');return [key,rest.join('=')||'true']}))
const seconds=Number(options.seconds||17)
const tabs=(options.tabs||'Overview,Enrich,Lead Grading,Attribution,AI Intelligence,Journeys,Follow-ups,Models,Calls,Monitoring,Customer 360,Events').split(',')
const browser=await chromium.launch({channel:'chrome',headless:true}).catch(()=>chromium.launch({headless:true}))
const page=await browser.newPage({viewport:{width:1440,height:1000}})
await page.goto('http://127.0.0.1:5173/#/login');await page.locator('input[type=email]').fill('owner@example.com');await page.locator('input[type=password]').fill('demo123');await page.locator('.login-submit').click();await page.locator('.product-nav').waitFor({timeout:60000})
let total=0
for(const tab of tabs){
  await page.evaluate(name=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:name})),tab)
  await page.waitForTimeout(6000) // initial load is allowed to show placeholders
  const result=await page.evaluate(ms=>new Promise(resolve=>{
    const root=document.querySelector('.product-shell')||document.body
    const seen={placeholders:0,refreshingLabels:0,disabledFlips:0,busyFlips:0,bigReplacements:0,api:0}
    const observer=new MutationObserver(records=>{
      for(const record of records){
        if(record.type==='attributes'){
          if(record.attributeName==='disabled'&&record.target.hasAttribute('disabled'))seen.disabledFlips++
          if(record.attributeName==='aria-busy'&&record.target.getAttribute('aria-busy')==='true')seen.busyFlips++
          continue
        }
        if(record.type==='characterData'){if(/Refreshing|Checking|Loading/.test(record.target.data||''))seen.refreshingLabels++;continue}
        let removed=0
        for(const node of record.removedNodes)removed+=node.nodeType===1?1+node.querySelectorAll('*').length:0
        if(removed>=25)seen.bigReplacements++
        for(const node of record.addedNodes){
          const text=node.textContent||''
          if(node.nodeType===1&&(node.matches?.('[class*=loading],[aria-busy=true]')||node.querySelector?.('[class*=loading-state],[class*=LoadingState]')))seen.placeholders++
          else if(/^(Refreshing…|Checking…|Loading)/.test(text.trim())&&text.length<80)seen.refreshingLabels++
        }
      }
    })
    observer.observe(root,{subtree:true,childList:true,attributes:true,characterData:true,attributeFilter:['disabled','aria-busy']})
    const start=performance.getEntriesByType('resource').length
    setTimeout(()=>{observer.disconnect();seen.api=performance.getEntriesByType('resource').slice(start).filter(entry=>entry.name.includes('/api/')).length;resolve(seen)},ms)
  }),seconds*1000)
  const churn=result.placeholders+result.refreshingLabels+result.disabledFlips+result.busyFlips+result.bigReplacements
  total+=churn
  console.log((churn?'FLICKER ':'steady  ')+tab.padEnd(18)+JSON.stringify(result))
}
await browser.close()
console.log('[flicker probe] total visible churn events: '+total)
if(total)process.exitCode=1
