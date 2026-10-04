import {hasDirtyWork} from './dirty-work'
import {useVisibilityPolling} from './visibility-polling'

/** Refresh evidence without remounting features or discarding drafts.
 * Production surfaces can opt in to the same polling behavior explicitly.
 */
export function useDevelopmentLiveRefresh(task:()=>void|Promise<unknown>,enabled=true,production=false){
  useVisibilityPolling(async()=>{
    if(hasDirtyWork())return
    if(document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return
    if(document.querySelector('[role="dialog"][aria-modal="true"]'))return
    await task()
  },{intervalMs:5_000,immediate:false,enabled:(import.meta.env.DEV||production)&&enabled})
}
