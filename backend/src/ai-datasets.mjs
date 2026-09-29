import {createHash,randomUUID} from 'node:crypto'
import pg from 'pg'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.AI_DATASET_DB_POOL_MAX||5),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const allowedTasks=new Set(['lead_qualification','paid_conversion','customer_churn','future_customer_value'])
const safeJson=value=>JSON.stringify(value&&typeof value==='object'?value:{})
const instant=value=>{
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))throw new Error('invalid timestamp')
  return date
}
const text=(value,max=256)=>{
  const result=String(value||'').trim()
  if(!result||result.length>max)throw new Error('invalid text field')
  return result
}
const stableHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')

const normalizeRow=(row,index)=>{
  const entityId=text(row.entity_id||row.entityId,256)
  const features=row.features&&typeof row.features==='object'&&!Array.isArray(row.features)?row.features:null
  if(!features)throw new Error('row '+index+' features must be an object')
  const availableAt=instant(row.feature_available_at||row.featureAvailableAt)
  const predictionCutoff=instant(row.prediction_cutoff||row.predictionCutoff)
  if(availableAt>predictionCutoff)throw new Error('future_feature_leakage: row '+index+' feature availability is after prediction cutoff')
  const labelObservedRaw=row.label_observed_at??row.labelObservedAt??null
  const labelObservedAt=labelObservedRaw?instant(labelObservedRaw):null
  const labelRaw=row.label
  const label=labelRaw===null||labelRaw===undefined?null:Number(labelRaw)
  if(label!==null&&!Number.isFinite(label))throw new Error('row '+index+' label must be numeric or null')
  return {
    entityId,
    features,
    featureAvailableAt:availableAt,
    predictionCutoff,
    label,
    labelObservedAt,
    provenance:row.provenance&&typeof row.provenance==='object'?row.provenance:{}
  }
}

export const aiDatasetStoreAvailable=()=>Boolean(pool)

export const createAiDataset=async({
  workspaceId,
  task,
  rows,
  schemaVersion='point-in-time.v1',
  featureDefinitionVersion='features.v1',
  labelDefinitionVersion='labels.v1',
  labelObservationCutoff,
  sourceSnapshot={},
  createdBy=null
})=>{
  if(!pool)throw new Error('dataset store requires DATABASE_URL')
  if(!allowedTasks.has(String(task)))throw new Error('unsupported supervised dataset task')
  if(!Array.isArray(rows)||rows.length<1||rows.length>5000)throw new Error('dataset requires 1-5000 point-in-time rows per request')
  const normalized=rows.map(normalizeRow)
  const labelCutoff=instant(labelObservationCutoff)
  const classification=task!=='future_customer_value'
  if(classification){
    for(const [index,row] of normalized.entries()){
      if(row.label!==null&&![0,1].includes(row.label))throw new Error('row '+index+' classification label must be 0 or 1')
    }
  }

  const mature=normalized.filter(row=>row.label!==null&&row.labelObservedAt&&row.labelObservedAt<=labelCutoff)
  const censored=normalized.length-mature.length
  const classCounts=classification
    ?{negative:mature.filter(row=>row.label===0).length,positive:mature.filter(row=>row.label===1).length}
    :null
  const maturityStatus=mature.length>=40&&(!classification||Math.min(classCounts.negative,classCounts.positive)>=4)
    ?'ready'
    :'insufficient_data'
  const id='aids_'+randomUUID()
  const canonical=normalized
    .map(row=>({
      entityId:row.entityId,
      features:row.features,
      featureAvailableAt:row.featureAvailableAt.toISOString(),
      predictionCutoff:row.predictionCutoff.toISOString(),
      label:row.label,
      labelObservedAt:row.labelObservedAt?.toISOString()||null,
      provenance:row.provenance
    }))
    .sort((a,b)=>(a.predictionCutoff+a.entityId).localeCompare(b.predictionCutoff+b.entityId))
  const contentHash=stableHash({task,schemaVersion,featureDefinitionVersion,labelDefinitionVersion,labelObservationCutoff:labelCutoff.toISOString(),rows:canonical})
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO ace_ai_datasets
        (id,workspace_id,task,schema_version,source_snapshot,feature_definition_version,label_definition_version,
         prediction_cutoff,label_observation_cutoff,row_count,maturity_status,content_hash,data_classification,created_by)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,'workspace_features',$13)`,
      [
        id,workspaceId,task,schemaVersion,safeJson(sourceSnapshot),featureDefinitionVersion,labelDefinitionVersion,
        canonical.length?canonical[canonical.length-1].predictionCutoff:null,labelCutoff.toISOString(),normalized.length,
        maturityStatus,contentHash,createdBy
      ]
    )
    for(const row of normalized){
      await client.query(
        `INSERT INTO ace_ai_feature_snapshots
          (id,workspace_id,dataset_id,task,entity_id,feature_schema_version,event_time,available_at,prediction_cutoff,
           features,label_value,label_observed_at,provenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13::jsonb)`,
        [
          'aifs_'+randomUUID(),workspaceId,id,task,row.entityId,featureDefinitionVersion,
          row.provenance?.eventTime||null,row.featureAvailableAt.toISOString(),row.predictionCutoff.toISOString(),
          safeJson(row.features),row.label,row.labelObservedAt?.toISOString()||null,safeJson(row.provenance)
        ]
      )
    }
    await client.query('COMMIT')
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
  return {
    id,workspaceId,task,schemaVersion,featureDefinitionVersion,labelDefinitionVersion,
    labelObservationCutoff:labelCutoff.toISOString(),rowCount:normalized.length,matureRows:mature.length,censoredRows:censored,
    classCounts,maturityStatus,contentHash,sourceSnapshot
  }
}

export const listAiDatasets=async({workspaceId,task=null,limit=50})=>{
  if(!pool)return []
  const params=[workspaceId]
  let where='workspace_id=$1 AND deleted_at IS NULL'
  if(task){params.push(String(task));where+=' AND task=$2'}
  params.push(Math.max(1,Math.min(Number(limit||50),200)))
  const {rows}=await pool.query(
    `SELECT id,task,schema_version,source_snapshot,feature_definition_version,label_definition_version,prediction_cutoff,
            label_observation_cutoff,row_count,maturity_status,content_hash,data_classification,created_by,created_at
     FROM ace_ai_datasets WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  )
  return rows
}

