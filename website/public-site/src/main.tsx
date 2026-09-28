import React,{useEffect,useState} from 'react'
import ReactDOM from 'react-dom/client'
import PublicSite,{type PublicSiteView} from './public'
import {policyForPath} from './route-policy'
import {applyPublicSeo} from './seo'
import {installAceTracking} from '../../../packages/client-core/src/tracking'
import {installFrontendPerformanceMonitoring} from '../../../packages/client-core/src/frontend-performance'
import {ConsentBanner} from '../../../frontend/src/components/system/ConsentBanner'
import '../../../frontend/src/foundation.css'
import '../../../frontend/src/ace-platform.css'

const root=document.getElementById('root')
if(!root)throw new Error('AceMarketing public-site root is missing.')

const customerTarget=(kind:'app'|'login')=>{
  const env=((import.meta as any).env||{}) as Record<string,string|undefined>
  const base=String(env.VITE_CUSTOMER_APP_URL||'').replace(/\/$/,'')
  if(base)return base+(kind==='login'?'#/login':'#/workspace')
  return kind==='login'?'/#/login':'/#/workspace'
}

function PublicSiteApp(){
  const [policy,setPolicy]=useState(()=>policyForPath(window.location.pathname))
  useEffect(()=>{
    applyPublicSeo(policy)
    const onPop=()=>setPolicy(policyForPath(window.location.pathname))
    window.addEventListener('popstate',onPop)
    return()=>window.removeEventListener('popstate',onPop)
  },[policy])

  const navigate=(next:string)=>{
    if(next==='app'||next==='login'){window.location.assign(customerTarget(next));return}
    const target=(next==='site'?'site':next) as PublicSiteView
    const nextPolicy=policyForPath(
      target==='site'?'/':
      target==='agents-public'?'/agents':
      target==='integrations-public'?'/integrations':
      '/'+target
    )
    if(window.location.pathname!==nextPolicy.path)window.history.pushState({},'',nextPolicy.path)
    setPolicy(nextPolicy)
    window.scrollTo({top:0,behavior:'smooth'})
  }

  return <><PublicSite view={policy.view} navigate={navigate}/><ConsentBanner/></>
}

installAceTracking()
installFrontendPerformanceMonitoring('public-site')
ReactDOM.createRoot(root).render(<React.StrictMode><PublicSiteApp/></React.StrictMode>)
