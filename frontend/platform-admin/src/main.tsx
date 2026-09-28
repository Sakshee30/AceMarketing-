import React from 'react'
import ReactDOM from 'react-dom/client'
import ControlCenterApp from './ControlCenterApp'

const root=document.getElementById('root')
if(!root)throw new Error('AceMarketing platform-admin root is missing.')

ReactDOM.createRoot(root).render(<React.StrictMode><ControlCenterApp/></React.StrictMode>)
