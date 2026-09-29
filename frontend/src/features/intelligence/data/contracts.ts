export type AiResultCommon={
  id?:string
  runId:string
  workspaceId:string
  task:string
  status:string
  requestedModel?:string|null
  resolvedModel?:string|null
  artifactVersion?:string|null
  schemaVersion?:string
  sourceSnapshot?:Record<string,unknown>
  cutoffAt?:string|null
  target?:string|null
  horizon?:string|null
  units?:string|null
  warnings?:string[]
  evidenceRefs?:string[]
  createdAt?:string
  usage?:Record<string,unknown>|null
}

export type ObservedMetricResult=AiResultCommon&{resultType:'observed_metric';value:number|null;metric:string;lineage?:Record<string,unknown>}
export type CalibratedProbabilityResult=AiResultCommon&{resultType:'calibrated_probability';probability:number;horizon:string;calibrationReference:string;contributions?:Array<{feature:string,value:number}>}
export type RegressionEstimateResult=AiResultCommon&{resultType:'regression_estimate';estimate:number|null;horizon:string;interval?:{lower:number;upper:number;method:string}|null}
export type ForecastDistributionResult=AiResultCommon&{resultType:'forecast_distribution';horizon:string;pointForecast?:number[];forecasts?:unknown[];quantiles?:Record<string,number[]>;measuredCoverage?:number|null}
export type MarketingMixAnalysisResult=AiResultCommon&{resultType:'marketing_mix_analysis';healthStatus:string;supported:boolean;diagnostics?:Record<string,unknown>;assumptions?:string[];artifactVersion?:string|null}
export type ModelEvaluationResult=AiResultCommon&{resultType:'model_evaluation';metrics:Record<string,unknown>;qualified?:boolean|null}

export type CausalEstimateResult=AiResultCommon&{resultType:'causal_estimate';estimand:string;supported:boolean;estimate?:number|null;interval?:{lower:number;upper:number}|null;assumptions?:string[]}
export type AnomalyScoreResult=AiResultCommon&{resultType:'anomaly_score';items:Array<{entityId:string;anomaly:boolean;score:number}>}
export type ClusterAssignmentResult=AiResultCommon&{resultType:'cluster_assignment';items:Array<{entityId:string;cluster:number;noise:boolean}>;modelVersion?:string}
export type RankingResult=AiResultCommon&{resultType:'ranking';items:Array<{candidateId:string;rank:number;score:number}>;groupId?:string}
export type TranscriptResult=AiResultCommon&{resultType:'transcript';text:string;language?:string|null;speakers?:unknown[];timestamps?:unknown[]}
export type GeneratedAssetResult=AiResultCommon&{resultType:'generated_asset';assetRef:string;reviewStatus:'draft'|'in_review'|'approved'|'rejected';provenance?:Record<string,unknown>}
export type ProviderOutputResult=AiResultCommon&{resultType:'provider_output';payload?:Record<string,unknown>|string|null}

export type AiTypedResult=ObservedMetricResult|CalibratedProbabilityResult|RegressionEstimateResult|ForecastDistributionResult|CausalEstimateResult|MarketingMixAnalysisResult|ModelEvaluationResult|AnomalyScoreResult|ClusterAssignmentResult|RankingResult|TranscriptResult|GeneratedAssetResult|ProviderOutputResult
