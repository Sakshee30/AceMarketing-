import type {PublicRoutePolicy} from './route-policy'

const ensureMeta=(name:string)=>{
  let node=document.head.querySelector<HTMLMetaElement>('meta[name="'+name+'"]')
  if(!node){node=document.createElement('meta');node.name=name;document.head.appendChild(node)}
  return node
}
const ensureLink=(rel:string)=>{
  let node=document.head.querySelector<HTMLLinkElement>('link[rel="'+rel+'"]')
  if(!node){node=document.createElement('link');node.rel=rel;document.head.appendChild(node)}
  return node
}

export const applyPublicSeo=(policy:PublicRoutePolicy)=>{
  const env=((import.meta as any).env||{}) as Record<string,string|undefined>
  const configured=String(env.VITE_PUBLIC_SITE_ORIGIN||'').replace(/\/$/,'')
  const origin=configured||window.location.origin
  const canonical=origin+policy.path
  document.title=policy.title
  ensureMeta('description').content=policy.description
  ensureMeta('robots').content=policy.index?'index,follow':'noindex,nofollow'
  ensureLink('canonical').href=canonical
  document.documentElement.lang='en'
}
