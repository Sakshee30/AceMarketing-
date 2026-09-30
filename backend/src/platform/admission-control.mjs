export const createConcurrencyAdmission=({limit=250}={})=>{
  let active=0
  const max=Math.max(1,Number(limit)||250)

  const acquire=()=>{
    if(active>=max)return null
    active+=1
    let released=false
    return ()=>{
      if(released)return
      released=true
      active=Math.max(0,active-1)
    }
  }

  return {
    acquire,
    snapshot:()=>({active,limit:max,available:Math.max(0,max-active)})
  }
}

export const globalAdmission=createConcurrencyAdmission({
  limit:Number(process.env.API_MAX_INFLIGHT||250)
})
