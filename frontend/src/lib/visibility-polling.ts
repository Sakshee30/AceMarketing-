import {useEffect,useRef} from 'react'

type VisibilityPollingOptions={
  intervalMs:number
  enabled?:boolean
  immediate?:boolean
}

export function useVisibilityPolling(
  task:()=>void|Promise<void>,
  {intervalMs,enabled=true,immediate=true}:VisibilityPollingOptions
){
  const taskRef=useRef(task)
  taskRef.current=task

  useEffect(()=>{
    if(!enabled)return

    let disposed=false
    let running=false

    const run=async()=>{
      if(disposed||running||document.visibilityState!=='visible')return
      running=true
      try{
        await taskRef.current()
      }finally{
        running=false
      }
    }

    if(immediate)void run()
    const interval=window.setInterval(()=>void run(),intervalMs)
    const onVisibility=()=>{
      if(document.visibilityState==='visible')void run()
    }

    document.addEventListener('visibilitychange',onVisibility)
    return()=>{
      disposed=true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange',onVisibility)
    }
  },[enabled,immediate,intervalMs])
}
