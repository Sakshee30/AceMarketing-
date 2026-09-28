import {useEffect,useState} from 'react'
import {ArrowRight,X} from 'lucide-react'
import {api} from '../lib/api'
import {Brand} from '../../../packages/design-system/src/Brand'

export default function DeepLinkResolver(){
 const slug=decodeURIComponent((window.location.hash.match(/^#\/deep\/([^?]+)/)?.[1]||''))
 const [link,setLink]=useState<any>(null)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 useEffect(()=>{
  let active=true
  api.deepLinks().then(async(r:any)=>{
   const found=(r.items||[]).find((x:any)=>x.slug===slug&&x.status==='active')
   if(!active)return
   if(!found){setError('This deep link is unavailable or inactive.');setLoading(false);return}
   setLink(found);setLoading(false)
   await api.recordDeepLinkEvent({slug,kind:'click',source:'ace_resolver'}).catch(()=>null)
  }).catch((e:any)=>{if(active){setError(e?.message||'Deep link could not be loaded.');setLoading(false)}})
  return()=>{active=false}
 },[slug])
 const openApp=async()=>{if(!link)return;await api.recordDeepLinkEvent({slug,kind:'app_open',source:'ace_resolver'}).catch(()=>null);window.location.href=link.target}
 const openWeb=()=>{if(link?.fallback)window.location.href=link.fallback}
 return <div className="login-shell"><div className="login-card"><Brand/><div className="login-title"><h1>Continue your journey</h1><p>{loading?'Resolving destination…':error||link?.name}</p></div>{!loading&&!error&&link&&<><div className="site-detail-grid"><div><span>Route</span><b>{link.slug}</b></div><div><span>Status</span><b>Active</b></div></div><div className="approval-actions"><button onClick={openWeb}>Continue on web</button><button className="approve" onClick={openApp}>Open app</button></div></>}{error&&<div className="delivery-notice error"><X/><span>{error}</span></div>}<button className="login-back" onClick={()=>window.location.hash='#/'}><ArrowRight/>Back to AceMarketing</button></div></div>
}
