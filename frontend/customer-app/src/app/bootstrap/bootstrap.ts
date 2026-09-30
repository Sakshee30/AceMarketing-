import {getPublicRuntimeConfig} from '../../../../../packages/client-core/src/runtime-config'
import {installAceTracking} from '../../../../../packages/client-core/src/tracking'
import {installFrontendPerformanceMonitoring} from '../../../../../packages/client-core/src/frontend-performance'
import {installBeforeUnloadDirtyWorkGuard} from '../../../../src/lib/dirty-work'

export type CustomerBootstrapRuntime={
  releaseId:string
  environment:string
  dispose:()=>void
}

export const bootstrapCustomerApplication=():CustomerBootstrapRuntime=>{
  const runtime=getPublicRuntimeConfig()
  const root=document.getElementById('root')
  if(!root)throw new Error('AceMarketing customer-app root is missing.')
  root.dataset.releaseId=runtime.releaseId
  root.dataset.environment=runtime.environment
  root.dataset.startupState='public-config-ready'
  installAceTracking()
  installFrontendPerformanceMonitoring('customer-app')
  const disposeDirtyGuard=installBeforeUnloadDirtyWorkGuard()
  return {
    releaseId:runtime.releaseId,
    environment:runtime.environment,
    dispose:()=>disposeDirtyGuard()
  }
}

export const renderPrebootFailure=(error:unknown)=>{
  const root=document.getElementById('root')
  if(!root)return
  const message=error instanceof Error?error.message:'Invalid public runtime configuration.'
  const escaped=message.replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[char]||char))
  root.dataset.startupState='configuration-error'
  root.innerHTML='<main class="ace-preboot" role="alert"><section class="ace-preboot-card"><strong>AceMarketing cannot start safely.</strong><p>'+escaped+'</p><button type="button" onclick="location.reload()">Retry startup</button></section></main>'
}
