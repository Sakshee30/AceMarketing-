import {pool} from '../database.mjs'

const ttlMs=Math.max(1000,Number(process.env.CELL_PLACEMENT_CACHE_MS||30_000))
const cache=new Map()

const normalize=row=>row?{
  workspaceId:String(row.workspace_id),
  homeCell:String(row.home_cell),
  homeRegion:String(row.home_region),
  routingEpoch:Number(row.routing_epoch),
  state:String(row.state),
  dedicated:Boolean(row.dedicated),
  updatedAt:row.updated_at
}:null

export const clearCellPlacementCache=workspaceId=>{
  if(workspaceId)cache.delete(String(workspaceId))
  else cache.clear()
}

export const getWorkspacePlacement=async(workspaceId,{fresh=false}={})=>{
  const id=String(workspaceId||'').trim()
  if(!id)throw Object.assign(new Error('workspace placement requires workspaceId'),{code:'cell_workspace_required'})
  const now=Date.now()
  const cached=cache.get(id)
  if(!fresh&&cached&&cached.expiresAt>now)return cached.value
  if(!pool)return null
  const {rows}=await pool.query(
    `SELECT workspace_id,home_cell,home_region,routing_epoch,state,dedicated,updated_at
     FROM ace_tenant_placements WHERE workspace_id=$1`,
    [id]
  )
  const value=normalize(rows[0]||null)
  cache.set(id,{value,expiresAt:now+ttlMs})
  return value
}

export const upsertWorkspacePlacement=async({workspaceId,homeCell,homeRegion,routingEpoch=1,state='active',dedicated=false})=>{
  if(!pool)throw new Error('cell placement requires DATABASE_URL')
  const id=String(workspaceId||'').trim()
  const cell=String(homeCell||'').trim()
  const region=String(homeRegion||'').trim()
  if(!id||!cell||!region)throw Object.assign(new Error('workspaceId, homeCell and homeRegion are required'),{code:'cell_placement_invalid'})
  const safeState=['active','moving','read_only','suspended'].includes(state)?state:'active'
  const {rows}=await pool.query(
    `INSERT INTO ace_tenant_placements(workspace_id,home_cell,home_region,routing_epoch,state,dedicated,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,now())
     ON CONFLICT (workspace_id) DO UPDATE SET
       home_cell=EXCLUDED.home_cell,
       home_region=EXCLUDED.home_region,
       routing_epoch=EXCLUDED.routing_epoch,
       state=EXCLUDED.state,
       dedicated=EXCLUDED.dedicated,
       updated_at=now()
     RETURNING *`,
    [id,cell,region,Math.max(1,Number(routingEpoch)||1),safeState,Boolean(dedicated)]
  )
  clearCellPlacementCache(id)
  return normalize(rows[0])
}

export const assertWorkspaceCell=async({workspaceId,expectedCell,expectedRegion=null,routingEpoch=null})=>{
  const placement=await getWorkspacePlacement(workspaceId)
  if(!placement)throw Object.assign(new Error('workspace placement is not established'),{status:503,code:'cell_placement_unknown'})
  if(placement.state==='suspended')throw Object.assign(new Error('workspace placement is suspended'),{status:503,code:'cell_placement_suspended'})
  if(String(expectedCell||'')&&placement.homeCell!==String(expectedCell)){
    throw Object.assign(new Error('workspace is assigned to a different cell'),{status:409,code:'cell_route_mismatch'})
  }
  if(expectedRegion&&placement.homeRegion!==String(expectedRegion)){
    throw Object.assign(new Error('workspace is assigned to a different region'),{status:409,code:'cell_region_mismatch'})
  }
  if(routingEpoch!=null&&placement.routingEpoch!==Number(routingEpoch)){
    throw Object.assign(new Error('workspace routing epoch is stale'),{status:409,code:'cell_routing_epoch_stale'})
  }
  if(placement.state==='moving')throw Object.assign(new Error('workspace placement is moving'),{status:409,code:'cell_placement_moving'})
  return placement
}
