export const createDrainController=()=> {
  let draining=false
  let active=0
  let startedAt=null
  const waiters=new Set()

  const notify=()=>{
    if(active!==0)return
    for(const resolve of waiters)resolve(true)
    waiters.clear()
  }

  const beginTask=()=>{
    if(draining)return null
    active+=1
    let done=false
    return ()=>{
      if(done)return
      done=true
      active=Math.max(0,active-1)
      notify()
    }
  }

  const beginDrain=()=>{
    if(!draining){
      draining=true
      startedAt=new Date().toISOString()
      notify()
    }
    return snapshot()
  }

  const waitForDrain=async(timeoutMs=10_000)=>{
    if(active===0)return true
    const bounded=Math.max(0,Number(timeoutMs)||0)
    if(bounded===0)return false
    return new Promise(resolve=>{
      let settled=false
      const finish=value=>{
        if(settled)return
        settled=true
        clearTimeout(timer)
        waiters.delete(onDrained)
        resolve(value)
      }
      const onDrained=()=>finish(true)
      waiters.add(onDrained)
      const timer=setTimeout(()=>finish(false),bounded)
    })
  }

  const snapshot=()=>({draining,active,startedAt})
  return {beginTask,beginDrain,waitForDrain,snapshot}
}
