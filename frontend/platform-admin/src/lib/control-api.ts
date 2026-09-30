export type ControlReadResult={
  status:'ready'|'forbidden'|'unavailable'
  observedAt:string
  data?:Record<string,unknown>
  message?:string
}

export type ControlSession={
  authenticated:boolean
  email?:string
  role?:string
}

const safeJson=async(response:Response)=>{
  const text=await response.text()
  if(!text)return null
  try{return JSON.parse(text)}catch{return null}
}

const request=async(path:string,init:RequestInit={})=>fetch(path,{
  credentials:'include',
  ...init,
  headers:{
    'Accept':'application/json',
    'X-Ace-Control-Client':'platform-admin',
    ...(init.body?{'Content-Type':'application/json'}:{}),
    ...(init.headers||{})
  }
})

export const controlApi={
  session:async():Promise<ControlSession>=>{
    try{
      const response=await request('/control-api/auth/me')
      if(response.status===401||response.status===403)return {authenticated:false}
      if(!response.ok)return {authenticated:false}
      const data=await safeJson(response)
      return {
        authenticated:Boolean(data?.authenticated),
        email:typeof data?.email==='string'?data.email:undefined,
        role:typeof data?.role==='string'?data.role:undefined
      }
    }catch{return {authenticated:false}}
  },
  login:async(email:string,password:string):Promise<{ok:boolean;message?:string}>=>{
    try{
      const response=await request('/control-api/auth/login',{
        method:'POST',
        body:JSON.stringify({email,password})
      })
      const data=await safeJson(response)
      if(response.ok)return {ok:true}
      return {ok:false,message:typeof data?.error==='string'?data.error:'Platform control login failed.'}
    }catch{return {ok:false,message:'Platform control API could not be reached.'}}
  },
  logout:async():Promise<void>=>{
    try{await request('/control-api/auth/logout',{method:'POST'})}catch{}
  },
  read:async(page:string):Promise<ControlReadResult>=>{
    try{
      const response=await request('/control-api/'+encodeURIComponent(page),{method:'GET'})
      const observedAt=new Date().toISOString()
      if(response.status===401||response.status===403)return {status:'forbidden',observedAt,message:'Privileged control-plane authorization is required.'}
      if(!response.ok){
        const data=await safeJson(response)
        return {status:'unavailable',observedAt,message:typeof data?.error==='string'?data.error:'Control API is unavailable or this read contract is not implemented yet.'}
      }
      const data=await safeJson(response)
      return {status:'ready',observedAt,data:data&&typeof data==='object'?data:{value:data}}
    }catch{
      return {status:'unavailable',observedAt:new Date().toISOString(),message:'Control API could not be reached. No operational change was attempted.'}
    }
  }
}
