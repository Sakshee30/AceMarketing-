export const frontendMetricEventName='ace-frontend-metric'

export type FrontendMetricName='LCP'|'CLS'|'INP'|'FCP'|'TTFB'|'LONG_TASK'|'RESOURCE_COUNT'

export type FrontendMetric={
  name:FrontendMetricName
  value:number
  unit:'ms'|'score'|'count'
  rating:'good'|'needs-improvement'|'poor'|'observed'
  surface:string
  route:string
  at:string
}

declare global{
  interface Window{
    __ACE_FRONTEND_METRICS__?:FrontendMetric[]
  }
}

const rating=(name:FrontendMetricName,value:number):FrontendMetric['rating']=>{
  if(name==='LCP')return value<=2500?'good':value<=4000?'needs-improvement':'poor'
  if(name==='INP')return value<=200?'good':value<=500?'needs-improvement':'poor'
  if(name==='CLS')return value<=0.1?'good':value<=0.25?'needs-improvement':'poor'
  if(name==='FCP')return value<=1800?'good':value<=3000?'needs-improvement':'poor'
  if(name==='TTFB')return value<=800?'good':value<=1800?'needs-improvement':'poor'
  return 'observed'
}

const publish=(surface:string,name:FrontendMetricName,value:number,unit:FrontendMetric['unit'])=>{
  if(!Number.isFinite(value)||value<0)return
  const metric:FrontendMetric={
    name,
    value:Number(value.toFixed(name==='CLS'?4:1)),
    unit,
    rating:rating(name,value),
    surface,
    route:location.pathname+location.hash,
    at:new Date().toISOString()
  }
  const list=window.__ACE_FRONTEND_METRICS__||[]
  const next=[...list,metric].slice(-200)
  window.__ACE_FRONTEND_METRICS__=next
  window.dispatchEvent(new CustomEvent(frontendMetricEventName,{detail:metric}))
}

const observe=(type:string,handler:(entries:any[])=>void)=>{
  if(typeof PerformanceObserver==='undefined')return()=>{}
  try{
    const observer=new PerformanceObserver(list=>handler(list.getEntries() as any[]))
    observer.observe({type,buffered:true} as any)
    return()=>observer.disconnect()
  }catch{return()=>{}}
}

export const installFrontendPerformanceMonitoring=(surface:string)=>{
  if(typeof window==='undefined'||typeof performance==='undefined')return()=>{}
  const cleanups:Array<()=>void>=[]
  const nav=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined
  if(nav){
    publish(surface,'TTFB',Math.max(0,nav.responseStart-nav.requestStart),'ms')
    publish(surface,'RESOURCE_COUNT',performance.getEntriesByType('resource').length,'count')
  }
  const paints=performance.getEntriesByType('paint') as PerformanceEntry[]
  const fcp=paints.find(entry=>entry.name==='first-contentful-paint')
  if(fcp)publish(surface,'FCP',fcp.startTime,'ms')

  let lcp=0
  cleanups.push(observe('largest-contentful-paint',entries=>{
    const last=entries.at(-1)
    if(last){lcp=last.startTime;publish(surface,'LCP',lcp,'ms')}
  }))

  let cls=0
  cleanups.push(observe('layout-shift',entries=>{
    for(const entry of entries){
      if(!entry.hadRecentInput)cls+=Number(entry.value||0)
    }
    publish(surface,'CLS',cls,'score')
  }))

  let inp=0
  cleanups.push(observe('event',entries=>{
    for(const entry of entries){
      const duration=Number(entry.duration||0)
      if(duration>inp)inp=duration
    }
    if(inp>0)publish(surface,'INP',inp,'ms')
  }))

  cleanups.push(observe('longtask',entries=>{
    for(const entry of entries)publish(surface,'LONG_TASK',Number(entry.duration||0),'ms')
  }))

  const visibility=()=>{
    if(document.visibilityState==='hidden'){
      publish(surface,'RESOURCE_COUNT',performance.getEntriesByType('resource').length,'count')
      if(lcp>0)publish(surface,'LCP',lcp,'ms')
      publish(surface,'CLS',cls,'score')
      if(inp>0)publish(surface,'INP',inp,'ms')
    }
  }
  document.addEventListener('visibilitychange',visibility)
  cleanups.push(()=>document.removeEventListener('visibilitychange',visibility))

  return()=>{for(const cleanup of cleanups)cleanup()}
}

export const readFrontendMetrics=()=>[...(window.__ACE_FRONTEND_METRICS__||[])]
