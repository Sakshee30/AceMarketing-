import {chromium} from '@playwright/test'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
const out='artifacts/frontend-design'
await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true})
const page=await browser.newPage()
const errors=[]
page.on('pageerror',error=>errors.push(error.message))
await page.goto('http://127.0.0.1:5173/#/workspace')
await page.locator('.product-nav').waitFor()
const consent=page.getByRole('button',{name:'Essential only',exact:true})
if(await consent.isVisible())await consent.click()
const source=await readFile('frontend/src/features/workspace/manifest.ts','utf8')
const groups=source.slice(source.indexOf('const groupTabs:'),source.indexOf('const groupTitles:'))
const tabs=[...groups.matchAll(/'([^']+)'/g)].map(match=>match[1])
if(!tabs.length)throw new Error('No workspace routes found')
const results=[]
for(const width of [1440,390]){
 await page.setViewportSize({width,height:960})
 for(const tab of [...new Set(tabs)]){
  await page.evaluate(name=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:name})),tab)
  await page.waitForTimeout(450)
  await page.locator('.product-body [aria-busy=true]').first().waitFor({state:'hidden',timeout:15000}).catch(()=>{})
  const result=await page.evaluate(()=>{
   const main=document.querySelector('.product-main')
   const body=document.querySelector('.product-body')
   return {overflow:Math.max(document.documentElement.scrollWidth-innerWidth,main.scrollWidth-main.clientWidth),crash:!!document.querySelector('.workspace-section-error'),offenders:[...body.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>innerWidth+2&&el.getBoundingClientRect().width>0&&!el.closest('[class*=table],[class*=scroll],pre')).slice(0,8).map(el=>({tag:el.tagName,cls:el.className,width:Math.round(el.getBoundingClientRect().width)}))}
  })
  results.push({width,tab,...result})
  console.log(JSON.stringify(results.at(-1)))
  if(['Overview','Enrich','Settings','AI Intelligence'].includes(tab)){
   await page.waitForTimeout(600)
   await page.screenshot({path:`${out}/${tab.toLowerCase().replaceAll(' ','-')}-${width}.png`})
  }
 }
}
await writeFile(`${out}/audit.json`,JSON.stringify({errors,results},null,2))
await browser.close()
