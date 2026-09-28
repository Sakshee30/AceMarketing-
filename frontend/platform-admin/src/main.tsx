import React from 'react'
import ReactDOM from 'react-dom/client'
import ControlCenterApp from './ControlCenterApp'
import {installFrontendPerformanceMonitoring} from '../../../packages/client-core/src/frontend-performance'

const root=document.getElementById('root')
if(!root)throw new Error('AceMarketing platform-admin root is missing.')

installFrontendPerformanceMonitoring('platform-admin')

ReactDOM.createRoot(root).render(<React.StrictMode><ControlCenterApp/></React.StrictMode>)
