import {createHash,randomUUID} from 'node:crypto'
import {withTenantDbTransaction} from './tenant-db.mjs'

const idPattern=/^[A-Za-z0-9_:-]{1,160}$/
const STEP=1000000n
const MIN_RANK=1n

const stable=value=>Array.isArray(value)
  ?value.map(stable)
  :(value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]))
    :value)

const requestHash=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')
const conflict=(code,message,extra={})=>Object.assign(new Error(message),{status:409,code,...extra})
const invalid=(code,message)=>Object.assign(new Error(message),{status:400,code})

export const validateBoardMoveCommand=command=>{
  if(!command||typeof command!=='object'||Array.isArray(command))throw invalid('BOARD_MOVE_INVALID','board move command must be an object')
  const normalized={
    operationId:String(command.operationId||'').trim(),
    boardId:String(command.boardId||'').trim(),
    itemId:String(command.itemId||'').trim(),
    expectedItemVersion:Number(command.expectedItemVersion),
    expectedPolicyVersion:Number(command.expectedPolicyVersion),
    destinationColumnId:String(command.destinationColumnId||'').trim(),
    placement:{
      mode:String(command.placement?.mode||'').trim(),
      beforeItemId:command.placement?.beforeItemId?String(command.placement.beforeItemId).trim():null,
      afterItemId:command.placement?.afterItemId?String(command.placement.afterItemId).trim():null
    },
    reason:command.reason==null?'':String(command.reason).trim().slice(0,1000)
  }
  for(const [name,value] of [['operationId',normalized.operationId],['boardId',normalized.boardId],['itemId',normalized.itemId],['destinationColumnId',normalized.destinationColumnId]]){
    if(!idPattern.test(value))throw invalid('BOARD_MOVE_INVALID_ID',name+' is invalid')
  }
  if(!Number.isSafeInteger(normalized.expectedItemVersion)||normalized.expectedItemVersion<1)throw invalid('BOARD_MOVE_INVALID_VERSION','expectedItemVersion must be a positive integer')
  if(!Number.isSafeInteger(normalized.expectedPolicyVersion)||normalized.expectedPolicyVersion<1)throw invalid('BOARD_MOVE_INVALID_POLICY_VERSION','expectedPolicyVersion must be a positive integer')
  if(!['top','bottom','between'].includes(normalized.placement.mode))throw invalid('BOARD_MOVE_INVALID_PLACEMENT','placement mode must be top, bottom or between')
  if(normalized.placement.mode==='between'){
    const before=normalized.placement.beforeItemId
    const after=normalized.placement.afterItemId
    if(!before&&!after)throw invalid('BOARD_MOVE_INVALID_NEIGHBORS','between placement requires beforeItemId or afterItemId')
    for(const value of [before,after].filter(Boolean))if(!idPattern.test(value))throw invalid('BOARD_MOVE_INVALID_NEIGHBORS','neighbor item id is invalid')
    if(before&&after&&before===after)throw invalid('BOARD_MOVE_INVALID_NEIGHBORS','beforeItemId and afterItemId must differ')
  }else if(normalized.placement.beforeItemId||normalized.placement.afterItemId){
    throw invalid('BOARD_MOVE_INVALID_NEIGHBORS','top/bottom placement must not include neighbor ids')
  }
  return normalized
}

const readNeighbor=async(client,{workspaceId,boardId,columnId,itemId})=>{
  if(!itemId)return null
  const {rows}=await client.query(
    `SELECT item_id,column_id,rank,item_version
     FROM ace_board_items
     WHERE workspace_id=$1 AND board_id=$2 AND item_id=$3
     FOR UPDATE`,
    [workspaceId,boardId,itemId]
  )
  const row=rows[0]
  if(!row)throw conflict('BOARD_NEIGHBOR_NOT_FOUND','a placement neighbor no longer exists',{neighborId:itemId})
  if(row.column_id!==columnId)throw conflict('BOARD_NEIGHBOR_MOVED','a placement neighbor is no longer in the destination column',{neighborId:itemId})
  return row
}

const rebalanceColumn=async(client,{workspaceId,boardId,columnId})=>{
  const {rows}=await client.query(
    `SELECT item_id FROM ace_board_items
     WHERE workspace_id=$1 AND board_id=$2 AND column_id=$3
     ORDER BY rank,item_id
     FOR UPDATE`,
    [workspaceId,boardId,columnId]
  )
  let rank=STEP
  for(const row of rows){
    await client.query(
      `UPDATE ace_board_items SET rank=$4,updated_at=now()
       WHERE workspace_id=$1 AND board_id=$2 AND item_id=$3`,
      [workspaceId,boardId,row.item_id,rank.toString()]
    )
    rank+=STEP
  }
}

