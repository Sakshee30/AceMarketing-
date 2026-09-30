export const isChunkLoadFailure=(error:unknown)=>/chunk|dynamically imported|loading css chunk/i.test(error instanceof Error?error.message:String(error||''))

const key='ace_chunk_recovery_attempted'
export const recoverChunkOnce=()=>{
  try{
    if(window.sessionStorage.getItem(key)==='1')return false
    window.sessionStorage.setItem(key,'1')
  }catch{}
  window.location.reload()
  return true
}

export const clearChunkRecoveryAttempt=()=>{
  try{window.sessionStorage.removeItem(key)}catch{}
}
