import React from 'react'
import ReactDOM from 'react-dom/client'
import AcePlatform from './AcePlatform'
import DashboardQuickNav from './DashboardQuickNav'
import './dashboard-quick-nav.css'
import { installAceTracking } from './lib/tracker'
import { FrontendAppBoundary } from './components/system/FrontendFoundation'

installAceTracking()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FrontendAppBoundary label="AceMarketing application">
      <AcePlatform />
      <DashboardQuickNav />
    </FrontendAppBoundary>
  </React.StrictMode>
)
