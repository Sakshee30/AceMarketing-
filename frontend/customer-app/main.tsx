import React,{useEffect,useState} from 'react'
import ReactDOM from 'react-dom/client'
import CustomerWorkspace from '../src/customer-app/public'
import LoginPage from '../src/auth/LoginPage'
import {FrontendAppBoundary} from '../src/components/system/FrontendFoundation'
import {ConnectionStatus} from '../src/components/system/ConnectionStatus'
import {ChunkRecoveryNotice} from '../src/components/system/ChunkRecoveryNotice'
import {LoadingState} from '../src/components/system/FrontendStates'
import {getPublicRuntimeConfig} from '../../packages/client-core/src/runtime-config'
import {installAceTracking} from '../../packages/client-core/src/tracking'
import {installBeforeUnloadDirtyWorkGuard} from '../src/lib/dirty-work'
import '../src/foundation.css'
import '../src/ace-platform.css'

const root=document.getElementById('root')
if(!root)throw new Error('AceMarketing customer-app root is missing.')

const publicSiteTarget=()=>{
  const env=((import.meta as any).env||{}) as Record<string,string|undefined>
  return String(env.VITE_PUBLIC_SITE_URL||'/')
}

function CustomerApp(){
  const [hash,setHash]=useState(()=>window.location.hash||'#/workspace')
  useEffect(()=>{
    if(!window.location.hash)window.history.replaceState(null,'','#/workspace')
    const sync=()=>setHash(window.location.hash||'#/workspace')
    window.addEventListener('hashchange',sync)
    return()=>window.removeEventListener('hashchange',sync)
  },[])
  const openApp=()=>{if(window.location.hash!=='#/workspace')window.location.hash='#/workspace';setHash('#/workspace')}
  const back=()=>window.location.assign(publicSiteTarget())
  if(hash.startsWith('#/login'))return <LoginPage back={back} openApp={openApp}/>
  if(!hash.startsWith('#/workspace'))return <LoadingState title="Opening workspace" description="Redirecting to the authenticated customer application."/>
  return <CustomerWorkspace back={back}/>
}

let runtime
try{
  runtime=getPublicRuntimeConfig()
  root.dataset.releaseId=runtime.releaseId
  root.dataset.environment=runtime.environment
}catch(error){
  const message=error instanceof Error?error.message:'Invalid public runtime configuration.'
  root.innerHTML='<main class="ace-preboot" role="alert"><section class="ace-preboot-card"><strong>AceMarketing cannot start safely.</strong><p>'+message.replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[char]||char))+'</p></section></main>'
  throw error
}

installAceTracking()
installBeforeUnloadDirtyWorkGuard()

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <FrontendAppBoundary label="AceMarketing customer application">
      <ConnectionStatus/>
      <ChunkRecoveryNotice/>
      <CustomerApp/>
    </FrontendAppBoundary>
  </React.StrictMode>
)
