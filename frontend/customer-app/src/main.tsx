import React,{useEffect,useState} from 'react'
import ReactDOM from 'react-dom/client'
import CustomerBootstrap from '../../src/customer-app/public'
import LoginPage from '../../src/auth/LoginPage'
import {LoadingState} from '../../src/components/system/FrontendStates'
import {normalizeCustomerHash,parseCustomerRoute} from '../../src/customer-app/navigation'
import {bootstrapCustomerApplication,renderPrebootFailure} from './app/bootstrap/bootstrap'
import {AppProviders} from './app/providers/AppProviders'
import '../../src/foundation.css'
import '../../src/ace-platform.css'

const root=document.getElementById('root')
if(!root)throw new Error('AceMarketing customer-app root is missing.')

const publicSiteTarget=()=>{
  const env=((import.meta as any).env||{}) as Record<string,string|undefined>
  return String(env.VITE_PUBLIC_SITE_URL||'/')
}

function CustomerApp(){
  const [hash,setHash]=useState(()=>normalizeCustomerHash(window.location.hash))
  useEffect(()=>{
    if(!window.location.hash)window.history.replaceState(null,'','#/workspace')
    const sync=()=>setHash(normalizeCustomerHash(window.location.hash))
    window.addEventListener('hashchange',sync)
    return()=>window.removeEventListener('hashchange',sync)
  },[])
  const openApp=()=>{if(window.location.hash!=='#/workspace')window.location.hash='#/workspace';setHash('#/workspace')}
  const back=()=>window.location.assign(publicSiteTarget())
  const route=parseCustomerRoute(hash)
  if(route.kind==='login')return <LoginPage back={back} openApp={openApp}/>
  if(route.kind!=='workspace')return <LoadingState title="Opening workspace" description="Redirecting to the authenticated customer application."/>
  return <CustomerBootstrap back={back}/>
}

try{
  bootstrapCustomerApplication()
}catch(error){
  renderPrebootFailure(error)
  throw error
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppProviders><CustomerApp/></AppProviders>
  </React.StrictMode>
)
