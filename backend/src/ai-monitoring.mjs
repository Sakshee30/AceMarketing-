import {pool} from './database.mjs'
import {deploymentHealth,listDeploymentControls} from './ai-deployment-controls.mjs'

const asDate=value=>{
  const date=value?new Date(value):null
  return date&&!Number.isNaN(date.getTime())?date:null
}
const ageMinutes=(value,now=Date.now())=>{
  const date=asDate(value)
  return date?Math.max(0,Number(((now-date.getTime())/60000).toFixed(2))):null
}
const ratio=(num,den)=>den>0?Number(((num/den)*100).toFixed(3)):0
const latestBy=(rows,key)=>{
  const map=new Map()
  for(const row of rows){
    const value=String(row?.[key]||'')
    if(value&&!map.has(value))map.set(value,row)
  }
  return [...map.values()]
}
const numericMetric=(metrics,names)=>{
  for(const name of names){
    const value=metrics?.[name]
    if(value!==null&&value!==undefined&&Number.isFinite(Number(value)))return Number(value)
  }
  return null
}

export const summarizeAiMonitoringRows=({
  jobs=[],
  providerRequests=[],
  usage=[],
  results=[],
  evaluations=[],
  forecasts=[],
  anomalies=[],
  now=Date.now()
}={})=>{
  const aiJobs=jobs.filter(row=>['ai_hosted_task','ml_task'].includes(String(row.kind||'')))
  const jobCounts={}
  for(const row of aiJobs)jobCounts[row.status]=(jobCounts[row.status]||0)+1
  const queued=aiJobs.filter(row=>['pending','retry','leased'].includes(String(row.status||'')))
  const oldestQueueAgeMinutes=queued.length
    ?Math.max(...queued.map(row=>ageMinutes(row.created_at,now)||0))
    :0
  const providerTotal=providerRequests.length
  const providerFailures=providerRequests.filter(row=>row.outcome==='failed').length
  const providerUnknown=providerRequests.filter(row=>row.outcome==='unknown'||row.outcome==='submitted').length
  const providerLatencyValues=providerRequests.map(row=>{
    const start=asDate(row.started_at),end=asDate(row.completed_at)
    return start&&end?Math.max(0,end-start):null
  }).filter(Number.isFinite).sort((a,b)=>a-b)
  const providerP95LatencyMs=providerLatencyValues.length
    ?providerLatencyValues[Math.min(providerLatencyValues.length-1,Math.ceil(providerLatencyValues.length*0.95)-1)]
    :null
  const latestResults=latestBy(results,'task').map(row=>({
    task:row.task,
    status:row.status,
    resultType:row.result_type,
    createdAt:row.created_at,
    freshnessMinutes:ageMinutes(row.created_at,now),
    warningCount:Array.isArray(row.warnings)?row.warnings.length:0
  }))
  const latestEvaluations=latestBy(evaluations,'task').map(row=>{
    const metrics=row.metrics||{}
    return {
      task:row.task,
      status:row.status,
      qualified:row.qualified===true,
      sampleSize:row.sample_size==null?null:Number(row.sample_size),
      completedAt:row.completed_at,
      calibration:{
        brier:numericMetric(metrics,['brier','brier_score','brierScore']),
        logLoss:numericMetric(metrics,['log_loss','logLoss']),
        ece:numericMetric(metrics,['ece','expected_calibration_error','expectedCalibrationError'])
      },
      drift:{
        psi:numericMetric(metrics,['psi','population_stability_index','populationStabilityIndex']),
        featureDrift:numericMetric(metrics,['feature_drift','featureDrift','drift_score','driftScore'])
      },
      delayedLabelPerformance:numericMetric(metrics,['delayed_label_performance','delayedLabelPerformance'])
    }
  })
  const forecastCoverage=forecasts.slice(0,100).map(row=>({
    task:row.task,
    seriesId:row.series_id,
    nominalCoverage:row.nominal_coverage==null?null:Number(row.nominal_coverage),
    measuredCoverage:row.measured_coverage==null?null:Number(row.measured_coverage),
    coverageGap:row.nominal_coverage==null||row.measured_coverage==null
      ?null
      :Number((Number(row.measured_coverage)-Number(row.nominal_coverage)).toFixed(4)),
    createdAt:row.created_at
  }))
  const anomalyFlagged=anomalies.filter(row=>row.anomaly===true)
  const anomalyReviewed=anomalyFlagged.filter(row=>row.reviewed_at||['resolved','false_positive'].includes(String(row.triage_status||'')))
  const anomalyFalsePositive=anomalyFlagged.filter(row=>row.triage_status==='false_positive').length
  const units=usage.reduce((sum,row)=>sum+Number(row.actual_units??row.reserved_units??0),0)
  const unresolvedUsage=usage.filter(row=>row.status==='unknown'||row.status==='reserved').length

  const warnings=[]
  if((jobCounts.dead_letter||0)>0)warnings.push('AI jobs are present in dead-letter state.')
  if((jobCounts.unknown_outcome||0)>0)warnings.push('AI jobs with unknown external outcome require reconciliation.')
  if(providerUnknown>0)warnings.push('Provider requests with unknown or still-submitted outcomes require reconciliation.')
  if(providerFailures>0)warnings.push('Recent provider request failures were observed.')
  if(oldestQueueAgeMinutes>15)warnings.push('AI queue age exceeds 15 minutes.')

  return {
    generatedAt:new Date(now).toISOString(),
    queue:{
      counts:{
        pending:jobCounts.pending||0,
        retry:jobCounts.retry||0,
        leased:jobCounts.leased||0,
        succeeded:jobCounts.succeeded||0,
        deadLetter:jobCounts.dead_letter||0,
        cancelled:jobCounts.cancelled||0,
        unknownOutcome:jobCounts.unknown_outcome||0
      },
      oldestQueueAgeMinutes
    },
    providers:{
      total:providerTotal,
      failed:providerFailures,
      unknownOrSubmitted:providerUnknown,
      failureRatePct:ratio(providerFailures,providerTotal),
      p95LatencyMs:providerP95LatencyMs
    },
    usage:{
      units:Number(units.toFixed(3)),
      unresolvedReservations:unresolvedUsage,
      estimatedCost:null,
      costStatus:'not_configured'
    },
    resultFreshness:latestResults,
    evaluationEvidence:latestEvaluations,
    forecastCoverage,
    anomalyFeedback:{
      flagged:anomalyFlagged.length,
      reviewed:anomalyReviewed.length,
      falsePositive:anomalyFalsePositive,
      falsePositiveRatePct:ratio(anomalyFalsePositive,anomalyReviewed.length)
    },
    warnings
  }
}

