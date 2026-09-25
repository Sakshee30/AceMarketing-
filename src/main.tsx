import React from 'react'
import ReactDOM from 'react-dom/client'
import AcePlatform from './AcePlatform'
import { installAceTracking } from './lib/tracker'

installAceTracking()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AcePlatform />
  </React.StrictMode>
)