const rankForPlacement=async(client,{workspaceId,boardId,columnId,itemId,placement})=>{
  if(placement.mode==='top'){
    const {rows}=await client.query(
      `SELECT rank FROM ace_board_items
       WHERE workspace_id=$1 AND board_id=$2 AND column_id=$3 AND item_id<>$4
       ORDER BY rank,item_id LIMIT 1 FOR UPDATE`,
      [workspaceId,boardId,columnId,itemId]
    )
    const first=rows[0]?BigInt(String(rows[0].rank)):null
    if(first==null)return STEP
    if(first>MIN_RANK)return first/2n
    await rebalanceColumn(client,{workspaceId,boardId,columnId})
    return STEP/2n
  }
  if(placement.mode==='bottom'){
    const {rows}=await client.query(
      `SELECT rank FROM ace_board_items
       WHERE workspace_id=$1 AND board_id=$2 AND column_id=$3 AND item_id<>$4
       ORDER BY rank DESC,item_id DESC LIMIT 1 FOR UPDATE`,
      [workspaceId,boardId,columnId,itemId]
    )
    const last=rows[0]?BigInt(String(rows[0].rank)):null
    return last==null?STEP:last+STEP
  }
  let before=await readNeighbor(client,{workspaceId,boardId,columnId,itemId:placement.beforeItemId})
  let after=await readNeighbor(client,{workspaceId,boardId,columnId,itemId:placement.afterItemId})
  if(before?.item_id===itemId||after?.item_id===itemId)throw conflict('BOARD_NEIGHBOR_SELF_REFERENCE','an item cannot be its own placement neighbor')
  let left=after?BigInt(String(after.rank)):null
  let right=before?BigInt(String(before.rank)):null
  if(left!=null&&right!=null&&left>=right)throw conflict('BOARD_NEIGHBOR_ORDER_CHANGED','placement neighbors are no longer in the expected order')
  if(left==null&&right==null)return STEP
  if(left==null){
    if(right>MIN_RANK)return right/2n
    await rebalanceColumn(client,{workspaceId,boardId,columnId})
    before=await readNeighbor(client,{workspaceId,boardId,columnId,itemId:placement.beforeItemId})
    right=BigInt(String(before.rank))
    return right/2n
  }
  if(right==null)return left+STEP
  if(right-left>1n)return left+(right-left)/2n
  await rebalanceColumn(client,{workspaceId,boardId,columnId})
  after=await readNeighbor(client,{workspaceId,boardId,columnId,itemId:placement.afterItemId})
  before=await readNeighbor(client,{workspaceId,boardId,columnId,itemId:placement.beforeItemId})
  left=BigInt(String(after.rank))
  right=BigInt(String(before.rank))
  if(right-left<=1n)throw conflict('BOARD_RANK_SPACE_EXHAUSTED','unable to allocate a stable placement rank')
  return left+(right-left)/2n
}

