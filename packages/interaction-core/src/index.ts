export type DragPhase=
  |'idle'
  |'eligible'
  |'dragging'
  |'target-preview'
  |'submitting'
  |'confirmed'
  |'rejected'
  |'conflicted'
  |'unknown-outcome'

export type DragIntent<TTarget extends string=string>={
  operationId:string
  itemId:string
  sourceId:string
  targetId:TTarget
}

export type DragSession<TTarget extends string=string>={
  phase:DragPhase
  operationId:string
  itemId:string
  sourceId:string
  targetId:TTarget|null
  message:string|null
}

export const createOperationId=()=>{
  const cryptoObject=typeof globalThis!=='undefined'?(globalThis as any).crypto:null
  if(cryptoObject?.randomUUID)return cryptoObject.randomUUID()
  return 'op_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)
}

export const createDragSession=<TTarget extends string=string>(itemId:string,sourceId:string):DragSession<TTarget>=>({
  phase:'eligible',
  operationId:createOperationId(),
  itemId,
  sourceId,
  targetId:null,
  message:null
})

export const previewDragTarget=<TTarget extends string=string>(
  session:DragSession<TTarget>,
  targetId:TTarget|null,
  allowed:boolean,
  reason?:string
):DragSession<TTarget>=>({
  ...session,
  phase:targetId?(allowed?'target-preview':'rejected'):'dragging',
  targetId,
  message:allowed?null:(reason||'This destination is not available.')
})

export const beginDrag=<TTarget extends string=string>(session:DragSession<TTarget>):DragSession<TTarget>=>({
  ...session,
  phase:'dragging',
  message:null
})

export const cancelDrag=<TTarget extends string=string>(session:DragSession<TTarget>):DragSession<TTarget>=>({
  ...session,
  phase:'idle',
  targetId:null,
  message:null
})

export const toDragIntent=<TTarget extends string=string>(session:DragSession<TTarget>):DragIntent<TTarget>=>{
  if(!session.targetId)throw new Error('drag target is required')
  return {
    operationId:session.operationId,
    itemId:session.itemId,
    sourceId:session.sourceId,
    targetId:session.targetId
  }
}

export const keyboardMoveDirection=(key:string)=>{
  if(key==='ArrowLeft'||key==='ArrowUp')return -1
  if(key==='ArrowRight'||key==='ArrowDown')return 1
  return 0
}

export const isDragActivationKey=(key:string)=>key==='Enter'||key===' '

export const isDragCancelKey=(key:string)=>key==='Escape'

export const interactionAnnouncement=(input:{
  phase:DragPhase
  itemLabel:string
  targetLabel?:string|null
  reason?:string|null
})=>{
  if(input.phase==='dragging')return input.itemLabel+' selected for moving.'
  if(input.phase==='target-preview'&&input.targetLabel)return input.itemLabel+' can move to '+input.targetLabel+'.'
  if(input.phase==='submitting'&&input.targetLabel)return 'Moving '+input.itemLabel+' to '+input.targetLabel+'.'
  if(input.phase==='confirmed'&&input.targetLabel)return input.itemLabel+' moved to '+input.targetLabel+'.'
  if(input.phase==='rejected')return input.reason||'Move is not allowed.'
  if(input.phase==='conflicted')return 'The item changed elsewhere. Refresh the current state before moving again.'
  if(input.phase==='unknown-outcome')return 'The move outcome is not yet known. Check the current state before retrying.'
  return ''
}

export const boundedAutoScrollDelta=(distanceToEdge:number,maxDelta=24)=>{
  const distance=Math.max(0,Math.min(100,Number(distanceToEdge)||0))
  const limit=Math.max(1,Math.min(64,Number(maxDelta)||24))
  return Math.round(limit*(1-distance/100))
}
