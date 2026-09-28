const baseUrl=()=>String(process.env.ML_SERVICE_URL||'').replace(/\/$/,'')
const authToken=()=>String(process.env.ML_SERVICE_AUTH_TOKEN||'')
const timeoutMs=()=>Number(process.env.ML_SERVICE_TIMEOUT_MS||120000)

export class MlServiceError extends Error{
  constructor(message,{status=null,cause=null}={}){
    super(message)
    this.name='MlServiceError'
    this.status=status
    this.causeCode=cause
  }
}

export const mlServiceConfigured=()=>Boolean(baseUrl()&&authToken())

const requestJson=async(path,{method='GET',body=null}={})=>{
  if(!mlServiceConfigured()) throw new MlServiceError('ML service is not configured',{status:503})
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort('ml_service_timeout'),timeoutMs())
  try{
    const response=await fetch(baseUrl()+path,{
      method,
      headers:{
        'Content-Type':'application/json',
        'X-Internal-Token':authToken()
      },
      ...(body===null?{}:{body:JSON.stringify(body)}),
      signal:controller.signal
    })
    const payload=await response.json().catch(()=>({}))
    if(!response.ok){
      const detail=payload?.detail
      const message=typeof detail==='string'?detail:JSON.stringify(detail||payload||{}).slice(0,1200)
      throw new MlServiceError(message||('ML service returned HTTP '+response.status),{status:response.status})
    }
    return payload
  }catch(error){
    if(error instanceof MlServiceError)throw error
    throw new MlServiceError(controller.signal.aborted?'ML service request timed out':'ML service request failed',{status:null,cause:controller.signal.aborted?'timeout':'network'})
  }finally{
    clearTimeout(timeout)
  }
}

export const getMlCapabilities=()=>requestJson('/v1/capabilities')

const operationPaths={
  classification_train:'/v1/train/classification',
  regression_train:'/v1/train/regression',
  forecast_baseline:'/v1/forecast/seasonal-naive',
  anomaly_detection:'/v1/anomalies/isolation-forest',
  behavioral_segments:'/v1/segments/hdbscan',
  offer_ranking:'/v1/rank/lgbm'
}

export const executeMlJob=async job=>{
  const operation=String(job.payload?.operation||'')
  const path=operationPaths[operation]
  if(!path) throw new MlServiceError('unsupported ML job operation: '+operation,{status:400})
  const body={...(job.payload?.request||{}),run_id:job.id}
  const result=await requestJson(path,{method:'POST',body})
  return {
    operation,
    task:String(job.payload?.task||result?.task||''),
    result,
    resultSchemaVersion:'ml-result.v1'
  }
}