export const moveBoardItem=async({
  workspaceId,
  actorId,
  command,
  authorize=()=>true,
  requestId=null,
  correlationId=null
})=>{
  const input=validateBoardMoveCommand(command)
  const hash=requestHash(input)
  return withTenantDbTransaction(workspaceId,async client=>{
    const board=(await client.query(
      `SELECT * FROM ace_boards WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,
      [workspaceId,input.boardId]
    )).rows[0]
    if(!board||board.status!=='active')throw Object.assign(new Error('board not found'),{status:404,code:'BOARD_NOT_FOUND'})

    const prior=(await client.query(
      `SELECT * FROM ace_board_operations
       WHERE workspace_id=$1 AND board_id=$2 AND operation_id=$3
       FOR UPDATE`,
      [workspaceId,input.boardId,input.operationId]
    )).rows[0]
    if(prior){
      if(prior.request_hash!==hash)throw conflict('BOARD_OPERATION_ID_REUSED','operationId was already used with a different command')
      if(prior.status==='completed'&&prior.result)return prior.result
      if(prior.status==='pending')throw conflict('BOARD_OPERATION_PENDING','the board move is already in progress',{retryable:true})
      throw conflict(prior.error_code||'BOARD_OPERATION_FAILED','the prior board move failed')
    }

    await client.query(
      `INSERT INTO ace_board_operations(workspace_id,board_id,operation_id,request_hash,status)
       VALUES($1,$2,$3,$4,'pending')`,
      [workspaceId,input.boardId,input.operationId,hash]
    )

    const item=(await client.query(
      `SELECT * FROM ace_board_items
       WHERE workspace_id=$1 AND board_id=$2 AND item_id=$3
       FOR UPDATE`,
      [workspaceId,input.boardId,input.itemId]
    )).rows[0]
    if(!item)throw Object.assign(new Error('board item not found'),{status:404,code:'BOARD_ITEM_NOT_FOUND'})
    if(Number(item.item_version)!==input.expectedItemVersion){
      throw conflict('BOARD_ITEM_VERSION_CONFLICT','the item changed before this move completed',{currentVersion:Number(item.item_version)})
    }
    if(Number(board.policy_version)!==input.expectedPolicyVersion||Number(item.policy_version)!==input.expectedPolicyVersion){
      throw conflict('BOARD_POLICY_VERSION_CONFLICT','the board policy changed before this move completed',{currentPolicyVersion:Number(board.policy_version)})
    }

    const destination=(await client.query(
      `SELECT * FROM ace_board_columns
       WHERE workspace_id=$1 AND board_id=$2 AND id=$3
       FOR UPDATE`,
      [workspaceId,input.boardId,input.destinationColumnId]
    )).rows[0]
    if(!destination)throw conflict('BOARD_DESTINATION_NOT_FOUND','the destination column no longer exists')

    const allowed=await authorize({
      workspaceId,
      actorId,
      action:'boards.move',
      board,
      item,
      destination,
      command:input
    })
    if(!allowed)throw Object.assign(new Error('board move is not authorized'),{status:403,code:'BOARD_MOVE_FORBIDDEN'})

    if(item.column_id!==destination.id&&destination.wip_limit!=null){
      const {rows}=await client.query(
        `SELECT COUNT(*)::int AS count FROM ace_board_items
         WHERE workspace_id=$1 AND board_id=$2 AND column_id=$3`,
        [workspaceId,input.boardId,destination.id]
      )
      if(Number(rows[0]?.count||0)>=Number(destination.wip_limit)){
        throw conflict('BOARD_WIP_LIMIT_REACHED','the destination column has reached its WIP limit')
      }
    }

    const rank=await rankForPlacement(client,{
      workspaceId,
      boardId:input.boardId,
      columnId:destination.id,
      itemId:input.itemId,
      placement:input.placement
    })
    const nextVersion=Number(item.item_version)+1
    const nextOrderingRevision=Number(board.ordering_revision)+1
    const moved=(await client.query(
      `UPDATE ace_board_items
       SET column_id=$4,rank=$5,item_version=$6,policy_version=$7,updated_at=now()
       WHERE workspace_id=$1 AND board_id=$2 AND item_id=$3
       RETURNING *`,
      [workspaceId,input.boardId,input.itemId,destination.id,rank.toString(),nextVersion,input.expectedPolicyVersion]
    )).rows[0]
    await client.query(
      `UPDATE ace_boards
       SET ordering_revision=$3,version=version+1,updated_at=now()
       WHERE workspace_id=$1 AND id=$2`,
      [workspaceId,input.boardId,nextOrderingRevision]
    )

    const eventId='evt_'+randomUUID()
    const auditId='audit_'+randomUUID()
    const result={
      operationId:input.operationId,
      boardId:input.boardId,
      itemId:input.itemId,
      destinationColumnId:destination.id,
      rank:String(moved.rank),
      itemVersion:nextVersion,
      policyVersion:input.expectedPolicyVersion,
      orderingRevision:nextOrderingRevision,
      eventId,
      correlationId:correlationId||requestId||input.operationId,
      status:'confirmed'
    }

    await client.query(
      `INSERT INTO ace_platform_audit
        (id,workspace_id,actor_id,actor_type,action,entity_type,entity_id,request_id,outcome,metadata)
       VALUES($1,$2,$3,'user','board.item.move','board-item',$4,$5,'success',$6::jsonb)`,
      [auditId,workspaceId,actorId||null,input.itemId,requestId,JSON.stringify({
        boardId:input.boardId,
        fromColumnId:item.column_id,
        destinationColumnId:destination.id,
        operationId:input.operationId,
        itemVersion:nextVersion,
        orderingRevision:nextOrderingRevision,
        reason:input.reason||null
      })]
    )
    await client.query(
      `INSERT INTO ace_outbox_events
        (id,workspace_id,event_type,aggregate_type,aggregate_id,payload,status)
       VALUES($1,$2,'board.item.moved','board-item',$3,$4::jsonb,'pending')`,
      [eventId,workspaceId,input.itemId,JSON.stringify({
        eventId,
        eventType:'board.item.moved',
        eventVersion:1,
        workspaceId,
        resourceType:'board-item',
        resourceId:input.itemId,
        resourceVersion:nextVersion,
        operationId:input.operationId,
        correlationId:result.correlationId,
        source:'boards',
        data:{
          boardId:input.boardId,
          destinationColumnId:destination.id,
          orderingRevision:nextOrderingRevision
        }
      })]
    )
    await client.query(
      `UPDATE ace_board_operations
       SET status='completed',result=$4::jsonb,error_code=NULL,updated_at=now()
       WHERE workspace_id=$1 AND board_id=$2 AND operation_id=$3`,
      [workspaceId,input.boardId,input.operationId,JSON.stringify(result)]
    )
    return result
  })
}
