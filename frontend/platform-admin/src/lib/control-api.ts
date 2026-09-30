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

export type PlatformChangeRequest={
  environment:string
  scopeType:string
  scopeId?:string
  reason:string
  ticket?:string
  risk:'low'|'medium'|'high'|'critical'
  oldState?:Record<string,unknown>
  desiredState?:Record<string,unknown>
  impactReport?:Record<string,unknown>
  healthGates?:Array<Record<string,unknown>>
  rollbackPlan?:Record<string,unknown>
}

export type RecoveryExerciseRequest={
  environment:string
  scenario:'process_loss'|'availability_zone_loss'|'database_failover'|'regional_disaster'|'data_corruption'|'tenant_restore'|'object_recovery'|'queue_reconciliation'|'credential_recovery'
  declaredRpoMinutes?:number
  declaredRtoMinutes?:number
  incidentCommander?:string
  nextExerciseAt?:string
}

export type BackupEvidenceRequest={
  environment:string
  resourceType:string
  resourceRef:string
  backupMode:string
  retentionDays?:number
  pitrEnabled?:boolean
  objectVersioningEnabled?:boolean
  encryptionVerified?:boolean
  deletionProtectionVerified?:boolean
  independentCopyVerified?:boolean
  evidence?:Record<string,unknown>
  observedAt?:string
}

export type ProviderMigrationRequest={
  capability:string
  environment:string
  fromProvider:string
  toProvider:string
  strategy:'shadow'|'canary'|'dual_route'|'cutover'
  compatibilityReport?:Record<string,unknown>
  cutoverBoundary?:Record<string,unknown>
  rollbackPlan?:Record<string,unknown>
  sourceChangeId?:string
}

export type EmergencyControlRequest={
  environment?:string
  scopeType:'platform'|'region'|'cell'|'tenant'|'workspace'|'service'|'feature'
  scopeId?:string
  controlType:'stop_uploads'|'pause_integrations'|'suspend_ai'|'disable_signup'|'read_only'
  reason:string
  durationMinutes:number
}

type ControlMutationResult={ok:boolean;data?:Record<string,unknown>;message?:string}

const safeJson=async(response:Response)=>{
  const text=await response.text()
  if(!text)return null
  try{return JSON.parse(text)}catch{return null}
}

