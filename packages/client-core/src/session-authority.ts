const sessionTokenKey='ace_session_token'
const legacyPersistentTokenKey='ace_token'
const rememberedEmailKey='ace_remembered_email'

let memoryToken:string|null=null
let initialized=false
let sessionGeneration=0

const sessionStore=()=>typeof window!=='undefined'?window.sessionStorage:null
const persistentStore=()=>typeof window!=='undefined'?window.localStorage:null

const publish=(state:'authenticated'|'anonymous')=>{
  if(typeof window==='undefined')return
  window.dispatchEvent(new CustomEvent('ace-session-state',{detail:{state,at:Date.now()}}))
}

const initialize=()=>{
  if(initialized||typeof window==='undefined')return
  initialized=true
  try{
    memoryToken=sessionStore()?.getItem(sessionTokenKey)||null
    const legacy=persistentStore()?.getItem(legacyPersistentTokenKey)||null
    if(!memoryToken&&legacy){
      memoryToken=legacy
      sessionStore()?.setItem(sessionTokenKey,legacy)
    }
    if(legacy)persistentStore()?.removeItem(legacyPersistentTokenKey)
  }catch{}
}

export const getSessionGeneration=()=>sessionGeneration

export const getSessionToken=()=>{
  initialize()
  return memoryToken
}

export const setSessionToken=(token:string,publishChange=true)=>{
  initialize()
  memoryToken=token||null
  sessionGeneration+=1
  try{
    if(token)sessionStore()?.setItem(sessionTokenKey,token)
    else sessionStore()?.removeItem(sessionTokenKey)
    persistentStore()?.removeItem(legacyPersistentTokenKey)
  }catch{}
  if(publishChange)publish(token?'authenticated':'anonymous')
}

export const clearSessionToken=()=>{
  initialize()
  memoryToken=null
  sessionGeneration+=1
  try{
    sessionStore()?.removeItem(sessionTokenKey)
    persistentStore()?.removeItem(legacyPersistentTokenKey)
  }catch{}
  publish('anonymous')
}

export const getRememberedEmail=()=>{
  try{return persistentStore()?.getItem(rememberedEmailKey)||''}catch{return ''}
}

export const setRememberedEmail=(email:string|null)=>{
  try{
    if(email)persistentStore()?.setItem(rememberedEmailKey,email)
    else persistentStore()?.removeItem(rememberedEmailKey)
  }catch{}
}

export const sessionAuthorityKeys={sessionTokenKey,legacyPersistentTokenKey,rememberedEmailKey} as const
