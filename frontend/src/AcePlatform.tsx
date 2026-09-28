import {lazy,Suspense,useEffect,useState} from 'react'
import './ace-platform.css'
import {RouteAnnouncer} from './components/system/FrontendFoundation'
import {LoadingState} from './components/system/FrontendStates'
import {ConsentBanner} from './components/system/ConsentBanner'

const CustomerWorkspace=lazy(()=>import('./customer-app/public'))
const PublicSite=lazy(()=>import('../../website/public-site/src/public'))
const LoginPage=lazy(()=>import('./auth/LoginPage'))
const DeepLinkResolver=lazy(()=>import('./deep-link/DeepLinkResolver'))

type View='site'|'app'|'login'|'pricing'|'demo'|'company'|'resources'|'case-studies'|'privacy'|'terms'|'security'|'solutions'|'industries'|'agents-public'|'integrations-public'
const viewHash:Record<View,string>={
 site:'#/',app:'#/workspace',login:'#/login',pricing:'#/pricing',demo:'#/demo',company:'#/company',resources:'#/resources','case-studies':'#/case-studies',privacy:'#/privacy',terms:'#/terms',security:'#/security',solutions:'#/solutions',industries:'#/industries','agents-public':'#/agents', 'integrations-public':'#/integrations'
}
const hashView=(hash:string):View=>{
 if(hash.startsWith('#/workspace')) return 'app'
 if(hash.startsWith('#/resources')) return 'resources'
 if(hash.startsWith('#/case-studies')) return 'case-studies'
 const found=(Object.entries(viewHash) as [View,string][]).find(([,route])=>route===hash)
 return found?.[0]||'site'
}

export default function AcePlatform(){
 const currentHash=typeof window!=='undefined'?window.location.hash:'#/'
 const[view,setView]=useState<View>(()=>hashView(currentHash))
 const publicRouteLabel:Record<View,string>={
  site:'AceMarketing home',app:'AceMarketing workspace',login:'Sign in',pricing:'Pricing',demo:'Book a demo',company:'Company',resources:'Resources','case-studies':'Case studies',privacy:'Privacy',terms:'Terms',security:'Security',solutions:'Solutions',industries:'Industries','agents-public':'Agents','integrations-public':'Integrations'
 }
 const navigate=(next:View)=>{
  setView(next)
  const route=viewHash[next]
  if(typeof window!=='undefined'&&window.location.hash!==route) window.location.hash=route
  if(typeof window!=='undefined') setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),0)
 }
 useEffect(()=>{
  const onHash=()=>setView(hashView(window.location.hash))
  const onAceView=(event:any)=>{const next=event?.detail as View;if(next&&viewHash[next])navigate(next)}
  window.addEventListener('hashchange',onHash)
  window.addEventListener('ace-view',onAceView as EventListener)
  if(!window.location.hash) window.history.replaceState(null,'',viewHash.site)
  return()=>{window.removeEventListener('hashchange',onHash);window.removeEventListener('ace-view',onAceView as EventListener)}
 },[])
 const goHome=()=>navigate('site')
 if(currentHash.startsWith('#/deep/')) return <Suspense fallback={<LoadingState title="Resolving link" description="Loading the destination resolver."/>}><DeepLinkResolver/></Suspense>
 if(view==='login')return <Suspense fallback={<LoadingState title="Loading sign in" description="Loading secure workspace access."/>}><LoginPage back={goHome} openApp={()=>navigate('app')}/></Suspense>
 const content=view==='app'
  ?<Suspense fallback={<LoadingState title="Loading workspace" description="Loading the authenticated customer application."/>}><CustomerWorkspace back={goHome}/></Suspense>
  :<Suspense fallback={<LoadingState title="Loading website" description="Loading AceMarketing public content."/>}><PublicSite view={view as any} navigate={navigate}/></Suspense>
 return <><RouteAnnouncer label={publicRouteLabel[view]||'AceMarketing'} focusSelector={view==='app'?'.product-body .page-head h1':'h1'}/>{content}<ConsentBanner/></>
}
