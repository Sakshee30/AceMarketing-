import {useEffect,useState} from 'react'
import {confirmDiscardDirtyWork} from '../../lib/dirty-work'
import {getPublicRuntimeConfig} from '../../lib/runtime-config'

type PreloadFailure={
  message:string
  at:number
}

export function ChunkRecoveryNotice(){
  const [failure,setFailure]=useState<PreloadFailure|null>(null)

  useEffect(()=>{
    const onPreloadError=(event:Event)=>{
      event.preventDefault()
      const payload=event as Event&{payload?:unknown}
      const detail=payload?.payload
      const message=detail instanceof Error
        ?detail.message
        :'A newer AceMarketing release may be available and this browser could not load one required application chunk.'
      setFailure({message,at:Date.now()})
    }
    window.addEventListener('vite:preloadError',onPreloadError)
    return()=>window.removeEventListener('vite:preloadError',onPreloadError)
  },[])

  if(!failure)return null

  const release=getPublicRuntimeConfig().releaseId
  const reload=()=>{
    if(!confirmDiscardDirtyWork('the updated AceMarketing application'))return
    window.location.reload()
  }

  return <aside className="ace-chunk-recovery" role="alert" aria-live="assertive" data-testid="chunk-recovery">
    <div>
      <strong>Application update needs a controlled refresh</strong>
      <p>{failure.message}</p>
      <small>Current release: {release}. AceMarketing will not reload automatically or discard unsaved work.</small>
    </div>
    <div className="ace-chunk-recovery-actions">
      <button type="button" onClick={()=>setFailure(null)}>Keep working</button>
      <button type="button" onClick={reload}>Reload safely</button>
    </div>
  </aside>
}