export const aiMonitoringSnapshot=async({workspaceId,windowHours=24})=>{
  if(!pool)return {available:false,reason:'DATABASE_URL is required for AI monitoring'}
  const hours=Math.max(1,Math.min(Number(windowHours||24),24*90))
  const since=new Date(Date.now()-hours*3600000).toISOString()
  const [jobs,providers,usage,results,evaluations,forecasts,anomalies,controls]=await Promise.all([
    pool.query(
      `SELECT kind,status,created_at,updated_at,completed_at
       FROM ace_jobs
       WHERE workspace_id=$1 AND kind IN ('ai_hosted_task','ml_task')
         AND created_at >= $2::timestamptz
       ORDER BY created_at DESC LIMIT 5000`,
      [workspaceId,since]
    ),
    pool.query(
      `SELECT provider,task,outcome,started_at,completed_at,last_error
       FROM ace_ai_provider_requests
       WHERE workspace_id=$1 AND COALESCE(started_at,completed_at) >= $2::timestamptz
       ORDER BY COALESCE(started_at,completed_at) DESC LIMIT 5000`,
      [workspaceId,since]
    ),
    pool.query(
      `SELECT task,status,reserved_units,actual_units,created_at,reconciled_at
       FROM ace_ai_usage_reservations
       WHERE workspace_id=$1 AND created_at >= $2::timestamptz
       ORDER BY created_at DESC LIMIT 5000`,
      [workspaceId,since]
    ),
    pool.query(
      `SELECT task,status,result_type,warnings,created_at
       FROM ace_ai_results
       WHERE workspace_id=$1
       ORDER BY created_at DESC LIMIT 1000`,
      [workspaceId]
    ),
    pool.query(
      `SELECT task,status,qualified,sample_size,metrics,completed_at,created_at
       FROM ace_ai_evaluations
       WHERE workspace_id=$1
       ORDER BY COALESCE(completed_at,created_at) DESC LIMIT 1000`,
      [workspaceId]
    ),
    pool.query(
      `SELECT task,series_id,nominal_coverage,measured_coverage,created_at
       FROM ace_ai_forecast_records
       WHERE workspace_id=$1
       ORDER BY created_at DESC LIMIT 500`,
      [workspaceId]
    ).catch(()=>({rows:[]})),
    pool.query(
      `SELECT anomaly,triage_status,reviewed_at,created_at
       FROM ace_ai_anomaly_items
       WHERE workspace_id=$1 AND created_at >= $2::timestamptz
       ORDER BY created_at DESC LIMIT 5000`,
      [workspaceId,since]
    ).catch(()=>({rows:[]})),
    listDeploymentControls(workspaceId)
  ])
  const summary=summarizeAiMonitoringRows({
    jobs:jobs.rows,
    providerRequests:providers.rows,
    usage:usage.rows,
    results:results.rows,
    evaluations:evaluations.rows,
    forecasts:forecasts.rows,
    anomalies:anomalies.rows
  })
  const deployment=await Promise.all(controls.map(async control=>({
    task:control.task,
    ...(await deploymentHealth({workspaceId,task:control.task}).catch(()=>({
      control,
      sampleSize:0,
      failures:0,
      errorRatePct:0,
      p95LatencyMs:0,
      rollbackRecommended:false,
      reasons:['deployment health unavailable']
    })))
  })))
  const configuredEvidence={
    featureDrift:summary.evaluationEvidence.some(item=>item.drift.psi!=null||item.drift.featureDrift!=null),
    calibration:summary.evaluationEvidence.some(item=>item.calibration.brier!=null||item.calibration.logLoss!=null||item.calibration.ece!=null),
    delayedLabelPerformance:summary.evaluationEvidence.some(item=>item.delayedLabelPerformance!=null),
    intervalCoverage:summary.forecastCoverage.some(item=>item.measuredCoverage!=null)
  }
  return {
    available:true,
    windowHours:hours,
    ...summary,
    deployment,
    configuredEvidence,
    limitations:[
      ...(configuredEvidence.featureDrift?[]:['Feature drift is not invented; it appears only when an evaluation records a drift metric.']),
      ...(configuredEvidence.calibration?[]:['Calibration health appears only when task evaluation records Brier/log-loss/ECE evidence.']),
      ...(configuredEvidence.delayedLabelPerformance?[]:['Delayed-label performance is absent until a mature-label evaluation records it.']),
      ...(configuredEvidence.intervalCoverage?[]:['Measured forecast interval coverage is absent until backtesting records it.']),
      'Provider monetary cost is not estimated without a configured provider pricing/cost ledger.'
    ]
  }
}
