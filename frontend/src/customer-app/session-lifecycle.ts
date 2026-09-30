import {clearSessionToken,getSessionGeneration} from '../../../packages/client-core/src/session-authority'

export type SessionLifecycleSnapshot={
  generation:number
  state:'authenticated'|'anonymous'
}

export const currentSessionLifecycle=():SessionLifecycleSnapshot=>({
  generation:getSessionGeneration(),
  state:'authenticated'
})

export const installSessionExpiryHandler=(onAnonymous?:()=>void)=>{
  if(typeof window==='undefined')return()=>{}
  const handler=(event:Event)=>{
    const detail=(event as CustomEvent)?.detail
    if(detail?.state==='anonymous')onAnonymous?.()
  }
  window.addEventListener('ace-session-state',handler)
  return()=>window.removeEventListener('ace-session-state',handler)
}

export const expireSession=()=>{
  clearSessionToken()
  if(typeof window!=='undefined'&&!window.location.hash.startsWith('#/login'))window.location.hash='#/login'
}
