import {expect,test} from '@playwright/test'

test('customer workspace long-session resource growth remains bounded',async({page})=>{
  const minutes=Math.max(1,Math.min(180,Number(process.env.FRONTEND_SOAK_MINUTES||5)))
  const deadline=Date.now()+minutes*60_000
  const tabs=['Overview','Monitoring','Audiences','Integrations','Reports','Ask Ace','Overview']
  await page.goto('/#/workspace?tab=Overview')
  await expect(page.getByRole('heading',{name:/Acquisition command center/i})).toBeVisible()

  const session=await page.context().newCDPSession(page)
  await session.send('Performance.enable')
  const sample=async()=>{
    await session.send('HeapProfiler.collectGarbage').catch(()=>{})
    const result:any=await session.send('Performance.getMetrics')
    const map=Object.fromEntries((result.metrics||[]).map((metric:any)=>[metric.name,metric.value]))
    return {heap:Number(map.JSHeapUsedSize||0),nodes:Number(map.Nodes||0),listeners:Number(map.JSEventListeners||0)}
  }

  const start=await sample()
  let cycles=0
  while(Date.now()<deadline){
    for(const tab of tabs){
      await page.evaluate((next:string)=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:next})),tab)
      await page.waitForTimeout(350)
    }
    cycles+=1
  }
  const end=await sample()
  const heapGrowth=end.heap-start.heap
  const listenerGrowth=end.listeners-start.listeners
  console.log(JSON.stringify({minutes,cycles,start,end,heapGrowth,listenerGrowth}))
  expect(listenerGrowth).toBeLessThanOrEqual(200)
  expect(heapGrowth).toBeLessThanOrEqual(80*1024*1024)
})
