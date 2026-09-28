export type ControlReadResult={
  status:'ready'|'forbidden'|'unavailable'
  observedAt:string
  data?:Record<string,unknown>
  message?:string
}

const safeJson=async(response:Response)=>{
  const text=await response.text()
  if(!text)return null
  try{return JSON.parse(text)}catch{return null}
}

export const controlApi={
  read:async(page:string):Promise<ControlReadResult>=>{
    try{
      const response=await fetch('/control-api/'+encodeURIComponent(page),{
        method:'GET',
        credentials:'include',
        headers:{'Accept':'application/json','X-Ace-Control-Client':'platform-admin'}
      })
      const observedAt=new Date().toISOString()
      if(response.status===401||response.status===403)return {status:'forbidden',observedAt,message:'Privileged control-plane authorization is required.'}
      if(!response.ok)return {status:'unavailable',observedAt,message:'Control API is unavailable or this read contract is not implemented yet.'}
      const data=await safeJson(response)
      return {status:'ready',observedAt,data:data&&typeof data==='object'?data:{value:data}}
    }catch{
      return {status:'unavailable',observedAt:new Date().toISOString(),message:'Control API could not be reached. No operational change was attempted.'}
    }
  }
}
