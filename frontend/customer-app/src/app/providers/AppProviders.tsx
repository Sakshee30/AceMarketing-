import {useState,type ReactNode} from 'react'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {ConnectionStatus} from '../../../../src/components/system/ConnectionStatus'
import {ChunkRecoveryNotice} from '../../../../src/components/system/ChunkRecoveryNotice'
import {FrontendAppBoundary} from '../../../../src/components/system/FrontendFoundation'
import {SkipLink,AccessibilityRoot} from '../../../../../packages/design-system/src/Accessibility'

export function AppProviders({children}:{children:ReactNode}){
  const [queryClient]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:false,staleTime:15_000}}}))
  return <QueryClientProvider client={queryClient}><FrontendAppBoundary label="AceMarketing customer application">
    <ConnectionStatus/>
    <ChunkRecoveryNotice/>
    <SkipLink href="#customer-main-content"/>
    <AccessibilityRoot id="customer-main-content">{children}</AccessibilityRoot>
  </FrontendAppBoundary></QueryClientProvider>
}
