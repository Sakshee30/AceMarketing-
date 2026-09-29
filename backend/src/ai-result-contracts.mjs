const kinds=new Set(['observed_metric','calibrated_probability','regression_estimate','forecast_distribution','causal_estimate','anomaly_score','cluster_assignment','ranking','transcript','generated_asset','provider_output'])

const requiredString=(value,name)=>{
  if(typeof value!=='string'||!value.trim())throw new Error(name+' required')
  return value
}

export const validateAiResultEnvelope=value=>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('AI result must be an object')
  const resultType=requiredString(value.resultType||value.result_type,'resultType')
  if(!kinds.has(resultType))throw new Error('unsupported resultType: '+resultType)
  requiredString(value.runId||value.run_id,'runId')
  requiredString(value.workspaceId||value.workspace_id,'workspaceId')
  requiredString(value.task,'task')
  requiredString(value.status,'status')
  if(value.warnings!=null&&!Array.isArray(value.warnings))throw new Error('warnings must be an array')
  if(value.evidenceRefs!=null&&!Array.isArray(value.evidenceRefs))throw new Error('evidenceRefs must be an array')

  if(resultType==='calibrated_probability'){
    const probability=value.probability
    if(typeof probability!=='number'||!Number.isFinite(probability)||probability<0||probability>1)throw new Error('probability must be a number between 0 and 1')
    requiredString(value.horizon,'horizon')
    requiredString(value.calibrationReference||value.calibration_reference,'calibrationReference')
  }
  if(resultType==='forecast_distribution'){
    if(!Array.isArray(value.pointForecast||value.point_forecast)&&!Array.isArray(value.forecasts))throw new Error('forecast distribution requires forecast values')
    requiredString(value.horizon,'horizon')
  }
  if(resultType==='causal_estimate'){
    requiredString(value.estimand,'estimand')
    if(value.supported!==true&&value.supported!==false)throw new Error('causal estimate supported flag required')
  }
  if(resultType==='anomaly_score'&&String(value.probabilityLabel||'').toLowerCase().includes('fraud'))throw new Error('anomaly scores must not be represented as fraud probabilities')
  if(resultType==='generated_asset'){
    requiredString(value.reviewStatus||value.review_status,'reviewStatus')
    if((value.reviewStatus||value.review_status)==='approved'&&!value.reviewedBy&&!value.reviewed_by)throw new Error('approved generated asset requires reviewer')
  }
  return value
}

export const aiResultTypes=()=>[...kinds]
