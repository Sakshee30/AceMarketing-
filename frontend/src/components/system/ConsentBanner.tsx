import {useState} from 'react'
import {createPortal} from 'react-dom'
import {ShieldCheck} from 'lucide-react'
import {getLocalConsent,saveLocalConsent} from '../../lib/tracker'

export function ConsentBanner(){
 const [visible,setVisible]=useState(()=>!getLocalConsent())
 const choose=async(analytics:boolean,marketing:boolean,personalization:boolean)=>{
  await saveLocalConsent({analytics,marketing,personalization})
  setVisible(false)
  requestAnimationFrame(()=>document.querySelector<HTMLElement>('.ace-skip-link')?.focus())
 }
 if(typeof document==='undefined')return null
 const node=!visible
  ?<button className="consent-manage" onClick={()=>setVisible(true)} aria-label="Manage privacy choices"><ShieldCheck/> Privacy</button>
  :<div className="consent-overlay"><div className="consent-banner" role="dialog" aria-label="Privacy choices"><div className="consent-copy"><ShieldCheck/><div><b>Your privacy choices</b><p>Essential storage is always used for security and core functionality. Analytics, advertising signals and personalization stay off until you choose to enable them.</p></div></div><div className="consent-actions"><button onClick={()=>choose(false,false,false)}>Essential only</button><button onClick={()=>choose(true,false,false)}>Allow analytics</button><button className="primary" onClick={()=>choose(true,true,true)}>Allow all</button></div></div></div>
 return createPortal(node,document.body)
}

export default ConsentBanner
