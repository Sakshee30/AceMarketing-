import type {ReactNode} from 'react'
import {ConnectionStatus} from '../../../../src/components/system/ConnectionStatus'
import {ChunkRecoveryNotice} from '../../../../src/components/system/ChunkRecoveryNotice'
import {FrontendAppBoundary} from '../../../../src/components/system/FrontendFoundation'
import {SkipLink,AccessibilityRoot} from '../../../../../packages/design-system/src/Accessibility'

export function AppProviders({children}:{children:ReactNode}){
  return <FrontendAppBoundary label="AceMarketing customer application">
    <ConnectionStatus/>
    <ChunkRecoveryNotice/>
    <SkipLink href="#customer-main-content"/>
    <AccessibilityRoot id="customer-main-content">{children}</AccessibilityRoot>
  </FrontendAppBoundary>
}
