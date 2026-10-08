import {hasDirtyWork} from './dirty-work'
import {useVisibilityPolling} from './visibility-polling'

// True only while a polling refresh is starting its task. Loaders read it synchronously.
let backgroundRefresh=false

/** Show a loading indicator for a first load or a user-requested refresh, but not for a
 * background poll: the page keeps showing its current data until the new data replaces it.
 */
export const beginLoading=(setLoading:(value:boolean)=>void)=>{
  if(!backgroundRefresh)setLoading(true)
}

/** Refresh evidence without remounting features or discarding drafts.
 * Production surfaces can opt in to the same polling behavior explicitly.
 */
export function useDevelopmentLiveRefresh(task:()=>void|Promise<unknown>,enabled=true,production=false){
  useVisibilityPolling(async()=>{
    if(hasDirtyWork())return
    if(document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return
    if(document.querySelector('[role="dialog"][aria-modal="true"]'))return
    let pending:void|Promise<unknown>
    backgroundRefresh=true
    try{pending=task()}finally{backgroundRefresh=false}
    await pending
  },{intervalMs:5_000,immediate:false,enabled:(import.meta.env.DEV||production)&&enabled})
}
