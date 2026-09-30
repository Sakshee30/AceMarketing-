const startedAt=new Date().toISOString()
let startupComplete=false
let draining=false
let drainStartedAt=null

export const markStartupComplete=()=>{
  startupComplete=true
}

export const beginProcessDrain=()=>{
  if(!draining){
    draining=true
    drainStartedAt=new Date().toISOString()
  }
  return processHealthSnapshot()
}

export const processHealthSnapshot=()=>({
  startedAt,
  startupComplete,
  draining,
  drainStartedAt
})

export const livenessState=()=>({
  ok:true,
  state:draining?'draining':'live',
  ...processHealthSnapshot()
})

export const startupState=()=>({
  ok:startupComplete&&!draining,
  state:draining?'draining':startupComplete?'started':'starting',
  ...processHealthSnapshot()
})

export const readinessState=async({storageHealth})=>{
  if(draining)return {
    ok:false,
    state:'draining',
    ...processHealthSnapshot()
  }
  if(!startupComplete)return {
    ok:false,
    state:'starting',
    ...processHealthSnapshot()
  }
  try{
    const persistence=await storageHealth()
    if(!persistence?.ok)return {
      ok:false,
      state:'dependency_unavailable',
      persistence,
      ...processHealthSnapshot()
    }
    return {
      ok:true,
      state:'ready',
      persistence,
      ...processHealthSnapshot()
    }
  }catch(error){
    return {
      ok:false,
      state:'dependency_unavailable',
      persistence:{ok:false,reason:error instanceof Error?error.message:'persistence check failed'},
      ...processHealthSnapshot()
    }
  }
}
