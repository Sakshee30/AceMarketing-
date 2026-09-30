import type {KeyboardEvent,ReactNode} from 'react'

export type MoveDestination={
  id:string
  label:string
  disabled?:boolean
  reason?:string
}

export function BoardViewport({label,children,className=''}:{
  label:string
  children:ReactNode
  className?:string
}){
  return <section className={('ace-board '+className).trim()} aria-label={label}>{children}</section>
}

export function Column({id,label,count,children,className=''}:{
  id:string
  label:string
  count?:number
  children:ReactNode
  className?:string
}){
  return <section className={('ace-board-column '+className).trim()} data-column-id={id} aria-labelledby={'column-'+id}>
    <header>
      <h2 id={'column-'+id}>{label}</h2>
      {typeof count==='number'&&<span aria-label={count+' items'}>{count}</span>}
    </header>
    <div role="list">{children}</div>
  </section>
}

export function CardShell({id,label,pending=false,children,className=''}:{
  id:string
  label:string
  pending?:boolean
  children:ReactNode
  className?:string
}){
  return <article
    role="listitem"
    className={('ace-board-card '+className).trim()}
    data-card-id={id}
    aria-label={label}
    aria-busy={pending||undefined}
  >{children}</article>
}

export function DragHandle({label,onActivate,onCancel,disabled=false}:{
  label:string
  onActivate:()=>void
  onCancel?:()=>void
  disabled?:boolean
}){
  const onKeyDown=(event:KeyboardEvent<HTMLButtonElement>)=>{
    if(disabled)return
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault()
      onActivate()
    }else if(event.key==='Escape'&&onCancel){
      event.preventDefault()
      onCancel()
    }
  }
  return <button
    type="button"
    className="ace-drag-handle"
    disabled={disabled}
    aria-label={label}
    aria-describedby="ace-drag-help"
    onClick={onActivate}
    onKeyDown={onKeyDown}
  >
    <span aria-hidden="true">⋮⋮</span>
    <span id="ace-drag-help" className="sr-only">Press Enter or Space to choose a move destination. Escape cancels.</span>
  </button>
}

export function DropIndicator({label='Move here',active=false}:{
  label?:string
  active?:boolean
}){
  return <div className="ace-drop-indicator" data-active={active?'true':'false'} aria-hidden={!active}>
    {active?label:null}
  </div>
}

export function DragOverlay({children,label}:{
  children:ReactNode
  label:string
}){
  return <div className="ace-drag-overlay" aria-label={label} aria-live="polite">{children}</div>
}

export function MoveMenu({label='Move to',destinations,onMove,onCancel}:{
  label?:string
  destinations:MoveDestination[]
  onMove:(targetId:string)=>void
  onCancel?:()=>void
}){
  return <div className="ace-move-menu" role="group" aria-label={label}>
    {destinations.map(destination=><button
      key={destination.id}
      type="button"
      disabled={destination.disabled}
      title={destination.disabled?destination.reason:undefined}
      onClick={()=>onMove(destination.id)}
    >{destination.label}{destination.disabled&&destination.reason?' — '+destination.reason:''}</button>)}
    {onCancel&&<button type="button" onClick={onCancel}>Cancel</button>}
  </div>
}

export function EmptyColumn({message='No items here'}:{message?:string}){
  return <p className="ace-empty-column" role="status">{message}</p>
}

export function InteractionStatus({message}:{message:string}){
  return <div className="sr-only" aria-live="polite" aria-atomic="true">{message}</div>
}
