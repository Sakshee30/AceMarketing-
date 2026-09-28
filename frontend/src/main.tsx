import React,{lazy,Suspense} from 'react'
import ReactDOM from 'react-dom/client'
import AcePlatform from './AcePlatform'
import './dashboard-quick-nav.css'
import './foundation.css'
import { installAceTracking } from './lib/tracker'
import { FrontendAppBoundary,FrontendWidgetBoundary } from './components/system/FrontendFoundation'
import { getPublicRuntimeConfig } from './lib/runtime-config'
import { installBeforeUnloadDirtyWorkGuard } from './lib/dirty-work'
import { ConnectionStatus } from './components/system/ConnectionStatus'
import { ChunkRecoveryNotice } from './components/system/ChunkRecoveryNotice'

const DashboardQuickNav=lazy(()=>import('./DashboardQuickNav'))

const root=document.getElementById('root')
if(!root)throw new Error('AceMarketing root element is missing.')

let runtimeConfig
try{
  runtimeConfig=getPublicRuntimeConfig()
  root.dataset.releaseId=runtimeConfig.releaseId
  root.dataset.environment=runtimeConfig.environment
}catch(error){
  const message=error instanceof Error?error.message:'Invalid public runtime configuration.'
  root.innerHTML='<main class="ace-preboot" role="alert"><section class="ace-preboot-card"><strong>AceMarketing cannot start safely.</strong><p>'+message.replace(/[<>&"']/g,(char)=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[char]||char))+'</p></section></main>'
  throw error
}

installAceTracking()
installBeforeUnloadDirtyWorkGuard()

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <FrontendAppBoundary label="AceMarketing application">
      <ConnectionStatus />
      <ChunkRecoveryNotice />
      <AcePlatform />
      <FrontendWidgetBoundary label="Dashboard navigator">
        <Suspense fallback={null}>
          <DashboardQuickNav />
        </Suspense>
      </FrontendWidgetBoundary>
    </FrontendAppBoundary>
  </React.StrictMode>
)