const newIdempotencyKey=()=>globalThis.crypto?.randomUUID?.()||('ace-'+Date.now()+'-'+Math.random().toString(36).slice(2))

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
  createChange:async(input:PlatformChangeRequest):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/changes',{method:'POST',body:JSON.stringify(input),headers:{'Idempotency-Key':newIdempotencyKey()}})
      const data=await safeJson(response)
      return response.ok
        ?{ok:true,data:data&&typeof data==='object'?data:{}}
        :{ok:false,message:typeof data?.error==='string'?data.error:'Change request failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
  },
  transitionChange:async(id:string,toState:string,expectedVersion:number):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/changes/'+encodeURIComponent(id)+'/transition',{
        method:'POST',body:JSON.stringify({toState,expectedVersion}),headers:{'Idempotency-Key':newIdempotencyKey()}
      })
      const data=await safeJson(response)
      return response.ok?{ok:true,data:data||{}}:{ok:false,message:data?.error||'Change transition failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
  },
  decideChange:async(id:string,decision:'approved'|'rejected',expectedVersion:number):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/changes/'+encodeURIComponent(id)+'/decision',{
        method:'POST',body:JSON.stringify({decision,expectedVersion}),headers:{'Idempotency-Key':newIdempotencyKey()}
      })
      const data=await safeJson(response)
      return response.ok?{ok:true,data:data||{}}:{ok:false,message:data?.error||'Change decision failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
  },
  requestRollback:async(id:string,reason:string,expectedVersion:number):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/changes/'+encodeURIComponent(id)+'/rollback',{
        method:'POST',body:JSON.stringify({reason,expectedVersion}),headers:{'Idempotency-Key':newIdempotencyKey()}
      })
      const data=await safeJson(response)
      return response.ok?{ok:true,data:data||{}}:{ok:false,message:data?.error||'Rollback request failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
  },
  createRecoveryExercise:async(input:RecoveryExerciseRequest):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/recovery/exercises',{
        method:'POST',body:JSON.stringify(input),headers:{'Idempotency-Key':newIdempotencyKey()}
      })
      const data=await safeJson(response)
      return response.ok?{ok:true,data:data||{}}:{ok:false,message:data?.error||'Recovery exercise creation failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
  },
  updateRecoveryExercise:async(id:string,input:Record<string,unknown>):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/recovery/exercises/'+encodeURIComponent(id),{
        method:'PATCH',body:JSON.stringify(input),headers:{'Idempotency-Key':newIdempotencyKey()}
      })
      const data=await safeJson(response)
      return response.ok?{ok:true,data:data||{}}:{ok:false,message:data?.error||'Recovery exercise update failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
  },
  recordBackupEvidence:async(input:BackupEvidenceRequest):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/recovery/backup-evidence',{
        method:'POST',body:JSON.stringify(input),headers:{'Idempotency-Key':newIdempotencyKey()}
      })
      const data=await safeJson(response)
      return response.ok?{ok:true,data:data||{}}:{ok:false,message:data?.error||'Backup evidence recording failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
  },
  createProviderMigration:async(input:ProviderMigrationRequest):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/provider-migrations',{
        method:'POST',
        body:JSON.stringify(input),
        headers:{'Idempotency-Key':newIdempotencyKey()}
      })
      const data=await safeJson(response)
      return response.ok?{ok:true,data:data||{}}:{ok:false,message:data?.error||'Provider migration creation failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
  },
  transitionProviderMigration:async(id:string,input:{toState:string;expectedVersion:number;trafficPercent?:number;compatibilityReport?:Record<string,unknown>;cutoverBoundary?:Record<string,unknown>;failureReason?:string}):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/provider-migrations/'+encodeURIComponent(id)+'/transition',{
        method:'POST',
        body:JSON.stringify(input),
        headers:{'Idempotency-Key':newIdempotencyKey()}
      })
      const data=await safeJson(response)
      return response.ok?{ok:true,data:data||{}}:{ok:false,message:data?.error||'Provider migration transition failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
  },
  rollbackProviderMigration:async(id:string,expectedVersion:number,reason:string):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/provider-migrations/'+encodeURIComponent(id)+'/rollback',{
        method:'POST',
        body:JSON.stringify({expectedVersion,reason}),
        headers:{'Idempotency-Key':newIdempotencyKey()}
      })
      const data=await safeJson(response)
      return response.ok?{ok:true,data:data||{}}:{ok:false,message:data?.error||'Provider rollback request failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
  },
  createEmergency:async(input:EmergencyControlRequest):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/emergency',{
        method:'POST',
        body:JSON.stringify(input),
        headers:{'Idempotency-Key':newIdempotencyKey()}
      })
      const data=await safeJson(response)
      return response.ok?{ok:true,data:data||{}}:{ok:false,message:data?.error||'Emergency control failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
  },
  revokeEmergency:async(id:string,expectedVersion:number,environment?:string):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/emergency/'+encodeURIComponent(id)+'/revoke',{
        method:'POST',
        body:JSON.stringify({expectedVersion,environment}),
        headers:{'Idempotency-Key':newIdempotencyKey()}
      })
      const data=await safeJson(response)
      return response.ok?{ok:true,data:data||{}}:{ok:false,message:data?.error||'Emergency control revoke failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
  },
  publishRuntimeConfig:async(input:{environment:string;features?:Record<string,string>;providerOverrides?:Record<string,unknown>;admission?:Record<string,unknown>;sourceChangeId?:string}):Promise<ControlMutationResult>=>{
    try{
      const response=await request('/control-api/runtime-config/publish',{
        method:'POST',
        body:JSON.stringify(input),
        headers:{'Idempotency-Key':newIdempotencyKey()}
      })
      const data=await safeJson(response)
      return response.ok?{ok:true,data:data||{}}:{ok:false,message:data?.error||'Runtime configuration publication failed.'}
    }catch{return {ok:false,message:'Control API could not be reached.'}}
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