export const getAiDataset=async({workspaceId,id,includeRows=false})=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `SELECT id,task,schema_version,source_snapshot,feature_definition_version,label_definition_version,prediction_cutoff,
            label_observation_cutoff,row_count,maturity_status,content_hash,data_classification,created_by,created_at
     FROM ace_ai_datasets WHERE workspace_id=$1 AND id=$2 AND deleted_at IS NULL`,
    [workspaceId,id]
  )
  const dataset=rows[0]
  if(!dataset)return null
  if(!includeRows)return dataset
  const snapshots=await pool.query(
    `SELECT entity_id,features,available_at,prediction_cutoff,label_value,label_observed_at,provenance
     FROM ace_ai_feature_snapshots
     WHERE workspace_id=$1 AND dataset_id=$2
     ORDER BY prediction_cutoff ASC,entity_id ASC`,
    [workspaceId,id]
  )
  return {...dataset,rows:snapshots.rows}
}

export const trainingRequestFromDataset=async({workspaceId,id,randomSeed=42,calibrationMethod='sigmoid',categoricalFeatures=[]})=>{
  const dataset=await getAiDataset({workspaceId,id,includeRows:true})
  if(!dataset)throw new Error('dataset not found')
  if(dataset.maturity_status!=='ready')throw new Error('insufficient_data: dataset is not ready for training')
  const pointRows=dataset.rows.map(row=>({
    entity_id:row.entity_id,
    features:row.features||{},
    label:row.label_value===null?null:Number(row.label_value),
    feature_available_at:new Date(row.available_at).toISOString(),
    prediction_cutoff:new Date(row.prediction_cutoff).toISOString(),
    label_observed_at:row.label_observed_at?new Date(row.label_observed_at).toISOString():null
  }))
  const base={
    task:dataset.task,
    rows:pointRows,
    categorical_features:Array.isArray(categoricalFeatures)?categoricalFeatures.slice(0,100):[],
    label_cutoff:new Date(dataset.label_observation_cutoff).toISOString(),
    random_seed:Number(randomSeed)||42,
    dataset_id:dataset.id,
    dataset_hash:dataset.content_hash,
    feature_schema_version:dataset.feature_definition_version,
    label_schema_version:dataset.label_definition_version
  }
  if(dataset.task==='future_customer_value'){
    throw new Error('future_customer_value requires an explicit horizon; use trainingRequestFromDatasetWithHorizon')
  }
  return {...base,calibration_method:calibrationMethod==='isotonic'?'isotonic':'sigmoid'}
}

export const trainingRequestFromDatasetWithHorizon=async({workspaceId,id,horizon,randomSeed=42,categoricalFeatures=[]})=>{
  const dataset=await getAiDataset({workspaceId,id,includeRows:true})
  if(!dataset)throw new Error('dataset not found')
  if(dataset.task!=='future_customer_value')throw new Error('dataset is not a future_customer_value dataset')
  if(!['90d','180d'].includes(String(horizon)))throw new Error('future_customer_value horizon must be 90d or 180d')
  if(dataset.maturity_status!=='ready')throw new Error('insufficient_data: dataset is not ready for training')
  return {
    task:'future_customer_value',
    horizon:String(horizon),
    rows:dataset.rows.map(row=>({
      entity_id:row.entity_id,
      features:row.features||{},
      label:row.label_value===null?null:Number(row.label_value),
      feature_available_at:new Date(row.available_at).toISOString(),
      prediction_cutoff:new Date(row.prediction_cutoff).toISOString(),
      label_observed_at:row.label_observed_at?new Date(row.label_observed_at).toISOString():null
    })),
    categorical_features:Array.isArray(categoricalFeatures)?categoricalFeatures.slice(0,100):[],
    label_cutoff:new Date(dataset.label_observation_cutoff).toISOString(),
    random_seed:Number(randomSeed)||42,
    dataset_id:dataset.id,
    dataset_hash:dataset.content_hash,
    feature_schema_version:dataset.feature_definition_version,
    label_schema_version:dataset.label_definition_version
  }
}

export const retireAiDataset=async({workspaceId,id})=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_ai_datasets SET deleted_at=now()
     WHERE workspace_id=$1 AND id=$2 AND deleted_at IS NULL
     RETURNING id,task,maturity_status,deleted_at`,
    [workspaceId,id]
  )
  return rows[0]||null
}

export const closeAiDatasets=async()=>{if(pool)await pool.end()}
