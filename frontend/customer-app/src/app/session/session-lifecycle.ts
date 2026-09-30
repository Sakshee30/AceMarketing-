import {clearSessionToken,getSessionGeneration,getSessionToken,setSessionToken} from '../../../../../packages/client-core/src/session-authority'

export const customerSessionLifecycle={
  token:()=>getSessionToken(),
  generation:()=>getSessionGeneration(),
  authenticate:(token:string)=>setSessionToken(token),
  signOut:()=>clearSessionToken()
}
